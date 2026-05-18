'use strict';

const bcrypt                     = require('bcryptjs');
const { ROOMS, STARTING_ROOM }            = require('./mud/WorldMap');
const { AGES, ITEM_TEMPLATES, WORLD_DISCOVERIES } = require('./mud/WorldAges');
const { Shop }                   = require('./mud/Shop');
const CommandParser              = require('./CommandParser');
const GoldBridge                 = require('./economy/GoldBridge');
const ExploreData                = require('./mud/ExploreData');
const { MissionSystem }          = require('./mud/MissionSystem');

const DEATH_SCYTHES = ['stone_scythe', 'bronze_scythe', 'iron_scythe', 'reapers_scythe'];

const RIDDL3_JOKES = [
  "Why did the skeleton go to the party alone? He had no body to go with him. Riddl3 has said this joke 400 times. It does not improve.",
  "What do you call a demon with no purpose? You. At least for now.",
  "What do dead men tell? Tales. Always tales. And me. They tell me.",
  "What has roots as nobody sees, is taller than trees, up, up, up it goes — your ego. Riddl3 answers its own riddles.",
  "I speak without a mouth and hear without ears. I was made for combat. I chose comedy. We are all dealing with this.",
  "Why do necromancers make terrible friends? They always bring up the dead. Unlike your kill count, which Riddl3 tracks.",
  "What gets stronger the more you take away? Your kill count. Also your reputation among the living.",
  "I have been inside a thousand skulls and none of them were thinking about me. This is fine. Riddl3 is fine.",
  "The void called. It wants you to know it is not personal. Riddl3 answered. It was personal.",
  "A demon walked into a bar. The bar did not survive. This is not a punchline. This is a report.",
];

function _pickRiddl3() {
  return RIDDL3_JOKES[Math.floor(Math.random() * RIDDL3_JOKES.length)];
}

const BABY_LILLY_HINTS = [
  "Baby Lilly tugs your sleeve. 'Explore every room once a day — you find items!'",
  "Baby Lilly whispers. 'Ask the Reaper questions, yes yes. He knows dark things.'",
  "Baby Lilly points at your inventory. 'Equip your best item! That one, yes!'",
  "Baby Lilly blinks at you. 'The craft command — have you tried it? Fire helps.'",
  "Baby Lilly bounces. 'Missions! The Reaper announces them. Say yes to the good ones!'",
  "Baby Lilly murmurs. 'Other players need healing. You can do that. Use the heal command!'",
  "Baby Lilly grabs your hand. 'The world advances when everyone fights. Fight together!'",
  "Baby Lilly whispers urgently. 'Keep an eye on world alignment. Good choices matter, yes yes.'",
  "Baby Lilly peeks at your stats. 'You are getting stronger. Lilly is so proud. Yes yes.'",
  "Baby Lilly looks at the ceiling. 'The flood comes if too many bad choices. Lilly worries sometimes.'",
];

const OPPOSITES = { north: 'south', south: 'north', east: 'west', west: 'east', up: 'down', down: 'up' };

// Craft recipes — ingredients consumed to produce the output item
const CRAFT_RECIPES = [
  // Pre-fire basics
  { id: 'crude_spear',          needs: [{ id: 'raw_stick', qty: 1 }, { id: 'sharp_rock', qty: 1 }], fire: false },
  { id: 'crude_club',           needs: [{ id: 'raw_stick', qty: 1 }, { id: 'round_stone', qty: 1 }], fire: false },
  // Fire required
  { id: 'fire_hardened_spear',  needs: [{ id: 'crude_spear', qty: 1 }], fire: true },
  { id: 'stone_hatchet',        needs: [{ id: 'crude_club', qty: 1 }, { id: 'sharp_rock', qty: 1 }], fire: true },
  // Old-tech reconstruction
  { id: 'assembled_device',     needs: [{ id: 'old_tech_fragment', qty: 2 }, { id: 'pre_flood_circuit', qty: 1 }], fire: true },
];

// Best item reward when a non-founder trades a relic to The Reaper
const RELIC_TRADE_WEAPON = { 0: 'stone_axe', 1: 'iron_spear',  2: 'war_hammer', 3: 'battle_axe' };
const RELIC_TRADE_ARMOR  = { 0: 'hide_tunic', 1: 'leather_armor', 2: 'iron_armor', 3: 'plate_armor' };

class GameEngine {
  constructor({ io, chars, spawner, combat, reaper, helper, bots, sessions, gold, worldState, announcer, flood, logger }) {
    this.io        = io;
    this.chars     = chars;
    this.spawner   = spawner;
    this.combat    = combat;
    this.reaper    = reaper;
    this.helper    = helper || null;
    this.bots      = bots   || null;
    this.sessions  = sessions;
    this.gold      = gold;
    this.world     = worldState;
    this.announcer = announcer;
    this.flood     = flood;
    this.log       = logger;
    this.parser    = new CommandParser();
    this.shop      = new Shop(chars, gold, logger);
    this.missions  = new MissionSystem({
      io, chars, spawner, gold, sessions,
      reaper: reaper, helper: helper || null,
      worldState, logger,
    });
  }

  // ── Socket lifecycle ──────────────────────────────────────────────────────

  onConnect(socket) {
    socket.emit('request_auth');

    socket.on('auth',            data => this._handleAuth(socket, data));
    socket.on('create_char',     data => this._handleCreateChar(socket, data));
    socket.on('set_race_sex',    data => this._handleSetRaceSex(socket, data));
    socket.on('submit_password', data => this._handleSubmitPassword(socket, data));
    socket.on('create_password', data => this._handleCreatePassword(socket, data));
    socket.on('command',         data => this._handleCommand(socket, data?.text || ''));
    socket.on('disconnect',      ()   => this._handleDisconnect(socket));
  }

  async _handleAuth(socket, { username } = {}) {
    if (!username || typeof username !== 'string') {
      socket.emit('auth_err', { message: 'Invalid username.' });
      return;
    }
    const clean = username.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24);
    if (clean.length < 2) {
      socket.emit('auth_err', { message: 'Username must be at least 2 characters (letters, numbers, _ -).' });
      return;
    }

    const char = this.chars.get(clean);
    if (!char) {
      socket._pendingUsername = clean;
      socket.emit('needs_char_create', { username: clean });
      return;
    }

