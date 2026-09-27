# Split-Flap: editor redesign handover

Date: 27 September 2026. Owner: Matthew. Lands in the app repo as `~/split-flap/DESIGN-HANDOVER-editor.md` plus the files below.
Everything in `DESIGN-HANDOVER.md` stays as it was: tile, fold, themes, control bar, kiosk, first visit cue, typing on the grid.

## Fidelity

- **High fidelity, build as shown:** drawer structure and the three levels, the content picker and its tiles, the zone diagram and the zone highlight on the big board, the channel options pattern, the composer modes, the start panel, the motion values.
- **High fidelity in structure, final copy to review:** the channel list, descriptions and option sets. Check them against `sanitizeZone` in `src/store.js` before building. New channels (Rotating messages, Menu, Word clock, Today, Electricity price, Currency, On this day, Follow a URL, Draw, Photo) have options I proposed.
- **Reference only:** every live number (SL, weather, electricity, currency, the feed), the sample photo, the two On this day facts, the sunrise and sunset times, the prototype's state handling.

## Files

| File | Status | What it is |
|---|---|---|
| `design/editor/flap-renderer.js` | **Ships, with two additions** | New `renderStatic(canvas, {rows, cols, grid, theme, pad})`, the static helper the brief asked for. One shared atlas, float geometry so HTML overlays line up with `staticGeom()`. New `Board.setHighlight(zone, colour)` for the zone highlight. Nothing already settled has changed. |
| `design/editor/editor-channels.js` | Reference, much of it ships | Channel catalogue (id, group, names and descriptions in EN and SV, defaults, option schema), a preview renderer for each channel at any zone shape, the five layouts including Stacked, the nine templates, photo to chip mapping, drafts seed, all editor strings. |
| `design/editor/Split-Flap Editor.dc.html` | Reference prototype | The whole editor, working. Props: `chrome` dark or light, `frame` auto, desktop or phone, `lang`, `preset` (opens straight into a state). |
| `design/editor/Split-Flap Editor Storyboard.dc.html` | Reference | Every deliverable as live frames: the phone path, desktop dark and light, phone in Swedish, motion notes. |

The prototype uses inline styles because of how it was built. Port it to plain classes on the chrome tokens in `src/app.css`; the dark and light values are the `:root` and `[data-chrome="light"]` blocks at the top of the prototype.

## Decisions on review

Made after the handoff, against the code. Where this section and the rest of the file disagree, this section wins.

1. **Channel ids stay as they are in the code.** Saved boards and links use `quote` and `art`, so the catalogue's `quotes` and `pattern` map to those. Draw and Photo are picker tiles that open a message zone in Paint or Photo mode. Pictures are stored as `cells` on the message zone, as today.
2. **Colour pattern keeps the six patterns in `src/pixels.js`** (rainbow, nordic, rain, confetti, wave, checker). The palette is added as the advanced option.
3. **Today is as designed** (day, week number, sun times, day of the year), plus red days and flag days. Name days follow once the licence is sorted. No moon phase for now.
4. **Countdown gains a direction**, Count down or Count up, so "days since" works.
5. **Rotating messages are as designed**, each message for a set number of seconds inside the page.
6. **Options with no source are dropped for now.** On this day has no topic filter, because the Wikipedia feed has none. SL service notices wait, since they need a second SL API. The other new options stay.
7. **The breakpoint moves to 1024 px** as designed.
8. **Copy.** Hemmapanel keeps its current name. The Swedish still needs a native read.

## Structure

