# Split-Flap: roadmap handover

Date: 27 September 2026, reassessed the same evening after 0.2 shipped. Owner: Matthew. Target: `~/split-flap/ROADMAP.md`.
Companion to `DESIGN-HANDOVER.md` (how the board looks) and `DESIGN-HANDOVER-editor.md` (how the editor works). This one is about what comes next.

## Where it stands

0.2 is live on maclaine.se. It has the three level editor with the content picker, the Type, Paint and Photo composer, eight new channels, the stacked layout, a board location, nine templates, Save as image and a guide. The tests pass, 41 of them, including one that composes every channel on every layout.

Checked today against the running app, at 1440 px and at 400 px:

- The picker, the page level, the playlist rail, Board settings, the Start panel and Help all match the editor handover.
- Follow a URL is the best screen in the editor. Sample feed, token buttons, and a print preview drawn at the zone's shape.
- The three new data sources answer with open CORS headers: the Swedish Wikipedia edition serves the on-this-day feed, elprisetjustnu.se returns quarter hour prices which the fetcher averages, and Frankfurter answers at its new address.
- Not checked: the composer on a phone with the keyboard up, and drag to reorder on touch. Both want a minute on a real phone.

From the first roadmap, these shipped in 0.2: rotating messages, word clock, count up, Today (without name days), sun times in Today, electricity, currency, on this day, save as image, the stacked layout, the whole editor redesign, photo to chips, paint, menu with the Café and Office lobby templates, Follow a URL, drafts, undo and redo, board location.

## Fix first

Two things seen in the screenshots. Together they are an hour.

1. **The Café template overflows its own board.** On the default 6 × 22 the English item "CAKE OF THE DAY 45" prints as "CAKE OF THE DA 45 KR". The `lr` helper in `src/content.js` cuts the name mid word with one space before the price. Shorten the template item so it fits, and make `lr` cut at the last space when it has to cut, or leave two spaces, so a long name loses a word rather than a letter. The SL `row` helper has the same cut.
2. **The picker shows one tile per row on a 6 × 22 board.** The single column rule in `src/editor.js` compares flap counts, and 22 over 6 is 3.67, past the 3.2 threshold meant for ticker rows. Each tile is then about 200 px tall and eighteen tiles are a long scroll. Compare the drawn aspect instead (tile width 0.79H by row height 1.17H, so 6 × 22 is 2.5) or raise the threshold, and the default board gets two columns.

## Easy wins

Left from the first list, each a session or less on the existing shape of the app.

1. **Name days.** Today is built for it, the licence is the block. Svenska Akademien's list is protected. Check whether the 2001 list is free to reproduce, or find a source that is, before baking `data/namnsdagar.json`.
2. **Heart flap.** Add ♥ to `DRUM` in `src/charset.js` before the chips. The atlas may need to draw it as a shape if DM Mono lacks the glyph. Strip the variation selector a phone sends after ❤ and fold ❤ to ♥ in `FOLD_MAP`. The two 73 flap tests change.
3. **Colour squares as chips.** The coloured square emoji from a phone keyboard place the matching chip in the composer. The map sits in `src/composer.js`, so quotes and big text are untouched. No emoji maps to filled, so that stays a swatch.
4. **Start-up roll and hourly roll.** A Board setting that runs every flap once when the board opens, and optionally once an hour. A stuck flap flicker every few minutes is a small extra in the same place.
5. **Transition per page.** A page may override the board transition. One field, sanitized against `TRANSITIONS`, applied in `src/app.js` when the page changes.
6. **Transparent backdrop.** `?bg=transparent` skips the wall paint and clears the page background, so the board drops into OBS as a browser source.
7. **Stereo flaps.** Pan each flap's click by column with a StereoPannerNode in `src/sound.js`. The renderer's `onFlip` has to pass the column through.
8. **Reload when a new version is live.** Once an hour fetch `src/changelog.js` as text with `cache: 'no-cache'` from the fixed URL off `import.meta.url` and read the first version. If it differs, reload during quiet hours or at 04:00.
9. **Pi installer.** A shell script in `_dev/` that writes the labwc autostart line with the board link, turns off screen blanking and hides the cursor. Needs a run on a real Pi before it goes in the README.
10. **Dated pages.** A page window gains a date and a yearly flag, so a birthday page shows on 14 March every year. `inWindow` in `src/schedule.js` grows one check. This is also the first piece of the week planner below.

## Quick wins

### Copy and polish after 0.2

- **A native read of the Swedish.** The editor handover asked for it and the new channels doubled the strings. A read of the English for the new channels at the same time.
- **Keep the source photo.** Only the cells are stored, so a photo cannot be re-cropped later. Keep the image in IndexedDB, the browser's local database, keyed by zone. It stays off the board link.
- **Phone pass.** Composer with the keyboard up, drag to reorder on touch, and the Paint stroke on a small grid.

### Planning the week

The idea is to plan a board around a week. Train times alone from 06:30 to 07:15 on weekdays, a welcome home at 17:00, and the weather and a countdown the rest of the evening.

Most of this can be done today with a time window on each page, but it is hard to see, and it has two gaps. A page without a window shows at any time, so a morning page only shows alone if every other page has a window too. A page also has one window, so weekday mornings and Saturday mid-morning need two copies of the page.

