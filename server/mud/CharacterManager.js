'use strict';

const fs   = require('fs');
const path = require('path');
const { ITEM_TEMPLATES } = require('./WorldAges');

const STARTING_ITEMS = [
  { id: 'flint_knife', equipped: true,  slot: 'weapon', quantity: 1 },
  { id: 'hide_tunic',  equipped: true,  slot: 'body',   quantity: 1 },
  { id: 'dried_meat',  equipped: false, slot: null,     quantity: 2 },
];

function calcMaxHp(level, con) {
  return 20 + (con * 5) + (level - 1) * 8;
}

function xpForNextLevel(level) {
  return Math.floor(100 * Math.pow(1.4, level - 1));
}

class CharacterManager {
  constructor(dataDir, logger, store = null) {
    this.log    = logger;
    this._file  = path.join(dataDir, 'characters.json');
    this._chars = {};
    this._store = store;
    if (!store) this.load();
  }

  // In Supabase mode: hydrate the in-memory cache from DB.
  // In file mode: already loaded in constructor — safe no-op.
  async init() {
    if (!this._store) return;
    const all = await this._store.getAllChars();
    this._chars = {};
    for (const char of all) this._chars[char.username.toLowerCase()] = char;
    this.log?.info(`[CharacterManager] Loaded ${all.length} characters from Supabase`);
  }

  // Expose the raw cache + persist callback for GoldBridge (charStore pattern)
  charStore() {
    return {
      chars  : this._chars,
      persist: k => this._persist(k),
    };
  }

  load() {
    try {
      if (fs.existsSync(this._file)) {
        this._chars = JSON.parse(fs.readFileSync(this._file, 'utf8'));
        this.log?.info(`[CharacterManager] Loaded ${Object.keys(this._chars).length} characters`);
      }
    } catch (e) {
      this.log?.warn(`[CharacterManager] Load failed: ${e.message}`);
    }
  }

