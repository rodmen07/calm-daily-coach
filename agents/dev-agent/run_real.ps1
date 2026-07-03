$env:FORCE_TASK_ID = 'cdc-003'
$env:DRY_RUN = '0'
$env:LLM_PROVIDER = 'auto'
$env:COPILOT_CMD = 'copilot compose --prompt - --output-format json --silent --allow-all-tools --allow-all-paths'

Set-Location $PSScriptRoot
python .\main.py
