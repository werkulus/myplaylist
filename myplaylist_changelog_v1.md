# Mojaplaylista / MyPlaylist — Changelog
**Projekt:** Portal muzyczny do zarządzania biblioteką piosenek z Vivi, RiMusic, Metrolist  
**Repozytorium:** myplaylist  

---

## v1.0.0-alpha (2026-08-24) — Etap A: Szkielet

### Utworzone pliki
| Plik | Opis |
|------|------|
| `index.html` | Główny plik HTML — layout, nawigacja, 5 widoków |
| `css/myplaylist_theme-light.css` | Jasny motyw Material 3 (zmienne CSS) |
| `css/myplaylist_theme-dark.css` | Ciemny motyw Material 3 (zmienne CSS) |
| `css/myplaylist_responsive.css` | Layout, komponenty, breakpointy mobile/tablet/desktop |
| `js/myplaylist_app.js` | Inicjalizacja, routing, renderowanie listy, import/export |
| `js/myplaylist_i18n.js` | System tłumaczeń PL/EN z lazy loading JSON |
| `js/myplaylist_storage.js` | localStorage CRUD + GitHub API sync (pull/push) |
| `js/myplaylist_csv-import.js` | Parser CSV (extractor.py format + prosty artist,title) |
| `lang/pl.json` | Polskie tłumaczenia interfejsu |
| `lang/en.json` | Angielskie tłumaczenia interfejsu |
| `docs/changelog.md` | Ten plik — dokumentacja zmian |

### Zaimplementowane funkcje
- [x] Responsywny layout (mobile hamburger menu, tablet sidebar, desktop full)
- [x] Przełącznik motywu jasny/ciemny (zapisywany w localStorage)
- [x] Przełącznik języka PL/EN (zapisywany, lazy-loaded JSON)
- [x] Import CSV z music-library-extractor.py (auto-detekcja formatu)
- [x] Import prostego CSV (artist,title)
- [x] Import/eksport pełnego JSON (backup/restore)
- [x] Drag & drop plików na dropzone
- [x] Wyświetlanie listy piosenek z miniaturkami YouTube
- [x] Wyszukiwarka (tytuł, artysta, album)
- [x] Sortowanie (tytuł, artysta, czas słuchania, data)
- [x] Eksport CSV (pełny), CSV dla Metrolist, JSON
- [x] GitHub sync — pull (pobranie library.json z repo)
- [x] GitHub sync — push (wysłanie library.json do repo)
- [x] Merge duplikatów przy imporcie (po video_id)
- [x] Statystyki w sidebarze (łącznie, polubione, czas słuchania)
- [x] Toast notifications (sukces/błąd/info)
- [x] FAQ / pomoc (PL/EN)
- [x] Panel ustawień (GitHub, Last.fm key)
- [x] Strefa niebezpieczna (wyczyść bibliotekę, reset)
- [x] Stopka z wersją i datą

### Placeholdery (następne etapy)
- [ ] Etap B: API song.link, Last.fm, LRCLIB, widok szczegółów piosenki
- [ ] Etap C: Kategorie, tagi, bulk tagging, filtrowanie
- [ ] Etap D: Eksport z filtrami, statystyki, import YouTube Takeout
- [ ] Etap E: Animacje, micro-interactions, finalne poprawki

### Struktura danych JSON
```json
{
  "version": "1.0",
  "exportDate": "ISO8601",
  "songs": [{ "id": "videoId", "title": "", "artists": "", "album": "", ... }],
  "categories": [{ "id": "cat_xxx", "name": "", "color": "#hex" }],
  "tags": ["tag1", "tag2"]
}
```

### Jak uruchomić lokalnie
```bash
cd myplaylist
python -m http.server 8000
# Otwórz http://localhost:8000
```

### Jak wdrożyć na GitHub Pages
1. Utwórz repo na GitHub (np. `myplaylist`)
2. Wrzuć wszystkie pliki
3. Settings → Pages → Source: main, folder: / (root)
4. Strona dostępna pod: `https://TWOJ_USER.github.io/myplaylist/`

### Klucze API (konfiguracja w Settings)
| API | Wymagany klucz | Rejestracja |
|-----|----------------|-------------|
| YouTube thumbnails | NIE | — |
| song.link | NIE | — |
| LRCLIB | NIE | — |
| Last.fm | TAK (darmowy) | last.fm/api/account/create |
| GitHub sync | TAK (PAT) | github.com → Settings → Developer settings → Tokens |

---

## v1.1.0-alpha (2026-08-24) — Etap B: Integracje API + widok szczegółów

### Nowe pliki
| Plik | Opis |
|------|------|
| `js/myplaylist_api-songlink.js` | song.link/odesli API — linki Spotify, Apple Music, Tidal, Deezer, Amazon, SoundCloud |
| `js/myplaylist_api-lastfm.js` | Last.fm API — gatunek, bio artysty, podobni artyści, tagi |
| `js/myplaylist_api-lyrics.js` | LRCLIB API (teksty synced) + linki do tekstowo.pl i Genius |
| `js/myplaylist_ui-detail.js` | Modal szczegółów piosenki — wszystkie API w jednym widoku |

### Zmodyfikowane pliki
| Plik | Zmiana |
|------|--------|
| `index.html` | Dodano script tags dla 4 nowych modułów |
| `js/myplaylist_app.js` | Dodano `MPDetail.init()` w inicjalizacji |

