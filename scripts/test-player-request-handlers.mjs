import assert from "node:assert/strict";

import { createPlayerRequestHandlers } from "./core/player-request-handlers.js";

function buildBaseHandlers(overrides = {}) {
  const calls = {
    emitted: [],
    warns: [],
    infos: [],
    barterRequests: [],
    tradeRequests: [],
    lootClaims: [],
    lootCurrencyClaims: [],
    lootCurrencySplits: [],
    lootUndos: [],
    postedItemClaims: [],
    postedCurrencyClaims: [],
    clearedBarterKeys: []
  };
  const handlers = createPlayerRequestHandlers({
    resolveRequester: () => ({ id: "user-1", name: "Aria" }),
    sanitizeSocketIdentifier: (value) => String(value ?? "").trim(),
    ensureMerchantsState: (ledger) => ledger,
    getOperationsLedger: () => ({ merchants: true }),
    resolveMerchantSettlementForUser: () => "waterdeep",
    clampSocketText: (value) => String(value ?? "").trim(),
    resolveMerchantBarterForUser: async (_requester, payload) => {
      calls.barterRequests.push(payload);
      return {
        ok: true,
        settlement: payload.settlement,
        summary: "Discount secured.",
        resolution: { checkTotal: 19, success: true }
      };
    },
    emitModuleSocket: (payload, options) => calls.emitted.push({ payload, options }),
    normalizeMerchantSettlementSelection: (value) =>
      String(value ?? "")
        .trim()
        .toLowerCase(),
    socketChannel: "module.party-operations",
    getMerchantBarterResolutionKey: ({ userId, actorId, merchantId, settlement }) =>
      `${userId}:${actorId}:${merchantId}:${settlement}`,
    getMerchantBarterResolutionEntryByKey: () => null,
    applyMerchantTradeForUser: async (_requester, payload) => {
      calls.tradeRequests.push(payload);
      return { ok: true, actorName: "Borin", merchantName: "Sel" };
    },
    clearMerchantBarterResolutionEntryByKey: (key) => calls.clearedBarterKeys.push(key),
    applyLootClaimForUser: async (_requester, actorId, itemId, runId) => {
      calls.lootClaims.push({ actorId, itemId, runId });
      return { ok: true, actorName: "Borin", itemName: "Rope" };
    },
    applyLootClaimUndoForUser: async (_requester, logId, runId) => {
      calls.lootUndos.push({ logId, runId });
      return { ok: true };
    },
    postLootItemClaimToChat: async (payload) => calls.postedItemClaims.push(payload),
    applyLootCurrencyClaimForUser: async (_requester, actorId, runId) => {
      calls.lootCurrencyClaims.push({ actorId, runId });
      return { ok: true, actorName: "Borin", share: { pp: 1, gp: 2, sp: 3, cp: 4 } };
    },
    applyLootCurrencySplitForUser: async (_requester, actorIds, runId, stashActorId) => {
      calls.lootCurrencySplits.push({ actorIds, runId, stashActorId });
      return { ok: true, actorShares: [{ actorId: "actor-1" }, { actorId: "actor-2" }] };
    },
    postLootCurrencyClaimToChat: async (payload) => calls.postedCurrencyClaims.push(payload),
    uiRef: {
      notifications: {
        warn: (message) => calls.warns.push(message),
        info: (message) => calls.infos.push(message)
      }
    },
    ...overrides
  });

  return { handlers, calls };
}

{
  const { handlers, calls } = buildBaseHandlers();
  await handlers.applyPlayerMerchantBarterRequest({
    userId: "user-1",
    merchantId: "merchant-1",
    actorId: "actor-1",
    settlement: "Waterdeep"
  });

  assert.deepEqual(calls.barterRequests, [{ merchantId: "merchant-1", actorId: "actor-1", settlement: "waterdeep" }]);
  assert.equal(calls.emitted.length, 1);
  assert.equal(calls.emitted[0].options.channel, "module.party-operations");
  assert.match(calls.infos[0], /Resolved barter for Aria/);
}

{
  const { handlers, calls } = buildBaseHandlers({
    getMerchantBarterResolutionEntryByKey: () => ({ applied: true, delta: -1 })
  });
  await handlers.applyPlayerMerchantTradeRequest({
    userId: "user-1",
    merchantId: "merchant-1",
    actorId: "actor-1",
    buyItems: [
      { itemId: "buy-1", qty: 2 },
      { itemId: "", qty: 4 }
    ],
    sellItems: [
      { itemId: "sell-1", quantity: 3 },
      { itemId: "sell-2", qty: 0 }
    ]
  });

  assert.deepEqual(calls.tradeRequests, [
    {
      merchantId: "merchant-1",
      actorId: "actor-1",
      settlement: "waterdeep",
      buyItems: [{ itemId: "buy-1", qty: 2 }],
      sellItems: [{ itemId: "sell-1", qty: 3 }],
      barterResolution: { applied: true, delta: -1 }
    }
  ]);
  assert.deepEqual(calls.clearedBarterKeys, ["user-1:actor-1:merchant-1:waterdeep"]);
  assert.deepEqual(calls.emitted, [
    {
      payload: {
        type: "ops:merchant-trade-result",
        userId: "user-1",
        merchantId: "merchant-1",
        actorId: "actor-1",
        settlement: "waterdeep",
        ok: true,
        summary: "Trade complete: Borin and Sel.",
        actorName: "Borin",
        merchantName: "Sel"
      },
      options: { channel: "module.party-operations" }
    }
  ]);
}

