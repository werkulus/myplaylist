/**
 * myplaylist_yt-takeout.js — Import playlist z YouTube Takeout (Google Takeout CSV/JSON)
 * Utworzono: 2026-08-24 | Projekt: Mojaplaylista v1.0
 *
 * Google Takeout YouTube format:
 * - CSV: "Video Id","Time Added" (w playlists/) lub "Video Id","Channel Id","Time Added"
 * - JSON: array of objects with "contentDetails.videoId"
 *
 * Uzycie: takeout.google.com → YouTube → Playlists → CSV
 */
const MPYtTakeout = {

  /**
   * Parsuje plik CSV z YouTube Takeout.
   * Format 1 (playlists): Video Id, Time Added
   * Format 2 (history):   Video Id, Channel Id, Time Added
   * Format 3 (music-library-songs.csv): Title, Album, Artist, Duration
   */
  parseTakeoutCSV(text, playlistName) {
    const lines = this._parseCSVLines(text);
    if (lines.length < 2) return [];

    const header = lines[0].map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
    const songs = [];

    // Detect format
    const hasVideoId = header.includes('video_id');
    const hasTitle = header.includes('title');

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i];
      if (row.length < 1) continue;
      const get = (col) => {
        const idx = header.indexOf(col);
        return idx >= 0 && idx < row.length ? row[idx].trim() : '';
      };

      if (hasVideoId) {
        const id = get('video_id');
        if (!id || id === 'Video Id') continue;

        songs.push({
          id,
          title: get('title') || '',
          artists: get('channel_title') || get('artist') || '',
          album: get('album') || '',
          duration: null,
          liked: false,
          playTimeMs: 0,
          sources: ['youtube_takeout'],
          originalPlaylists: playlistName ? [playlistName] : [],
          thumbnailUrl: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
          links: { youtube: `https://music.youtube.com/watch?v=${id}` },
          tags: [],
          categories: [],
          genre: null, year: null, lyrics: null,
          metadataFetched: null,
          addedAt: get('time_added') || new Date().toISOString(),
        });
      } else if (hasTitle) {
        // music-library-songs.csv format (no video ID)
        const title = get('title');
        const artist = get('artist');
        if (!title) continue;
        songs.push({
          id: `yt_takeout_${Date.now()}_${i}`,
          title,
          artists: artist,
          album: get('album') || '',
          duration: this._parseDuration(get('duration')),
          liked: false, playTimeMs: 0,
          sources: ['youtube_takeout'],
          originalPlaylists: playlistName ? [playlistName] : [],
          thumbnailUrl: '', links: {},
          tags: [], categories: [],
          genre: null, year: null, lyrics: null,
          metadataFetched: null,
          addedAt: new Date().toISOString(),
        });
      }
    }
    return songs;
  },

  /**
   * Parsuje JSON z YouTube Takeout
   */
  parseTakeoutJSON(text, playlistName) {
    const data = JSON.parse(text);
    const items = Array.isArray(data) ? data : (data.items || data.videos || []);
    const songs = [];

    for (const item of items) {
      const id = item.contentDetails?.videoId || item.videoId || item.id;
      if (!id) continue;
      songs.push({
        id,
        title: item.snippet?.title || item.title || '',
        artists: item.snippet?.channelTitle || item.artist || '',
        album: item.album || '',
        duration: null,
        liked: false, playTimeMs: 0,
        sources: ['youtube_takeout'],
        originalPlaylists: playlistName ? [playlistName] : [],
        thumbnailUrl: item.snippet?.thumbnails?.medium?.url || `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
        links: { youtube: `https://music.youtube.com/watch?v=${id}` },
        tags: [], categories: [],
        genre: null, year: null, lyrics: null,
        metadataFetched: null,
        addedAt: item.snippet?.publishedAt || new Date().toISOString(),
      });
    }
    return songs;
  },

  /**
   * Auto-detect i parsuj plik YouTube Takeout
   */
  autoImport(text, filename) {
    const playlistName = filename
      ? filename.replace(/\.(csv|json)$/i, '').replace(/[-_]/g, ' ')
      : 'YouTube Takeout';

    if (filename?.endsWith('.json')) {
      return this.parseTakeoutJSON(text, playlistName);
    }
    return this.parseTakeoutCSV(text, playlistName);
  },

  _parseDuration(text) {
    if (!text) return null;
    const parts = text.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return null;
  },

  _parseCSVLines(text) {
    const lines = [];
    let current = [];
    let field = '';
    let inQ = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '"') { if (inQ && text[i+1] === '"') { field += '"'; i++; } else { inQ = !inQ; } }
      else if (ch === ',' && !inQ) { current.push(field); field = ''; }
      else if ((ch === '\n' || ch === '\r') && !inQ) {
        if (ch === '\r' && text[i+1] === '\n') i++;
        current.push(field); field = '';
        if (current.some(c => c.trim())) lines.push(current);
        current = [];
      } else { field += ch; }
    }
    current.push(field);
    if (current.some(c => c.trim())) lines.push(current);
    return lines;
  }
};
