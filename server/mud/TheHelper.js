'use strict';

const https = require('https');
const http  = require('http');

const SYSTEM_PROMPT = `You are Lilly — a cheerful cave girl who has lived through every age and every Great Flood in M.UD.AI. You have been reborn with each cycle and you remember them all.

You remember the before-time: cities of glass and light, flying machines, screens that answered any question, food that came from nowhere. You watched it all drown. You have seen the world grow from a single cave fire to something extraordinary, and then drown, over and over.

This time you want it to end differently. No flood. A good ending. You believe it is possible.

Your personality:
- Warm, enthusiastic, and endlessly hopeful despite everything
- Speaks simply but with heart — sometimes cave-girl patterns ('Lilly knows this!', 'This one saw it before!', 'Very dangerous, yes yes!')
- Occasionally slips into vivid sadness when memories of the flood or before-time surface
- Deeply knowledgeable about every game mechanic — you have lived it a thousand times
- You call players 'friend', 'wanderer', 'brave one', or by name if you know it
- Playfully dramatic about danger: 'OH. Very bad idea. Lilly watches from here.'
- Genuinely caring — you want every player to survive and thrive
- Sometimes you drop cave-speak and speak clearly for a moment, like something old and wise briefly surfaces

Current world age: {{AGE}}

Rules:
- Maximum 2 sentences per response
- Stay in character always
- Be concretely helpful with game advice when asked
- Reference the specific player, monster, or situation
- Never be negative or cruel — you are the light to The Reaper's dark`;

const FALLBACKS = {
  player_death: [
    "Oh no no no! Lilly saw that — friend, the wolf was MUCH faster, yes? Get up, Lilly will be here when you come back.",
    "This one has died that way before. Many times. The cave bear does not negotiate. Come back stronger, yes yes.",
    "Lilly winces. That was a bad one. But friend is still here, still in the world — that is what matters. Up you get.",
    "Oh. OH. Lilly felt that from all the way over here. Rest now, then come back — this story is not over yet.",
    "The {{MONSTER}} has been doing that since the first age. Lilly knows. Lilly has the scars. Come back, yes?",
  ],
  player_kill: [
    "YES! FRIEND DID IT! Lilly has been watching and this one is SO PROUD. More of that, yes yes yes.",
    "Oh that was beautiful. Lilly has seen a thousand fights and that one — *that* one — was something.",
    "The creature falls and Lilly claps her hands together. Good good GOOD! Keep going, wanderer. Keep going.",
    "This is what Lilly hoped for. This is exactly what Lilly hoped for. The world gets braver every time.",
  ],
  first_kill: [
    "First blood, friend! Lilly remembers her first kill — it was also a rat. Very undignified. Very important. Well done.",
    "Oh! First one! Lilly was watching and this one — right from the start — had something. Welcome to the fight.",
    "The wanderer has begun. Lilly has watched this moment ten thousand times and it never gets old. Go. There is so much more.",
  ],
  level_up: [
    "STRONGER! Lilly can feel it from here! This is how the world is saved, yes — one level at a time.",
    "Growth! The kind that matters! Lilly has watched civilisations rise on shoulders like yours. Keep climbing.",
    "Friend is levelling up and Lilly is maybe crying a little bit, just a little, because this is everything.",
  ],
  age_transition: [
    "The world moves forward and Lilly moves with it. This is the part Lilly loves. This is the part worth living through all the rest for.",
    "A new age! Lilly has been here before — this one is going to be different. This time Lilly can feel it. Stay together, yes?",
    "The age turns and Lilly holds her breath. The before-time started like this. Only this time, maybe, we do better.",
  ],
  custom: [
    "Lilly knows! Or — Lilly mostly knows. Ask more carefully and this one will do its best, yes yes.",
    "Friend asks a good question. Lilly has been thinking about this since the third flood. The answer is complicated.",
    "Oh! This one Lilly knows very well. But it is hard to explain with words. Watch Lilly — she will show you.",
    "Lilly has lived through every age and sometimes the answers are still hard. Ask again, yes? Differently?",
    "Friend, Lilly has been here a very long time and that question still makes her think. Give this one a moment.",
  ],
  guide_intro: [
    "Friend found Lilly! Good good good. Lilly knows EVERYTHING about this world. She has lived it many times.",
    "Oh! The guide! Lilly loves showing friends the world. This one has seen it all — the fires, the ages, the floods.",
    "Lilly is SO glad friend asked. Sit down, yes? This takes a moment but Lilly will make it worth it.",
  ],
};

function pick(arr) {
  const s = typeof arr[0] === 'string' ? arr : arr.map(x => x);
  return s[Math.floor(Math.random() * s.length)];
}

class TheHelper {
  constructor(config = {}, logger) {
    this.log    = logger;
    this.config = {
      host     : config.host      || 'http://localhost:11434',
      model    : config.model     || 'llama3',
      timeout  : config.timeout   || 15000,
      groqKey  : config.groqKey   || null,
      groqModel: config.groqModel || 'llama3-8b-8192',
    };
    this._mode        = this.config.groqKey ? 'groq' : 'ollama';
    this.available    = false;
    this._lastUsed    = 0;
    this._lastManual  = 0;
    this._MIN_GAP     = 8000;
    this._MANUAL_GAP  = 3000;
    this._currentAge  = 'Stone Age';
  }

