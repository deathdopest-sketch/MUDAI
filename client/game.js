'use strict';

const socket = io();

// ── State ─────────────────────────────────────────────────────────────────────
let myUsername = null;
let myChar     = null;
let cmdHistory = [];
let historyPos = -1;
let MAX_FEED   = 300; // lines to keep in DOM

// ── DOM refs ──────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

const authOverlay     = $('auth-overlay');
const charOverlay     = $('char-overlay');
const passwordOverlay = $('password-overlay');
const gameEl          = $('game');
const feedEl          = $('feed');
const cmdInput        = $('cmd-input');
const authInput       = $('auth-input');
const authErr         = $('auth-err');
const charInput       = $('char-input');
const passwordInput   = $('password-input');
const passwordIntro   = $('password-intro');
const passwordErr     = $('password-err');
const ageName         = $('age-name');
const ageBar          = $('age-bar');
const agePct          = $('age-pct');
const tbOnline        = $('tb-online');
const onlineList      = $('online-list');
const charDisplay     = $('char-display');
const roomDisplay     = $('room-display');
const invDisplay      = $('inv-display');

let _passwordMode = 'verify'; // 'verify' | 'create'

// ── Connection state ──────────────────────────────────────────────────────────
socket.on('disconnect', () => {
  addFeed('error', 'Connection lost. Reconnecting...');
});

socket.on('connect', () => {
  if (myUsername) addFeed('system', 'Reconnected.');
});

// ── Auth flow ─────────────────────────────────────────────────────────────────
socket.on('request_auth', () => {
  if (myUsername) {
    // Silently re-auth on reconnect — don't interrupt the game
    socket.emit('auth', { username: myUsername });
  } else {
    authOverlay.style.display = 'flex';
  }
});

$('auth-btn').addEventListener('click', submitAuth);
authInput.addEventListener('keydown', e => { if (e.key === 'Enter') submitAuth(); });

function submitAuth() {
  const u = authInput.value.trim();
  if (!u) return;
  authErr.textContent = '';
  socket.emit('auth', { username: u });
}

socket.on('auth_err', ({ message }) => {
  if (passwordOverlay.style.display !== 'none') {
    passwordErr.textContent = message;
    passwordInput.value = '';
    passwordInput.focus();
  } else {
    authErr.textContent = message;
  }
});

// ── Password flow ─────────────────────────────────────────────────────────────
socket.on('needs_password', ({ username }) => {
  _passwordMode = 'verify';
  authOverlay.style.display = 'none';
  charOverlay.style.display = 'none';
  passwordIntro.textContent = `Welcome back, ${username}. Enter your password.`;
  passwordErr.textContent   = '';
  passwordInput.value       = '';
  passwordOverlay.style.display = 'flex';
  setTimeout(() => passwordInput.focus(), 100);
});

socket.on('needs_password_create', ({ username, isNew }) => {
  _passwordMode = 'create';
  authOverlay.style.display = 'none';
  charOverlay.style.display = 'none';
  passwordIntro.textContent = isNew
    ? `One last thing — set a password to protect your account.`
    : `Set a password for ${username} to secure your account.`;
  passwordErr.textContent   = '';
  passwordInput.value       = '';
  passwordOverlay.style.display = 'flex';
  setTimeout(() => passwordInput.focus(), 100);
});

$('password-btn').addEventListener('click', submitPassword);
passwordInput.addEventListener('keydown', e => { if (e.key === 'Enter') submitPassword(); });

function submitPassword() {
  const pw = passwordInput.value;
  if (!pw) return;
  passwordErr.textContent = '';
  if (_passwordMode === 'verify') {
    socket.emit('submit_password', { password: pw });
  } else {
    socket.emit('create_password', { password: pw });
  }
}

socket.on('needs_char_create', ({ username }) => {
  myUsername = username;
  authOverlay.style.display = 'none';
  charOverlay.style.display = 'flex';
  charInput.focus();
});

$('char-btn').addEventListener('click', submitChar);
charInput.addEventListener('keydown', e => { if (e.key === 'Enter') submitChar(); });

function submitChar() {
  const name = charInput.value.trim() || myUsername;
  charOverlay.style.display = 'none';
  socket.emit('create_char', { charName: name });
}

socket.on('auth_ok', ({ username, char, isNew }) => {
  myUsername = username;
  myChar     = char;
  authOverlay.style.display     = 'none';
  charOverlay.style.display     = 'none';
  passwordOverlay.style.display = 'none';
  gameEl.style.display          = 'flex';
  renderChar(char);
  setTimeout(() => cmdInput.focus(), 100);
});

socket.on('kicked', ({ message }) => {
  addFeed('error', message);
});

// ── Feed ──────────────────────────────────────────────────────────────────────
socket.on('feed', ({ type, text }) => {
  addFeed(type, text);
});

function addFeed(type, text) {
  const el  = document.createElement('div');
  el.className = `feed-entry ${type || 'info'}`;
  el.textContent = text;
  feedEl.appendChild(el);
  // Trim old entries
  while (feedEl.children.length > MAX_FEED) feedEl.removeChild(feedEl.firstChild);
  feedEl.parentElement.scrollTop = feedEl.parentElement.scrollHeight;
}

