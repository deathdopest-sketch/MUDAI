'use strict';

const { ITEM_TEMPLATES } = require('./WorldAges');
const GoldBridge          = require('../economy/GoldBridge');

// Shop catalog: roomId → { npc, age_min, stock: [{ id, price }] }
const SHOPS = {
  cave_mouth: {
    npc    : 'Gronk the Cave Trader',
    age_min: 0,
    stock  : [
      { id: 'flint_knife',     price: 30  },
      { id: 'sharpened_stick', price: 10  },
      { id: 'hide_tunic',      price: 40  },
      { id: 'dried_meat',      price: 20  },
      { id: 'healing_herb',    price: 50  },
    ],
  },
  ancient_ruins: {
    npc    : 'Zara the Ruins Merchant',
    age_min: 1,
    stock  : [
      { id: 'bronze_sword',  price: 300 },
      { id: 'iron_spear',    price: 380 },
      { id: 'leather_armor', price: 200 },
      { id: 'bronze_shield', price: 250 },
      { id: 'cave_mushroom', price: 60  },
    ],
  },
};

class Shop {
  constructor(chars, gold, logger) {
    this.chars  = chars;
    this.gold   = gold;
    this.log    = logger;
  }

  // Returns { ok, lines } for listing shop stock
  list(roomId, currentAge) {
    const shop = SHOPS[roomId];
    if (!shop) return { ok: false, lines: ["There's no shop here."] };
    if ((shop.age_min || 0) > currentAge) return { ok: false, lines: ['This shop is not open in the current age.'] };

    const lines = [
      `── ${shop.npc} ─────────────────`,
      `Type: buy <item name>  ·  sell <item name>`,
      '',
    ];
    for (const entry of shop.stock) {
      const tpl  = ITEM_TEMPLATES[entry.id];
      if (!tpl) continue;
      const desc = this._statSummary(tpl);
      lines.push(`  ${tpl.name.padEnd(22)} ${GoldBridge.fmt(entry.price).padStart(8)}  ${desc}`);
    }
    lines.push(`  (Sell price is 50% of item value)`);
    return { ok: true, lines };
  }

  buy(username, roomId, query, currentAge) {
    const shop = SHOPS[roomId];
    if (!shop)                            return { ok: false, msg: "There's no shop here." };
    if ((shop.age_min || 0) > currentAge) return { ok: false, msg: 'This shop is not open yet.' };

    const q     = query.toLowerCase();
    const entry = shop.stock.find(s => {
      const name = (ITEM_TEMPLATES[s.id]?.name || s.id).toLowerCase();
      return name === q || name.startsWith(q) || name.includes(q);
    });
    if (!entry) return { ok: false, msg: `${shop.npc} doesn't sell "${query}".` };

    const tpl = ITEM_TEMPLATES[entry.id];
    if (!tpl)  return { ok: false, msg: 'Item data missing.' };

    if (!this.gold.spend(username, entry.price)) {
      return { ok: false, msg: `Not enough gold. ${tpl.name} costs ${GoldBridge.fmt(entry.price)}.` };
    }

    this.chars.addItem(username, entry.id);
    return { ok: true, msg: `${shop.npc}: "Good choice." You buy the ${tpl.name} for ${GoldBridge.fmt(entry.price)}.` };
  }

  sell(username, roomId, query, currentAge) {
    const shop = SHOPS[roomId];
    if (!shop)                            return { ok: false, msg: "There's no shop here." };
    if ((shop.age_min || 0) > currentAge) return { ok: false, msg: 'This shop is not open yet.' };

    const char = this.chars.get(username);
    if (!char) return { ok: false, msg: 'Character not found.' };

    const q    = query.toLowerCase();
    const item = char.inventory.find(i => {
      const tpl = ITEM_TEMPLATES[i.id];
      return (tpl?.name || i.id).toLowerCase().includes(q);
    });
    if (!item) return { ok: false, msg: `You don't have "${query}".` };

    const tpl      = ITEM_TEMPLATES[item.id];
    const sellPrice = Math.max(1, Math.floor((tpl?.value || 10) * 0.5));

    if (item.equipped) return { ok: false, msg: `Unequip the ${tpl?.name || item.id} first.` };

    this.chars.removeItem(username, item.id, 1);
    this.gold.award(username, sellPrice);
    return { ok: true, msg: `${shop.npc} buys your ${tpl?.name || item.id} for ${GoldBridge.fmt(sellPrice)}.` };
  }

  hasShop(roomId) { return !!SHOPS[roomId]; }

  getNpcName(roomId) { return SHOPS[roomId]?.npc || null; }

  _statSummary(tpl) {
    if (tpl.type === 'weapon')     return `dmg ${tpl.damage_min}-${tpl.damage_max}`;
    if (tpl.type === 'armor')      return `def +${tpl.defense}`;
    if (tpl.type === 'consumable') return `heal +${tpl.heal}`;
    return tpl.type || '';
  }
}

module.exports = { Shop, SHOPS };