- **Three levels, drilled with a back control:** Playlist, Page, Content. Board settings and Boards and templates are secondary levels reached from the foot of the Playlist. Escape goes back one level, and closes the editor from the top level.
- **Desktop, 1024 px and wider:** the drawer is 596 px, a 184 px playlist rail plus a 412 px panel. The rail is the Playlist level and stays visible, so Page and Content always sit beside the list of pages. That is the "two levels at once" answer. At 1280 × 800 the board keeps 684 px.
- **Under 1024 px:** the preview board on top, capped at 38% of the height, and one level at a time below it. 1024 rather than today's 600, because a 596 px drawer next to a board leaves no room for the board below that.
- **Playlist:** live thumbnails, duration, a badge with the time window. Drag the handle to reorder. The keyboard alternative is to focus the handle and press the up and down arrows; focus follows the page. Add page opens the picker for a full page zone.
- **Page:** name, five layouts, the zone diagram (the page drawn to scale, zones outlined with the channel name), a zone list under it that does the same job for keyboard and small zones, timing, days and times, duplicate and delete.
- **Zone highlight:** hovering or focusing a zone, and every Content level, highlights that zone on the big board. Other cells get the housing colour at 62% and an accent line 0.05H wide runs in the gaps around the zone. It is drawn by the renderer, so there is no CSS over the canvas.

## Content picker

- Search at the top, then groups: Words, Time, Live, Pictures, Later. Search matches names and descriptions in both languages.
- Each tile is a thumbnail drawn at the zone's own rows and columns, a name, and one line. Zones wider than 3.2:1, such as a ticker row, switch the grid to a single column.
- Later tiles (Scoreboard, Timer, List) are dashed outlines with the name and "Arrives with the relay", with no preview and no action.
- A tap puts the channel into the zone with its defaults. The picker gives way to the channel header, with its options below. Change reopens the picker, and Escape from there keeps what was there before.

## Channel options pattern

- Every channel declares `fields` in `editor-channels.js`. Essentials show by default, and anything marked `adv` goes behind "More options (n)", indented on a rule.
- There are 12 field types: text, date, segmented, chips (multiple choice), toggle, stepper, colour, palette, search, multi search, text list, template, note. Every channel is built from these.
- **SL:** up to six stations (search to add, reorder, remove), which modes to show, minutes or clock time. Advanced: departures per station, hide departures sooner than your walk, service notices.
- **Weather:** city search, then Now, Hours or Days. Advanced: °C or °F, and wind.
- **Follow a URL:** web address, check interval, line template with token buttons, the first item from the feed, and a print preview drawn at the zone's real shape. An unknown token is named in a note. Advanced: where the list sits in the feed, the most lines to show, a heading line.

## Composer

- One grid, with a Type, Paint, Photo switch. Switching mode keeps the cells.
- **Type:** as settled.
- **Paint:** brush or fill, mirror across the vertical centre line, and ten swatches (eight colours, filled, blank). Drag to paint, using pointer capture so touch works. Undo records a whole stroke as one step.
- **Photo:** Choose photo, or Take photo (a file input with `capture="environment"`), then zoom, horizontal and vertical position, dithering (Floyd Steinberg error diffusion), and whether blank flaps count as a colour. The mapping crops to the zone's real aspect, gaps included.
- **Undo and redo:** up to 60 steps for each zone, with Cmd or Ctrl+Z and Shift for redo.
- **Earlier messages:** drafts kept in the browser, up to 12. A draft is saved when you leave the composer with changes. Each one shows a thumbnail, a time and Use.

## Start panel

Shown on the first Edit and on New board. There are nine templates as live thumbnails in their own themes, including Café and Office lobby. On the first run, picking a template replaces the untouched demo board; after that it adds a new board. "Keep the current board" appears on the first run. Your boards has Open, Duplicate, Export and Delete, and Import sits below.

## Motion

- **Drill down:** 24 px slide from the right with a fade, 220 ms cubic-bezier(0.2, 0.8, 0.2, 1).
- **Back:** the same slide, mirrored.
- **Tile landing:** the options rise 10 px and fade in over 280 ms, while only the zone's cells flip on the board inside the highlight.
- **Reduced motion:** drawer animations drop to 1 ms.

## Open items

- The source photo is not stored, only the cells. To re-crop later, keep the image in IndexedDB, the browser's local database.
- The SV copy needs a native read, and so does the EN copy for the new channels.
- The electricity feed and area, currency rates, On this day and the feed fetcher are all mocked.
- The breakpoint moves from 600 to 1024 px. Check this against `src/app.css`.
- Quiet hours and sound are shown under Board settings but are not wired into this prototype. The settled behaviour stands.
