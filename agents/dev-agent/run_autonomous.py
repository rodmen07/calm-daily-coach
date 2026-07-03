import os
import json
import time
import random
import subprocess
from pathlib import Path

ROOT = Path(__file__).parent
REPO_ROOT = ROOT.parent.parent
BACKLOG = ROOT / "backlog.json"

# Seconds between iterations when there is nothing to do.
POLL_INTERVAL = int(os.environ.get("AUTOMATION_POLL_INTERVAL", "5"))
# Keep at least this many pending tasks in the backlog at all times.
MIN_PENDING = int(os.environ.get("AUTOMATION_MIN_PENDING", "5"))
# How many tasks to add whenever the backlog runs low.
REPLENISH_BATCH = int(os.environ.get("AUTOMATION_REPLENISH_BATCH", "8"))
# Max attempts before a task is parked so it stops burning model requests.
MAX_ATTEMPTS = int(os.environ.get("AUTOMATION_MAX_ATTEMPTS", "3"))
# Cheapest included model keeps the automation running even past premium quota.
COPILOT_MODEL = os.environ.get("COPILOT_MODEL", "gpt-5-mini")

# Rotating pool of frontend feature ideas for calm-daily-coach. Used to keep the
# backlog non-empty so the automation always has work.
FRONTEND_TASK_POOL = [
    ("Add breathing exercise timer component", "Build a BreathingTimer React component with configurable inhale/hold/exhale durations and a calming animated ring.", ["src/components/BreathingTimer.tsx", "src/styles/breathing-timer.css"]),
    ("Add daily affirmation card", "Create an AffirmationCard component that shows a rotating daily affirmation with a refresh action.", ["src/components/AffirmationCard.tsx", "src/lib/affirmations.ts"]),
    ("Add mood tracker widget", "Implement a MoodTracker component allowing users to log their mood with emoji buttons and persist to local storage.", ["src/components/MoodTracker.tsx", "src/lib/mood-storage.ts"]),
    ("Add gratitude journal entry form", "Create a GratitudeJournal component with a text entry form and a list of recent entries.", ["src/components/GratitudeJournal.tsx", "src/styles/gratitude.css"]),
    ("Add streak progress indicator", "Build a StreakIndicator component that displays the user's current daily streak with a progress bar.", ["src/components/StreakIndicator.tsx", "src/lib/streak.ts"]),
    ("Add calming color theme switcher", "Add a ThemeSwitcher component offering multiple calming color palettes stored in preferences.", ["src/components/ThemeSwitcher.tsx", "src/styles/themes.css"]),
    ("Add guided meditation list", "Create a MeditationList component that renders available guided meditations with duration badges.", ["src/components/MeditationList.tsx", "src/lib/meditations.ts"]),
    ("Add focus session countdown", "Implement a FocusSession component with a Pomodoro-style countdown and start/pause controls.", ["src/components/FocusSession.tsx", "src/lib/focus-timer.ts"]),
    ("Add reminder settings panel", "Build a ReminderSettings component for enabling daily reminders and choosing a time.", ["src/components/ReminderSettings.tsx", "src/lib/reminders.ts"]),
    ("Add responsive footer with links", "Create an accessible Footer component with navigation links and social icons.", ["src/components/Footer.tsx", "src/styles/footer.css"]),
    ("Add loading spinner component", "Add a reusable Spinner component with size and color props plus unit tests.", ["src/components/Spinner.tsx", "src/components/__tests__/Spinner.test.tsx"]),
    ("Add empty state illustration component", "Create an EmptyState component that shows an illustration and message when lists are empty.", ["src/components/EmptyState.tsx", "src/styles/empty-state.css"]),
    ("Add keyboard shortcut help modal", "Implement a ShortcutsModal component listing keyboard shortcuts, toggled with '?'.", ["src/components/ShortcutsModal.tsx", "src/lib/shortcuts.ts"]),
    ("Add progress ring visualization", "Build a ProgressRing SVG component that animates from 0 to a target percentage.", ["src/components/ProgressRing.tsx", "src/components/__tests__/ProgressRing.test.tsx"]),
    ("Add tag filter chips", "Create a TagFilter component with selectable chips that filter a list of items.", ["src/components/TagFilter.tsx", "src/styles/tag-filter.css"]),
    ("Add scroll-to-top button", "Add a ScrollToTop button that appears after scrolling and smoothly returns to the top.", ["src/components/ScrollToTop.tsx", "src/lib/use-scroll.ts"]),
]


def log(msg):
    print(msg, flush=True)


def load_backlog():
    return json.loads(BACKLOG.read_text(encoding="utf-8"))


def save_backlog(data):
    BACKLOG.write_text(json.dumps(data, indent=2), encoding="utf-8")


def next_task_number(data):
    """Return the next numeric suffix for a cdc-#### id."""
    highest = 0
    for t in data.get("tasks", []):
        tid = t.get("id", "")
        if tid.startswith("cdc-"):
            try:
                highest = max(highest, int(tid.split("-")[1]))
            except (ValueError, IndexError):
                continue
    return highest + 1


