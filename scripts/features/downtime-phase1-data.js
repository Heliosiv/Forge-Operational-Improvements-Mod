export const DOWNTIME_PHASE1_ACTIONS = Object.freeze([
  {
    key: "browsing",
    label: "Browsing",
    guidance: "Seek leads, rumors, access, and market insight without auto-writing the final story."
  },
  {
    key: "crafting",
    label: "Crafting",
    guidance: "Work on a selected item, validate tools, pay for materials if needed, and bank progress."
  },
  {
    key: "profession",
    label: "Practicing A Profession",
    guidance: "Take paid work using a chosen profession and resolve trained or untrained performance."
  }
]);

export const DOWNTIME_PHASE1_RESULT_TIERS = Object.freeze([
  "failure",
  "success",
  "strong-success",
  "exceptional-success"
]);

export const DOWNTIME_AREA_ECONOMY_OPTIONS = Object.freeze([
  { value: "stingy", label: "Stingy Economy" },
  { value: "standard", label: "Standard Economy" },
  { value: "generous", label: "Generous Economy" }
]);

export const DOWNTIME_AREA_RISK_OPTIONS = Object.freeze([
  { value: "low", label: "Low Risk" },
  { value: "standard", label: "Standard Risk" },
  { value: "high", label: "High Risk" }
]);

export const DOWNTIME_AREA_DISCOVERY_OPTIONS = Object.freeze([
  { value: "sparse", label: "Sparse Discovery" },
  { value: "standard", label: "Standard Discovery" },
  { value: "rich", label: "Rich Discovery" }
]);

export const DOWNTIME_BROWSING_ABILITY_OPTIONS = Object.freeze([
  { value: "int", label: "Intelligence" },
  { value: "cha", label: "Charisma" }
]);

export const DOWNTIME_TOOL_PROFICIENCIES = Object.freeze({
  "smiths-tools": {
    id: "smiths-tools",
    label: "Smith's Tools",
    aliases: ["smith's tools", "smiths tools", "smith tools", "smith"]
  },
  "alchemists-supplies": {
    id: "alchemists-supplies",
    label: "Alchemist's Supplies",
    aliases: ["alchemist's supplies", "alchemists supplies", "alchemy supplies", "alchemist"]
  },
  "herbalism-kit": {
    id: "herbalism-kit",
    label: "Herbalism Kit",
    aliases: ["herbalism kit", "herbalism", "herbal kit"]
  },
  "leatherworkers-tools": {
    id: "leatherworkers-tools",
    label: "Leatherworker's Tools",
    aliases: ["leatherworker's tools", "leatherworkers tools", "leatherworking tools", "leatherworker"]
  },
  "woodcarvers-tools": {
    id: "woodcarvers-tools",
    label: "Woodcarver's Tools",
    aliases: ["woodcarver's tools", "woodcarvers tools", "woodworking tools", "woodcarver"]
  },
  "calligraphers-supplies": {
    id: "calligraphers-supplies",
    label: "Calligrapher's Supplies",
    aliases: ["calligrapher's supplies", "calligraphers supplies", "calligraphy supplies", "calligrapher"]
  },
  "tinkers-tools": {
    id: "tinkers-tools",
    label: "Tinker's Tools",
    aliases: ["tinker's tools", "tinkers tools", "tinkering tools", "tinker tools", "tinker"]
  },
  "cooks-utensils": {
    id: "cooks-utensils",
    label: "Cook's Utensils",
    aliases: ["cook's utensils", "cooks utensils", "cooking utensils", "cook utensils", "cook"]
  },
  "fletchers-tools": {
    id: "fletchers-tools",
    label: "Fletcher's Tools",
    aliases: ["fletcher's tools", "fletchers tools", "fletcher tools", "fletcher"]
  }
});

