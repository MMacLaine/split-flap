# Split-Flap: roadmap handover

Date: 27 September 2026. Owner: Matthew. Target: `~/split-flap/ROADMAP.md`.
Companion to `DESIGN-HANDOVER.md`, which settled how the board looks. This one is about what the board can do next.

## Scope

- Remote control from a phone (send a message and the wall changes) is the biggest gap against Vestaboard. I am not building it today. It sits under Future wins with the design already thought through, so the earlier work does not paint it into a corner.
- Everything stays free. The site runs on Cloudflare Pages and the free tier there is generous, so accounts and a relay are possible later without a bill. Notes on that at the end.
- The competitor to measure against for content is SplitFlapTV (menus, price lists, live data from a URL, countdowns, counters, quotes, dayparting). For the board itself and the message culture it is Vestaboard.
- New content kinds (photos, drawing, more channels) are wanted, but the editor cannot take twenty channels in a select box. The editor redesign is a quick win and it gates most of the content work, so it comes first in that tier.

Sizes are rough. Easy is a session or less with no new infrastructure and no design pass. Quick is a day or two, some of it design. Future needs a relay, accounts or a longer design pass.

## Easy wins

Each of these is a channel or a setting on the existing shape of the app. Most touch `src/content.js` for the words, `src/store.js` for the sanitizer, `src/strings.js` for the labels in both languages, and one line in the channel list. Each new channel comes with tests in `test/core.test.mjs` for its sanitizer and its lines, like the existing ones.

1. **Rotating messages.** A list of lines. Each time the playlist comes back to the page it shows the next one, since a kiosk rarely reloads. Vestaboard calls this a blended feed. Stored as `o.list`, wrapped like `text` is today.
2. **Word clock.** The time in words, "KVART ÖVER TIO" and "QUARTER PAST TEN". Number words for both languages live beside `DAYS` and `MONTHS` in content.js.
3. **Count up.** A direction toggle on the countdown, so "DAYS SINCE" works. Same zone, same sanitizer, one new field.
4. **Today.** Date, Swedish name day, and the name of a red day or flag day when there is one. Name days are a fixed list, baked into `data/` like the SL site list. Red days are computed (Easter needs the algorithm, the rest are fixed dates). Confirm the name day list's licence before shipping. Svenska Akademien's list is the obvious source and it is protected, so it likely needs permission or a different source.
5. **Sun and moon.** Sunrise, sunset, daylight length and moon phase, computed locally. No fetch, so it works offline. The coordinates are the problem. Today `lat` and `lon` are stored on each weather zone (`src/store.js`), so a board with no weather zone has no location and one with two has two. This needs a board location first, a Board setting with the same city search, which weather zones then default to. Sunset windows further down need it too.
6. **Electricity price.** Spot price now and the next hours from elprisetjustnu.se, keyless with CORS. Price zone SE1 to SE4 as an option. Hours as chips coloured by how dear they are. The Nordic market has priced in 15 minute slots since October 2025, so the feed likely returns 96 prices a day, and the channel averages each hour's four for the chips. Third fetcher in `src/live.js`, same stale rules as weather. Attribution in the footer.
7. **Currency.** A pair or two from Frankfurter (ECB rates, keyless, CORS). Ticker friendly. I believe it has moved from frankfurter.app to frankfurter.dev, so check the current address before building on it.
8. **On this day.** Wikipedia's on-this-day feed, keyless with CORS. English is certain; check that the Swedish edition serves the feed before promising it.
9. **Heart flap.** Vestaboard Note added a heart to the drum. Add ♥ to `DRUM` in `src/charset.js` before the chips. The atlas in `src/renderer.js` may need to draw it as a shape if DM Mono lacks the glyph. Stored boards are unaffected since links carry characters, but the authentic roll gets one flap longer and the two 73 flap tests change. A phone usually sends ❤️ as two code points, the heart and a variation selector (U+FE0F), and `textToCells` would turn the selector into an invalid blank. So the selector gets stripped and ❤ folds to ♥ in `FOLD_MAP`.
10. **Colour squares as chips.** In the composer, the coloured square emoji from a phone keyboard place the matching chip. The chip buttons stay. charset.js says chips are not reachable from free text on purpose, so that lowercase letters always print as capitals. Emoji do not break that, but the map should sit in the composer's input handling rather than in `cleanChar`, or 🟥 becomes a chip in quotes and big text as well. No emoji maps to filled, so that one stays a button.
11. **Save as image.** Render the current grid to an offscreen canvas at twice the device pixel ratio and download a PNG. Needs a static render helper in renderer.js that draws one frame without animation. The same helper is what the editor redesign uses for thumbnails, so build it once.
12. **Start-up roll and hourly roll.** A Board setting that runs every flap once when the board opens, like a Solari board on power up, and optionally once an hour. A stuck-flap flicker every few minutes, one flap only, is a small extra in the same place.
13. **Transition per page.** A page may override the board transition. One field, sanitized against `TRANSITIONS`, applied in `app.js` when the page changes.
14. **Stacked layout.** Top half and bottom half, for portrait screens. One line in `zonesFor` and a pictogram in the layout picker.
15. **Transparent backdrop.** `?bg=transparent` skips the wall paint and clears the page background, so the board drops into OBS as a browser source.
16. **Stereo flaps.** Pan each flap's click by column with a StereoPannerNode in `src/sound.js`. The renderer's `onFlip` needs to pass the column. `_start` only gets the cell, so the column has to come through from the loop that queues the flips, or be stored on the cell.
17. **Reload when a new version is live.** Once an hour fetch `src/changelog.js` as text with `cache: 'no-cache'` and read the first version from it. Use the fixed URL from `import.meta.url` rather than a query string, or the service worker keeps a new cache entry every hour, and it has to resolve under `?assets=` on maclaine.se. If it differs, reload during quiet hours or at 04:00. The service worker is network first, so the reload is all that is needed.
18. **Pi installer.** A shell script in `_dev/` that writes the labwc autostart line with the board link, turns off screen blanking, and hides the cursor. Needs a run on a real Pi before it goes in the README.

