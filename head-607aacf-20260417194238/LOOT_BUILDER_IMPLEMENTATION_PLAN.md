# Loot Builder Rework Implementation Plan

This document maps the V1 loot builder rework onto the current Party Operations runtime.

It answers one practical question: which existing functions should be reused, which seams should be introduced, and in what order should the refactor land so the module stays stable while the loot builder changes from preview-first to claim-board-ready.

This plan assumes the design contract in `LOOT_BUILDER_REWORK_V1_SPEC.md` is the target.

## Summary

The current runtime already contains most of the generation primitives needed for V1:

- normalized draft handling
- deterministic seeded randomness
- budget resolution
- candidate building
- budget-aware item selection
- preview stats and warnings
- claim-board persistence and archive flows

The main gap is not raw capability. The main gap is product shape.

Today, the system generates a preview result and later publishes a translated subset of that preview into the claims board. V1 should instead generate a board-ready bundle first, then let the preview UI render that bundle.

## Existing Runtime Map

### Generation path already present

- `generateLootPreviewPayload(draftInput)` in `scripts/party-operations.js`
- `generateLootFromPackIds(packIds, input, options)` in `scripts/party-operations.js`
- `buildLootValueBudgetContext(draft, targetCount)` in `scripts/party-operations.js`
- `resolveLootRuntimeBudgetContext(draft, budgetContext)` in `scripts/party-operations.js`
- `resolveLootSelectionSeed(draft, budgetContext)` in `scripts/party-operations.js`
- `buildLootRandomContext(draft, budgetContext)` in `scripts/party-operations.js`
- `buildLootItemCandidates(sourceConfig, draft, warnings)` in `scripts/party-operations.js`
- `commitLootBudgetPick(state, picked)` in `scripts/party-operations.js`
- `buildLootPreviewContext()` in `scripts/party-operations.js`

### Claims board and publication path already present

- `publishLootPreviewToClaims()` in `scripts/party-operations.js`
- `buildLootClaimsContext(user)` in `scripts/party-operations.js`
- `normalizeLootClaimBoardRecord(value, fallback)` in `scripts/party-operations.js`
- `ensureLootClaimsState(ledger)` in `scripts/party-operations.js`
- `getLootClaimBoardFromState(claims, runIdInput, options)` in `scripts/party-operations.js`
- `clearLootClaimsPool(runIdInput)` in `scripts/party-operations.js`

### UI action owners already extracted

- GM loot page actions in `scripts/features/loot-ui.js`
- public API surface in `scripts/core/module-api.js`
- module API tests in `scripts/test-module-api.mjs`
- candidate-builder tests in `scripts/test-loot-item-candidate-sources.mjs`

## Core Refactor Strategy

Do not replace the preview pipeline in one shot.

Instead:

1. Introduce a new board-ready generator path.
2. Reuse current budget, seed, candidate, and selection helpers.
3. Move claim-board decoration and validation into a dedicated layer.
4. Make preview rendering consume the board-ready payload.
5. Leave publication and claims persistence mostly intact for the first pass, but change the input they receive.

This keeps risk low and preserves the current UI while changing the core contract underneath.

## Proposed File-Level Plan

## Phase 1: Add the New Runtime Contract

### 1. Add a new board-ready generator entrypoint

Primary edit target:

- `scripts/party-operations.js`

Add:

- `generateBoardReadyLootBundle(draftInput = {}, options = {})`

Initial implementation approach:

- call the existing draft normalization path
- call existing budget and random-context helpers
- call existing candidate builder
- call the current budget-aware selection logic
- build claim-board-ready items and currency
- return the new structured payload from the V1 spec

Important constraint:

- do not delete or break `generateLootPreviewPayload()` in this phase

### 2. Keep draft normalization unified

Primary edit target:

- `scripts/party-operations.js`

Reuse:

- existing preview draft normalization instead of creating a second incompatible draft format

If the current normalizer is too preview-named, introduce a thin alias:

- `normalizeLootBuilderDraft()` delegating to the current preview normalizer

That reduces migration pain without forcing a large rename immediately.

### 3. Add a board-ready payload validator

Primary edit target:

- `scripts/party-operations.js`

Add:

- `validateBoardReadyLootBundle(bundle)`

Responsibilities:

- verify required top-level keys
- verify required per-item keys
- verify runId consistency across items
- verify currency object structure
- verify failure payload shape when `status === "failed"`

