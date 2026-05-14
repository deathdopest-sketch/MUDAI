'use strict';

const ROOMS = {
  cave_mouth: {
    id               : 'cave_mouth',
    name             : 'Cave Mouth',
    age_min          : 0,
    description      : 'A gaping opening in a towering cliff face. The reek of damp stone and old bones drifts from within. Crude scratches on the walls — someone was here before you and they were not happy about it.',
    exits            : { north: 'bone_forest', east: 'mud_flats', down: 'dark_caves', west: 'ancient_ruins' },
    safe             : true,
    danger           : 0,
    monster_templates: [],
    max_monsters     : 0,
    ambient          : [
      'Wind howls through the cave opening.',
      'You hear distant growling from below.',
      'Something moves in the shadows deeper in.',
    ],
  },

  bone_forest: {
    id               : 'bone_forest',
    name             : 'Bone Forest',
    age_min          : 0,
    description      : 'A twisted forest of pale, dead trees — their branches bare and bleached white as bone. The undergrowth crunches underfoot. Predator sounds echo from every direction.',
    exits            : { south: 'cave_mouth', east: 'mammoth_plains', west: 'rocky_ridge' },
    safe             : false,
    danger           : 1,
    monster_templates: ['cave_rat', 'dire_wolf'],
    max_monsters     : 4,
    ambient          : [
      'A branch snaps somewhere nearby.',
      'Something watches you from the treeline.',
      'You hear a low growl to the west.',
    ],
  },

  mammoth_plains: {
    id               : 'mammoth_plains',
    name             : 'Mammoth Plains',
    age_min          : 0,
    description      : 'Vast open grassland scarred by enormous hooves. In the distance, woolly mammoths graze — or they were. Now they\'re looking at you. The ground trembles with each step they take.',
    exits            : { west: 'bone_forest', south: 'mud_flats', east: 'crystal_cavern' },
    safe             : false,
    danger           : 3,
    monster_templates: ['dire_wolf', 'woolly_mammoth'],
    max_monsters     : 3,
    ambient          : [
      'The earth trembles under distant footsteps.',
      'A mammoth calls out — low and thunderous.',
      'The grass ripples as something large moves through it.',
    ],
  },

  mud_flats: {
    id               : 'mud_flats',
    name             : 'Mud Flats',
    age_min          : 0,
    description      : 'Thick, sucking mud stretches as far as you can see. Your feet sink with every step. Things move beneath the surface and you make an active decision not to investigate further.',
    exits            : { north: 'mammoth_plains', west: 'cave_mouth', east: 'ash_fields' },
    safe             : false,
    danger           : 2,
    monster_templates: ['cave_rat', 'dire_wolf'],
    max_monsters     : 3,
    ambient          : [
      'Something bubbles in the mud beside you.',
      'Your footsteps make an awful squelching sound.',
      'The bog reeks of sulphur and rot.',
    ],
  },

  ash_fields: {
    id               : 'ash_fields',
    name             : 'Ash Fields',
    age_min          : 0,
    description      : 'A grey wasteland of volcanic ash. The ground is warm underfoot. Nothing grows here. On the horizon, a volcano belches a lazy plume of smoke as though it couldn\'t care less.',
    exits            : { west: 'mud_flats', north: 'bronze_plains' },
    safe             : false,
    danger           : 2,
    monster_templates: ['cave_rat', 'cave_bear'],
    max_monsters     : 2,
    ambient          : [
      'Ash drifts down like grey snow.',
      'The volcano rumbles in the distance.',
      'The ground crunches under a thin crust of cooled lava.',
    ],
  },

  rocky_ridge: {
    id               : 'rocky_ridge',
    name             : 'Rocky Ridge',
    age_min          : 0,
    description      : 'A high ridge of jagged rocks with a commanding view of the surrounding land. From here you can see the plains, the forest, and what is very clearly a cave bear den. You\'re already regretting coming up here.',
    exits            : { east: 'bone_forest', north: 'ancient_shrine' },
    safe             : false,
    danger           : 2,
    monster_templates: ['cave_bear'],
    max_monsters     : 2,
    ambient          : [
      'Wind screams across the ridge.',
      'You spot movement far below on the plains.',
      'A cave bear growls somewhere very close.',
    ],
  },

  dark_caves: {
    id               : 'dark_caves',
    name             : 'Dark Caves',
    age_min          : 0,
    description      : 'Absolute darkness broken only by faint luminescent moss on the walls. The tunnels branch and split everywhere. You hear dripping water and something else that definitely isn\'t water.',
    exits            : { up: 'cave_mouth', north: 'underground_river', west: 'frozen_caves' },
    safe             : false,
    danger           : 2,
    monster_templates: ['cave_rat', 'cave_bear'],
    max_monsters     : 4,
    ambient          : [
      'Water drips steadily in the darkness.',
      'Something skitters across the ceiling above you.',
      'Your own breathing sounds very loud down here.',
    ],
  },

  underground_river: {
    id               : 'underground_river',
    name             : 'Underground River',
    age_min          : 0,
    description      : 'A fast-moving underground river cuts through solid rock. The water is crystal clear and bone cold. Strange white fish dart through the current. The roar of the water masks everything — that should scare you more than it does.',
    exits            : { south: 'dark_caves', east: 'crystal_cavern' },
    safe             : false,
    danger           : 3,
    monster_templates: ['cave_bear', 'dire_wolf'],
    max_monsters     : 3,
    ambient          : [
      'The river roars past at terrifying speed.',
      'Something surfaces briefly in the water, then disappears.',
      'The current tugs at your ankles.',
    ],
  },

  crystal_cavern: {
    id               : 'crystal_cavern',
    name             : 'Crystal Cavern',
    age_min          : 0,
    description      : 'A vast underground chamber filled with enormous crystal formations. They catch the bioluminescent light and scatter it everywhere — genuinely beautiful. The Woolly Mammoth that lairs here has absolutely no appreciation for aesthetics.',
    exits            : { west: 'underground_river', north: 'mammoth_plains' },
    safe             : false,
    danger           : 4,
    monster_templates: ['woolly_mammoth', 'cave_bear'],
    max_monsters     : 2,
    is_boss_room     : true,
    ambient          : [
      'The crystals hum faintly.',
      'The ground shakes — something massive is close.',
      'A tusk-mark has gouged a crystal formation in half.',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // BRONZE AGE ROOMS (age_min: 1 — locked until world advances)
  // ═══════════════════════════════════════════════════════════════════════════

  ancient_ruins: {
    id               : 'ancient_ruins',
    name             : 'Ancient Ruins',
    age_min          : 1,
    description      : 'Crumbling stone columns and half-buried walls stretch in every direction. Whatever civilisation built this was impressive — right up until it wasn\'t. A merchant has set up a stall among the rubble, unbothered by the irony.',
    exits            : { east: 'cave_mouth', north: 'bronze_plains', west: 'bronze_forge' },
    safe             : true,
    danger           : 0,
    monster_templates: [],
    max_monsters     : 0,
    has_shop         : true,
    ambient          : [
      'Wind moves through the broken columns.',
      'Carved glyphs cover every surface, none of them good news.',
      'The merchant polishes a bronze sword and says nothing.',
    ],
  },

  bronze_plains: {
    id               : 'bronze_plains',
    name             : 'Bronze Plains',
    age_min          : 1,
    description      : 'Open plains that have seen countless battles. The grass is stained brown in places. Tribal banners dot the horizon, and war boars root through the earth looking for something to gore.',
    exits            : { south: 'ancient_ruins', east: 'tribal_village', north: 'guardian_gate' },
    safe             : false,
    danger           : 2,
    monster_templates: ['war_boar', 'tribal_warrior'],
    max_monsters     : 4,
    ambient          : [
      'War drums echo in the distance.',
      'A war boar charges past, ignoring you entirely. That\'s fine.',
      'Smoke rises from a tribal encampment to the east.',
    ],
  },

  bronze_forge: {
    id               : 'bronze_forge',
    name             : 'The Bronze Forge',
    age_min          : 1,
    description      : 'A vast underground forge where golems were once constructed. The furnaces still burn with an eerie green flame. Half-finished bronze constructs stand in silent rows, and some of them are not as finished as you\'d like.',
    exits            : { east: 'ancient_ruins' },
    safe             : false,
    danger           : 3,
    monster_templates: ['bronze_golem'],
    max_monsters     : 3,
    ambient          : [
      'The green flames roar and subside rhythmically.',
      'A golem\'s head slowly turns to track your movement.',
      'The heat is extraordinary. Your hide tunic is not loving this.',
    ],
  },

  tribal_village: {
    id               : 'tribal_village',
    name             : 'Tribal Village',
    age_min          : 1,
    description      : 'A fortified settlement of bone and timber. Warriors patrol every entrance. This is absolutely not a welcoming place for outsiders, and every face here confirms it. The smart play is to fight your way through. There is no smart play.',
    exits            : { west: 'bronze_plains', north: 'cursed_temple' },
    safe             : false,
    danger           : 3,
    monster_templates: ['tribal_warrior', 'war_boar'],
    max_monsters     : 5,
    ambient          : [
      'Chanting starts up somewhere deep in the village.',
      'A warrior draws their spear and watches you carefully.',
      'Children peer at you from behind a fence. Then run.',
    ],
  },

  guardian_gate: {
    id               : 'guardian_gate',
    name             : 'The Guardian Gate',
    age_min          : 1,
    description      : 'A titanic stone archway carved with the faces of ancient gods — all of them grimacing. The Ancient Guardian stands motionless at its centre, a colossal armoured figure that has not moved in ten thousand years. It is about to move.',
    exits            : { south: 'bronze_plains', north: 'iron_crossroads' },
    safe             : false,
    danger           : 5,
    monster_templates: ['ancient_guardian', 'bronze_golem'],
    max_monsters     : 2,
    is_boss_room     : true,
    ambient          : [
      'The carved faces seem to be watching you.',
      'The Guardian\'s armour hums faintly — some ancient power charging.',
      'The temperature drops noticeably. Your breath fogs.',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // IRON AGE ROOMS (age_min: 2 — locked until world advances to Iron Age)
  // ═══════════════════════════════════════════════════════════════════════════

  iron_crossroads: {
    id               : 'iron_crossroads',
    name             : 'The Iron Crossroads',
    age_min          : 2,
    description      : 'A wide junction where four roads of hammered iron slag meet. A lone merchant has set up shop at the centre, seemingly unaware of or unconcerned by the war happening in every direction. Smart woman.',
    exits            : { south: 'guardian_gate', east: 'iron_mines', west: 'battlefield_scarred', north: 'iron_fortress' },
    safe             : true,
    danger           : 0,
    monster_templates: [],
    max_monsters     : 0,
    has_shop         : true,
    ambient          : [
      'Distant war horns echo across the slag fields.',
      'The merchant sharpens an iron blade without looking up.',
      'A riderless horse gallops past from the direction of the battlefield.',
    ],
  },

  iron_mines: {
    id               : 'iron_mines',
    name             : 'The Iron Mines',
    age_min          : 2,
    description      : 'Massive tunnels carved by iron tools into the mountainside. The ore veins still run deep but something else runs deeper — iron wolves that have been down here so long they\'ve gone feral in a new and terrifying direction.',
    exits            : { west: 'iron_crossroads', north: 'iron_watchtower' },
    safe             : false,
    danger           : 2,
    monster_templates: ['iron_wolf', 'iron_warrior'],
    max_monsters     : 4,
    ambient          : [
      'Iron ore glistens in the tunnel walls.',
      'A distant howl echoes through the shafts.',
      'You hear the clang of metal somewhere far below.',
    ],
  },

  battlefield_scarred: {
    id               : 'battlefield_scarred',
    name             : 'The Scarred Battlefield',
    age_min          : 2,
    description      : 'A plain of churned mud and broken iron. Weapons rust where they fell. The battle here ended years ago but nobody told the warriors who keep showing up — iron-clad, enraged, and looking for a fight they never finished.',
    exits            : { east: 'iron_crossroads', north: 'iron_fortress' },
    safe             : false,
    danger           : 3,
    monster_templates: ['iron_warrior', 'iron_knight'],
    max_monsters     : 5,
    ambient          : [
      'Broken shields litter the ground for as far as you can see.',
      'An iron warrior rises slowly from the mud ahead of you.',
      'The wind carries the sound of clashing blades from the north.',
    ],
  },

  iron_fortress: {
    id               : 'iron_fortress',
    name             : 'The Iron Fortress',
    age_min          : 2,
    description      : 'A colossal fortress of iron and volcanic stone. The gates stand open because nothing outside is a threat to what\'s inside. Iron knights patrol every wall with the unhurried confidence of creatures that have never lost.',
    exits            : { south: 'battlefield_scarred', east: 'volcano_heart', north: 'castle_courtyard' },
    safe             : false,
    danger           : 4,
    monster_templates: ['iron_knight', 'iron_warrior'],
    max_monsters     : 4,
    ambient          : [
      'Iron boots ring against stone floors in the halls above.',
      'A knight pauses and stares at you from the battlements.',
      'The forge inside roars to life — something new is being made.',
    ],
  },

  volcano_heart: {
    id               : 'volcano_heart',
    name             : 'Heart of the Volcano',
    age_min          : 2,
    description      : 'The caldera interior where the Iron Colossus was born. Magma rivers glow orange in carved channels. The Colossus stands in the centre like a monument to the terrible idea of making something that big out of iron.',
    exits            : { west: 'iron_fortress' },
    safe             : false,
    danger           : 5,
    monster_templates: ['iron_colossus', 'iron_knight'],
    max_monsters     : 2,
    is_boss_room     : true,
    ambient          : [
      'Magma hisses and pops in the channels around you.',
      'The ground trembles underfoot. Something is moving.',
      'The heat is almost unbearable. Almost.',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MEDIEVAL ROOMS (age_min: 3 — locked until world advances to Medieval)
  // ═══════════════════════════════════════════════════════════════════════════

  castle_courtyard: {
    id               : 'castle_courtyard',
    name             : 'Castle Courtyard',
    age_min          : 3,
    description      : 'The fortified courtyard of an ancient castle. Pennants hang tattered from the towers. A quartermaster sits at a table near the gate, apparently doing inventory during what looks very much like an active crisis.',
    exits            : { south: 'iron_fortress', east: 'tournament_arena', west: 'haunted_woods', north: 'dragons_lair' },
    safe             : true,
    danger           : 0,
    monster_templates: [],
    max_monsters     : 0,
    has_shop         : true,
    ambient          : [
      'Ravens circle the tallest tower.',
      'A herald tries to announce something but gives up halfway through.',
      'The drawbridge creaks in the wind.',
    ],
  },

  haunted_woods: {
    id               : 'haunted_woods',
    name             : 'The Haunted Woods',
    age_min          : 3,
    description      : 'Ancient forest where the trees bleed shadow instead of sap. Dark knights patrol between the trunks and wraiths drift silently through the canopy. The forest remembers every person who ever died here. That\'s quite a few.',
    exits            : { east: 'castle_courtyard', north: 'undead_catacombs' },
    safe             : false,
    danger           : 3,
    monster_templates: ['dark_knight', 'wraith'],
    max_monsters     : 4,
    ambient          : [
      'A branch cracks somewhere in the darkness ahead.',
      'A wraith drifts past between the trees, ignoring you for now.',
      'Cold spots move through the air — spirits brushing past.',
    ],
  },

  tournament_arena: {
    id               : 'tournament_arena',
    name             : 'The Tournament Arena',
    age_min          : 3,
    description      : 'A grand circular arena still packed with the bones of audiences long dead. The Tournament Champions train here endlessly — win or lose, they never leave. Some haven\'t left in centuries. They\'re very good now.',
    exits            : { west: 'castle_courtyard' },
    safe             : false,
    danger           : 3,
    monster_templates: ['tournament_champion', 'dark_knight'],
    max_monsters     : 3,
    ambient          : [
      'The crowd bones rattle faintly in an invisible wind.',
      'A champion stands at the arena centre, waiting.',
      'Steel rings against steel somewhere in the practice corridors.',
    ],
  },

  undead_catacombs: {
    id               : 'undead_catacombs',
    name             : 'The Undead Catacombs',
    age_min          : 3,
    description      : 'Miles of tunnels beneath the castle, every wall lined with the dead. Most stay dead. Some don\'t. The Lich Lords who rule here have arranged the bones with disturbing artistic intent — they\'ve had centuries to get it right.',
    exits            : { south: 'haunted_woods', east: 'royal_crypts' },
    safe             : false,
    danger           : 4,
    monster_templates: ['lich_lord', 'wraith'],
    max_monsters     : 4,
    ambient          : [
      'Candles burn with green flame in the skull-lined niches.',
      'A lich lord gestures slowly in a corridor ahead — ritual or greeting, unclear.',
      'The temperature is absolute zero in all the ways that matter.',
    ],
  },

  dragons_lair: {
    id               : 'dragons_lair',
    name             : 'The Dragon\'s Lair',
    age_min          : 3,
    description      : 'A vast cavern filled floor to ceiling with gold coins, jewels, bones, and the smell of something that breathes fire. The Elder Dragon is coiled at the centre of its hoard, one enormous eye already open. It knew you were coming.',
    exits            : { south: 'castle_courtyard' },
    safe             : false,
    danger           : 5,
    monster_templates: ['elder_dragon', 'lich_lord'],
    max_monsters     : 2,
    is_boss_room     : true,
    ambient          : [
      'Gold coins shift and cascade as the dragon shifts its weight.',
      'One eye opens. It has been watching you since you entered.',
      'The air shimmers with residual heat and something older than fire.',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // EXTRA STONE AGE ROOMS
  // ═══════════════════════════════════════════════════════════════════════════

  ancient_shrine: {
    id               : 'ancient_shrine',
    name             : 'The Ancient Shrine',
    age_min          : 0,
    description      : 'A hidden altar carved from a single block of black rock, older than the cave system around it. Offerings of bone and ash sit undisturbed on every surface. Whatever was worshipped here was not worshipped by anything human.',
    exits            : { south: 'rocky_ridge' },
    safe             : false,
    danger           : 3,
    monster_templates: ['cave_ancestor'],
    max_monsters     : 2,
    ambient          : [
      'The offerings on the altar shift slightly, though there is no wind.',
      'A deep resonance emanates from the black stone. Not quite a sound.',
      'You feel observed in the way prey feels observed.',
    ],
  },

  frozen_caves: {
    id               : 'frozen_caves',
    name             : 'The Frozen Caves',
    age_min          : 0,
    description      : 'A side passage from the dark caves that drops ten degrees in temperature. Ice formations cover every wall in branching crystalline patterns. The cold is not natural — it started somewhere deeper and hasn\'t stopped.',
    exits            : { east: 'dark_caves' },
    safe             : false,
    danger           : 3,
    monster_templates: ['frost_wolf', 'cave_bear'],
    max_monsters     : 4,
    ambient          : [
      'Your breath fogs immediately.',
      'Ice groans and cracks somewhere in the dark ahead.',
      'Frost wolf tracks cross the floor — recent, and large.',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // EXTRA BRONZE AGE ROOM
  // ═══════════════════════════════════════════════════════════════════════════

  cursed_temple: {
    id               : 'cursed_temple',
    name             : 'The Cursed Temple',
    age_min          : 1,
    description      : 'A temple carved into a sheer cliff face, every surface covered in warnings in languages that predate writing. The Tribal High Priests here can\'t read them either, but they\'ve intuited the general sentiment and run the place accordingly.',
    exits            : { south: 'tribal_village' },
    safe             : false,
    danger           : 4,
    monster_templates: ['tribal_high_priest'],
    max_monsters     : 3,
    ambient          : [
      'The symbols on the walls seem to rearrange when you\'re not looking directly at them.',
      'A deep rhythmic chanting starts and stops abruptly.',
      'The torches here burn an unsettling shade of green.',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // EXTRA IRON AGE ROOM
  // ═══════════════════════════════════════════════════════════════════════════

  iron_watchtower: {
    id               : 'iron_watchtower',
    name             : 'The Iron Watchtower',
    age_min          : 2,
    description      : 'A tower of solid iron rising above the mineshafts. From the top floor you can see every zone of the Iron Age spread below you — and the Iron Sentinels marching up the stairs toward you with the focused energy of people who have been waiting for exactly this.',
    exits            : { south: 'iron_mines' },
    safe             : false,
    danger           : 4,
    monster_templates: ['iron_sentinel', 'iron_knight'],
    max_monsters     : 3,
    ambient          : [
      'The iron walls groan in the wind with a sound like a trapped voice.',
      'You can see the whole Iron Age from here. It\'s mostly on fire.',
      'Heavy footsteps echo up the stairwell from below.',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // EXTRA MEDIEVAL ROOM
  // ═══════════════════════════════════════════════════════════════════════════

  royal_crypts: {
    id               : 'royal_crypts',
    name             : 'The Royal Crypts',
    age_min          : 3,
    description      : 'The sealed vaults of an ancient royal line. Every stone coffin has been opened from the inside. The Royal Lich who rules here considers this an upgrade to the previous arrangement and is not open to alternative perspectives.',
    exits            : { west: 'undead_catacombs' },
    safe             : false,
    danger           : 5,
    monster_templates: ['royal_lich', 'lich_lord'],
    max_monsters     : 3,
    ambient          : [
      'A crown rolls slowly across the floor and stops at your feet.',
      'The Royal Lich addresses you formally, by the wrong name.',
      'Coffin lids shift in their frames as something tests them from inside.',
    ],
  },
};

const STARTING_ROOM = 'cave_mouth';

module.exports = { ROOMS, STARTING_ROOM };
