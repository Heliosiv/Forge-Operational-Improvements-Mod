export function isLootCandidateUnique(candidate) {
  if (!candidate) return false;
  // If the item explicitly tags itself as unique or has a rarity of very-rare/legendary
  // or a specific keyword 'unique', it's considered unique.
  const rarity = String(candidate.rarity || candidate.system?.rarity || "").trim().toLowerCase();
  if (rarity === "legendary" || rarity === "artifact") return true;
  
  const keywords = Array.isArray(candidate.flags?.["party-operations"]?.keywords) 
    ? candidate.flags["party-operations"].keywords 
    : [];
  
  return keywords.includes("unique") || keywords.includes("merchant.unique");
}

export function enforceSameRunUniquePolicy(selectedItems, candidate, _context) {
  if (!isLootCandidateUnique(candidate)) return true; // Allowed
  
  const candidateName = String(candidate.name || candidate.displayName || "").trim().toLowerCase();
  
  // Check if we already selected this unique item
  const alreadySelected = selectedItems.some(item => {
    return String(item.name || item.displayName || "").trim().toLowerCase() === candidateName;
  });
  
  return !alreadySelected;
}

export function buildLootRelaxationPlan(_draft, _context) {
  // 1. Loosen story-tag hard filter
  // 2. Widen weighting thresholds
  // 3. Widen rarity floor or ceiling by one band
  // 4. Expand source scope
  // 5. Lower value-target strictness
  return [
    { step: 1, type: "story-tags", label: "Loosen story-tag hard filter" },
    { step: 2, type: "weighting", label: "Widen weighting thresholds" },
    { step: 3, type: "rarity", label: "Widen rarity floor/ceiling" },
    { step: 4, type: "source", label: "Expand source scope" },
    { step: 5, type: "value-strictness", label: "Lower value-target strictness" }
  ];
}

export function applyNextLootRelaxationStep(state) {
  const plan = state.relaxationPlan || [];
  const currentStepIndex = state.currentRelaxationStepIndex || 0;
  
  if (currentStepIndex >= plan.length) {
    return { ...state, relaxed: false, exhausted: true }; // No more relaxation possible
  }
  
  const step = plan[currentStepIndex];
  const newState = {
    ...state,
    currentRelaxationStepIndex: currentStepIndex + 1,
    relaxed: true,
    exhausted: false,
    lastRelaxationApplied: step
  };
  
  // Apply logic based on the step type
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
        valueStrictness: Math.max(0, (newState.draft.valueStrictness || 180) - 50) 
      };
      break;
  }
  
  return newState;
}
