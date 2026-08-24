/**
 * myplaylist_storage.js — Zarzadzanie danymi: localStorage + synchronizacja z GitHub API
 * Utworzono: 2026-08-24 | Projekt: Mojaplaylista v1.0
 */
const MPStorage = {
  _KEY: 'mp_library',
  _SETTINGS_KEY: 'mp_settings',

  _defaultData() {
    return {
      version: '1.0',
      exportDate: new Date().toISOString(),
      songs: [],
      categories: [],
      tags: []
    };
  },

  _defaultSettings() {
    return {
      theme: 'light',
      language: 'pl',
      githubRepo: '',
      githubToken: '',
      githubFile: 'library.json',
      lastfmApiKey: ''
    };
  },

  /* ---- localStorage ---- */
  loadLibrary() {
    try {
      const raw = localStorage.getItem(this._KEY);
      if (!raw) return this._defaultData();
      const data = JSON.parse(raw);
      return { ...this._defaultData(), ...data };
    } catch (e) {
      console.error('[storage] loadLibrary error:', e);
      return this._defaultData();
    }
  },

  saveLibrary(data) {
    data.exportDate = new Date().toISOString();
    localStorage.setItem(this._KEY, JSON.stringify(data));
  },

  loadSettings() {
    try {
      const raw = localStorage.getItem(this._SETTINGS_KEY);
      if (!raw) return this._defaultSettings();
      return { ...this._defaultSettings(), ...JSON.parse(raw) };
    } catch { return this._defaultSettings(); }
  },

  saveSettings(settings) {
    localStorage.setItem(this._SETTINGS_KEY, JSON.stringify(settings));
  },

  /* ---- Songs CRUD ---- */
  getSongs() { return this.loadLibrary().songs; },

  addSongs(newSongs) {
    const lib = this.loadLibrary();
    const existingIds = new Set(lib.songs.map(s => s.id));
    let added = 0, dupes = 0, merged = 0;
    for (const song of newSongs) {
      if (existingIds.has(song.id)) {
        const idx = lib.songs.findIndex(s => s.id === song.id);
        if (idx >= 0) {
          lib.songs[idx] = this._mergeSong(lib.songs[idx], song);
          merged++;
        }
        dupes++;
      } else {
        lib.songs.push(song);
        existingIds.add(song.id);
        added++;
      }
    }
    this.saveLibrary(lib);
    return { added, dupes, merged };
  },

  updateSong(id, updates) {
    const lib = this.loadLibrary();
    const idx = lib.songs.findIndex(s => s.id === id);
    if (idx >= 0) {
      lib.songs[idx] = { ...lib.songs[idx], ...updates };
      this.saveLibrary(lib);
    }
  },

  deleteSong(id) {
    const lib = this.loadLibrary();
    lib.songs = lib.songs.filter(s => s.id !== id);
    this.saveLibrary(lib);
  },

  clearAllSongs() {
    const lib = this.loadLibrary();
    lib.songs = [];
    this.saveLibrary(lib);
  },

  _mergeSong(existing, incoming) {
    return {
      ...existing,
      artists: existing.artists || incoming.artists,
      album: existing.album || incoming.album,
      duration: existing.duration || incoming.duration,
      liked: existing.liked || incoming.liked,
      playTimeMs: Math.max(existing.playTimeMs || 0, incoming.playTimeMs || 0),
      sources: [...new Set([...(existing.sources || []), ...(incoming.sources || [])])],
      originalPlaylists: [...new Set([
        ...(existing.originalPlaylists || []),
        ...(incoming.originalPlaylists || [])
      ])],
    };
  },

  /* ---- Categories & Tags ---- */
  getCategories() { return this.loadLibrary().categories; },
  getTags() { return this.loadLibrary().tags; },

  addCategory(name, color = '#00B4D8') {
    const lib = this.loadLibrary();
    const id = 'cat_' + Date.now();
    lib.categories.push({ id, name, color });
    this.saveLibrary(lib);
    return id;
  },

  deleteCategory(id) {
    const lib = this.loadLibrary();
    lib.categories = lib.categories.filter(c => c.id !== id);
    lib.songs.forEach(s => {
      if (s.categories) s.categories = s.categories.filter(c => c !== id);
    });
    this.saveLibrary(lib);
  },

  addTag(name) {
    const lib = this.loadLibrary();
    if (!lib.tags.includes(name)) {
      lib.tags.push(name);
      this.saveLibrary(lib);
    }
  },

  deleteTag(name) {
    const lib = this.loadLibrary();
    lib.tags = lib.tags.filter(t => t !== name);
    lib.songs.forEach(s => {
      if (s.tags) s.tags = s.tags.filter(t => t !== name);
    });
    this.saveLibrary(lib);
  },

  /* ---- Full export/import ---- */
  exportJSON() {
    const lib = this.loadLibrary();
    lib.settings = this.loadSettings();
    return JSON.stringify(lib, null, 2);
  },

  importJSON(jsonString) {
    const data = JSON.parse(jsonString);
    if (data.settings) {
      const { githubToken, lastfmApiKey, ...safeToCopy } = data.settings;
      const current = this.loadSettings();
      this.saveSettings({ ...current, ...safeToCopy });
    }
    const lib = {
      version: data.version || '1.0',
      exportDate: data.exportDate || new Date().toISOString(),
      songs: data.songs || [],
      categories: data.categories || [],
      tags: data.tags || [],
    };
    this.saveLibrary(lib);
    return lib.songs.length;
  },

  /* ---- GitHub sync ---- */
  async githubPull() {
    const s = this.loadSettings();
    if (!s.githubRepo || !s.githubToken) throw new Error('GitHub not configured');
    const url = `https://api.github.com/repos/${s.githubRepo}/contents/${s.githubFile}`;
    const resp = await fetch(url, {
      headers: { 'Authorization': `token ${s.githubToken}`, 'Accept': 'application/vnd.github.v3+json' }
    });
    if (resp.status === 404) throw new Error('File not found in repo');
    if (!resp.ok) throw new Error(`GitHub API: ${resp.status}`);
    const json = await resp.json();
    const content = atob(json.content.replace(/\n/g, ''));
    return this.importJSON(content);
  },

  async githubPush() {
    const s = this.loadSettings();
    if (!s.githubRepo || !s.githubToken) throw new Error('GitHub not configured');
    const url = `https://api.github.com/repos/${s.githubRepo}/contents/${s.githubFile}`;
    let sha = null;
    try {
      const existing = await fetch(url, {
        headers: { 'Authorization': `token ${s.githubToken}`, 'Accept': 'application/vnd.github.v3+json' }
      });
      if (existing.ok) { sha = (await existing.json()).sha; }
    } catch {}
    const content = btoa(unescape(encodeURIComponent(this.exportJSON())));
    const body = { message: `MyPlaylist sync ${new Date().toISOString()}`, content };
    if (sha) body.sha = sha;
    const resp = await fetch(url, {
      method: 'PUT',
      headers: { 'Authorization': `token ${s.githubToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!resp.ok) throw new Error(`GitHub push: ${resp.status}`);
  },

  /* ---- Reset ---- */
  resetAll() {
    localStorage.removeItem(this._KEY);
    localStorage.removeItem(this._SETTINGS_KEY);
  }
};