def replenish_backlog(data):
    """Append fresh frontend tasks so the backlog is never empty."""
    start = next_task_number(data)
    picks = random.sample(FRONTEND_TASK_POOL, min(REPLENISH_BATCH, len(FRONTEND_TASK_POOL)))
    for i, (title, description, files) in enumerate(picks):
        num = start + i
        data["tasks"].append({
            "id": f"cdc-{num:03d}",
            "title": title,
            "description": description,
            "files_to_touch": files,
            "status": "pending",
        })
    save_backlog(data)
    log(f"Replenished backlog with {len(picks)} new frontend tasks (starting cdc-{start:03d}).")


def clean_git_state():
    """Reset the repo to a clean main so a fresh task branch can be created."""
    try:
        lock = REPO_ROOT / ".git" / "index.lock"
        if lock.exists():
            lock.unlink()
        subprocess.run(["git", "checkout", "--", "."], cwd=str(REPO_ROOT), capture_output=True, text=True)
        subprocess.run(["git", "checkout", "main"], cwd=str(REPO_ROOT), capture_output=True, text=True)
        subprocess.run(["git", "reset", "--hard", "origin/main"], cwd=str(REPO_ROOT), capture_output=True, text=True)
        subprocess.run(["git", "stash", "clear"], cwd=str(REPO_ROOT), capture_output=True, text=True)
    except Exception as e:
        log(f"clean_git_state warning: {e}")


def create_pr_and_enable_auto(branch_name, title, body):
    try:
        res = subprocess.run(
            ["gh", "pr", "create", "--base", "main", "--head", branch_name, "--title", title, "--body", body],
            cwd=str(REPO_ROOT), capture_output=True, text=True,
        )
        if res.returncode != 0:
            log(f"gh pr create failed: {res.stderr.strip()}")
            return None
        url = res.stdout.strip().splitlines()[-1] if res.stdout.strip() else ""
        num = subprocess.run(
            ["gh", "pr", "view", branch_name, "--json", "number", "--jq", ".number"],
            cwd=str(REPO_ROOT), capture_output=True, text=True,
        )
        pr_num = num.stdout.strip()
        if pr_num:
            subprocess.run(
                ["gh", "pr", "merge", pr_num, "--auto", "--merge"],
                cwd=str(REPO_ROOT), capture_output=True, text=True,
            )
        return url
    except Exception as e:
        log(f"Error creating PR: {e}")
        return None


def run_task(task):
    task_id = task["id"]
    log(f"Starting task {task_id} - {task['title']}")

    env = os.environ.copy()
    env["FORCE_TASK_ID"] = task_id
    env["DRY_RUN"] = "0"
    env["LLM_PROVIDER"] = env.get("LLM_PROVIDER", "auto")
    env["COPILOT_MODEL"] = env.get("COPILOT_MODEL", COPILOT_MODEL)

    proc = subprocess.run(["python", "main.py"], cwd=str(ROOT), env=env, capture_output=True, text=True)
    if proc.stdout:
        log(proc.stdout)

    if proc.returncode == 0:
        branch_name = f"dev-agent/{task_id}-{task['title'].lower().replace(' ', '-')}"
        branch_name = "".join(c for c in branch_name if c.isalnum() or c in "-/")
        subprocess.run(["git", "push", "-u", "origin", branch_name], cwd=str(REPO_ROOT), capture_output=True, text=True)
        pr_url = create_pr_and_enable_auto(branch_name, f"feat({task_id}): {task['title']}", f"Automated frontend change for {task_id}.")
        log(f"PR created: {pr_url}")
        return True

    log(f"Task {task_id} failed: {proc.stderr.strip()[:500]}")
    return False


def process_once():
    data = load_backlog()

    # Keep the backlog stocked with frontend work.
    pending = [t for t in data.get("tasks", []) if t.get("status") == "pending"]
    if len(pending) < MIN_PENDING:
        replenish_backlog(data)
        data = load_backlog()
        pending = [t for t in data.get("tasks", []) if t.get("status") == "pending"]

    if not pending:
        log("No pending tasks. Sleeping...")
        time.sleep(POLL_INTERVAL)
        return

    task = pending[0]
    clean_git_state()
    ok = run_task(task)

    # Reload to avoid clobbering status main.py may have written.
    data = load_backlog()
    for t in data.get("tasks", []):
        if t["id"] == task["id"]:
            if ok:
                t["status"] = "completed"
            else:
                t["attempts"] = t.get("attempts", 0) + 1
                t["status"] = "parked" if t["attempts"] >= MAX_ATTEMPTS else "pending"
            break
    save_backlog(data)
    time.sleep(1)


def main_loop():
    log(f"Autonomous runner started (model={COPILOT_MODEL}, min_pending={MIN_PENDING}). Press Ctrl+C to stop.")
    while True:
        try:
            process_once()
        except KeyboardInterrupt:
            log("Interrupted by user. Exiting.")
            return
        except Exception as e:
            # Never die: log and keep looping for maximum uptime.
            log(f"Unhandled error, continuing: {e}")
            time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main_loop()
