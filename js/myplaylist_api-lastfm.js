/**
 * myplaylist_api-lastfm.js — Integracja Last.fm: gatunek, bio artysty, podobni artysci, tagi
 * Utworzono: 2026-08-24 | Projekt: Mojaplaylista v1.0
 *
 * API: https://www.last.fm/api (darmowy klucz, bez limitu req)
 * Wymaga: klucz API w ustawieniach (settings.lastfmApiKey)
 */
const MPLastFm = {
  _BASE: 'https://ws.audioscrobbler.com/2.0/',
  _cache: {},

  _getKey() {
    return MPStorage.loadSettings().lastfmApiKey || '';
  },

  async _call(method, params) {
    const key = this._getKey();
    if (!key) return null;

    const url = new URL(this._BASE);
    url.searchParams.set('method', method);
    url.searchParams.set('api_key', key);
    url.searchParams.set('format', 'json');
    for (const [k, v] of Object.entries(params)) {
      if (v) url.searchParams.set(k, v);
    }

    try {
      const resp = await fetch(url);
      if (!resp.ok) return null;
      return await resp.json();
    } catch (e) {
      console.error('[lastfm] Error:', e);
      return null;
    }
  },

  /**
   * Pobiera info o utworze: gatunek (tagi), czas, album
   */
  async getTrackInfo(artist, title) {
    const cacheKey = `track:${artist}:${title}`;
    if (this._cache[cacheKey]) return this._cache[cacheKey];

    const data = await this._call('track.getInfo', { artist, track: title, autocorrect: '1' });
    if (!data || data.error || !data.track) return null;

    const t = data.track;
    const result = {
      genre: t.toptags?.tag?.[0]?.name || null,
      allTags: (t.toptags?.tag || []).map(tg => tg.name).slice(0, 5),
      playcount: parseInt(t.playcount) || 0,
      listeners: parseInt(t.listeners) || 0,
      albumTitle: t.album?.title || null,
      albumImage: t.album?.image?.find(i => i.size === 'large')?.['#text'] || null,
      url: t.url || null,
    };
    this._cache[cacheKey] = result;
    return result;
  },

  /**
   * Pobiera info o artyście: bio, zdjęcie, tagi, podobni
   */
  async getArtistInfo(artist) {
    const cacheKey = `artist:${artist}`;
    if (this._cache[cacheKey]) return this._cache[cacheKey];

    const data = await this._call('artist.getInfo', { artist, autocorrect: '1', lang: MPi18n.currentLang });
    if (!data || data.error || !data.artist) return null;

    const a = data.artist;
    const result = {
      name: a.name,
      bio: a.bio?.summary?.replace(/<[^>]+>/g, '').trim() || null,
      bioFull: a.bio?.content?.replace(/<[^>]+>/g, '').trim() || null,
      image: a.image?.find(i => i.size === 'large')?.['#text'] || null,
      tags: (a.tags?.tag || []).map(tg => tg.name).slice(0, 5),
      similar: (a.similar?.artist || []).map(s => s.name).slice(0, 5),
      listeners: parseInt(a.stats?.listeners) || 0,
      playcount: parseInt(a.stats?.playcount) || 0,
      url: a.url || null,
    };
    this._cache[cacheKey] = result;
    return result;
  },

  /**
   * Pobiera komplet danych dla piosenki (track + artist)
   */
  async fetchFullMetadata(artist, title) {
    const [trackInfo, artistInfo] = await Promise.all([
      this.getTrackInfo(artist, title),
      this.getArtistInfo(artist)
    ]);
    return { trackInfo, artistInfo };
  }
};
