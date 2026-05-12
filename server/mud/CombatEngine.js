'use strict';

const { MONSTER_TEMPLATES, ITEM_TEMPLATES } = require('./WorldAges');

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

class CombatEngine {
  constructor(chars, spawner, gold, logger) {
    this.chars   = chars;
    this.spawner = spawner;
    this.gold    = gold;
    this.log     = logger;
    // username.toLowerCase() → monsterInstanceId
    this._active = new Map();
  }

  isInCombat(username) { return this._active.has(username.toLowerCase()); }

  clearCombat(username) { this._active.delete(username.toLowerCase()); }

  async playerAttack(username, monsterInstanceId) {
    const char    = this.chars.get(username);
    const monster = this.spawner.getInstance(monsterInstanceId);
    if (!char)    return { error: 'Character not found.' };
    if (!monster) return { error: 'That target is not here.' };
    if (char.room_id !== monster.room_id) return { error: 'Target is not in your room.' };

    this._active.set(username.toLowerCase(), monsterInstanceId);

    const tpl    = MONSTER_TEMPLATES[monster.template_id];
    const weapon = this._equippedWeapon(char);
    const result = {
      attackerName : char.name,
      defenderName : monster.name,
      attackerHp   : char.hp,
      attackerMaxHp: char.max_hp,
      defenderHp   : monster.hp,
      defenderMaxHp: monster.max_hp,
    };

    // Player attacks monster
    const hitChance = Math.min(0.95, Math.max(0.2, 0.6 + (char.dex - tpl.dex) * 0.05));
    result.hit  = Math.random() < hitChance;
    result.crit = result.hit && Math.random() < 0.12;

    if (result.hit) {
      let dmg = rand(weapon.damage_min, weapon.damage_max) + Math.floor(char.str / 3);
      if (result.crit) dmg = Math.floor(dmg * 2);
      result.damage = Math.max(1, dmg);

      const dead = this.spawner.damageMonster(monsterInstanceId, result.damage);
      const updated = this.spawner.getInstance(monsterInstanceId);
      result.defenderHp = updated?.hp ?? 0;

      if (dead) {
        result.dead = true;
        result.defenderHp = 0;
        this._active.delete(username.toLowerCase());
        this.spawner.removeMonster(monsterInstanceId);

        const xpResult      = this.chars.awardXp(username, tpl.xp);
        result.xpGained     = tpl.xp;
        result.levelUp      = xpResult?.levelled || false;
        result.goldGained   = rand(tpl.gold_min, tpl.gold_max);
        result.loot         = [];
        this.gold.award(username, result.goldGained);

        for (const drop of (tpl.loot || [])) {
          if (Math.random() < drop.chance) {
            this.chars.addItem(username, drop.id);
            result.loot.push(drop.id);
          }
        }
        const fresh = this.chars.get(username);
        this.chars.update(username, { kills: (fresh.kills || 0) + 1 });
        result.totalKills = (fresh.kills || 0) + 1;
      }
    } else {
      result.damage = 0;
    }

    // Monster retaliates if still alive
    if (!result.dead) {
      const defense     = this._defenseValue(char);
      const mHitChance  = Math.min(0.85, Math.max(0.15, 0.5 + (tpl.dex - char.dex) * 0.05));
      result.monsterHit = Math.random() < mHitChance;
      if (result.monsterHit) {
        const rawDmg        = rand(Math.max(1, tpl.str - 2), tpl.str + 2);
        result.monsterDamage = Math.max(1, rawDmg - defense);
        const dmgResult      = this.chars.takeDamage(username, result.monsterDamage);
        result.attackerHp    = dmgResult.hp;
        result.playerDead    = dmgResult.dead;
        if (dmgResult.dead) this._active.delete(username.toLowerCase());
      } else {
        result.monsterDamage = 0;
      }
    }

    result.attackerHp    = this.chars.get(username)?.hp ?? 0;
    result.attackerMaxHp = char.max_hp;
    return result;
  }

  _equippedWeapon(char) {
    const slot = char.inventory?.find(i => i.equipped && i.slot === 'weapon');
    return (slot && ITEM_TEMPLATES[slot.id]) || ITEM_TEMPLATES.fists;
  }

  _defenseValue(char) {
    return (char.inventory || []).reduce((total, i) => {
      if (!i.equipped) return total;
      return total + (ITEM_TEMPLATES[i.id]?.defense || 0);
    }, 0);
  }
}

module.exports = CombatEngine;
