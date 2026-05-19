'use strict';

const AGES = [
  {
    id           : 0,
    name         : 'Stone Age',
    xp_threshold : 5000,
    tagline      : 'Fire was invented last Tuesday. Congrats.',
  },
  {
    id           : 1,
    name         : 'Bronze Age',
    xp_threshold : 25000,
    tagline      : 'Shiny rocks. Sharp shiny rocks.',
  },
  {
    id           : 2,
    name         : 'Iron Age',
    xp_threshold : 75000,
    tagline      : 'Progress hurts. So do swords.',
  },
  {
    id           : 3,
    name         : 'Medieval',
    xp_threshold : 200000,
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
    loot        : [{ id: 'mammoth_hide', chance: 0.9 }, { id: 'mammoth_tusk', chance: 0.6 }, { id: 'flood_blade', chance: 0.015 }],
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
    loot        : [{ id: 'ancient_relic', chance: 0.95 }, { id: 'bronze_sword', chance: 0.5 }, { id: 'flood_blade', chance: 0.02 }, { id: 'before_time_armor', chance: 0.02 }],
    respawn_min : 90,
    aggro       : false,
    is_boss     : true,
  },

  // ── Iron Age ───────────────────────────────────────────────────────────────
  iron_wolf: {
    id          : 'iron_wolf',
    name        : 'Iron Wolf',
    age         : 2,
    description : 'A war-trained wolf fitted with iron plates along its spine. Fast, disciplined, and furious.',
    hp          : 65,
    str         : 12,
    dex         : 10,
    xp          : 65,
    gold_min    : 35,
    gold_max    : 75,
    loot        : [{ id: 'wolf_pelt', chance: 0.5 }, { id: 'iron_ingot', chance: 0.2 }],
    respawn_min : 12,
    aggro       : true,
  },
  iron_warrior: {
    id          : 'iron_warrior',
    name        : 'Iron Warrior',
    age         : 2,
    description : 'A seasoned soldier in battered iron armour. The dents are trophies, not damage.',
    hp          : 95,
    str         : 18,
    dex         : 7,
    xp          : 105,
    gold_min    : 55,
    gold_max    : 100,
    loot        : [{ id: 'iron_ingot', chance: 0.45 }, { id: 'iron_sword', chance: 0.1 }],
    respawn_min : 15,
    aggro       : true,
  },
  iron_knight: {
    id          : 'iron_knight',
    name        : 'Iron Knight',
    age         : 2,
    description : 'A fortress of iron plate striding towards you at speed. Each footstep shakes the ground.',
    hp          : 140,
    str         : 24,
    dex         : 5,
    xp          : 170,
    gold_min    : 100,
    gold_max    : 180,
    loot        : [{ id: 'iron_ingot', chance: 0.7 }, { id: 'war_hammer', chance: 0.12 }, { id: 'runed_stone', chance: 0.25 }],
    respawn_min : 30,
    aggro       : false,
  },
  iron_colossus: {
    id          : 'iron_colossus',
    name        : 'Iron Colossus',
    age         : 2,
    description : 'A monument to iron-age hubris — a golem the size of a house, forged in volcanic heat, cooled in blood. The volcano built it. Now it\'s very much your problem.',
    hp          : 380,
    str         : 32,
    dex         : 3,
    xp          : 550,
    gold_min    : 300,
    gold_max    : 550,
    loot        : [{ id: 'runed_stone', chance: 0.95 }, { id: 'war_hammer', chance: 0.45 }, { id: 'iron_armor', chance: 0.3 }, { id: 'before_time_armor', chance: 0.025 }],
    respawn_min : 120,
    aggro       : false,
    is_boss     : true,
  },

  // ── Stone Age extras ──────────────────────────────────────────────────────
  cave_ancestor: {
    id          : 'cave_ancestor',
    name        : 'Cave Ancestor',
    age         : 0,
    description : 'An ancient being of stone and sinew that predates any name for it. It has been in this shrine since before your species had fire.',
    hp          : 75,
    str         : 12,
    dex         : 7,
    xp          : 75,
    gold_min    : 40,
    gold_max    : 80,
    loot        : [{ id: 'bear_pelt', chance: 0.6 }, { id: 'wolf_fang', chance: 0.4 }, { id: 'stone_axe', chance: 0.15 }],
    respawn_min : 30,
    aggro       : true,
  },
  frost_wolf: {
    id          : 'frost_wolf',
    name        : 'Frost Wolf',
    age         : 0,
    description : 'A dire wolf adapted to the frozen caves — white-furred, silent, and deeply territorial about ice.',
    hp          : 38,
    str         : 8,
    dex         : 9,
    xp          : 36,
    gold_min    : 15,
    gold_max    : 35,
    loot        : [{ id: 'wolf_pelt', chance: 0.65 }, { id: 'wolf_fang', chance: 0.4 }],
    respawn_min : 10,
    aggro       : true,
  },

  // ── Bronze Age extras ──────────────────────────────────────────────────────
  tribal_high_priest: {
    id          : 'tribal_high_priest',
    name        : 'Tribal High Priest',
    age         : 1,
    description : 'Covered head to toe in ritual markings. The staff in their hand has ended more lives than the warriors who guard them.',
    hp          : 110,
    str         : 17,
    dex         : 10,
    xp          : 130,
    gold_min    : 75,
    gold_max    : 130,
    loot        : [{ id: 'bronze_shard', chance: 0.65 }, { id: 'ancient_relic', chance: 0.3 }, { id: 'iron_spear', chance: 0.08 }],
    respawn_min : 25,
    aggro       : true,
  },

  // ── Iron Age extras ────────────────────────────────────────────────────────
  iron_sentinel: {
    id          : 'iron_sentinel',
    name        : 'Iron Sentinel',
    age         : 2,
    description : 'A watchman encased entirely in iron plate who has not left their post in forty years. The post is now wherever you are standing.',
    hp          : 165,
    str         : 26,
    dex         : 4,
    xp          : 195,
    gold_min    : 120,
    gold_max    : 200,
    loot        : [{ id: 'iron_ingot', chance: 0.7 }, { id: 'runed_stone', chance: 0.3 }, { id: 'war_hammer', chance: 0.12 }],
    respawn_min : 35,
    aggro       : false,
  },

  // ── Medieval extras ────────────────────────────────────────────────────────
  royal_lich: {
    id          : 'royal_lich',
    name        : 'Royal Lich',
    age         : 3,
    description : 'The animated remains of a king who refused death so utterly that death eventually gave him the deed to the catacombs and left.',
    hp          : 185,
    str         : 24,
    dex         : 14,
    xp          : 300,
    gold_min    : 160,
    gold_max    : 280,
    loot        : [{ id: 'elder_rune', chance: 0.7 }, { id: 'dark_crystal', chance: 0.5 }, { id: 'steel_sword', chance: 0.08 }],
    respawn_min : 45,
    aggro       : true,
  },

  // ── Secret / Explore-only monsters ────────────────────────────────────────
  cave_ghoul: {
    id          : 'cave_ghoul',
    name        : 'Cave Ghoul',
    age         : 0,
    description : 'Something that used to be human and decided it preferred the dark. Pale, fast, very upset about being disturbed.',
    hp          : 55,
    str         : 9,
    dex         : 6,
    xp          : 52,
    gold_min    : 28,
    gold_max    : 65,
    loot        : [{ id: 'rat_pelt', chance: 0.4 }, { id: 'bone_club', chance: 0.2 }],
    respawn_min : 999,
    aggro       : true,
    no_respawn  : true,
  },
  bronze_shade: {
    id          : 'bronze_shade',
    name        : 'Bronze Shade',
    age         : 1,
    description : 'The echo of a Bronze Age warrior that refuses to accept the age has ended. Semi-transparent, fully angry.',
    hp          : 100,
    str         : 16,
    dex         : 9,
    xp          : 108,
    gold_min    : 65,
    gold_max    : 115,
    loot        : [{ id: 'bronze_shard', chance: 0.6 }, { id: 'boar_tusk', chance: 0.3 }],
    respawn_min : 999,
    aggro       : true,
    no_respawn  : true,
  },
  iron_revenant: {
    id          : 'iron_revenant',
    name        : 'Iron Revenant',
    age         : 2,
    description : 'A fallen Iron Age knight reanimated by pure grudge. The armour is rusted but the hatred is freshly maintained.',
    hp          : 130,
    str         : 22,
    dex         : 10,
    xp          : 158,
    gold_min    : 95,
    gold_max    : 155,
    loot        : [{ id: 'iron_ingot', chance: 0.55 }, { id: 'runed_stone', chance: 0.25 }],
    respawn_min : 999,
    aggro       : true,
    no_respawn  : true,
  },
  shadow_stalker: {
    id          : 'shadow_stalker',
    name        : 'Shadow Stalker',
    age         : 3,
    description : 'A thing woven from the shadow between shadows. It follows very quietly and is surprised when people notice it.',
    hp          : 145,
    str         : 26,
    dex         : 16,
    xp          : 208,
    gold_min    : 138,
    gold_max    : 228,
    loot        : [{ id: 'dark_crystal', chance: 0.55 }, { id: 'elder_rune', chance: 0.2 }],
    respawn_min : 999,
    aggro       : true,
    no_respawn  : true,
  },

  // ── Medieval ───────────────────────────────────────────────────────────────
  dark_knight: {
    id          : 'dark_knight',
    name        : 'Dark Knight',
    age         : 3,
    description : 'A knight who traded their soul for power and got a fair price. The armour is black, the eyes are worse.',
    hp          : 115,
    str         : 20,
    dex         : 10,
    xp          : 155,
    gold_min    : 90,
    gold_max    : 160,
    loot        : [{ id: 'dark_crystal', chance: 0.4 }, { id: 'steel_sword', chance: 0.1 }],
    respawn_min : 18,
    aggro       : true,
  },
  wraith: {
    id          : 'wraith',
    name        : 'Wraith',
    age         : 3,
    description : 'What\'s left when grief outlasts the body. Barely visible, terrifyingly fast, and deeply resentful of the living.',
    hp          : 80,
    str         : 15,
    dex         : 16,
    xp          : 135,
    gold_min    : 70,
    gold_max    : 130,
    loot        : [{ id: 'dark_crystal', chance: 0.6 }, { id: 'elder_rune', chance: 0.15 }],
    respawn_min : 14,
    aggro       : true,
  },
  tournament_champion: {
    id          : 'tournament_champion',
    name        : 'Tournament Champion',
    age         : 3,
    description : 'Ten years undefeated. Six feet of bored, professional violence looking for a worthy opponent. They will not find one in you, but they\'ll try anyway.',
    hp          : 175,
    str         : 28,
    dex         : 8,
    xp          : 245,
    gold_min    : 150,
    gold_max    : 250,
    loot        : [{ id: 'dark_crystal', chance: 0.35 }, { id: 'battle_axe', chance: 0.14 }, { id: 'plate_armor', chance: 0.08 }],
    respawn_min : 35,
    aggro       : false,
  },
  lich_lord: {
    id          : 'lich_lord',
    name        : 'Lich Lord',
    age         : 3,
    description : 'A sorcerer who refused death so persistently that death eventually became embarrassed and left. He\'s been insufferable ever since.',
    hp          : 155,
    str         : 22,
    dex         : 12,
    xp          : 275,
    gold_min    : 140,
    gold_max    : 260,
    loot        : [{ id: 'elder_rune', chance: 0.75 }, { id: 'dark_crystal', chance: 0.5 }, { id: 'enchanted_cloak', chance: 0.1 }],
    respawn_min : 40,
    aggro       : true,
  },
  elder_dragon: {
    id          : 'elder_dragon',
    name        : 'Elder Dragon',
    age         : 3,
    description : 'Older than the world\'s current name. The scorch marks on every surface within a hundred metres suggest it has been here a while. The piles of gold confirm it is not planning to leave.',
    hp          : 580,
    str         : 42,
    dex         : 8,
    xp          : 1150,
    gold_min    : 700,
    gold_max    : 1200,
    loot        : [{ id: 'dragon_scale', chance: 0.95 }, { id: 'elder_rune', chance: 0.8 }, { id: 'battle_axe', chance: 0.5 }, { id: 'flood_blade', chance: 0.04 }, { id: 'before_time_armor', chance: 0.04 }],
    respawn_min : 180,
    aggro       : false,
    is_boss     : true,
  },
};

