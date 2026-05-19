'use strict';

const StoneMissions    = require('./missions/StoneMissions');
const BronzeMissions   = require('./missions/BronzeMissions');
const IronMissions     = require('./missions/IronMissions');
const MedievalMissions = require('./missions/MedievalMissions');

const ALL_MISSIONS = [...StoneMissions, ...BronzeMissions, ...IronMissions, ...MedievalMissions];
const CHAIN_MAP    = new Map(ALL_MISSIONS.map(m => [m.id, m]));

// World alignment: -100 (pure chaos) to +100 (pure order)
// Displayed in the world state panel.

const ALIGNMENT_LABELS = [
  { min: -100, max: -70,  label: 'DESCENDED INTO CHAOS', color: 'darkred'    },
  { min: -70,  max: -40,  label: 'FRACTURED',            color: 'red'        },
  { min: -40,  max: -15,  label: 'DARKENING',            color: 'orange'     },
  { min: -15,  max: +15,  label: 'BALANCED',             color: 'gray'       },
  { min: +15,  max: +40,  label: 'LEANING TOWARD ORDER', color: 'cyan'       },
  { min: +40,  max: +70,  label: 'ASCENDING',            color: 'green'      },
  { min: +70,  max: +100, label: 'APPROACHING HARMONY',  color: 'lightgreen' },
];

function getAlignmentLabel(score) {
  for (const a of ALIGNMENT_LABELS) {
    if (score >= a.min && score < a.max) return a;
  }
  return ALIGNMENT_LABELS[3];
}

