'use strict';

class SessionManager {
  constructor() {
    this._sessions = new Map(); // socketId → { username, roomId, joinedAt }
    this._byUser   = new Map(); // username.toLowerCase() → socketId
  }

  add(socketId, username, roomId) {
    const k = username.toLowerCase();
    const existing = this._byUser.get(k);
    if (existing && existing !== socketId) this._sessions.delete(existing);
    this._sessions.set(socketId, { username, roomId, joinedAt: Date.now() });
    this._byUser.set(k, socketId);
  }

  remove(socketId) {
    const s = this._sessions.get(socketId);
    if (s) this._byUser.delete(s.username.toLowerCase());
    this._sessions.delete(socketId);
    return s || null;
  }

  getBySocket(socketId) { return this._sessions.get(socketId) || null; }

  getByUser(username) {
    const sid = this._byUser.get(username.toLowerCase());
    if (!sid) return null;
    return { ...this._sessions.get(sid), socketId: sid };
  }

  setRoom(socketId, roomId) {
    const s = this._sessions.get(socketId);
    if (s) s.roomId = roomId;
  }

  getRoom(socketId) { return this._sessions.get(socketId)?.roomId || null; }

  getOnline() {
    return [...this._sessions.values()].map(s => ({ username: s.username, roomId: s.roomId }));
  }

  isOnline(username) { return this._byUser.has(username.toLowerCase()); }

  count() { return this._sessions.size; }
}

module.exports = SessionManager;