- **Several windows per page.** `win` becomes a list. Old boards read as a list of one, so nothing breaks.
- **Show alone.** A per-page switch so that while its window is open, only pages in their window show. Boards that rely on today's behaviour keep it.
- **Week view.** Seven days across and the hours down, with each page's windows drawn as blocks in the page's thumbnail colours. Drag on an empty slot to give a page a window there, drag a block's edge to change it, tap a block to open the page. It sits beside the playlist as a second way to see the same pages. It wants a design pass, especially at 400 px, where a day at a time is likely the answer.
- **Sunset windows.** Quiet hours and page windows accept sunset and sunrise as times, using the board location. A dim curve rather than a step is a small addition.
- Later, with the relay, the phone could push a one-off block for tonight without editing the week.

### Content

- **Board words in more languages.** Norwegian, Danish, Finnish and German for what the board prints (days, months, the short words in `WORDS`), while the chrome stays English and Swedish. The drum already carries Æ Ø Ü É.
- **Recipes for Follow a URL.** A `recipes/` folder of ready templates (a Gist, a published Google Sheet, a departures feed for another city) that the URL tile can offer as starting points.
- **A second quote set or your own.** Quotes has Proverbs and About work. A third option that reads your own lines would let Rotating messages and Quotes merge, or make Quotes the curated one and leave it.

### Board and wall

- **Record a flip.** Capture the canvas with MediaRecorder to a short video while a page changes. WebM in Chrome and Firefox, MP4 in Safari, so pick whichever format `isTypeSupported` says yes to. That shares to social without a GIF encoder.
- **More themes.** Solari white, an airport blue, a Note theme. Themes are data in `src/renderer.js`, but the palettes want a design eye.
- **Web Component.** `<split-flap-board rows cols theme>` wrapping the renderer, published as a package. Other sites embed it, the repo gets found. A day, plus a README.

## Future wins

All of these need a relay, an account, or both. None of them changes what is built above, because a relay only replaces where a board is loaded from.

- **Relay.** A Cloudflare Worker with a Durable Object. A board gets an id and a write key, both carried in the link like today. The kiosk holds a WebSocket. The phone saves to the relay as well as localStorage. `openLink` in `src/app.js` already replaces a board with the same id, which is the behaviour the relay needs.
- **Send now.** A message that interrupts the playlist for a set number of minutes and then hands back. Vestaboard calls it pinning.
- **Scoreboard, timer, list.** The Later tiles in the picker. A wall screen usually has no keyboard or touch, so these make sense once the phone can drive the board through the relay.
- **Guest messaging.** A QR in the corner of the kiosk opens a compose only page. What is typed lands on the wall.
- **Screens.** One phone, several kiosks. Mirroring, last seen, current page, version, remote reload. This is SplitFlapTV's screen management.
- **Shortcuts and voice.** A `send` URL with id, key and text, so iOS Shortcuts and Siri can post.
- **Vestaboard API shape.** The relay accepts Vestaboard's read/write message format. `src/charset.js` already decodes the codes. Every existing Vestaboard integration then works here by changing a URL.
- **Stock ticker.** Already a Later tile. Every free price API I know of needs a key, so it waits for the relay.
- **Integrations that need a secret.** Calendar by ICS, Spotify now playing, Strava, RSS headlines, sports, Home Assistant with a token. Each needs a proxy holding a key, so they wait for the relay.
- **Public gallery.** Shared boards on the about page. Needs moderation, which means accounts.
- **Google TV package.** A trusted web activity, so a television runs the board without a laptop casting to it. Apple TV has no browser, so AirPlay from a phone is the answer there.

### On accounts and Cloudflare

- Start with board keys. A link with a write key is an account for one board and needs no sign in. Most people have one board and one screen.
- Add accounts when a board has several owners, or someone gets a new phone and wants their boards back. Passkeys on a Worker, or a magic link by email, both run on the free tier.
- The free tier covers a lot. Workers allow a hundred thousand requests a day, but KV only allows a thousand writes a day, and writes are what a phone sending messages makes. That points at Durable Objects for board state, which are on the free plan now. A kiosk on a WebSocket with hibernation costs close to nothing. Polling every ten seconds would burn through the allowance with a dozen screens, so the kiosk should hold a socket.
- Data stays small. A board is a few kilobytes of JSON. No images on the server, since photos become chips in the browser before anything is saved.
- The README line about no server stays true until the relay ships, and then becomes "no server unless you connect a wall screen".

## Not doing

- Lowercase letters on the drum. The hardware does not have them.
- Native phone apps. The web app on the phone is the editor.
- A paid tier.
- Executing third party code as channels. Recipes for Follow a URL cover most of it without running anyone's script.
- Moon phase. Dropped on review of the editor handover, and nothing since has asked for it.

## Suggested order

1. The two fixes above, then a phone pass.
2. Dated pages, several windows per page and Show alone. Three small changes to `src/schedule.js` and the page level that make the week planner possible.
3. Easy wins 2 to 9 in any order, as filler between larger pieces.
4. Week view, after a design pass.
5. Record a flip, more themes, web component.
6. Relay, then the rest of the future list.