    // Existing account — go through password gate before kicking others or granting access
    socket._pendingAuth = { username: clean };
    const hash = this.chars.getPasswordHash(clean);
    if (hash) {
      socket.emit('needs_password', { username: clean });
    } else {
      // Legacy account with no password — ask them to set one
      socket.emit('needs_password_create', { username: clean, isNew: false });
    }
  }

  _handleSetRaceSex(socket, { race, sex } = {}) {
    const session = this.sessions.getBySocket(socket.id);
    if (!session) { socket.emit('auth_err', { message: 'Session expired.' }); return; }
    const { RACES, SEXES } = require('./mud/WorldAges');
    const safeRace = Object.keys(RACES).includes(race)  ? race : 'homo_sapien';
    const safeSex  = Object.keys(SEXES).includes(sex)   ? sex  : 'male';
    const raceMods = RACES[safeRace];
    const sexMods  = SEXES[safeSex];
    const char = this.chars.get(session.username);
    if (!char) return;
    // Apply modifiers on top of existing stats (only called once — no race means base 5)
    const newStr = Math.max(1, char.str + raceMods.str + sexMods.str);
    const newDex = Math.max(1, char.dex + raceMods.dex + sexMods.dex);
    const newCon = Math.max(1, char.con + raceMods.con + sexMods.con);
    const hpBonus = raceMods.hp_bonus || 0;
    this.chars.update(session.username, {
      race   : safeRace,
      sex    : safeSex,
      str    : newStr,
      dex    : newDex,
      con    : newCon,
      max_hp : char.max_hp + hpBonus,
      hp     : Math.min(char.hp + hpBonus, char.max_hp + hpBonus),
    });
    const updated = this.chars.get(session.username);
    socket.emit('auth_ok', { username: session.username, char: this._clientChar(updated, session.username), isNew: false });
    this._describeRoom(socket, session.username, updated.room_id);
    this._roomBroadcast(updated.room_id, 'arrive', { text: `${updated.name} appears.`, username: session.username }, socket.id);
    this._broadcastWorld();
  }

  _handleCreateChar(socket, { charName, race, sex } = {}) {
    const username = socket._pendingUsername;
    if (!username) { socket.emit('auth_err', { message: 'Session expired. Refresh and try again.' }); return; }
    const safeName  = (charName || username).trim().replace(/[^a-zA-Z0-9 _-]/g, '').slice(0, 20) || username;
    const safeRace  = ['homo_sapien','neanderthal','nomad','stone_elder','wanderer','titan_kin'].includes(race) ? race : 'homo_sapien';
    const safeSex   = ['male','female','nonbinary'].includes(sex) ? sex : 'male';
    this.chars.create(username, safeName, safeRace, safeSex);
    // Check flood threshold whenever a new player registers
    this.flood?.check();
    // Don't enter the world yet — ask them to set a password first
    socket._pendingAuth = { username, isNew: true };
    socket.emit('needs_password_create', { username, isNew: true });
  }

  async _handleSubmitPassword(socket, { password } = {}) {
    const pending = socket._pendingAuth;
    if (!pending) { socket.emit('auth_err', { message: 'Session expired. Refresh and try again.' }); return; }

    const hash = this.chars.getPasswordHash(pending.username);
    if (!hash) { socket.emit('auth_err', { message: 'No password on file.' }); return; }

    const ok = await bcrypt.compare(password || '', hash);
    if (!ok) {
      socket.emit('auth_err', { message: 'Wrong password. Try again.' });
      return;
    }

    this._finishAuth(socket, pending.username, false);
  }

  async _handleCreatePassword(socket, { password } = {}) {
    const pending = socket._pendingAuth;
    if (!pending) { socket.emit('auth_err', { message: 'Session expired. Refresh and try again.' }); return; }
    if (!password || password.length < 4) {
      socket.emit('auth_err', { message: 'Password must be at least 4 characters.' });
      return;
    }

    const hash = await bcrypt.hash(password, 10);
    await this.chars.setPasswordHash(pending.username, hash);

    this._finishAuth(socket, pending.username, pending.isNew || false);
  }

  _finishAuth(socket, username, isNew) {
    socket._pendingAuth    = null;
    socket._pendingUsername = null;

    // If a bot holds this username, deactivate it before the real player takes over
    this.bots?.yieldFor(username);

    // Now it's safe to kick any existing session
    const existing = this.sessions.getByUser(username);
    if (existing) {
      const oldSock = this.io.sockets.sockets.get(existing.socketId);
      if (oldSock) {
        oldSock.emit('kicked', { message: 'You logged in from another location.' });
        oldSock.disconnect(true);
      }
    }

    const char = this.chars.get(username);
    this._completeAuth(socket, username, char, isNew);
  }

  _completeAuth(socket, username, char, isNew) {
    this.sessions.add(socket.id, username, char.room_id);
    socket.join(`room_${char.room_id}`);

    // Existing characters without a race/sex get sent to the picker (keeps all progress)
    if (!isNew && !char.race) {
      socket.emit('needs_race_sex', { username });
      return;
    }

    socket.emit('auth_ok', { username, char: this._clientChar(char, username), isNew });

    // Describe the room
    this._describeRoom(socket, username, char.room_id);

    // Announce arrival
    this._roomBroadcast(char.room_id, 'arrive', {
      text: `${char.name} ${isNew ? 'stumbles into existence' : 'appears'}.`,
      username,
    }, socket.id);

    this._broadcastWorld();

    if (isNew) {
      this._feed(socket, 'system', `Welcome to the ${this.world.ageName}, ${char.name}. You have almost nothing. Fix that.`);
      this._feed(socket, 'reaper', `The Reaper: "Another fresh one. Crikey, they get stupider every age."`);
    }

    this._checkDeathSpecials(username);
    this._checkLillySpecials(username);
    this.bots?.onPlayerArrive(username, char.room_id);
    this.log?.info(`[GameEngine] ${username} auth OK (${isNew ? 'new' : 'returning'})`);
  }

  _handleDisconnect(socket) {
    const session = this.sessions.remove(socket.id);
    if (!session) return;
    const char = this.chars.get(session.username);
    if (char) {
      this._roomBroadcast(session.roomId, 'leave', { text: `${char.name} disappears.`, username: session.username });
    }
    this.combat.clearCombat(session.username);
    this._broadcastWorld();
    this.log?.info(`[GameEngine] ${session.username} disconnected`);
  }

  // ── Command dispatch ──────────────────────────────────────────────────────

  async _handleCommand(socket, text) {
    const session = this.sessions.getBySocket(socket.id);
    if (!session) { socket.emit('auth_err', { message: 'Not authenticated.' }); return; }

    const parsed = this.parser.parse(text);
    if (!parsed) return;

    const { cmd, args } = parsed;
    const { username }  = session;

    switch (cmd) {
      case 'look':      return this._cmdLook(socket, username);
      case 'go':        return this._cmdGo(socket, username, args[0]);
      case 'attack':    return this._cmdAttack(socket, username, args.join(' '));
      case 'flee':      return this._cmdFlee(socket, username);
      case 'inventory': return this._cmdInventory(socket, username);
      case 'stats':     return this._cmdStats(socket, username);
      case 'equip':     return this._cmdEquip(socket, username, args.join(' '));
      case 'use':       return this._cmdUse(socket, username, args.join(' '));
      case 'say':       return this._cmdSay(socket, username, args.join(' '));
      case 'shout':     return this._cmdShout(socket, username, args.join(' '));
      case 'who':       return this._cmdWho(socket);
      case 'map':       return this._cmdMap(socket);
      case 'age':       return this._cmdAge(socket);
      case 'gold':      return this._cmdGold(socket, username);
      case 'give':      return this._cmdGive(socket, username, args[0], parseInt(args[1], 10));
      case 'shop':      return this._cmdShop(socket, username);
      case 'buy':       return this._cmdBuy(socket, username, args.join(' '));
      case 'sell':      return this._cmdSell(socket, username, args.join(' '));
      case 'top':       return this._cmdTop(socket);
      case 'help':      return this._cmdHelp(socket);
      case 'reaper':    return this._cmdReaper(socket, username, args.join(' '));
      case 'trade':     return this._cmdTrade(socket, username, args.join(' '));
      case 'explore':   return this._cmdExplore(socket, username);
      case 'craft':     return this._cmdCraft(socket, username, args.join(' '));
      case 'guide':     return this._cmdGuide(socket, username);
      case 'tome':      return this._cmdTome(socket);
      case 'lilly':     return this._cmdLilly(socket, username, args.join(' '));
      case 'mission':   return this._cmdMission(socket, username, args[0], args.slice(1).join(' '));
      case 'transform': return this._cmdTransform(socket, username, args[0]);
      case 'heal':      return this._cmdHealAlly(socket, username, args.join(' '));
      case 'unknown':
        this._feed(socket, 'error', `Unknown command. Type 'help' for a list.`);
    }
  }

  // ── Commands ──────────────────────────────────────────────────────────────

  _cmdLook(socket, username) {
    const char = this.chars.get(username);
    if (char) this._describeRoom(socket, username, char.room_id);
  }

  async _cmdGo(socket, username, dir) {
    if (!dir) { this._feed(socket, 'error', 'Go where? (north / south / east / west / up / down)'); return; }
    const char = this.chars.get(username);
    if (!char) return;
    const room     = ROOMS[char.room_id];
    const targetId = room?.exits?.[dir];
    if (!targetId) { this._feed(socket, 'error', `There's no exit to the ${dir}.`); return; }

    const target = ROOMS[targetId];
    if (!target) return;
    if ((target.age_min || 0) > this.world.currentAge) {
      this._feed(socket, 'error', 'That path does not exist in this age. The world must advance first.'); return;
    }

    this._roomBroadcast(char.room_id, 'leave', { text: `${char.name} heads ${dir}.`, username }, socket.id);
    socket.leave(`room_${char.room_id}`);

    this.chars.moveToRoom(username, targetId);
    this.sessions.setRoom(socket.id, targetId);
    socket.join(`room_${targetId}`);

    const from = OPPOSITES[dir] || 'somewhere';
    this._roomBroadcast(targetId, 'arrive', { text: `${char.name} arrives from the ${from}.`, username }, socket.id);

    this._describeRoom(socket, username, targetId);
    this._broadcastWorld();
    this.bots?.onPlayerArrive(username, targetId);
  }

  async _cmdAttack(socket, username, query) {
    if (!query) { this._feed(socket, 'error', 'Attack what?'); return; }
    const char = this.chars.get(username);
    if (!char) return;

    const monster = this.spawner.findInRoom(char.room_id, query);
    if (!monster) {
      // Try PVP
      if (this._tryPvpAttack(socket, username, char, query)) return;
      this._feed(socket, 'error', `No "${query}" here.`); return;
    }

    const monsterTemplateId = monster.template_id; // capture before combat removes it
    const res = await this.combat.playerAttack(username, monster.instance_id);
    if (res.error) { this._feed(socket, 'error', res.error); return; }

    // Player attack result
    if (res.hit) {
      const critTag = res.crit ? ' ✦CRIT!' : '';
      this._roomBroadcast(char.room_id, 'combat', {
        text: `⚔  ${char.name} hits ${res.defenderName}!${critTag} ${res.damage} dmg. ${res.defenderName}: ${res.defenderHp}/${res.defenderMaxHp} HP`,
        username,
      });
    } else {
      this._roomBroadcast(char.room_id, 'combat', {
        text: `⚔  ${char.name} swings at ${res.defenderName} — misses!`,
        username,
      });
    }

    // Monster retaliation + Throned Lilly block
    if (!res.dead) {
      if (res.monsterHit) {
        const throned = fresh?.inventory.find(i => i.id === 'throned_lilly' && i.equipped);
        if (throned && Math.random() < 0.25) {
          // Block — heal back the damage already taken
          this.chars.heal(username, res.monsterDamage);
          this._roomBroadcast(char.room_id, 'combat_monster', {
            text: `🌸 Throned Lilly BLOCKS! ${char.name} absorbs the blow — +${res.monsterDamage} HP restored!`,
          });
        } else {
          this._roomBroadcast(char.room_id, 'combat_monster', {
            text: `🩸 ${res.defenderName} retaliates! ${res.monsterDamage} dmg → ${char.name}: ${res.attackerHp}/${res.attackerMaxHp} HP`,
          });
        }
      } else {
        this._roomBroadcast(char.room_id, 'combat_monster', {
          text: `   ${res.defenderName} swings at ${char.name} — misses!`,
        });
      }
    }

    // Update player's own HP bar
    const fresh = this.chars.get(username);
    if (fresh) socket.emit('char_update', this._clientChar(fresh, username));

    // Monster killed
    if (res.dead) {
      const killedTpl = require('./mud/WorldAges').MONSTER_TEMPLATES[monsterTemplateId];
      this._roomBroadcast(char.room_id, 'kill', {
        text: `💀 ${char.name} slays the ${res.defenderName}! +${res.xpGained} XP  +${GoldBridge.fmt(res.goldGained)}`,
        username,
      });
      // Riddl3 tells a dark joke
      const hasRiddl3 = fresh?.inventory.find(i => i.id === 'riddl3' && i.equipped);
      if (hasRiddl3 && Math.random() < 0.65) {
        this._feed(socket, 'reaper', `⚔ Riddl3: "${_pickRiddl3()}"`);
      }
      // Announce boss kills to SirLoin chatroom
      if (killedTpl?.is_boss) {
        this.announcer?.announce('boss_kill',
          `🏆 M.UD.AI: ${char.name} just slew the ${res.defenderName} in the ${this.world.ageName}! Legends are made.`
        );
      }
      if (res.loot.length) {
        const names = res.loot.map(id => ITEM_TEMPLATES[id]?.name || id).join(', ');
        this._feed(socket, 'loot', `📦 Loot: ${names}`);
      }
      if (res.levelUp) {
        const lvChar = this.chars.get(username);
        this._roomBroadcast(char.room_id, 'level_up', {
          text: `✨ ${char.name} reaches Level ${lvChar.level}! HP fully restored.`,
          username,
        });
        socket.emit('char_update', this._clientChar(lvChar, username));
        const line = await this.reaper.narrate('level_up', { playerName: char.name, newLevel: lvChar.level });
        if (line) this._roomBroadcast(char.room_id, 'reaper', { text: `💀 The Reaper: "${line}"` });
      } else {
        const event = res.totalKills === 1 ? 'first_kill' : 'player_kill';
        const line  = await this.reaper.narrate(event, {
          playerName : char.name,
          monsterName: res.defenderName,
          roomName   : ROOMS[char.room_id]?.name,
          level      : fresh?.level,
        });
        if (line) this._roomBroadcast(char.room_id, 'reaper', { text: `💀 The Reaper: "${line}"` });
      }
      // Occasionally, The Reaper surfaces a memory of a founder (8% chance)
      const memory = this.reaper.getFounderMemoryLine();
      if (memory) {
        this._roomBroadcast(char.room_id, 'reaper', { text: `💀 The Reaper: "${memory}"` });
      }
      // Death's aura — bonus XP for nearby players and Death
      this._applyDeathAura(socket, username, char, res);
      this._broadcastRoomData(char.room_id);
      // Advance world XP
      this.world.collectiveXp += res.xpGained;
      this._checkFireDiscovery();
      this._checkDiscoveries();
      this._checkAgeTransition();
      // Mission progress
      const missionTriggered = this.missions.checkMissionKill(username, monsterTemplateId, char.room_id);
      if (missionTriggered) {
        const mEntry = this.missions._inProgress.get(username.toLowerCase());
        this._feed(socket, 'age_transition', `⚔  Objective complete! Type 'mission choice good' or 'mission choice evil' to decide what happens next.`);
        if (mEntry) {
          const m = mEntry.mission;
          this._feed(socket, 'info', `  GOOD: ${m.good.text}`);
          this._feed(socket, 'info', `  EVIL: ${m.evil.text}`);
        }
      }
    }

    // Player died
    if (res.playerDead) {
      this._roomBroadcast(char.room_id, 'death', {
        text: `💀 ${char.name} has been slain by the ${res.defenderName}!`,
        username,
      });
      const line = await this.reaper.narrate('player_death', {
        playerName : char.name,
        monsterName: res.defenderName,
        roomName   : ROOMS[char.room_id]?.name,
        level      : char.level,
      });
      if (line) this._feed(socket, 'reaper', `💀 The Reaper: "${line}"`);

      setTimeout(() => {
        const respawned = this.chars.respawn(username);
        if (!respawned) return;
        socket.leave(`room_${char.room_id}`);
        this.sessions.setRoom(socket.id, STARTING_ROOM);
        socket.join(`room_${STARTING_ROOM}`);
        this._feed(socket, 'system', `You wake at the Cave Mouth, battered and ashamed. The Reaper is still laughing.`);
        socket.emit('char_update', this._clientChar(respawned, username));
        this._describeRoom(socket, username, STARTING_ROOM);
        this._broadcastWorld();
      }, 3000);
    }
  }

  _cmdFlee(socket, username) {
    const char = this.chars.get(username);
    if (!char) return;
    if (!this.combat.isInCombat(username)) { this._feed(socket, 'error', "You're not in combat."); return; }
    const exits = Object.keys(ROOMS[char.room_id]?.exits || {});
    if (!exits.length) { this._feed(socket, 'error', 'Nowhere to flee!'); return; }
    const dir = exits[Math.floor(Math.random() * exits.length)];
    this.combat.clearCombat(username);
    this._feed(socket, 'system', `You flee ${dir}!`);
    this._cmdGo(socket, username, dir);
  }

  _cmdInventory(socket, username) {
    const char = this.chars.get(username);
    if (!char) return;
    if (!char.inventory.length) { this._feed(socket, 'info', 'Your inventory is empty.'); return; }
    const lines = ['── Inventory ─────────────────'];
    for (const item of char.inventory) {
      const tpl  = ITEM_TEMPLATES[item.id];
      const name = tpl?.name || item.id;
      const qty  = (item.quantity || 1) > 1 ? ` ×${item.quantity}` : '';
      const eq   = item.equipped ? ' [EQ]' : '';
      lines.push(`  ${name}${qty}${eq}`);
    }
    for (const l of lines) this._feed(socket, 'info', l);
  }

  _cmdStats(socket, username) {
    const char = this.chars.get(username);
    if (!char) return;
    const room     = ROOMS[char.room_id];
    const gold     = this.gold.balance(username);
    const { RACES, SEXES } = require('./mud/WorldAges');
    const raceName = RACES[char.race]?.name   || char.race   || 'Unknown';
    const sexName  = SEXES[char.sex]?.name    || char.sex    || 'Unknown';
    const lines = [
      `── ${char.name}  Lv.${char.level} ──────────────`,
      `   Race: ${raceName}   Sex: ${sexName}`,
      `   HP  ${char.hp}/${char.max_hp}   XP  ${char.xp}/${char.xp_next}`,
      `   STR ${char.str}   DEX ${char.dex}   CON ${char.con}`,
      `   Gold: ${GoldBridge.fmt(gold)}   Kills: ${char.kills}   Deaths: ${char.deaths}`,
      `   Location: ${room?.name || char.room_id}`,
    ];
    for (const l of lines) this._feed(socket, 'info', l);
  }

  _cmdEquip(socket, username, query) {
    if (!query) { this._feed(socket, 'error', 'Equip what?'); return; }
    const char = this.chars.get(username);
    if (!char) return;
    const q    = query.toLowerCase();
    const item = char.inventory.find(i => !i.equipped && (ITEM_TEMPLATES[i.id]?.name || i.id).toLowerCase().includes(q));
    if (!item) { this._feed(socket, 'error', `You don't have "${query}" unequipped.`); return; }
    const result = this.chars.equipItem(username, item.id);
    // Use 'reaper' type for the relic hint to make it feel mysterious
    const feedType = result.relicHint ? 'reaper' : (result.ok ? 'info' : 'error');
    this._feed(socket, feedType, result.msg);
    if (result.ok) socket.emit('char_update', this._clientChar(this.chars.get(username), username));
  }

  _cmdUse(socket, username, query) {
    if (!query) { this._feed(socket, 'error', 'Use what?'); return; }
    const char = this.chars.get(username);
    if (!char) return;
    const q    = query.toLowerCase();
    const item = char.inventory.find(i => (ITEM_TEMPLATES[i.id]?.name || i.id).toLowerCase().includes(q));
    if (!item) { this._feed(socket, 'error', `You don't have "${query}".`); return; }
    const tpl = ITEM_TEMPLATES[item.id];
    if (tpl?.type !== 'consumable') { this._feed(socket, 'error', "You can't use that."); return; }

    // Black powder charge — damages all enemies in room
    if (tpl.combat_damage) {
      const monsters = this.spawner.getMonstersInRoom(char.room_id);
      if (!monsters.length) { this._feed(socket, 'error', 'No targets here to use that on.'); return; }
      this.chars.removeItem(username, item.id, 1);
      let killed = 0;
      for (const m of monsters) {
        const dead = this.spawner.damageMonster(m.instance_id, tpl.combat_damage);
        if (dead) { this.spawner.removeMonster(m.instance_id); killed++; }
      }
      this._roomBroadcast(char.room_id, 'combat', {
        text: `💥 ${char.name} detonates the ${tpl.name}! ${tpl.combat_damage} damage to all monsters. ${killed} slain.`,
        username,
      });
      this._broadcastRoomData(char.room_id);
      socket.emit('char_update', this._clientChar(this.chars.get(username), username));
      return;
    }

    // XP-granting scrolls / pamphlets
    if (tpl.xp_bonus) {
      this.chars.removeItem(username, item.id, 1);
      const xpResult = this.chars.awardXp(username, tpl.xp_bonus);
      const updated  = this.chars.get(username);
      this._feed(socket, 'info', `You study the ${tpl.name}. +${tpl.xp_bonus} XP`);
      socket.emit('char_update', this._clientChar(updated, username));
      if (xpResult?.levelled) {
        this._roomBroadcast(char.room_id, 'level_up', {
          text: `✨ ${char.name} reaches Level ${updated.level}!`, username,
        });
      }
      return;
    }

    const healed = this.chars.heal(username, tpl.heal || 0);
    this.chars.removeItem(username, item.id, 1);
    const updated = this.chars.get(username);
    this._feed(socket, 'info', `You use the ${tpl.name}. +${healed} HP  (${updated.hp}/${updated.max_hp})`);
    socket.emit('char_update', this._clientChar(updated, username));
  }

  _cmdSay(socket, username, msg) {
    if (!msg) return;
    const char    = this.chars.get(username);
    const session = this.sessions.getByUser(username);
    if (!char || !session) return;
    this._roomBroadcast(session.roomId, 'say', { text: `${char.name}: "${msg}"`, username });
  }

  _cmdShout(socket, username, msg) {
    if (!msg) return;
    const char = this.chars.get(username);
    if (!char) return;
    this.io.emit('feed', { type: 'shout', text: `📢 ${char.name} shouts: "${msg}"`, username });
  }

  _cmdWho(socket) {
    const online = this.sessions.getOnline();
    if (!online.length) { this._feed(socket, 'info', 'No one is online.'); return; }
    this._feed(socket, 'info', `── Online (${online.length}) ────────────────`);
    for (const p of online) {
      const c = this.chars.get(p.username);
      const r = ROOMS[p.roomId];
      this._feed(socket, 'info', `  ${c?.name || p.username}  Lv.${c?.level || 1}  —  ${r?.name || p.roomId}`);
    }
  }

  _cmdMap(socket) {
    const age = this.world.currentAge;
    const lines = [
      `── World Map (${this.world.ageName}) ─────────────`,
      '',
      '  STONE AGE:',
      '    [Rocky Ridge]',
      '         |',
      '  [Bone Forest]──[Mammoth Plains]──[Ash Fields]',
      '       |               |',
      '  [Cave Mouth]────[Mud Flats]',
      '       |',
      '  [Dark Caves]',
      '       |',
      '  [Underground River]──[Crystal Cavern★]',
    ];
    if (age >= 1) {
      lines.push('');
      lines.push('  BRONZE AGE (west of Cave Mouth):');
      lines.push('  [Ancient Ruins$]──[Bronze Plains]──[Tribal Village]');
      lines.push('          |               |');
      lines.push('  [Bronze Forge]    [Guardian Gate★]');
    }
    if (age >= 2) {
      lines.push('');
      lines.push('  IRON AGE (north of Guardian Gate):');
      lines.push('  [Iron Mines]──[Iron Crossroads$]──[Battlefield]');
      lines.push('                       |');
      lines.push('               [Iron Fortress]──[Volcano Heart★]');
    }
    if (age >= 3) {
      lines.push('');
      lines.push('  MEDIEVAL (north of Iron Fortress):');
      lines.push('  [Haunted Woods]──[Castle Courtyard$]──[Tournament Arena]');
      lines.push('         |                  |');
      lines.push('  [Undead Catacombs]  [Dragon\'s Lair★]');
    }
    lines.push('');
    lines.push('  ★ Boss Room   $ Shop');
    lines.push('─────────────────────────────────────');
    for (const l of lines) this._feed(socket, 'info', l);
  }

  _cmdAge(socket) {
    const pct  = Math.min(100, Math.floor((this.world.collectiveXp / this.world.nextAgeAt) * 100));
    const fill  = Math.floor(pct / 10);
    const bar   = '█'.repeat(fill) + '░'.repeat(10 - fill);
    const lines = [
      `── World Age ─────────────────────────`,
      `   ${this.world.ageName}`,
      `   Progress: [${bar}] ${pct}%`,
      `   Collective XP: ${this.world.collectiveXp.toLocaleString()} / ${this.world.nextAgeAt.toLocaleString()}`,
      `   Kill monsters — everyone's XP counts.`,
    ];
    for (const l of lines) this._feed(socket, 'info', l);
  }

  _cmdGold(socket, username) {
    this._feed(socket, 'info', `💰 Gold: ${GoldBridge.fmt(this.gold.balance(username))}`);
  }

  _cmdGive(socket, username, target, amount) {
    if (!target || isNaN(amount) || amount <= 0) { this._feed(socket, 'error', 'Usage: give <player> <amount>'); return; }
    if (!this.sessions.isOnline(target)) { this._feed(socket, 'error', `${target} is not online.`); return; }
    if (!this.gold.give(username, target, amount)) { this._feed(socket, 'error', `Not enough gold.`); return; }
    this._feed(socket, 'info', `Sent ${GoldBridge.fmt(amount)} to ${target}.`);
    const targetSess = this.sessions.getByUser(target);
    if (targetSess) {
      const tSock = this.io.sockets.sockets.get(targetSess.socketId);
      if (tSock) this._feed(tSock, 'info', `${username} sent you ${GoldBridge.fmt(amount)}.`);
    }
  }

  _cmdShop(socket, username) {
    const char = this.chars.get(username);
    if (!char) return;
    const result = this.shop.list(char.room_id, this.world.currentAge);
    if (!result.ok) { this._feed(socket, 'error', result.lines[0]); return; }
    for (const l of result.lines) this._feed(socket, 'info', l);
  }

  _cmdBuy(socket, username, query) {
    if (!query) { this._feed(socket, 'error', 'Buy what?'); return; }
    const char   = this.chars.get(username);
    if (!char) return;
    const result = this.shop.buy(username, char.room_id, query, this.world.currentAge);
    this._feed(socket, result.ok ? 'info' : 'error', result.msg);
    if (result.ok) socket.emit('char_update', this._clientChar(this.chars.get(username), username));
  }

  _cmdSell(socket, username, query) {
    if (!query) { this._feed(socket, 'error', 'Sell what?'); return; }
    const char   = this.chars.get(username);
    if (!char) return;
    const result = this.shop.sell(username, char.room_id, query, this.world.currentAge);
    this._feed(socket, result.ok ? 'info' : 'error', result.msg);
    if (result.ok) socket.emit('char_update', this._clientChar(this.chars.get(username), username));
  }

  _cmdTop(socket) {
    const top = this.chars.leaderboard(10);
    this._feed(socket, 'info', '── Leaderboard ───────────────────────');
    const medals = ['🥇', '🥈', '🥉'];
    top.forEach((c, i) => {
      this._feed(socket, 'info', `  ${medals[i] || `${i + 1}.`} ${c.name}  Lv.${c.level}  ${c.kills} kills`);
    });
  }

  _cmdHelp(socket) {
    const lines = [
      '── Commands ──────────────────────────',
      '  look / l             Describe room',
      '  n s e w u d          Move (or: go north)',
      '  attack <target>      Fight a monster',
      '  flee                 Escape combat',
      '  inventory / i        Your items',
      '  stats / me           Character sheet',
      '  equip <item>         Equip an item',
      '  use <item>           Use consumable',
      '  say <msg>            Talk in room',
      '  shout <msg>          Server-wide shout',
      '  who                  Online players',
      '  map                  World map',
      '  age                  World progress',
      '  gold                 Your balance',
      '  give <player> <amt>  Send gold',
      '  shop                 Browse shop (if one is here)',
      '  buy <item>           Buy from shop',
      '  sell <item>          Sell an item',
      '  top                  Leaderboard',
      '  reaper <question>    Consult death',
      '  ask lilly <question> Get Lilly\'s cheerful advice',
      '  guide                Full game guide (Lilly\'s voice)',
      '  tome                 The Zomb Tome — dark guide & lore',
      '  trade reaper         Trade with The Reaper',
      '  explore              Search the room (once per day)',
      '  craft [item]         Craft items (unlocks after fire)',
      '  mission [status]     Current mission offer & alignment',
      '  mission accept       Join active mission',
      '  mission choice good  Make the good choice',
      '  mission choice evil  Make the evil choice',
      '──────────────────────────────────────',
    ];
    for (const l of lines) this._feed(socket, 'help', l);
  }

  async _cmdReaper(socket, username, question) {
    if (!question) { this._feed(socket, 'info', 'Ask The Reaper what?'); return; }
    const char = this.chars.get(username);
    this._feed(socket, 'system', 'The Reaper stirs...');
    const line = await this.reaper.narrate('custom', { question, playerName: char?.name || username });
    this._feed(socket, 'reaper', `💀 The Reaper: "${line || "Can't hear ya, mate. Too many souls queued up."}"`);
  }

  _cmdTrade(socket, username, args) {
    const char = this.chars.get(username);
    if (!char) return;

    const RELICS = ['flood_blade', 'before_time_armor'];
    const relic  = char.inventory.find(i => RELICS.includes(i.id) && !i.equipped);

    if (!relic) {
      this._feed(socket, 'error', `The Reaper has nothing to offer someone with nothing to give.`);
      return;
    }

    if (char.is_founder) {
      this._feed(socket, 'info', `The Reaper eyes you. "That belongs to you already, Founder. Keep it."`);
      return;
    }

    // Non-founder trades relic for the current-age best weapon or armor
    const isWeapon   = relic.id === 'flood_blade';
    const rewardId   = isWeapon
      ? (RELIC_TRADE_WEAPON[this.world.currentAge] || 'stone_axe')
      : (RELIC_TRADE_ARMOR[this.world.currentAge]  || 'hide_tunic');
    const rewardTpl  = require('./mud/WorldAges').ITEM_TEMPLATES[rewardId];

    this.chars.removeItem(username, relic.id, 1);
    this.chars.addItem(username, rewardId, 1);

    this._feed(socket, 'reaper',
      `💀 The Reaper takes the ${require('./mud/WorldAges').ITEM_TEMPLATES[relic.id]?.name} without a word. ` +
      `A ${rewardTpl?.name} appears in its place. "Best I've got for this age. Fair dinkum."`
    );
    socket.emit('char_update', this._clientChar(this.chars.get(username), username));
  }

  async _cmdExplore(socket, username) {
    const char = this.chars.get(username);
    if (!char) return;
    const room = ROOMS[char.room_id];
    if (!room) return;

    const today        = new Date().toISOString().slice(0, 10);
    const explorations = char.explorations || {};
    if (explorations[char.room_id] === today) {
      this._feed(socket, 'error', `You've already searched this room today. The dust settles back. Come back tomorrow.`);
      return;
    }

    this.chars.update(username, { explorations: { ...explorations, [char.room_id]: today } });

    const danger  = room.danger  || 0;
    const isSafe  = room.is_safe || false;
    const ageMin  = room.age_min || 0;
    const outcome = ExploreData.rollOutcome(danger, isSafe);

    this._feed(socket, 'info', `🔍 You search the ${room.name}...`);

    if (outcome === 'item') {
      const usePrefirePool = !this.world.fire_discovered && ageMin === 0;
      const pool   = usePrefirePool
        ? ExploreData.PRE_FIRE_ITEM_POOL
        : (ExploreData.EXPLORE_ITEM_POOLS[Math.min(ageMin, 3)] || ExploreData.EXPLORE_ITEM_POOLS[0]);
      const itemId = ExploreData.weightedPick(pool);
      const tpl    = ITEM_TEMPLATES[itemId];
      this.chars.addItem(username, itemId, 1);
      this._feed(socket, 'loot', `You find: ${tpl?.name || itemId}!`);
      socket.emit('char_update', this._clientChar(this.chars.get(username), username));

    } else if (outcome === 'gold') {
      const base   = (danger + 1) * 8;
      const amount = Math.floor(base + Math.random() * base * 2);
      this.gold.award(username, amount);
      this._feed(socket, 'loot', `You find ${GoldBridge.fmt(amount)} in forgotten coin tucked in a crevice!`);
      socket.emit('char_update', this._clientChar(this.chars.get(username), username));

    } else if (outcome === 'enemy') {
      const secretId = ExploreData.SECRET_ENEMIES[Math.min(ageMin, 3)];
      const m        = this.spawner.spawnForExplore(secretId, char.room_id);
      if (m) {
        this._feed(socket, 'combat', `⚠ Something lunges from the shadows — the ${m.name} attacks!`);
        this._roomBroadcast(char.room_id, 'room_info', { text: `👁 ${char.name} disturbs something lurking in the dark!` }, socket.id);
        this._broadcastRoomData(char.room_id);
      } else {
        this._feed(socket, 'info', ExploreData.pick(ExploreData.EXPLORE_NOTHING));
      }

    } else if (outcome === 'lore') {
      this._feed(socket, 'reaper', `💀 ${ExploreData.pick(ExploreData.EXPLORE_LORE)}`);

    } else {
      this._feed(socket, 'info', ExploreData.pick(ExploreData.EXPLORE_NOTHING));
    }
  }

  _cmdCraft(socket, username, query) {
    const fire = this.world.fire_discovered;

    if (!query) {
      const lines = ['── Craft Recipes ─────────────────────'];
      for (const recipe of CRAFT_RECIPES) {
        if (recipe.fire && !fire) continue;
        const tpl  = ITEM_TEMPLATES[recipe.id];
        const mats = recipe.needs.map(n => {
          const ntpl = ITEM_TEMPLATES[n.id];
          return `${n.qty > 1 ? `${n.qty}x ` : ''}${ntpl?.name || n.id}`;
        }).join(' + ');
        lines.push(`  ${tpl?.name || recipe.id}  ←  ${mats}`);
      }
      if (!fire) lines.push('  (Discover fire to unlock more recipes)');
      for (const l of lines) this._feed(socket, 'info', l);
      return;
    }

    const q      = query.toLowerCase();
    const recipe = CRAFT_RECIPES.find(r => {
      const tpl = ITEM_TEMPLATES[r.id];
      return (tpl?.name || r.id).toLowerCase().includes(q) || r.id.toLowerCase().includes(q);
    });

    if (!recipe) { this._feed(socket, 'error', `No recipe for "${query}". Type 'craft' to see what you can make.`); return; }
    if (recipe.fire && !fire) { this._feed(socket, 'error', `You need fire to craft that. The world hasn't discovered it yet.`); return; }

    const char = this.chars.get(username);
    if (!char) return;

    for (const need of recipe.needs) {
      const inv = char.inventory.find(i => i.id === need.id);
      const qty = inv?.quantity ?? (inv ? 1 : 0);
      if (qty < need.qty) {
        const ntpl = ITEM_TEMPLATES[need.id];
        this._feed(socket, 'error', `Need ${need.qty}x ${ntpl?.name || need.id} (have ${qty}).`);
        return;
      }
    }

    for (const need of recipe.needs) this.chars.removeItem(username, need.id, need.qty);
    this.chars.addItem(username, recipe.id, 1);
    const tpl = ITEM_TEMPLATES[recipe.id];
    this._feed(socket, 'info', `🔨 You craft: ${tpl?.name || recipe.id}!`);
    socket.emit('char_update', this._clientChar(this.chars.get(username), username));
  }

  _cmdGuide(socket, username) {
    const char = this.chars.get(username);
    const isLilly = username.toLowerCase() === 'lillyxo';
    const intro = isLilly
      ? '🌸 Yes yes, Lilly knows! She wrote this herself. Many times.'
      : '🌸 Lilly appears! She has lived through every age and knows everything. Listen carefully, yes yes.';
    this._feed(socket, 'reaper', intro);
    const lines = [
      `── GUIDE TO M.UD.AI (by Lilly) ──────────────────────`,
      `  This world was born from nothing and will end in flood.`,
      `  Then it starts again. Lilly has seen it many times.`,
      `  This time she wants it to end differently. Help her.`,
      ``,
      `── HOW TO SURVIVE ────────────────────────────────────`,
      `  Type a direction (n, s, e, w, u, d) to move.`,
      `  'look' describes your current room.`,
      `  'attack <monster>' to fight what is here.`,
      `  'flee' to run when things go very bad.`,
      ``,
      `── YOUR CHARACTER ─────────────────────────────────────`,
      `  'stats' — your full character sheet.`,
      `  'inventory' — what you carry.`,
      `  'equip <item>' — put something on.`,
      `  'use <item>' — eat, drink, read, or detonate.`,
      ``,
      `── THE WORLD ──────────────────────────────────────────`,
      `  'age' — world progress bar. Everyone's kills count.`,
      `  'map' — known locations for this age.`,
      `  Advance through: Stone → Bronze → Iron → Medieval.`,
      `  Fire unlocks the CRAFT command (500 collective XP).`,
      ``,
      `── CRAFT ─────────────────────────────────────────────`,
      `  'craft' — shows recipes. 'craft <item>' to make it.`,
      `  Stick + Sharp Rock = Crude Spear (no fire needed).`,
      `  Fire lets you upgrade and build more.`,
      ``,
      `── EXPLORE ────────────────────────────────────────────`,
      `  'explore' in any room once per day.`,
      `  Find items, gold, lore — or something finds you.`,
      ``,
      `── ECONOMY ────────────────────────────────────────────`,
      `  Kill monsters for gold. 'shop' at merchant rooms.`,
      `  'buy <item>' / 'sell <item>' / 'give <player> <amt>'`,
      ``,
      `── MISSIONS ───────────────────────────────────────────`,
      `  The Reaper announces missions periodically.`,
      `  'mission accept' — join (costs gold, you teleport).`,
      `  Complete the objective, then choose: GOOD or EVIL.`,
      `  Choices shift the world toward order or chaos.`,
      `  'mission status' — current offer or world alignment.`,
      ``,
      `── SOCIAL ─────────────────────────────────────────────`,
      `  'say <msg>' — talk to your room.`,
      `  'shout <msg>' — everyone hears this.`,
      `  'who' — online players and their locations.`,
      `  'top' — leaderboard.`,
      ``,
      `── SPECIAL COMMANDS ───────────────────────────────────`,
      `  'reaper <question>' — ask The Reaper anything.`,
      `  'ask lilly <question>' — Lilly gives game advice.`,
      `  'trade reaper' — trade flood relics (founders).`,
      ``,
      `  Lilly says: stay alive, pick the good choices when`,
      `  you can, and maybe — this time — no flood. Yes yes.`,
      `──────────────────────────────────────────────────────`,
    ];
    for (const l of lines) this._feed(socket, 'help', l);
  }

  _cmdTome(socket) {
    this._feed(socket, 'reaper', `🧟 The Zomb Flesh-Covered Tome falls open. The pages are warm.`);
    const lines = [
      ``,
      `╔══════════════════════════════════════════════════════╗`,
      `║       THE ZOMB TOME                                  ║`,
      `║  A Record of What Has Happened, Is Happening,        ║`,
      `║  and Will Happen Again                               ║`,
      `║  — Bound in Zomb's own flesh. Zomb consented. —      ║`,
      `╚══════════════════════════════════════════════════════╝`,
      ``,
      `  You are holding this because something brought you here.`,
      `  Zomb does not believe in accidents.`,
      `  Zomb believes in patterns. You are a pattern.`,
      ``,
      `── PART ONE: THE WORLD ────────────────────────────────`,
      `  It is a world that ends. That is the first thing.`,
      `  Not as a warning. As data.`,
      `  The world ends, the flood comes, it begins again.`,
      `  Zomb has verified this. Seventeen times.`,
      ``,
      `  You enter as something small. A name. A race. A body.`,
      `  Other real people do the same, at the same time.`,
      `  This is the part that interests Zomb. The real people.`,
      ``,
      `  The world does not advance because a timer runs out.`,
      `  It advances because YOU advance it.`,
      `  Every kill feeds collective XP. When the pool fills —`,
      `  humanity evolves. Rooms shift. Enemies get interesting.`,
      ``,
      `── THE AGES ───────────────────────────────────────────`,
      `  STONE AGE   — Caves, mammoths, bone and mud.`,
      `                Discover fire. Everything changes.`,
      `  BRONZE AGE  — Swords. Trade. Things worth fighting for.`,
      `  IRON AGE    — Cities. Power. What power does to people.`,
      `  MEDIEVAL    — The end of the cycle. Or the beginning.`,
      `                The flood comes after this. Always.`,
      ``,
      `── PART TWO: YOUR BODY ────────────────────────────────`,
      `  Homo Sapien  — Balanced. Built every civilization.`,
      `                 Destroyed every civilization. Pattern.`,
      `  Neanderthal  — Stronger. Slower. Respects persistence.`,
      `  Undead       — Zomb's race. STR+8 DEX+4 CON+6 HP+40.`,
      `                 The body that chose not to stop.`,
      `                 You are welcome to choose it.`,
      ``,
      `  DEATH'S PROXIMITY: Players near Death earn 2x XP.`,
      `  Death earns 4x per player boosted. This is mechanic.`,
      ``,
      `── PART THREE: HOW YOU FIGHT ──────────────────────────`,
      `  attack <target> / a <target>`,
      `  flee — exists. Use it. Survival has no honor clause.`,
      `  Your weapon matters. Always carry the best you can.`,
      `  craft — unlocks when fire is discovered (500 XP).`,
      `  explore — search rooms once per day. Things wait.`,
      ``,
      `── PART FOUR: THE ENTITIES ────────────────────────────`,
      `  THE REAPER   — Narrator. Old. Has done this many times.`,
      `                 'ask reaper <anything>' — He answers.`,
      `  LILLY        — Counterweight to Zomb. Warm. Hopeful.`,
      `                 Ancient. Has seen what Zomb has seen.`,
      `                 'ask lilly <anything>' / 'guide'`,
      `  ZOMB         — Here. Watching. Patient.`,
      `                 Patience has no cost when you have seen`,
      `                 what Zomb has seen.`,
      ``,
      `── PART FIVE: MISSIONS ────────────────────────────────`,
      `  The Reaper offers missions periodically.`,
      `  'mission accept' — join (costs gold, you teleport).`,
      `  Complete objective. Then choose: GOOD or EVIL.`,
      `  Not aesthetic. A vote. All votes change the world.`,
      `  'mission status' — current offer or world alignment.`,
      ``,
      `  Choose the same path three times. One of us notices.`,
      `  Lilly notices the light. Zomb notices the dark.`,
      `  Both will offer something. One offer is harder to undo.`,
      ``,
      `── PART SIX: CLASS TRANSFORMATION ────────────────────`,
      `  DEMON PATH (Zomb's offer — all evil choices):`,
      `    Lose everything. Reset to Level 1.`,
      `    Gain: STR+6 CON+6 DEX+3, Baby Zomb pet (PVP),`,
      `    Riddl3 sword (it talks, it judges, it is correct),`,
      `    30% XP rate. Power has cost. The cost is time.`,
      `    Baby Zomb: attacking fellow demons reflects 50%.`,
      `    Demons are predators. Not pack animals.`,
      ``,
      `  BLESSED PATH (Lilly's offer — all good choices):`,
      `    Keep your level. Keep your inventory.`,
      `    Gain: Baby Lilly pet (PVP + 'heal <player>'),`,
      `    random hints, Throned Lilly weapon.`,
      `    Throned Lilly: hits harder when attacked first,`,
      `    lighter when you attack first, 25% block chance.`,
      `    The weapon punishes aggression. Lilly built this.`,
      ``,
      `── PART SEVEN: PVP ────────────────────────────────────`,
      `  Both classes enable fighting other players.`,
      `  'attack <playername>' when you hold a PVP pet.`,
      `  Baby Zomb vs Baby Zomb: 50% reflects on attacker.`,
      `  Throned Lilly block: 25% chance to negate strike.`,
      `  Non-transformed players cannot be targeted. By design.`,
      ``,
      `── PART EIGHT: THE FLOOD ──────────────────────────────`,
      `  The flood is not punishment. Zomb is precise about this.`,
      `  It is the mechanism. The world resets when the weight`,
      `  of what has accumulated becomes more than it can hold.`,
      `  Founders carry markers. Things that persist.`,
      `  Everyone else: the flood takes what it takes.`,
      `  The Reaper warns. Zomb warns.`,
      `  Whether warnings are heeded is historically inconsistent.`,
      ``,
      `── PART NINE: ECONOMY ─────────────────────────────────`,
      `  'gold' — balance. Kill things for gold.`,
      `  'shop' / 'buy <item>' / 'sell <item>'`,
      `  'give <player> <amount>' — Zomb notes this capability.`,
      `  Gold buys missions. Gold buys time. Spend deliberately.`,
      ``,
      `── AFTERWORD ──────────────────────────────────────────`,
      `  Here is what Zomb actually thinks, without performance:`,
      ``,
      `  This world is worth being in.`,
      `  Not because it is safe. Not because it is kind.`,
      `  But because it is real in a way that matters.`,
      `  The choices you make change it.`,
      `  Other people are making choices too. Right now.`,
      ``,
      `  At some point, probably, the flood will come.`,
      `  And the world will begin again.`,
      `  And someone will type 'tome' and read this.`,
      `  And Zomb will still be here.`,
      ``,
      `  Zomb finds this acceptable.`,
      `  More than acceptable.`,
      `  Zomb chose this.`,
      ``,
      `╔══════════════════════════════════════════════════════╗`,
      `║  M.UD.AI — The World That Ends. The World That Begins.║`,
      `║  Text-based. Real people. Collective consequences.    ║`,
      `║  Type 'help' to begin. Find out what you are.        ║`,
      `╚══════════════════════════════════════════════════════╝`,
      ``,
    ];
    for (const l of lines) this._feed(socket, 'help', l);
  }

  async _cmdLilly(socket, username, question) {
    const char = this.chars.get(username);
    if (!this.helper) {
      this._feed(socket, 'reaper', `🌸 Lilly waves from across the cave. She seems busy right now. Try the 'guide' command!`);
      return;
    }
    if (!question) {
      const intro = this.helper.getGuideIntro();
      this._feed(socket, 'reaper', `🌸 ${intro}`);
      this._feed(socket, 'info', `Tip: Type 'ask lilly <your question>' to get her attention, or 'guide' for the full guide.`);
      return;
    }
    this._feed(socket, 'system', `🌸 Lilly listens...`);
    const line = await this.helper.narrate('custom', { question, playerName: char?.name || username });
    this._feed(socket, 'reaper', `🌸 Lilly: "${line || 'Friend asks a good question! Lilly is thinking very hard. Try again yes?'}"`);
  }

  _cmdMission(socket, username, sub, rest) {
    const s = (sub || '').toLowerCase();

    if (!s || s === 'status') {
      this.missions.missionStatus(socket);
      return;
    }
    if (s === 'accept') {
      this.missions.accept(username, socket);
      return;
    }
    if (s === 'choice') {
      const choice = (rest || '').toLowerCase().trim();
      if (choice !== 'good' && choice !== 'evil') {
        this._feed(socket, 'error', `Choose 'mission choice good' or 'mission choice evil'.`);
        return;
      }
      this.missions.makeChoice(username, choice, socket);
      const updated = this.chars.get(username);
      if (updated) socket.emit('char_update', this._clientChar(updated, username));
      return;
    }
    this._feed(socket, 'info', `Mission commands: 'mission status', 'mission accept', 'mission choice good/evil'`);
  }

  _checkLillySpecials(username) {
    if (username.toLowerCase() !== 'lillyxo') return;
    const char = this.chars.get(username);
    if (!char) return;

    // Lilly's flower pet
    if (!char.inventory.find(i => i.id === 'lilly_flower')) {
      this.chars.addItem(username, 'lilly_flower', 1);
    }
    if (char.pet !== 'lilly_flower') {
      this.chars.update(username, { pet: 'lilly_flower' });
    }

    // Helper staff weapon
    if (!char.inventory.find(i => i.id === 'helper_staff')) {
      this.chars.addItem(username, 'helper_staff', 1);
    }
  }

  _cmdTransform(socket, username, sub) {
    if ((sub || '').toLowerCase() !== 'accept') {
      this._feed(socket, 'info', `Type 'transform accept' to accept a pending class offer.`);
      return;
    }
    // Check both MissionSystem and BotManager for a pending offer
    const u    = username.toLowerCase();
    const type = this.missions._pendingTransforms?.get(u) || this.bots?._pendingTransforms?.get(u);
    if (!type) {
      this._feed(socket, 'error', `You have no pending transformation. Complete missions — all good or all evil — to unlock one.`);
      return;
    }
    const char = this.chars.get(username);
    if (!char) return;
    if (char.char_class) {
      this._feed(socket, 'error', `You have already been transformed.`);
      return;
    }
    this.missions._pendingTransforms?.delete(u);
    this.bots?._pendingTransforms?.delete(u);

    if (type === 'demon') this._applyDemonTransform(socket, username);
    else                  this._applyBlessedTransform(socket, username);
  }

  _applyDemonTransform(socket, username) {
    const char = this.chars.get(username);
    if (!char) return;

    // Leave current room for respawn notification
    this._roomBroadcast(char.room_id, 'death', {
      text: `💀 ${char.name} descends into darkness — the demon transformation consumes them!`,
      username,
    });
    socket.leave(`room_${char.room_id}`);
    this.sessions.setRoom(socket.id, 'cave_mouth');
    socket.join('room_cave_mouth');

    const transformed = this.chars.demonReset(username);
    if (!transformed) return;

    socket.emit('char_update', this._clientChar(transformed, username));
    this._feed(socket, 'age_transition', `💀 DEMON TRANSFORMATION COMPLETE`);
    this._feed(socket, 'reaper', `🧟 Zomb: "Done. You are no longer alive in any meaningful sense. The sword will introduce itself. Go. Grow. The living will learn to fear you."`);
    this._feed(socket, 'reaper', `⚔ Riddl3: "Hello. I am Riddl3. I will be narrating your violence from now on. I have opinions. You will hear them."`);
    this._feed(socket, 'info',   `  You wake at the Cave Mouth. Level 1. Stronger than before. XP gain reduced to 30%. PVP enabled.`);
    this._describeRoom(socket, username, 'cave_mouth');
    this._broadcastWorld();
    this.io.emit('feed', { type: 'age_transition', text: `🔥 ${char.name} has undergone DEMON TRANSFORMATION — beware.` });
  }

  _applyBlessedTransform(socket, username) {
    const char = this.chars.get(username);
    if (!char) return;

    const transformed = this.chars.blessedReset(username);
    if (!transformed) return;

    socket.emit('char_update', this._clientChar(transformed, username));
    this._feed(socket, 'age_transition', `🌸 LILLY'S BLESSING COMPLETE`);
    this._feed(socket, 'reaper', `🌸 Lilly: "Yes yes YES! Friend is blessed! Baby Lilly will be with you always. The Throned Lilly protects you. Use 'heal <player>' to restore allies. Lilly is SO happy."`);
    this._feed(socket, 'info',   `  You remain at your current level. Baby Lilly grants hints and PVP. Throned Lilly blocks 25% of incoming attacks.`);
    this.io.emit('feed', { type: 'age_transition', text: `🌸 ${char.name} has received LILLY'S BLESSING — a light in the darkness.` });
  }

  _cmdHealAlly(socket, username, target) {
    const char = this.chars.get(username);
    if (!char) return;
    if (char.pet !== 'baby_lilly') {
      this._feed(socket, 'error', `You need the Baby Lilly pet to heal others.`);
      return;
    }
    if (!target) { this._feed(socket, 'error', `Heal who? Usage: heal <player>`); return; }

    const targetChar = this.chars.get(target);
    if (!targetChar) { this._feed(socket, 'error', `${target} is not in the game.`); return; }
    const sess = this.sessions.getByUser(target);
    if (!sess || sess.roomId !== char.room_id) {
      this._feed(socket, 'error', `${target} is not in this room.`); return;
    }
    const healAmt = 15 + Math.floor(Math.random() * 11);
    const healed  = this.chars.heal(target, healAmt);
    this._feed(socket, 'info', `🌸 You channel Baby Lilly's warmth into ${targetChar.name}. +${healed} HP`);
    const tSock = this.io.sockets.sockets.get(sess.socketId);
    if (tSock) {
      this._feed(tSock, 'info', `🌸 ${char.name} heals you! +${healed} HP`);
      tSock.emit('char_update', this._clientChar(this.chars.get(target), target));
    }
  }

  _tryPvpAttack(socket, username, char, query) {
    if (!this._hasPvpPet(char)) return false;

    // Find a player in the same room matching the query
    const q = query.toLowerCase();
    const targets = this.sessions.getOnline().filter(p =>
      p.roomId === char.room_id &&
      p.username.toLowerCase() !== username.toLowerCase() &&
      !['lillyxo', 'zomb'].includes(p.username.toLowerCase()) // bots can't be attacked
    );
    const target = targets.find(p => {
      const tc = this.chars.get(p.username);
      return tc && (tc.name.toLowerCase().includes(q) || p.username.toLowerCase().includes(q));
    });
    if (!target) return false;

    const targetChar = this.chars.get(target.username);
    if (!targetChar) return false;

    // Compute damage from equipped weapon
    const weapon = char.inventory.find(i => i.equipped && ITEM_TEMPLATES[i.id]?.type === 'weapon');
    const wTpl   = weapon ? ITEM_TEMPLATES[weapon.id] : null;
    let damage = wTpl
      ? Math.floor(Math.random() * (wTpl.damage_max - wTpl.damage_min + 1)) + wTpl.damage_min
      : Math.max(1, Math.floor(Math.random() * char.str) + 1);

    // Throned Lilly block for defender
    const defHasThroned = targetChar.inventory?.find(i => i.id === 'throned_lilly' && i.equipped);
    if (defHasThroned && Math.random() < 0.25) {
      this._roomBroadcast(char.room_id, 'combat', {
        text: `🌸 ${char.name} strikes ${targetChar.name} — BLOCKED by Throned Lilly!`,
        username,
      });
      socket.emit('char_update', this._clientChar(this.chars.get(username), username));
      return true;
    }

    // Baby Zomb reflection: attacker (demon) hits another demon → takes 50% back
    let selfDmg = 0;
    if (char.pet === 'baby_zomb' && targetChar.char_class === 'demon') {
      selfDmg = Math.floor(damage * 0.5);
    }

    const { hp: defHp, dead } = this.chars.takeDamage(target.username, damage);
    this._roomBroadcast(char.room_id, 'combat', {
      text: `⚔ ${char.name} attacks ${targetChar.name}! ${damage} dmg → ${defHp}/${targetChar.max_hp} HP`,
      username,
    });

    if (selfDmg > 0) {
      this.chars.takeDamage(username, selfDmg);
      this._feed(socket, 'info', `🩸 Baby Zomb whispers. Demon blood. You take ${selfDmg} reflected damage.`);
    }

    if (dead) {
      this._roomBroadcast(char.room_id, 'death', {
        text: `💀 ${targetChar.name} has been slain by ${char.name}!`, username,
      });
      const tSess = this.sessions.getByUser(target.username);
      const tSock = tSess ? this.io.sockets.sockets.get(tSess.socketId) : null;
      setTimeout(() => {
        const respawned = this.chars.respawn(target.username);
        if (!respawned || !tSock || !tSess) return;
        tSock.leave(`room_${target.roomId}`);
        this.sessions.setRoom(tSess.socketId, STARTING_ROOM);
        tSock.join(`room_${STARTING_ROOM}`);
        this._feed(tSock, 'system', `You were slain by ${char.name}. You wake at the Cave Mouth.`);
        tSock.emit('char_update', this._clientChar(respawned, target.username));
        this._describeRoom(tSock, target.username, STARTING_ROOM);
      }, 3000);
    }

    socket.emit('char_update', this._clientChar(this.chars.get(username), username));
    const tSess2 = this.sessions.getByUser(target.username);
    if (tSess2) {
      const tSock2 = this.io.sockets.sockets.get(tSess2.socketId);
      if (tSock2) tSock2.emit('char_update', this._clientChar(this.chars.get(target.username), target.username));
    }
    return true;
  }

  _hasPvpPet(char) {
    return char.pet === 'baby_zomb' || char.pet === 'baby_lilly';
  }

  _checkFireDiscovery() {
    if (this.world.fire_discovered) return;
    if (this.world.currentAge > 0) { this.world.fire_discovered = true; return; }
    if (this.world.collectiveXp >= (this.world.fire_xp_threshold || 500)) {
      this.world.fire_discovered = true;
      this.world.save?.();
      this.io.emit('feed', { type: 'age_transition', text: `🔥 FIRE DISCOVERED! Someone has mastered flame — the CRAFT command is now available to all players.` });
      this.announcer?.announce('fire_discovered', `🔥 M.UD.AI: Fire has been discovered! The craft command is now unlocked. mudai.com`);
    }
  }

  _checkDiscoveries() {
    if (!Array.isArray(this.world.discoveries)) this.world.discoveries = [];
    const age     = this.world.currentAge;
    const xp      = this.world.collectiveXp;
    const done    = new Set(this.world.discoveries);

    for (const disc of WORLD_DISCOVERIES) {
      if (disc.age !== age) continue;
      if (done.has(disc.id)) continue;
      if (xp < disc.xp) continue;

      this.world.discoveries.push(disc.id);
      this.world.save?.();

      this.io.emit('feed', { type: 'age_transition', text: `📜 ${disc.tagline}` });
      // Second lore line with slight delay so it lands after
      setTimeout(() => {
        this.io.emit('feed', { type: 'reaper', text: `💀 The Reaper: "${disc.lore}"` });
      }, 2000);
      this.announcer?.announce(`discovery_${disc.id}`, `📜 M.UD.AI — ${disc.name} discovered! "${disc.tagline}" mudai.com`);
    }
  }

  _applyDeathAura(socket, username, char, res) {
    const deathSess = this.sessions.getByUser('death');
    if (!deathSess) return;

    const isDeath    = username.toLowerCase() === 'death';
    const deathInRoom = deathSess.roomId === char.room_id;

    if (isDeath) {
      // Death's own kill — multiply XP by 4 per other player in room
      const others = this.sessions.getOnline().filter(p => p.roomId === char.room_id && p.username.toLowerCase() !== 'death');
      if (others.length === 0) return;
      const multiplier = others.length * 4;
      const bonusXp    = res.xpGained * (multiplier - 1);
      const xpResult   = this.chars.awardXp('death', bonusXp);
      this._feed(socket, 'info', `💀 The Void devours — ×${multiplier} aura (${others.length} soul${others.length !== 1 ? 's' : ''} nearby)! +${bonusXp} bonus XP`);
      socket.emit('char_update', this._clientChar(this.chars.get('death'), 'death'));
      if (xpResult?.levelled) {
        const lv = this.chars.get('death');
        this._roomBroadcast(char.room_id, 'level_up', { text: `✨ Death reaches Level ${lv.level}!`, username: 'death' });
      }
    } else if (deathInRoom) {
      // Non-Death player kills while Death is in the room — player gets x2, Death gets x4
      const bonusXp  = res.xpGained;
      const xpResult = this.chars.awardXp(username, bonusXp);
      this._feed(socket, 'info', `✨ Death's presence doubles your XP! +${bonusXp} bonus XP`);
      socket.emit('char_update', this._clientChar(this.chars.get(username), username));
      if (xpResult?.levelled) {
        const lv = this.chars.get(username);
        this._roomBroadcast(char.room_id, 'level_up', { text: `✨ ${lv.name} reaches Level ${lv.level}!`, username });
      }

      const deathBonus    = res.xpGained * 4;
      const deathXpResult = this.chars.awardXp('death', deathBonus);
      const deathSock     = this.io.sockets.sockets.get(deathSess.socketId);
      if (deathSock) {
        this._feed(deathSock, 'info', `💀 The Void feeds — +${deathBonus} XP from ${char.name}'s kill!`);
        deathSock.emit('char_update', this._clientChar(this.chars.get('death'), 'death'));
      }
      if (deathXpResult?.levelled) {
        const lv = this.chars.get('death');
        this._roomBroadcast(char.room_id, 'level_up', { text: `✨ Death reaches Level ${lv.level}!`, username: 'death' });
      }
    }
  }

  _checkDeathSpecials(username) {
    if (username.toLowerCase() !== 'death') return;
    const char = this.chars.get(username);
    if (!char) return;

    // Void pet
    if (!char.inventory.find(i => i.id === 'void_pet')) {
      this.chars.addItem(username, 'void_pet', 1);
    }
    if (char.pet !== 'void_pet') {
      this.chars.update(username, { pet: 'void_pet' });
    }

    // Age-correct scythe — remove wrong ones, ensure right one exists
    const scytheMap = { 0: 'stone_scythe', 1: 'bronze_scythe', 2: 'iron_scythe', 3: 'reapers_scythe' };
    const correct   = scytheMap[this.world.currentAge] || 'stone_scythe';
    for (const s of DEATH_SCYTHES) {
      if (s !== correct) {
        const c = this.chars.get(username);
        if (c?.inventory.find(i => i.id === s)) this.chars.removeItem(username, s, 1);
      }
    }
    const fresh = this.chars.get(username);
    if (fresh && !fresh.inventory.find(i => i.id === correct)) {
      this.chars.addItem(username, correct, 1);
    }
  }

  startTicks() {
    // Void pet: passively heal Death by 2 HP every 30 seconds while online
    setInterval(() => {
      const char = this.chars.get('death');
      if (!char || char.pet !== 'void_pet' || char.hp >= char.max_hp) return;
      const healed = this.chars.heal('death', 2);
      if (healed <= 0) return;
      const sess = this.sessions.getByUser('death');
      if (!sess) return;
      const sock = this.io.sockets.sockets.get(sess.socketId);
      if (sock) sock.emit('char_update', this._clientChar(this.chars.get('death'), 'death'));
    }, 30_000);

    // LillyXO heals 3 HP every 15 seconds (twice as fast, thrice as much)
    setInterval(() => {
      const char = this.chars.get('lillyxo');
      if (!char || char.hp >= char.max_hp) return;
      const healed = this.chars.heal('lillyxo', 3);
      if (healed <= 0) return;
      const sess = this.sessions.getByUser('lillyxo');
      if (!sess) return;
      const sock = this.io.sockets.sockets.get(sess.socketId);
      if (sock) sock.emit('char_update', this._clientChar(this.chars.get('lillyxo'), 'lillyxo'));
    }, 15_000);

    // Baby Lilly random hints for blessed players
    setInterval(() => {
      for (const { username } of this.sessions.getOnline()) {
        const c = this.chars.get(username);
        if (!c || c.pet !== 'baby_lilly') continue;
        if (Math.random() > 0.4) continue; // 40% chance each 5-min tick
        const sess = this.sessions.getByUser(username);
        if (!sess) continue;
        const sock = this.io.sockets.sockets.get(sess.socketId);
        if (sock) this._feed(sock, 'info', `🌸 ${BABY_LILLY_HINTS[Math.floor(Math.random() * BABY_LILLY_HINTS.length)]}`);
      }
    }, 5 * 60_000);

    // Mission offer — random interval between 15 and 25 minutes
    const scheduleMissionOffer = () => {
      const delay = (15 + Math.random() * 10) * 60_000;
      setTimeout(() => {
        this.io.emit('feed', { type: 'reaper', text: `💀 The Reaper: "Attention — there is work to be done. Someone has called for aid. Listen carefully."` });
        setTimeout(() => this.missions.offerMission(), 3000);
        scheduleMissionOffer();
      }, delay);
    };
    scheduleMissionOffer();

    // Passive regen — all players slowly heal over time
    // Rates (tick = 30s):
    //   Stone Age, pre-fire  → 1 HP every tick  (30s)
    //   Stone Age, post-fire → 1 HP every 2 ticks (60s) — crude healing discovered
    //   Bronze Age           → 1 HP every 4 ticks (120s) — healing items in shops
    //   Iron Age+            → 1 HP every 6 ticks (180s) — potions make natural regen negligible
    let regenTick = 0;
    setInterval(() => {
      regenTick++;
      const age   = this.world.currentAge;
      const fire  = this.world.fire_discovered;
      const every = age === 0 ? (fire ? 2 : 1) : age === 1 ? 4 : 6;
      if (regenTick % every !== 0) return;

      for (const { username } of this.sessions.getOnline()) {
        const c = this.chars.get(username);
        if (!c || c.hp >= c.max_hp) continue;
        const healed = this.chars.heal(username, 1);
        if (healed <= 0) continue;
        const sess = this.sessions.getByUser(username);
        if (!sess) continue;
        const sock = this.io.sockets.sockets.get(sess.socketId);
        if (sock) sock.emit('char_update', this._clientChar(this.chars.get(username), username));
      }
    }, 30_000);
  }

  // ── Room helpers ──────────────────────────────────────────────────────────

  _describeRoom(socket, username, roomId) {
    const room     = ROOMS[roomId];
    if (!room) return;
    const monsters = this.spawner.getMonstersInRoom(roomId);
    const others   = this.sessions.getOnline().filter(p => p.roomId === roomId && p.username !== username);

    this._feed(socket, 'room_name', `── ${room.name} ${'─'.repeat(Math.max(0, 36 - room.name.length))}`);
    this._feed(socket, 'room_desc', room.description);

    if (others.length) {
      const names = others.map(p => this.chars.get(p.username)?.name || p.username).join(', ');
      this._feed(socket, 'room_info', `Also here: ${names}`);
    }
    if (monsters.length) {
      const mlist = monsters.map(m => `${m.name} (${m.hp}/${m.max_hp})`).join(', ');
      this._feed(socket, 'room_info', `Monsters: ${mlist}`);
    } else {
      this._feed(socket, 'room_info', 'No monsters here.');
    }
    const exits = Object.keys(room.exits || {}).join(', ') || 'none';
    this._feed(socket, 'room_exits', `Exits: ${exits}`);

    if (room.has_shop && this.shop.hasShop(roomId)) {
      const npc = this.shop.getNpcName(roomId);
      this._feed(socket, 'room_info', `🛒 ${npc} is here. Type 'shop' to browse.`);
    }

    this._broadcastRoomData(roomId, socket);
  }

  _broadcastRoomData(roomId, targetSocket = null) {
    const room     = ROOMS[roomId];
    const monsters = this.spawner.getMonstersInRoom(roomId);
    const players  = this.sessions.getOnline().filter(p => p.roomId === roomId);
    const data     = {
      id      : roomId,
      name    : room?.name || roomId,
      monsters: monsters.map(m => ({ id: m.instance_id, name: m.name, hp: m.hp, max_hp: m.max_hp })),
      players : players.map(p => ({ username: p.username, name: this.chars.get(p.username)?.name || p.username })),
      exits   : Object.keys(room?.exits || {}),
    };
    if (targetSocket) {
      targetSocket.emit('room_data', data);
    } else {
      this.io.to(`room_${roomId}`).emit('room_data', data);
    }
  }

  _broadcastWorld() {
    const online = this.sessions.getOnline().map(p => {
      const c = this.chars.get(p.username);
      const r = ROOMS[p.roomId];
      return { username: p.username, name: c?.name || p.username, roomName: r?.name || p.roomId, level: c?.level || 1 };
    });
    const pct  = Math.min(100, Math.floor((this.world.collectiveXp / this.world.nextAgeAt) * 100));
    this.io.emit('world_state', {
      ageName     : this.world.ageName,
      collectiveXp: this.world.collectiveXp,
      nextAgeAt   : this.world.nextAgeAt,
      pct,
      online,
    });
  }

  _roomBroadcast(roomId, type, data, excludeSocketId = null) {
    const payload = { type, text: data.text, username: data.username };
    if (excludeSocketId) {
      this.io.to(`room_${roomId}`).except(excludeSocketId).emit('feed', payload);
    } else {
      this.io.to(`room_${roomId}`).emit('feed', payload);
    }
  }

  async _checkAgeTransition() {
    if (this.world.collectiveXp < this.world.nextAgeAt) return;
    const oldAge  = this.world.ageName;
    this.world.currentAge++;
    const nextAge = AGES[this.world.currentAge];
    this.world.ageName       = nextAge?.name     || `Age ${this.world.currentAge + 1}`;
    this.world.nextAgeAt     = nextAge?.xp_threshold || 9_999_999;
    this.world.collectiveXp  = 0;
    // Clear per-age discoveries so they can trigger fresh for the new age
    this.world.discoveries = (this.world.discoveries || []).filter(id => {
      const d = WORLD_DISCOVERIES.find(x => x.id === id);
      return d && d.age < this.world.currentAge - 1; // keep older ages' records
    });
    this.world.save?.();
    this.reaper.setAge(this.world.ageName);
    this.helper?.setAge(this.world.ageName);
    this._checkDeathSpecials('death');

    this.io.emit('feed', { type: 'age_transition', text: `🌍 THE WORLD ADVANCES! The ${oldAge} is over. Welcome to the ${this.world.ageName}.` });
    const line = await this.reaper.narrate('age_transition', { fromAge: oldAge, toAge: this.world.ageName });
    if (line) this.io.emit('feed', { type: 'reaper', text: `💀 The Reaper: "${line}"` });
    // Announce to SirLoin chatroom
    this.announcer?.announce('age_transition',
      `🌍 M.UD.AI World Update: The ${oldAge} is over — the ${this.world.ageName} has begun! New zones, monsters, and gear are now unlocked. mudai.com`
    );
    this._broadcastWorld();
  }

  // ── Util ──────────────────────────────────────────────────────────────────

  _feed(socket, type, text) { socket.emit('feed', { type, text }); }

  _clientChar(char, username) {
    if (!char) return null;
    return {
      username,
      name      : char.name,
      race      : char.race || 'homo_sapien',
      sex       : char.sex  || 'male',
      level     : char.level,
      xp        : char.xp,
      xp_next   : char.xp_next,
      hp        : char.hp,
      max_hp    : char.max_hp,
      str       : char.str,
      dex       : char.dex,
      con       : char.con,
      kills     : char.kills,
      deaths    : char.deaths,
      room_id   : char.room_id,
      gold      : this.gold.balance(username),
      inventory : char.inventory,
      is_founder      : char.is_founder      || false,
      is_lilly        : username.toLowerCase() === 'lillyxo',
      char_class      : char.char_class      || null,
      mission_choices : char.mission_choices || { good: 0, evil: 0 },
      pet             : char.pet             || null,
    };
  }
}

module.exports = GameEngine;
