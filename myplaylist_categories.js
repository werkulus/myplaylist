/**
 * myplaylist_categories.js — CRUD kategorii i tagow, bulk tagging, przypisywanie do piosenek
 * Utworzono: 2026-08-24 | Projekt: Mojaplaylista v1.0
 */
const MPCategories = {
  _selectedSongIds: new Set(),

  init() {
    document.addEventListener('mp:languageChanged', () => this.render());
  },

  render() {
    const container = document.querySelector('[data-view="categories"]');
    if (!container) return;
    const t = MPi18n.t.bind(MPi18n);
    const categories = MPStorage.getCategories();
    const tags = MPStorage.getTags();
    const songs = MPStorage.getSongs();

    container.innerHTML = `
      <div class="mp-section">
        <h2 class="mp-section__title">${t('categories.title')}</h2>

        <!-- New category form -->
        <div class="mp-card" style="padding:16px;margin-bottom:20px">
          <h3 style="margin-bottom:12px">${t('categories.newCategory')}</h3>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:end">
            <div class="mp-form-group" style="margin:0;flex:1;min-width:160px">
              <input id="newCatName" class="mp-form-input" placeholder="${t('categories.categoryName')}">
            </div>
            <div class="mp-form-group" style="margin:0">
              <input id="newCatColor" type="color" value="#00B4D8" style="height:40px;width:50px;border:none;cursor:pointer;border-radius:8px">
            </div>
            <button class="mp-btn mp-btn--primary" onclick="MPCategories.addCategory()">${t('categories.add')}</button>
          </div>
        </div>

        <!-- Existing categories -->
        <div id="categoriesList" class="mp-grid mp-grid--cards" style="margin-bottom:32px">
          ${categories.length ? categories.map(cat => this._categoryCard(cat, songs)).join('') :
            `<div style="color:var(--mp-text-tertiary);padding:20px">${t('categories.noCategoriesYet') || 'Brak kategorii.'}</div>`}
        </div>

        <!-- New tag form -->
        <div class="mp-card" style="padding:16px;margin-bottom:20px">
          <h3 style="margin-bottom:12px">${t('categories.newTag')}</h3>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <div class="mp-form-group" style="margin:0;flex:1;min-width:160px">
              <input id="newTagName" class="mp-form-input" placeholder="${t('categories.tagName')}">
            </div>
            <button class="mp-btn mp-btn--primary" onclick="MPCategories.addTag()">${t('categories.add')}</button>
          </div>
        </div>

        <!-- Existing tags -->
        <div id="tagsList" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:32px">
          ${tags.length ? tags.map(tag => this._tagChip(tag, songs)).join('') :
            `<span style="color:var(--mp-text-tertiary)">${t('categories.noTagsYet') || 'Brak tagów.'}</span>`}
        </div>

        <!-- Bulk assign section -->
        <div class="mp-card" style="padding:16px">
          <h3 style="margin-bottom:12px">Bulk assign</h3>
          <p style="color:var(--mp-text-secondary);font-size:0.9rem;margin-bottom:12px">
            ${MPi18n.currentLang === 'pl'
              ? 'Zaznacz piosenki w Bibliotece (checkbox), potem wróć tu i przypisz je do kategorii lub tagu.'
              : 'Select songs in Library (checkbox), then come back here to assign them to a category or tag.'}
          </p>
          <div style="margin-bottom:8px;font-size:0.9rem">
            <strong>${t('library.selected', { count: this._selectedSongIds.size })}</strong>
          </div>
          ${this._selectedSongIds.size > 0 ? `
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
              ${categories.map(c => `<button class="mp-btn mp-btn--small mp-btn--secondary" onclick="MPCategories.bulkAssignCategory('${c.id}')" style="border-left:4px solid ${c.color}">${this._esc(c.name)}</button>`).join('')}
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              ${tags.map(tg => `<button class="mp-chip" onclick="MPCategories.bulkAssignTag('${this._esc(tg)}')">${this._esc(tg)}</button>`).join('')}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  },

  _categoryCard(cat, songs) {
    const count = songs.filter(s => (s.categories || []).includes(cat.id)).length;
    return `
      <div class="mp-card" style="padding:16px;border-left:4px solid ${cat.color}">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <strong style="font-size:1rem">${this._esc(cat.name)}</strong>
            <div style="color:var(--mp-text-tertiary);font-size:0.85rem">${MPi18n.t('categories.songsCount', { count })}</div>
          </div>
          <div style="display:flex;gap:4px">
            <button class="mp-btn mp-btn--small mp-btn--secondary" onclick="MPCategories.renameCategory('${cat.id}','${this._esc(cat.name)}')" title="${MPi18n.t('common.edit')}">✏️</button>
            <button class="mp-btn mp-btn--small mp-btn--secondary" onclick="MPCategories.deleteCategory('${cat.id}','${this._esc(cat.name)}')" title="${MPi18n.t('common.delete')}">🗑️</button>
          </div>
        </div>
      </div>`;
  },

  _tagChip(tag, songs) {
    const count = songs.filter(s => (s.tags || []).includes(tag)).length;
    return `<span class="mp-chip" style="cursor:default">${this._esc(tag)} <span style="opacity:0.6">(${count})</span>
      <button onclick="MPCategories.deleteTag('${this._esc(tag)}')" style="background:none;border:none;cursor:pointer;margin-left:4px;font-size:0.8rem;opacity:0.6">✕</button>
    </span>`;
  },

  /* ---- CRUD ---- */
  addCategory() {
    const name = document.getElementById('newCatName')?.value?.trim();
    const color = document.getElementById('newCatColor')?.value || '#00B4D8';
    if (!name) return;
    MPStorage.addCategory(name, color);
    document.getElementById('newCatName').value = '';
    this.render();
    MPApp._toast(`${MPi18n.t('categories.newCategory')}: ${name}`, 'success');
  },

  deleteCategory(id, name) {
    if (confirm(MPi18n.t('categories.deleteConfirm', { name }))) {
      MPStorage.deleteCategory(id);
      this.render();
    }
  },

  renameCategory(id, oldName) {
    const newName = prompt(MPi18n.t('categories.rename'), oldName);
    if (!newName || newName === oldName) return;
    const lib = MPStorage.loadLibrary();
    const cat = lib.categories.find(c => c.id === id);
    if (cat) { cat.name = newName; MPStorage.saveLibrary(lib); }
    this.render();
  },

  addTag() {
    const name = document.getElementById('newTagName')?.value?.trim();
    if (!name) return;
    MPStorage.addTag(name);
    document.getElementById('newTagName').value = '';
    this.render();
    MPApp._toast(`${MPi18n.t('categories.newTag')}: ${name}`, 'success');
  },

  deleteTag(name) {
    if (confirm(MPi18n.t('categories.deleteConfirm', { name }))) {
      MPStorage.deleteTag(name);
      this.render();
    }
  },

  /* ---- Selection & Bulk ---- */
  toggleSongSelection(songId) {
    if (this._selectedSongIds.has(songId)) {
      this._selectedSongIds.delete(songId);
    } else {
      this._selectedSongIds.add(songId);
    }
    this._updateSelectionUI();
  },

  selectAll(songIds) {
    songIds.forEach(id => this._selectedSongIds.add(id));
    this._updateSelectionUI();
  },

  deselectAll() {
    this._selectedSongIds.clear();
    this._updateSelectionUI();
  },

  _updateSelectionUI() {
    document.querySelectorAll('.mp-song-card__check').forEach(cb => {
      cb.checked = this._selectedSongIds.has(cb.getAttribute('data-song-check'));
    });
    const counter = document.getElementById('selectionCounter');
    if (counter) {
      counter.textContent = MPi18n.t('library.selected', { count: this._selectedSongIds.size });
      counter.style.display = this._selectedSongIds.size > 0 ? '' : 'none';
    }
  },

  bulkAssignCategory(catId) {
    if (this._selectedSongIds.size === 0) return;
    const lib = MPStorage.loadLibrary();
    for (const song of lib.songs) {
      if (this._selectedSongIds.has(song.id)) {
        if (!song.categories) song.categories = [];
        if (!song.categories.includes(catId)) song.categories.push(catId);
      }
    }
    MPStorage.saveLibrary(lib);
    const cat = lib.categories.find(c => c.id === catId);
    MPApp._toast(`${this._selectedSongIds.size} → ${cat?.name || catId}`, 'success');
    this.render();
  },

  bulkAssignTag(tag) {
    if (this._selectedSongIds.size === 0) return;
    const lib = MPStorage.loadLibrary();
    for (const song of lib.songs) {
      if (this._selectedSongIds.has(song.id)) {
        if (!song.tags) song.tags = [];
        if (!song.tags.includes(tag)) song.tags.push(tag);
      }
    }
    MPStorage.saveLibrary(lib);
    MPApp._toast(`${this._selectedSongIds.size} → #${tag}`, 'success');
    this.render();
  },

  _esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; },
};
