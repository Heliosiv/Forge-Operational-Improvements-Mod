/**
 * Determines whether a loot candidate should be treated as a unique item —
 * meaning only one copy is allowed in a single generation run.
 *
 * @param {object} candidate
 * @returns {boolean}
 */
export function isLootCandidateUnique(candidate) {
  if (!candidate) return false;
  const rarity = String(candidate.rarity || candidate.system?.rarity || "")
    .trim()
    .toLowerCase();
  if (rarity === "legendary" || rarity === "artifact") return true;

  const keywords = Array.isArray(candidate.flags?.["party-operations"]?.keywords)
    ? candidate.flags["party-operations"].keywords
    : [];

  return keywords.includes("unique") || keywords.includes("merchant.unique");
}

/**
 * Returns true if adding `candidate` to `selectedItems` is allowed under the
 * same-run unique-item policy (no two items with the same name when unique).
 *
 * @param {object[]} selectedItems
 * @param {object} candidate
 * @param {object} _context  Reserved for future per-context overrides.
 * @returns {boolean}
 */
export function enforceSameRunUniquePolicy(selectedItems, candidate, _context) {
  if (!isLootCandidateUnique(candidate)) return true;

  const candidateName = String(candidate.name || candidate.displayName || "")
    .trim()
    .toLowerCase();

  const alreadySelected = selectedItems.some(
    (item) =>
      String(item.name || item.displayName || "")
        .trim()
        .toLowerCase() === candidateName
  );

  return !alreadySelected;
}

/**
 * Returns the ordered list of relaxation steps that the generator may apply
 * when it cannot satisfy constraints with the current draft settings.
 *
 * @param {object} _draft   The normalized loot draft (reserved for future per-draft overrides).
 * @param {object} _context Reserved for future per-context overrides.
 * @returns {{ step: number, type: string, label: string }[]}
 */
export function buildLootRelaxationPlan(_draft, _context) {
  return [
    { step: 1, type: "story-tags", label: "Loosen story-tag hard filter" },
    { step: 2, type: "weighting", label: "Widen weighting thresholds" },
    { step: 3, type: "rarity", label: "Widen rarity floor/ceiling" },
    { step: 4, type: "source", label: "Expand source scope" },
    { step: 5, type: "value-strictness", label: "Lower value-target strictness" }
  ];
}

/**
 * Advances the relaxation state by one step and returns the updated state.
 *
 * If `state.relaxationPlan` is absent or empty it is automatically seeded
 * from `buildLootRelaxationPlan` so callers that omit the seed step still get
 * deterministic relaxation behaviour.
 *
 * @param {{ draft?: object, relaxationPlan?: object[], currentRelaxationStepIndex?: number }} state
 * @returns {object} Updated state with `relaxed`, `exhausted`, and `lastRelaxationApplied`.
 */
export function applyNextLootRelaxationStep(state) {
  // Auto-seed plan when callers forget to set it, so the loop is never silently broken.
  const plan =
    Array.isArray(state.relaxationPlan) && state.relaxationPlan.length > 0
      ? state.relaxationPlan
      : buildLootRelaxationPlan(state.draft, null);

  const currentStepIndex =
    typeof state.currentRelaxationStepIndex === "number" && state.currentRelaxationStepIndex >= 0
      ? state.currentRelaxationStepIndex
      : 0;

  if (currentStepIndex >= plan.length) {
    return { ...state, relaxationPlan: plan, relaxed: false, exhausted: true };
  }

  const step = plan[currentStepIndex];
  const newState = {
    ...state,
    relaxationPlan: plan,
    currentRelaxationStepIndex: currentStepIndex + 1,
    relaxed: true,
    exhausted: false,
    lastRelaxationApplied: step
  };

  switch (step.type) {
    case "story-tags":
      newState.draft = { ...newState.draft, strictStoryTags: false };
      break;
    case "weighting":
      newState.draft = { ...newState.draft, relaxedWeights: true };
      break;
    case "rarity":
      newState.draft = { ...newState.draft, relaxedRarity: true };
      break;
    case "source":
      newState.draft = { ...newState.draft, expandSources: true };
      break;
    case "value-strictness":
      newState.draft = {
        ...newState.draft,
        valueStrictness: Math.max(0, (newState.draft?.valueStrictness ?? 180) - 50)
      };
      break;
  }

  return newState;
}
