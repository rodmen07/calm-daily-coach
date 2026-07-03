import os
import runpy
import sys

# Configure supervised dry-run environment
os.environ.setdefault("DRY_RUN", "1")
# Allow forcing task id via CLI arg otherwise use cdc-003
if len(sys.argv) > 1:
    os.environ["FORCE_TASK_ID"] = sys.argv[1]
else:
    os.environ.setdefault("FORCE_TASK_ID", "cdc-003")

print(f"Running supervised dry-run: FORCE_TASK_ID={os.environ['FORCE_TASK_ID']}, DRY_RUN={os.environ['DRY_RUN']}")

runpy.run_path("main.py", run_name="__main__")
