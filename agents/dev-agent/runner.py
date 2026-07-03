import os
import json
import logging
import subprocess
import pathlib
import sys
import time

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] dev-agent.runner: %(message)s"
)
log = logging.getLogger("dev-agent.runner")

AGENT_DIR = pathlib.Path(__file__).parent.resolve()
BACKLOG_PATH = AGENT_DIR / "backlog.json"

def has_github_credentials() -> bool:
    """Checks if gh CLI is installed and logged in."""
    try:
        res = subprocess.run(["gh", "auth", "status"], capture_output=True, text=True)
        return res.returncode == 0
    except Exception:
        return False

def push_and_create_pr(task_id: str, title: str):
    """Pushes local task branch and submits high-quality pull request."""
    log.info("Pushing task branch to origin...")
    try:
        # Get active branch name
        branch_res = subprocess.run(["git", "branch", "--show-current"], cwd=str(AGENT_DIR), capture_output=True, text=True)
        branch = branch_res.stdout.strip()
        
        if not branch or branch == "main":
            log.warning("Not on task branch, skipping PR push.")
            return

        # Push branch
        subprocess.run(["git", "push", "-u", "origin", branch], cwd=str(AGENT_DIR))
        
        if has_github_credentials():
            log.info(f"Opening GitHub PR for branch {branch}...")
            subprocess.run([
                "gh", "pr", "create",
                "--title", f"feat({task_id}): {title}",
                "--body", f"Automated implementation of backlog task {task_id}: {title}.\n\nBuilt and verified by Autonomous Dev Agent.",
                "--base", "main",
                "--head", branch
            ], cwd=str(AGENT_DIR))
        else:
            log.info(f"Branch pushed. PR can be created manually: 'gh pr create --title \"feat({task_id}): {title}\"'")
            
        # Checkout main and prepare for next iteration
        subprocess.run(["git", "checkout", "main"], cwd=str(AGENT_DIR))
    except Exception as e:
        log.error(f"Error handling branch push or PR creation: {e}")

def run_loop():
    log.info("=== STARTING AUTONOMOUS DEV-AGENT LOOP ===")
    
    while True:
        # Load backlog to find next pending
        if not BACKLOG_PATH.exists():
            log.error("backlog.json not found!")
            break
            
        with open(BACKLOG_PATH, "r", encoding="utf-8") as f:
            backlog = json.load(f)
            
        pending_tasks = [t for t in backlog.get("tasks", []) if t["status"] == "pending"]
        
        if not pending_tasks:
            log.info("No more pending tasks in backlog. Orchestrator finished!")
            break
            
        next_task = pending_tasks[0]
        log.info(f"Orchestrator invoking main executor for task {next_task['id']} - {next_task['title']}")
        
        # Execute main.py via subprocess to cleanly isolate Python environments
        # Pass FORCE_TASK_ID as env var
        env = os.environ.copy()
        env["FORCE_TASK_ID"] = next_task["id"]
        
        # Run main.py
        p = subprocess.run(
            [sys.executable, str(AGENT_DIR / "main.py")],
            cwd=str(AGENT_DIR),
            env=env
        )
        
        exit_code = p.returncode
        
        if exit_code == 0:
            log.info(f"Task {next_task['id']} completed successfully! Initializing deployment flow...")
            push_and_create_pr(next_task["id"], next_task["title"])
            # Small cooldown
            time.sleep(2)
        elif exit_code == 3:
            log.info("No task items remaining. Exiting run loop.")
            break
        elif exit_code == 1:
            log.error(f"Task {next_task['id']} reported execution error. Aborting loop for human triage.")
            sys.exit(1)
        else:
            log.warning(f"Task executor exited with unexpected code {exit_code}. Aborting loop.")
            sys.exit(exit_code)

if __name__ == "__main__":
    run_loop()
