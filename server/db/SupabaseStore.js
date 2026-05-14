'use strict';

const { createClient } = require('@supabase/supabase-js');

class SupabaseStore {
  constructor(url, key, logger) {
    this.log = logger;
    this.db  = createClient(url.trim(), key.replace(/\s/g, ''));
  }

  // ── Characters ──────────────────────────────────────────────────────────────

  _rowToChar(row) {
    if (!row) return null;
    return {
      username  : row.username,
      name      : row.name,
      level     : row.level,
      xp        : row.xp,
      xp_next   : row.xp_next,
      hp        : row.hp,
      max_hp    : row.max_hp,
      str       : row.str,
      dex       : row.dex,
      con       : row.con,
      room_id   : row.room_id,
      age_born  : row.age_born,
      inventory : row.inventory,
      kills     : row.kills,
      deaths    : row.deaths,
      gold         : row.gold || 0,
      password_hash: row.password_hash || null,
      is_founder   : row.is_founder   || false,
      founder_lore : row.founder_lore || null,
      pet          : row.pet          || null,
      created_at   : new Date(row.created_at).getTime(),
      last_seen    : new Date(row.last_seen).getTime(),
    };
  }

  _charToRow(char) {
    return {
      username : char.username.toLowerCase(),
      name     : char.name,
      level    : char.level,
      xp       : char.xp,
      xp_next  : char.xp_next,
      hp       : char.hp,
      max_hp   : char.max_hp,
      str      : char.str,
      dex      : char.dex,
      con      : char.con,
      room_id  : char.room_id,
      age_born : char.age_born,
      inventory: char.inventory,
      kills    : char.kills,
      deaths   : char.deaths,
      gold        : char.gold || 0,
      is_founder  : char.is_founder  || false,
      founder_lore: char.founder_lore || null,
      pet         : char.pet          || null,
      last_seen   : new Date(char.last_seen || Date.now()).toISOString(),
      ...(char.password_hash ? { password_hash: char.password_hash } : {}),
    };
  }

  async getChar(username) {
    const { data, error } = await this.db
      .from('mud_characters')
      .select('*')
      .eq('username', username.toLowerCase())
      .maybeSingle();
    if (error) { this.log?.warn(`[SupabaseStore] getChar: ${error.message}`); return null; }
    return this._rowToChar(data);
  }

  async getAllChars() {
    const { data, error } = await this.db.from('mud_characters').select('*');
    if (error) { this.log?.warn(`[SupabaseStore] getAllChars: ${error.message}`); return []; }
    return (data || []).map(r => this._rowToChar(r));
  }

  async saveChar(char) {
    const { error } = await this.db
      .from('mud_characters')
      .upsert(this._charToRow(char), { onConflict: 'username' });
    if (error) this.log?.warn(`[SupabaseStore] saveChar: ${error.message}`);
  }

  // ── World state ────────────────────────────────────────────────────────────

  async getWorldState() {
    const { data, error } = await this.db
      .from('mud_world_state')
      .select('*')
      .eq('id', 1)
      .maybeSingle();
    if (error || !data) return null;
    return {
      currentAge  : data.current_age,
      ageName     : data.age_name,
      collectiveXp: Number(data.collective_xp),
      nextAgeAt   : Number(data.next_age_at),
    };
  }

  async saveWorldState(state) {
    const { error } = await this.db
      .from('mud_world_state')
      .update({
        current_age  : state.currentAge,
        age_name     : state.ageName,
        collective_xp: state.collectiveXp,
        next_age_at  : state.nextAgeAt,
      })
      .eq('id', 1);
    if (error) this.log?.warn(`[SupabaseStore] saveWorldState: ${error.message}`);
  }

  // ── Events ─────────────────────────────────────────────────────────────────

  async addEvent(evt) {
    const { error } = await this.db
      .from('mud_events')
      .insert({ id: evt.id, type: evt.type, message: evt.message });
    if (error) this.log?.warn(`[SupabaseStore] addEvent: ${error.message}`);
  }

  async getUnannounced() {
    const { data, error } = await this.db
      .from('mud_events')
      .select('id, type, message, posted_at')
      .eq('announced', false)
      .order('posted_at', { ascending: true });
    if (error) { this.log?.warn(`[SupabaseStore] getUnannounced: ${error.message}`); return []; }
    return data || [];
  }

  async markAnnounced(id) {
    const { error } = await this.db
      .from('mud_events')
      .update({ announced: true, announced_at: new Date().toISOString() })
      .eq('id', id);
    if (error) this.log?.warn(`[SupabaseStore] markAnnounced: ${error.message}`);
  }
}

module.exports = SupabaseStore;