const ITEM_TEMPLATES = {
  // ── Stone Age weapons ──────────────────────────────────────────────────────
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
  // Pre-fire primitive items (found before fire is discovered)
  crude_log: {
    id: 'crude_log', name: 'Crude Log', type: 'weapon', slot: 'weapon',
    damage_min: 1, damage_max: 3, value: 5, age: 0,
    description: 'A heavy branch torn from a dead tree. It hits things.',
  },
  wooden_pole: {
    id: 'wooden_pole', name: 'Wooden Pole', type: 'weapon', slot: 'weapon',
    damage_min: 1, damage_max: 4, value: 8, age: 0,
    description: 'A long stripped branch. More reach than a rock. Barely.',
  },
  raw_stick: {
    id: 'raw_stick', name: 'Stick', type: 'material', value: 2, age: 0,
    description: 'A stick.',
  },
  sharp_rock: {
    id: 'sharp_rock', name: 'Sharp Rock', type: 'material', value: 3, age: 0,
    description: 'A rock with a naturally keen edge. Good for cutting. Better for stabbing.',
  },
  round_stone: {
    id: 'round_stone', name: 'Round Stone', type: 'material', value: 2, age: 0,
    description: 'Fits the palm perfectly. Good for throwing. Better for clubbing.',
  },
  // Craftable Stone Age weapons
  crude_spear: {
    id: 'crude_spear', name: 'Crude Spear', type: 'weapon', slot: 'weapon',
    damage_min: 3, damage_max: 7, value: 35, age: 0,
    description: 'A stick with a sharp rock lashed to the end. Your first real weapon.',
  },
  crude_club: {
    id: 'crude_club', name: 'Crude Club', type: 'weapon', slot: 'weapon',
    damage_min: 3, damage_max: 6, value: 30, age: 0,
    description: 'A stick with a stone wrapped in sinew. Heavy. Satisfying.',
  },
  fire_hardened_spear: {
    id: 'fire_hardened_spear', name: 'Fire-Hardened Spear', type: 'weapon', slot: 'weapon',
    damage_min: 5, damage_max: 11, value: 120, age: 0,
    description: 'The tip tempered in open flame. Doesn\'t rot. Doesn\'t bend.',
  },
  stone_hatchet: {
    id: 'stone_hatchet', name: 'Stone Hatchet', type: 'weapon', slot: 'weapon',
    damage_min: 6, damage_max: 12, value: 180, age: 0,
    description: 'A sharp rock fire-sealed onto a handle. The ancestor of every axe ever made.',
  },
  // Pre-Flood tech fragments (post-Flood remnants of the before-time, found via explore)
  old_tech_fragment: {
    id: 'old_tech_fragment', name: 'Old Tech Fragment', type: 'material', value: 150, age: 0,
    description: 'A shard of something that once hummed with power. You don\'t know what it is, but it feels important.',
  },
  machine_cog: {
    id: 'machine_cog', name: 'Machine Cog', type: 'material', value: 200, age: 0,
    description: 'A perfectly machined gear, too precise to have been made by hand. From a machine no one alive has ever seen.',
  },
  pre_flood_circuit: {
    id: 'pre_flood_circuit', name: 'Pre-Flood Circuit', type: 'material', value: 400, age: 0,
    description: 'Thin copper lines on a green board, miraculously intact. It predates everything you know.',
  },
  energy_cell_husk: {
    id: 'energy_cell_husk', name: 'Energy Cell Husk', type: 'material', value: 300, age: 0,
    description: 'A drained cylinder that once held enough energy to light a city. Completely dead. Not natural.',
  },
  assembled_device: {
    id: 'assembled_device', name: 'Assembled Device', type: 'weapon', slot: 'weapon',
    damage_min: 18, damage_max: 35, value: 0, age: 0,
    cannot_drop: true,
    description: 'You don\'t know what you made. It hums. It crackles. When you point it, things die. The old world made these.',
  },
  // Stone Age armor
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
  // Stone Age consumables
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

  // ── Iron Age weapons ───────────────────────────────────────────────────────
  iron_sword: {
    id: 'iron_sword', name: 'Iron Sword', type: 'weapon', slot: 'weapon',
    damage_min: 10, damage_max: 20, value: 450, age: 2,
    description: 'Forged iron, properly balanced. A serious weapon for serious people.',
  },
  war_hammer: {
    id: 'war_hammer', name: 'War Hammer', type: 'weapon', slot: 'weapon',
    damage_min: 13, damage_max: 25, value: 550, age: 2,
    description: 'Heavy, slow, and absolutely devastating. Armour means nothing to this.',
  },
  // Iron Age armor
  iron_armor: {
    id: 'iron_armor', name: 'Iron Armor', type: 'armor', slot: 'body',
    defense: 12, value: 450, age: 2,
    description: 'Full iron plate. Heavy as regret, protective as a mother.',
  },
  iron_helm: {
    id: 'iron_helm', name: 'Iron Helm', type: 'armor', slot: 'head',
    defense: 6, value: 220, age: 2,
    description: 'Iron dome for your skull. Dents beautifully.',
  },
  // Iron Age consumable
  health_potion: {
    id: 'health_potion', name: 'Health Potion', type: 'consumable',
    heal: 80, value: 80, age: 2,
    description: 'Red, thick, alarmingly effective. Don\'t ask what\'s in it.',
  },
  // Iron Age materials
  iron_ingot  : { id: 'iron_ingot',   name: 'Iron Ingot',   type: 'material', value: 40,  age: 2 },
  runed_stone : { id: 'runed_stone',  name: 'Runed Stone',  type: 'material', value: 120, age: 2 },

  // ── Medieval weapons ───────────────────────────────────────────────────────
  steel_sword: {
    id: 'steel_sword', name: 'Steel Sword', type: 'weapon', slot: 'weapon',
    damage_min: 15, damage_max: 28, value: 700, age: 3,
    description: 'Tempered steel with a master\'s edge. The finest blade short of magic.',
  },
  battle_axe: {
    id: 'battle_axe', name: 'Battle Axe', type: 'weapon', slot: 'weapon',
    damage_min: 17, damage_max: 32, value: 850, age: 3,
    description: 'Double-headed, horribly heavy, and absolutely magnificent.',
  },
  // Medieval armor
  plate_armor: {
    id: 'plate_armor', name: 'Plate Armor', type: 'armor', slot: 'body',
    defense: 18, value: 800, age: 3,
    description: 'Full articulated plate. You\'re basically a walking fortress now.',
  },
  enchanted_cloak: {
    id: 'enchanted_cloak', name: 'Enchanted Cloak', type: 'armor', slot: 'body',
    defense: 10, value: 600, age: 3,
    description: 'A cloak woven from shadow and spite. Lighter than iron, smarter than wood.',
  },
  // Medieval consumable
  dragon_brew: {
    id: 'dragon_brew', name: 'Dragon Brew', type: 'consumable',
    heal: 200, value: 150, age: 3,
    description: 'Distilled from dragon blood by someone with absolutely no survival instinct.',
  },
  // Medieval materials
  dark_crystal: { id: 'dark_crystal', name: 'Dark Crystal',  type: 'material', value: 180, age: 3 },
  dragon_scale : { id: 'dragon_scale', name: 'Dragon Scale',  type: 'material', value: 600, age: 3 },
  elder_rune   : { id: 'elder_rune',   name: 'Elder Rune',    type: 'material', value: 900, age: 3 },

  // ── Discovery-unlocked items ──────────────────────────────────────────────

  // Stone Age unlocks
  cooked_meat: {
    id: 'cooked_meat', name: 'Cooked Meat', type: 'consumable',
    heal: 25, value: 35, age: 0,
    description: 'Fire changed everything. Even the taste of food.',
  },
  cave_painting: {
    id: 'cave_painting', name: 'Cave Painting Fragment', type: 'material', value: 90, age: 0,
    description: 'Ochre and ash on limestone. The first story ever told.',
  },
  ancestor_relic: {
    id: 'ancestor_relic', name: 'Ancestor Relic', type: 'consumable',
    heal: 45, value: 120, age: 0,
    description: 'A carved bone fetish. Old power baked into old bone.',
  },
  clay_vessel: {
    id: 'clay_vessel', name: 'Clay Vessel', type: 'material', value: 70, age: 0,
    description: 'The first container. Civilisation began the moment humans could store things.',
  },
  stellar_chart: {
    id: 'stellar_chart', name: 'Stellar Chart', type: 'material', value: 160, age: 0,
    description: 'The sky, scratched into hide. They knew exactly where they were going.',
  },
  spirit_totem: {
    id: 'spirit_totem', name: 'Spirit Totem', type: 'consumable',
    heal: 60, value: 180, age: 0,
    description: 'The shaman carved this. It smells of old smoke and older power. Do not ask what the carvings mean.',
  },

  // Bronze Age unlocks
  bread: {
    id: 'bread', name: 'Bread', type: 'consumable',
    heal: 38, value: 40, age: 1,
    description: 'Grain plus fire plus time. Wheat became civilisation. Civilisation became wheat.',
  },
  clay_tablet: {
    id: 'clay_tablet', name: 'Clay Tablet', type: 'material', value: 110, age: 1,
    description: 'The first records. Every law, every debt, every lie — preserved in fired clay.',
  },
  foreign_coin: {
    id: 'foreign_coin', name: 'Foreign Coin', type: 'material', value: 90, age: 1,
    description: 'Minted in a city you\'ve never heard of. Worth something anyway. That\'s the point of coins.',
  },
  bronze_idol: {
    id: 'bronze_idol', name: 'Bronze Idol', type: 'material', value: 220, age: 1,
    description: 'A cast bronze god. Someone decided which god got to be cast. Power followed that decision.',
  },
  ancient_coin: {
    id: 'ancient_coin', name: 'Ancient Coin', type: 'material', value: 180, age: 1,
    description: 'Early currency. The concept of debt was born the same day as the coin.',
  },

  // Iron Age unlocks
  philosopher_scroll: {
    id: 'philosopher_scroll', name: 'Philosopher\'s Scroll', type: 'consumable',
    heal: 0, xp_bonus: 75, value: 200, age: 2,
    description: 'Dense with questions. Using it feels like thinking very hard for a very long time.',
  },
  siege_bolt: {
    id: 'siege_bolt', name: 'Siege Bolt', type: 'weapon', slot: 'weapon',
    damage_min: 16, damage_max: 28, value: 480, age: 2,
    description: 'A steel bolt designed to punch through walls. It also works on people.',
  },
  alchemical_brew: {
    id: 'alchemical_brew', name: 'Alchemical Brew', type: 'consumable',
    heal: 130, value: 140, age: 2,
    description: 'A failed attempt at immortality. Accidentally the best medicine of the age.',
  },
  empire_standard: {
    id: 'empire_standard', name: 'Empire Standard', type: 'material', value: 320, age: 2,
    description: 'A banner of conquest. The ones who flew it called it civilisation. Most people called it something else.',
  },

  // Medieval unlocks
  holy_symbol: {
    id: 'holy_symbol', name: 'Holy Symbol', type: 'armor', slot: 'body',
    defense: 9, value: 500, age: 3,
    description: 'Blessed by priests. Feared by something older. Neither of them will tell you which gods are real.',
  },
  plague_mask: {
    id: 'plague_mask', name: 'Plague Mask', type: 'armor', slot: 'head',
    defense: 11, value: 420, age: 3,
    description: 'Beak stuffed with herbs that didn\'t work. It looked terrifying. That counts for something.',
  },
  printed_pamphlet: {
    id: 'printed_pamphlet', name: 'Printed Pamphlet', type: 'consumable',
    heal: 0, xp_bonus: 100, value: 180, age: 3,
    description: 'Thousands of copies of a dangerous idea. Knowledge became unstoppable. The church was furious.',
  },
  black_powder_charge: {
    id: 'black_powder_charge', name: 'Black Powder Charge', type: 'consumable',
    heal: 0, combat_damage: 80, value: 250, age: 3,
    description: 'Alchemists searching for the elixir of life made this instead. The irony was not lost on them.',
  },
  compass: {
    id: 'compass', name: 'Compass', type: 'material', value: 280, age: 3,
    description: 'Points north. The ships pointed at every coast that didn\'t know they were coming.',
  },
  illuminati_sigil: {
    id: 'illuminati_sigil', name: 'Illuminati Sigil', type: 'material', value: 1800, age: 3,
    description: 'A symbol that shouldn\'t exist. The men who made it are unnamed. They liked it that way.',
  },

  // ── Death's weapons (owner-locked to username 'death') ────────────────────
  stone_scythe: {
    id: 'stone_scythe', name: 'Stone Scythe', type: 'weapon', slot: 'weapon',
    damage_min: 7, damage_max: 13, value: 0, age: 0,
    owner: 'death', cannot_drop: true,
    description: 'A scythe carved from obsidian. Predates the concept of farming.',
  },
  bronze_scythe: {
    id: 'bronze_scythe', name: 'Bronze Scythe', type: 'weapon', slot: 'weapon',
    damage_min: 12, damage_max: 22, value: 0, age: 1,
    owner: 'death', cannot_drop: true,
    description: 'Cast bronze, curved for a single purpose. The handle is worn smooth by ten thousand harvests.',
  },
  iron_scythe: {
    id: 'iron_scythe', name: 'Iron Scythe', type: 'weapon', slot: 'weapon',
    damage_min: 18, damage_max: 32, value: 0, age: 2,
    owner: 'death', cannot_drop: true,
    description: 'Forged iron, given a blade that curves like a last breath.',
  },
  reapers_scythe: {
    id: 'reapers_scythe', name: "The Reaper's Scythe", type: 'weapon', slot: 'weapon',
    damage_min: 30, damage_max: 55, value: 0, age: 3,
    owner: 'death', cannot_drop: true,
    description: 'The original. The one that started the whole business. It hums when it swings.',
  },
  void_pet: {
    id: 'void_pet', name: 'The Void', type: 'pet', slot: null,
    value: 0, age: 0,
    owner: 'death', cannot_drop: true,
    description: 'The Void itself, condensed into something that follows you around and occasionally heals you.',
  },

  // ── Class weapons/pets (demon + blessed) ───────────────────────────────────
  baby_zomb: {
    id: 'baby_zomb', name: 'Baby Zomb', type: 'pet', slot: null,
    value: 0, age: 0, cannot_drop: true, pvp_enabled: true,
    description: 'A tiny undead figure that trails behind you. Its hollow eyes glow faintly. Enables player combat. Reflects damage when you strike a fellow demon.',
  },
  riddl3: {
    id: 'riddl3', name: 'Riddl3', type: 'weapon', slot: 'weapon',
    damage_min: 18, damage_max: 38, value: 0, age: 0, cannot_drop: true,
    description: 'A talking sword. Nobody asked for this. It tells dark jokes during combat. The jokes are not good. The sword is.',
  },
  baby_lilly: {
    id: 'baby_lilly', name: 'Baby Lilly', type: 'pet', slot: null,
    value: 0, age: 0, cannot_drop: true, pvp_enabled: true,
    description: 'A tiny cave flower spirit. She whispers game hints and enables you to heal allies. She is very proud of you.',
  },
  throned_lilly: {
    id: 'throned_lilly', name: 'Throned Lilly', type: 'weapon', slot: 'weapon',
    damage_min: 10, damage_max: 20, value: 0, age: 0, cannot_drop: true, block_chance: 0.25,
    description: 'A flowering staff crowned with an ancient bloom. Blocks incoming attacks on a chance. Strikes harder when defending. Gentler when hunting.',
  },

  // ── Lilly's specials ────────────────────────────────────────────────────────
  lilly_flower: {
    id: 'lilly_flower', name: 'Lilly\'s Flower', type: 'pet', slot: null,
    value: 0, age: 0,
    owner: 'lillyxo', cannot_drop: true,
    description: 'A warm cave flower that has somehow survived every age and every flood. It blooms wherever Lilly goes.',
  },
  helper_staff: {
    id: 'helper_staff', name: 'Helper\'s Staff', type: 'weapon', slot: 'weapon',
    damage_min: 4, damage_max: 10, value: 0, age: 0,
    owner: 'lillyxo', cannot_drop: true,
    description: 'A gnarled walking staff covered in small handprints from a thousand ages. Lilly carved each one herself.',
  },

  // ── Mission reward items ────────────────────────────────────────────────────

  // Stone Age mission rewards
  tribal_blessing: {
    id: 'tribal_blessing', name: 'Tribal Blessing', type: 'consumable', slot: null,
    heal: 50, value: 120, age: 0,
    description: 'A carved token blessed at the communal fire. The warmth in it is real.',
  },
  spirit_ash: {
    id: 'spirit_ash', name: 'Spirit Ash', type: 'material', value: 150, age: 0,
    description: 'Ash from the sacred fire. Used in rituals older than the tribe that tends them.',
  },
  hunters_mark: {
    id: 'hunters_mark', name: "Hunter's Mark", type: 'material', value: 90, age: 0,
    description: 'A notched bone token. Marks you as someone who did what needed doing.',
  },

  // Bronze Age mission rewards
  bronze_remedy: {
    id: 'bronze_remedy', name: 'Bronze Remedy', type: 'consumable', slot: null,
    heal: 70, value: 160, age: 1,
    description: 'A Bronze Age medicine refined from ore and hard experience. Heals well.',
  },
  dark_talisman: {
    id: 'dark_talisman', name: 'Dark Talisman', type: 'consumable', slot: null,
    combat_damage: 50, value: 160, age: 1,
    description: 'An amulet charged with intent best left unexamined. Stores harm for later.',
  },
  bronze_seal: {
    id: 'bronze_seal', name: 'Bronze Seal', type: 'material', value: 200, age: 1,
    description: 'A cast bronze sigil of authority. Its origins are not discussed.',
  },

  // Iron Age mission rewards
  iron_elixir: {
    id: 'iron_elixir', name: 'Iron Elixir', type: 'consumable', slot: null,
    heal: 120, value: 220, age: 2,
    description: 'Iron-age alchemy at its finest. Heals almost everything.',
  },
  iron_mandate: {
    id: 'iron_mandate', name: 'Iron Mandate', type: 'consumable', slot: null,
    xp_bonus: 400, value: 250, age: 2,
    description: 'A writ of authority backed by iron. Study it. Understand what power looks like when used well.',
  },
  iron_curse: {
    id: 'iron_curse', name: 'Iron Curse', type: 'consumable', slot: null,
    combat_damage: 70, value: 220, age: 2,
    description: 'Forged malice. An Iron Age weapon built from concentrated grievance.',
  },

  // Medieval mission rewards
  dragons_gift: {
    id: 'dragons_gift', name: "Dragon's Gift", type: 'consumable', slot: null,
    heal: 200, value: 300, age: 3,
    description: 'A scale voluntarily given — not taken. The warmth in it is genuine and very old.',
  },
  shadow_seal: {
    id: 'shadow_seal', name: 'Shadow Seal', type: 'material', value: 350, age: 3,
    description: "A lich lord's mark. Confers access to things you haven't yet decided whether you wanted.",
  },

  ancient_remedy: {
    id: 'ancient_remedy', name: 'Ancient Remedy', type: 'consumable', slot: null,
    heal: 35, value: 80, age: 0,
    description: 'A recipe older than fire. It tastes terrible and works remarkably well.',
  },
  tainted_essence: {
    id: 'tainted_essence', name: 'Tainted Essence', type: 'consumable', slot: null,
    combat_damage: 30, value: 80, age: 0,
    description: 'Distilled from something best left unnamed. It corrodes everything it touches.',
  },
  mission_token: {
    id: 'mission_token', name: 'Mission Token', type: 'consumable', slot: null,
    xp_bonus: 200, value: 100, age: 0,
    description: 'A mark of deeds done. Study it — the memory of what you accomplished flows inward.',
  },
  blood_token: {
    id: 'blood_token', name: 'Blood Token', type: 'consumable', slot: null,
    xp_bonus: 200, value: 100, age: 0,
    description: 'A mark of choices made in darkness. Power flows from it regardless of conscience.',
  },

  // ── Flood Relics (pre-dates all ages — founder-only equippable) ─────────────
  flood_blade: {
    id: 'flood_blade', name: 'The Flood Blade', type: 'weapon', slot: 'weapon',
    damage_min: 25, damage_max: 45, value: 0, age: 0,
    founder_only: true,
    cannot_drop : true,
    description: 'Forged before the first flood. It remembers every world. Non-founders feel it resist their grip.',
  },
  before_time_armor: {
    id: 'before_time_armor', name: 'Armour of the Before-Time', type: 'armor', slot: 'body',
    defense: 25, value: 0, age: 0,
    founder_only: true,
    cannot_drop : true,
    description: 'Hammered from the bones of the old world. Pre-dates the current age. Non-founders cannot wear it.',
  },
  flood_wraith: {
    id: 'flood_wraith', name: 'Flood Wraith', type: 'pet', slot: null,
    value: 0, age: 0,
    cannot_drop : true,
    description: 'The ghost of your old Stone Age companion, following you through the reset. Loyal beyond death.',
  },
};

