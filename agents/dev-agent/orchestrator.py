"""Multi-agent orchestrator: run N autonomous dev agents against one backlog.

Scaling the single-agent loop to N concurrent workers has two hard requirements:

1. **Isolated working directories.** N agents cannot edit, compile, test, and
   branch inside the same checkout - they would corrupt each other's files and
   fight over `.git/index.lock`. This orchestrator gives each worker its own
   **git worktree**: a separate working directory that shares the primary repo's
   object database but has an independent index and HEAD. Each worker branches,
   builds, and tests in total isolation, then pushes its branch to GitHub.

2. **A single shared, coordinated queue.** All workers point at ONE canonical
   `backlog.json` via ``AUTOMATION_BACKLOG_PATH`` and claim tasks atomically
   through :mod:`backlog_store`'s cross-process lock, so no two workers ever pick
   up the same task.

GitHub's branch protection + auto-merge (already in use) serializes the actual
merges into `main`, and each worker rebases onto the freshest origin/main before
every task, so parallel output integrates safely.

Usage:
    python orchestrator.py --workers 3
    python orchestrator.py --workers 4 --skip-install   # reuse existing node_modules
    python orchestrator.py --teardown                   # remove all worktrees
"""

import argparse
import os
import shutil
import signal
import subprocess
import sys
import time
from pathlib import Path

AGENT_DIR = Path(__file__).parent.resolve()
REPO_ROOT = AGENT_DIR.parent.parent.resolve()
# Canonical backlog every worker shares (lives in the primary checkout, git-ignored).
SHARED_BACKLOG = AGENT_DIR / "backlog.json"
# Worktrees live in a sibling directory so we never nest a checkout inside itself.
WORKTREE_ROOT = REPO_ROOT.parent / ".agent-worktrees"

COPILOT_MODEL = os.environ.get("COPILOT_MODEL", "gpt-5-mini")


def run(cmd, cwd=None, check=False, capture=True):
    return subprocess.run(cmd, cwd=str(cwd) if cwd else None, capture_output=capture, text=True, check=check)


def worktree_path(worker_id: str) -> Path:
    return WORKTREE_ROOT / worker_id


def provision_worktree(worker_id: str, skip_install: bool) -> Path:
    """Create (or reuse) an isolated git worktree for a worker, off origin/main.
    Automatically links node_modules from the primary checkout to avoid slow,
    CPU-heavy, gigabyte-wasting duplicate installations on disk. On Windows,
    creates a Directory Junction which requires no special admin privileges.
    """
    path = worktree_path(worker_id)
    run(["git", "fetch", "origin", "main"], cwd=REPO_ROOT)

    if (path / ".git").exists():
        print(f"[orchestrator] Reusing existing worktree for {worker_id} at {path}")
    else:
        WORKTREE_ROOT.mkdir(parents=True, exist_ok=True)
        # Detached worktree at origin/main: the shared `main` branch stays owned by
        # the primary checkout, so workers must run detached (AUTOMATION_DETACH=1).
        res = run(["git", "worktree", "add", "--detach", str(path), "origin/main"], cwd=REPO_ROOT)
        if res.returncode != 0:
            print(f"[orchestrator] Failed to add worktree for {worker_id}: {res.stderr.strip()}")
            raise SystemExit(1)
        print(f"[orchestrator] Created worktree for {worker_id} at {path}")

    node_modules = path / "node_modules"
    primary_node_modules = REPO_ROOT / "node_modules"

    if primary_node_modules.exists() and not node_modules.exists():
        print(f"[orchestrator] Speed-linking node_modules from primary repo to {worker_id}...")
        try:
            if os.name == "nt":
                # Create a Windows Directory Junction: has high compatibility and needs no admin elevation
                # Use double-slashes or convert to absolute Path strings with safe quotes
                src_str = str(primary_node_modules).replace("/", "\\")
                dst_str = str(node_modules).replace("/", "\\")
                res = subprocess.run(f'mklink /J "{dst_str}" "{src_str}"', shell=True, capture_output=True, text=True, check=True)
            else:
                # Create standard symbolic link on Unix/MacOS
                os.symlink(src=str(primary_node_modules), dst=str(node_modules), target_is_directory=True)
            print(f"[orchestrator] Successfully linked node_modules for {worker_id}")
        except Exception as e:
            print(f"[orchestrator] Symlink linking failed (will fallback to npm installation): {e}")

    # Fallback to normal installation if symlinking failed or primary modules don't exist yet
    if not node_modules.exists() and not skip_install:
        print(f"[orchestrator] Installing node deps in {worker_id} (one-time fallback, may take a few minutes)...")
        res = run(["npm", "ci"], cwd=path, capture=False) if os.name != "nt" else run(["npm.cmd", "ci"], cwd=path, capture=False)
        if res.returncode != 0:
            print(f"[orchestrator] npm ci failed in {worker_id}; verification may fail until deps are installed.")

    return path


