/**
 * myplaylist_api-songlink.js — Integracja song.link/odesli: linki Spotify, Apple Music, Tidal, Deezer
 * Utworzono: 2026-08-24 | Projekt: Mojaplaylista v1.0
 *
 * API: https://odesli.co/ (darmowe, bez klucza, limit ~10 req/min)
 * Wejscie: YouTube URL -> Wyjscie: linki do wszystkich platform
 */
const MPSongLink = {
  _BASE: 'https://api.song.link/v1-alpha.1/links',
  _cache: {},
  _queue: [],
  _processing: false,
  _DELAY_MS: 6500, // ~10 req/min limit

  async fetchLinks(videoId) {
    if (this._cache[videoId]) return this._cache[videoId];

    const ytUrl = `https://music.youtube.com/watch?v=${videoId}`;
    try {
      const resp = await fetch(`${this._BASE}?url=${encodeURIComponent(ytUrl)}&userCountry=PL`);
      if (resp.status === 429) {
        console.warn('[songlink] Rate limited, retry later');
        return null;
      }
      if (!resp.ok) return null;

      const data = await resp.json();
      const links = {};

      if (data.linksByPlatform) {
        const map = {
          youtubeMusic: 'youtubeMusic',
          youtube: 'youtube',
          spotify: 'spotify',
          appleMusic: 'appleMusic',
          tidal: 'tidal',
          deezer: 'deezer',
          amazonMusic: 'amazonMusic',
          soundcloud: 'soundcloud'
        };
        for (const [platform, key] of Object.entries(map)) {
          if (data.linksByPlatform[platform]) {
            links[key] = data.linksByPlatform[platform].url;
          }
        }
      }

      // Extract thumbnail from entities if available
      let thumbnail = null;
      if (data.entitiesByUniqueId) {
        for (const entity of Object.values(data.entitiesByUniqueId)) {
          if (entity.thumbnailUrl) { thumbnail = entity.thumbnailUrl; break; }
        }
      }

      const result = { links, thumbnail, pageUrl: data.pageUrl || null };
      this._cache[videoId] = result;
      return result;
    } catch (e) {
      console.error('[songlink] Error:', e);
      return null;
    }
  },

  /**
   * Bulk fetch z rate limiting — przetwarza kolejke po kolei z opoznieniem
   */
  async fetchBulk(videoIds, onProgress) {
    const results = {};
    let done = 0;
    for (const id of videoIds) {
      if (this._cache[id]) {
        results[id] = this._cache[id];
        done++;
        if (onProgress) onProgress(done, videoIds.length);
        continue;
      }
      const result = await this.fetchLinks(id);
      results[id] = result;
      done++;
      if (onProgress) onProgress(done, videoIds.length);
      // Rate limit delay between requests
      if (done < videoIds.length) {
        await new Promise(r => setTimeout(r, this._DELAY_MS));
      }
    }
    return results;
  }
};
