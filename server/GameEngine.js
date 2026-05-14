'use strict';

const bcrypt                     = require('bcryptjs');
const { ROOMS, STARTING_ROOM }   = require('./mud/WorldMap');
const { AGES, ITEM_TEMPLATES }   = require('./mud/WorldAges');
const { Shop }                   = require('./mud/Shop');
const CommandParser              = require('./CommandParser');
const GoldBridge                 = require('./economy/GoldBridge');
const ExploreData                = require('./mud/ExploreData');

const DEATH_SCYTHES = ['stone_scythe', 'bronze_scythe', 'iron_scythe', 'reapers_scythe'];

const OPPOSITES = { north: 'south', south: 'north', east: 'west', west: 'east', up: 'down', down: 'up' };

// Best item reward when a non-founder trades a relic to The Reaper
const RELIC_TRADE_WEAPON = { 0: 'stone_axe', 1: 'iron_spear',  2: 'war_hammer', 3: 'battle_axe' };
const RELIC_TRADE_ARMOR  = { 0: 'hide_tunic', 1: 'leather_armor', 2: 'iron_armor', 3: 'plate_armor' };

class GameEngine {
  constructor({ io, chars, spawner, combat, reaper, sessions, gold, worldState, announcer, flood, logger }) {
    this.io        = io;
    this.chars     = chars;
    this.spawner   = spawner;
    this.combat    = combat;
    this.reaper    = reaper;
    this.sessions  = sessions;
    this.gold      = gold;
    this.world     = worldState;
    this.announcer = announcer;
    this.flood     = flood;
    this.log       = logger;
    this.parser    = new CommandParser();
    this.shop      = new Shop(chars, gold, logger);
  }

  // ── Socket lifecycle ──────────────────────────────────────────────────────

  onConnect(socket) {
    socket.emit('request_auth');

    socket.on('auth',            data => this._handleAuth(socket, data));
    socket.on('create_char',     data => this._handleCreateChar(socket, data));
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

  _handleCreateChar(socket, { charName } = {}) {
    const username = socket._pendingUsername;
    if (!username) { socket.emit('auth_err', { message: 'Session expired. Refresh and try again.' }); return; }
    const safeName = (charName || username).trim().replace(/[^a-zA-Z0-9 _-]/g, '').slice(0, 20) || username;
    this.chars.create(username, safeName);
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
  }

  async _cmdAttack(socket, username, query) {
    if (!query) { this._feed(socket, 'error', 'Attack what?'); return; }
    const char = this.chars.get(username);
    if (!char) return;

    const monster = this.spawner.findInRoom(char.room_id, query);
    if (!monster) { this._feed(socket, 'error', `No "${query}" here.`); return; }

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

    // Monster retaliation
    if (!res.dead) {
      if (res.monsterHit) {
        this._roomBroadcast(char.room_id, 'combat_monster', {
          text: `🩸 ${res.defenderName} retaliates! ${res.monsterDamage} dmg → ${char.name}: ${res.attackerHp}/${res.attackerMaxHp} HP`,
        });
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
      this._broadcastRoomData(char.room_id);
      // Advance world XP
      this.world.collectiveXp += res.xpGained;
      this._checkAgeTransition();
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
    const room  = ROOMS[char.room_id];
    const gold  = this.gold.balance(username);
    const lines = [
      `── ${char.name}  Lv.${char.level} ──────────────`,
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
      '  trade reaper         Trade with The Reaper',
      '  explore              Search the room (once per day)',
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
      const pool   = ExploreData.EXPLORE_ITEM_POOLS[Math.min(ageMin, 3)] || ExploreData.EXPLORE_ITEM_POOLS[0];
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
    this.world.ageName     = nextAge?.name     || `Age ${this.world.currentAge + 1}`;
    this.world.nextAgeAt   = nextAge?.xp_threshold || 9_999_999;
    this.world.collectiveXp = 0;
    this.world.save?.();
    this.reaper.setAge(this.world.ageName);
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
      is_founder: char.is_founder || false,
      pet       : char.pet        || null,
    };
  }
}

module.exports = GameEngine;
