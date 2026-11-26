<p align="center"><img src="app/logo.png" alt="Dokseo" width="200"></p>

# Dokseo

A cozy pixel library game for Windows where you read your own PDF books. The name comes from 독서, the Korean word for reading.

You walk your chibi character around a little library, put your PDFs on shelves, and jump inside a book to read it. Reading earns coins and XP, which unlock new rooms, shop items and a cat that you feed by reading.

## Features

- **Your character:** girl or boy, name, 5 hairstyles, hair, skin and outfit colors, eye styles, glasses.
- **The library:** shelves are categories with their own name, wood color and top decoration. Books peek out as you walk past or hover them. Right-click a book to move, rename, finish or remove it. A want-to-read pile sits on the table.
- **Adding books:** press N, click **+ Add book**, or drag PDF files into the window. Your character carries each book to its shelf.
- **The reader:** looks like an open book with page-turn animation. Two pages or one, zoom, brightness, and Day, Sepia, Night and Candle styles. Highlights in four colors, notes, quotes, bookmarks, search, table of contents, ambient sounds (rain, fireplace, café, deep focus, crickets), a focus timer and read aloud.
- **Mini you:** a small version of your character reads along in the corner with your cat. It turns pages, holds up a highlighter, and falls asleep if you stop reading.
- **Stats:** books finished, hours read, day streak, a heatmap of the year, this week's minutes, yearly goal, 20 achievements, a Quote Journal and a Book Journal (rating, mood, review).
- **Coins, levels and the shop:** about 50 items in four collections (BTS-inspired, K-drama, Wizard school, Wydad), reader themes and a mystery box. Levels unlock four more rooms: Fireplace Lounge, Garden Nook, Grand Hall and Starlight Room.
- **Pets:** a cat you feed with fish treats earned by reading (one per 10 minutes), and an owl that brings a letter when you level up.
- **Daily life:** three daily quests, windows that follow the real time of day, rain and snow, and a book wheel when you can't choose.

All art is drawn in code and all sounds are generated live, so the app has no image or audio files besides the logo. Everything is saved on your computer.

## Download

Get `Dokseo-Windows.zip` from the [Releases](../../releases) page, unzip it, and double-click `Dokseo.exe`. The first time, Windows may say "Windows protected your PC" because the app is not signed: click **More info**, then **Run anyway**.

## Run from source

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
npm start
```

## Build

```bash
npm run pack:win
```

builds the Windows app into `dist/Dokseo-win32-x64`.

```bash
python3 tools/build_web.py
```

builds a single-file browser version into `dist-web/dokseo.html`.

```bash
node tools/make_pdfs.js
```

rebuilds the Welcome guide that ships on the first shelf (needs Playwright).

## Project layout

| Path | What it is |
|---|---|
| `electron/main.js` | Desktop window and the `app://` file server |
| `app/index.html`, `app/style.css` | Page structure and the pastel pixel interface |
| `app/js/util.js` | Saving (IndexedDB), XP, coins, streaks, quests, achievements, pets |
| `app/js/art.js` | Pixel art: chibi characters, cats, shelves, icons |
| `app/js/items.js` | Shop items and decoration drawings |
| `app/js/world.js` | The library: rooms, movement, path finding, animations |
| `app/js/reader.js` | The PDF reader (pdf.js) |
| `app/js/ui.js` | Menus, creator, shop, stats, settings, tutorial |
| `app/js/audio.js` | Generated music, sound effects and ambient sounds |
| `prototype/` | Early design prototypes |
| `test/` | Playwright walk-through tests |

## Credits

- PDF rendering: [pdf.js](https://github.com/mozilla/pdf.js) (Apache License 2.0, see `app/vendor/LICENSE-pdfjs.txt`)
- Font: [Pixelify Sans](https://fonts.google.com/specimen/Pixelify+Sans) (SIL Open Font License, see `app/vendor/fonts/LICENSE-OFL.txt`)
- Themed shop items are fan-inspired pixel art. They don't use any official logos, photos or music.
