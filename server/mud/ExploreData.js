'use strict';

// Items found before fire is discovered (raw primitives only)
const PRE_FIRE_ITEM_POOL = [
  { id: 'raw_stick',    weight: 35 },
  { id: 'round_stone',  weight: 30 },
  { id: 'sharp_rock',   weight: 25 },
  { id: 'crude_log',    weight: 20 },
  { id: 'wooden_pole',  weight: 18 },
  { id: 'wolf_fang',    weight: 10 },
  { id: 'rat_pelt',     weight: 8  },
];

// Items discoverable by explore, pooled by age_min of the room
const EXPLORE_ITEM_POOLS = {
  // Post-fire Stone Age
  0: [
    { id: 'healing_herb',      weight: 28 },
    { id: 'dried_meat',        weight: 22 },
    { id: 'cooked_meat',       weight: 15 },
    { id: 'wolf_fang',         weight: 18 },
    { id: 'bear_pelt',         weight: 14 },
    { id: 'cave_painting',     weight: 8  },
    { id: 'clay_vessel',       weight: 6  },
    { id: 'ancestor_relic',    weight: 4  },
    { id: 'spirit_totem',      weight: 2  },
    { id: 'bone_club',         weight: 6  },
    { id: 'stone_axe',         weight: 3  },
    { id: 'stellar_chart',     weight: 2  },
    { id: 'old_tech_fragment', weight: 2  },
    { id: 'machine_cog',       weight: 1  },
  ],
  // Bronze Age
  1: [
    { id: 'cave_mushroom',     weight: 28 },
    { id: 'bread',             weight: 18 },
    { id: 'boar_tusk',         weight: 22 },
    { id: 'bronze_shard',      weight: 20 },
    { id: 'clay_tablet',       weight: 10 },
    { id: 'foreign_coin',      weight: 8  },
    { id: 'bronze_idol',       weight: 5  },
    { id: 'ancient_coin',      weight: 4  },
    { id: 'bone_bracers',      weight: 14 },
    { id: 'leather_armor',     weight: 6  },
    { id: 'old_tech_fragment', weight: 3  },
    { id: 'machine_cog',       weight: 2  },
    { id: 'pre_flood_circuit', weight: 1  },
  ],
  // Iron Age
  2: [
    { id: 'health_potion',     weight: 28 },
    { id: 'alchemical_brew',   weight: 8  },
    { id: 'philosopher_scroll',weight: 6  },
    { id: 'iron_ingot',        weight: 26 },
    { id: 'runed_stone',       weight: 20 },
    { id: 'empire_standard',   weight: 5  },
    { id: 'iron_helm',         weight: 14 },
    { id: 'siege_bolt',        weight: 4  },
    { id: 'iron_sword',        weight: 4  },
    { id: 'old_tech_fragment', weight: 3  },
    { id: 'energy_cell_husk',  weight: 2  },
    { id: 'pre_flood_circuit', weight: 1  },
  ],
  // Medieval
  3: [
    { id: 'dragon_brew',           weight: 22 },
    { id: 'printed_pamphlet',      weight: 12 },
    { id: 'alchemical_brew',       weight: 10 },
    { id: 'dark_crystal',          weight: 26 },
    { id: 'elder_rune',            weight: 18 },
    { id: 'compass',               weight: 8  },
    { id: 'illuminati_sigil',      weight: 2  },
    { id: 'black_powder_charge',   weight: 6  },
    { id: 'plague_mask',           weight: 5  },
    { id: 'holy_symbol',           weight: 5  },
    { id: 'health_potion',         weight: 18 },
    { id: 'enchanted_cloak',       weight: 6  },
    { id: 'energy_cell_husk',      weight: 3  },
    { id: 'pre_flood_circuit',     weight: 2  },
  ],
};

// Secret enemy spawned during exploration, keyed by room age_min
const SECRET_ENEMIES = {
  0: 'cave_ghoul',
  1: 'bronze_shade',
  2: 'iron_revenant',
  3: 'shadow_stalker',
};

