---
description: "Use when a feature appears broken and you need an audit-to-fix loop for Party Operations runtime JS with targeted validation."
---

Run a focused integrity workflow for this request:

`{{REQUEST}}`

## Constraints
- Runtime source of truth is JavaScript in `scripts/`.
- Keep changes minimal and local to the root cause.
- Do not expand scope to unrelated subsystems.

## Workflow
1. Audit the call path and wiring from entrypoint/hook/UI action to outcome.
2. Identify the exact root cause with concrete file/symbol evidence.
3. Propose a minimal patch plan (1-3 edits max if possible).
4. Implement patch.
5. Run the most relevant `scripts/test-*.mjs` checks first.
6. If green, summarize changed files, behavior impact, and residual risks.

## Output
- Root cause
- Patch summary
- Validation results
- Follow-up (optional)
