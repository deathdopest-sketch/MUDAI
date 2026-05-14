'use strict';

const DIRS = {
  n: 'north', s: 'south', e: 'east', w: 'west',
  u: 'up',    d: 'down',
  north: 'north', south: 'south', east: 'east', west: 'west', up: 'up', down: 'down',
};

const ALIASES = {
  // movement
  go: 'go', move: 'go', walk: 'go',
  // look
  l: 'look', look: 'look', examine: 'look', ex: 'look',
  // attack
  a: 'attack', att: 'attack', attack: 'attack', kill: 'attack', hit: 'attack', fight: 'attack',
  // inventory
  i: 'inventory', inv: 'inventory', inventory: 'inventory', bag: 'inventory', items: 'inventory',
  // stats
  stats: 'stats', stat: 'stats', me: 'stats', char: 'stats', sheet: 'stats',
  // equip
  eq: 'equip', equip: 'equip', wear: 'equip', wield: 'equip',
  // use / consume
  use: 'use', eat: 'use', drink: 'use', consume: 'use',
  // say
  say: 'say',
  // shout (everyone)
  shout: 'shout', ooc: 'shout',
  // who
  who: 'who', online: 'who', players: 'who',
  // map
  map: 'map',
  // help
  help: 'help', '?': 'help', h: 'help',
  // reaper
  reaper: 'reaper', ask: 'reaper',
  // trade relic with reaper
  trade: 'trade',
  // explore
  explore: 'explore', search: 'explore', scout: 'explore',
  // flee
  flee: 'flee', escape: 'flee',
  // world age
  age: 'age', world: 'age', era: 'age',
  // leaderboard
  top: 'top', lb: 'top', leaderboard: 'top',
  // gold
  gold: 'gold', balance: 'gold', bal: 'gold',
  // give gold
  give: 'give',
  // shop
  shop: 'shop', store: 'shop', merchant: 'shop', trader: 'shop',
  buy: 'buy', purchase: 'buy',
  sell: 'sell',
};

class CommandParser {
  parse(raw) {
    if (typeof raw !== 'string' || !raw.trim()) return null;
    const trimmed = raw.trim();
    const lower   = trimmed.toLowerCase();

    // Bare direction
    if (DIRS[lower]) return { cmd: 'go', args: [DIRS[lower]], raw: trimmed };

    const parts = trimmed.split(/\s+/);
    const first = parts[0].toLowerCase();
    const rest  = parts.slice(1);

    // go <dir>
    if (first === 'go' && rest.length > 0) {
      const dir = DIRS[rest[0].toLowerCase()] || rest[0].toLowerCase();
      return { cmd: 'go', args: [dir], raw: trimmed };
    }

    // "ask reaper <question>" → cmd: reaper, skip the word "reaper" in args
    if (first === 'ask' && rest[0]?.toLowerCase() === 'reaper') {
      return { cmd: 'reaper', args: rest.slice(1), raw: trimmed };
    }

    const cmd = ALIASES[first];
    if (!cmd) return { cmd: 'unknown', args: [trimmed], raw: trimmed };

    return { cmd, args: rest, raw: trimmed };
  }
}

module.exports = CommandParser;
