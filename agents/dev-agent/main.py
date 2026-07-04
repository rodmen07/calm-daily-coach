import os
import json
import logging
import subprocess
import pathlib
import sys
from typing import Dict, Any, List

from llm_client import UnifiedLLMClient
from tools import TOOL_SCHEMAS, dispatch_tool, WORKSPACE_ROOT
import prompts

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
log = logging.getLogger("dev-agent.main")

# Honor a shared backlog path so an orchestrator can point multiple workers at
# one queue. When AUTOMATION_MANAGED=1 the parent runner owns task status (under
# a cross-process lock), so this process must not write status back itself.
BACKLOG_PATH = pathlib.Path(os.environ.get("AUTOMATION_BACKLOG_PATH") or (pathlib.Path(__file__).parent / "backlog.json"))
MANAGED = os.environ.get("AUTOMATION_MANAGED") == "1"
STATE_PATH = pathlib.Path(__file__).parent / "state.json"
MAX_ROUNDS = 30

def load_backlog() -> Dict[str, Any]:
    if BACKLOG_PATH.exists():
        return json.loads(BACKLOG_PATH.read_text(encoding="utf-8"))
    return {"tasks": []}

def _atomic_write(path: pathlib.Path, text: str):
    """Write via a unique temp file + os.replace, retrying transient Windows locks."""
    tmp = path.with_suffix(f".tmp.{os.getpid()}")
    import time as _time
    for _ in range(10):
        try:
            tmp.write_text(text, encoding="utf-8")
            os.replace(tmp, path)
            return
        except PermissionError:
            _time.sleep(0.2)
        finally:
            if tmp.exists():
                try:
                    tmp.unlink()
                except OSError:
                    pass
    tmp.write_text(text, encoding="utf-8")
    os.replace(tmp, path)

def save_backlog(data: Dict[str, Any]):
    _atomic_write(BACKLOG_PATH, json.dumps(data, indent=2))

def load_state() -> Dict[str, Any]:
    if STATE_PATH.exists():
        return json.loads(STATE_PATH.read_text(encoding="utf-8"))
    return {"completed_tasks": [], "runs_count": 0}

def save_state(data: Dict[str, Any]):
    _atomic_write(STATE_PATH, json.dumps(data, indent=2))

def create_git_branch(branch_name: str):
    """Creates a local task-specific git branch off the latest origin/main."""
    log.info(f"Setting up branch: {branch_name}")
    detach = os.environ.get("AUTOMATION_DETACH") == "1"
    try:
        # Check if dirty
        status = subprocess.run(["git", "status", "--porcelain"], cwd=str(WORKSPACE_ROOT), capture_output=True, text=True)
        if status.stdout.strip():
            log.warning("Git working tree is dirty! Stashing changes.")
            subprocess.run(["git", "stash"], cwd=str(WORKSPACE_ROOT))

        subprocess.run(["git", "fetch", "origin", "main"], cwd=str(WORKSPACE_ROOT), capture_output=True)
        if detach:
            # In a worktree the shared `main` branch is checked out elsewhere and
            # cannot be checked out here; branch straight off origin/main instead.
            subprocess.run(["git", "checkout", "-f", "--detach", "origin/main"], cwd=str(WORKSPACE_ROOT), capture_output=True)
        else:
            subprocess.run(["git", "checkout", "main"], cwd=str(WORKSPACE_ROOT), capture_output=True)
            subprocess.run(["git", "pull", "origin", "main"], cwd=str(WORKSPACE_ROOT), capture_output=True)

        # Create and checkout clean task branch
        subprocess.run(["git", "checkout", "-b", branch_name], cwd=str(WORKSPACE_ROOT), capture_output=True)
    except Exception as e:
        log.error(f"Error creating git branch {branch_name}: {e}")

def commit_changes(task_id: str, title: str):
    """Commits modifications to git."""
    log.info("Committing task modifications to git...")
    try:
        # Stage everything the agent produced. Runtime bookkeeping files
        # (backlog.json, state.json, logs, __pycache__) are git-ignored.
        subprocess.run(["git", "add", "-A"], cwd=str(WORKSPACE_ROOT))
        msg = f"feat({task_id}): {title}"
        subprocess.run(["git", "commit", "-m", msg], cwd=str(WORKSPACE_ROOT))
        log.info(f"Task committed successfully: '{msg}'")
    except Exception as e:
        log.error(f"Error committing git changes: {e}")

