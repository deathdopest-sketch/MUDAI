'use strict';

const { MONSTER_TEMPLATES } = require('./WorldAges');
const { ROOMS }              = require('./WorldMap');

let _counter = 0;
function genId() { return `m_${Date.now()}_${++_counter}`; }

class MonsterSpawner {
  constructor(logger) {
    this.log      = logger;
    this._monsters = new Map(); // instanceId → instance
  }

  init() {
    for (const room of Object.values(ROOMS)) {
      if (!room.monster_templates?.length) continue;
      const perTemplate = Math.ceil((room.max_monsters || 0) / room.monster_templates.length);
      for (const tplId of room.monster_templates) {
        for (let i = 0; i < perTemplate; i++) this._spawn(tplId, room.id);
      }
    }
    this.log?.info(`[MonsterSpawner] Spawned ${this._monsters.size} monsters across ${Object.keys(ROOMS).length} rooms`);
  }

  _spawn(templateId, roomId) {
    const tpl = MONSTER_TEMPLATES[templateId];
    if (!tpl) return null;
    const inst = {
      instance_id : genId(),
      template_id : templateId,
      name        : tpl.name,
      hp          : tpl.hp,
      max_hp      : tpl.hp,
      room_id     : roomId,
      spawned_at  : Date.now(),
    };
    this._monsters.set(inst.instance_id, inst);
    return inst;
  }

  getInstance(id) { return this._monsters.get(id) || null; }

  getMonstersInRoom(roomId) {
    return [...this._monsters.values()].filter(m => m.room_id === roomId);
  }

  findInRoom(roomId, query) {
    const q      = query.toLowerCase().trim();
    const inRoom = this.getMonstersInRoom(roomId);
    return (
      inRoom.find(m => m.name.toLowerCase() === q) ||
      inRoom.find(m => m.name.toLowerCase().startsWith(q)) ||
      inRoom.find(m => m.template_id.toLowerCase().includes(q)) ||
      inRoom.find(m => m.name.toLowerCase().includes(q)) ||
      null
    );
  }

  // Returns true if monster is now dead
  damageMonster(instanceId, amount) {
    const m = this._monsters.get(instanceId);
    if (!m) return true;
    m.hp = Math.max(0, m.hp - amount);
    return m.hp === 0;
  }

  removeMonster(instanceId) {
    const m = this._monsters.get(instanceId);
    if (!m) return;
    this._monsters.delete(instanceId);
    // Schedule respawn
    const room = ROOMS[m.room_id];
    if (!room) return;
    const tpl      = MONSTER_TEMPLATES[m.template_id];
    const delayMs  = (tpl?.respawn_min || 10) * 60 * 1000;
    setTimeout(() => {
      const current = this.getMonstersInRoom(m.room_id).length;
      if (current < (room.max_monsters || 0)) {
        this._spawn(m.template_id, m.room_id);
        this.log?.debug(`[MonsterSpawner] Respawned ${m.template_id} in ${m.room_id}`);
      }
    }, delayMs);
  }
}

module.exports = MonsterSpawner;
