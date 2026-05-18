'use strict';

// ── Bot character configs ─────────────────────────────────────────────────────

const BOT_CONFIGS = [
  {
    username  : 'lillyxo',
    charName  : 'Lilly',
    race      : 'homo_sapien',
    sex       : 'female',
    homeRoom  : 'cave_mouth',
    roamRooms : ['cave_mouth', 'bone_forest', 'mud_flats', 'mammoth_plains', 'dark_caves'],
    sayEvery  : 3 * 60_000,
    moveEvery : 8 * 60_000,
    type      : 'lilly',
  },
  {
    username  : 'zomb',
    charName  : 'Zomb',
    race      : 'neanderthal',
    sex       : 'male',
    homeRoom  : 'dark_caves',
    roamRooms : ['dark_caves', 'underground_river', 'ash_fields', 'bone_forest', 'cave_mouth'],
    sayEvery  : 4 * 60_000,
    moveEvery : 10 * 60_000,
    type      : 'zomb',
  },
];

// ── Bot dialogue ──────────────────────────────────────────────────────────────

const LILLY_IDLE = [
  "Lilly is watching, yes yes. Everyone is doing so well.",
  "The cave is warm tonight. Lilly likes warm nights. Not always warm. But tonight, yes.",
  "Lilly has been here before. Many times. This time feels different. She is choosing to believe that.",
  "This age is going well, yes yes! Ask Lilly anything — she has lived it all.",
  "The Reaper is nearby. Lilly is not afraid. She has met the Reaper before. Many times. He is dramatic.",
  "Lilly hopes everyone picks the good choices when the missions come. Just hoping, yes. Not judging.",
  "Every kill brings the world forward. Lilly knows this is strange but it is true.",
  "The flood watches. Lilly watches the flood. For now, everyone is still here. This is good.",
  "Lilly counts the sunrises. She does not say how many. The number is sad.",
  "Friend, Lilly says hello from across the world. She sees you. Yes yes.",
  "Lilly was here before the first fire. She watched someone figure it out and clapped for a very long time.",
  "The missions are important, yes. Lilly did not invent them. But she likes to think she inspired them.",
];

const LILLY_GREET = [
  "Oh! Friend is here! Lilly was just thinking about them, yes yes.",
  "Lilly sees someone arriving! She has been watching the door. Not in a strange way. Just watching.",
  "Friend! Good. Lilly had questions. Also Lilly has information. Both apply here.",
  "The wanderer arrives and Lilly's cave gets warmer. A real observation. Not a metaphor. Yes yes.",
  "Oh good, someone is here. Lilly was getting contemplative. She is much better with company.",
  "Hello hello! Lilly was hoping. Type 'ask lilly anything' and she will do her best.",
  "A new face! Or an old face. Lilly knows them either way. Welcome back to the world, yes.",
];

const ZOMB_IDLE = [
  "Zomb calculates. The probability of survival is... Zomb has stopped calculating.",
  "Every flood began with choices like the ones being made now. Data, not judgment.",
  "Progress. Zomb observes progress. Progress is a word that erases what came before it.",
  "Zomb has watched civilizations peak. They all had the same expression right before the end. Certainty.",
  "The alignment shifts. Zomb notes this without emotion. Zomb is very good at that.",
  "Weakness clusters in certain rooms. Zomb watches it. Zomb has not decided what to do about it yet.",
  "You should consider what Zomb is considering. You should probably not actually do that.",
  "Zomb was asked once if there was hope. Zomb said: define hope. The conversation ended there.",
  "Evolution. Zomb approves of evolution. It is honest about what it costs.",
  "The Reaper and Zomb disagree on methodology. They agree on outcomes. This should not be comforting.",
  "Zomb is patient. Zomb has always been patient. Patience has no cost when you have seen what Zomb has seen.",
  "There are choices coming. Zomb will be watching which ones get made.",
];

