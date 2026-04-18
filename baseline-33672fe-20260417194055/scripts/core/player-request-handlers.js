export function createPlayerRequestHandlers(options = {}) {
  const {
    resolveRequester,
    sanitizeSocketIdentifier,
    ensureMerchantsState,
    getOperationsLedger,
    resolveMerchantSettlementForUser,
    clampSocketText,
    resolveMerchantBarterForUser,
    emitModuleSocket,
    normalizeMerchantSettlementSelection,
    socketChannel,
    getMerchantBarterResolutionKey,
    getMerchantBarterResolutionEntryByKey,
    applyMerchantTradeForUser,
    clearMerchantBarterResolutionEntryByKey,
    applyLootClaimForUser,
    applyLootClaimUndoForUser,
    postLootItemClaimToChat,
    applyLootCurrencyClaimForUser,
    applyLootCurrencySplitForUser,
    postLootCurrencyClaimToChat,
    uiRef = globalThis.ui
  } = options;

  function normalizeTradeLines(raw) {
    const source = Array.isArray(raw) ? raw : [];
    const rows = [];
    for (const entry of source) {
      const itemId = sanitizeSocketIdentifier(entry?.itemId, { maxLength: 64 });
      const qtyRaw = Number(entry?.qty ?? entry?.quantity ?? 0);
      const qty = Number.isFinite(qtyRaw) ? Math.max(0, Math.min(999, Math.floor(qtyRaw))) : 0;
      if (!itemId || qty <= 0) continue;
      rows.push({ itemId, qty });
    }
    return rows;
  }

  async function applyPlayerMerchantBarterRequest(message, requesterRef = null) {
    const requester = resolveRequester(requesterRef ?? message?.userId, { allowGM: false, requireActive: true });
    if (!requester) return;
    const merchantId = sanitizeSocketIdentifier(message?.merchantId, { maxLength: 64 });
    const actorId = sanitizeSocketIdentifier(message?.actorId, { maxLength: 64 });
    if (!merchantId || !actorId) return;
    const merchants = ensureMerchantsState(getOperationsLedger());
    const settlement = resolveMerchantSettlementForUser(requester, merchants, clampSocketText(message?.settlement, 120), {
      allowStoredPreference: false
    });

    const resolved = await resolveMerchantBarterForUser(requester, { merchantId, actorId, settlement });
    const resolutionPayload = resolved?.ok && resolved?.resolution
      ? {
        applied: true,
        source: String(resolved.resolution?.source ?? "resolved"),
        ability: String(resolved.resolution?.ability ?? "cha"),
        abilityLabel: String(resolved.resolution?.abilityLabel ?? "Charisma"),
        checkTotal: Number(resolved.resolution?.checkTotal ?? 0),
        margin: Number(resolved.resolution?.margin ?? 0),
        success: Boolean(resolved.resolution?.success),
        delta: Number(resolved.resolution?.delta ?? 0),
        buyMarkupDelta: Number(resolved.resolution?.buyMarkupDelta ?? 0),
        sellRateDelta: Number(resolved.resolution?.sellRateDelta ?? 0),
        createdAt: Number(resolved.resolution?.createdAt ?? Date.now())
      }
      : null;

    emitModuleSocket({
      type: "ops:merchant-barter-result",
      userId: String(requester?.id ?? ""),
      merchantId,
      actorId,
      settlement: normalizeMerchantSettlementSelection(resolved?.settlement ?? settlement),
      ok: Boolean(resolved?.ok),
      summary: resolved?.ok
        ? String(resolved?.summary ?? "Barter resolved.")
        : String(resolved?.message ?? "Barter request failed."),
      resolution: resolutionPayload
    }, { channel: socketChannel });

    if (!resolved?.ok) {
      uiRef?.notifications?.warn?.(`Merchant barter failed (${requester.name}): ${resolved?.message ?? "Unknown error."}`);
      return;
    }
    uiRef?.notifications?.info?.(`Resolved barter for ${requester.name}: ${resolved.summary}`);
  }

  async function applyPlayerMerchantTradeRequest(message, requesterRef = null) {
    const requester = resolveRequester(requesterRef ?? message?.userId, { allowGM: false, requireActive: true });
    if (!requester) return;
    const merchantId = sanitizeSocketIdentifier(message?.merchantId, { maxLength: 64 });
    const actorId = sanitizeSocketIdentifier(message?.actorId, { maxLength: 64 });
    if (!merchantId || !actorId) return;
    const merchants = ensureMerchantsState(getOperationsLedger());
    const settlement = resolveMerchantSettlementForUser(requester, merchants, clampSocketText(message?.settlement, 120), {
      allowStoredPreference: false
    });
    const tradePayload = {
      merchantId,
      actorId,
      settlement,
      buyItems: normalizeTradeLines(message?.buyItems),
      sellItems: normalizeTradeLines(message?.sellItems)
    };
    const barterKey = getMerchantBarterResolutionKey({
      userId: String(requester?.id ?? "").trim(),
      actorId,
      merchantId,
      settlement
    });
    const cachedBarterResolution = getMerchantBarterResolutionEntryByKey(barterKey);
    if (cachedBarterResolution?.applied) tradePayload.barterResolution = cachedBarterResolution;
    const outcome = await applyMerchantTradeForUser(requester, tradePayload);
    if (!outcome.ok) {
      uiRef?.notifications?.warn?.(`Merchant trade failed (${requester.name}): ${outcome.message ?? "Unknown error."}`);
      return;
    }
    clearMerchantBarterResolutionEntryByKey(barterKey);
    uiRef?.notifications?.info?.(`${requester.name} completed merchant trade for ${outcome.actorName}.`);
  }

  async function applyPlayerLootClaimRequest(message, requesterRef = null) {
    const requester = resolveRequester(requesterRef ?? message?.userId, { allowGM: false, requireActive: true });
    if (!requester) return;
    const actorId = sanitizeSocketIdentifier(message?.actorId, { maxLength: 64 });
    const itemId = sanitizeSocketIdentifier(message?.itemId, { maxLength: 64 });
    const runId = sanitizeSocketIdentifier(message?.runId, { maxLength: 64 });
    if (!actorId || !itemId) return;
    const outcome = await applyLootClaimForUser(requester, actorId, itemId, runId);
    if (!outcome.ok) {
      uiRef?.notifications?.warn?.(`Loot claim failed (${requester.name}): ${outcome.message ?? "Unknown error."}`);
      return;
    }
    await postLootItemClaimToChat(outcome);
    uiRef?.notifications?.info?.(`${requester.name} claimed ${outcome.itemName} for ${outcome.actorName}.`);
    if (outcome?.completion?.completed && outcome?.completion?.summary) {
      const summary = outcome.completion.summary;
      uiRef?.notifications?.info?.(
        `Loot run completed: ${summary.itemAssignmentCount ?? 0} item assignment(s), ${summary.currencyActionCount ?? 0} currency action(s).`
      );
    }
  }

  async function applyPlayerLootCurrencyClaimRequest(message, requesterRef = null) {
    const requester = resolveRequester(requesterRef ?? message?.userId, { allowGM: false, requireActive: true });
    if (!requester) return;
    const actorId = sanitizeSocketIdentifier(message?.actorId, { maxLength: 64 });
    const runId = sanitizeSocketIdentifier(message?.runId, { maxLength: 64 });
    if (!actorId) return;
    const outcome = await applyLootCurrencyClaimForUser(requester, actorId, runId);
    if (!outcome.ok) {
      uiRef?.notifications?.warn?.(`Currency claim failed (${requester.name}): ${outcome.message ?? "Unknown error."}`);
      return;
    }
    await postLootCurrencyClaimToChat(outcome);
    const share = outcome.share ?? { pp: 0, gp: 0, sp: 0, cp: 0 };
    uiRef?.notifications?.info?.(
      `${requester.name} claimed currency for ${outcome.actorName}: ${share.pp}pp ${share.gp}gp ${share.sp}sp ${share.cp}cp.`
    );
    if (outcome?.completion?.completed && outcome?.completion?.summary) {
      const summary = outcome.completion.summary;
      uiRef?.notifications?.info?.(
        `Loot run completed: ${summary.itemAssignmentCount ?? 0} item assignment(s), ${summary.currencyActionCount ?? 0} currency action(s).`
      );
    }
  }

  async function applyPlayerLootCurrencySplitRequest(message, requesterRef = null) {
    const requester = resolveRequester(requesterRef ?? message?.userId, { allowGM: false, requireActive: true });
    if (!requester) return;
    const actorIdsRaw = Array.isArray(message?.actorIds) ? message.actorIds : [];
    const actorIds = actorIdsRaw
      .map((entry) => sanitizeSocketIdentifier(entry, { maxLength: 64 }))
      .filter(Boolean);
    const stashActorId = sanitizeSocketIdentifier(message?.stashActorId, { maxLength: 64 });
    const runId = sanitizeSocketIdentifier(message?.runId, { maxLength: 64 });
    if (actorIds.length <= 0) return;
    const outcome = await applyLootCurrencySplitForUser(requester, actorIds, runId, stashActorId);
    if (!outcome.ok) {
      uiRef?.notifications?.warn?.(`Currency split failed (${requester.name}): ${outcome.message ?? "Unknown error."}`);
      return;
    }
    uiRef?.notifications?.info?.(`${requester.name} split currency across ${outcome.actorShares?.length ?? 0} destination(s).`);
    if (outcome?.completion?.completed && outcome?.completion?.summary) {
      const summary = outcome.completion.summary;
      uiRef?.notifications?.info?.(
        `Loot run completed: ${summary.itemAssignmentCount ?? 0} item assignment(s), ${summary.currencyActionCount ?? 0} currency action(s).`
      );
    }
  }

  async function applyPlayerLootUndoClaimRequest(message, requesterRef = null) {
    const requester = resolveRequester(requesterRef ?? message?.userId, { allowGM: false, requireActive: true });
    if (!requester) return;
    const logId = sanitizeSocketIdentifier(message?.logId, { maxLength: 64 });
    const runId = sanitizeSocketIdentifier(message?.runId, { maxLength: 64 });
    if (!logId) return;
    const outcome = await applyLootClaimUndoForUser(requester, logId, runId);
    if (!outcome.ok) {
      uiRef?.notifications?.warn?.(`Loot undo failed (${requester.name}): ${outcome.message ?? "Unknown error."}`);
      return;
    }
    uiRef?.notifications?.info?.(`${requester.name} undid a recent loot assignment.`);
  }

  return {
    applyPlayerMerchantBarterRequest,
    applyPlayerMerchantTradeRequest,
    applyPlayerLootClaimRequest,
    applyPlayerLootCurrencyClaimRequest,
    applyPlayerLootCurrencySplitRequest,
    applyPlayerLootUndoClaimRequest
  };
}