// ── Character updates ─────────────────────────────────────────────────────────
socket.on('char_update', char => {
  if (!char) return;
  myChar = char;
  renderChar(char);
});

function renderChar(char) {
  if (!char) return;

  // HP bar
  const hpPct = Math.max(0, Math.min(100, (char.hp / char.max_hp) * 100));
  const hpColor = hpPct > 60 ? 'var(--green)' : hpPct > 25 ? 'var(--orange)' : 'var(--red)';

  // XP bar
  const xpPct = Math.max(0, Math.min(100, (char.xp / char.xp_next) * 100));

  const founderBadge = char.is_founder
    ? `<span class="founder-badge" title="Survived the Great Flood">🌊 FOUNDER</span>`
    : '';
  const petLine = char.pet === 'flood_wraith'
    ? `<div class="char-pet">👻 Flood Wraith follows you.</div>`
    : char.pet === 'void_pet'
      ? `<div class="char-pet">🌑 The Void seeps around you. You feel it mending your wounds.</div>`
      : '';

  charDisplay.innerHTML = `
    <div class="char-name">${esc(char.name)}${founderBadge}</div>
    <div class="char-level dim">Level ${char.level}</div>
    <div style="margin-top:8px">
      <div class="stat-bar-wrap">
        <span class="stat-label" style="color:var(--red)">HP</span>
        <div class="stat-bar"><div class="stat-fill hp" style="width:${hpPct}%;background:${hpColor}"></div></div>
        <span class="stat-val">${char.hp}/${char.max_hp}</span>
      </div>
      <div class="stat-bar-wrap">
        <span class="stat-label" style="color:var(--blue)">XP</span>
        <div class="stat-bar"><div class="stat-fill xp" style="width:${xpPct}%"></div></div>
        <span class="stat-val">${char.xp}/${char.xp_next}</span>
      </div>
    </div>
    <div class="char-stats-row">STR ${char.str} · DEX ${char.dex} · CON ${char.con}</div>
    <div class="char-gold">💰 ${fmtGold(char.gold)}</div>
    <div class="char-kills dim">${char.kills} kills · ${char.deaths} deaths</div>
    ${petLine}
  `;

  renderInventory(char.inventory || []);
}

function renderInventory(inv) {
  if (!inv.length) { invDisplay.innerHTML = '<span class="dim">Empty.</span>'; return; }
  invDisplay.innerHTML = inv.map(item => {
    const name = item.id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const qty  = (item.quantity || 1) > 1 ? ` ×${item.quantity}` : '';
    const tag  = item.equipped ? ' <span class="inv-tag">[EQ]</span>' : '';
    return `<div class="inv-item${item.equipped ? ' equipped' : ''}">${esc(name)}${qty}${tag}</div>`;
  }).join('');
}

// ── Room panel ────────────────────────────────────────────────────────────────
socket.on('room_data', data => {
  let html = '';
  if (data.exits?.length) {
    html += `<div class="room-exits">Exits: ${data.exits.join(', ')}</div>`;
  }
  if (data.monsters?.length) {
    for (const m of data.monsters) {
      const pct = Math.max(0, Math.min(100, (m.hp / m.max_hp) * 100));
      html += `<div class="room-monster">⚔ ${esc(m.name)} ${m.hp}/${m.max_hp}</div>`;
    }
  } else {
    html += `<div class="dim" style="font-size:11px">No monsters.</div>`;
  }
  roomDisplay.innerHTML = html;
});

// ── World state ───────────────────────────────────────────────────────────────
socket.on('world_state', data => {
  ageName.textContent  = data.ageName || 'Stone Age';
  ageBar.style.width   = `${data.pct || 0}%`;
  agePct.textContent   = `${data.pct || 0}%`;
  tbOnline.textContent = `${(data.online || []).length} online`;

  if (data.online?.length) {
    onlineList.innerHTML = data.online.map(p =>
      `<div class="online-entry">
        <span class="ol-name">${esc(p.name)}</span>
        <span class="ol-room">${esc(p.roomName)}</span>
      </div>`
    ).join('');
  } else {
    onlineList.innerHTML = '<span class="dim">Nobody.</span>';
  }
});

// ── Command input ─────────────────────────────────────────────────────────────
cmdInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const text = cmdInput.value.trim();
    if (!text) return;
    cmdHistory.unshift(text);
    if (cmdHistory.length > 80) cmdHistory.pop();
    historyPos = -1;
    cmdInput.value = '';
    addFeed('info', `> ${text}`);
    socket.emit('command', { text });
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    historyPos = Math.min(historyPos + 1, cmdHistory.length - 1);
    cmdInput.value = cmdHistory[historyPos] || '';
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    historyPos = Math.max(historyPos - 1, -1);
    cmdInput.value = historyPos === -1 ? '' : cmdHistory[historyPos] || '';
  }
});

// Click anywhere in the feed panel to refocus input
document.getElementById('feed-panel').addEventListener('click', () => cmdInput.focus());

// ── Util ──────────────────────────────────────────────────────────────────────
function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function fmtGold(n) {
  return Number(n || 0).toLocaleString('en-GB') + 'g';
}
