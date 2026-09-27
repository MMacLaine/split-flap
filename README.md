# Split-Flap Board

A free split-flap message board for any screen. Put a spare monitor on the wall, open the page, and it flips through your messages, the time, Stockholm public transport departures, the weather and countdowns, one letter at a time like a railway board.

**Live:** [maclaine.se/split-flap](https://maclaine.se/split-flap)

![A split-flap board showing HELLO FROM A SPARE MONITOR above a row of colour chips](docs/board.png)

A [Vestaboard](https://www.vestaboard.com) costs thousands, and screen apps like it charge a monthly fee for each screen. This runs in a browser for nothing, with no account and no server: every board lives in the browser that made it, and a board link carries it to another screen.

## What it does

- **A physical-looking board.** Each flap steps forward through the drum to its letter, folds over its hinge with light and shadow, and settles with a small rebound. Drawn on one canvas, so a Raspberry Pi keeps up.
- **Channels:** free-text messages with colour chips, clock and date, a big clock and big text drawn in colour chips, countdowns, SL departures (any stop in Storstockholms Lokaltrafik, or the home station you starred on the [Stockholm SL map](https://maclaine.se/en/stockholm-sl-map)), weather from Open-Meteo (now, next hours or three days, with colour chip icons), animated colour patterns (Nordic flags, rain, waves, confetti), and a rotating quote.
- **Templates:** Demo, Home dashboard, Station board, Weather station, Colour mosaic, a blank page, and Everything at once: fill the screen, roll every flap the long way round, never sit still.
- **Layouts:** a page can be one zone or two (header and body, split, ticker row), each showing a different channel.
- **Playlist:** pages rotate on their own timers, optionally only at certain times and days (departures on weekday mornings). Quiet hours dim or blank the board overnight.
- **Three themes** (Vestaboard Black, Vestaboard White, Solari Amber), any grid from 1 × 4 to 24 × 60, and four transitions at three speeds, previewed on the board as you pick them. Authentic rolls every flap the whole way round.
- **Four flap sounds** (Clack, Heavy, Soft, Tick), synthesised: a plastic tick for each flap and a ka-chunk when the last one lands.
- **Type on the grid.** The composer is the board: you see exactly where each letter lands.
- **Share by link or QR (Quick Response) code.** The link holds the whole board, compressed into the part of the URL after `#`, which browsers never send to a server.
- **Made for walls:** kiosk mode (`?kiosk=1`), screen wake lock, a one pixel drift against burn-in, offline support, and a small note when live data is getting old.
- English and Swedish. Å Ä Ö Æ Ø Ü É are real flaps.

![A board showing the Swedish flag in blue and yellow colour chips, part of the Nordic flags pattern](docs/mosaic.png)

![The same board in the Solari Amber theme showing Stockholm weather and a countdown to midsummer](docs/solari.png)

## Put it on a monitor

**Raspberry Pi.** Install Raspberry Pi OS with desktop. Build your board on your phone, press Share, and open the link on the Pi with `?kiosk=1` added before the `#`. To start it at boot, add this to `~/.config/labwc/autostart` (Bookworm with Wayland; older releases call the browser `chromium-browser`):

```sh
chromium --kiosk --noerrdialogs --disable-infobars "https://maclaine.se/split-flap?kiosk=1#b=..."
```

Opening the same link at every boot is safe: a board with the same id replaces itself instead of piling up copies.

**Cast a tab** from Chrome to a Chromecast or Google TV, then press Fullscreen. **An old laptop** works too: turn off sleep, open the link, press F.

## Run your own copy

There is no build step and no dependencies. Any static file server will do:

```sh
git clone https://github.com/MMacLaine/split-flap.git
cd split-flap
python3 -m http.server 8801    # then open http://localhost:8801
```

Tests use Node's built-in runner: `npm test` (Node 18 or newer).

The SL station list in `data/sl-sites.json` is baked from SL's open site list; refresh it with `node _dev/fetch-sl-sites.mjs`.

## How it is built

| File | What it does |
|---|---|
| `src/renderer.js` | The canvas board: glyph atlas, fold, stagger, frame budget. Its constants are the design spec. |
| `src/charset.js` | The drum (73 flaps), typed text to flaps, Vestaboard character codes for import. |
| `src/content.js` | Layouts, zones and what each channel prints, as pure functions. |
| `src/pixels.js` | The 3 × 5 pixel font and the animated colour patterns. |
| `src/templates.js` | The ready-made boards. |
| `src/sound.js` | The four synthesised flap sounds. |
| `src/schedule.js` | Page timers, time windows, quiet hours. |
| `src/live.js` | SL and Open-Meteo fetchers, station and city search. |
| `src/store.js` | localStorage, board links, and the sanitizer every imported board goes through. |
| `src/app.js` | Control bar, editor drawer, composer, share, kiosk mode. |

The visual design (tile anatomy, fold shading, themes, timing) came from a design pass documented in [`DESIGN-HANDOVER.md`](DESIGN-HANDOVER.md), with the prototype and spec sheet in [`design/`](design/).

## Data and credits

- Departures: [SL](https://sl.se) through [Trafiklab](https://www.trafiklab.se), fetched straight from your browser.
- Weather and city search: [Open-Meteo](https://open-meteo.com), CC BY 4.0 (Creative Commons Attribution 4.0).
- QR codes: [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) by Kazuhiko Arase, MIT, vendored in `src/vendor/`.
- Fonts: DM Mono, Schibsted Grotesk, Plus Jakarta Sans and Cormorant Garamond, all SIL Open Font License 1.1.

QR Code is a registered trademark of DENSO WAVE INCORPORATED. Vestaboard is a trademark of Vestaboard, Inc.; this project is not affiliated with it.

## Licence

MIT. Made by [Matthew MacLaine](https://maclaine.se).
