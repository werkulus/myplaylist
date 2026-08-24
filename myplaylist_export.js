/**
 * myplaylist_export.js — Eksport CSV/JSON/M3U z filtrami, eksport fragmentow wg kategorii/tagu/artysty
 * Utworzono: 2026-08-24 | Projekt: Mojaplaylista v1.0
 */
const MPExport = {

  /**
   * Eksport CSV z biezacym filtrem (to co widac w bibliotece)
   */
  filteredCSV() {
    const songs = this._getFilteredSongs();
    if (!songs.length) { MPApp._toast('No songs to export', 'error'); return; }
    this._downloadCSV(songs, 'myplaylist_filtered.csv');
    MPApp._toast(`CSV: ${songs.length} songs`, 'success');
  },

  /**
   * Eksport CSV tylko wybranej kategorii
   */
  categoryCSV(catId) {
    const all = MPStorage.getSongs();
    const songs = all.filter(s => (s.categories || []).includes(catId));
    const cat = MPStorage.getCategories().find(c => c.id === catId);
    const name = cat ? cat.name.replace(/[^a-zA-Z0-9]/g, '_') : catId;
    if (!songs.length) { MPApp._toast('Empty category', 'error'); return; }
    this._downloadCSV(songs, `myplaylist_cat_${name}.csv`);
    MPApp._toast(`CSV: ${songs.length} songs (${cat?.name})`, 'success');
  },

  /**
   * Eksport CSV tylko wybranego tagu
   */
  tagCSV(tag) {
    const all = MPStorage.getSongs();
    const songs = all.filter(s => (s.tags || []).includes(tag));
    if (!songs.length) { MPApp._toast('Empty tag', 'error'); return; }
    this._downloadCSV(songs, `myplaylist_tag_${tag.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);
    MPApp._toast(`CSV: ${songs.length} songs (#${tag})`, 'success');
  },

  /**
   * Eksport CSV tylko wybranego artysty
   */
  artistCSV(artist) {
    const all = MPStorage.getSongs();
    const q = artist.toLowerCase();
    const songs = all.filter(s => (s.artists || '').toLowerCase().includes(q));
    if (!songs.length) { MPApp._toast('No songs for this artist', 'error'); return; }
    this._downloadCSV(songs, `myplaylist_artist_${artist.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);
    MPApp._toast(`CSV: ${songs.length} songs (${artist})`, 'success');
  },

  /**
   * Eksport CSV tylko wybranego albumu
   */
  albumCSV(album) {
    const all = MPStorage.getSongs();
    const songs = all.filter(s => s.album === album);
    if (!songs.length) { MPApp._toast('No songs for this album', 'error'); return; }
    this._downloadCSV(songs, `myplaylist_album_${album.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);
    MPApp._toast(`CSV: ${songs.length} songs (${album})`, 'success');
  },

  /**
   * Eksport CSV tylko wybranego zrodla
   */
  sourceCSV(source) {
    const all = MPStorage.getSongs();
    const songs = all.filter(s => (s.sources || []).includes(source));
    if (!songs.length) { MPApp._toast('No songs from this source', 'error'); return; }
    this._downloadCSV(songs, `myplaylist_source_${source}.csv`);
    MPApp._toast(`CSV: ${songs.length} songs (${source})`, 'success');
  },

  /**
   * Eksport M3U (Extended) — playlisty dla odtwarzaczy desktopowych
   */
  m3u(songs, filename) {
    songs = songs || MPStorage.getSongs();
    filename = filename || 'myplaylist.m3u';
    const lines = ['#EXTM3U'];
    for (const s of songs) {
      const dur = s.duration || -1;
      const artist = s.artists || 'Unknown';
      const title = s.title || 'Unknown';
      const url = s.links?.youtube || `https://music.youtube.com/watch?v=${s.id}`;
      lines.push(`#EXTINF:${dur},${artist} - ${title}`);
      lines.push(url);
    }
    this._download(lines.join('\n'), filename, 'audio/x-mpegurl');
    MPApp._toast(`M3U: ${songs.length} songs`, 'success');
  },

  /**
   * Eksport M3U z biezacym filtrem
   */
  filteredM3U() {
    const songs = this._getFilteredSongs();
    this.m3u(songs, 'myplaylist_filtered.m3u');
  },

  /* ---- helpers ---- */
  _getFilteredSongs() {
    let songs = MPStorage.getSongs();
    if (typeof MPFilter !== 'undefined') songs = MPFilter.filterSongs(songs);
    const q = document.getElementById('searchInput')?.value?.toLowerCase();
    if (q) {
      songs = songs.filter(s =>
        (s.title || '').toLowerCase().includes(q) ||
        (s.artists || '').toLowerCase().includes(q) ||
        (s.album || '').toLowerCase().includes(q)
      );
    }
    return songs;
  },

  _downloadCSV(songs, filename) {
    const header = 'video_id,title,artists,album,duration_sec,liked,play_time_ms,genre,playlists,categories,tags,sources,yt_music_url,spotify,apple_music,tidal';
    const cats = MPStorage.getCategories();
    const rows = songs.map(s => {
      const catNames = (s.categories || []).map(cid => cats.find(c => c.id === cid)?.name || '').filter(Boolean).join('; ');
      return [
        s.id,
        this._csvField(s.title),
        this._csvField(s.artists),
        this._csvField(s.album),
        s.duration || '',
        s.liked ? 1 : 0,
        s.playTimeMs || 0,
        this._csvField(s.genre),
        this._csvField((s.originalPlaylists || []).join('; ')),
        this._csvField(catNames),
        this._csvField((s.tags || []).join('; ')),
        this._csvField((s.sources || []).join('; ')),
        s.links?.youtube || '',
        s.links?.spotify || '',
        s.links?.appleMusic || '',
        s.links?.tidal || ''
      ].join(',');
    });
    this._download([header, ...rows].join('\n'), filename, 'text/csv');
  },

  _csvField(val) {
    if (!val) return '""';
    return `"${String(val).replace(/"/g, '""')}"`;
  },

  _download(content, filename, mime) {
    const blob = new Blob(['\uFEFF' + content], { type: mime + ';charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }
};
