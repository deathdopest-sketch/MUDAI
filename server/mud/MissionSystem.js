'use strict';

// World alignment: -100 (pure chaos) to +100 (pure order)
// Displayed in the world state panel.

const MISSION_TEMPLATES = [
  // ── Lilly's Light Missions ────────────────────────────────────────────────
  {
    id      : 'rescue_elder',
    source  : 'lilly',
    age_min : 0,
    cost    : 30,
    offer   : 'Lilly bursts in, breathless. "Friend! There is an elder trapped in the Bone Forest — a wolf pack surrounds her. She knows things about the before-time! Please, yes yes — go?"',
    room    : 'bone_forest',
    monster : 'dire_wolf',
    monster_label: 'the dire wolf pack',
    good    : {
      text     : 'Escort the elder to safety and share her stories with everyone.',
      alignment: +12,
      item     : 'ancient_remedy',
      line     : '"You chose to protect. The elder lived. The world gets a little warmer today, yes yes."',
    },
    evil    : {
      text     : 'Take the elder\'s knowledge for yourself and leave before the wolves return.',
      alignment: -8,
      item     : 'tainted_essence',
      line     : '"Lilly understands. You needed that. But the elder waited alone in the dark for a long time."',
    },
  },
  {
    id      : 'the_fire_keeper',
    source  : 'lilly',
    age_min : 0,
    cost    : 50,
    offer   : 'Lilly\'s voice is urgent. "The tribe\'s fire is dying and something is eating the wood! A cave bear guards the last fuel cache in the Dark Caves. Without fire — you know what happens without fire."',
    room    : 'dark_caves',
    monster : 'cave_bear',
    monster_label: 'the fire-guardian cave bear',
    good    : {
      text     : 'Bring the wood back and rebuild the communal fire for everyone.',
      alignment: +15,
      item     : 'mission_token',
      line     : '"The fire burns again. You fed everyone\'s flame, not just your own. Lilly is so happy she is maybe crying. Just a little."',
    },
    evil    : {
      text     : 'Keep the best fuel for yourself and let the tribe negotiate.',
      alignment: -10,
      item     : 'blood_token',
      line     : '"Your fire burned all night. Other fires went cold. Lilly does not judge. She just counts the embers."',
    },
  },
  {
    id      : 'mammoth_migration',
    source  : 'lilly',
    age_min : 0,
    cost    : 40,
    offer   : 'Lilly points urgently. "The mammoth move through Mammoth Plains at dawn — but hunters from the dark tribe plan to spoil the hunt! If you scatter them, everyone eats. Yes yes please."',
    room    : 'mammoth_plains',
    monster : 'woolly_mammoth',
    monster_label: 'the lead mammoth',
    good    : {
      text     : 'Guide the mammoth safely past the settlement — enough for everyone.',
      alignment: +10,
      item     : 'mission_token',
      line     : '"Every tribe ate tonight because of you. Lilly knows what full children look like. She has seen this before. Thank you."',
    },
    evil    : {
      text     : 'Drive the herd toward your own tribe exclusively, cutting out the others.',
      alignment: -12,
      item     : 'blood_token',
      line     : '"Your people ate well. Other people did not. The math of who survives the next winter gets complicated now."',
    },
  },

  // ── Zomb's Dark Missions ───────────────────────────────────────────────────
  {
    id      : 'the_cleansing',
    source  : 'zomb',
    age_min : 0,
    cost    : 35,
    offer   : 'A cold voice echoes through the caves. "Zomb speaks. The weak cluster at the Mud Flats. Their presence slows evolution. Thin the herd. The strong will thank you. Maybe."',
    room    : 'mud_flats',
    monster : 'cave_rat',
    monster_label: 'the pack leader',
    good    : {
      text     : 'Protect the stragglers and lead them back to stronger ground.',
      alignment: +8,
      item     : 'ancient_remedy',
      line     : '"Zomb is... mildly disappointed. But notes the choice. Mercy is a variable Zomb has studied. Rarely useful. Occasionally not."',
    },
    evil    : {
      text     : 'Cull the weakest and claim their territory for those who remain.',
      alignment: -15,
      item     : 'tainted_essence',
      line     : '"Excellent. Zomb approves. The strong territory now belongs to the strong. Do not think too long about what you are."',
    },
  },
  {
    id      : 'ash_fields_burn',
    source  : 'zomb',
    age_min : 0,
    cost    : 45,
    offer   : 'Zomb\'s voice is flat and deliberate. "There is a shaman at the Ash Fields. She prevents the next war with old words and weak hands. Remove the obstacle. Conflict accelerates evolution. You know this."',
    room    : 'ash_fields',
    monster : 'dire_wolf',
    monster_label: 'the shaman\'s guardian wolf',
    good    : {
      text     : 'Protect the shaman and hear her warning about what the war would cost.',
      alignment: +12,
      item     : 'ancient_remedy',
      line     : '"Zomb has noted your defection. The shaman lives. The war Zomb planned is delayed. Small mercies. Small setbacks."',
    },
    evil    : {
      text     : 'Remove the guardian and let events take their course.',
      alignment: -18,
      item     : 'blood_token',
      line     : '"The shaman will not finish her warning now. The war begins on schedule. Zomb finds this satisfying in a way Zomb does not fully understand."',
    },
  },
  {
    id      : 'the_flood_seed',
    source  : 'zomb',
    age_min : 1,
    cost    : 60,
    offer   : 'Zomb. "I have located the pattern. Every flood began with a choice to let the strong devour the just. The next flood wants to begin. Crystal Cavern. Go. Choose what this world deserves."',
    room    : 'crystal_cavern',
    monster : 'ancient_guardian',
    monster_label: 'the Ancient Guardian',
    good    : {
      text     : 'Seal the flood pattern and deny the cycle its next iteration.',
      alignment: +20,
      item     : 'mission_token',
      line     : '"Zomb notes this. The flood is delayed. You are not the hero this story expects — you are the anomaly. Zomb will be watching."',
    },
    evil    : {
      text     : 'Let the pattern run. Maybe the next world will be stronger.',
      alignment: -25,
      item     : 'blood_token',
      line     : '"The flood seed is planted. The water will come when enough choices like this one accumulate. Zomb does not feel guilt. You should practice that."',
    },
  },
];

