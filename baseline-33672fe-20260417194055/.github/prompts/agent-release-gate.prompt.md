---
description: "Use when preparing to commit/push/package and you need a deterministic release gate for Party Operations test/stable flows."
---

Apply this release gate for the current workspace state.

## Steps
1. Verify branch and git cleanliness assumptions.
2. Confirm version semantics:
   - stable: `x.y.z`
   - test: `x.y.z-test.n`
3. Run targeted validation for touched subsystems first.
4. Decide if broad `npm run check` is required before release.
5. If clear, provide exact commit/push/package sequence.
6. Return expected artifact names and checksum outputs.

## Return
- Go/No-go
- Blocking issues (if any)
- Exact next commands/tasks
- Artifact checklist