export const DOWNTIME_CRAFTING_CATEGORIES = Object.freeze([
  { id: "smithing", label: "Smithing" },
  { id: "brewing-alchemy", label: "Brewing/Alchemy" },
  { id: "herbalism", label: "Herbalism" },
  { id: "leatherworking", label: "Leatherworking" },
  { id: "woodworking-fletcher", label: "Woodworking/Fletcher" },
  { id: "calligraphy-scrollwork", label: "Calligraphy/Scrollwork" },
  { id: "tinkering-repair", label: "Tinkering/Repair" },
  { id: "cooking-preserves", label: "Cooking/Preserves" }
]);

export const DOWNTIME_CRAFTABLES = Object.freeze([
  { id: "smith-horseshoes", name: "Set of Horseshoes", category: "smithing", requiredToolProficiency: "Smith's Tools", requiredToolId: "smiths-tools", baseCost: 2, materialCost: 1, progressRequired: 4, checkAbility: "str", tier: "common", itemType: "loot" },
  { id: "smith-iron-spikes", name: "Bundle of Iron Spikes", category: "smithing", requiredToolProficiency: "Smith's Tools", requiredToolId: "smiths-tools", baseCost: 1, materialCost: 1, progressRequired: 3, checkAbility: "str", tier: "common", itemType: "loot" },
  { id: "smith-cookpot", name: "Iron Cook Pot", category: "smithing", requiredToolProficiency: "Smith's Tools", requiredToolId: "smiths-tools", baseCost: 5, materialCost: 3, progressRequired: 6, checkAbility: "str", tier: "common", itemType: "loot" },
  { id: "smith-lock", name: "Simple Iron Lock", category: "smithing", requiredToolProficiency: "Smith's Tools", requiredToolId: "smiths-tools", baseCost: 10, materialCost: 6, progressRequired: 8, checkAbility: "int", tier: "uncommon", itemType: "loot" },
  { id: "smith-dagger", name: "Iron Dagger", category: "smithing", requiredToolProficiency: "Smith's Tools", requiredToolId: "smiths-tools", baseCost: 2, materialCost: 1, progressRequired: 5, checkAbility: "str", tier: "common", itemType: "weapon" },
  { id: "smith-shield-boss", name: "Shield Boss", category: "smithing", requiredToolProficiency: "Smith's Tools", requiredToolId: "smiths-tools", baseCost: 4, materialCost: 2, progressRequired: 5, checkAbility: "str", tier: "common", itemType: "loot" },
  { id: "smith-caltrops", name: "Caltrops", category: "smithing", requiredToolProficiency: "Smith's Tools", requiredToolId: "smiths-tools", baseCost: 1, materialCost: 1, progressRequired: 3, checkAbility: "str", tier: "common", itemType: "consumable" },
  { id: "alchemy-healing-tonic", name: "Healing Tonic", category: "brewing-alchemy", requiredToolProficiency: "Alchemist's Supplies", requiredToolId: "alchemists-supplies", baseCost: 12, materialCost: 7, progressRequired: 8, checkAbility: "int", tier: "uncommon", itemType: "consumable" },
  { id: "alchemy-antitoxin-dose", name: "Antitoxin Dose", category: "brewing-alchemy", requiredToolProficiency: "Alchemist's Supplies", requiredToolId: "alchemists-supplies", baseCost: 15, materialCost: 9, progressRequired: 10, checkAbility: "int", tier: "uncommon", itemType: "consumable" },
  { id: "alchemy-lamp-oil", name: "Lamp Oil Batch", category: "brewing-alchemy", requiredToolProficiency: "Alchemist's Supplies", requiredToolId: "alchemists-supplies", baseCost: 2, materialCost: 1, progressRequired: 4, checkAbility: "int", tier: "common", itemType: "consumable" },
  { id: "alchemy-soap-bricks", name: "Soap Bricks", category: "brewing-alchemy", requiredToolProficiency: "Alchemist's Supplies", requiredToolId: "alchemists-supplies", baseCost: 1, materialCost: 1, progressRequired: 3, checkAbility: "int", tier: "common", itemType: "consumable" },
  { id: "alchemy-acid-vial", name: "Acid Vial", category: "brewing-alchemy", requiredToolProficiency: "Alchemist's Supplies", requiredToolId: "alchemists-supplies", baseCost: 25, materialCost: 15, progressRequired: 12, checkAbility: "int", tier: "specialist", itemType: "consumable" },
  { id: "alchemy-smoke-powder", name: "Smoke Powder Packet", category: "brewing-alchemy", requiredToolProficiency: "Alchemist's Supplies", requiredToolId: "alchemists-supplies", baseCost: 8, materialCost: 4, progressRequired: 6, checkAbility: "int", tier: "common", itemType: "consumable" },
  { id: "herb-bandage-bundle", name: "Bandage Bundle", category: "herbalism", requiredToolProficiency: "Herbalism Kit", requiredToolId: "herbalism-kit", baseCost: 3, materialCost: 2, progressRequired: 4, checkAbility: "wis", tier: "common", itemType: "consumable" },
  { id: "herb-repellent-balm", name: "Repellent Balm", category: "herbalism", requiredToolProficiency: "Herbalism Kit", requiredToolId: "herbalism-kit", baseCost: 4, materialCost: 2, progressRequired: 5, checkAbility: "wis", tier: "common", itemType: "consumable" },
  { id: "herb-wound-salve", name: "Wound Salve", category: "herbalism", requiredToolProficiency: "Herbalism Kit", requiredToolId: "herbalism-kit", baseCost: 6, materialCost: 4, progressRequired: 6, checkAbility: "wis", tier: "common", itemType: "consumable" },
  { id: "herb-tea-pack", name: "Calming Tea Pack", category: "herbalism", requiredToolProficiency: "Herbalism Kit", requiredToolId: "herbalism-kit", baseCost: 2, materialCost: 1, progressRequired: 3, checkAbility: "wis", tier: "common", itemType: "consumable" },
  { id: "herb-restorative-poultice", name: "Restorative Poultice", category: "herbalism", requiredToolProficiency: "Herbalism Kit", requiredToolId: "herbalism-kit", baseCost: 8, materialCost: 5, progressRequired: 7, checkAbility: "wis", tier: "uncommon", itemType: "consumable" },
  { id: "herb-travel-satchel", name: "Travel Herb Satchel", category: "herbalism", requiredToolProficiency: "Herbalism Kit", requiredToolId: "herbalism-kit", baseCost: 5, materialCost: 3, progressRequired: 5, checkAbility: "wis", tier: "common", itemType: "loot" },
  { id: "leather-belt-pouch", name: "Belt Pouch", category: "leatherworking", requiredToolProficiency: "Leatherworker's Tools", requiredToolId: "leatherworkers-tools", baseCost: 1, materialCost: 1, progressRequired: 3, checkAbility: "dex", tier: "common", itemType: "container" },
  { id: "leather-waterskin", name: "Waterskin", category: "leatherworking", requiredToolProficiency: "Leatherworker's Tools", requiredToolId: "leatherworkers-tools", baseCost: 1, materialCost: 1, progressRequired: 3, checkAbility: "dex", tier: "common", itemType: "loot" },
  { id: "leather-boots", name: "Travel Boots", category: "leatherworking", requiredToolProficiency: "Leatherworker's Tools", requiredToolId: "leatherworkers-tools", baseCost: 4, materialCost: 2, progressRequired: 5, checkAbility: "dex", tier: "common", itemType: "equipment" },
  { id: "leather-saddlebags", name: "Saddlebags", category: "leatherworking", requiredToolProficiency: "Leatherworker's Tools", requiredToolId: "leatherworkers-tools", baseCost: 4, materialCost: 2, progressRequired: 5, checkAbility: "dex", tier: "common", itemType: "container" },
  { id: "leather-sling", name: "Sling", category: "leatherworking", requiredToolProficiency: "Leatherworker's Tools", requiredToolId: "leatherworkers-tools", baseCost: 1, materialCost: 1, progressRequired: 3, checkAbility: "dex", tier: "common", itemType: "weapon" },
  { id: "leather-riding-harness", name: "Riding Harness", category: "leatherworking", requiredToolProficiency: "Leatherworker's Tools", requiredToolId: "leatherworkers-tools", baseCost: 6, materialCost: 4, progressRequired: 7, checkAbility: "dex", tier: "uncommon", itemType: "equipment" },
  { id: "wood-arrows", name: "Arrows (20)", category: "woodworking-fletcher", requiredToolProficiency: "Fletcher's Tools", requiredToolId: "fletchers-tools", baseCost: 1, materialCost: 1, progressRequired: 3, checkAbility: "dex", tier: "common", itemType: "consumable" },
  { id: "wood-bolts", name: "Bolts (20)", category: "woodworking-fletcher", requiredToolProficiency: "Fletcher's Tools", requiredToolId: "fletchers-tools", baseCost: 1, materialCost: 1, progressRequired: 3, checkAbility: "dex", tier: "common", itemType: "consumable" },
  { id: "wood-walking-staff", name: "Walking Staff", category: "woodworking-fletcher", requiredToolProficiency: "Woodcarver's Tools", requiredToolId: "woodcarvers-tools", baseCost: 2, materialCost: 1, progressRequired: 4, checkAbility: "dex", tier: "common", itemType: "weapon" },
  { id: "wood-spear-shaft", name: "Spear Shaft", category: "woodworking-fletcher", requiredToolProficiency: "Woodcarver's Tools", requiredToolId: "woodcarvers-tools", baseCost: 1, materialCost: 1, progressRequired: 4, checkAbility: "dex", tier: "common", itemType: "weapon" },
  { id: "wood-travel-crate", name: "Travel Crate", category: "woodworking-fletcher", requiredToolProficiency: "Woodcarver's Tools", requiredToolId: "woodcarvers-tools", baseCost: 3, materialCost: 2, progressRequired: 5, checkAbility: "dex", tier: "common", itemType: "container" },
  { id: "wood-hunting-trap", name: "Hunting Trap", category: "woodworking-fletcher", requiredToolProficiency: "Woodcarver's Tools", requiredToolId: "woodcarvers-tools", baseCost: 5, materialCost: 3, progressRequired: 6, checkAbility: "dex", tier: "uncommon", itemType: "loot" },
  { id: "wood-quiver", name: "Quiver", category: "woodworking-fletcher", requiredToolProficiency: "Fletcher's Tools", requiredToolId: "fletchers-tools", baseCost: 1, materialCost: 1, progressRequired: 3, checkAbility: "dex", tier: "common", itemType: "container" },
  { id: "scribe-parchment-pack", name: "Blank Parchment Pack", category: "calligraphy-scrollwork", requiredToolProficiency: "Calligrapher's Supplies", requiredToolId: "calligraphers-supplies", baseCost: 1, materialCost: 1, progressRequired: 3, checkAbility: "int", tier: "common", itemType: "loot" },
  { id: "scribe-sealed-writ", name: "Sealed Writ", category: "calligraphy-scrollwork", requiredToolProficiency: "Calligrapher's Supplies", requiredToolId: "calligraphers-supplies", baseCost: 5, materialCost: 2, progressRequired: 4, checkAbility: "int", tier: "common", itemType: "loot" },
  { id: "scribe-map-copy", name: "Travel Map Copy", category: "calligraphy-scrollwork", requiredToolProficiency: "Calligrapher's Supplies", requiredToolId: "calligraphers-supplies", baseCost: 8, materialCost: 4, progressRequired: 6, checkAbility: "int", tier: "uncommon", itemType: "loot" },
  { id: "scribe-cipher-notes", name: "Cipher Note Set", category: "calligraphy-scrollwork", requiredToolProficiency: "Calligrapher's Supplies", requiredToolId: "calligraphers-supplies", baseCost: 7, materialCost: 3, progressRequired: 6, checkAbility: "int", tier: "uncommon", itemType: "loot" },
  { id: "scribe-ledger", name: "Inventory Ledger", category: "calligraphy-scrollwork", requiredToolProficiency: "Calligrapher's Supplies", requiredToolId: "calligraphers-supplies", baseCost: 4, materialCost: 2, progressRequired: 5, checkAbility: "int", tier: "common", itemType: "loot" },
  { id: "scribe-illuminated-invite", name: "Illuminated Invitation", category: "calligraphy-scrollwork", requiredToolProficiency: "Calligrapher's Supplies", requiredToolId: "calligraphers-supplies", baseCost: 10, materialCost: 5, progressRequired: 7, checkAbility: "int", tier: "uncommon", itemType: "loot" },
  { id: "tinker-lantern-tuneup", name: "Lantern Tune-Up Kit", category: "tinkering-repair", requiredToolProficiency: "Tinker's Tools", requiredToolId: "tinkers-tools", baseCost: 3, materialCost: 2, progressRequired: 4, checkAbility: "int", tier: "common", itemType: "tool" },
  { id: "tinker-grappling-hook", name: "Grappling Hook", category: "tinkering-repair", requiredToolProficiency: "Tinker's Tools", requiredToolId: "tinkers-tools", baseCost: 2, materialCost: 1, progressRequired: 4, checkAbility: "int", tier: "common", itemType: "loot" },
  { id: "tinker-mess-kit", name: "Mess Kit", category: "tinkering-repair", requiredToolProficiency: "Tinker's Tools", requiredToolId: "tinkers-tools", baseCost: 2, materialCost: 1, progressRequired: 4, checkAbility: "int", tier: "common", itemType: "loot" },
  { id: "tinker-lockpick-refit", name: "Lockpick Refit", category: "tinkering-repair", requiredToolProficiency: "Tinker's Tools", requiredToolId: "tinkers-tools", baseCost: 8, materialCost: 4, progressRequired: 6, checkAbility: "int", tier: "uncommon", itemType: "tool" },
  { id: "tinker-pulley-kit", name: "Pulley Kit", category: "tinkering-repair", requiredToolProficiency: "Tinker's Tools", requiredToolId: "tinkers-tools", baseCost: 5, materialCost: 3, progressRequired: 5, checkAbility: "int", tier: "common", itemType: "tool" },
  { id: "tinker-clockwork-toy", name: "Clockwork Toy", category: "tinkering-repair", requiredToolProficiency: "Tinker's Tools", requiredToolId: "tinkers-tools", baseCost: 15, materialCost: 8, progressRequired: 9, checkAbility: "int", tier: "specialist", itemType: "loot" },
  { id: "cook-trail-rations", name: "Trail Rations Batch", category: "cooking-preserves", requiredToolProficiency: "Cook's Utensils", requiredToolId: "cooks-utensils", baseCost: 2, materialCost: 1, progressRequired: 3, checkAbility: "wis", tier: "common", itemType: "consumable" },
  { id: "cook-jerky-bundle", name: "Jerky Bundle", category: "cooking-preserves", requiredToolProficiency: "Cook's Utensils", requiredToolId: "cooks-utensils", baseCost: 3, materialCost: 2, progressRequired: 4, checkAbility: "wis", tier: "common", itemType: "consumable" },
  { id: "cook-pickled-veg", name: "Pickled Vegetables Jar", category: "cooking-preserves", requiredToolProficiency: "Cook's Utensils", requiredToolId: "cooks-utensils", baseCost: 3, materialCost: 2, progressRequired: 4, checkAbility: "wis", tier: "common", itemType: "consumable" },
  { id: "cook-spice-pack", name: "Travel Spice Pack", category: "cooking-preserves", requiredToolProficiency: "Cook's Utensils", requiredToolId: "cooks-utensils", baseCost: 5, materialCost: 3, progressRequired: 5, checkAbility: "wis", tier: "common", itemType: "consumable" },
  { id: "cook-hardtack-crate", name: "Hardtack Crate", category: "cooking-preserves", requiredToolProficiency: "Cook's Utensils", requiredToolId: "cooks-utensils", baseCost: 4, materialCost: 2, progressRequired: 5, checkAbility: "wis", tier: "common", itemType: "consumable" },
  { id: "cook-fruit-preserves", name: "Fruit Preserves", category: "cooking-preserves", requiredToolProficiency: "Cook's Utensils", requiredToolId: "cooks-utensils", baseCost: 6, materialCost: 3, progressRequired: 6, checkAbility: "wis", tier: "uncommon", itemType: "consumable" }
]);

