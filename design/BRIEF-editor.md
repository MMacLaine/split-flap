# Design brief: Split-Flap editor redesign

For: a Claude Design session. Output: a design handoff an engineering session can implement,
in the same format as `DESIGN-HANDOVER.md` (fidelity, files, decisions, open items).
Date: 27 September 2026. Owner: Matthew. The handoff lands in the app repo as
`~/split-flap/DESIGN-HANDOVER-editor.md` plus its files.
Background: `ROADMAP.md`, section "The editor redesign". Settled and not to be reopened:
everything in `DESIGN-HANDOVER.md` (tile, fold, themes, control bar, kiosk, first visit cue,
composer typing on the grid) and the engineering decisions behind it.

## The task in one line

Redesign the editor drawer so it can hold twenty or more content types, pictures as well as
text, and still be quick on a 400 px phone.

## What is there today

- The drawer is 370 px on the right on desktop. At 600 px and under the preview board sits on
  top and the drawer runs below it. Code is `src/app.js` (`renderDrawer`, `panelPages`,
  `pageEditor`, `zoneEditor`) and `src/app.css`.
- Three tabs: Pages, Board, Boards. The version log opens from a line at the foot.
- **Pages** stacks everything in one scroll: the playlist, page name, the layout picker (four
  pictograms: Full, Header and body, Split, Ticker row), one card per zone, the composer, and the
  page's day and time window.
- Each zone card has a select box for the content type. There are nine today: Message, Clock and
  date, Big clock, Big text, Countdown, SL departures, Weather, Colour pattern, Quotes. None of
  them has a preview.
- The options per channel are in `sanitizeZone` in `src/store.js`, which is the most accurate
  list of what each one can be set to.
- Templates (Demo, Home dashboard, Station board, Weather station, Colour mosaic, Everything at
  once, Blank) live under Boards, the third tab.
- The composer types on the grid, with a row of chip buttons below it. There is nowhere to draw
  or place a photo.

Run the app locally to see it (`npm run serve`, then open http://localhost:8801). Press E to edit.

## Principles

- Show the choice rather than name it. Every content type, template and page is previewed on a
  small real board in the current board theme, drawn by the same renderer. Engineering will
  build a static render helper that draws one frame of any board or zone at any size, so assume
  live thumbnails are cheap.
- One decision per screen on a phone. Drill down and come back, with no stacking.
- The big board is the live preview and stays that way. What is selected in the drawer should be
  visible on the board, for example the zone being edited highlighted.

## Surfaces to design

1. **Drawer structure.** Three levels, drill down with a back control:
   - **Playlist:** pages as thumbnails with duration and a badge when a time window is set.
     Drag to reorder, tap to open, Add page goes straight to the content picker. Board settings
     and Boards need a home at this level too, likely as secondary entries rather than tabs.
   - **Page:** the layout picker (a fifth layout, Stacked, top half and bottom half, is coming,
     so show five), a diagram of the board with the zones drawn to scale, and timing and window
     at the foot. Tap a zone in the diagram to edit it.
   - **Content:** see 2.
   - Show how the three levels feel on desktop, where the drawer is beside the board and there
     is more room. It may be fine to show two levels at once there.
2. **Content picker.** Fills the drawer. Search at the top, then groups, each a row of tiles with
   a mini preview and one line of description. Tap a tile and it lands in the zone with defaults,
   then that channel's options show below. The groups as they stand:
   - Words: Message, Rotating messages, Big text, Quotes, Menu
   - Time: Clock and date, Big clock, Word clock, Countdown, Today
   - Live: SL departures, Weather, Electricity, Currency, On this day, Follow a URL
   - Pictures: Draw, Photo, Colour pattern
   - Later (needs the relay, show where they would go and no more): Scoreboard, Timer, List
   Tiles must work at the zone's real shape. A ticker row is one row high and a split zone is
   narrow, so a tile preview should be drawn at the proportions of the zone being filled.
3. **Channel options.** A pattern for options that keeps each channel short, with advanced ones
   behind a disclosure. Show it on three channels that stretch it: SL departures (station
   search, up to six stations, modes, time format), Weather (city search, now or hours or days)
   and Follow a URL (a URL, an interval and a line template like `{{line}} {{dest}} {{min}} MIN`,
   with a preview of what the board would print).
4. **Composer modes.** One composer with a switch for Type, Paint and Photo, all writing the same
   grid of cells.
   - Type is as settled in `DESIGN-HANDOVER.md`.
   - Paint: drag chips across the grid, a fill tool, and a horizontal mirror for symmetry. The
     chip palette is the eight colours plus filled and blank.
   - Photo: file picker or camera, then the image mapped to chips. Show the controls, which are
     likely crop or position, dithering on or off, and whether blank flaps count as a colour.
   - Undo and redo, and a way back to earlier messages (drafts kept in the browser).
5. **Start panel.** Templates as a grid of live thumbnails, shown on the first Edit and on New
   board. Café and Office lobby templates (menu and price list) will join the seven above.
   Boards keeps manage, export and import.
6. **Phone at 400 px.** The preview board on top, one drawer level below it at a time, with a
   back control. Show the whole path from Edit to a new page with a photo on it.

## Hard constraints

- Plain CSS on the chrome tokens in `src/app.css` (dark and light), no framework, no
  dependencies. The board themes are separate and stay as they are.
- Everything left aligned. The board is the one exception.
- Good at 400 px. Desktop viewports as in the first brief, with 1280x800 as the tightest.
- Thumbnails are canvases from the static helper, so no CSS effects on them. No blur or
  backdrop filter over the board.
- Keyboard: every control a real button or input, visible focus in the accent, E, F, S and
  Escape keep working. Drag to reorder needs a keyboard alternative.
- Both languages. Swedish labels run longer, so tiles and buttons need room for them. The
  current labels are in `src/strings.js`.
- No dash punctuation in any copy. Expand acronyms on first use.

## Deliverables

1. Static HTML and CSS for the drawer at all three levels, desktop and 400 px, dark and light.
2. The content picker with all the tiles above, previews mocked where the channel does not
   exist yet.
3. The zone diagram and the zone highlight on the big board.
4. Channel options pattern, shown on SL, Weather and Follow a URL.
5. Composer modes: Type, Paint and Photo, with undo and drafts.
6. Start panel.
7. Motion notes for drilling down and back, and for a tile landing in a zone.
8. A README in the handoff format covering fidelity, which files ship and what is reference only.

## Build order after the handoff

Picker first, since it unblocks the new channels, then playlist thumbnails, then Start, then
composer modes. The handoff can be split along the same lines if the session runs long.