This should be pure and side-effect free.

## Phase 2: Extract Low-Risk Pure Helpers

This is the first point where extraction into `scripts/features` becomes worthwhile.

### 4. Extract claim-board item decoration

New file:

- `scripts/features/loot-claim-bundle.js`

Add pure helpers such as:

- `decorateLootItemsForClaimBoard(items, context)`
- `buildLootClaimCurrencyState(currency)`
- `buildInitialLootClaimsLog()`
- `buildBoardReadyLootBundle(input)` as a thin composition helper if desired

Reason:

- this logic is not UI logic
- this logic is not storage logic
- it is a clean extraction boundary

### 5. Extract duplicate-unique enforcement and relaxation sequencing

New file:

- `scripts/features/loot-selection-rules.js`

Add pure helpers such as:

- `isLootCandidateUnique(candidate)`
- `enforceSameRunUniquePolicy(selected, candidate, context)`
- `buildLootRelaxationPlan(draft, context)`
- `applyNextLootRelaxationStep(state)`

Reason:

- duplicate and relaxation rules are policy, not UI
- they will need deterministic tests
- they are likely to evolve separately from rendering

### 6. Extract bundle audit construction

New file:

- `scripts/features/loot-audit.js`

Add pure helpers such as:

- `createLootAuditRecorder()`
- `appendLootConstraintResult(audit, entry)`
- `appendLootRelaxationStep(audit, entry)`
- `finalizeLootAuditPayload(audit)`

Reason:

- audit payload shape should not be buried inside UI or publication code

## Phase 3: Wire Preview To The New Bundle

### 7. Refactor `generateLootPreviewPayload()` into an adapter

Primary edit target:

- `scripts/party-operations.js`

Target end state:

- `generateLootPreviewPayload()` becomes a compatibility wrapper around `generateBoardReadyLootBundle()`

Expected behavior:

- call the board-ready generator
- translate or expose fields needed by the current preview UI
- preserve current result fields while adding compatibility for the new schema where possible

Why this is the right seam:

- the current GM loot page already reads preview context
- changing the generator output first avoids a risky UI-first refactor

### 8. Update preview context building to understand the new payload

Primary edit target:

- `buildLootPreviewContext()` in `scripts/party-operations.js`

Adjustments:

- read board-ready item metadata cleanly
- preserve existing preview cards and totals
- surface warnings from the new audit payload and warnings array
- optionally display the future publication status and run-readiness more explicitly

## Phase 4: Replace The Publish Translation Layer

### 9. Refactor `publishLootPreviewToClaims()` to accept board-ready bundles directly

Primary edit target:

- `scripts/party-operations.js`

Current issue:

- this function currently acts as a transformation layer from preview result to claim-board state

Target behavior:

- if the current preview result is already board-ready, publish it with minimal mutation
- only fill publication metadata such as `publishedAt` and `publishedBy`
- write the resulting board object into `claims.boards`

Keep these responsibilities here for now:

- persistence into operations ledger
- player socket fanout
- selection of active board
- user notifications

Move these responsibilities out over time:

- item decoration
- data contract guessing
- missing-field repair

### 10. Keep board normalization as the last guardrail

Primary edit target:

- `normalizeLootClaimBoardRecord()` in `scripts/party-operations.js`

Desired role after refactor:

- normalize and defend against legacy or partially migrated records
- not serve as the primary constructor for newly generated bundles

That distinction matters. Construction should happen in the builder path. Normalization should remain defensive.

## Phase 5: Expand Public API Carefully

### 11. Add the new builder to the module API

Primary edit target:

- `scripts/core/module-api.js`

Add an API method such as:

- `generateLootBundle: (draft, options) => generateBoardReadyLootBundle(draft, options)`

Keep:

- `previewLoot()` for backward compatibility
- `generateLootFromPackIds()` unchanged until downstream callers are migrated

### 12. Update API tests

Primary edit target:

- `scripts/test-module-api.mjs`

Add assertions for:

- new `generateLootBundle()` export
- backwards compatibility for `previewLoot()`
- no regression in existing loot API methods

## Phase 6: Test The Extracted Rules

### 13. Add focused tests for board-ready validation

Recommended new file:

- `scripts/test-loot-board-ready-bundle.mjs`

Test cases:

- success payload contains required top-level keys
- per-item required claim metadata exists
- failure payload is structured and safe
- runId consistency across items is enforced

