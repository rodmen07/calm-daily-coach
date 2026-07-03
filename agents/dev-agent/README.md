# Calm Daily Coach - Autonomous Dev Agent Scaffold

This directory houses an autonomous developer agent scaffold tailored for **calm-daily-coach** React and Next.js frontend development.

Designed with a decoupled architecture, it runs both locally and inside automated environments (such as Docker, custom CI/CD tasks, or GitHub Actions pipelines).

## Key Capabilities

- 🔍 **Safe Exploration**: Scuns code structures and patterns prior to modification.
- 🛠️ **Correct-by-Construction**: Directly integrates with workspace compiler verification.
- 🧪 **Self-HEAL Tooling**: Captures test failures and TypeScript validation outputs, feeding error logs directly back to the LLM to write successful fixes iteratively.
- 💾 **State Persistence**: Serializes progress to local state management, ensuring safe resumption upon unexpected API rate-limiting or network issues.

---

## Folder Layout

The scaffold comprises the following core elements:

- [agents/dev-agent/backlog.json](agents/dev-agent/backlog.json): Concrete development queue containing task descriptions.
- [agents/dev-agent/state.json](agents/dev-agent/state.json): Completion logs and run counts.
- [agents/dev-agent/llm_client.py](agents/dev-agent/llm_client.py): Dynamic client for OpenAI (GPT-4o, GPT-4o mini, o3-mini), Anthropic (Claude-3.5-haiku / Sonnet), and Google Gemini (Gemini-2.5-flash).
- [agents/dev-agent/tools.py](agents/dev-agent/tools.py): Capabilities mapped as tool schemas (read, edit, search, and verify).
- [agents/dev-agent/prompts.py](agents/dev-agent/prompts.py): System guidelines enforcing zero placeholder comments, idiomatic style, and test completeness.
- [agents/dev-agent/main.py](agents/dev-agent/main.py): Stepwise tool dispatch and correction loop (single-task execution).
- [agents/dev-agent/runner.py](agents/dev-agent/runner.py): Orchestrates full-backlog transitions, branch pushing, and automated pull requests securely.

---

## Quick Start Configuration

### 1. Set Up the Prerequisites

From the repository root directory, prepare your local virtual environment:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r agents/dev-agent/requirements.txt
```

Ensure Node dependencies are ready to verify task integrations:

```powershell
npm install
```

### 2. Set API Tokens & Environmental Controls

Select your desired model and configure the tokens:

```powershell
# Default Provider: OpenAI (gpt-4o-mini is recommended for cheap and fast runs)
$env:OPENAI_API_KEY = "sk-..."

# Or choose Anthropic Claude Model
$env:LLM_PROVIDER = "anthropic"
$env:LLM_MODEL = "claude-3-5-sonnet-20241022"
$env:ANTHROPIC_API_KEY = "sk-ant-..."

# If using OpenAI reasoning models (o3-mini / o1) and wanting to tune the effort preset:
# $env:LLM_MODEL = "o3-mini"
# $env:REASONING_EFFORT = "medium"  # none, minimal, low, medium, high, xhigh
```

---

## Execution Guide

### Trigger Single Task (for testing/inspection)
```powershell
$env:FORCE_TASK_ID = "cdc-001"
python agents/dev-agent/main.py
```

### Run Entire Backlog Loop
```powershell
python agents/dev-agent/runner.py
```

---

## Safety Constraints

- **PR Guard**: Git branches are dynamically created for each task, avoiding uncommitted overlap in your working directory.
- **Fail-Safe termination**: If verification fails and retry loops are exhausted, execution stops gracefully and yields to manual developer review without pushing bad code.
- **Cost control**: Loop limits are bounded to a maximum of 30 round-trips to defend against accidental recursive calls.
