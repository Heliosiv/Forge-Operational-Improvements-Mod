# Loot Builder Rework V1 Spec

This document defines the V1 contract for reworking the loot builder from a preview-oriented generator into a board-ready loot bundle generator that hands off directly to the Live Claim Board.

It is intended to fit the current Party Operations architecture and current runtime constraints:

- Runtime authority remains in `scripts/party-operations.js`.
- New logic should prefer extraction into `scripts/features` or narrower modules where practical.
- The builder must produce output that can be normalized into the existing loot claim board record shape with minimal translation.

## Goals

- Generate a single finalized loot bundle for immediate use.
- Feed the generated bundle directly into the Live Claim Board flow.
- Keep deterministic budget, rarity, and source-resolution logic separate from bounded random selection.
- Preserve a clear audit trail so GMs can understand why a bundle was produced.
- Keep the generation path fast enough for routine GM use.

## Non-Goals For V1

- Rebuilding the entire claim board UI in this spec.
- Solving cross-session duplicate suppression beyond current no-op behavior.
- Designing a new loot economy model for every supported game system.
- Replacing all existing preview-generation code in one step.
- Formalizing journal logging changes beyond handoff-ready payload requirements.

## Current Runtime Anchors

The V1 design should align with these existing runtime behaviors:

- `generateLootPreviewPayload(draftInput)` already normalizes inputs, builds a random context, generates candidates, and returns stats and warnings.
- `generateLootFromPackIds(packIds, input, options)` already supports pack-driven candidate selection and seeded randomness.
- `buildLootClaimsContext(user)` and the claim-board normalization layer already treat loot as run-oriented records with item, currency, claims, and archive metadata.
- Player claim handling already expects `runId`, `actorId`, and `itemId` as the core action contract.

## V1 Product Direction

The loot builder should no longer stop at a preview payload intended mainly for the GM panel.

Instead, V1 should produce a board-ready draft bundle with:

- normalized input metadata
- deterministic budget and rarity decisions
- randomized item and currency outcomes within those constraints
- direct claim-board item metadata
- structured audit output
- GM-facing warning data

The result can still be shown as a preview, but preview is no longer the final product. The final product is a publishable claim-board bundle.

## Primary Function Contract

Recommended V1 entrypoint:

```js
async function generateBoardReadyLootBundle(draftInput = {}, options = {})
```

Recommended behavior:

1. Normalize input into a canonical draft object.
2. Resolve deterministic budget, rarity, and source rules.
3. Build the candidate pool from configured sources.
4. Apply hard constraints.
5. Select items and currency using seeded randomness when deterministic mode is enabled.
6. Apply same-run duplicate-unique protection.
7. Build claim-board-ready item rows and currency rows.
8. Emit stats, warnings, and structured audit data.
9. Return a result object that is valid for immediate claim-board publication or structured failure handling.

## Inputs

The builder should accept a normalized draft with support for these V1 inputs.

### Required logical inputs

- party level or equivalent APL input
- party size
- encounter difficulty or CR bracket
- location or biome hint
- rarity cap configuration
- story tags or thematic tags

### Existing and compatible operational inputs

- mode
- challenge
- profile
- scale
- creatures or actorCount
- deterministic
- seed
- dateBucket
- distributionMix
- valueBudgetScalar
- valueStrictness
- maxItemValueGp
- targetItemsValueGp
- currencyScalar
- itemScalar

### Input normalization rules

- All builder inputs must be normalized before any budget or selection logic runs.
- Missing numeric values must default to safe bounded values, not `NaN`.
- Missing string fields must collapse to known defaults, not empty-state drift.
- Theme tags should normalize to a de-duplicated lower-cased list.
- Rarity constraints should normalize to explicit floor and ceiling values.
- Deterministic mode should always resolve to a stable seed if enabled.

## Deterministic Vs Random Responsibilities

The current hybrid requirement should be made explicit.

### Deterministic responsibilities

These must resolve identically for the same normalized input and same seed context:

- total value budget by encounter or APL
- rarity floors and ceilings
- source precedence resolution
- strictness band and tolerance
- candidate eligibility filtering
- fallback relaxation sequencing
- audit decision trail

### Randomized responsibilities

These may vary by seed, but must remain inside deterministic constraints:

- exact item picks within the valid pool
- exact item quantities for stackables or batchable items
- currency denomination breakdown
- bonus or chase item occurrence
- companion or bundle composition inside the budget

## Source Precedence

V1 source precedence is:

1. Curated module sources
2. World overrides
3. Compendium fallback

Expected behavior:

- If the same normalized item concept appears in more than one tier, the highest-priority source wins.
- Lower-priority sources remain eligible only when the higher-priority tier has no valid candidate for the current decision.
- The chosen source tier and winning candidate should be recorded in audit data.

## Rarity Mapping

V1 uses a fixed APL-band table as the primary authority.

Optional per-world formula or override logic may exist, but only as an explicit override path. The fixed band table remains the baseline and fallback.

Expected behavior:

- APL or encounter bracket selects a rarity floor and ceiling.
- Manual rarity caps can further narrow the window.
- Relaxation may widen rarity by one band at a time, but only after earlier relaxation steps are exhausted.

