'use strict';

const fs   = require('fs');
const path = require('path');

class GoldBridge {
  /**
   * File mode (local dev):  new GoldBridge(goldFilePath, logger)
   * Supabase mode (Render): new GoldBridge(null, logger, chars.charStore())
   *
   * charStore = { chars, persist(k) } from CharacterManager.charStore().
   * In Supabase mode gold lives inside the character object (chars[k].gold)
   * so it's persisted atomically with the rest of the character on every save.
   */
  constructor(goldFilePath, logger, charStore = null) {
    this.log         = logger;
    this._charStore  = charStore;
    if (charStore) return; // Supabase mode — no file needed

    this._file = goldFilePath;
    if (!fs.existsSync(this._file)) {
      const local = path.resolve(path.join(path.dirname(this._file), '..', 'data', 'gold.json'));
      this._file  = local;
      this.log?.warn(`[GoldBridge] SirLoin gold.json not found — using local: ${local}`);
    }
  }

  // ── File-mode helpers ─────────────────────────────────────────────────────

  _read() {
    try {
      if (!fs.existsSync(this._file)) return { balances: {}, jackpot: 0 };
      return JSON.parse(fs.readFileSync(this._file, 'utf8'));
    } catch (e) {
      this.log?.warn(`[GoldBridge] Read error: ${e.message}`);
      return { balances: {}, jackpot: 0 };
    }
  }

  _write(data) {
    try {
      const dir = path.dirname(this._file);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const tmp = this._file + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
      fs.renameSync(tmp, this._file);
    } catch (e) {
      this.log?.warn(`[GoldBridge] Write error: ${e.message}`);
    }
  }

  // ── Public API (sync in both modes) ──────────────────────────────────────

  balance(username) {
    if (this._charStore) {
      return this._charStore.chars[username.toLowerCase()]?.gold || 0;
    }
    return this._read().balances[username.toLowerCase()] || 0;
  }

  award(username, amount) {
    if (this._charStore) {
      const k    = username.toLowerCase();
      const char = this._charStore.chars[k];
      if (!char) return 0;
      char.gold = (char.gold || 0) + Math.floor(amount);
      this._charStore.persist(k);
      return char.gold;
    }
    const data = this._read();
    const k    = username.toLowerCase();
    data.balances[k] = (data.balances[k] || 0) + Math.floor(amount);
    this._write(data);
    return data.balances[k];
  }

  spend(username, amount) {
    if (this._charStore) {
      const k    = username.toLowerCase();
      const char = this._charStore.chars[k];
      if (!char || (char.gold || 0) < amount) return false;
      char.gold -= amount;
      this._charStore.persist(k);
      return true;
    }
    const data = this._read();
    const k    = username.toLowerCase();
    const bal  = data.balances[k] || 0;
    if (bal < amount) return false;
    data.balances[k] = bal - amount;
    this._write(data);
    return true;
  }

  give(from, to, amount) {
    if (this._charStore) {
      const fromK = from.toLowerCase();
      const toK   = to.toLowerCase();
      const fromChar = this._charStore.chars[fromK];
      const toChar   = this._charStore.chars[toK];
      if (!fromChar || !toChar || (fromChar.gold || 0) < amount) return false;
      fromChar.gold = (fromChar.gold || 0) - amount;
      toChar.gold   = (toChar.gold   || 0) + amount;
      this._charStore.persist(fromK);
      this._charStore.persist(toK);
      return true;
    }
    const data  = this._read();
    const fromK = from.toLowerCase();
    const toK   = to.toLowerCase();
    if ((data.balances[fromK] || 0) < amount) return false;
    data.balances[fromK] -= amount;
    data.balances[toK]    = (data.balances[toK] || 0) + amount;
    this._write(data);
    return true;
  }

  static fmt(n) {
    return Number(n).toLocaleString('en-GB') + 'g';
  }
}

module.exports = GoldBridge;
