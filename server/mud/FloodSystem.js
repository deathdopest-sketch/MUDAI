'use strict';

class FloodSystem {
  constructor({ chars, worldState, reaper, io, logger }) {
    this.chars  = chars;
    this.world  = worldState;
    this.reaper = reaper;
    this.io     = io;
    this.log    = logger;

    // How many registered accounts triggers the flood (override via env)
    this.PLAYER_THRESHOLD = parseInt(process.env.FLOOD_THRESHOLD || '30', 10);
    // World must have advanced at least once before flood is possible
    this.AGE_MIN = 1;

    this._executing      = false;
    this._lastWarnLevel  = 0;  // 0 = none, 1 = 70%, 2 = 85%, 3 = 95%
  }

  // Call this whenever a new player registers or an age transition happens
  check() {
    if (this._executing) return;
    const count = this.chars.allUsernames().length;
    const pct   = count / this.PLAYER_THRESHOLD;

    if (pct >= 1.0 && this.world.currentAge >= this.AGE_MIN) {
      this._execute();
      return;
    }

    this._maybeWarn(pct);
  }

  _maybeWarn(pct) {
    let level = 0;
    if (pct >= 0.95) level = 3;
    else if (pct >= 0.85) level = 2;
    else if (pct >= 0.70) level = 1;

    if (level <= this._lastWarnLevel) return;
    this._lastWarnLevel = level;

    const warnings = {
      1: `💧 The Reaper: "Crikey, the world's getting crowded. Things happen when it gets this crowded. Historically. Just sayin'."`,
      2: `💧 The Reaper: "The water level. It's different than it was yesterday, mate. Different in a way I recognise. Fair dinkum."`,
      3: `💧 The Reaper: "Yeah nah, I'd save ya gold if I were you. Say goodbye to a few things. The flood has a memory and it's been counting."`,
    };

    this.io.emit('feed', { type: 'reaper', text: warnings[level] });
    this.log?.info(`[FloodSystem] Warning level ${level} (${Math.round(pct * 100)}% of threshold)`);
  }

  async _execute() {
    this._executing = true;
    this.log?.info('[FloodSystem] Great Flood triggered');

    // Dramatic sequence
    await this._sequence([
      [0,    'reaper', `💀 The Reaper: "Oh. Oh crikey. Here it comes. Been waitin' for this one since the first age."`],
      [3000, 'system', '🌊 The ground splits. Water seeps from the stone walls, from the earth itself.'],
      [3000, 'reaper', `💀 The Reaper: "The Great Flood. Seen it before, I have. Never gets less beautiful. Deadset spectacular."`],
      [3000, 'system', '🌊 The waters rise. Ancient roots crack. The age fractures apart at its seams.'],
      [3000, 'reaper', `💀 The Reaper: "You were here before the waters. That makes you a Founder. Rare. Hold onto that — it survives the flood."`],
      [3000, 'system', '🌊 THE GREAT FLOOD — The world is being reborn. Your deeds are recorded for eternity.'],
      [4000, 'system', '🌊 The flood recedes. A new Stone Age rises from the deep. Refresh to enter the reborn world.'],
    ]);

    // Capture founder lore + mark all existing players as founders
    const usernames = this.chars.allUsernames();
    const memories  = [];
    for (const k of usernames) {
      const char = this.chars.get(k);
      if (!char) continue;
      char.is_founder   = true;
      char.founder_lore = _generateLore(char);
      memories.push(char.founder_lore);
    }

    // Reset all characters (preserves gold + founder status)
    for (const k of usernames) {
      this.chars.floodReset(k);
    }

    // Reset world state back to Stone Age
    this.world.currentAge  = 0;
    this.world.ageName     = 'Stone Age';
    this.world.collectiveXp = 0;
    this.world.nextAgeAt   = 5000;
    this.world.save?.();

    // Pass memories to Reaper so it can reference them in future narrations
    this.reaper.setFounderMemories(memories);

    // Boot everyone — they'll reconnect fresh
    setTimeout(() => {
      this.io.disconnectSockets(true);
    }, 2000);

    this._executing     = false;
    this._lastWarnLevel = 0;
    this.log?.info(`[FloodSystem] Flood complete — ${usernames.length} founders created`);
  }

  async _sequence(steps) {
    for (const [delay, type, text] of steps) {
      if (delay > 0) await new Promise(r => setTimeout(r, delay));
      this.io.emit('feed', { type, text });
    }
  }
}

function _generateLore(char) {
  if (char.kills >= 50) {
    return `${char.name} slew ${char.kills} creatures before the flood took them. Died ${char.deaths} times getting there. Worth it.`;
  }
  if (char.level >= 8) {
    return `${char.name} reached Level ${char.level} in the old world, ${char.kills} kills to their name. The flood was less impressed.`;
  }
  if (char.deaths >= 15) {
    return `${char.name} died ${char.deaths} times in the old world and came back every single time. The flood was the one they couldn't walk off.`;
  }
  if ((char.gold || 0) >= 500) {
    return `${char.name} had ${Math.floor(char.gold).toLocaleString()} gold saved when the flood hit. They kept it. Funds the new world now.`;
  }
  return `${char.name} was there before the flood. Level ${char.level}, ${char.kills} kills. Small but present. That matters.`;
}

module.exports = FloodSystem;