class MissionSystem {
  constructor({ io, chars, spawner, gold, sessions, reaper, helper, worldState, logger }) {
    this.io       = io;
    this.chars    = chars;
    this.spawner  = spawner;
    this.gold     = gold;
    this.sessions = sessions;
    this.reaper   = reaper;
    this.helper   = helper;
    this.world    = worldState;
    this.log      = logger;

    this._offer          = null;
    this._offerDeadline  = 0;
    this._accepted       = new Set();
    this._inProgress     = new Map(); // username → { mission, room, kills }
    this._awaitingChoice = new Set();

    this._pendingTransforms = new Map(); // username → 'demon' | 'blessed'

    if (!this.world.alignment)      this.world.alignment = 0;
    if (!this.world.missionHistory) this.world.missionHistory = [];
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  getAlignment()     { return this.world.alignment || 0; }
  getAlignmentInfo() { return getAlignmentLabel(this.getAlignment()); }
  hasActiveOffer()   { return !!this._offer && Date.now() < this._offerDeadline; }
  isAwaiting(username)        { return this._awaitingChoice.has(username.toLowerCase()); }
  getCurrentMission(username) { return this._inProgress.get(username.toLowerCase()) || null; }

  offerMission() {
    if (this.hasActiveOffer()) return;

    const age  = this.world.currentAge || 0;
    // Chain followups are triggered automatically — exclude them from the random pool
    const pool = ALL_MISSIONS.filter(m => !m.is_chain_followup && (m.age_min || 0) <= age);
    if (!pool.length) return;

    const mission = pool[Math.floor(Math.random() * pool.length)];
    this._offer         = mission;
    this._offerDeadline = Date.now() + 90_000;
    this._accepted.clear();

    const srcLabel  = mission.source === 'lilly' ? '🌸 Lilly' : '🧟 Zomb';
    const costLabel = mission.cost ? ` Costs ${mission.cost}g to join.` : '';

    this.io.emit('feed', { type: 'age_transition', text: `⚔  MISSION OFFERED by ${srcLabel}: "${mission.offer}"` });
    setTimeout(() => {
      this.io.emit('feed', { type: 'system', text: `   Type 'mission accept' within 90 seconds.${costLabel} You will be teleported when the window closes.` });
    }, 1500);

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

    // Apply world alignment
    this.world.alignment = Math.max(-100, Math.min(100, (this.world.alignment || 0) + picked.alignment));
    this.world.missionHistory.push({ id: mission.id, username: u, choice, alignment: picked.alignment, ts: Date.now() });
    this.world.save?.();

    // Track per-player mission choices
    const charNow = this.chars.get(username);
    const mc = { ...(charNow?.mission_choices || { good: 0, evil: 0 }) };
    mc[choice] = (mc[choice] || 0) + 1;
    this.chars.update(username, { mission_choices: mc });

    if (picked.item) this.chars.addItem(username, picked.item, 1);

    const speakerLabel = isGood
      ? (mission.source === 'lilly' ? '🌸 Lilly' : '🧟 Zomb')
      : (mission.source === 'zomb'  ? '🧟 Zomb'  : '🌸 Lilly');

    socket.emit('feed', { type: 'info',   text: `You chose: ${picked.text}` });
    socket.emit('feed', { type: 'reaper', text: `${speakerLabel}: ${picked.line}` });
    if (picked.item) {
      const { ITEM_TEMPLATES } = require('./WorldAges');
      socket.emit('feed', { type: 'loot', text: `📦 Reward: ${ITEM_TEMPLATES[picked.item]?.name || picked.item}` });
    }

    const newInfo = getAlignmentLabel(this.world.alignment);
    this.io.emit('feed', {
      type: 'age_transition',
      text: `⚖  ${username} completes a mission (${picked.alignment > 0 ? '+' : ''}${picked.alignment} alignment) — World now: ${newInfo.label}`,
    });

    this._awaitingChoice.delete(u);
    this._inProgress.delete(u);

    // Auto-trigger chain followup mission after a short dramatic pause
    if (mission.chain_next) {
      const chainMission = CHAIN_MAP.get(mission.chain_next);
      if (chainMission) {
        setTimeout(() => this._launchChainMission(chainMission, username, socket), 6000);
      }
    }

    // Check transformation eligibility (min 3 missions, all same type, no class yet)
    const total = (mc.good || 0) + (mc.evil || 0);
    const freshChar = this.chars.get(username);
    if (total >= 3 && !freshChar?.char_class && !this._pendingTransforms.has(u)) {
      if ((mc.evil || 0) === total) {
        this._pendingTransforms.set(u, 'demon');
        setTimeout(() => {
          socket.emit('feed', { type: 'reaper', text: `🧟 Zomb: "Every choice you made was darkness. Every single one. I have been watching since the first mission. Find me — or simply type 'transform accept' when you are ready to become what you already are."` });
          socket.emit('feed', { type: 'info',   text: `  DEMON TRANSFORMATION: Lose all items, reset to Level 1. Gain massive stat boost, Baby Zomb pet, and the talking sword Riddl3.` });
        }, 2000);
      } else if ((mc.good || 0) === total) {
        this._pendingTransforms.set(u, 'blessed');
        setTimeout(() => {
          socket.emit('feed', { type: 'reaper', text: `🌸 Lilly: "You chose the light — every time. Every single one, friend. Lilly has been watching. She has something for you. Type 'transform accept' — you will not regret this, Lilly promises yes yes."` });
          socket.emit('feed', { type: 'info',   text: `  LILLY BLESSING: Keep your level and inventory. Gain Baby Lilly pet and the Throned Lilly weapon.` });
        }, 2000);
      }
    }
  }

  // Called by GameEngine when a player kills a monster
  checkMissionKill(username, monsterId, roomId) {
    const u = username.toLowerCase();
    const entry = this._inProgress.get(u);
    if (!entry) return false;
    if (entry.room !== roomId) return false;

    const needed = entry.mission.kill_count || 1;
    entry.kills  = (entry.kills || 0) + 1;

    if (entry.kills < needed) {
      const sock = this._getSocket(u);
      if (sock) {
        sock.emit('feed', { type: 'info', text: `Mission progress: ${entry.kills}/${needed} enemies defeated. Keep fighting.` });
      }
      return false;
    }

    this._awaitingChoice.add(u);
    return true;
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  _getSocket(username) {
    const sess = this.sessions.getByUser(username);
    if (!sess) return null;
    return this.io.sockets.sockets.get(sess.socketId) || null;
  }

  _teleportToMission(username, mission) {
    const u    = username.toLowerCase();
    const sess = this.sessions.getByUser(u);
    if (!sess) return;
    const sock = this.io.sockets.sockets.get(sess.socketId);
    if (!sock) return;
    const char = this.chars.get(u);
    if (!char) return;

    sock.leave(`room_${char.room_id}`);
    this.chars.update(u, { room_id: mission.room });
    this.sessions.setRoom(sess.socketId, mission.room);
    sock.join(`room_${mission.room}`);

    sock.emit('feed', { type: 'age_transition', text: `⚡ You are transported to the ${mission.room.replace(/_/g, ' ')}...` });
    sock.emit('feed', { type: 'info', text: `Your objective: defeat ${mission.monster_label}. When it falls, you will face a choice.` });

    if (mission.kill_count && mission.kill_count > 1) {
      sock.emit('feed', { type: 'info', text: `  You must defeat ${mission.kill_count} enemies before the moment of choice arrives.` });
    }

    const { ROOMS } = require('./WorldMap');
    const room = ROOMS[mission.room];
    if (room) {
      sock.emit('feed', { type: 'room_name', text: `── ${room.name} ${'─'.repeat(Math.max(0, 36 - room.name.length))}` });
      sock.emit('feed', { type: 'room_desc', text: room.description });
    }
  }

  _launchMission() {
    const mission = this._offer;
    this._offer   = null;

    if (!this._accepted.size) {
      this.io.emit('feed', { type: 'system', text: 'The mission window closed with no takers. The Reaper shrugs.' });
      return;
    }

    this.io.emit('feed', { type: 'age_transition', text: `⚔  MISSION BEGINS — ${this._accepted.size} adventurer${this._accepted.size !== 1 ? 's' : ''} accepted the call!` });

    for (const u of this._accepted) {
      this._inProgress.set(u, { mission, room: mission.room, kills: 0 });
      this._teleportToMission(u, mission);
    }

    this._accepted.clear();
  }

  _launchChainMission(mission, username, socket) {
    const u = username.toLowerCase();

    // Don't start if player is already on a mission
    if (this._inProgress.has(u)) return;

    const srcLabel = mission.source === 'lilly' ? '🌸 Lilly' : '🧟 Zomb';
    socket.emit('feed', { type: 'age_transition', text: `⚔  ${srcLabel} has more to say. A new mission begins...` });
    socket.emit('feed', { type: 'reaper',         text: `${srcLabel}: "${mission.offer}"` });

    this._inProgress.set(u, { mission, room: mission.room, kills: 0 });
    this._teleportToMission(u, mission);
  }
}

module.exports = { MissionSystem, MISSION_TEMPLATES: ALL_MISSIONS, getAlignmentLabel };