## Story Tag Behavior

Story tags should use a mixed strategy:

- Hard filter when the thematic pool is large enough.
- Fallback to weighted preference when the hard filter would over-collapse the candidate pool.

Expected behavior:

- Tags should bias toward thematic coherence.
- Tags should not produce repeated empty generations when the source pool is small.
- Every tag-based restriction or fallback should be visible in the audit log.

## Constraint Model

### Hard constraints

- Candidate must come from an enabled source.
- Candidate must fit the current rarity band.
- Candidate must fit value caps after normalization.
- Duplicate unique items are never allowed within the same run.
- Claim-board payload must be structurally valid on success.

### Soft constraints

- Story-tag match strength
- value-target proximity
- bundle cohesion
- category balance
- chase-item chance

Soft constraints may be relaxed. Hard constraints may not.

## Relaxation Pipeline

If no valid bundle is found on the first pass, the builder must use this exact relaxation order:

1. Loosen story-tag hard filter
2. Widen weighting thresholds
3. Widen rarity floor or ceiling by one band
4. Expand source scope
5. Lower value-target strictness

Rules:

- Each relaxation step must be recorded in the audit payload.
- Same-run unique duplication remains blocked even after relaxation.
- If all relaxation steps fail, the builder returns a structured failure result instead of throwing.

## Duplicate-Unique Policy

V1 duplicate policy is intentionally narrow.

### In-run behavior

- Duplicate unique items are hard blocked within the same generated run.
- If a unique duplicate is selected, reroll up to 3 times in the current band.
- If still blocked, continue after the current relaxation step.
- If still unresolved after the full relaxation pipeline, drop the duplicate and emit a warning.

### Cross-session behavior

- No cross-session duplicate protection in V1.
- Existing recent-roll weighting can continue to bias against repeats if already available, but it is not a hard contract requirement for V1 success.

## Currency Model

V1 currency generation should be produced as a single total value that is auto-denominated into coin types.

Expected behavior:

- Currency shares the overall encounter budget with items.
- Currency uses gp-equivalent accounting for audit and validation.
- Returned payload includes both original denomination values and gp-equivalent summary.
- Claim-board handoff uses `currency` and `currencyRemaining` at publication time.

## Output Contract

Every generation call must return a structured object.

### Top-level required fields on success

- `status`
- `runId`
- `generatedAt`
- `generatedBy`
- `draft`
- `sourceSummary`
- `currency`
- `currencyRemaining`
- `items`
- `claimsLog`
- `claimMetadata`
- `stats`
- `audit`
- `warnings`

### Top-level required fields on failure

- `status: "failed"`
- `runId`
- `generatedAt`
- `generatedBy`
- `draft`
- `currency`
- `currencyRemaining`
- `items: []`
- `claimsLog: []`
- `stats`
- `audit`
- `warnings`

### Recommended return shape

```js
{
  status: "ok" | "failed",
  runId: "abc123",
  generatedAt: 1760000000000,
  generatedBy: "GM",
  publishedAt: 0,
  publishedBy: "",
  draft: { ...normalizedInput },
  sourceSummary: {
    precedence: ["module", "world", "compendium"],
    enabledItemSources: 0,
    enabledTableSources: 0
  },
  currency: {
    pp: 0,
    gp: 42,
    sp: 5,
    cp: 0,
    gpEquivalent: 42.5
  },
  currencyRemaining: {
    pp: 0,
    gp: 42,
    sp: 5,
    cp: 0,
    gpEquivalent: 42.5
  },
  items: [
    {
      itemId: "item-1",
      sourceId: "Compendium.x.y",
      displayName: "Potion of Healing",
      image: "icons/...",
      rarity: "common",
      estimatedValueGp: 50,
      quantity: 2,
      quantityRemaining: 2,
      runId: "abc123",
      lockState: "open",
      lockExpiresAt: 0,
      createdAt: 1760000000000,
      isClaimed: false,
      eligibleActorIds: []
    }
  ],
  claimsLog: [],
  claimMetadata: {
    boardReady: true,
    autoOpenPlayers: true,
    defaultSort: "value-desc"
  },
  stats: {
    candidateCount: 0,
    itemCountTarget: 0,
    itemCountGenerated: 0,
    finalItemsValueGp: 0,
    finalCurrencyValueGp: 0,
    finalCombinedValueGp: 0,
    deterministic: true,
    seed: "..."
  },
  audit: {
    normalizedInputs: {},
    constraintChecks: [],
    relaxationSteps: [],
    sourceSelections: [],
    warnings: []
  },
  warnings: []
}
```

## Claim Board Handoff Contract

The builder output must be valid for immediate normalization into a live claim-board record.

### Required top-level claim-board keys

- `runId`
- `status`
- `publishedAt`
- `publishedBy`
- `items`
- `currency`
- `currencyRemaining`
- `claimsLog`
- `audit`

### Required per-item claim metadata

- `itemId`
- `sourceId`
- `displayName`
- `image`
- `rarity`
- `estimatedValueGp`
- `quantity`
- `quantityRemaining`
- `runId`
- `lockState`
- `lockExpiresAt`
- `createdAt`
- `isClaimed`

