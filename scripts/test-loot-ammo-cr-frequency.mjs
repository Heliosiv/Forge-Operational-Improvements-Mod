import { buildLootCohesiveBundle } from "./features/loot-selection-cohesion.js";

const TRIALS = 10000;

const CHALLENGE_LABELS = {
  low: "CR 0-4",
  mid: "CR 5-10",
  high: "CR 11-16",
  epic: "CR 17+"
};

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

function printSection(title = "") {
  process.stdout.write(`\n=== ${title} ===\n`);
}

function run() {
  printSection("Ammo stack Monte Carlo (10k trials each)");
  process.stdout.write("Format: tier | avg stack | non-zero rate | top quantities(freq)\n");

  for (const challenge of ["low", "high"]) {
    process.stdout.write(`\n${CHALLENGE_LABELS[challenge]} (${challenge})\n`);
    for (const tier of [0, 1, 2, 3]) {
      const sample = sampleAmmoQuantity(challenge, tier, "medium", TRIALS);
      process.stdout.write(
        `+${tier} | avg=${sample.avg.toFixed(2)} | nonZero=${sample.nonZeroRate.toFixed(1)}% | ${sample.top}\n`
      );
    }
  }

  printSection("Relative availability index (higher = more likely to be picked)");
  process.stdout.write("Index = horde rarityWeight * challengeAvailabilityWeight for ammo\n");

  for (const challenge of ["low", "high"]) {
    const row = [0, 1, 2, 3]
      .map((tier) => `+${tier}:${relativeSelectionIndex(challenge, tier).toFixed(4)}`)
      .join("  ");
    process.stdout.write(`${CHALLENGE_LABELS[challenge]} -> ${row}\n`);
  }

  printSection("Low CR target check");
  const lowPlusOne = sampleAmmoQuantity("low", 1, "medium", TRIALS);
  const lowPlusTwo = sampleAmmoQuantity("low", 2, "medium", TRIALS);
  const lowPlusThree = sampleAmmoQuantity("low", 3, "medium", TRIALS);

  process.stdout.write(`CR 0-4 +1 expected around 1-3 stacks: observed avg ${lowPlusOne.avg.toFixed(2)}\n`);
  process.stdout.write(`CR 0-4 +2 expected near 0-1: observed avg ${lowPlusTwo.avg.toFixed(2)}, nonZero ${lowPlusTwo.nonZeroRate.toFixed(1)}%\n`);
  process.stdout.write(`CR 0-4 +3 expected 0: observed avg ${lowPlusThree.avg.toFixed(2)}, nonZero ${lowPlusThree.nonZeroRate.toFixed(1)}%\n`);
}

run();
