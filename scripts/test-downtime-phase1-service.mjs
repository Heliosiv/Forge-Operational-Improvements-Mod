import assert from "node:assert/strict";

import {
  DOWNTIME_CRAFTABLES
} from "./features/downtime-phase1-data.js";
import {
  actorKnowsProfession,
  buildCraftingCategoryViews,
  buildNextCraftingProjects,
  getActorCraftingProject,
  getActorKnownProfessionIds,
  normalizePhase1AreaSettings,
  resolvePhase1DowntimeEntry
} from "./features/downtime-phase1-service.js";

function createActorMock({
  abilities = {},
  prof = 2,
  toolItems = [],
  flags = {}
} = {}) {
  return {
    system: {
      abilities,
      attributes: {
        prof
      }
    },
    items: toolItems,
    flags,
    getFlag(moduleId, key) {
      return this.flags?.[moduleId]?.[key] ?? null;
    }
  };
}

assert.equal(DOWNTIME_CRAFTABLES.length, 50);
assert.equal(buildCraftingCategoryViews().length, 8);

assert.deepEqual(
  normalizePhase1AreaSettings({
    economy: "stingy",
    risk: "high",
    discovery: "rich"
  }),
  {
    economy: "stingy",
    risk: "high",
    discovery: "rich"
  }
);

const browsingActor = createActorMock({
  abilities: {
    int: { mod: 3 },
    cha: { mod: 1 }
  }
});

const browsingResult = resolvePhase1DowntimeEntry({
  actor: browsingActor,
  entry: {
    actionKey: "browsing",
    hours: 8,
    areaSettings: { economy: "generous", risk: "low", discovery: "rich" },
    actionData: { browsingAbility: "int" }
  },
  d20: 18
});

assert.equal(browsingResult.tier, "exceptional-success");
assert.equal(browsingResult.browsing.ability, "int");
assert.ok(browsingResult.suggestedTags.includes("quest hook"));

const craftingActor = createActorMock({
  abilities: {
    str: { mod: 1 },
    int: { mod: 2 }
  },
  prof: 2,
  toolItems: [
    {
      type: "tool",
      name: "Smith's Tools",
      system: {
        proficient: true
      }
    }
  ],
  flags: {
    "party-operations": {
      craftingProjects: {
        "smith-dagger": {
          itemId: "smith-dagger",
          itemName: "Iron Dagger",
          progress: 3,
          progressRequired: 5,
          materialsSecured: false
        }
      }
    }
  }
});

assert.equal(getActorCraftingProject(craftingActor, "smith-dagger", { moduleId: "party-operations" }).progress, 3);

const craftingResult = resolvePhase1DowntimeEntry({
  actor: craftingActor,
  entry: {
    actionKey: "crafting",
    hours: 4,
    areaSettings: { economy: "standard", risk: "standard", discovery: "standard" },
    actionData: { craftItemId: "smith-dagger", materialsOwned: false }
  },
  d20: 12
});

assert.equal(craftingResult.tier, "success");
assert.equal(craftingResult.crafting.complete, true);
assert.equal(craftingResult.itemRewardDrops.length, 1);
assert.equal(craftingResult.gpCost, 1);

assert.deepEqual(
  buildNextCraftingProjects({
    "smith-dagger": {
      itemId: "smith-dagger",
      progress: 3
    }
  }, craftingResult.crafting),
  {}
);

const professionActor = createActorMock({
  abilities: {
    wis: { mod: 3 }
  },
  prof: 2,
  flags: {
    "party-operations": {
      knownProfessions: ["healer", "guide"]
    }
  }
});

assert.deepEqual(getActorKnownProfessionIds(professionActor, { moduleId: "party-operations" }), ["healer", "guide"]);
assert.equal(actorKnowsProfession(professionActor, "healer", { moduleId: "party-operations" }), true);
assert.equal(actorKnowsProfession(professionActor, "miner", { moduleId: "party-operations" }), false);

const professionResult = resolvePhase1DowntimeEntry({
  actor: professionActor,
  entry: {
    actionKey: "profession",
    hours: 8,
    areaSettings: { economy: "generous", risk: "low", discovery: "standard" },
    actionData: { professionId: "healer" }
  },
  d20: 12
});

assert.equal(professionResult.profession.trained, true);
assert.equal(professionResult.tier, "strong-success");
assert.ok(professionResult.gpAward > 0);

const submittedProfessionResult = resolvePhase1DowntimeEntry({
  actor: professionActor,
  entry: {
    actionKey: "profession",
    hours: 8,
    areaSettings: { economy: "generous", risk: "low", discovery: "standard" },
    actionData: { professionId: "healer" },
    submittedCheck: {
      abilityKey: "wis",
      abilityMod: 3,
      proficiencyBonus: 2,
      d20: 8,
      total: 13
    }
  },
  d20: 20
});

assert.equal(submittedProfessionResult.rollTotal, 13);
assert.equal(submittedProfessionResult.tier, "success");
assert.ok(submittedProfessionResult.gpAward > 0);

const commerceResult = resolvePhase1DowntimeEntry({
  actor: browsingActor,
  entry: {
    actionKey: "commerce",
    hours: 8,
    areaSettings: { economy: "standard", risk: "standard", discovery: "standard" },
    actionData: { subtypeKey: "local-materials-buying" }
  },
  d20: 16
});

assert.equal(commerceResult.actionKey, "commerce");
assert.equal(commerceResult.subtype?.key, "local-materials-buying");
assert.ok(Array.isArray(commerceResult.rewardTags));
assert.ok(commerceResult.rewardTags.includes("discount"));
assert.ok(commerceResult.rewardEffects.discountPercent > 0);

process.stdout.write("downtime phase 1 service validation passed\n");