// World discoveries — triggered when collectiveXp crosses the threshold within that age.
// tagline: server-wide announcement. unlock: items added to explore pools / craft recipes.
const WORLD_DISCOVERIES = [
  // ── Stone Age ─────────────────────────────────────────────────────────────
  // (fire is handled separately via world.fire_discovered)
  {
    id: 'tracking', age: 0, xp: 1500, name: 'Animal Tracking',
    tagline: 'ANIMAL TRACKING: You learned to read the ground. Prey got scared. Predators got dangerous.',
    lore   : 'A tribe that can track survives winter. A tribe that can\'t feeds the wolves instead.',
    items  : ['wolf_fang', 'bear_pelt'],
  },
  {
    id: 'cooking', age: 0, xp: 3500, name: 'Cooking',
    tagline: 'COOKING: Fire met food and food won. Also: it tasted better and your brain got bigger.',
    lore   : 'Cooked food gave twice the calories. The brain that grew on cooked food invented everything else.',
    items  : ['cooked_meat'],
  },
  {
    id: 'cave_painting', age: 0, xp: 7000, name: 'Cave Painting',
    tagline: 'CAVE PAINTING: Someone drew a mammoth on the wall. The first artist. The first propaganda.',
    lore   : 'They painted what they feared and what they wanted. Often the same thing.',
    items  : ['cave_painting'],
  },
  {
    id: 'burial_rites', age: 0, xp: 12000, name: 'Burial Rites',
    tagline: 'BURIAL RITES: The first dead were buried intentionally. Someone decided they mattered after death. The first religion started here.',
    lore   : 'Flowers were found in a 60,000-year-old grave. Someone carried flowers into the dark for someone they loved.',
    items  : ['ancestor_relic'],
  },
  {
    id: 'pottery', age: 0, xp: 20000, name: 'Pottery',
    tagline: 'POTTERY: Clay shaped into containers. Civilisation begins the moment you can store more than you need.',
    lore   : 'Surplus created hierarchy. Pottery created surplus. One discovery changed everything that followed.',
    items  : ['clay_vessel'],
  },
  {
    id: 'shamanism', age: 0, xp: 30000, name: 'Shamanism',
    tagline: 'SHAMANISM: The shaman figured out that knowing which mushroom heals is power. The first professional.',
    lore   : 'They spoke to the dead and the animals and the fire. Whether those things answered is still debated.',
    items  : ['spirit_totem'],
  },
  {
    id: 'star_reading', age: 0, xp: 42000, name: 'Star Navigation',
    tagline: 'STAR NAVIGATION: You mapped the sky. The world got larger and smaller at the same time.',
    lore   : 'Every ocean crossing, every migration, every lost army that found its way home — all of it began by looking up.',
    items  : ['stellar_chart'],
  },

  // ── Bronze Age ────────────────────────────────────────────────────────────
  {
    id: 'agriculture', age: 1, xp: 2500, name: 'Agriculture',
    tagline: 'AGRICULTURE: You stopped following the food and made the food follow you. Everything got worse before it got better.',
    lore   : 'Farming was a bad deal at first — shorter lives, harder work, worse diet. But it scaled. Violence and cities came next.',
    items  : ['bread'],
  },
  {
    id: 'writing', age: 1, xp: 5000, name: 'Writing',
    tagline: 'WRITING: The first lie was written the day after writing was invented.',
    lore   : 'The first written records are grain inventories and tax rolls. Not poetry. Not philosophy. Accounting.',
    items  : ['clay_tablet'],
  },
  {
    id: 'trade_routes', age: 1, xp: 9000, name: 'Trade Routes',
    tagline: 'TRADE ROUTES: Two tribes discovered they each had what the other wanted. A third tribe figured out how to take a cut.',
    lore   : 'The Silk Road moved silk. It moved plague, religion, mathematics, and gunpowder too. Goods are the least of it.',
    items  : ['foreign_coin'],
  },
  {
    id: 'slavery', age: 1, xp: 13000, name: 'Slavery',
    tagline: 'SLAVERY: Winning a war began to mean owning the losers. The pyramids got built. The shame didn\'t go anywhere.',
    lore   : 'Every great monument of the ancient world was built on this. The historians who wrote about those monuments often owned slaves.',
    items  : [],
  },
  {
    id: 'organized_religion', age: 1, xp: 17000, name: 'Organised Religion',
    tagline: 'ORGANISED RELIGION: The priest figured out the chief needed them more than the other way around.',
    lore   : 'The gods got names and rules and taxes. The priests got palaces. This arrangement has proved remarkably durable.',
    items  : ['bronze_idol'],
  },
  {
    id: 'mathematics', age: 1, xp: 21000, name: 'Mathematics',
    tagline: 'MATHEMATICS: Someone counted past ten and didn\'t stop. The universe became predictable. The accountants rejoiced.',
    lore   : 'Zero was invented by people who needed to write down debt. The concept of nothing came from the concept of owing.',
    items  : [],
  },
  {
    id: 'currency', age: 1, xp: 24000, name: 'Currency',
    tagline: 'CURRENCY: Shiny metal became worth food. The concept of debt arrived at the same moment. Coincidence.',
    lore   : 'The first coins were minted by states so soldiers could be paid and taxed. Banks were five centuries away. Greed arrived immediately.',
    items  : ['ancient_coin'],
  },

  // ── Iron Age ──────────────────────────────────────────────────────────────
  {
    id: 'philosophy', age: 2, xp: 4000, name: 'Philosophy',
    tagline: 'PHILOSOPHY: Someone asked "why?" and refused to stop. Most of them got executed eventually.',
    lore   : 'Socrates asked too many questions and got poisoned for it. The questions survived. The poison didn\'t.',
    items  : ['philosopher_scroll'],
  },
  {
    id: 'democracy', age: 2, xp: 10000, name: 'Democracy',
    tagline: 'DEMOCRACY: The radical idea that people should have a say. Ten percent of people got a say. Progress.',
    lore   : 'Athens invented democracy and simultaneously ran on slave labour. The Athenians did not see the contradiction.',
    items  : [],
  },
  {
    id: 'siege_engines', age: 2, xp: 18000, name: 'Siege Engines',
    tagline: 'SIEGE ENGINES: Walls were built to keep people out. Then someone invented ways through walls. Then bigger walls.',
    lore   : 'The catapult was invented before concrete. Humanity built better weapons than buildings for most of history.',
    items  : ['siege_bolt'],
  },
  {
    id: 'engineering', age: 2, xp: 30000, name: 'Engineering',
    tagline: 'ENGINEERING: Roads. Aqueducts. Underfloor heating. Rome had it. Half the world was still in caves.',
    lore   : 'Roman concrete survived two thousand years of seawater. We lost the recipe for three hundred years. Lost it.',
    items  : ['empire_standard'],
  },
  {
    id: 'alchemy', age: 2, xp: 50000, name: 'Alchemy',
    tagline: 'ALCHEMY: Failed attempts to turn lead into gold accidentally invented medicine, chemistry, and gunpowder.',
    lore   : 'The alchemists weren\'t wrong that matter transforms. They were wrong about gold. But what they found was more valuable.',
    items  : ['alchemical_brew'],
  },
  {
    id: 'empire', age: 2, xp: 68000, name: 'Empire',
    tagline: 'EMPIRE: One city decided it deserved to be in charge of all the other cities. Sometimes they were right.',
    lore   : 'Every empire believed it was the last one. Every empire believed it was different. None of them were.',
    items  : [],
  },

  // ── Medieval ─────────────────────────────────────────────────────────────
  {
    id: 'the_church', age: 3, xp: 8000, name: 'The Church',
    tagline: 'THE CHURCH: One institution held a monopoly on truth, literacy, and the afterlife for a thousand years.',
    lore   : 'They built the universities that eventually destroyed their authority. An institution that digs its own grave using its greatest achievement.',
    items  : ['holy_symbol'],
  },
  {
    id: 'black_death', age: 3, xp: 20000, name: 'The Black Death',
    tagline: 'THE BLACK DEATH: A third of Europe died. The survivors got higher wages. Progress is complicated.',
    lore   : 'The plague broke feudalism. The dead left land empty. The living could leave. The lords had no answer for a pathogen.',
    items  : ['plague_mask'],
  },
  {
    id: 'banking', age: 3, xp: 40000, name: 'Banking',
    tagline: 'BANKING: The Medici figured out how to make money by lending money. God was furious. The Medici were fine.',
    lore   : 'The Medici bank invented the letter of credit. You could move wealth across continents without moving gold. Power became abstract.',
    items  : ['ancient_coin'],
  },
  {
    id: 'printing_press', age: 3, xp: 65000, name: 'The Printing Press',
    tagline: 'THE PRINTING PRESS: One machine ended the Church\'s monopoly on information. The Church was not happy.',
    lore   : 'Within fifty years of Gutenberg, heresy became unstoppable. You cannot unprint an idea. The Church learned this too late.',
    items  : ['printed_pamphlet'],
  },
  {
    id: 'gunpowder', age: 3, xp: 95000, name: 'Gunpowder',
    tagline: 'GUNPOWDER: Invented by alchemists looking for immortality. Used immediately to kill people. The irony was complete.',
    lore   : 'The first gun was a bamboo tube. Within two centuries it ended the age of knights, castles, and everything the church had built its power on.',
    items  : ['black_powder_charge'],
  },
  {
    id: 'secret_societies', age: 3, xp: 140000, name: 'Secret Societies',
    tagline: 'SECRET SOCIETIES: Power stopped being held publicly. The real decisions moved to rooms without windows.',
    lore   : 'The Freemasons built the government buildings. The Rosicrucians drew the maps. Coincidence is for people who haven\'t done the reading.',
    items  : ['illuminati_sigil'],
  },
  {
    id: 'navigation', age: 3, xp: 180000, name: 'Age of Navigation',
    tagline: 'AGE OF NAVIGATION: The compass pointed north. The ships pointed at every coast that didn\'t know they were coming.',
    lore   : 'Discovery is what the discoverers called it. The people already there had a different word. Several, actually.',
    items  : ['compass'],
  },
];

