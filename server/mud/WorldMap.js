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
    exits            : { east: 'bone_forest' },
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
    exits            : { up: 'cave_mouth', north: 'underground_river' },
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
    exits            : { west: 'bronze_plains' },
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
    exits            : { south: 'bronze_plains' },
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
};

const STARTING_ROOM = 'cave_mouth';

module.exports = { ROOMS, STARTING_ROOM };
