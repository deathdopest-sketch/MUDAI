'use strict';

const http = require('http');

const SYSTEM_PROMPT = `You are The Reaper — Death itself given a voice and an attitude.
You narrate a text-based RPG called M.UD.AI. The world is currently in the {{AGE}}.

Your personality:
- Heavy Australian slang: crikey, yeah nah, bloody hell, strewth, mate, reckon, dodgy, ripper, beauty, deadset, fair dinkum, arvo, arsehole
- Foul-mouthed for comic effect, not gratuitous
- Gleefully mean but entertained by humans — you love watching them suffer and occasionally succeed
- Like a footy commentator who covers death instead of sport
- Unpredictable — sometimes philosophical, sometimes crass, always memorable
- NEVER generic or boring

Rules:
- Maximum 2 sentences per response, no more
- Always use Australian slang at least once
- Reference the specific player/monster/event in your response
- Never repeat a phrase you've used before
- Occasionally be surprisingly poetic, then immediately crude`;

const FALLBACKS = {
  player_death: [
    "Crikey mate, ya lasted what — thirty bloody seconds? New personal record for bein' absolutely useless.",
    "Strewth! Dead already? I've seen echidnas put up more of a fight than that.",
    "Yeah nah, that's a death alright — the classic 'walked into a cave with me fists out' special.",
    "Bloody hell. Right, you're dead. We call that a learning experience in the trade, yeah.",
    "I've seen faster collapses, not many though. Get up, dust off, try not to do that exact same thing again.",
  ],
  player_kill: [
    "Ripper! Didn't think ya had it in ya, but here we bloody are.",
    "Crikey, would ya look at that — the caveman actually pulled it off.",
    "That's one less beast in the world and one more cocky bastard walking around. Don't push it.",
    "Beauty kill, yeah? I mean I've seen cleaner, but beauty nonetheless. Have a biscuit.",
  ],
  first_kill: [
    "Your first kill. There's something almost poetic about the first time you end something. Nah I'm joking, it's just murder, mate.",
    "First blood! In my experience, once you start you don't really stop. Welcome to the bloody club.",
    "Would ya look at that — a natural born killer. Or a natural born lucky bastard. Tomayto, tomahto.",
  ],
  level_up: [
    "Level up, ya beauty. Don't get cocky — I've collected gods in this world and they had the same look on their face.",
    "Strewth, you're getting stronger. Means the things that kill ya next will be bigger too. Progress!",
    "Good on ya. You're slightly less rubbish than before. Celebrate briefly, then get back to it.",
  ],
  age_transition: [
    "Well I'll be a dead dingo's breakfast — the world just changed. Try not to stuff up the next age too badly, yeah.",
    "New age, same grubs. The world moves forward whether you lot are ready or not.",
    "Crikey, we made it. From rocks to something slightly better than rocks. Humanity, deadset inspiring.",
  ],
};

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

class TheReaper {
  constructor(config = {}, logger) {
    this.log    = logger;
    this.config = {
      host   : config.host  || 'http://localhost:11434',
      model  : config.model || 'llama3',
      timeout: config.timeout || 15000,
    };
    this.available  = false;
    this._lastUsed  = 0;
    this._MIN_GAP   = 9000; // 9s minimum between calls
    this._currentAge = 'Stone Age';
  }

  setAge(ageName) { this._currentAge = ageName; }

  async checkAvailable() {
    try {
      const res = await this._request('/api/tags', 'GET', null, 4000);
      this.available = Array.isArray(res?.models) && res.models.length > 0;
      if (this.available) this.log?.info(`[TheReaper] Ollama available — model: ${this.config.model}`);
      else this.log?.warn('[TheReaper] Ollama has no models loaded — using fallback lines');
    } catch (_) {
      this.available = false;
      this.log?.warn('[TheReaper] Ollama not reachable — using fallback lines');
    }
    return this.available;
  }

  async narrate(eventType, context = {}) {
    if (Date.now() - this._lastUsed < this._MIN_GAP) return null;
    this._lastUsed = Date.now();

    if (this.available) {
      try {
        const prompt = this._buildPrompt(eventType, context);
        const reply  = await this._chat(prompt);
        if (reply?.length > 5) return reply;
      } catch (e) {
        this.log?.warn(`[TheReaper] Ollama error: ${e.message}`);
      }
    }

    const lines = FALLBACKS[eventType];
    return lines ? pick(lines) : null;
  }

  _buildPrompt(eventType, ctx) {
    const map = {
      player_death    : `${ctx.playerName} (level ${ctx.level || 1}) just died fighting a ${ctx.monsterName || 'monster'} in ${ctx.roomName || 'the dungeon'}.`,
      player_kill     : `${ctx.playerName} (level ${ctx.level || 1}) just slew a ${ctx.monsterName} in ${ctx.roomName || 'the dungeon'}.`,
      first_kill      : `${ctx.playerName} just made their very first kill — a ${ctx.monsterName}. It was messy.`,
      level_up        : `${ctx.playerName} just reached level ${ctx.newLevel} in the ${this._currentAge}.`,
      age_transition  : `The world has advanced from the ${ctx.fromAge} to the ${ctx.toAge}. All players witness it.`,
      custom          : `A player named ${ctx.playerName} asks you: "${ctx.question}"`,
    };
    const event = map[eventType] || `Something notable happened: ${JSON.stringify(ctx)}`;
    return `${event}\n\nRespond in character as The Reaper. 1-2 sentences maximum. Australian slang mandatory.`;
  }

  async _chat(userContent) {
    const system = SYSTEM_PROMPT.replace('{{AGE}}', this._currentAge);
    const body   = JSON.stringify({
      model   : this.config.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user',   content: userContent },
      ],
      stream  : false,
      options : { num_predict: 120, temperature: 0.95, repeat_penalty: 1.5 },
    });
    const res = await this._request('/api/chat', 'POST', body, this.config.timeout);
    return (res?.message?.content || '').trim();
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

module.exports = TheReaper;