  save() {
    try {
      const tmp = this._file + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(this._chars, null, 2));
      fs.renameSync(tmp, this._file);
    } catch (e) {
      this.log?.warn(`[CharacterManager] Save failed: ${e.message}`);
    }
  }

  _persist(k) {
    if (this._store) {
      this._store.saveChar(this._chars[k]).catch(e =>
        this.log?.warn(`[CharacterManager] Supabase save failed: ${e.message}`)
      );
    } else {
      this.save();
    }
  }

  exists(username) { return !!this._chars[username.toLowerCase()]; }

  get(username) { return this._chars[username.toLowerCase()] || null; }

  getPasswordHash(username) {
    return this._chars[username.toLowerCase()]?.password_hash || null;
  }

  async setPasswordHash(username, hash) {
    const k = username.toLowerCase();
    if (!this._chars[k]) return;
    this._chars[k].password_hash = hash;
    if (this._store) {
      await this._store.saveChar(this._chars[k]);
    } else {
      this.save();
    }
  }

  create(username, charName) {
    const k   = username.toLowerCase();
    const con = 5;
    const char = {
      username,
      name        : charName,
      level       : 1,
      xp          : 0,
      xp_next     : xpForNextLevel(1),
      hp          : calcMaxHp(1, con),
      max_hp      : calcMaxHp(1, con),
      str         : 5,
      dex         : 5,
      con,
      room_id     : 'cave_mouth',
      age_born    : 0,
      inventory   : JSON.parse(JSON.stringify(STARTING_ITEMS)),
      kills       : 0,
      deaths      : 0,
      gold        : 0,
      is_founder  : false,
      founder_lore: null,
      pet         : null,
      created_at  : Date.now(),
      last_seen   : Date.now(),
    };
    this._chars[k] = char;
    this._persist(k);
    return char;
  }

  // Called by FloodSystem — wipes all progress but keeps gold, founder status, and password
  floodReset(username) {
    const k    = username.toLowerCase();
    const char = this._chars[k];
    if (!char) return null;

    const isFounder  = char.is_founder  || false;
    const founderLore = char.founder_lore || null;
    const gold       = char.gold        || 0;
    const password_hash = char.password_hash || null;
    const pet        = isFounder ? 'flood_wraith' : null;

    // Founders get +3 to all base stats as a permanent perk
    const str = isFounder ? 8 : 5;
    const dex = isFounder ? 8 : 5;
    const con = isFounder ? 8 : 5;

    const inv = JSON.parse(JSON.stringify(STARTING_ITEMS));
    if (isFounder) {
      inv.push({ id: 'flood_wraith',       equipped: false, slot: null,     quantity: 1 });
      inv.push({ id: 'flood_blade',        equipped: false, slot: 'weapon', quantity: 1 });
      inv.push({ id: 'before_time_armor',  equipped: false, slot: 'body',   quantity: 1 });
    }

    Object.assign(char, {
      level       : 1,
      xp          : 0,
      xp_next     : xpForNextLevel(1),
      hp          : calcMaxHp(1, con),
      max_hp      : calcMaxHp(1, con),
      str, dex, con,
      room_id     : 'cave_mouth',
      age_born    : 0,
      inventory   : inv,
      kills       : 0,
      deaths      : 0,
      gold,
      is_founder  : isFounder,
      founder_lore: founderLore,
      pet,
      password_hash,
      last_seen   : Date.now(),
    });

    this._persist(k);
    return char;
  }

  allUsernames() {
    return Object.keys(this._chars);
  }

  getAllFounderLore() {
    return Object.values(this._chars)
      .filter(c => c.is_founder && c.founder_lore)
      .map(c => c.founder_lore);
  }

  update(username, changes) {
    const k = username.toLowerCase();
    if (!this._chars[k]) return null;
    Object.assign(this._chars[k], changes, { last_seen: Date.now() });
    this._persist(k);
    return this._chars[k];
  }

  moveToRoom(username, roomId) {
    return this.update(username, { room_id: roomId });
  }

  awardXp(username, amount) {
    const k    = username.toLowerCase();
    const char = this._chars[k];
    if (!char) return null;
    char.xp += amount;
    let levelled = false;
    while (char.xp >= char.xp_next) {
      char.xp    -= char.xp_next;
      char.level += 1;
      char.str   += 1;
      char.dex   += 1;
      char.con   += 1;
      char.max_hp = calcMaxHp(char.level, char.con);
      char.hp     = char.max_hp;
      char.xp_next = xpForNextLevel(char.level);
      levelled = true;
    }
    char.last_seen = Date.now();
    this._persist(k);
    return { char, levelled };
  }

  addItem(username, itemId, quantity = 1) {
    const k    = username.toLowerCase();
    const char = this._chars[k];
    if (!char) return false;
    const existing = char.inventory.find(i => i.id === itemId && !i.equipped);
    if (existing) {
      existing.quantity = (existing.quantity || 1) + quantity;
    } else {
      char.inventory.push({ id: itemId, equipped: false, slot: null, quantity });
    }
    this._persist(k);
    return true;
  }

  removeItem(username, itemId, quantity = 1) {
    const k    = username.toLowerCase();
    const char = this._chars[k];
    if (!char) return false;
    const idx = char.inventory.findIndex(i => i.id === itemId);
    if (idx === -1) return false;
    const item = char.inventory[idx];
    if ((item.quantity || 1) <= quantity) {
      char.inventory.splice(idx, 1);
    } else {
      item.quantity -= quantity;
    }
    this._persist(k);
    return true;
  }

  equipItem(username, itemId) {
    const k    = username.toLowerCase();
    const char = this._chars[k];
    if (!char) return { ok: false, msg: 'No character.' };
    const tpl = ITEM_TEMPLATES[itemId];
    if (!tpl?.slot) return { ok: false, msg: 'That cannot be equipped.' };
    if (tpl.founder_only && !char.is_founder) {
      return { ok: false, msg: `The ${tpl.name} resists your grip — it belongs to an earlier world. Perhaps The Reaper knows what to do with it.`, relicHint: true };
    }
    const invItem = char.inventory.find(i => i.id === itemId && !i.equipped);
    if (!invItem) return { ok: false, msg: "You don't have that unequipped." };
    char.inventory.forEach(i => {
      if (i.equipped && i.slot === tpl.slot) { i.equipped = false; i.slot = null; }
    });
    invItem.equipped = true;
    invItem.slot     = tpl.slot;
    this._persist(k);
    return { ok: true, msg: `You equip the ${tpl.name}.` };
  }

  heal(username, amount) {
    const k    = username.toLowerCase();
    const char = this._chars[k];
    if (!char) return 0;
    const old = char.hp;
    char.hp   = Math.min(char.max_hp, char.hp + amount);
    this._persist(k);
    return char.hp - old;
  }

  takeDamage(username, amount) {
    const k    = username.toLowerCase();
    const char = this._chars[k];
    if (!char) return { hp: 0, dead: false };
    char.hp = Math.max(0, char.hp - amount);
    const dead = char.hp === 0;
    if (dead) char.deaths = (char.deaths || 0) + 1;
    this._persist(k);
    return { hp: char.hp, dead };
  }

  respawn(username) {
    const k    = username.toLowerCase();
    const char = this._chars[k];
    if (!char) return null;
    char.hp      = Math.max(1, Math.floor(char.max_hp * 0.3));
    char.room_id = 'cave_mouth';
    this._persist(k);
    return char;
  }

  leaderboard(n = 10) {
    return Object.values(this._chars)
      .sort((a, b) => b.level !== a.level ? b.level - a.level : b.xp - a.xp)
      .slice(0, n);
  }
}

module.exports = CharacterManager;