def run_agentic_loop(task: Dict[str, Any], report: Dict[str, Any] = None) -> bool:
    """Executes the tool interaction loop with the LLM client."""
    if report is None:
        report = {}
    client = UnifiedLLMClient()
    
    # Initialize conversation
    system_prompt = prompts.build_system_prompt()
    task_prompt = prompts.build_task_prompt(
        task_id=task["id"],
        title=task["title"],
        description=task["description"],
        files_to_touch=task.get("files_to_touch", [])
    )
    
    messages = [
        {"role": "user", "content": task_prompt}
    ]
    
    log.info(f"Starting agent tool execution loop for task {task['id']} (Max rounds: {MAX_ROUNDS})")
    
    for round_idx in range(1, MAX_ROUNDS + 1):
        log.info(f"--- TOOL ROUND {round_idx}/{MAX_ROUNDS} ---")
        report["rounds"] = round_idx
        
        try:
            response = client.generate(messages, tools=TOOL_SCHEMAS, system_prompt=system_prompt)
        except Exception as e:
            log.error(f"Error from LLM generation: {e}")
            return False
            
        content = response.get("content", "")
        tool_calls = response.get("tool_calls", [])
        
        if content:
            log.info(f"Agent response:\n{content}")
            messages.append({"role": "assistant", "content": content})
            
        if not tool_calls:
            log.info("No tool calls triggered by agent. Checking task status...")
            # Automatically check build/tests to guarantee completeness
            verify_res = dispatch_tool("run_verification", {})
            report["last_verification"] = verify_res
            if verify_res["success"]:
                log.info("Verification passed! Task completed successfully.")
                return True
            else:
                log.warning("Verification failed. Prompting agent to correct errors.")
                error_msg = f"Verification failed with exit code {verify_res['exit_code']}.\nSTDOUT:\n{verify_res['stdout']}\nSTDERR:\n{verify_res['stderr']}\nPlease modify the code to address these issues."
                messages.append({"role": "user", "content": error_msg})
                continue
                
        for t_call in tool_calls:
            tc_id = t_call["id"]
            tc_name = t_call["name"]
            tc_args = t_call["arguments"]
            
            log.info(f"Dispatched Tool: {tc_name} with arguments: {tc_args}")
            
            try:
                tool_output = dispatch_tool(tc_name, tc_args)
            except Exception as e:
                tool_output = f"Error executing tool: {e}"
                
            # If tool returns dictionary (like run_verification), json serialize it
            if isinstance(tool_output, dict):
                tool_output_str = json.dumps(tool_output, indent=2)
            else:
                tool_output_str = str(tool_output)
                
            # Log snippet of output
            log.info(f"Tool response length: {len(tool_output_str)} chars")
            
            messages.append({
                "role": "tool",
                "tool_call_id": tc_id,
                "name": tc_name,
                "content": tool_output_str
            })
            
    log.warning("Tool loops threshold exhausted without completing.")
    return False

def main():
    log.info("=== CALM-DAILY-COACH DEV AGENT STARTING ===")
    
    # Load task list
    backlog_data = load_backlog()
    state_data = load_state()
    
    task_id = os.environ.get("FORCE_TASK_ID")
    task_to_run = None
    
    if task_id:
        log.info(f"Forcing task: {task_id}")
        for t in backlog_data.get("tasks", []):
            if t["id"] == task_id:
                task_to_run = t
                break
    else:
        # Find next pending task
        for t in backlog_data.get("tasks", []):
            if t["status"] == "pending":
                task_to_run = t
                break
                
    if not task_to_run:
        log.info("No pending tasks in backlog. All done!")
        sys.exit(3)
        
    log.info(f"Selected task: {task_to_run['id']} - {task_to_run['title']}")
    
    # Setup branch
    branch_name = f"dev-agent/{task_to_run['id']}-{task_to_run['title'].lower().replace(' ', '-')}"
    # Remove special characters
    branch_name = "".join(c for c in branch_name if c.isalnum() or c in "-/")
    
    create_git_branch(branch_name)
    
    # Run the loop
    report: Dict[str, Any] = {}
    success = run_agentic_loop(task_to_run, report)

    # Only a real change counts. If the agent produced nothing, treat it as a
    # failure so the task is retried instead of falsely marked complete.
    final_success = success
    if success:
        status = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=str(WORKSPACE_ROOT), capture_output=True, text=True,
        )
        if not status.stdout.strip():
            log.error("Agent reported success but produced no file changes. Treating as failure.")
            final_success = False

    # Learning layer: fold this task's outcome into the cumulative project memory
    # BEFORE committing, so the regenerated PROJECT_MEMORY.md rides along with a
    # successful task's PR. Best-effort - never let memory bookkeeping fail a run.
    try:
        import memory
        memory.record_task_outcome(
            task_to_run, final_success,
            report.get("last_verification"), report.get("rounds"),
        )
        memory.refresh_project_memory_file()
    except Exception as e:
        log.error(f"Project-memory update failed (continuing): {e}")

    if final_success:
        log.info("Agent succeeded! Committing...")
        commit_changes(task_to_run["id"], task_to_run["title"])

        # Update state and backlog. Under orchestration the parent runner owns
        # task status via the shared lock, so skip the backlog write here.
        if not MANAGED:
            task_to_run["status"] = "completed"
            save_backlog(backlog_data)

        state_data["completed_tasks"].append(task_to_run["id"])
        state_data["runs_count"] += 1
        save_state(state_data)

        log.info(f"Successfully completed task {task_to_run['id']}. Exit code 0.")
        sys.exit(0)
    else:
        log.error("Agent failed or reached limits with failing code verification.")
        if not MANAGED:
            task_to_run["status"] = "failed"
            save_backlog(backlog_data)
        sys.exit(1)

if __name__ == "__main__":
    main()
