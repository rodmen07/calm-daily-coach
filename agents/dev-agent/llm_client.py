import os
import json
import logging
from typing import List, Dict, Any, Optional

log = logging.getLogger("dev-agent.llm")

class UnifiedLLMClient:
    """
    A unified LLM client supporting tool calling across OpenAI, Anthropic, and Gemini.
    """
    def __init__(self, provider: Optional[str] = None, model: Optional[str] = None):
        self.provider = provider or os.environ.get("LLM_PROVIDER", "auto").lower()
        self.model = model or os.environ.get("LLM_MODEL")
        
        # Select defaults based on provider
        if not self.model:
            if self.provider == "openai":
                self.model = "gpt-4o-mini"
            elif self.provider == "anthropic":
                self.model = "claude-3-5-haiku-20241022"
            elif self.provider == "gemini":
                self.model = "gemini-2.5-flash"
                
        log.info(f"Initialized LLM client: provider={self.provider}, model={self.model}")
        
    def generate(
        self, 
        messages: List[Dict[str, str]], 
        tools: Optional[List[Dict[str, Any]]] = None,
        system_prompt: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Sends a conversation history to the configured provider and parses the result.
        Returns a dict containing 'content' (str) and 'tool_calls' (list of dicts).
        """
        if self.provider == "openai":
            return self._call_openai(messages, tools, system_prompt)
        elif self.provider == "anthropic":
            return self._call_anthropic(messages, tools, system_prompt)
        elif self.provider == "gemini":
            return self._call_gemini(messages, tools, system_prompt)
        elif self.provider == "auto":
            return self._call_auto(messages, tools, system_prompt)
        else:
            raise ValueError(f"Unsupported provider: {self.provider}")

    def _call_openai(self, messages: List[Dict[str, str]], tools: Optional[List[Dict[str, Any]]], system_prompt: Optional[str]) -> Dict[str, Any]:
        from openai import OpenAI
        client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
        
        formatted_messages = []
        if system_prompt:
            formatted_messages.append({"role": "system", "content": system_prompt})
        formatted_messages.extend(messages)
        
        kwargs: Dict[str, Any] = {
            "model": self.model,
            "messages": formatted_messages,
            "temperature": 0.2,
        }
        
        if tools:
            kwargs["tools"] = tools
            
        # Support OpenAI reasoning models (o1, o3-mini) and valid reasoning effort configurations
        is_reasoning_model = "o1" in self.model or "o3-" in self.model
        if is_reasoning_model:
            # reasoning models cannot take temperature parameter
            kwargs.pop("temperature", None)
            
            # Allow configuring reasoning effort (none, minimal, low, medium, high, xhigh)
            effort = os.environ.get("REASONING_EFFORT")
            if effort:
                effort = effort.lower()
                valid_efforts = {"none", "minimal", "low", "medium", "high", "xhigh"}
                if effort in valid_efforts:
                    kwargs["reasoning_effort"] = effort
                else:
                    log.warning(f"Invalid REASONING_EFFORT '{effort}' ignored. Using default effort.")
        
        log.debug(f"Calling OpenAI with model={self.model}")
        response = client.chat.completions.create(**kwargs)
        
        message = response.choices[0].message
        content = message.content or ""
        tool_calls = []
        
        if message.tool_calls:
            for tc in message.tool_calls:
                try:
                    args = json.loads(tc.function.arguments)
                except Exception:
                    args = tc.function.arguments
                tool_calls.append({
                    "id": tc.id,
                    "name": tc.function.name,
                    "arguments": args
                })
                
        return {"content": content, "tool_calls": tool_calls}

    def _call_anthropic(self, messages: List[Dict[str, str]], tools: Optional[List[Dict[str, Any]]], system_prompt: Optional[str]) -> Dict[str, Any]:
        from anthropic import Anthropic
        client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
        
        formatted_messages = []
        for msg in messages:
            # Map tools roles
            role = msg["role"]
            if role == "system":
                continue # System is handled at top-level parameter
            formatted_messages.append({"role": role, "content": msg["content"]})
            
        kwargs: Dict[str, Any] = {
            "model": self.model,
            "messages": formatted_messages,
            "max_tokens": 4000,
            "temperature": 0.2,
        }
        
        if system_prompt:
            kwargs["system"] = system_prompt
            
        if tools:
            # Map tool schemas to Anthropic style
            anthropic_tools = []
            for t in tools:
                func = t["function"]
                anthropic_tools.append({
                    "name": func["name"],
                    "description": func["description"],
                    "input_schema": func["parameters"]
                })
            kwargs["tools"] = anthropic_tools
            
        log.debug(f"Calling Anthropic with model={self.model}")
        response = client.messages.create(**kwargs)
        
        content = ""
        tool_calls = []
        
        for block in response.content:
            if block.type == "text":
                content += block.text
            elif block.type == "tool_use":
                tool_calls.append({
                    "id": block.id,
                    "name": block.name,
                    "arguments": block.input
                })
                
        return {"content": content, "tool_calls": tool_calls}

    def _call_gemini(self, messages: List[Dict[str, str]], tools: Optional[List[Dict[str, Any]]], system_prompt: Optional[str]) -> Dict[str, Any]:
        import google.generativeai as genai
        genai.configure(api_key=os.environ.get("GOOGLE_API_KEY"))
        
        # Turn standard messages into Gemini format
        # For simplicity, we can translate message history or use the simple API.
        model = genai.GenerativeModel(self.model, system_instruction=system_prompt)
        
        # Format history
        contents = []
        for m in messages:
            role = "user" if m["role"] == "user" else "model"
            contents.append({"role": role, "parts": [m["content"]]})
            
        # Support tooling if needed via client config or simple prompt flow
        # In a scaffold, keeping Gemini simple makes it resilient!
        log.debug(f"Calling Gemini with model={self.model}")
        response = model.generate_content(contents)
        
        # Return purely text completion for the simple scaffold configuration
        return {"content": response.text, "tool_calls": []}

    def _call_auto(self, messages: List[Dict[str, str]], tools: Optional[List[Dict[str, Any]]], system_prompt: Optional[str]) -> Dict[str, Any]:
        """
        Invoke the Copilot CLI via list process arguments to get a response.
        Bypasses command line shell parsing and stdin redirection.
        Parses JSONL output looking for type == 'assistant.message'.
        """
        import subprocess
        import os
        import pathlib

        # Resolve repository root
        workspace_root = pathlib.Path(__file__).parent.parent.parent.resolve()

        # Build one clean instruction for the single-shot CLI call.
        # IMPORTANT: do NOT prepend the system/persona preamble. When the -p input
        # starts with "You are a coding agent...", gpt-5.3-codex treats the whole
        # prompt as persona setup and replies with a generic greeting instead of
        # doing the work. Sending only the concrete task instruction (the user
        # message) makes it act immediately. System guidance is folded into the
        # task prompt itself by prompts.py.
        user_parts = [
            (m.get("content") or "").strip()
            for m in messages
            if m.get("role") != "system" and (m.get("content") or "").strip()
        ]
        prompt_text = "\n\n".join(user_parts)
        if not prompt_text and system_prompt:
            prompt_text = system_prompt.strip()

        copilot_bin = "copilot.cmd" if os.name == "nt" else "copilot"
        # Default automation model; still overridable via COPILOT_MODEL.
        model = os.environ.get("COPILOT_MODEL", "gpt-5.3-codex")
        cmd = [
            copilot_bin,
            "-p", prompt_text,
            "--model", model,
            "--output-format", "json",
            "--autopilot",
            "--max-autopilot-continues", os.environ.get("COPILOT_MAX_AUTOPILOT_CONTINUES", "12"),
            "--allow-all",
            "--allow-all-paths",
            # Force fully autonomous operation: never pause to ask the user.
            "--no-ask-user",
        ]

        try:
            log.info(f"Invoking Copilot CLI at workspace root: {workspace_root}...")
            timeout_s = int(os.environ.get("COPILOT_TIMEOUT", "600"))
            proc = subprocess.run(cmd, capture_output=True, timeout=timeout_s, cwd=str(workspace_root))
            out = proc.stdout.decode("utf-8", errors="ignore").strip()
            err = proc.stderr.decode("utf-8", errors="ignore").strip()

            if proc.returncode != 0:
                log.error(f"Copilot CLI exited with code {proc.returncode}. stderr={err[:1000]}")

            raw_stream = out if out else err

            # Try parse JSONL output (one JSON object per line)
            lines = [l for l in raw_stream.splitlines() if l.strip()]
            for line in reversed(lines):
                try:
                    obj = json.loads(line)
                    if obj.get("type") == "assistant.message":
                        data = obj.get("data", {})
                        content = data.get("content") or ""
                        tool_requests = data.get("toolRequests", [])
                        
                        tool_calls = []
                        for tr in tool_requests:
                            tool_calls.append({
                                "id": tr.get("toolCallId"),
                                "name": tr.get("name"),
                                "arguments": tr.get("arguments")
                            })
                        log.info(f"Copilot CLI returned success: content length={len(content)}, tool_calls={len(tool_calls)}")
                        return {"content": content, "tool_calls": tool_calls}
                except Exception:
                    continue

            # Fallback: return raw text if no JSON assistant message matched
            fallback = raw_stream[:8000]
            if fallback:
                log.warning("Copilot CLI did not emit assistant.message JSON; returning raw output fallback.")
            return {"content": fallback, "tool_calls": []}
        except Exception as e:
            log.error(f"Error calling Copilot CLI: {e}")
            return {"content": "", "tool_calls": []}