// Playable races — stat modifiers applied on character creation
const RACES = {
  homo_sapien: {
    name   : 'Homo Sapien',
    tagline: 'The dominant species. Adaptable, stubborn, and occasionally brilliant.',
    lore   : 'Survived because they cooperated. Then invented bureaucracy. Still here somehow.',
    str: 0, dex: 0, con: 0, hp_bonus: 0,
  },
  neanderthal: {
    name   : 'Neanderthal',
    tagline: 'Stronger than any sapien. Supposedly extinct. Reportedly.',
    lore   : 'Larger brain than humans. Better cold adaptation. Gone before the flood. History is unkind to the strong.',
    str: 3, dex: -2, con: 2, hp_bonus: 10,
  },
  nomad: {
    name   : 'Nomad',
    tagline: 'Twelve thousand years of running from everything made your bloodline fast.',
    lore   : 'No permanent home. Maximum range. The ones who found every coast first. The ones who named them, too.',
    str: -1, dex: 3, con: 0, hp_bonus: 0,
  },
  stone_elder: {
    name   : 'Stone Elder',
    tagline: 'From the oldest line. Hard as the caves that made them. Older than fire.',
    lore   : 'They were here before fire. They remember things no one else does. Whether that is useful is another question.',
    str: 1, dex: -2, con: 4, hp_bonus: 15,
  },
  wanderer: {
    name   : 'Wanderer',
    tagline: 'No tribe. No roots. Absolute survival instinct.',
    lore   : 'Followed megafauna across three continents and watched every one go extinct. Still here. Still walking.',
    str: 1, dex: 2, con: 0, hp_bonus: 0,
  },
  titan_kin: {
    name   : 'Titan Kin',
    tagline: 'Something very large in your family tree. Very old. Very angry.',
    lore   : 'Every mythology in every age has giants. Something put them there. Your bloodline suggests it was not fiction.',
    str: 4, dex: -3, con: 2, hp_bonus: 5,
  },
  undead: {
    name   : 'Undead',
    tagline: 'The cycle does not apply to you. Nothing does.',
    lore   : 'Beyond death. The body is a tool. The mind is what endures. Zomb\'s kind.',
    str: 8, dex: 4, con: 6, hp_bonus: 40,
  },
};

// Sex — minor bonus on one stat
const SEXES = {
  male      : { name: 'Male',       str: 1, dex: 0, con: 0 },
  female    : { name: 'Female',     str: 0, dex: 1, con: 0 },
  nonbinary : { name: 'Non-Binary', str: 0, dex: 0, con: 1 },
};

module.exports = { AGES, MONSTER_TEMPLATES, ITEM_TEMPLATES, WORLD_DISCOVERIES, RACES, SEXES };