## Quick wins

### The editor redesign

This is the first quick win because the content ones depend on it.

What is wrong today:

- The content type is a select box inside each zone card. Nine options with names like Big text and Colour pattern, no preview. It will not take twenty.
- The Pages tab stacks the playlist, the page name, the layout, the zones, the composer and the time window in one scroll. On a phone that is a long way down.
- Templates live under Boards, the third tab. The best place to start is the hardest to find.
- Pictures have no home. Photo and drawing are message zone tools, but the composer is built for typing.

Principles:

- Show, do not name. Every choice is previewed on a small real board in the current theme, drawn with the same renderer.
- One decision per screen on a phone. Drill down and back, no stacking.
- The big board is already the live preview. Keep that, and make the drawer match it.

Proposed structure, three levels in the drawer:

1. **Playlist.** Pages as thumbnails rendered by the static helper (item 11 above), with duration and a window badge. Drag to reorder. Tap a page to open it. Add page opens the content picker straight away.
2. **Page.** Layout picker as it is now. Below it a diagram of the board with the zones drawn to scale. Tap a zone to edit it. Timing and window at the foot.
3. **Content.** A picker that fills the drawer. Search at the top. Groups, each a row of tiles with a mini preview and one line of description:
   - Words: Message, Rotating messages, Big text, Quotes, Menu
   - Time: Clock and date, Big clock, Word clock, Countdown, Today
   - Live: SL departures, Weather, Electricity, Currency, On this day, Follow a URL
   - Pictures: Draw, Photo, Colour pattern
   - Play: Scoreboard, Timer, List
   Tap a tile and it lands in the zone with sensible defaults, then that channel's options appear below.

Other changes in the same pass:

