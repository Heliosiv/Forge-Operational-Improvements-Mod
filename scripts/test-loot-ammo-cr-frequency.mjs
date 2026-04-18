import assert from "node:assert/strict";

import { buildLootCohesiveBundle } from "./features/loot-selection-cohesion.js";

const TRIALS = 10000;
const verbose = process.env.PARTY_OPS_VERBOSE_TESTS === "1";

const CHALLENGE_LABELS = {
  low: "CR 0-4",
  mid: "CR 5-10",
  high: "CR 11-16",
  epic: "CR 17+"
};

function log(message = "") {
  if (verbose) process.stdout.write(`${message}\n`);
}

function createSeededRandom(seed = 1) {
  let state = Math.max(1, Math.floor(seed) || 1) % 2147483647;
  return () => {
    state = (state * 48271) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function rarityBucketForTier(tier = 0) {
  if (tier >= 3) return "very-rare";
  if (tier === 2) return "rare";
  if (tier === 1) return "uncommon";
  return "common";
}

function makeAmmo(tier = 0) {
  const plus = tier > 0 ? ` +${tier}` : "";
  return {
    uuid: `Item.ammo.tier-${tier}`,
    name: `Arrows${plus}`,
    itemType: "ammunition",
    itemValueGp: tier >= 3 ? 30 : tier === 2 ? 10 : tier === 1 ? 2.5 : 0.05,
    rarity: rarityBucketForTier(tier),
    merchantCategories: ["arms", "ammo"],
    keywords: tier > 0 ? ["loot.weapon.magic"] : []
  };
}

function sampleAmmoQuantity(challenge = "low", tier = 0, scale = "medium", trials = TRIALS) {
  const baseSeed = (challenge.charCodeAt(0) * 1000) + (tier * 97) + (scale.charCodeAt(0) * 13);
  const random = createSeededRandom(baseSeed);
  const counts = new Map();
  let total = 0;

  const ammo = makeAmmo(tier);

  for (let index = 0; index < trials; index += 1) {
    const bundle = buildLootCohesiveBundle(ammo, {
      budgetRemainingGp: 500,
      draft: { mode: "horde", challenge, scale },
      pool: [],
      selected: [],
      random
    });

    const qty = Math.max(0, Math.floor(Number(bundle?.[0]?.quantity ?? 0) || 0));
    counts.set(qty, (counts.get(qty) ?? 0) + 1);
    total += qty;
  }

  const avg = total / trials;
  const nonZeroRate = ((trials - (counts.get(0) ?? 0)) / trials) * 100;
  const keys = [...counts.keys()].sort((a, b) => a - b);
  const top = keys
    .map((quantity) => ({ quantity, count: counts.get(quantity) ?? 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
    .map((row) => `${row.quantity}:${((row.count / trials) * 100).toFixed(1)}%`)
    .join(" ");

  return {
    challenge,
    tier,
    avg,
    nonZeroRate,
    top
  };
}

function getModeChallengeRarityWeight(challenge = "low", rarity = "common") {
  const table = {
    low: { common: 22, uncommon: 2.8, rare: 0.04, "very-rare": 0, legendary: 0 },
    mid: { common: 14, uncommon: 5.8, rare: 1.5, "very-rare": 0.18, legendary: 0.01 },
    high: { common: 12, uncommon: 6.8, rare: 2.6, "very-rare": 0.45, legendary: 0.03 },
    epic: { common: 10.5, uncommon: 7.2, rare: 3.8, "very-rare": 0.95, legendary: 0.08 }
  };
  const byChallenge = table[challenge] ?? table.mid;
  return Number(byChallenge[rarity] ?? 1);
}

function getAvailabilityWeight(challenge = "low", tier = 0, isAmmo = true) {
  if (tier <= 0) return 1;

  if (challenge === "low") {
    if (tier === 1) return isAmmo ? 0.08 : 0.16;
    if (tier === 2) return isAmmo ? 0 : 0.02;
    return 0;
  }

  if (challenge === "mid") {
    if (tier === 1) return isAmmo ? 0.45 : 0.55;
    if (tier === 2) return isAmmo ? 0.12 : 0.2;
    if (tier === 3) return isAmmo ? 0.01 : 0.03;
    return 0;
  }

  if (challenge === "high") {
    if (tier === 1) return 0.95;
    if (tier === 2) return 0.55;
    if (tier === 3) return 0.18;
    return 0.03;
  }

  if (tier === 1) return 1.05;
  if (tier === 2) return 0.85;
  if (tier === 3) return 0.45;
  return 0.16;
}

function relativeSelectionIndex(challenge = "low", tier = 0) {
  const rarity = rarityBucketForTier(tier);
  const rarityWeight = getModeChallengeRarityWeight(challenge, rarity);
  const availabilityWeight = getAvailabilityWeight(challenge, tier, true);
  return rarityWeight * availabilityWeight;
}

function logSample(sample) {
  log(`${CHALLENGE_LABELS[sample.challenge]} +${sample.tier} | avg=${sample.avg.toFixed(2)} | nonZero=${sample.nonZeroRate.toFixed(1)}% | ${sample.top}`);
}

const lowPlusZero = sampleAmmoQuantity("low", 0, "medium", TRIALS);
const lowPlusOne = sampleAmmoQuantity("low", 1, "medium", TRIALS);
const lowPlusTwo = sampleAmmoQuantity("low", 2, "medium", TRIALS);
const lowPlusThree = sampleAmmoQuantity("low", 3, "medium", TRIALS);
const highPlusZero = sampleAmmoQuantity("high", 0, "medium", TRIALS);
const highPlusOne = sampleAmmoQuantity("high", 1, "medium", TRIALS);
const highPlusTwo = sampleAmmoQuantity("high", 2, "medium", TRIALS);
const highPlusThree = sampleAmmoQuantity("high", 3, "medium", TRIALS);

for (const sample of [
  lowPlusZero,
  lowPlusOne,
  lowPlusTwo,
  lowPlusThree,
  highPlusZero,
  highPlusOne,
  highPlusTwo,
  highPlusThree
]) {
  logSample(sample);
}

assert(lowPlusZero.avg >= 4 && lowPlusZero.avg <= 6, `Expected low CR +0 ammo average near 4-6, got ${lowPlusZero.avg.toFixed(2)}.`);
assert(lowPlusOne.avg >= 1 && lowPlusOne.avg <= 3, `Expected low CR +1 ammo average near 1-3, got ${lowPlusOne.avg.toFixed(2)}.`);
assert(lowPlusTwo.avg >= 0 && lowPlusTwo.avg <= 1, `Expected low CR +2 ammo average near 0-1, got ${lowPlusTwo.avg.toFixed(2)}.`);
assert.equal(lowPlusThree.avg, 0, "Expected low CR +3 ammo average to stay at 0.");
assert.equal(lowPlusThree.nonZeroRate, 0, "Expected low CR +3 ammo to have a 0% non-zero rate.");
assert(lowPlusTwo.nonZeroRate <= 25, `Expected low CR +2 ammo non-zero rate to stay <= 25%, got ${lowPlusTwo.nonZeroRate.toFixed(1)}%.`);

assert(highPlusZero.avg > highPlusOne.avg, "Expected high CR +0 ammo average to exceed +1.");
assert(highPlusOne.avg > highPlusTwo.avg, "Expected high CR +1 ammo average to exceed +2.");
assert(highPlusTwo.avg > highPlusThree.avg, "Expected high CR +2 ammo average to exceed +3.");
assert(highPlusThree.avg > 0, "Expected high CR +3 ammo average to remain above 0.");

assert.equal(relativeSelectionIndex("low", 2), 0, "Expected low CR +2 ammo selection index to be 0.");
assert.equal(relativeSelectionIndex("low", 3), 0, "Expected low CR +3 ammo selection index to be 0.");
assert(relativeSelectionIndex("high", 1) > relativeSelectionIndex("high", 2), "Expected high CR +1 ammo selection index to exceed +2.");
assert(relativeSelectionIndex("high", 2) > relativeSelectionIndex("high", 3), "Expected high CR +2 ammo selection index to exceed +3.");

process.stdout.write("loot ammo cr frequency validation passed\n");
