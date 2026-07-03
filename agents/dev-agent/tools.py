import os
import pathlib
import subprocess
import logging
from typing import Dict, Any

log = logging.getLogger("dev-agent.tools")

WORKSPACE_ROOT = pathlib.Path(__file__).parent.parent.parent.resolve()

def read_file(relative_path: str) -> str:
    """Reads a file path relative to workspace root."""
    abs_path = WORKSPACE_ROOT / relative_path
    try:
        return abs_path.read_text(encoding="utf-8")
    except Exception as e:
        return f"Error reading file {relative_path}: {e}"

def write_file(relative_path: str, content: str) -> str:
    """Writes content to a file path relative to workspace root."""
    abs_path = WORKSPACE_ROOT / relative_path
    try:
        abs_path.parent.mkdir(parents=True, exist_ok=True)
        abs_path.write_text(content, encoding="utf-8")
        return f"Successfully wrote to {relative_path}"
    except Exception as e:
        return f"Error writing file {relative_path}: {e}"

def search_grep(pattern: str, file_pattern: str = "*") -> str:
    """Searches workspace files for given string or pattern."""
    log.info(f"Searching for structure pattern: {pattern}")
    # Run a simple search via git grep or fallback to recursive scan
    try:
        res = subprocess.run(
            ["git", "grep", "-n", pattern, "--", file_pattern],
            cwd=str(WORKSPACE_ROOT),
            capture_output=True,
            text=True,
            check=False
        )
        if res.returncode == 0:
            return res.stdout
        elif res.stderr:
            return f"Search error stderr: {res.stderr}"
        return "No matches found."
    except Exception as e:
        return f"Error running search: {e}"

def run_verification() -> Dict[str, Any]:
    """Runs npm run check to verify lints, build status, and unit tests."""
    log.info("Running verification: npm run check...")
    try:
        # We run npm run check in calm-daily-coach directory
        res = subprocess.run(
            ["npm", "run", "check"],
            cwd=str(WORKSPACE_ROOT),
            capture_output=True,
            text=True,
            shell=True, # Need shell matching for Windows/Powershell
            check=False
        )
        return {
            "success": res.returncode == 0,
            "stdout": res.stdout,
            "stderr": res.stderr,
            "exit_code": res.returncode
        }
    except Exception as e:
        return {
            "success": False,
            "stdout": "",
            "stderr": str(e),
            "exit_code": -1
        }

# Declarations to provide to LLMs
TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "read_file",
            "description": "Read the contents of a file within the workspace.",
            "parameters": {
                "type": "object",
                "properties": {
                    "relative_path": {
                        "type": "string",
                        "description": "Workspace relative path, e.g., 'src/lib/planner-derivations.ts'"
                    }
                },
                "required": ["relative_path"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "write_file",
            "description": "Write or output contents directly to a file.",
            "parameters": {
                "type": "object",
                "properties": {
                    "relative_path": {
                        "type": "string",
                        "description": "Workspace relative path, e.g., 'src/lib/planner-derivations.ts'"
                    },
                    "content": {
                        "type": "string",
                        "description": "The exact updated contents to save."
                    }
                },
                "required": ["relative_path", "content"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_grep",
            "description": "Perform keywords search inside workspace files.",
            "parameters": {
                "type": "object",
                "properties": {
                    "pattern": {
                        "type": "string",
                        "description": "The text pattern or search string."
                    },
                    "file_pattern": {
                        "type": "string",
                        "description": "Search domain file pattern (e.g. '*.ts' or '*.tsx')",
                        "default": "*"
                    }
                },
                "required": ["pattern"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "run_verification",
            "description": "Runs npm run check to test, typecheck and lint file modifications. Call this to check if your additions compile correctly.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    }
]

def dispatch_tool(name: str, arguments: Dict[str, Any]) -> Any:
    """Executes the mapped function given the argument values."""
    if name == "read_file":
        return read_file(arguments["relative_path"])
    elif name == "write_file":
        return write_file(arguments["relative_path"], arguments["content"])
    elif name == "search_grep":
        return search_grep(arguments["pattern"], arguments.get("file_pattern", "*"))
    elif name == "run_verification":
        return run_verification()
    else:
        raise ValueError(f"Unknown tool function: {name}")