- Templates become a Start panel, shown on first Edit and on New board, as a grid of live thumbnails. Boards keeps manage, export and import.
- The composer gets a mode switch, Type, Paint and Photo, all writing the same `cells` array. Paint drags chips across the grid. Photo opens the file picker or the camera.
- Options per channel shrink to what matters. Advanced ones sit behind a disclosure.
- Phone: the preview board stays on top, the drawer below shows one level at a time with a back control.

The constraints from the design brief carry over, so plain CSS on the chrome tokens, left aligned, good at 400 px, no framework. This deserves a short design session in the same format as `DESIGN-HANDOVER.md`, with the drawer, the picker, the zone diagram and the composer modes as the surfaces. Claude Design can do that pass. It comes before any of the build, so the picker is not built twice. After it I would build the picker first since it unblocks new channels, then playlist thumbnails, then Start, then composer modes.

### Content and channels

- **Photo to chips.** Draw the image to a canvas the size of the zone, map each cell to the nearest of the eight chips, filled and blank, with optional dithering. The result is a `cells` array, which the message zone already stores. Vestaboard's most shared feature, and it runs entirely in the browser.
- **Paint mode.** Drag to paint chips, a fill tool, horizontal mirror for symmetry. Same data.
- **Menu and price list.** Rows of name and price, price right aligned, an optional chip at the start of each row for colour. The `row()` helper from the SL channel does the alignment. Comes with a Café and an Office lobby template. This is the SplitFlapTV use case.
- **Follow a URL.** Fetch a JSON or text URL on an interval and print lines from a template like `{{line}} {{dest}} {{min}} MIN`. https only, sanitized like everything else. The other end has to send CORS headers, which a Gist and a published Google Sheet do. Home Assistant can too, but it needs a bearer token and `cors_allowed_origins` set up, and the token would sit in the board link and travel wherever the link is shared. So Home Assistant waits for the relay, which can hold the token. This covers most of what people build on Vestaboard+ with no infrastructure here. A `recipes/` folder of ready templates follows once it exists.
- **Dated pages.** A page window gains a date and a yearly flag, so a birthday page shows on 14 March every year. `inWindow` in `src/schedule.js` grows one check.
- **Board words in more languages.** Norwegian, Danish, Finnish and German for what the board prints (days, months, the short words in `WORDS`), while the chrome stays English and Swedish. The drum already carries Æ Ø Ü É.
- **Drafts and history.** Messages typed in the composer kept in localStorage, so a past message can be brought back. Undo and redo in the composer at the same time.

### Planning the week

The idea is to plan a board around a week. For example, train times alone from 06:30 to 07:15 on weekdays, a welcome home message at 17:00, and the weather and a countdown the rest of the evening.

Most of this can be done today with a time window on each page, but it is hard to see, and it has two gaps. A page without a window shows at any time, so a morning page only shows alone if every other page has a window too. A page also has one window, so weekday mornings and Saturday mid-morning need two copies of the page.

- **Week view.** Seven days across and the hours down, with each page's windows drawn as blocks in the page's thumbnail colours. Drag on an empty slot to give a page a window there, drag a block's edge to change it, tap a block to open the page. It sits beside the playlist as a second way to see the same pages. It wants a design pass, especially at 400 px, where a day at a time is likely the answer.
- **Several windows per page.** `win` becomes a list. Old boards read as a list of one, so nothing breaks.
- **Show alone.** A per-page switch so that while its window is open, only pages in their window show. This is the train times case. It is a switch, so boards that rely on today's behaviour keep it.
- **Dated pages** (above) fit the same view as blocks on a date.
- Later, with the relay, the phone could push a one-off block for tonight without editing the week.

### Board and wall

- **Record a flip.** Capture the canvas with MediaRecorder to a short video while a page changes. WebM in Chrome and Firefox, MP4 in Safari, so pick whichever format `isTypeSupported` says yes to. That shares to social without a GIF encoder. GIF later if people ask.
- **More themes.** Solari white, an airport blue, a Note theme. Themes are data in renderer.js, but the palettes want a design eye.
- **Sunset windows.** Quiet hours and page windows accept sunset and sunrise as times, using the board location from Sun and moon. A dim curve rather than a step is a small addition.
- **Web Component.** `<split-flap-board rows cols theme>` wrapping the renderer, published as a package. Other sites embed it, the repo gets found. A day, plus a README.

