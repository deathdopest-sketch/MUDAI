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
const SessionManager   = require('./SessionManager');
const GoldBridge       = require('./economy/GoldBridge');
const MudAnnouncer     = require('./MudAnnouncer');
const GameEngine       = require('./GameEngine');

const DATA_DIR   = path.join(__dirname, '..', 'data');
const CLIENT_DIR = path.join(__dirname, '..', 'client');
const PORT       = process.env.PORT || 3000;
const GOLD_FILE  = process.env.GOLD_FILE ||
  path.join(__dirname, '..', '..', 'SirLoin_v1', 'SirLoin_Data', 'gold.json');
const WS_FILE    = path.join(DATA_DIR, 'world_state.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ── File-based world state (local mode) ──────────────────────────────────────
function loadWorldFromFile() {
  try {
    if (fs.existsSync(WS_FILE)) return JSON.parse(fs.readFileSync(WS_FILE, 'utf8'));
  } catch (_) {}
  return { currentAge: 0, ageName: 'Stone Age', collectiveXp: 0, nextAgeAt: 50000 };
}

function makeFileSave(worldState) {
  return () => {
    try {
      const tmp = WS_FILE + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify({
        currentAge  : worldState.currentAge,
        ageName     : worldState.ageName,
        collectiveXp: worldState.collectiveXp,
        nextAgeAt   : worldState.nextAgeAt,
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
      { currentAge: 0, ageName: 'Stone Age', collectiveXp: 0, nextAgeAt: 50000 };
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
    host : process.env.OLLAMA_HOST  || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'llama3',
  }, log);
  const sessions = new SessionManager();
  const combat   = new CombatEngine(chars, spawner, gold, log);

  spawner.init();
  reaper.checkAvailable();
  reaper.setAge(worldState.ageName);

  // ── HTTP server ─────────────────────────────────────────────────────────────
  const app    = express();
  const server = http.createServer(app);
  const io     = new Server(server, { cors: { origin: '*' } });

  app.use(express.json());
  app.use(express.static(CLIENT_DIR));
  app.get('/', (_, res) => res.sendFile(path.join(CLIENT_DIR, 'index.html')));

  app.get('/health', (_, res) => res.json({
    status : 'ok',
    age    : worldState.ageName,
    online : sessions.count(),
    reaper : reaper.available,
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

  const engine = new GameEngine({
    io, chars, spawner, combat, reaper, sessions, gold, worldState, announcer, logger: log,
  });
  io.on('connection', socket => engine.onConnect(socket));

  // Auto-save world state every 5 minutes
  setInterval(() => worldState.save(), 5 * 60 * 1000);

  server.listen(PORT, () => {
    log.info(`\n  M.UD.AI running → http://localhost:${PORT}\n`);
  });
}

main().catch(err => {
  console.error('[Boot] Fatal:', err);
  process.exit(1);
});
