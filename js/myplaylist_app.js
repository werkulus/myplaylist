/**
 * myplaylist_app.js — Glowny modul inicjalizacji, routing, event bus
 * Utworzono: 2026-08-24 | Projekt: Mojaplaylista v1.0
 */
const MPApp = {
  _currentView: 'library',

  async init() {
    await MPi18n.init();
    this._applyTheme(MPStorage.loadSettings().theme || 'light');
    this._bindNav();
    this._bindHeader();
    this._bindDropzone();
    this._renderSongList();
    this._updateStats();
    MPDetail.init();
    MPCategories.init();
    MPFilter.init();
    this.navigate('library');
  },

  /* ---- Theme ---- */
  _applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const s = MPStorage.loadSettings();
    s.theme = theme;
    MPStorage.saveSettings(s);
    const btn = document.getElementById('themeToggle');
    if (btn) btn.textContent = theme === 'light' ? '🌙' : '☀️';
  },

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    this._applyTheme(current === 'light' ? 'dark' : 'light');
  },

  /* ---- Navigation ---- */
  _bindNav() {
    document.querySelectorAll('[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.navigate(btn.getAttribute('data-nav'));
        // Close mobile sidebar
        document.getElementById('sidebar')?.classList.remove('mp-sidebar--open');
      });
    });
  },

  navigate(view) {
    this._currentView = view;
    document.querySelectorAll('[data-nav]').forEach(btn => {
      btn.classList.toggle('mp-nav__item--active', btn.getAttribute('data-nav') === view);
    });
    document.querySelectorAll('[data-view]').forEach(section => {
      section.style.display = section.getAttribute('data-view') === view ? '' : 'none';
    });
    if (view === 'categories' && typeof MPCategories !== 'undefined') MPCategories.render();
    if (view === 'stats' && typeof MPStats !== 'undefined') MPStats.render();
  },

  /* ---- Header ---- */
  _bindHeader() {
    document.getElementById('themeToggle')?.addEventListener('click', () => this.toggleTheme());
    document.getElementById('langToggle')?.addEventListener('click', () => MPi18n.toggle());
    document.getElementById('hamburger')?.addEventListener('click', () => {
      document.getElementById('sidebar')?.classList.toggle('mp-sidebar--open');
    });
    document.getElementById('importCSVBtn')?.addEventListener('click', () => this._triggerFileInput('csv'));
    document.getElementById('importJSONBtn')?.addEventListener('click', () => this._triggerFileInput('json'));
    document.getElementById('exportJSONBtn')?.addEventListener('click', () => this._exportJSON());
    document.getElementById('exportCSVBtn')?.addEventListener('click', () => this._exportCSV());
    document.getElementById('exportFilteredBtn')?.addEventListener('click', () => MPExport.filteredCSV());
    document.getElementById('exportMetrolistBtn')?.addEventListener('click', () => this._exportMetrolist());
    document.getElementById('exportM3UBtn')?.addEventListener('click', () => MPExport.filteredM3U());
    document.getElementById('clearLibraryBtn')?.addEventListener('click', () => this._clearLibrary());
    document.getElementById('importTakeoutBtn')?.addEventListener('click', () => this._triggerFileInput('csv'));
    document.getElementById('searchInput')?.addEventListener('input', (e) => this._onSearch(e.target.value));
    document.getElementById('sortSelect')?.addEventListener('change', (e) => this._onSort(e.target.value));

    // Settings
    document.getElementById('saveSettingsBtn')?.addEventListener('click', () => this._saveSettings());
    document.getElementById('githubPullBtn')?.addEventListener('click', () => this._githubPull());
    document.getElementById('githubPushBtn')?.addEventListener('click', () => this._githubPush());
    document.getElementById('resetAllBtn')?.addEventListener('click', () => this._resetAll());

    // Load settings into form
    this._loadSettingsForm();
  },

  /* ---- Dropzone ---- */
  _bindDropzone() {
    const dz = document.getElementById('dropzone');
    if (!dz) return;
    const fileInput = document.getElementById('fileInput');
    dz.addEventListener('click', () => fileInput?.click());
    dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('mp-dropzone--active'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('mp-dropzone--active'));
    dz.addEventListener('drop', (e) => {
      e.preventDefault(); dz.classList.remove('mp-dropzone--active');
      if (e.dataTransfer.files.length) this._handleFile(e.dataTransfer.files[0]);
    });
    fileInput?.addEventListener('change', (e) => {
      if (e.target.files.length) this._handleFile(e.target.files[0]);
      e.target.value = '';
    });
  },

  _triggerFileInput(type) {
    const fi = document.getElementById('fileInput');
    if (fi) { fi.accept = type === 'csv' ? '.csv' : '.json'; fi.click(); }
  },

  /* ---- File handling ---- */
  _handleFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      try {
        if (file.name.endsWith('.json')) {
          // Try as MyPlaylist JSON first, then YouTube Takeout JSON
          try {
            const data = MPCsvImport.parseJSON(text);
            const count = MPStorage.importJSON(JSON.stringify(data));
            this._toast(`${MPi18n.t('import.success', { count })}`, 'success');
          } catch {
            const songs = MPYtTakeout.autoImport(text, file.name);
            if (songs.length === 0) { this._toast(MPi18n.t('import.error', { message: 'Invalid JSON' }), 'error'); return; }
            const result = MPStorage.addSongs(songs);
            this._toast(`YouTube Takeout: ${result.added} added`, 'success');
          }
        } else {
          // Try extractor CSV first, then YouTube Takeout CSV
          let songs = MPCsvImport.autoParseCSV(text);
          if (songs.length === 0) {
            songs = MPYtTakeout.autoImport(text, file.name);
          }
          if (songs.length === 0) { this._toast(MPi18n.t('import.error', { message: 'No songs found' }), 'error'); return; }
          const result = MPStorage.addSongs(songs);
          let msg = MPi18n.t('import.success', { count: result.added });
          if (result.merged > 0) msg += ` · ${MPi18n.t('import.merge', { count: result.merged })}`;
          if (result.dupes > 0) msg += ` · ${MPi18n.t('import.duplicate', { count: result.dupes })}`;
          this._toast(msg, 'success');
        }
        this._renderSongList();
        this._updateStats();
      } catch (err) {
        this._toast(MPi18n.t('import.error', { message: err.message }), 'error');
      }
    };
    reader.readAsText(file);
  },

  /* ---- Song list rendering ---- */
  _renderSongList(filter = '', sortBy = 'title') {
    this._renderFilteredSongList(filter, sortBy);
  },

  _renderFilteredSongList(filter = '', sortBy = 'title') {
    const container = document.getElementById('songList');
    if (!container) return;
    let songs = MPStorage.getSongs();

    // Apply chip filters
    if (typeof MPFilter !== 'undefined') {
      songs = MPFilter.filterSongs(songs);
      MPFilter.renderFilterBar();
    }

    // Apply text search
    if (filter) {
      const q = filter.toLowerCase();
      songs = songs.filter(s =>
        (s.title || '').toLowerCase().includes(q) ||
        (s.artists || '').toLowerCase().includes(q) ||
        (s.album || '').toLowerCase().includes(q)
      );
    }
    songs = this._sortSongs(songs, sortBy);
    if (songs.length === 0) {
      container.innerHTML = `<div class="mp-empty"><div class="mp-empty__icon">🎵</div><div class="mp-empty__text" data-i18n="library.noSongs">${MPi18n.t('library.noSongs')}</div></div>`;
      return;
    }
    container.innerHTML = songs.map(s => this._songCardHTML(s)).join('');
  },

  _songCardHTML(song) {
    const thumb = song.thumbnailUrl || `https://i.ytimg.com/vi/${song.id}/mqdefault.jpg`;
    const dur = song.duration ? `${Math.floor(song.duration / 60)}:${String(song.duration % 60).padStart(2, '0')}` : '';
    const likedIcon = song.liked ? '❤️' : '';
    const sources = (song.sources || []).join(', ');
    const isChecked = typeof MPCategories !== 'undefined' && MPCategories._selectedSongIds.has(song.id);
    const catNames = (song.categories || []).map(cid => {
      const cat = MPStorage.getCategories().find(c => c.id === cid);
      return cat ? `<span class="mp-chip" style="font-size:0.7rem;padding:2px 6px;border-left:3px solid ${cat.color}">${this._esc(cat.name)}</span>` : '';
    }).filter(Boolean).join('');
    const tagChips = (song.tags || []).map(t => `<span class="mp-chip" style="font-size:0.7rem;padding:2px 6px">#${this._esc(t)}</span>`).join('');
    return `
      <div class="mp-card mp-song-card" data-song-id="${song.id}">
        <input type="checkbox" class="mp-song-card__check" data-song-check="${song.id}"
               ${isChecked ? 'checked' : ''}
               onclick="event.stopPropagation();MPCategories.toggleSongSelection('${song.id}')"
               aria-label="Select">
        <img class="mp-song-card__thumb" src="${thumb}" alt="" loading="lazy"
             onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1 1%22><rect fill=%22%23333%22 width=%221%22 height=%221%22/></svg>'">
        <div class="mp-song-card__info">
          <div class="mp-song-card__title">${this._esc(song.title)}</div>
          <div class="mp-song-card__artist">${this._esc(song.artists || '—')}</div>
          <div class="mp-song-card__meta">
            ${likedIcon ? `<span class="mp-song-card__liked">${likedIcon}</span>` : ''}
            ${dur ? `<span>${dur}</span>` : ''}
            ${song.album ? `<span>· ${this._esc(song.album)}</span>` : ''}
            ${song.genre ? `<span>· ${this._esc(song.genre)}</span>` : ''}
            ${sources ? `<span>· ${sources}</span>` : ''}
          </div>
          ${catNames || tagChips ? `<div style="margin-top:4px;display:flex;gap:3px;flex-wrap:wrap">${catNames}${tagChips}</div>` : ''}
        </div>
        <a href="${song.links?.youtube || `https://music.youtube.com/watch?v=${song.id}`}"
           target="_blank" rel="noopener" class="mp-btn mp-btn--small mp-btn--secondary"
           onclick="event.stopPropagation()">▶ YT</a>
      </div>`;
  },

  _sortSongs(songs, sortBy) {
    const s = [...songs];
    switch (sortBy) {
      case 'artist': return s.sort((a, b) => (a.artists || '').localeCompare(b.artists || ''));
      case 'playTime': return s.sort((a, b) => (b.playTimeMs || 0) - (a.playTimeMs || 0));
      case 'date': return s.sort((a, b) => (b.addedAt || '').localeCompare(a.addedAt || ''));
      default: return s.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    }
  },

  _onSearch(q) { this._renderSongList(q, document.getElementById('sortSelect')?.value); },
  _onSort(v) { this._renderSongList(document.getElementById('searchInput')?.value, v); },

  /* ---- Stats ---- */
  _updateStats() {
    const songs = MPStorage.getSongs();
    const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    el('statTotal', songs.length);
    el('statLiked', songs.filter(s => s.liked).length);
    const totalMs = songs.reduce((sum, s) => sum + (s.playTimeMs || 0), 0);
    const hrs = Math.floor(totalMs / 3600000);
    const mins = Math.floor((totalMs % 3600000) / 60000);
    el('statPlayTime', `${hrs} ${MPi18n.t('stats.hours')} ${mins} ${MPi18n.t('stats.minutes')}`);
  },

  /* ---- Export ---- */
  _exportJSON() {
    this._download(MPStorage.exportJSON(), 'myplaylist_library.json', 'application/json');
    this._toast('JSON exported', 'success');
  },

  _exportCSV() {
    const songs = MPStorage.getSongs();
    const header = 'video_id,title,artists,album,duration_sec,liked,play_time_ms,playlists,sources,yt_music_url';
    const rows = songs.map(s => [
      s.id, `"${(s.title||'').replace(/"/g,'""')}"`, `"${(s.artists||'').replace(/"/g,'""')}"`,
      `"${(s.album||'').replace(/"/g,'""')}"`, s.duration||'', s.liked?1:0, s.playTimeMs||0,
      `"${(s.originalPlaylists||[]).join('; ')}"`, `"${(s.sources||[]).join('; ')}"`,
      s.links?.youtube||''
    ].join(','));
    this._download([header, ...rows].join('\n'), 'myplaylist_export.csv', 'text/csv');
    this._toast('CSV exported', 'success');
  },

  _exportMetrolist() {
    const songs = MPStorage.getSongs();
    const rows = ['artist,title', ...songs.map(s => `"${(s.artists||'').replace(/"/g,'""')}","${(s.title||'').replace(/"/g,'""')}"`)];
    this._download(rows.join('\n'), 'myplaylist_metrolist_import.csv', 'text/csv');
    this._toast('Metrolist CSV exported', 'success');
  },

  _download(content, filename, mime) {
    const blob = new Blob([content], { type: mime });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = filename; a.click(); URL.revokeObjectURL(a.href);
  },

  _clearLibrary() {
    if (confirm(MPi18n.t('library.clearConfirm'))) {
      MPStorage.clearAllSongs();
      this._renderSongList();
      this._updateStats();
      this._toast('Library cleared', 'info');
    }
  },

  /* ---- Settings ---- */
  _loadSettingsForm() {
    const s = MPStorage.loadSettings();
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
    set('settingsGithubRepo', s.githubRepo);
    set('settingsGithubToken', s.githubToken);
    set('settingsLastfmKey', s.lastfmApiKey);
  },

  _saveSettings() {
    const s = MPStorage.loadSettings();
    const get = (id) => document.getElementById(id)?.value || '';
    s.githubRepo = get('settingsGithubRepo');
    s.githubToken = get('settingsGithubToken');
    s.lastfmApiKey = get('settingsLastfmKey');
    MPStorage.saveSettings(s);
    this._toast(MPi18n.t('settings.saved'), 'success');
  },

  async _githubPull() {
    try {
      const count = await MPStorage.githubPull();
      this._renderSongList(); this._updateStats();
      this._toast(`GitHub pull: ${count} songs`, 'success');
    } catch (e) { this._toast(`GitHub error: ${e.message}`, 'error'); }
  },

  async _githubPush() {
    try {
      await MPStorage.githubPush();
      this._toast('Pushed to GitHub', 'success');
    } catch (e) { this._toast(`GitHub error: ${e.message}`, 'error'); }
  },

  _resetAll() {
    if (confirm(MPi18n.t('settings.resetConfirm'))) {
      MPStorage.resetAll();
      location.reload();
    }
  },

  /* ---- Helpers ---- */
  _esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; },

  _toast(msg, type = 'info') {
    let t = document.getElementById('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'mp-toast'; document.body.appendChild(t); }
    t.className = `mp-toast mp-toast--${type} mp-toast--visible`;
    t.textContent = msg;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => t.classList.remove('mp-toast--visible'), 3500);
  },
};

/* ---- Boot ---- */
document.addEventListener('DOMContentLoaded', () => MPApp.init());
document.addEventListener('mp:languageChanged', () => {
  MPApp._renderSongList();
  MPApp._updateStats();
});
