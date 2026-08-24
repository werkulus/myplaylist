/**
 * myplaylist_i18n.js — System tlumaczen PL/EN dla Mojaplaylista
 * Utworzono: 2026-08-24 | Projekt: Mojaplaylista v1.0
 */
const MPi18n = {
  _lang: 'pl',
  _strings: {},

  async init() {
    this._lang = localStorage.getItem('mp_language') || 'pl';
    await this.loadLanguage(this._lang);
  },

  async loadLanguage(lang) {
    try {
      const resp = await fetch(`lang/${lang}.json`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      this._strings = await resp.json();
      this._lang = lang;
      localStorage.setItem('mp_language', lang);
      this.applyToDOM();
    } catch (e) {
      console.error(`[i18n] Failed to load ${lang}:`, e);
    }
  },

  get currentLang() { return this._lang; },

  t(key, params = {}) {
    const keys = key.split('.');
    let val = this._strings;
    for (const k of keys) {
      if (val && typeof val === 'object' && k in val) { val = val[k]; }
      else { return key; }
    }
    if (typeof val !== 'string') return key;
    return val.replace(/\{(\w+)\}/g, (_, p) => params[p] ?? `{${p}}`);
  },

  applyToDOM() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const text = this.t(key);
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = text;
      } else {
        el.textContent = text;
      }
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      el.title = this.t(el.getAttribute('data-i18n-title'));
    });
    document.title = this.t('app.title');
  },

  async toggle() {
    const next = this._lang === 'pl' ? 'en' : 'pl';
    await this.loadLanguage(next);
    document.dispatchEvent(new CustomEvent('mp:languageChanged', { detail: next }));
  }
};
