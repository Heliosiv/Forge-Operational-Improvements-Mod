import assert from "node:assert/strict";

import { createDowntimeUiDraftStorage } from "./features/downtime-ui-draft-storage.js";

class FakeElement {
  constructor(values = {}, closestMap = {}) {
    this.values = values;
    this.closestMap = closestMap;
  }

  querySelector(selector) {
    if (!Object.prototype.hasOwnProperty.call(this.values, selector)) return null;
    return { value: this.values[selector] };
  }

  closest(selector) {
    return this.closestMap[selector] ?? null;
  }
}

{
  const storageMap = new Map();
  const storage = {
    getItem(key) {
      return storageMap.has(key) ? storageMap.get(key) : null;
    },
    setItem(key, value) {
      storageMap.set(key, value);
    },
    removeItem(key) {
      storageMap.delete(key);
    }
  };

  const drafts = createDowntimeUiDraftStorage({
    moduleId: "party-operations",
    gameRef: {
      world: { id: "alpha" },
      user: { id: "gm-user" }
    },
    storage,
    htmlElementClass: FakeElement
  });

  assert.equal(drafts.getDowntimeUiDraftStorageKey(), "party-operations.downtimeUiDraft.alpha.gm-user");
  assert.deepEqual(drafts.getDowntimeUiDraft(), {});

  assert.deepEqual(drafts.setDowntimeUiDraftSection("submission", {
    actorId: "actor-a",
    note: "Scout the road"
  }), {
    submission: {
      actorId: "actor-a",
      note: "Scout the road"
    }
  });

  assert.deepEqual(drafts.setDowntimeUiDraftSection("submission", {
    hours: "4"
  }), {
    submission: {
      actorId: "actor-a",
      note: "Scout the road",
      hours: "4"
    }
  });

  assert.deepEqual(drafts.replaceDowntimeUiDraftSection("resolution", {
    actorId: "actor-b"
  }), {
    submission: {
      actorId: "actor-a",
      note: "Scout the road",
      hours: "4"
    },
    resolution: {
      actorId: "actor-b"
    }
  });

  assert.deepEqual(drafts.clearDowntimeUiDraft("submission"), {
    resolution: {
      actorId: "actor-b"
    }
  });

  const submissionRoot = new FakeElement({
    "select[name='downtimeActorId']": "actor-c",
    "select[name='downtimeActionKey']": "carouse",
    "input[name='downtimeHours']": "6",
    "textarea[name='downtimeNote']": "Gather rumors",
    "select[name='downtimeBrowsingAbility']": "cha",
    "select[name='downtimeCraftItemId']": "",
    "select[name='downtimeCraftMaterialsOwned']": "yes",
    "input[name='downtimeCraftMaterialDrops']": "[]",
    "select[name='downtimeProfessionId']": "baker"
  });
  drafts.syncDowntimeSubmissionDraftFromRoot(submissionRoot);
  assert.deepEqual(drafts.getDowntimeUiDraft().submission, {
    actorId: "actor-c",
    actionKey: "carouse",
    hours: "6",
    note: "Gather rumors",
    browsingAbility: "cha",
    craftItemId: "",
    materialsOwned: "yes",
    materialDropsJson: "[]",
    professionId: "baker"
  });

  const resolverRoot = new FakeElement({
    "select[name='resolveDowntimeActorId']": "actor-d",
    "input[name='resolveDowntimeSummary']": "Strong result",
    "input[name='resolveDowntimeGp']": "25",
    "input[name='resolveDowntimeCost']": "5",
    "input[name='resolveDowntimeRumors']": "2",
    "select[name='resolveDowntimeContractKey']": "guild",
    "textarea[name='resolveDowntimeContractNotes']": "Trusted contact",
    "textarea[name='resolveDowntimeItems']": "Potion",
    "input[name='resolveDowntimeItemDrops']": "[]",
    "textarea[name='resolveDowntimeNotes']": "Handled cleanly"
  });
  drafts.syncDowntimeResolverDraftFromRoot(resolverRoot);
  assert.deepEqual(drafts.getDowntimeUiDraft().resolution, {
    actorId: "actor-d",
    summary: "Strong result",
    gpAward: "25",
    gpCost: "5",
    rumorCount: "2",
    socialContractKey: "guild",
    socialContractNotes: "Trusted contact",
    itemRewardsText: "Potion",
    itemRewardDropsJson: "[]",
    gmNotes: "Handled cleanly"
  });

  const combinedElement = new FakeElement({}, {
    ".po-downtime-panel": submissionRoot,
    ".po-downtime-resolver": resolverRoot
  });
  assert.deepEqual(drafts.syncDowntimeUiDraftFromElement(combinedElement), drafts.getDowntimeUiDraft());

  assert.deepEqual(drafts.clearDowntimeUiDraft(), {});
  assert.equal(storage.getItem(drafts.getDowntimeUiDraftStorageKey()), null);
}

process.stdout.write("downtime ui draft storage validation passed\n");