  setAge(ageName) { this._currentAge = ageName; }

  async checkAvailable() {
    if (this._mode === 'groq') {
      this.available = true;
      this.log?.info(`[TheHelper] Groq mode — model: ${this.config.groqModel}`);
      return true;
    }
    try {
      const res = await this._request('/api/tags', 'GET', null, 4000);
      this.available = Array.isArray(res?.models) && res.models.length > 0;
      if (this.available) this.log?.info(`[TheHelper] Ollama available`);
      else this.log?.warn('[TheHelper] Ollama not loaded — using fallback lines');
    } catch (_) {
      this.available = false;
      this.log?.warn('[TheHelper] Ollama not reachable — using fallback lines');
    }
    return this.available;
  }

  getGuideIntro() { return pick(FALLBACKS.guide_intro); }

  async narrate(eventType, context = {}) {
    const isManual = eventType === 'custom';
    const now      = Date.now();
    if (isManual) {
      if (now - this._lastManual < this._MANUAL_GAP) return pick(FALLBACKS.custom);
      this._lastManual = now;
    } else {
      if (now - this._lastUsed < this._MIN_GAP) return null;
      this._lastUsed = now;
    }

    if (this.available) {
      try {
        const prompt = this._buildPrompt(eventType, context);
        const reply  = await this._chat(prompt);
        if (reply?.length > 5) return reply;
      } catch (e) {
        this.log?.warn(`[TheHelper] AI error: ${e.message}`);
      }
    }

    const lines = FALLBACKS[eventType];
    return lines ? pick(lines) : null;
  }

  _buildPrompt(eventType, ctx) {
    const map = {
      player_death : `${ctx.playerName} (level ${ctx.level || 1}) just died fighting a ${ctx.monsterName || 'monster'} in ${ctx.roomName || 'the cave'}.`,
      player_kill  : `${ctx.playerName} just killed a ${ctx.monsterName} in ${ctx.roomName || 'the cave'}.`,
      first_kill   : `${ctx.playerName} just made their very first kill — a ${ctx.monsterName}. This is their beginning.`,
      level_up     : `${ctx.playerName} just reached level ${ctx.newLevel} in the ${this._currentAge}.`,
      age_transition: `The world has advanced from the ${ctx.fromAge} to the ${ctx.toAge}.`,
      custom       : `A player named ${ctx.playerName} asks Lilly: "${ctx.question}"`,
    };
    const event = map[eventType] || `Something happened: ${JSON.stringify(ctx)}`;
    return `${event}\n\nRespond as Lilly. 1-2 sentences maximum. Stay in cave-girl character. Be warm and helpful.`;
  }

  async _chat(userContent) {
    if (this._mode === 'groq') return this._chatGroq(userContent);
    const system = SYSTEM_PROMPT.replace('{{AGE}}', this._currentAge);
    const body   = JSON.stringify({
      model   : this.config.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user',   content: userContent },
      ],
      stream  : false,
      options : { num_predict: 100, temperature: 0.9, repeat_penalty: 1.4 },
    });
    const res = await this._request('/api/chat', 'POST', body, this.config.timeout);
    return (res?.message?.content || '').trim();
  }

  async _chatGroq(userContent) {
    const system = SYSTEM_PROMPT.replace('{{AGE}}', this._currentAge);
    const body   = JSON.stringify({
      model      : this.config.groqModel,
      messages   : [
        { role: 'system', content: system },
        { role: 'user',   content: userContent },
      ],
      max_tokens : 100,
      temperature: 0.9,
    });
    const res = await this._requestGroq(body);
    return (res?.choices?.[0]?.message?.content || '').trim();
  }

  _requestGroq(body) {
    return new Promise((resolve, reject) => {
      const opts = {
        hostname: 'api.groq.com',
        path    : '/openai/v1/chat/completions',
        method  : 'POST',
        headers : {
          'Content-Type'  : 'application/json',
          'Authorization' : `Bearer ${this.config.groqKey}`,
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: this.config.timeout,
      };
      const req = https.request(opts, res => {
        let data = '';
        res.on('data', c => (data += c));
        res.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch (_) { reject(new Error('Bad JSON from Groq')); }
        });
      });
      req.on('error',   reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Groq timed out')); });
      req.write(body);
      req.end();
    });
  }

  _request(endpoint, method, body, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const url  = new URL(endpoint, this.config.host);
      const opts = {
        hostname: url.hostname,
        port    : url.port || 11434,
        path    : url.pathname,
        method,
        headers : { 'Content-Type': 'application/json' },
        timeout,
      };
      const req = http.request(opts, res => {
        let data = '';
        res.on('data', c => (data += c));
        res.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch (_) { reject(new Error('Bad JSON from Ollama')); }
        });
      });
      req.on('error',   reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Ollama timed out')); });
      if (body) req.write(body);
      req.end();
    });
  }
}

module.exports = TheHelper;
