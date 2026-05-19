'use strict';

require('dotenv').config();

const path    = require('path');
const fs      = require('fs');
const http    = require('http');
const express = require('express');
const { Server } = require('socket.io');

const CharacterManager = require('./mud/CharacterManager');
const MonsterSpawner   = require('./mud/MonsterSpawner');
const CombatEngine     = require('./mud/CombatEngine');
const TheReaper        = require('./mud/TheReaper');
const TheHelper        = require('./mud/TheHelper');
const BotManager       = require('./mud/BotManager');
const FloodSystem      = require('./mud/FloodSystem');
const SessionManager   = require('./SessionManager');
const GoldBridge       = require('./economy/GoldBridge');
const MudAnnouncer     = require('./MudAnnouncer');
const GameEngine       = require('./GameEngine');

const DATA_DIR   = path.join(__dirname, '..', 'data');
const CLIENT_DIR = path.join(__dirname, '..', 'client');
const PORT       = process.env.PORT || 3000;
const GOLD_FILE  = process.env.GOLD_FILE || path.join(DATA_DIR, 'gold.json');
const WS_FILE    = path.join(DATA_DIR, 'world_state.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ── File-based world state (local mode) ──────────────────────────────────────
function loadWorldFromFile() {
  try {
    if (fs.existsSync(WS_FILE)) {
      const state = JSON.parse(fs.readFileSync(WS_FILE, 'utf8'));
      if (state.fire_discovered === undefined) state.fire_discovered = state.currentAge > 0;
      if (!Array.isArray(state.discoveries)) state.discoveries = [];
      if (state.fire_xp_threshold === undefined) state.fire_xp_threshold = 500;
      return state;
    }
  } catch (_) {}
  return { currentAge: 0, ageName: 'Stone Age', collectiveXp: 0, nextAgeAt: 50000, fire_discovered: false, fire_xp_threshold: 500, discoveries: [] };
}

function makeFileSave(worldState) {
  return () => {
    try {
      const tmp = WS_FILE + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify({
        currentAge       : worldState.currentAge,
        ageName          : worldState.ageName,
        collectiveXp     : worldState.collectiveXp,
        nextAgeAt        : worldState.nextAgeAt,
        fire_discovered  : worldState.fire_discovered  || false,
        fire_xp_threshold: worldState.fire_xp_threshold || 500,
        discoveries      : worldState.discoveries       || [],
      }, null, 2));
      fs.renameSync(tmp, WS_FILE);
    } catch (_) {}
  };
}

// ── Bootstrap ────────────────────────────────────────────────────────────────
async function main() {
  const log = console;

  // Supabase — active when SUPABASE_URL is set (Render deployment)
  let store = null;
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    const SupabaseStore = require('./db/SupabaseStore');
    store = new SupabaseStore(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, log);
    log.info('[Boot] Supabase store enabled');
  }

  // World state
  let worldState;
  if (store) {
    worldState = (await store.getWorldState()) ||
      { currentAge: 0, ageName: 'Stone Age', collectiveXp: 0, nextAgeAt: 50000, fire_discovered: false };
    if (worldState.fire_discovered === undefined) worldState.fire_discovered = worldState.currentAge > 0;
    if (!Array.isArray(worldState.discoveries)) worldState.discoveries = [];
    worldState.fire_xp_threshold = 500;
    worldState.save = () => {
      store.saveWorldState(worldState).catch(e =>
        log.warn(`[Boot] World state save failed: ${e.message}`)
      );
    };
  } else {
    worldState = loadWorldFromFile();
    worldState.save = makeFileSave(worldState);
  }

  // Characters
  const chars = new CharacterManager(DATA_DIR, log, store);
  await chars.init();

  // Gold — charStore mode when Supabase, file mode otherwise
  const gold = store
    ? new GoldBridge(null, log, chars.charStore())
    : new GoldBridge(GOLD_FILE, log);

  // Events announcer
  const announcer = store
    ? new MudAnnouncer(null, log, store)
    : new MudAnnouncer(process.env.EVENTS_FILE || null, log);

  // Other systems
  const spawner  = new MonsterSpawner(log);
  const reaper   = new TheReaper({
    host     : process.env.OLLAMA_HOST  || 'http://localhost:11434',
    model    : process.env.OLLAMA_MODEL || 'llama3',
    groqKey  : process.env.GROQ_API_KEY || null,
    groqModel: process.env.GROQ_MODEL   || 'llama3-8b-8192',
  }, log);
  const helper   = new TheHelper({
    host     : process.env.OLLAMA_HOST  || 'http://localhost:11434',
    model    : process.env.OLLAMA_MODEL || 'llama3',
    groqKey  : process.env.GROQ_API_KEY || null,
    groqModel: process.env.GROQ_MODEL   || 'llama3-8b-8192',
  }, log);
  const sessions = new SessionManager();
  const combat   = new CombatEngine(chars, spawner, gold, log);

  spawner.init();
  reaper.checkAvailable();
  helper.checkAvailable();
  reaper.setAge(worldState.ageName);
  helper.setAge(worldState.ageName);

  // Reload any founder lore from previous floods into The Reaper's memory
  const founderMemories = chars.getAllFounderLore();
  if (founderMemories.length) reaper.setFounderMemories(founderMemories);

  // ── HTTP server ─────────────────────────────────────────────────────────────
  const app    = express();
  const server = http.createServer(app);
  const io     = new Server(server, {
    cors        : { origin: '*' },
    pingTimeout : 60000,
    pingInterval: 25000,
  });

  app.use(express.json());
  app.use(express.static(CLIENT_DIR));
  app.get('/', (_, res) => res.sendFile(path.join(CLIENT_DIR, 'index.html')));

  app.get('/health', (_, res) => res.json({
    status : 'ok',
    age    : worldState.ageName,
    online : sessions.count(),
    reaper : reaper.available,
    helper : helper.available,
    store  : store ? 'supabase' : 'file',
  }));

  // Events API — consumed by SirLoin's MudWatcher when MUDAI is on Render
  app.get('/events', async (_, res) => {
    try {
      const events = await Promise.resolve(announcer.getUnannounced());
      res.json(events);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch('/events/:id/announced', async (req, res) => {
    try {
      await Promise.resolve(announcer.markAnnounced(req.params.id));
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  const flood = new FloodSystem({ chars, worldState, reaper, io, logger: log });

  const bots  = new BotManager({ io, chars, sessions, worldState, logger: log });
  await bots.init();

  const engine = new GameEngine({
    io, chars, spawner, combat, reaper, helper, bots, sessions, gold, worldState, announcer, flood, logger: log,
  });
  io.on('connection', socket => engine.onConnect(socket));
  engine.startTicks();
  bots.start();

  // Auto-save world state every 5 minutes
  setInterval(() => worldState.save(), 5 * 60 * 1000);

  server.listen(PORT, () => {
    log.info(`\n  M.UD.AI running → http://localhost:${PORT}\n`);

    // Keep Render free-tier alive — ping own /health every 14 min to prevent spin-down
    if (process.env.NODE_ENV === 'production') {
      setInterval(() => {
        http.get(`http://localhost:${PORT}/health`, res => {
          res.resume(); // drain the response so the socket closes cleanly
        }).on('error', () => {}); // swallow — server may not be fully ready on first tick
      }, 14 * 60 * 1000);
    }
  });
}

main().catch(err => {
  console.error('[Boot] Fatal:', err);
  process.exit(1);
});
