export function createLootAuditRecorder(normalizedDraft = {}) {
  return {
    normalizedInputs: { ...normalizedDraft },
    constraintChecks: [],
    relaxationSteps: [],
    sourceSelections: [],
    warnings: []
  };
}

export function appendLootConstraintResult(audit, entry) {
  if (!audit || !entry) return;
  audit.constraintChecks.push({
    name: entry.name || "unknown-constraint",
    ok: Boolean(entry.ok),
    details: entry.details || "",
    timestamp: Date.now()
  });
}

export function appendLootRelaxationStep(audit, entry) {
  if (!audit || !entry) return;
  audit.relaxationSteps.push({
    step: entry.step,
    type: entry.type,
    label: entry.label,
    appliedAt: Date.now()
  });
}

export function appendLootSourceSelection(audit, entry) {
  if (!audit || !entry) return;
  audit.sourceSelections.push({
    sourceId: entry.sourceId,
    type: entry.type,
    priority: entry.priority || "normal",
    itemCount: entry.itemCount || 0
  });
}

export function appendLootWarning(audit, warning) {
  if (!audit || !warning) return;
  const message = typeof warning === "string" ? warning : warning.message || "Unknown warning";
  audit.warnings.push(message);
}

export function finalizeLootAuditPayload(audit) {
  return {
    normalizedInputs: { ...audit.normalizedInputs },
    constraintChecks: [...audit.constraintChecks],
    relaxationSteps: [...audit.relaxationSteps],
    sourceSelections: [...audit.sourceSelections],
    warnings: [...audit.warnings]
  };
}