const ZOMB_GREET = [
  "New arrival. Zomb notes this. Your choices interest Zomb. Choose carefully.",
  "You are here. Zomb was expecting you. Not specifically you. But someone. Eventually.",
  "Zomb is watching. This is not a threat. It is an observation. The distinction matters to Zomb.",
  "Another one enters. Zomb calculates resource implications. They are not favorable.",
  "You survived this far. Zomb gives credit. Not enthusiasm. Credit.",
  "Zomb saw you coming. Zomb sees a lot. Some of it Zomb keeps to itself.",
  "Welcome. Zomb uses that word loosely. The world is not welcoming. But you are here now.",
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── BotManager ────────────────────────────────────────────────────────────────

class BotManager {
  constructor({ io, chars, sessions, worldState, logger }) {
    this.io       = io;
    this.chars    = chars;
    this.sessions = sessions;
    this.world    = worldState;
    this.log      = logger;
    this._bots    = new Map(); // username → bot state object
  }

  // Called by GameEngine when the real player logs in — immediately yield
  yieldFor(username) {
    const bot = this._bots.get(username.toLowerCase());
    if (bot && bot.active) this._deactivate(bot);
  }

  async init() {
    for (const cfg of BOT_CONFIGS) {
      await this._ensureChar(cfg);
      this._bots.set(cfg.username, {
        cfg,
        active    : false,
        socketId  : `bot_${cfg.username}`,
        currentRoom: cfg.homeRoom,
        greetedPlayers: new Set(),
      });
    }
  }

  start() {
    // Presence loop: activate/deactivate based on whether real player is online
    setInterval(() => this._presenceCheck(), 15_000);
    this._presenceCheck(); // run immediately

    for (const bot of this._bots.values()) {
      // Talking timer
      setInterval(() => this._maybeSay(bot), bot.cfg.sayEvery);
      // Movement timer
      setInterval(() => this._maybeMove(bot), bot.cfg.moveEvery);
      // Greet players in room
      setInterval(() => this._checkGreet(bot), 30_000);
    }
  }

  // Called by GameEngine when a player enters a room — greet them if a bot is there
  onPlayerArrive(username, roomId) {
    for (const bot of this._bots.values()) {
      if (!bot.active) continue;
      if (bot.currentRoom !== roomId) continue;
      if (username.toLowerCase() === bot.cfg.username) continue;
      const lines = bot.cfg.type === 'lilly' ? LILLY_GREET : ZOMB_GREET;
      // Small delay so it comes after the room description
      setTimeout(() => {
        const label = bot.cfg.type === 'lilly' ? '🌸' : '🧟';
        this.io.to(`room_${roomId}`).emit('feed', {
          type    : 'say',
          text    : `${label} ${bot.cfg.charName}: "${pick(lines)}"`,
          username: bot.cfg.username,
        });
      }, 1200);
      break;
    }
  }

  // ── Internal ────────────────────────────────────────────────────────────────

  _presenceCheck() {
    for (const bot of this._bots.values()) {
      const realOnline = this.sessions.isOnline(bot.cfg.username) && !this._isBotSession(bot);
      if (realOnline && bot.active) {
        // Real player logged in — bot yields gracefully
        this._deactivate(bot);
      } else if (!realOnline && !bot.active) {
        // No real player — activate bot
        this._activate(bot);
      }
    }
  }

  _isBotSession(bot) {
    const sess = this.sessions.getByUser(bot.cfg.username);
    return sess?.socketId === bot.socketId;
  }

  _activate(bot) {
    // Double-check char exists
    if (!this.chars.get(bot.cfg.username)) return;

    bot.active = true;
    bot.currentRoom = bot.cfg.homeRoom;
    this.sessions.add(bot.socketId, bot.cfg.username, bot.currentRoom);
    this.chars.update(bot.cfg.username, { room_id: bot.currentRoom });

    this.io.to(`room_${bot.currentRoom}`).emit('feed', {
      type    : 'arrive',
      text    : `${bot.cfg.charName} appears.`,
      username: bot.cfg.username,
    });
    this._broadcastWorld();
    this.log?.info(`[BotManager] ${bot.cfg.username} bot activated in ${bot.currentRoom}`);
  }

  _deactivate(bot) {
    bot.active = false;
    // Only remove if it's still our fake session (real player may have already taken over)
    if (this._isBotSession(bot)) {
      this.sessions.remove(bot.socketId);
      this.io.to(`room_${bot.currentRoom}`).emit('feed', {
        type    : 'leave',
        text    : `${bot.cfg.charName} fades out.`,
        username: bot.cfg.username,
      });
      this._broadcastWorld();
    }
    this.log?.info(`[BotManager] ${bot.cfg.username} bot deactivated`);
  }

  _maybeSay(bot) {
    if (!bot.active) return;
    const players = this._playersInRoom(bot.currentRoom);
    if (!players.length) return; // silent when alone
    const lines = bot.cfg.type === 'lilly' ? LILLY_IDLE : ZOMB_IDLE;
    const label = bot.cfg.type === 'lilly' ? '🌸' : '🧟';
    this.io.to(`room_${bot.currentRoom}`).emit('feed', {
      type    : 'say',
      text    : `${label} ${bot.cfg.charName}: "${pick(lines)}"`,
      username: bot.cfg.username,
    });
  }

  _checkGreet(bot) {
    if (!bot.active) return;
    const players = this._playersInRoom(bot.currentRoom);
    for (const p of players) {
      if (!bot.greetedPlayers.has(p)) {
        bot.greetedPlayers.add(p);
        const lines = bot.cfg.type === 'lilly' ? LILLY_GREET : ZOMB_GREET;
        const label = bot.cfg.type === 'lilly' ? '🌸' : '🧟';
        this.io.to(`room_${bot.currentRoom}`).emit('feed', {
          type    : 'say',
          text    : `${label} ${bot.cfg.charName}: "${pick(lines)}"`,
          username: bot.cfg.username,
        });
      }
    }
    // Clean up greeted set — remove players who left
    for (const u of bot.greetedPlayers) {
      const sess = this.sessions.getByUser(u);
      if (!sess || sess.roomId !== bot.currentRoom) {
        bot.greetedPlayers.delete(u);
      }
    }
  }

  _maybeMove(bot) {
    if (!bot.active) return;
    const rooms = bot.cfg.roamRooms.filter(r => r !== bot.currentRoom);
    if (!rooms.length) return;

    const oldRoom  = bot.currentRoom;
    const newRoom  = pick(rooms);

    this.io.to(`room_${oldRoom}`).emit('feed', {
      type    : 'leave',
      text    : `${bot.cfg.charName} wanders off.`,
      username: bot.cfg.username,
    });

    bot.currentRoom = newRoom;
    this.sessions.setRoom(bot.socketId, newRoom);
    this.chars.update(bot.cfg.username, { room_id: newRoom });
    bot.greetedPlayers.clear();

    this.io.to(`room_${newRoom}`).emit('feed', {
      type    : 'arrive',
      text    : `${bot.cfg.charName} drifts in.`,
      username: bot.cfg.username,
    });
    this._broadcastWorld();
  }

  _playersInRoom(roomId) {
    return this.sessions.getOnline()
      .filter(p => p.roomId === roomId && !p.username.startsWith('bot_') && !BOT_CONFIGS.some(b => b.username === p.username.toLowerCase()))
      .map(p => p.username.toLowerCase());
  }

  _broadcastWorld() {
    const online = this.sessions.getOnline().map(p => {
      const c = this.chars.get(p.username);
      return {
        username: p.username,
        name    : c?.name   || p.username,
        roomName: p.roomId,
        level   : c?.level  || 1,
      };
    });
    const pct = Math.min(100, Math.floor((this.world.collectiveXp / this.world.nextAgeAt) * 100));
    this.io.emit('world_state', {
      ageName     : this.world.ageName,
      collectiveXp: this.world.collectiveXp,
      nextAgeAt   : this.world.nextAgeAt,
      pct,
      online,
    });
  }

  async _ensureChar(cfg) {
    if (this.chars.get(cfg.username)) return;
    this.log?.info(`[BotManager] Creating character for ${cfg.username}`);
    this.chars.create(cfg.username, cfg.charName, cfg.race, cfg.sex);
  }
}

module.exports = BotManager;