## Future wins

All of these need a relay, an account, or both. None of them changes what is built above, because a relay only replaces where a board is loaded from.

- **Relay.** A Cloudflare Worker with KV or a Durable Object. A board gets an id and a write key, both carried in the link like today. The kiosk holds a WebSocket or polls. The phone saves to the relay instead of only to localStorage. `openLink` in app.js already replaces a board with the same id, which is the behaviour the relay needs.
- **Send now.** A message that interrupts the playlist for a set number of minutes and then hands back. Vestaboard calls it pinning.
- **Scoreboard, timer, list.** Interactive channels. Plus and minus for the scoreboard, start and stop for the timer, tick items on the list. A wall screen usually has no keyboard or touch, so these only make sense once the phone can drive the board through the relay. Needs a small state store per page, and a hit-test on the canvas if they also work by tapping a laptop screen.
- **Guest messaging.** A QR in the corner of the kiosk opens a compose only page. What is typed lands on the wall.
- **Screens.** One phone, several kiosks. Mirroring, last seen, current page, version, remote reload. This is SplitFlapTV's screen management.
- **Shortcuts and voice.** A `send` URL with id, key and text, so iOS Shortcuts and Siri can post.
- **Vestaboard API shape.** The relay accepts Vestaboard's read/write message format. `charset.js` already decodes the codes. Every existing Vestaboard integration then works here by changing a URL.
- **Stock ticker.** Share and ETF (exchange-traded fund) prices with the day's change, coloured green or red, and a ticker row that pages through a watchlist. Every free price API I know of needs a key, so it waits for the relay. It is already a Later tile in the picker.
- **Integrations that need a secret.** Calendar by ICS, Spotify now playing, Strava, RSS headlines, sports. Each needs a proxy holding a key or an OAuth token, so they wait for the relay.
- **Public gallery.** Shared boards on the about page. Needs moderation, which means accounts.
- **Google TV package.** A trusted web activity, so a television runs the board without a laptop casting to it. Apple TV has no browser, so AirPlay from a phone is the answer there.

### On accounts and Cloudflare

- Start with board keys. A link with a write key is an account for one board and needs no sign in. Most people have one board and one screen.
- Add accounts when a board has several owners, or someone gets a new phone and wants their boards back. Passkeys on a Worker, or a magic link by email, both run on the free tier.
- The free tier covers a lot. Workers allow a hundred thousand requests a day and KV as many reads, but KV only allows a thousand writes a day, and writes are what a phone sending messages makes. That points at Durable Objects for board state, which are on the free plan now. A kiosk on a WebSocket with hibernation costs close to nothing. Polling every ten seconds would burn through that with a dozen screens, so the kiosk should hold a socket.
- Data stays small. A board is a few kilobytes of JSON. No images on the server, since photos become chips in the browser before anything is saved.
- The README line about no server stays true until the relay ships, and then becomes "no server unless you connect a wall screen".

## Not doing

- Lowercase letters on the drum. The hardware does not have them.
- Native phone apps. The web app on the phone is the editor.
- A paid tier.
- Executing third party code as channels. Recipes for Follow a URL cover most of it without running anyone's script.

## Suggested order

Steps 0 to 5 were done on 27 September.

0. Design session for the editor in Claude Design: drawer, picker, zone diagram, composer modes.
1. Static render helper, save as image, and the content picker. The helper serves both.
2. Board location, then rotating messages, word clock, count up, today, sun and moon, electricity. Six channels the picker can show off.
3. Photo to chips and paint mode.
4. Menu and price list with its two templates. Follow a URL.
5. Playlist thumbnails, Start panel, composer modes.
6. Week planner: several windows per page and Show alone first, then the week view after a design pass.
7. Record a flip, more themes, web component.
8. Relay, then the rest of the future list.