{
  const { handlers, calls } = buildBaseHandlers({
    getMerchantBarterResolutionEntryByKey: () => null
  });
  await handlers.applyPlayerMerchantTradeRequest({
    userId: "user-1",
    merchantId: "merchant-1",
    actorId: "actor-1",
    buyItems: [{ itemId: "buy-1", qty: 1 }],
    barterResolution: {
      applied: true,
      source: "local-roll",
      ability: "cha",
      abilityLabel: "Charisma",
      checkTotal: 18,
      margin: 3,
      success: true,
      delta: -0.1,
      buyMarkupDelta: -0.1,
      sellRateDelta: 0.1,
      createdAt: 123
    }
  });

  assert.deepEqual(calls.tradeRequests[0].barterResolution, {
    applied: true,
    source: "local-roll",
    ability: "cha",
    abilityLabel: "Charisma",
    checkTotal: 18,
    margin: 3,
    success: true,
    delta: -0.1,
    buyMarkupDelta: -0.1,
    sellRateDelta: 0.1,
    createdAt: 123
  });
}

{
  const { handlers, calls } = buildBaseHandlers();
  await handlers.applyPlayerLootClaimRequest({
    userId: "user-1",
    actorId: "actor-1",
    itemId: "item-1",
    runId: "run-1"
  });
  await handlers.applyPlayerLootCurrencyClaimRequest({ userId: "user-1", actorId: "actor-1", runId: "run-1" });
  await handlers.applyPlayerLootCurrencySplitRequest({
    userId: "user-1",
    actorIds: ["actor-1", "actor-2"],
    stashActorId: "stash-1",
    runId: "run-1"
  });
  await handlers.applyPlayerLootUndoClaimRequest({ userId: "user-1", logId: "log-1", runId: "run-1" });

  assert.deepEqual(calls.lootClaims, [{ actorId: "actor-1", itemId: "item-1", runId: "run-1" }]);
  assert.equal(calls.postedItemClaims.length, 1);
  assert.deepEqual(calls.lootCurrencyClaims, [{ actorId: "actor-1", runId: "run-1" }]);
  assert.equal(calls.postedCurrencyClaims.length, 1);
  assert.deepEqual(calls.lootCurrencySplits, [
    { actorIds: ["actor-1", "actor-2"], runId: "run-1", stashActorId: "stash-1" }
  ]);
  assert.deepEqual(calls.lootUndos, [{ logId: "log-1", runId: "run-1" }]);
  assert.match(calls.infos.at(-1), /undid a recent loot assignment/);
}

{
  const { handlers, calls } = buildBaseHandlers({
    applyLootClaimForUser: async () => ({ ok: false, message: "No share available." })
  });
  await handlers.applyPlayerLootClaimRequest({
    userId: "user-1",
    actorId: "actor-1",
    itemId: "item-1",
    runId: "run-1"
  });
  assert.deepEqual(calls.warns, ["Loot claim failed (Aria): No share available."]);
}

{
  const { handlers, calls } = buildBaseHandlers({
    resolveRequester: () => null
  });
  await handlers.applyPlayerMerchantTradeRequest({ userId: "user-1", merchantId: "merchant-1", actorId: "actor-1" });
  assert.deepEqual(calls.warns, ["Merchant trade failed: unable to resolve an active player requester."]);
}

{
  const { handlers, calls } = buildBaseHandlers({
    applyMerchantTradeForUser: async () => ({ ok: false, message: "Not enough coin." })
  });
  await handlers.applyPlayerMerchantTradeRequest({ userId: "user-1", merchantId: "merchant-1", actorId: "actor-1" });
  assert.deepEqual(calls.emitted, [
    {
      payload: {
        type: "ops:merchant-trade-result",
        userId: "user-1",
        merchantId: "merchant-1",
        actorId: "actor-1",
        settlement: "waterdeep",
        ok: false,
        summary: "Not enough coin."
      },
      options: { channel: "module.party-operations" }
    }
  ]);
  assert.deepEqual(calls.warns, ["Merchant trade failed (Aria): Not enough coin."]);
}

{
  const { handlers, calls } = buildBaseHandlers();
  await handlers.applyPlayerLootCurrencySplitRequest({ userId: "user-1", actorIds: [], runId: "run-1" });
  assert.deepEqual(calls.warns, ["Currency split failed: select at least one destination actor."]);
}

process.stdout.write("player request handlers validation passed\n");