### Optional per-item metadata

- `eligibleActorIds`
- `tags`
- `sourcePackId`
- `sourceTableId`
- `auditRef`

### Publication expectations

- Published runs should auto-open for connected non-GM players when the GM publishes the bundle.
- The output must support both single-item assignment and bulk deposit flows.
- Currency must support full deposit and split workflows downstream.
- The output must remain compatible with archive and reopen flows.

## Audit And Warning Model

V1 auditability must support both summary and debug views.

### Required audit sections

- input normalization summary
- constraint checks passed or failed
- relaxation steps applied
- final source picks and weights
- warnings and errors list

### Warning surfaces

- GM inline warning banner in the builder UI for expected generation issues
- structured warnings array in the returned payload
- console logging reserved for unexpected errors, not ordinary empty-pool or relaxed-generation cases

## Success And Failure Rules

### Successful generation

Generation is successful when at least one of these is true and the payload is structurally valid:

- one or more items were generated
- one or more currency denominations have non-zero value

### Failed generation

Generation is a failure when:

- no items are generated
- no currency is generated
- or required claim-board fields cannot be produced after full relaxation

Failure must return a structured failed payload, not a thrown error, unless the system is dealing with an unexpected runtime exception.

## Completion And Archive Rules

This spec does not redesign the claim-board UI, but it does define the builder-side assumptions needed for completion.

A run is complete when all of the following are true:

- every item has `quantityRemaining = 0`
- `currencyRemaining` is zero for all denominations
- no soft lock is active
- no undo window remains open

When those conditions are met, downstream claim-board logic should:

- emit one completion summary
- move the run to archive automatically
- preserve full audit history

## Performance Target

V1 performance targets:

- pass target: under 300ms for typical enabled-source worlds
- soft-warn band: 300ms to 1000ms
- fail target: over 1000ms in normal non-debug conditions

If performance exceeds the soft-warn band, the payload should include a warning and measured timing metadata in `stats` or `audit`.

## Proposed Internal Pipeline

Recommended high-level pipeline:

1. `normalizeLootBuilderDraft(input)`
2. `buildLootValueBudgetContext(draft, desiredCount)`
3. `resolveLootRuntimeBudgetContext(draft, budgetContext)`
4. `buildLootRandomContext(draft, budgetContext)`
5. `buildLootItemCandidates(sourceConfig, draft, warnings)`
6. `applyLootHardConstraints(candidates, budgetContext, draft)`
7. `selectLootBundle(candidates, runtimeBudgetContext, randomContext, draft)`
8. `generateLootCurrency(draft, randomContext, runtimeBudgetContext, itemValueGp)`
9. `decorateClaimBoardItems(items, runId, metadata)`
10. `buildLootAuditPayload(context)`
11. `validateBoardReadyBundle(result)`

Expected extraction direction:

- keep UI state logic out of the generator
- keep claim-board rendering concerns out of the generator
- push pure selection and validation logic into `scripts/features`

## Migration Strategy

V1 should land incrementally.

### Phase 1

- Keep existing preview generation intact.
- Introduce a board-ready builder path behind a new function.
- Reuse existing normalization, budgeting, and candidate-building helpers where safe.

### Phase 2

- Make the GM loot flow use the board-ready payload as the primary output.
- Convert legacy preview displays into views over the new payload.

### Phase 3

- Extract shared pure logic from `scripts/party-operations.js` into `scripts/features`.
- Add focused tests around normalization, selection, duplicate protection, and payload validation.

## Validation Checklist

V1 is considered correct when all of the following pass.

1. Given identical normalized inputs and the same deterministic seed, the builder returns the same item list, quantities, rarity outcomes, and currency totals.
2. Given a unique item already selected in the current run, the builder never returns that unique item twice in the final bundle.
3. Given zero valid candidates on the first pass, the builder applies the agreed relaxation order and returns either a valid non-empty bundle or a structured failed result.
4. Given a successful generation, the returned payload can be normalized into a live claim-board record without manual repair.
5. Given a successful board-ready bundle, every item includes the required claim metadata fields and starts in an unclaimed open state.
6. Given generation warnings, the GM sees an inline summary and the payload contains the same warnings in structured form.
7. Given a typical enabled-source world, generation completes in under 300ms or emits a performance warning if it exceeds that target.
8. Given all items are assigned and all currency is handled, the run becomes archive-eligible only after locks and undo windows expire.
9. Given identical inputs but a different seed, output may change, but still respects value bands, rarity rules, and source precedence.
10. Given conflicting source candidates, the builder always resolves module sources first, then world overrides, then compendium fallback.

## Recommended Next Build Steps

1. Add `generateBoardReadyLootBundle()` as a new runtime function without removing the existing preview generator.
2. Define a small validation helper for board-ready payload shape.
3. Extract duplicate-unique enforcement and relaxation sequencing into pure helpers.
4. Update the GM loot flow to publish the new bundle into the live claim-board state.
5. Add tests for deterministic output, relaxation behavior, and claim-board payload validity.