def worker_env(worker_id: str) -> dict:
    env = os.environ.copy()
    env["AUTOMATION_WORKER_ID"] = worker_id
    env["AUTOMATION_BACKLOG_PATH"] = str(SHARED_BACKLOG)
    env["AUTOMATION_MANAGED"] = "1"
    env["AUTOMATION_DETACH"] = "1"
    env["COPILOT_MODEL"] = COPILOT_MODEL
    return env


def spawn_worker(worker_id: str) -> subprocess.Popen:
    """Launch a run_autonomous loop inside the worker's own worktree."""
    cwd = worktree_path(worker_id) / "agents" / "dev-agent"
    print(f"[orchestrator] Spawning {worker_id} (cwd={cwd})")
    return subprocess.Popen([sys.executable, "run_autonomous.py"], cwd=str(cwd), env=worker_env(worker_id))


def teardown():
    """Remove all worktrees and prune git's registry."""
    if WORKTREE_ROOT.exists():
        for child in WORKTREE_ROOT.iterdir():
            if child.is_dir():
                print(f"[orchestrator] Removing worktree {child.name}")
                run(["git", "worktree", "remove", "--force", str(child)], cwd=REPO_ROOT)
        shutil.rmtree(WORKTREE_ROOT, ignore_errors=True)
    run(["git", "worktree", "prune"], cwd=REPO_ROOT)
    print("[orchestrator] Teardown complete.")


def orchestrate(num_workers: int, skip_install: bool):
    if not SHARED_BACKLOG.exists():
        print(f"[orchestrator] Shared backlog not found at {SHARED_BACKLOG}. Start the solo runner once to seed it.")
        raise SystemExit(1)

    worker_ids = [f"worker-{i + 1}" for i in range(num_workers)]

    print(f"[orchestrator] Provisioning {num_workers} isolated worktrees...")
    for wid in worker_ids:
        provision_worktree(wid, skip_install)

    procs: dict[str, subprocess.Popen] = {}
    for wid in worker_ids:
        procs[wid] = spawn_worker(wid)
        time.sleep(1)  # stagger startup so initial fetches/claims don't thundering-herd

    stopping = {"flag": False}

    def _handle_signal(signum, frame):
        stopping["flag"] = True
        print("\n[orchestrator] Shutdown signal received; stopping workers...")
        for wid, p in procs.items():
            if p.poll() is None:
                p.terminate()

    signal.signal(signal.SIGINT, _handle_signal)
    with_term = getattr(signal, "SIGTERM", None)
    if with_term is not None:
        signal.signal(with_term, _handle_signal)

    print(f"[orchestrator] {num_workers} workers running against shared backlog. Ctrl+C to stop.")
    try:
        while not stopping["flag"]:
            for wid in worker_ids:
                p = procs[wid]
                if p.poll() is not None and not stopping["flag"]:
                    print(f"[orchestrator] {wid} exited (code {p.returncode}); restarting.")
                    procs[wid] = spawn_worker(wid)
            time.sleep(5)
    finally:
        for wid, p in procs.items():
            if p.poll() is None:
                p.terminate()
        # Give workers a moment to exit cleanly.
        for p in procs.values():
            try:
                p.wait(timeout=15)
            except subprocess.TimeoutExpired:
                p.kill()
        print("[orchestrator] All workers stopped. Worktrees left in place (run --teardown to remove).")


def main():
    parser = argparse.ArgumentParser(description="Orchestrate N autonomous dev agents against one backlog.")
    parser.add_argument("--workers", "-n", type=int, default=2, help="Number of concurrent agents (default 2).")
    parser.add_argument("--skip-install", action="store_true", help="Skip npm ci in each worktree (reuse existing node_modules).")
    parser.add_argument("--teardown", action="store_true", help="Remove all agent worktrees and exit.")
    args = parser.parse_args()

    if args.teardown:
        teardown()
        return

    if args.workers < 1:
        print("[orchestrator] --workers must be >= 1")
        raise SystemExit(2)

    orchestrate(args.workers, args.skip_install)


if __name__ == "__main__":
    main()
