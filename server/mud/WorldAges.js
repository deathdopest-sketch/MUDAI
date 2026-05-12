'use strict';

const AGES = [
  {
    id           : 0,
    name         : 'Stone Age',
    xp_threshold : 50000,
    tagline      : 'Fire was invented last Tuesday. Congrats.',
  },
  {
    id           : 1,
    name         : 'Bronze Age',
    xp_threshold : 200000,
    tagline      : 'Shiny rocks. Sharp shiny rocks.',
  },
  {
    id           : 2,
    name         : 'Iron Age',
    xp_threshold : 500000,
    tagline      : 'Progress hurts. So do swords.',
  },
  {
    id           : 3,
    name         : 'Medieval',
    xp_threshold : 1200000,
    tagline      : 'Plague, knights, and dragons. The full package.',
  },
];

const MONSTER_TEMPLATES = {
  // ── Stone Age ──────────────────────────────────────────────────────────────
  cave_rat: {
    id          : 'cave_rat',
    name        : 'Cave Rat',
    age         : 0,
    description : 'A mangy rat the size of a small dog. Teeth like jagged flint.',
    hp          : 8,
    str         : 2,
    dex         : 4,
    xp          : 5,
    gold_min    : 2,
    gold_max    : 8,
    loot        : [{ id: 'rat_pelt', chance: 0.35 }],
    respawn_min : 3,
    aggro       : false,
  },
  dire_wolf: {
    id          : 'dire_wolf',
    name        : 'Dire Wolf',
    age         : 0,
    description : 'A wolf the size of a horse. It is not friendly.',
    hp          : 22,
    str         : 6,
    dex         : 5,
    xp          : 18,
    gold_min    : 8,
    gold_max    : 22,
    loot        : [{ id: 'wolf_pelt', chance: 0.5 }, { id: 'wolf_fang', chance: 0.3 }],
    respawn_min : 8,
    aggro       : true,
  },
  cave_bear: {
    id          : 'cave_bear',
    name        : 'Cave Bear',
    age         : 0,
    description : 'An enormous bear with claws like bone daggers. Absolutely furious.',
    hp          : 48,
    str         : 10,
    dex         : 3,
    xp          : 42,
    gold_min    : 22,
    gold_max    : 55,
    loot        : [{ id: 'bear_pelt', chance: 0.65 }, { id: 'bone_club', chance: 0.22 }],
    respawn_min : 20,
    aggro       : true,
  },
  woolly_mammoth: {
    id          : 'woolly_mammoth',
    name        : 'Woolly Mammoth',
    age         : 0,
    description : 'The ground shakes with each step. A living mountain of fur and tusks.',
    hp          : 160,
    str         : 18,
    dex         : 2,
    xp          : 220,
    gold_min    : 90,
    gold_max    : 200,
    loot        : [{ id: 'mammoth_hide', chance: 0.9 }, { id: 'mammoth_tusk', chance: 0.6 }],
    respawn_min : 60,
    aggro       : false,
    is_boss     : true,
  },

  // ── Bronze Age ─────────────────────────────────────────────────────────────
  war_boar: {
    id          : 'war_boar',
    name        : 'War Boar',
    age         : 1,
    description : 'A massive boar with bronze-capped tusks. Someone trained this thing to kill.',
    hp          : 38,
    str         : 9,
    dex         : 6,
    xp          : 32,
    gold_min    : 18,
    gold_max    : 38,
    loot        : [{ id: 'boar_tusk', chance: 0.5 }, { id: 'dried_meat', chance: 0.4 }],
    respawn_min : 10,
    aggro       : true,
  },
  tribal_warrior: {
    id          : 'tribal_warrior',
    name        : 'Tribal Warrior',
    age         : 1,
    description : 'A painted warrior with a bronze spear and absolutely zero interest in diplomacy.',
    hp          : 48,
    str         : 12,
    dex         : 8,
    xp          : 52,
    gold_min    : 35,
    gold_max    : 70,
    loot        : [{ id: 'bronze_shard', chance: 0.45 }, { id: 'iron_spear', chance: 0.12 }],
    respawn_min : 12,
    aggro       : true,
  },
  bronze_golem: {
    id          : 'bronze_golem',
    name        : 'Bronze Golem',
    age         : 1,
    description : 'A lumbering construct of ancient bronze, bound together by forgotten sorcery. Slow. Very angry.',
    hp          : 90,
    str         : 16,
    dex         : 2,
    xp          : 100,
    gold_min    : 70,
    gold_max    : 120,
    loot        : [{ id: 'bronze_shard', chance: 0.8 }, { id: 'bronze_sword', chance: 0.15 }],
    respawn_min : 25,
    aggro       : false,
  },
  ancient_guardian: {
    id          : 'ancient_guardian',
    name        : 'Ancient Guardian',
    age         : 1,
    description : 'A colossal armoured figure that has stood at this threshold since the world began. It has been waiting for something worth killing.',
    hp          : 240,
    str         : 24,
    dex         : 6,
    xp          : 350,
    gold_min    : 175,
    gold_max    : 350,
    loot        : [{ id: 'ancient_relic', chance: 0.95 }, { id: 'bronze_sword', chance: 0.5 }],
    respawn_min : 90,
    aggro       : false,
    is_boss     : true,
  },
};