const EXPLORE_LORE = [
  'Ancient carvings in the wall depict creatures long extinct — but also machines. Metal limbs. Glass eyes. Things that should not belong here.',
  'Buried under a metre of packed dirt: a panel of smooth black glass that briefly lights up when you hold it, then dies. You have no framework for what this is.',
  'You find a length of wire — thin, coated in something that hasn\'t rotted in what must be thousands of years. The before-time made things that lasted.',
  'Scratched into a boulder in a script no one alive reads: diagrams. Wheels within wheels. Numbers. The old world was trying to teach whoever came after. You have no idea what it means yet.',
  'A metal capsule half-buried in the cave wall. Inside: a rolled document, laminated, perfectly preserved. The images show cities. Towers of glass. Flying machines. Your whole age fits inside one of those buildings.',
  'Ancient carvings in the wall depict creatures long extinct. You recognise one shape from nightmares you\'ve never had.',
  'A skeleton sits propped against the wall, hands folded neatly. Someone left them that way on purpose.',
  'Strange symbols glow faintly when you press your palm to the stone, then go dark all at once.',
  'You find footprints in the dust. Fresh ones. You are not alone in here.',
  'Something moved in the corner. When you look, nothing is there. When you stop looking, it moves again.',
  'The silence here is wrong. Something scared all the sound away and it hasn\'t come back.',
  'You notice the walls aren\'t stone. They\'re bones, packed tight and mortared with something red-brown.',
  'A perfect circle burned into the floor, scorch marks radiating outward. Old. Very old.',
  'You find a coin that predates the current age. The face on it is wearing the same expression you are.',
  'Scratched into the wall: "Do not go deeper." You are already deep.',
  'Your echo comes back wrong. There is one more footstep in it than you took.',
  'Water drips upward here for exactly three seconds, then stops.',
  'A space behind a loose stone — empty, but warm. As if something just left.',
  'The air tastes of copper and old fire. You have been here before. In a dream you don\'t remember having.',
  'Something wrote a name on the floor. It isn\'t yours. It is very close to yours.',
];

const EXPLORE_NOTHING = [
  'You search thoroughly. Nothing. Just rock, old air, and the growing sense you are being watched.',
  'The area yields nothing useful. But you feel like something noticed you looking.',
  'Nothing hidden here. Whatever was, it\'s long gone. You can feel the absence of it.',
  'Dirt, stone, and old bones. Nothing worth claiming. The Reaper would say something about that.',
  'You search carefully. The room keeps its secrets today.',
  'Empty. Thoroughly, disappointingly empty. Even the rats have standards.',
  'Nothing. Though you\'d swear the room was slightly different a moment ago.',
];

function weightedPick(pool) {
  const total = pool.reduce((s, e) => s + e.weight, 0);
  let roll = Math.random() * total;
  for (const entry of pool) {
    roll -= entry.weight;
    if (roll <= 0) return entry.id;
  }
  return pool[pool.length - 1].id;
}

function rollOutcome(danger, isSafe) {
  if (isSafe) {
    const r = Math.random();
    if (r < 0.40) return 'item';
    if (r < 0.65) return 'gold';
    if (r < 0.90) return 'lore';
    return 'nothing';
  }
  const r = Math.random();
  if (danger <= 1) {
    if (r < 0.28) return 'item';
    if (r < 0.50) return 'gold';
    if (r < 0.68) return 'enemy';
    if (r < 0.85) return 'lore';
    return 'nothing';
  }
  if (danger <= 2) {
    if (r < 0.22) return 'item';
    if (r < 0.42) return 'gold';
    if (r < 0.67) return 'enemy';
    if (r < 0.82) return 'lore';
    return 'nothing';
  }
  // danger 3+
  if (r < 0.18) return 'item';
  if (r < 0.33) return 'gold';
  if (r < 0.67) return 'enemy';
  if (r < 0.81) return 'lore';
  return 'nothing';
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

module.exports = { PRE_FIRE_ITEM_POOL, EXPLORE_ITEM_POOLS, SECRET_ENEMIES, EXPLORE_LORE, EXPLORE_NOTHING, weightedPick, rollOutcome, pick };