### 14. Add focused tests for duplicate and relaxation rules

Recommended new file:

- `scripts/test-loot-selection-rules.mjs`

Test cases:

- unique duplicate candidates are blocked in-run
- reroll limit stops at 3 attempts
- relaxation order is exact and stable
- hard constraints remain hard after relaxation

### 15. Extend candidate-builder and generation tests

Existing file to extend:

- `scripts/test-loot-item-candidate-sources.mjs`

Recommended new coverage:

- source precedence resolution across module, world, and compendium tiers
- disabled source behavior remains explicit and warning-backed
- manifest scoping still behaves under the new bundle pipeline

### 16. Add claim publication tests if possible at the function boundary

Recommended new file:

- `scripts/test-loot-claims-publish.mjs`

Test cases:

- publishing a valid board-ready bundle writes one open board
- active board selection updates correctly
- publication metadata is stamped once
- player socket messages include `runId` and item counts

## Detailed Function Mapping

## Reuse as-is in early phases

- `buildLootValueBudgetContext()`
- `resolveLootRuntimeBudgetContext()`
- `resolveLootSelectionSeed()`
- `buildLootRandomContext()`
- `buildLootItemCandidates()`
- `calculateLootPreviewValueTotals()`
- `rollLootCurrency()`
- `ensureLootClaimsState()`
- `getLootClaimBoardFromState()`

These already align with V1 needs and should not be rewritten first.

## Wrap, do not replace immediately

- `generateLootPreviewPayload()`
- `buildLootPreviewContext()`
- `publishLootPreviewToClaims()`

These are integration seams. Changing them wholesale at the start would increase break risk.

## Extract to pure helpers early

- duplicate-unique policy
- relaxation plan construction
- claim-board item decoration
- audit payload building
- board-ready payload validation

These rules benefit from small isolated tests and do not need to live inside the monolith forever.

## Leave alone unless required by downstream issues

- `buildLootClaimsContext()`
- `clearLootClaimsPool()`
- `GmLootClaimsBoardApp`
- `templates/gm-loot-claims-board.hbs`

Reason:

- the claim-board runtime already works well enough as a consumer of claim records
- V1 is primarily a builder-contract refactor, not a board UI rewrite

## Recommended Execution Order

1. Add `generateBoardReadyLootBundle()` in `scripts/party-operations.js`.
2. Add `validateBoardReadyLootBundle()` in `scripts/party-operations.js`.
3. Extract board-decoration and validation helpers into `scripts/features` once behavior is proven.
4. Make `generateLootPreviewPayload()` call the new generator and adapt its output.
5. Refactor `publishLootPreviewToClaims()` to publish the board-ready bundle with minimal translation.
6. Export the new generator in `scripts/core/module-api.js`.
7. Add tests for bundle validation, duplicate rules, and publication.
8. Only then decide whether preview-specific fields can be retired.

## Risks To Watch

### 1. Preview/result dual-shape drift

If preview and board-ready outputs diverge too much during migration, the GM page will become a compatibility burden.

Mitigation:

- make preview a projection of the board-ready result as early as possible

### 2. Claim-board constructor ambiguity

If both the builder and the publish path keep constructing board items differently, subtle bugs will appear in assignment and archive flows.

Mitigation:

- centralize item decoration in one pure helper and make publish consume that output directly

### 3. Hidden assumptions in existing claim item shape

The claim board templates and action handlers may rely on fields that are currently only implied.

Mitigation:

- validate against the current board consumer paths before deleting any legacy fields
- let `normalizeLootClaimBoardRecord()` stay defensive during the migration

### 4. API regression risk

External users may already call `previewLoot()` or `generateLootFromPackIds()`.

Mitigation:

- add the new API rather than replacing existing ones in the first pass

## Definition Of Done For The Implementation Phase

This plan is complete when:

1. a new board-ready generator exists and returns the V1 contract
2. preview generation uses that generator rather than duplicating core logic
3. publication writes that board-ready result into `claims.boards` with minimal transformation
4. API consumers can call the new generator directly
5. tests cover deterministic output, payload validity, and claim publication

## Recommendation

The first code change should be small and structural:

- add `generateBoardReadyLootBundle()`
- add `validateBoardReadyLootBundle()`
- keep them in `scripts/party-operations.js` initially

That gives the refactor a stable center before extracting helpers into `scripts/features`.