const ALIGNMENT_LABELS = [
  { min: -100, max: -70, label: 'DESCENDED INTO CHAOS', color: 'darkred'   },
  { min: -70,  max: -40, label: 'FRACTURED',             color: 'red'       },
  { min: -40,  max: -15, label: 'DARKENING',             color: 'orange'    },
  { min: -15,  max: +15, label: 'BALANCED',              color: 'gray'      },
  { min: +15,  max: +40, label: 'LEANING TOWARD ORDER',  color: 'cyan'      },
  { min: +40,  max: +70, label: 'ASCENDING',             color: 'green'     },
  { min: +70,  max: +100, label: 'APPROACHING HARMONY',  color: 'lightgreen'},
];

function getAlignmentLabel(score) {
  for (const a of ALIGNMENT_LABELS) {
    if (score >= a.min && score < a.max) return a;
  }
  return ALIGNMENT_LABELS[3];
}

class MissionSystem {
  constructor({ io, chars, spawner, gold, sessions, reaper, helper, worldState, logger }) {
    this.io         = io;
    this.chars      = chars;
    this.spawner    = spawner;
    this.gold       = gold;
    this.sessions   = sessions;
    this.reaper     = reaper;
    this.helper     = helper;
    this.world      = worldState;
    this.log        = logger;

    // active offer window
    this._offer        = null;   // current MISSION_TEMPLATE
    this._offerDeadline = 0;
    this._accepted     = new Set(); // usernames who accepted
    this._inProgress   = new Map(); // username → { mission, room }
    this._awaitingChoice = new Set(); // usernames who killed target, awaiting good/evil

    if (!this.world.alignment)       this.world.alignment = 0;
    if (!this.world.missionHistory)  this.world.missionHistory = [];
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  getAlignment() { return this.world.alignment || 0; }

  getAlignmentInfo() { return getAlignmentLabel(this.getAlignment()); }

  hasActiveOffer() { return !!this._offer && Date.now() < this._offerDeadline; }

  isAwaiting(username) { return this._awaitingChoice.has(username.toLowerCase()); }

  getCurrentMission(username) { return this._inProgress.get(username.toLowerCase()) || null; }

  offerMission() {
    if (this.hasActiveOffer()) return; // already one running

    const age   = this.world.currentAge || 0;
    const pool  = MISSION_TEMPLATES.filter(m => (m.age_min || 0) <= age);
    if (!pool.length) return;

    const mission = pool[Math.floor(Math.random() * pool.length)];
    this._offer        = mission;
    this._offerDeadline = Date.now() + 90_000; // 90 seconds to accept
    this._accepted.clear();

    const srcLabel  = mission.source === 'lilly' ? '🌸 Lilly' : '🧟 Zomb';
    const costLabel = mission.cost ? ` Costs ${mission.cost}g to join.` : '';

    this.io.emit('feed', { type: 'age_transition', text: `⚔  MISSION OFFERED by ${srcLabel}: "${mission.offer}"` });
    setTimeout(() => {
      this.io.emit('feed', { type: 'system', text: `   Type 'mission accept' within 90 seconds.${costLabel} You will be teleported when the window closes.` });
    }, 1500);

    // Clear offer after window
    setTimeout(() => this._launchMission(), 90_000);
  }

  accept(username, socket) {
    const u = username.toLowerCase();
    if (!this.hasActiveOffer()) {
      socket.emit('feed', { type: 'error', text: 'No mission is currently being offered. Wait for The Reaper to call.' });
      return;
    }
    if (this._accepted.has(u)) {
      socket.emit('feed', { type: 'info', text: 'You have already accepted this mission.' });
      return;
    }
    const cost = this._offer?.cost || 0;
    if (cost > 0 && this.gold.balance(username) < cost) {
      socket.emit('feed', { type: 'error', text: `You need ${cost}g to join this mission. You do not have enough.` });
      return;
    }
    if (cost > 0) this.gold.spend(username, cost);
    this._accepted.add(u);
    const secsLeft = Math.ceil((this._offerDeadline - Date.now()) / 1000);
    socket.emit('feed', { type: 'info', text: `You have accepted the mission. Stand by — teleporting in ~${secsLeft}s.` });
    this.io.emit('feed', { type: 'system', text: `  ${this.chars.get(username)?.name || username} joins the mission (${this._accepted.size} accepted).` });
  }

  missionStatus(socket) {
    const a = this.getAlignmentInfo();
    if (this.hasActiveOffer()) {
      const secsLeft = Math.ceil((this._offerDeadline - Date.now()) / 1000);
      socket.emit('feed', { type: 'info', text: `── Active Mission Offer ──────────────────` });
      socket.emit('feed', { type: 'info', text: `  ${this._offer.offer}` });
      socket.emit('feed', { type: 'info', text: `  Cost: ${this._offer.cost}g  |  ${this._accepted.size} accepted  |  ${secsLeft}s remaining` });
      socket.emit('feed', { type: 'info', text: `  Type 'mission accept' to join.` });
    } else {
      socket.emit('feed', { type: 'info', text: 'No mission currently offered. The Reaper chooses when.' });
    }
    socket.emit('feed', { type: 'info', text: `── World Alignment: ${a.label} (${this.world.alignment > 0 ? '+' : ''}${Math.round(this.world.alignment)}) ──` });
  }

  makeChoice(username, choice, socket) {
    const u = username.toLowerCase();
    if (!this._awaitingChoice.has(u)) {
      socket.emit('feed', { type: 'error', text: 'You have no pending mission choice. Complete a mission objective first.' });
      return;
    }
    const entry = this._inProgress.get(u);
    if (!entry) return;
    const { mission } = entry;

    const isGood = choice === 'good';
    const picked = isGood ? mission.good : mission.evil;

    // Apply alignment
    this.world.alignment = Math.max(-100, Math.min(100, (this.world.alignment || 0) + picked.alignment));
    this.world.missionHistory.push({ id: mission.id, username: u, choice, alignment: picked.alignment, ts: Date.now() });
    this.world.save?.();

    // Reward
    if (picked.item) this.chars.addItem(username, picked.item, 1);

    // AI response line
    const speakerLabel = isGood
      ? (mission.source === 'lilly' ? '🌸 Lilly' : '🧟 Zomb')
      : (mission.source === 'zomb'  ? '🧟 Zomb'  : '🌸 Lilly');

    socket.emit('feed', { type: 'info',   text: `You chose: ${picked.text}` });
    socket.emit('feed', { type: 'reaper', text: `${speakerLabel}: ${picked.line}` });
    if (picked.item) {
      const { ITEM_TEMPLATES } = require('./WorldAges');
      socket.emit('feed', { type: 'loot', text: `📦 Reward: ${ITEM_TEMPLATES[picked.item]?.name || picked.item}` });
    }

    // Announce alignment shift globally
    const newInfo = getAlignmentLabel(this.world.alignment);
    this.io.emit('feed', {
      type: 'age_transition',
      text: `⚖  ${username} completes a mission (${picked.alignment > 0 ? '+' : ''}${picked.alignment} alignment) — World now: ${newInfo.label}`,
    });

    this._awaitingChoice.delete(u);
    this._inProgress.delete(u);
    // Caller (GameEngine._cmdMission) handles char_update with proper _clientChar format
  }

  // Called by GameEngine when a player kills the mission target monster in the mission room
  checkMissionKill(username, monsterId, roomId) {
    const u = username.toLowerCase();
    const entry = this._inProgress.get(u);
    if (!entry) return false;
    if (entry.room !== roomId) return false;
    // Any kill in the mission room counts as completion trigger
    this._awaitingChoice.add(u);
    return true;
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  _launchMission() {
    const mission = this._offer;
    this._offer   = null;

    if (!this._accepted.size) {
      this.io.emit('feed', { type: 'system', text: 'The mission window closed with no takers. The Reaper shrugs.' });
      return;
    }

    this.io.emit('feed', { type: 'age_transition', text: `⚔  MISSION BEGINS — ${this._accepted.size} adventurer${this._accepted.size !== 1 ? 's' : ''} accepted the call!` });

    for (const u of this._accepted) {
      this._inProgress.set(u, { mission, room: mission.room });
      const sess = this.sessions.getByUser(u);
      if (!sess) continue;
      const sock = this.io.sockets.sockets.get(sess.socketId);
      if (!sock) continue;

      const char = this.chars.get(u);
      if (!char) continue;

      // Leave current room, join mission room
      sock.leave(`room_${char.room_id}`);
      this.chars.update(u, { room_id: mission.room });
      this.sessions.setRoom(sess.socketId, mission.room);
      sock.join(`room_${mission.room}`);

      sock.emit('feed', { type: 'age_transition', text: `⚡ You are transported to the ${mission.room.replace(/_/g, ' ')}...` });
      sock.emit('feed', { type: 'info', text: `Your objective: defeat ${mission.monster_label}. When it falls, you will face a choice.` });

      // Describe the room
      const { ROOMS } = require('./WorldMap');
      const room = ROOMS[mission.room];
      if (room) {
        sock.emit('feed', { type: 'room_name', text: `── ${room.name} ${'─'.repeat(Math.max(0, 36 - room.name.length))}` });
        sock.emit('feed', { type: 'room_desc', text: room.description });
      }
    }

    this._accepted.clear();
  }
}

module.exports = { MissionSystem, MISSION_TEMPLATES, getAlignmentLabel };