export const DOWNTIME_PROFESSIONS = Object.freeze([
  { id: "laborer", name: "Laborer", checkAbility: "con", trainedRateGpPer4h: 2, untrainedRateGpPer4h: 1, difficulty: 10 },
  { id: "porter", name: "Porter", checkAbility: "str", trainedRateGpPer4h: 2, untrainedRateGpPer4h: 1, difficulty: 10 },
  { id: "sailor", name: "Sailor", checkAbility: "str", trainedRateGpPer4h: 3, untrainedRateGpPer4h: 1, difficulty: 11 },
  { id: "guide", name: "Guide", checkAbility: "wis", trainedRateGpPer4h: 3, untrainedRateGpPer4h: 1, difficulty: 12 },
  { id: "scribe", name: "Scribe", checkAbility: "int", trainedRateGpPer4h: 3, untrainedRateGpPer4h: 1, difficulty: 12 },
  { id: "merchant-clerk", name: "Merchant Clerk", checkAbility: "cha", trainedRateGpPer4h: 3, untrainedRateGpPer4h: 1, difficulty: 12 },
  { id: "cook", name: "Cook", checkAbility: "wis", trainedRateGpPer4h: 3, untrainedRateGpPer4h: 1, difficulty: 11 },
  { id: "brewer", name: "Brewer", checkAbility: "int", trainedRateGpPer4h: 4, untrainedRateGpPer4h: 1, difficulty: 13 },
  { id: "blacksmith", name: "Blacksmith", checkAbility: "str", trainedRateGpPer4h: 4, untrainedRateGpPer4h: 1, difficulty: 13 },
  { id: "carpenter", name: "Carpenter", checkAbility: "dex", trainedRateGpPer4h: 4, untrainedRateGpPer4h: 1, difficulty: 12 },
  { id: "leatherworker", name: "Leatherworker", checkAbility: "dex", trainedRateGpPer4h: 4, untrainedRateGpPer4h: 1, difficulty: 12 },
  { id: "herbalist", name: "Herbalist", checkAbility: "wis", trainedRateGpPer4h: 4, untrainedRateGpPer4h: 1, difficulty: 13 },
  { id: "tinker", name: "Tinker", checkAbility: "int", trainedRateGpPer4h: 4, untrainedRateGpPer4h: 1, difficulty: 13 },
  { id: "healer", name: "Healer", checkAbility: "wis", trainedRateGpPer4h: 5, untrainedRateGpPer4h: 1, difficulty: 14 },
  { id: "miner", name: "Miner", checkAbility: "con", trainedRateGpPer4h: 4, untrainedRateGpPer4h: 1, difficulty: 13 },
  { id: "street-thief", name: "Street Thief", checkAbility: "dex", trainedRateGpPer4h: 5, untrainedRateGpPer4h: 2, difficulty: 13 },
  { id: "performer", name: "Performer", checkAbility: "cha", trainedRateGpPer4h: 4, untrainedRateGpPer4h: 1, difficulty: 12 },
  { id: "merchant-broker", name: "Merchant Broker", checkAbility: "cha", trainedRateGpPer4h: 5, untrainedRateGpPer4h: 2, difficulty: 14 }
]);