const ITEM_TEMPLATES = {
  // Weapons
  fists: {
    id: 'fists', name: 'Fists', type: 'weapon', slot: 'weapon',
    damage_min: 1, damage_max: 3, value: 0, age: 0,
  },
  flint_knife: {
    id: 'flint_knife', name: 'Flint Knife', type: 'weapon', slot: 'weapon',
    damage_min: 2, damage_max: 6, value: 30, age: 0,
    description: 'Sharp enough to hurt, small enough to lose.',
  },
  bone_club: {
    id: 'bone_club', name: 'Bone Club', type: 'weapon', slot: 'weapon',
    damage_min: 4, damage_max: 9, value: 80, age: 0,
    description: 'A femur repurposed as a blunt instrument.',
  },
  stone_axe: {
    id: 'stone_axe', name: 'Stone Axe', type: 'weapon', slot: 'weapon',
    damage_min: 5, damage_max: 11, value: 160, age: 0,
    description: 'Lashed flint on a branch. Surprisingly effective.',
  },
  sharpened_stick: {
    id: 'sharpened_stick', name: 'Sharpened Stick', type: 'weapon', slot: 'weapon',
    damage_min: 2, damage_max: 4, value: 10, age: 0,
    description: 'You sharpened a stick. A start.',
  },
  // Armor
  hide_tunic: {
    id: 'hide_tunic', name: 'Hide Tunic', type: 'armor', slot: 'body',
    defense: 2, value: 40, age: 0,
    description: 'Animal hide stitched together.',
  },
  bone_bracers: {
    id: 'bone_bracers', name: 'Bone Bracers', type: 'armor', slot: 'arms',
    defense: 3, value: 90, age: 0,
    description: 'Forearm guards made from large bones.',
  },
  mammoth_hide: {
    id: 'mammoth_hide', name: 'Mammoth Hide Armor', type: 'armor', slot: 'body',
    defense: 8, value: 400, age: 0,
    description: 'Heavy but legendary. Smells incredible (bad).',
  },
  // Consumables
  dried_meat: {
    id: 'dried_meat', name: 'Dried Meat', type: 'consumable',
    heal: 15, value: 20, age: 0,
    description: 'Chewy, questionable, life-saving.',
  },
  healing_herb: {
    id: 'healing_herb', name: 'Healing Herb', type: 'consumable',
    heal: 30, value: 50, age: 0,
    description: 'Bitter leaf with miraculous healing properties.',
  },
  // Stone Age materials
  rat_pelt    : { id: 'rat_pelt',     name: 'Rat Pelt',      type: 'material', value: 5,  age: 0 },
  wolf_pelt   : { id: 'wolf_pelt',    name: 'Wolf Pelt',     type: 'material', value: 15, age: 0 },
  wolf_fang   : { id: 'wolf_fang',    name: 'Wolf Fang',     type: 'material', value: 10, age: 0 },
  bear_pelt   : { id: 'bear_pelt',    name: 'Bear Pelt',     type: 'material', value: 30, age: 0 },
  mammoth_tusk: { id: 'mammoth_tusk', name: 'Mammoth Tusk',  type: 'material', value: 80, age: 0 },

  // ── Bronze Age weapons ─────────────────────────────────────────────────────
  bronze_sword: {
    id: 'bronze_sword', name: 'Bronze Sword', type: 'weapon', slot: 'weapon',
    damage_min: 7, damage_max: 15, value: 300, age: 1,
    description: 'Cast bronze, double-edged. A genuine upgrade over sharpened rock.',
  },
  iron_spear: {
    id: 'iron_spear', name: 'Iron-Tipped Spear', type: 'weapon', slot: 'weapon',
    damage_min: 9, damage_max: 18, value: 380, age: 1,
    description: 'Long reach, devastating thrust. Keep your distance and use it.',
  },
  // Bronze Age armor
  leather_armor: {
    id: 'leather_armor', name: 'Leather Armor', type: 'armor', slot: 'body',
    defense: 5, value: 200, age: 1,
    description: 'Cured leather plates. Actual protection, not just modesty.',
  },
  bronze_shield: {
    id: 'bronze_shield', name: 'Bronze Shield', type: 'armor', slot: 'arms',
    defense: 6, value: 250, age: 1,
    description: 'A round bronze buckler. Blocks hits, makes a satisfying clang.',
  },
  // Bronze Age consumable
  cave_mushroom: {
    id: 'cave_mushroom', name: 'Cave Mushroom', type: 'consumable',
    heal: 45, value: 60, age: 1,
    description: 'Glows faintly. Tastes terrible. Works brilliantly.',
  },
  // Bronze Age materials
  boar_tusk    : { id: 'boar_tusk',     name: 'Boar Tusk',      type: 'material', value: 20, age: 1 },
  bronze_shard : { id: 'bronze_shard',  name: 'Bronze Shard',   type: 'material', value: 25, age: 1 },
  ancient_relic: { id: 'ancient_relic', name: 'Ancient Relic',  type: 'material', value: 200, age: 1 },
};

module.exports = { AGES, MONSTER_TEMPLATES, ITEM_TEMPLATES };
