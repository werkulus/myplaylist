/**
 * myplaylist_search-filter.js — Zaawansowane filtrowanie, smart playlists, filtry boczne
 * Utworzono: 2026-08-24 | Projekt: Mojaplaylista v1.0
 */
const MPFilter = {
  _activeFilters: {
    source: null,     // 'vivi_metrolist' | 'rimusic' | null
    category: null,   // category id | null
    tag: null,         // tag name | null
    liked: null,       // true | null
    genre: null,       // genre string | null
    hasLyrics: null,   // true | null
  },

  init() {
    document.addEventListener('mp:languageChanged', () => this.renderFilterBar());
  },

  renderFilterBar() {
    const bar = document.getElementById('filterBar');
    if (!bar) return;
    const t = MPi18n.t.bind(MPi18n);
    const songs = MPStorage.getSongs();
    const categories = MPStorage.getCategories();
    const tags = MPStorage.getTags();

    // Collect unique sources, genres
    const sources = [...new Set(songs.flatMap(s => s.sources || []))].sort();
    const genres = [...new Set(songs.map(s => s.genre).filter(Boolean))].sort();

    bar.innerHTML = `
      <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;padding:8px 0">
        <!-- Smart filters -->
        <button class="mp-chip ${this._activeFilters.liked ? 'mp-chip--active' : ''}"
                onclick="MPFilter.toggleFilter('liked', true)">❤️ ${t('library.liked')}</button>

        <!-- Source filter -->
        ${sources.map(src => `
          <button class="mp-chip ${this._activeFilters.source === src ? 'mp-chip--active' : ''}"
                  onclick="MPFilter.toggleFilter('source', '${src}')">${src}</button>
        `).join('')}

        <!-- Category filter -->
        ${categories.map(cat => `
          <button class="mp-chip ${this._activeFilters.category === cat.id ? 'mp-chip--active' : ''}"
                  onclick="MPFilter.toggleFilter('category', '${cat.id}')"
                  style="${this._activeFilters.category === cat.id ? '' : `border-left:3px solid ${cat.color}`}">${this._esc(cat.name)}</button>
        `).join('')}

        <!-- Tag filter -->
        ${tags.map(tag => `
          <button class="mp-chip ${this._activeFilters.tag === tag ? 'mp-chip--active' : ''}"
                  onclick="MPFilter.toggleFilter('tag', '${this._esc(tag)}')">#${this._esc(tag)}</button>
        `).join('')}

        <!-- Genre filter (if any) -->
        ${genres.length > 0 ? `
          <select id="genreFilter" class="mp-btn mp-btn--small mp-btn--secondary" onchange="MPFilter.setGenre(this.value)" style="font-size:0.8rem">
            <option value="">${t('song.genre')}</option>
            ${genres.map(g => `<option value="${g}" ${this._activeFilters.genre === g ? 'selected' : ''}>${g}</option>`).join('')}
          </select>
        ` : ''}

        <!-- Clear all filters -->
        ${this._hasActiveFilter() ? `
          <button class="mp-chip" onclick="MPFilter.clearAll()" style="opacity:0.7">✕ Clear</button>
        ` : ''}
      </div>

      <!-- Selection controls -->
      <div id="selectionControls" style="display:flex;gap:8px;align-items:center;padding:4px 0;flex-wrap:wrap">
        <label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:0.85rem">
          <input type="checkbox" id="selectAllCheck" onchange="MPFilter.onSelectAll(this.checked)" style="accent-color:var(--mp-accent)">
          ${t('library.selectAll')}
        </label>
        <span id="selectionCounter" style="font-size:0.85rem;color:var(--mp-accent);display:none"></span>
        ${MPCategories._selectedSongIds.size > 0 ? `
          <button class="mp-btn mp-btn--small mp-btn--secondary" onclick="MPCategories.deselectAll()">${t('library.deselectAll')}</button>
        ` : ''}
      </div>
    `;
  },

  toggleFilter(type, value) {
    if (this._activeFilters[type] === value) {
      this._activeFilters[type] = null;
    } else {
      this._activeFilters[type] = value;
    }
    this.applyFilters();
    this.renderFilterBar();
  },

  setGenre(genre) {
    this._activeFilters.genre = genre || null;
    this.applyFilters();
    this.renderFilterBar();
  },

  clearAll() {
    for (const key in this._activeFilters) this._activeFilters[key] = null;
    this.applyFilters();
    this.renderFilterBar();
  },

  _hasActiveFilter() {
    return Object.values(this._activeFilters).some(v => v !== null);
  },

  /**
   * Filtruje piosenki wg aktywnych filtrow + search query
   */
  filterSongs(songs) {
    const f = this._activeFilters;
    return songs.filter(s => {
      if (f.liked && !s.liked) return false;
      if (f.source && !(s.sources || []).includes(f.source)) return false;
      if (f.category && !(s.categories || []).includes(f.category)) return false;
      if (f.tag && !(s.tags || []).includes(f.tag)) return false;
      if (f.genre && s.genre !== f.genre) return false;
      if (f.hasLyrics && !s.lyrics) return false;
      return true;
    });
  },

  /**
   * Triggers re-render of song list with current filters
   */
  applyFilters() {
    const search = document.getElementById('searchInput')?.value || '';
    const sort = document.getElementById('sortSelect')?.value || 'title';
    MPApp._renderFilteredSongList(search, sort);
  },

  onSelectAll(checked) {
    const songs = this._getVisibleSongIds();
    if (checked) {
      MPCategories.selectAll(songs);
    } else {
      MPCategories.deselectAll();
    }
    this.renderFilterBar();
  },

  _getVisibleSongIds() {
    const cards = document.querySelectorAll('.mp-song-card[data-song-id]');
    return [...cards].map(c => c.getAttribute('data-song-id'));
  },

  _esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; },
};
