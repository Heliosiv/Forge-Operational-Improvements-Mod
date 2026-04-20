import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./party-operations.js", import.meta.url), "utf8");

function extractFunction(sourceText, functionName) {
  const marker = `function ${functionName}`;
  const start = sourceText.indexOf(marker);
  if (start < 0) throw new Error(`Unable to find function ${functionName}`);
  let braceStart = -1;
  let parenDepth = 0;
  for (let index = start; index < sourceText.length; index += 1) {
    const char = sourceText[index];
    if (char === "(") parenDepth += 1;
    else if (char === ")") parenDepth = Math.max(0, parenDepth - 1);
    else if (char === "{" && parenDepth === 0) {
      braceStart = index;
      break;
    }
  }
  if (braceStart < 0) throw new Error(`Unable to find body for ${functionName}`);
  let depth = 0;
  for (let index = braceStart; index < sourceText.length; index += 1) {
    const char = sourceText[index];
    if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return sourceText.slice(start, index + 1);
    }
  }
  throw new Error(`Unbalanced braces for ${functionName}`);
}

function instantiateFunction(functionName, dependencyNames = [], dependencyValues = []) {
  const fnSource = extractFunction(source, functionName);
  return new Function(...dependencyNames, `return (${fnSource});`)(...dependencyValues);
}

const canAccessGmPage = instantiateFunction("canAccessGmPage");
const canUserOwnActor = instantiateFunction("canUserOwnActor", ["canAccessGmPage"], [canAccessGmPage]);
const canUserManageDowntimeActor = instantiateFunction("canUserManageDowntimeActor", ["canUserOwnActor"], [canUserOwnActor]);
const canUserControlActor = instantiateFunction("canUserControlActor", ["canUserOwnActor"], [canUserOwnActor]);
const canUserViewItemDocument = instantiateFunction("canUserViewItemDocument", ["game"], [{ user: null }]);
const canUserPerformMerchantAction = instantiateFunction(
  "canUserPerformMerchantAction",
  ["normalizeMerchantPermissionMatrix", "canAccessGmPage"],
  [
    (permissions = {}) => permissions,
    canAccessGmPage
  ]
);
const resolveMerchantSettlementForUser = instantiateFunction(
  "resolveMerchantSettlementForUser",
  [
    "game",
    "normalizeMerchantSettlementSelection",
    "ensureMerchantsState",
    "getOperationsLedger",
    "canAccessGmPage",
    "getMerchantShopUserSettlement",
    "hasSelectedMerchantSettlementPreference",
    "getSelectedMerchantSettlement"
  ],
  [
    { user: null },
    (value) => String(value ?? "").trim().toLowerCase(),
    (state) => state,
    () => ({ currentSettlement: "neverwinter" }),
    canAccessGmPage,
    (session, user) => String(session?.userSettlements?.[String(user?.id ?? "").trim()] ?? "").trim().toLowerCase(),
    () => true,
    () => "stored-preference"
  ]
);
const getMerchantShopAccessStateForUser = instantiateFunction(
  "getMerchantShopAccessStateForUser",
  ["game", "canAccessGmPage", "ensureMerchantsState", "getOperationsLedger", "normalizeMerchantShopSession"],
  [
    { user: null },
    canAccessGmPage,
    (state) => state,
    () => ({ shopSession: { isOpen: false, restrictToSelected: false, allowedUserIds: [], userSettlements: {} } }),
    (session = {}) => ({
      isOpen: session.isOpen === true,
      restrictToSelected: session.restrictToSelected === true,
      allowedUserIds: Array.isArray(session.allowedUserIds) ? session.allowedUserIds.map((entry) => String(entry ?? "").trim()) : [],
      userSettlements: session.userSettlements ?? {}
    })
  ]
);

const ownerActor = {
  id: "actor-owner",
  type: "character",
  testUserPermission: (user, level) => level === "OWNER" && String(user?.id ?? "") === "owner-user"
};
const outsiderActor = {
  id: "actor-outsider",
  type: "character",
  testUserPermission: () => false
};
const npcActor = {
  id: "actor-npc",
  type: "npc",
  testUserPermission: () => false
};
const gmUser = { id: "gm-user", isGM: true, character: { id: "actor-owner" } };
const ownerUser = { id: "owner-user", isGM: false, character: { id: "actor-owner" } };
const sharedOpsUser = { id: "shared-user", isGM: false, character: { id: "actor-owner" } };

assert.equal(canUserManageDowntimeActor(sharedOpsUser, outsiderActor), false, "shared player ops should not grant other-actor mutation rights");
assert.equal(canUserManageDowntimeActor(ownerUser, ownerActor), true, "owners should still manage their own actor");
assert.equal(canUserManageDowntimeActor(gmUser, outsiderActor), true, "GMs should retain actor authority");

assert.equal(canUserControlActor(outsiderActor, sharedOpsUser), false, "shared player ops should not grant generic actor control");
assert.equal(canUserControlActor(ownerActor, sharedOpsUser), true, "players should still control their own character");
assert.equal(canUserControlActor(npcActor, sharedOpsUser), false, "non-owners should not control unrelated non-character actors");

const merchantParentActor = {
  testUserPermission: (user, level) => String(user?.id ?? "") === "shared-user" && level === "OBSERVER"
};
const merchantItem = {
  documentName: "Item",
  isOwner: false,
  parent: merchantParentActor,
  testUserPermission: () => false
};

assert.equal(
  canUserViewItemDocument(merchantItem, sharedOpsUser),
  true,
  "players with observer access through the merchant actor should be able to inspect merchant items"
);

assert.equal(
  canUserPerformMerchantAction(sharedOpsUser, {
    permissions: {
      assistant: { edit: true, override: true },
      player: { buy: true, sell: true }
    }
  }, "edit"),
  false,
  "merchant edit should now be GM-only"
);
assert.equal(
  canUserPerformMerchantAction(sharedOpsUser, {
    permissions: {
      assistant: { edit: true, override: true },
      player: { buy: true, sell: true }
    }
  }, "buy"),
  true,
  "player trading permissions should remain intact"
);

const merchantsState = {
  currentSettlement: "current-city",
  shopSession: {
    isOpen: true,
    restrictToSelected: true,
    allowedUserIds: ["owner-user"],
    userSettlements: {
      "shared-user": "assigned-city"
    }
  }
};

assert.equal(
  resolveMerchantSettlementForUser(sharedOpsUser, merchantsState, "override-city"),
  "assigned-city",
  "non-GM users should stay on their assigned settlement even if shared-player-ops is enabled"
);
assert.equal(
  resolveMerchantSettlementForUser(gmUser, merchantsState, "override-city"),
  "override-city",
  "GMs should retain explicit settlement override control"
);

assert.deepEqual(
  getMerchantShopAccessStateForUser(sharedOpsUser, merchantsState),
  {
    canTrade: false,
    reason: "restricted",
    message: "Shopping is currently limited to selected players.",
    session: {
      isOpen: true,
      restrictToSelected: true,
      allowedUserIds: ["owner-user"],
      userSettlements: {
        "shared-user": "assigned-city"
      }
    }
  },
  "shared-player-ops should not bypass shop session restrictions"
);

assert.equal(
  getMerchantShopAccessStateForUser(gmUser, merchantsState).canTrade,
  true,
  "GMs should still bypass shop session restrictions"
);

process.stdout.write("permission split validation passed\n");
