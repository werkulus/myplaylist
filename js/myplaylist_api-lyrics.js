/**
 * myplaylist_api-lyrics.js — Pobieranie tekstow piosenek: LRCLIB (synced) + link tekstowo.pl
 * Utworzono: 2026-08-24 | Projekt: Mojaplaylista v1.0
 *
 * LRCLIB: https://lrclib.net (darmowe, bez klucza)
 * Tekstowo.pl: generowany link (bez API, przekierowanie do wyszukiwania)
 */
const MPLyrics = {
  _LRCLIB_BASE: 'https://lrclib.net/api',
  _cache: {},

  /**
   * Szuka tekstu na LRCLIB po artyście i tytule
   * Zwraca: { plainLyrics, syncedLyrics, source }
   */
  async fetchLRCLIB(artist, title, duration) {
    const cacheKey = `lrc:${artist}:${title}`;
    if (this._cache[cacheKey]) return this._cache[cacheKey];

    try {
      // Try exact match first
      const params = new URLSearchParams({
        artist_name: artist,
        track_name: title,
      });
      if (duration) params.set('duration', String(duration));

      let resp = await fetch(`${this._LRCLIB_BASE}/get?${params}`);

      // Fallback to search if exact match fails
      if (!resp.ok) {
        const searchParams = new URLSearchParams({ q: `${artist} ${title}` });
        resp = await fetch(`${this._LRCLIB_BASE}/search?${searchParams}`);
        if (!resp.ok) return null;
        const results = await resp.json();
        if (!results.length) return null;
        // Pick best match
        const best = results[0];
        const result = {
          plainLyrics: best.plainLyrics || null,
          syncedLyrics: best.syncedLyrics || null,
          source: 'lrclib',
        };
        this._cache[cacheKey] = result;
        return result;
      }

      const data = await resp.json();
      const result = {
        plainLyrics: data.plainLyrics || null,
        syncedLyrics: data.syncedLyrics || null,
        source: 'lrclib',
      };
      this._cache[cacheKey] = result;
      return result;
    } catch (e) {
      console.error('[lyrics] LRCLIB error:', e);
      return null;
    }
  },

  /**
   * Generuje link do wyszukiwania na tekstowo.pl
   */
  buildTekstowoUrl(artist, title) {
    if (!artist && !title) return null;
    const query = `${artist} ${title}`.trim();
    return `https://www.tekstowo.pl/wyszukaj.html?search-text=${encodeURIComponent(query)}`;
  },

  /**
   * Generuje link do Genius
   */
  buildGeniusUrl(artist, title) {
    if (!artist && !title) return null;
    const query = `${artist} ${title}`.trim();
    return `https://genius.com/search?q=${encodeURIComponent(query)}`;
  },

  /**
   * Pobiera tekst i buduje linki do serwisow z tekstami
   */
  async fetchAll(artist, title, duration) {
    const [lrclib] = await Promise.all([
      this.fetchLRCLIB(artist, title, duration),
    ]);

    return {
      lyrics: lrclib?.plainLyrics || null,
      syncedLyrics: lrclib?.syncedLyrics || null,
      lyricsSource: lrclib ? 'LRCLIB' : null,
      tekstowoUrl: this.buildTekstowoUrl(artist, title),
      geniusUrl: this.buildGeniusUrl(artist, title),
    };
  }
};
