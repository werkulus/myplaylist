/**
 * myplaylist_csv-import.js — Parsowanie CSV z music-library-extractor.py i YouTube Takeout
 * Utworzono: 2026-08-24 | Projekt: Mojaplaylista v1.0
 */
const MPCsvImport = {
  /**
   * Parsuje CSV z music-library-extractor.py.
   * Kolumny: video_id,title,artists,album,duration_sec,liked,play_time_ms,playlists,sources,thumbnail_url,yt_music_url
   */
  parseExtractorCSV(text) {
    const lines = this._parseCSVLines(text);
    if (lines.length < 2) return [];
    const header = lines[0].map(h => h.trim().toLowerCase());
    const songs = [];
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i];
      if (row.length < 2) continue;
      const get = (col) => {
        const idx = header.indexOf(col);
        return idx >= 0 && idx < row.length ? row[idx].trim() : '';
      };
      const id = get('video_id');
      if (!id) continue;
      songs.push({
        id,
        title: get('title'),
        artists: get('artists'),
        album: get('album'),
        duration: parseInt(get('duration_sec')) || null,
        liked: get('liked') === '1',
        playTimeMs: parseInt(get('play_time_ms')) || 0,
        sources: get('sources').split(';').map(s => s.trim()).filter(Boolean),
        originalPlaylists: get('playlists').split(';').map(s => s.trim()).filter(Boolean),
        thumbnailUrl: get('thumbnail_url') || `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
        links: { youtube: get('yt_music_url') || `https://music.youtube.com/watch?v=${id}` },
        tags: [],
        categories: [],
        genre: null,
        year: null,
        lyrics: null,
        metadataFetched: null,
        addedAt: new Date().toISOString(),
      });
    }
    return songs;
  },

  /**
   * Parsuje prosty CSV (artist,title) — np. eksport z Metrolist lub reczny.
   * Bez video_id generuje tymczasowe ID.
   */
  parseSimpleCSV(text) {
    const lines = this._parseCSVLines(text);
    if (lines.length < 2) return [];
    const header = lines[0].map(h => h.trim().toLowerCase());
    const songs = [];
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i];
      if (row.length < 2) continue;
      const get = (col) => {
        const idx = header.indexOf(col);
        return idx >= 0 && idx < row.length ? row[idx].trim() : '';
      };
      const title = get('title') || row[1]?.trim() || '';
      const artists = get('artist') || get('artists') || row[0]?.trim() || '';
      if (!title) continue;
      songs.push({
        id: get('video_id') || `manual_${Date.now()}_${i}`,
        title, artists,
        album: get('album') || '',
        duration: parseInt(get('duration') || get('duration_sec')) || null,
        liked: false, playTimeMs: 0,
        sources: ['csv_import'],
        originalPlaylists: [],
        thumbnailUrl: '',
        links: {},
        tags: [], categories: [],
        genre: null, year: null, lyrics: null,
        metadataFetched: null,
        addedAt: new Date().toISOString(),
      });
    }
    return songs;
  },

  /**
   * Auto-detect CSV format i parsuj.
   */
  autoParseCSV(text) {
    const firstLine = text.split('\n')[0].toLowerCase();
    if (firstLine.includes('video_id')) {
      return this.parseExtractorCSV(text);
    }
    return this.parseSimpleCSV(text);
  },

  /**
   * Parsuj JSON z eksportu MyPlaylist.
   */
  parseJSON(text) {
    const data = JSON.parse(text);
    if (data.songs && Array.isArray(data.songs)) {
      return data;
    }
    throw new Error('Invalid JSON format — missing "songs" array');
  },

  /* ---- CSV parser (handles quoted fields) ---- */
  _parseCSVLines(text) {
    const lines = [];
    let current = [];
    let field = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '"') {
        if (inQuotes && text[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (ch === ',' && !inQuotes) {
        current.push(field); field = '';
      } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        current.push(field); field = '';
        if (current.some(c => c.trim())) lines.push(current);
        current = [];
      } else {
        field += ch;
      }
    }
    current.push(field);
    if (current.some(c => c.trim())) lines.push(current);
    return lines;
  }
};