### Zaimplementowane funkcje
- [x] Kliknięcie na piosenkę otwiera modal ze szczegółami
- [x] song.link: auto-pobieranie linków do Spotify, Apple Music, Tidal, Deezer, Amazon, SoundCloud
- [x] song.link: rate limiting (~10 req/min), cache w pamięci
- [x] song.link: bulk fetch z progress callback
- [x] Last.fm: pobieranie gatunku (top tag) i wszystkich tagów utworu
- [x] Last.fm: bio artysty (w języku interfejsu PL/EN)
- [x] Last.fm: podobni artyści
- [x] Last.fm: cache w pamięci
- [x] LRCLIB: wyszukiwanie tekstu piosenki (exact match + fallback search)
- [x] LRCLIB: obsługa synced lyrics (timestamped)
- [x] Tekstowo.pl: generowany link do wyszukiwania
- [x] Genius: generowany link do wyszukiwania
- [x] Przycisk "Pobierz metadane" w modalu (fetch all APIs at once)
- [x] Auto-fetch linków platformowych przy otwarciu modalu
- [x] Dane zapisywane do localStorage po pobraniu (genre, links, lyrics)

### Architektura API
| API | Klucz | Limit | Cache |
|-----|-------|-------|-------|
| song.link (odesli) | nie | ~10/min | pamięć sesji |
| Last.fm | tak (darmowy) | brak limitu | pamięć sesji |
| LRCLIB | nie | brak limitu | pamięć sesji |
| YouTube thumbnails | nie | brak limitu | przeglądarka |
| tekstowo.pl | — | — | link (brak API) |
| Genius | — | — | link (brak API) |

---

## v1.2.0-alpha (2026-08-24) — Etap C: Kategorie, tagi, filtrowanie

### Nowe pliki
| Plik | Opis |
|------|------|
| `js/myplaylist_categories.js` | CRUD kategorii i tagów, bulk tagging, przypisywanie do piosenek |
| `js/myplaylist_search-filter.js` | Chipy filtrów (źródło, kategoria, tag, gatunek, polubione), select all |

### Zmodyfikowane pliki
| Plik | Zmiana |
|------|--------|
| `index.html` | Dodano filterBar, script tags, dynamiczny widok kategorii |
| `js/myplaylist_app.js` | Integracja MPFilter, checkboxy w kartach, tagi/kategorie widoczne, `_renderFilteredSongList()` |

### Zaimplementowane funkcje
- [x] Tworzenie kategorii z nazwą i kolorem
- [x] Tworzenie tagów
- [x] Usuwanie i zmiana nazwy kategorii/tagów
- [x] Liczniki piosenek przy każdej kategorii i tagu
- [x] Checkbox przy każdej piosence (selekcja)
- [x] Select all / deselect all
- [x] Bulk assign — zaznacz piosenki → przypisz do kategorii lub tagu jednym kliknięciem
- [x] Chipy filtrów: polubione, źródło (vivi/rimusic), kategoria, tag, gatunek
- [x] Aktywne filtry podświetlone, przycisk Clear
- [x] Kategorie i tagi widoczne na kartach piosenek w bibliotece
- [x] Gatunek widoczny w metadanych karty (po pobraniu z Last.fm)
- [x] Filtry działają łącznie z wyszukiwarką i sortowaniem
- [x] Widok kategorii renderowany dynamicznie

---

## v1.3.0-alpha (2026-08-24) — Etap D: Eksport z filtrami, statystyki, YouTube Takeout

### Nowe pliki
| Plik | Opis |
|------|------|
| `js/myplaylist_export.js` | Eksport CSV/M3U z filtrami — wg kategorii, tagu, artysty, albumu, źródła |
| `js/myplaylist_ui-stats.js` | Widok statystyk: top artyści, gatunki, źródła, kompletność danych |
| `js/myplaylist_yt-takeout.js` | Import z YouTube Takeout (Google Takeout CSV/JSON) |

### Zmodyfikowane pliki
| Plik | Zmiana |
|------|--------|
| `index.html` | Nowe przyciski (CSV filtr, M3U, YouTube Takeout), dynamiczny widok stats, 3 nowe script tags |
| `js/myplaylist_app.js` | Obsługa nowych przycisków, auto-detect YouTube Takeout, render stats on navigate |

### Zaimplementowane funkcje
- [x] Eksport CSV z bieżącym filtrem (co widzisz = co eksportujesz)
- [x] Eksport CSV wg kategorii, tagu, artysty, albumu, źródła
- [x] Eksport M3U (Extended) z bieżącym filtrem
- [x] CSV eksport z rozszerzonym zestawem kolumn (genre, categories, tags, spotify, apple_music, tidal)
- [x] BOM UTF-8 w CSV (poprawne polskie znaki w Excelu)
- [x] YouTube Takeout import — auto-detekcja formatu (CSV playlists, CSV history, JSON)
- [x] YouTube Takeout — obsługa formatu music-library-songs.csv (Title, Album, Artist)
- [x] Przycisk YouTube Takeout w dropzone
- [x] Statystyki — 6 kart podsumowania (piosenki, polubione, czas, artyści, albumy, Spotify)
- [x] Statystyki — wykresy słupkowe: top artyści, gatunki, źródła, albumy, tagi, kategorie
- [x] Statystyki — wskaźniki kompletności danych (genre, lyrics, Spotify link)
- [x] Kliknięcie na słupek w statystykach → filtruje bibliotekę po tym artyście/gatunku/źródle
- [x] Przycisk CSV w sekcji statystyk → eksport danej grupy
