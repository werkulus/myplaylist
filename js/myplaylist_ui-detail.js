/**
 * myplaylist_ui-detail.js — Modal ze szczegolami piosenki: metadane, linki, tekst, bio artysty
 * Utworzono: 2026-08-24 | Projekt: Mojaplaylista v1.0
 */
const MPDetail = {
  _currentSongId: null,

  init() {
    // Create modal container once
    if (!document.getElementById('songModal')) {
      const backdrop = document.createElement('div');
      backdrop.id = 'songModal';
      backdrop.className = 'mp-modal-backdrop';
      backdrop.innerHTML = '<div class="mp-modal" id="songModalContent"></div>';
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) this.close();
      });
      document.body.appendChild(backdrop);
    }

    // Delegate click on song cards
    document.getElementById('songList')?.addEventListener('click', (e) => {
      const card = e.target.closest('.mp-song-card');
      if (!card || e.target.closest('a')) return; // Don't open if clicking link
      const id = card.getAttribute('data-song-id');
      if (id) this.open(id);
    });
  },

  open(songId) {
    const songs = MPStorage.getSongs();
    const song = songs.find(s => s.id === songId);
    if (!song) return;

    this._currentSongId = songId;
    const modal = document.getElementById('songModalContent');
    modal.innerHTML = this._renderDetail(song);
    document.getElementById('songModal').classList.add('mp-modal-backdrop--open');
    this._bindDetailEvents(song);
  },

  close() {
    document.getElementById('songModal')?.classList.remove('mp-modal-backdrop--open');
    this._currentSongId = null;
  },

  _renderDetail(song) {
    const t = MPi18n.t.bind(MPi18n);
    const thumb = song.thumbnailUrl || `https://i.ytimg.com/vi/${song.id}/mqdefault.jpg`;
    const dur = song.duration ? `${Math.floor(song.duration / 60)}:${String(song.duration % 60).padStart(2, '0')}` : '—';
    const playH = Math.floor((song.playTimeMs || 0) / 3600000);
    const playM = Math.floor(((song.playTimeMs || 0) % 3600000) / 60000);

    return `
      <button class="mp-btn mp-btn--icon" onclick="MPDetail.close()" style="float:right;font-size:1.2rem" aria-label="Close">✕</button>

      <!-- Header -->
      <div style="display:flex;gap:16px;align-items:flex-start;margin-bottom:20px">
        <img src="${thumb}" alt="" style="width:100px;height:100px;border-radius:var(--mp-card-radius-sm);object-fit:cover;flex-shrink:0"
             onerror="this.style.background='var(--mp-bg-tertiary)'">
        <div style="min-width:0">
          <h2 style="font-size:1.3rem;margin-bottom:4px;word-break:break-word">${this._esc(song.title)}</h2>
          <div style="color:var(--mp-text-secondary);font-size:1rem">${this._esc(song.artists || '—')}</div>
          <div style="color:var(--mp-text-tertiary);font-size:0.85rem;margin-top:4px">
            ${song.album ? `${t('song.album')}: ${this._esc(song.album)}` : ''}
            ${song.year ? ` · ${song.year}` : ''}
          </div>
          <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;align-items:center">
            ${song.liked ? '<span style="color:var(--mp-liked)">❤️</span>' : ''}
            <span class="mp-chip">${dur}</span>
            ${song.genre ? `<span class="mp-chip">${this._esc(song.genre)}</span>` : ''}
            ${(song.sources || []).map(s => `<span class="mp-chip">${s}</span>`).join('')}
          </div>
        </div>
      </div>

      <!-- Platform links -->
      <div style="margin-bottom:16px">
        <h3 style="font-size:0.95rem;margin-bottom:8px">${t('song.links')}</h3>
        <div id="detailLinks" style="display:flex;gap:6px;flex-wrap:wrap">
          ${this._linkBtn(song.links?.youtube || `https://music.youtube.com/watch?v=${song.id}`, '▶ YouTube', '#FF0000')}
          ${song.links?.spotify ? this._linkBtn(song.links.spotify, '🎵 Spotify', '#1DB954') : ''}
          ${song.links?.appleMusic ? this._linkBtn(song.links.appleMusic, '🍎 Apple', '#FC3C44') : ''}
          ${song.links?.tidal ? this._linkBtn(song.links.tidal, '🌊 Tidal', '#000000') : ''}
          ${song.links?.deezer ? this._linkBtn(song.links.deezer, '🎶 Deezer', '#A238FF') : ''}
          <span id="detailLinksLoading" style="display:none;color:var(--mp-text-tertiary);font-size:0.85rem">⏳ ${t('common.loading')}</span>
        </div>
      </div>

      <!-- Lyrics links -->
      <div style="margin-bottom:16px">
        <h3 style="font-size:0.95rem;margin-bottom:8px">${t('song.lyrics')}</h3>
        <div id="detailLyricsLinks" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">
          <span style="color:var(--mp-text-tertiary);font-size:0.85rem">⏳</span>
        </div>
        <div id="detailLyrics" style="display:none;max-height:200px;overflow-y:auto;padding:12px;background:var(--mp-bg-tertiary);border-radius:var(--mp-card-radius-sm);font-size:0.85rem;white-space:pre-wrap;line-height:1.8"></div>
      </div>

      <!-- Artist bio -->
      <div id="detailArtistSection" style="display:none;margin-bottom:16px">
        <h3 style="font-size:0.95rem;margin-bottom:8px">${t('song.artist')} — bio</h3>
        <div id="detailArtistBio" style="font-size:0.9rem;color:var(--mp-text-secondary);line-height:1.6"></div>
        <div id="detailArtistTags" style="margin-top:8px;display:flex;gap:4px;flex-wrap:wrap"></div>
        <div id="detailArtistSimilar" style="margin-top:8px;font-size:0.85rem;color:var(--mp-text-tertiary)"></div>
      </div>

      <!-- Meta info -->
      <div style="font-size:0.8rem;color:var(--mp-text-tertiary);border-top:1px solid var(--mp-card-border);padding-top:12px">
        <div>${t('song.playTime')}: ${playH}h ${playM}min</div>
        ${(song.originalPlaylists || []).length ? `<div>${t('song.playlists')}: ${song.originalPlaylists.join(', ')}</div>` : ''}
        <div>Video ID: <code>${song.id}</code></div>
        ${song.metadataFetched ? `<div>Metadane pobrane: ${new Date(song.metadataFetched).toLocaleString()}</div>` : ''}
      </div>

      <!-- Fetch button -->
      <div style="margin-top:16px;text-align:center">
        <button id="detailFetchBtn" class="mp-btn mp-btn--primary" onclick="MPDetail.fetchMetadata('${song.id}')">
          🔄 ${t('song.fetchMetadata')}
        </button>
      </div>
    `;
  },

  _linkBtn(url, label, color) {
    return `<a href="${url}" target="_blank" rel="noopener"
      class="mp-btn mp-btn--small" style="background:${color};color:white;text-decoration:none">${label}</a>`;
  },

  _bindDetailEvents(song) {
    // Auto-fetch links if not cached
    if (!song.links?.spotify) {
      this._fetchSongLinks(song);
    }
    this._fetchLyrics(song);
    this._fetchArtistInfo(song);
  },

  async _fetchSongLinks(song) {
    const el = document.getElementById('detailLinksLoading');
    if (el) el.style.display = '';
    const result = await MPSongLink.fetchLinks(song.id);
    if (el) el.style.display = 'none';

    if (result && result.links) {
      // Update song in storage
      const updatedLinks = { ...song.links, ...result.links };
      if (!updatedLinks.youtube) updatedLinks.youtube = `https://music.youtube.com/watch?v=${song.id}`;
      MPStorage.updateSong(song.id, { links: updatedLinks });

      // Re-render links section
      const container = document.getElementById('detailLinks');
      if (container && this._currentSongId === song.id) {
        const allLinks = updatedLinks;
        container.innerHTML = [
          this._linkBtn(allLinks.youtube, '▶ YouTube', '#FF0000'),
          allLinks.spotify ? this._linkBtn(allLinks.spotify, '🎵 Spotify', '#1DB954') : '',
          allLinks.appleMusic ? this._linkBtn(allLinks.appleMusic, '🍎 Apple', '#FC3C44') : '',
          allLinks.tidal ? this._linkBtn(allLinks.tidal, '🌊 Tidal', '#000000') : '',
          allLinks.deezer ? this._linkBtn(allLinks.deezer, '🎶 Deezer', '#A238FF') : '',
          allLinks.amazonMusic ? this._linkBtn(allLinks.amazonMusic, '📦 Amazon', '#FF9900') : '',
          allLinks.soundcloud ? this._linkBtn(allLinks.soundcloud, '☁️ SoundCloud', '#FF5500') : '',
        ].filter(Boolean).join('');
      }
    }
  },

  async _fetchLyrics(song) {
    const linksEl = document.getElementById('detailLyricsLinks');
    const lyricsEl = document.getElementById('detailLyrics');
    if (!linksEl || !lyricsEl) return;

    const result = await MPLyrics.fetchAll(song.artists, song.title, song.duration);

    // Show lyrics links
    const links = [];
    if (result.tekstowoUrl) links.push(this._linkBtn(result.tekstowoUrl, '📝 Tekstowo.pl', '#2196F3'));
    if (result.geniusUrl) links.push(this._linkBtn(result.geniusUrl, '💡 Genius', '#FFFF64').replace('color:white', 'color:#333'));
    linksEl.innerHTML = links.join('') || `<span style="color:var(--mp-text-tertiary)">${MPi18n.t('song.noLyrics')}</span>`;

    // Show inline lyrics if found
    if (result.lyrics && this._currentSongId === song.id) {
      lyricsEl.textContent = result.lyrics;
      lyricsEl.style.display = '';
      MPStorage.updateSong(song.id, { lyrics: result.lyrics });
    }
  },

  async _fetchArtistInfo(song) {
    if (!song.artists || !MPStorage.loadSettings().lastfmApiKey) return;

    const section = document.getElementById('detailArtistSection');
    const bioEl = document.getElementById('detailArtistBio');
    const tagsEl = document.getElementById('detailArtistTags');
    const simEl = document.getElementById('detailArtistSimilar');
    if (!section) return;

    const mainArtist = song.artists.split(';')[0].split(',')[0].trim();
    const info = await MPLastFm.getArtistInfo(mainArtist);

    if (info && this._currentSongId === song.id) {
      section.style.display = '';
      if (bioEl) bioEl.textContent = info.bio || '';
      if (tagsEl) tagsEl.innerHTML = info.tags.map(t => `<span class="mp-chip">${t}</span>`).join('');
      if (simEl && info.similar.length) {
        simEl.textContent = `${MPi18n.t('song.artist')} – ${MPi18n.currentLang === 'pl' ? 'podobni' : 'similar'}: ${info.similar.join(', ')}`;
      }

      // Also fetch track info for genre
      const trackInfo = await MPLastFm.getTrackInfo(mainArtist, song.title);
      if (trackInfo && this._currentSongId === song.id) {
        const updates = {};
        if (trackInfo.genre) updates.genre = trackInfo.genre;
        if (trackInfo.allTags?.length) updates.lastfmTags = trackInfo.allTags;
        updates.metadataFetched = new Date().toISOString();
        MPStorage.updateSong(song.id, updates);
      }
    }
  },

  /**
   * Manual fetch all metadata button
   */
  async fetchMetadata(songId) {
    const btn = document.getElementById('detailFetchBtn');
    if (btn) { btn.disabled = true; btn.textContent = `⏳ ${MPi18n.t('common.loading')}`; }

    const songs = MPStorage.getSongs();
    const song = songs.find(s => s.id === songId);
    if (!song) return;

    await Promise.all([
      this._fetchSongLinks(song),
      this._fetchLyrics(song),
      this._fetchArtistInfo(song),
    ]);

    if (btn) { btn.disabled = false; btn.textContent = `✅ ${MPi18n.t('common.success')}`; }

    // Refresh song list to show updated data
    if (typeof MPApp !== 'undefined') {
      MPApp._renderSongList(
        document.getElementById('searchInput')?.value,
        document.getElementById('sortSelect')?.value
      );
    }
  },

  _esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; },
};
