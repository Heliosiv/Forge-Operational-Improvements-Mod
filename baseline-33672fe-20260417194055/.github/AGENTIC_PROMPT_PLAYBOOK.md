# Agentic Prompt Playbook (Party Operations)

This playbook maps practical agentic design patterns to the existing project setup (`scripts/party-operations.js`, extracted feature modules, test scripts, and custom agents under `.github/agents`).

## Default Pattern Order

1. **Routing**: classify the request and select one primary specialist lane.
2. **Workflow (Prompt Chaining)**: audit -> plan -> implement -> targeted validate.
3. **Evaluator-Optimizer**: run one critique/refinement pass for high-risk changes.
4. **Release Gate**: check/push/package only after validations pass.

Keep complexity minimal: start with one specialist lane unless cross-domain coupling is obvious.

## Agent Mapping (This Repo)

- **Functionality Integrity Analyst**: hook wiring, call paths, dead code, integration gaps.
- **Gameplay Fun & Balance Analyst**: horde loot progression identity and reward pacing.
- **Foundry Permissions Intent Analyst**: ownership defaults, visibility, journal/note access.
- **UI/UX Player & GM Analyst**: clarity and friction in player/GM flows.
- **Workspace Performance & Refactor Analyst**: extraction targets, render/data-flow bottlenecks.
- **Explore**: quick context gathering and codebase Q&A.

## Ready Prompt Assets

Use the prompts in `.github/prompts/`:

- `agent-router.prompt.md`
- `agent-integrity-fix-loop.prompt.md`
- `agent-gameplay-contract.prompt.md`
- `agent-release-gate.prompt.md`

## Notes

- Prefer targeted test scripts in `scripts/test-*.mjs` before broad `npm run check`.
- For release checks, prefer workspace tasks under `.vscode/tasks.json` when available.
- Keep edits surgical in existing runtime JS modules (`scripts/module.js`, `scripts/hooks`, `scripts/features`, `scripts/party-operations.js`).
