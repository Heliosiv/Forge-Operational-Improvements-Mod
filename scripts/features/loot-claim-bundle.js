export function decorateLootItemsForClaimBoard(items = [], context = {}) {
  const runId = context.runId || foundry?.utils?.randomID?.() || "run-" + Date.now();
  const now = Date.now();
  
  return items.map((item, index) => {
    // Generate a unique itemId if not already present
    const itemId = item.itemId || item._id || foundry?.utils?.randomID?.() || `item-${now}-${index}`;
    
    return {
      itemId,
      sourceId: item.sourceId || item.uuid || "",
      displayName: item.displayName || item.name || "Unknown Item",
      image: item.image || item.img || "icons/svg/item-bag.svg",
      rarity: String(item.rarity || "common").trim().toLowerCase(),
      estimatedValueGp: Math.max(0, Number(item.estimatedValueGp || item.price || 0) || 0),
      quantity: Math.max(1, Number(item.quantity || 1) || 1),
      quantityRemaining: Math.max(1, Number(item.quantity || 1) || 1),
      runId,
      lockState: "open",
      lockExpiresAt: 0,
      createdAt: now,
      isClaimed: false,
      eligibleActorIds: Array.isArray(item.eligibleActorIds) ? item.eligibleActorIds : [],
      tags: Array.isArray(item.tags) ? item.tags : [],
      sourcePackId: item.sourcePackId || "",
      sourceTableId: item.sourceTableId || "",
      auditRef: item.auditRef || ""
    };
  });
}

export function buildLootClaimCurrencyState(currency = {}) {
  const pp = Math.max(0, Math.floor(Number(currency.pp) || 0));
  const gp = Math.max(0, Math.floor(Number(currency.gp) || 0));
  const sp = Math.max(0, Math.floor(Number(currency.sp) || 0));
  const cp = Math.max(0, Math.floor(Number(currency.cp) || 0));
  
  const gpEquivalent = pp * 10 + gp + sp / 10 + cp / 100;
  
  return {
    pp,
    gp,
    sp,
    cp,
    gpEquivalent
  };
}

export function buildInitialLootClaimsLog() {
  return [];
}

export function buildBoardReadyLootBundle(input = {}) {
  const runId = input.runId || foundry?.utils?.randomID?.() || "run-" + Date.now();
  const now = Date.now();
  const generatedBy = input.generatedBy || (game?.user ? game.user.name : "System");
  
  const isFailed = input.status === "failed";
  
  const currency = buildLootClaimCurrencyState(input.currency || {});
  
  const payload = {
    status: isFailed ? "failed" : "ok",
    runId,
    generatedAt: input.generatedAt || now,
    generatedBy,
    publishedAt: 0,
    publishedBy: "",
    draft: { ...input.draft },
    sourceSummary: input.sourceSummary || { precedence: [], enabledItemSources: 0, enabledTableSources: 0 },
    currency: { ...currency },
    currencyRemaining: { ...currency },
    items: isFailed ? [] : decorateLootItemsForClaimBoard(input.items || [], { runId }),
    claimsLog: buildInitialLootClaimsLog(),
    claimMetadata: input.claimMetadata || {
      boardReady: true,
      autoOpenPlayers: true,
      defaultSort: "value-desc"
    },
    stats: input.stats || {
      candidateCount: 0,
      itemCountTarget: 0,
      itemCountGenerated: 0,
      finalItemsValueGp: 0,
      finalCurrencyValueGp: 0,
      finalCombinedValueGp: 0,
      deterministic: true,
      seed: input.draft?.seed || "unknown"
    },
    audit: input.audit || {
      normalizedInputs: {},
      constraintChecks: [],
      relaxationSteps: [],
      sourceSelections: [],
      warnings: []
    },
    warnings: Array.isArray(input.warnings) ? [...input.warnings] : []
  };
  
  return payload;
}
