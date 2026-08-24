/**
 * myplaylist_ui-stats.js — Widok statystyk: top artysci, gatunki, zrodla, czas sluchania
 * Utworzono: 2026-08-24 | Projekt: Mojaplaylista v1.0
 */
const MPStats = {

  render() {
    const container = document.querySelector('[data-view="stats"]');
    if (!container) return;
    const t = MPi18n.t.bind(MPi18n);
    const songs = MPStorage.getSongs();

    if (!songs.length) {
      container.innerHTML = `<div class="mp-empty"><div class="mp-empty__icon">📊</div><div class="mp-empty__text">${t('library.noSongs')}</div></div>`;
      return;
    }

    const totalMs = songs.reduce((sum, s) => sum + (s.playTimeMs || 0), 0);
    const hrs = Math.floor(totalMs / 3600000);
    const mins = Math.floor((totalMs % 3600000) / 60000);
    const liked = songs.filter(s => s.liked).length;
    const withGenre = songs.filter(s => s.genre).length;
    const withLyrics = songs.filter(s => s.lyrics).length;
    const withLinks = songs.filter(s => s.links?.spotify).length;

    const topArtists = this._topN(songs, s => this._splitArtists(s.artists), 10);
    const topGenres = this._topN(songs, s => s.genre ? [s.genre] : [], 8);
    const topAlbums = this._topN(songs, s => s.album ? [s.album] : [], 8);
    const sourceBreak = this._topN(songs, s => s.sources || [], 10);
    const topTags = this._topN(songs, s => s.tags || [], 8);
    const catBreak = this._categoryBreakdown(songs);

    container.innerHTML = `
      <div class="mp-section">
        <h2 class="mp-section__title">${t('stats.title')}</h2>

        <!-- Summary cards -->
        <div class="mp-grid mp-grid--cards" style="margin-bottom:24px">
          ${this._statCard('🎵', t('stats.totalSongs'), songs.length)}
          ${this._statCard('❤️', t('stats.likedSongs'), liked)}
          ${this._statCard('⏱️', t('stats.totalPlayTime'), `${hrs} ${t('stats.hours')} ${mins} ${t('stats.minutes')}`)}
          ${this._statCard('🎤', MPi18n.currentLang === 'pl' ? 'Unikalni artyści' : 'Unique artists', topArtists.length > 0 ? new Set(songs.flatMap(s => this._splitArtists(s.artists))).size : 0)}
          ${this._statCard('💿', MPi18n.currentLang === 'pl' ? 'Albumy' : 'Albums', new Set(songs.map(s => s.album).filter(Boolean)).size)}
          ${this._statCard('🔗', MPi18n.currentLang === 'pl' ? 'Z linkami Spotify' : 'With Spotify links', withLinks)}
        </div>

        <!-- Top artists bar chart -->
        ${this._barSection('🎤 Top ' + (MPi18n.currentLang === 'pl' ? 'artyści' : 'artists'), topArtists, 'artist')}

        <!-- Top genres -->
        ${topGenres.length ? this._barSection(`🎸 Top ${t('stats.topGenres').toLowerCase()}`, topGenres, 'genre') : ''}

        <!-- Sources breakdown -->
        ${this._barSection(`📱 ${t('stats.sourceBreakdown')}`, sourceBreak, 'source')}

        <!-- Top albums -->
        ${topAlbums.length ? this._barSection(`💿 Top ${MPi18n.currentLang === 'pl' ? 'albumy' : 'albums'}`, topAlbums, 'album') : ''}

        <!-- Tags breakdown -->
        ${topTags.length ? this._barSection(`🏷️ Top ${MPi18n.currentLang === 'pl' ? 'tagi' : 'tags'}`, topTags, 'tag') : ''}

        <!-- Categories breakdown -->
        ${catBreak.length ? this._barSection(`📁 ${MPi18n.t('categories.title')}`, catBreak, 'category') : ''}

        <!-- Data completeness -->
        <div class="mp-card" style="padding:20px;margin-top:16px">
          <h3 style="margin-bottom:12px">${MPi18n.currentLang === 'pl' ? 'Kompletność danych' : 'Data completeness'}</h3>
          ${this._progressBar(MPi18n.currentLang === 'pl' ? 'Gatunek' : 'Genre', withGenre, songs.length)}
          ${this._progressBar(MPi18n.currentLang === 'pl' ? 'Tekst piosenki' : 'Lyrics', withLyrics, songs.length)}
          ${this._progressBar('Spotify link', withLinks, songs.length)}
        </div>
      </div>
    `;
  },

  _statCard(icon, label, value) {
    return `<div class="mp-card" style="padding:20px;text-align:center">
      <div style="font-size:2rem;margin-bottom:4px">${icon}</div>
      <div style="font-size:1.5rem;font-weight:700;color:var(--mp-accent)">${value}</div>
      <div style="font-size:0.85rem;color:var(--mp-text-secondary)">${label}</div>
    </div>`;
  },

  _barSection(title, items, exportType) {
    if (!items.length) return '';
    const max = items[0].count;
    return `
      <div class="mp-card" style="padding:20px;margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <h3>${title}</h3>
          ${exportType ? `<button class="mp-btn mp-btn--small mp-btn--secondary" onclick="MPStats._exportSection('${exportType}')">📥 CSV</button>` : ''}
        </div>
        ${items.map(item => `
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;cursor:pointer"
               onclick="MPStats._filterBy('${exportType}','${this._esc(item.name)}')">
            <div style="width:140px;font-size:0.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"
                 title="${this._esc(item.name)}">${this._esc(item.name)}</div>
            <div style="flex:1;height:22px;background:var(--mp-bg-tertiary);border-radius:11px;overflow:hidden">
              <div style="height:100%;width:${Math.round(item.count / max * 100)}%;background:var(--mp-accent);border-radius:11px;transition:width 0.5s"></div>
            </div>
            <div style="width:36px;text-align:right;font-size:0.85rem;font-weight:600;color:var(--mp-text-secondary)">${item.count}</div>
          </div>
        `).join('')}
      </div>`;
  },

  _progressBar(label, value, total) {
    const pct = total > 0 ? Math.round(value / total * 100) : 0;
    return `
      <div style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;font-size:0.85rem;margin-bottom:4px">
          <span>${label}</span><span>${value}/${total} (${pct}%)</span>
        </div>
        <div style="height:8px;background:var(--mp-bg-tertiary);border-radius:4px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:${pct > 60 ? 'var(--mp-success)' : pct > 30 ? 'var(--mp-warning)' : 'var(--mp-error)'};border-radius:4px;transition:width 0.5s"></div>
        </div>
      </div>`;
  },

  _topN(songs, extractFn, n) {
    const counts = {};
    for (const s of songs) {
      for (const val of extractFn(s)) {
        const key = val.trim();
        if (key) counts[key] = (counts[key] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, n);
  },

  _categoryBreakdown(songs) {
    const cats = MPStorage.getCategories();
    return cats.map(cat => ({
      name: cat.name,
      count: songs.filter(s => (s.categories || []).includes(cat.id)).length
    })).filter(c => c.count > 0).sort((a, b) => b.count - a.count);
  },

  _splitArtists(str) {
    if (!str) return [];
    return str.split(/[;,&]/).map(a => a.trim()).filter(Boolean);
  },

  _filterBy(type, value) {
    if (typeof MPFilter === 'undefined') return;
    MPFilter.clearAll();
    if (type === 'source') MPFilter.toggleFilter('source', value);
    else if (type === 'genre') MPFilter.toggleFilter('genre', value);
    else if (type === 'tag') MPFilter.toggleFilter('tag', value);
    else if (type === 'artist') {
      MPApp.navigate('library');
      const si = document.getElementById('searchInput');
      if (si) { si.value = value; MPApp._onSearch(value); }
      return;
    }
    else if (type === 'album') {
      MPApp.navigate('library');
      const si = document.getElementById('searchInput');
      if (si) { si.value = value; MPApp._onSearch(value); }
      return;
    }
    MPApp.navigate('library');
  },

  _exportSection(type) {
    // Quick export based on section type — exports top entries
    if (type === 'source') {
      const sources = [...new Set(MPStorage.getSongs().flatMap(s => s.sources || []))];
      const choice = prompt(`Export source CSV:\n${sources.join(', ')}`, sources[0]);
      if (choice) MPExport.sourceCSV(choice);
    }
  },

  _esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; },
};
