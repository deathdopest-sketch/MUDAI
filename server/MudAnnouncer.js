'use strict';

const fs   = require('fs');
const path = require('path');

class MudAnnouncer {
  /**
   * File mode (local dev):  new MudAnnouncer(eventsFilePath, logger)
   * Supabase mode (Render): new MudAnnouncer(null, logger, store)
   */
  constructor(eventsFilePath, logger, store = null) {
    this.log      = logger;
    this._store   = store;
    this._file    = eventsFilePath;
    this._enabled = !!(store || eventsFilePath);
  }

  announce(type, message) {
    if (!this._enabled) return;
    const evt = {
      id       : `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      message,
      posted_at: Date.now(),
      announced: false,
    };
    if (this._store) {
      this._store.addEvent(evt).catch(e =>
        this.log?.warn(`[MudAnnouncer] Supabase write failed: ${e.message}`)
      );
    } else {
      this._writeFile(evt);
    }
  }

  // Returns a Promise in Supabase mode, plain array in file mode
  getUnannounced() {
    if (this._store) return this._store.getUnannounced();
    const events = this._readFile();
    return events.filter(e => !e.announced);
  }

  // Returns a Promise in Supabase mode, void in file mode
  markAnnounced(id) {
    if (this._store) return this._store.markAnnounced(id);
    const events = this._readFile();
    const evt = events.find(e => e.id === id);
    if (evt) {
      evt.announced    = true;
      evt.announced_at = Date.now();
      this._writeFile(null, events);
    }
  }

  // ── File helpers ──────────────────────────────────────────────────────────

  _readFile() {
    try {
      if (!fs.existsSync(this._file)) return [];
      return JSON.parse(fs.readFileSync(this._file, 'utf8'));
    } catch (_) { return []; }
  }

  _writeFile(newEvt, existingEvents = null) {
    try {
      const dir = path.dirname(this._file);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      let events = existingEvents || this._readFile();
      if (newEvt) {
        events.push(newEvt);
        events = events.slice(-50); // keep last 50
      }
      const tmp = this._file + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(events, null, 2));
      fs.renameSync(tmp, this._file);
    } catch (e) {
      this.log?.warn(`[MudAnnouncer] Write failed: ${e.message}`);
    }
  }
}

module.exports = MudAnnouncer;
