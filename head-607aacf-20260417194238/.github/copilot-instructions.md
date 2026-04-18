# Party Operations Chat Tooling Instructions

Use the external developer tooling repo at `E:\Computer Upgrades` when it materially improves the task.

## When To Use External Tools

- Prefer the workspace task `external-tools:repo-health` or the script `E:\Computer Upgrades\scripts\langgraph_repo_health.py` for repository health summaries, validation-entrypoint audits, release-readiness overviews, and git/package/module state summaries.
- Prefer `external-tools:test-summary` or `E:\Computer Upgrades\scripts\langgraph_test_summary.py` when the user asks for failing-check triage, test failure clustering, or a concise summary of broken validation commands.
- Prefer `external-tools:release-readiness` or `E:\Computer Upgrades\scripts\langgraph_release_readiness.py` when the user asks whether the repo is ready to package, release, or build a zip.
- Prefer `external-tools:workflow-history` or `E:\Computer Upgrades\scripts\langgraph_workflow_history.py` when the user asks for trend/history summaries, previous-run comparisons, or regression direction over time.
- Prefer the external LangGraph scripts for multi-step analysis, orchestration, or summarization tasks where a planner plus structured summary is better than a one-off shell command.
- Prefer `external-tools:verify` when the user asks whether the external tool stack is installed or working.
- Prefer `external-tools:setup` when the user asks to install, restore, or refresh the external tool stack.

## How To Use Them

- Default external LangGraph runs to mock mode unless real provider credentials are clearly configured and needed.
- The external tool repo loads provider settings from `E:\Computer Upgrades\.env`.
- When a matching workspace task exists in `.vscode/tasks.json`, prefer that task over manually retyping the equivalent shell command.

## Tool Selection Guidance

- Do not force LangGraph or memori into trivial file edits, direct code fixes, or simple searches where normal workspace tools are faster.
- Use `memori` only when persistent memory or saved state would materially improve a workflow; do not add memory usage as ceremony.
- Use external tooling to augment the normal coding workflow, not replace direct repository edits, tests, or validation already available in this workspace.

## Current External Capabilities

- `memori`
- `langgraph`
- `langchain-openai`
- `pydantic`
- `sqlalchemy`
- `python-dotenv`
- `tmux`
- `werks`

## Current External Tasks

- `external-tools:setup`
- `external-tools:verify`
- `external-tools:langgraph-starter`
- `external-tools:repo-health`
- `external-tools:test-summary`
- `external-tools:release-readiness`
- `external-tools:workflow-history`
- `external-tools:workflow-history-test-summary`
- `external-tools:agent-mock`
- `external-tools:agent-copilot`
- `external-tools:agent-codex`
- `external-tools:agent-azure`