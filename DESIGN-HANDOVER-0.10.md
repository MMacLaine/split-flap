# Split-Flap 0.10: design handover

Date: 30 September 2026. Owner: Matthew. Built from `DESIGN-BRIEF-0.10-2026-09-30.md`, the v2 plan, Fable's review and figures 0 to N. The board, themes, control bar, tile picker, composer and drawer chrome carry over from `DESIGN-HANDOVER.md`, `DESIGN-HANDOVER-editor.md` and `DESIGN-HANDOVER-0.7.md`.

## Files

- **`Split-Flap 0.10.dc.html`**, the reference prototype.
  - Props: `chrome`, `frame` (auto, desktop or phone), `lang`, `barPlace` (below or over), `oneLabel`, `now`, and `preset` (33 states, listed below).
  - Build from its behaviour, not its code.
- **`Split-Flap 0.10 Storyboard.dc.html`**: 45 live frames at 1440 × 900, 390 × 844 and 1920 × 1080, grouped by the moments in figure 0 and marked by release.
- **`nav-10.js`**: the strings in English and Swedish (`STR`), mocked places and templates, and the 0.10 seed library. The strings ship. The rest is reference.
- **`nav-07.js`, `flap-renderer.js`, `editor-channels.js`**: unchanged. The schedule rules are still `SF07.allowed` and `SF07.playlist`.

## What ships when

- **0.10.0:**
  - the look-then-show rule
  - the gold bar and the gold frame
  - the status line
  - Showing as the first tab
  - the first visit ("Where is this screen?", "Built for London", the demo cue)
  - the wall link and QR sheet
  - Use this landing on the board
  - zones first on the board page
- **0.10.1:**
  - one Boards list: playlists first, then boards, uniform cells
  - playlists that point at your boards, with mixed sizes
  - Show another board in turn making a playlist
  - When, marked Advanced
  - Home in Account
  - the new-device suggestion

## The rule, as built

1. **Looking** is any level whose subject isn't what the screen runs:
   - a board that's not on, a playlist that's not on, or a template
   - a selection in the Add a board picker

   The screen shows the subject at its own size.
2. **The gold bar** shows only while Looking.
   - It's full width and sits under the board, which is refitted above it, so no flap is covered.
   - It's 68 px tall on a laptop or wall and 56 px on a phone.
   - Dark ink on #C8974A.
   - "Previewing" in mono caps, then the name bold at 22 px (16 px on a phone), then one real button: Show on this screen, Use this, Show both in turn, or Add to Morning.
   - A 3 px gold inset frame goes round the whole screen as a second signal.
3. **Leaving a Looking level without pressing** puts the screen back and says "Back to Morning". The ways to leave are Back, a tab, Done or Escape.
4. **Three minutes with no input ends the preview.** The drawer stays where it was, and the status line explains: "Your preview of Departures ended after 3 minutes untouched. Back to Morning", with "Show it now" to preview again. A reload does the same. Kiosk never enters Looking.
5. **Editing a board that's on the screen holds the playlist on it**, and says "Holding on Weather while you edit". Done then says "Saved. Showing Morning".
6. **Editing a board that isn't on** shows it with the bar. Done says "Saved. Back to Morning · Show it now".
7. **The demo stays the demo until the first change.** That change copies it into Boards as a playlist and says "Saved. The demo is now your playlist."

## The status line

- **Placement.** It sits under the drawer title, above the tabs, as a `role="status"` live region. With the drawer closed, it floats above the control bar.
- **The line.** A 7 px dot (green for success, red for failure), the text at 14 px, then up to one action as an underlined button: Undo, Show it now or Try again.
- **Timing.** A line lasts 7 s, or 12 s with an action.
- **Two lines at once.** The newest is on top. The one before stays below at 72% opacity and 13 px until its time runs out. A newer line of the same kind replaces the older one, so a run of saves never stacks: "Saved", then "Saved 07:41".
- **Every commit offers Undo**, which restores what was showing and says "Back to …".

## Screens

- **Showing.** The whole tab is about this screen.
  - "Last time you showed …", on a new device.
  - "Where is this screen?", on a first visit only.
  - The current card: name, what it is, the strip of its boards with the one on now outlined, then "Edit the board on now" or "Edit it", Open the playlist, and Change.
  - For the demo: Type your own message, and Browse templates.
  - Show another board in turn.
  - This screen: a summary, Put this on another screen, and Settings (theme override, its own place, sound).
- **Boards.**
  - Playlists as rows, then boards in a grid of equal cells, with each board letterboxed on a dark well at its own shape.
  - On now is a gold tag, and the board on screen gets a gold outline.
  - A New board cell at the end.
- **A board.**
  - Zones first, as dashed rows naming the zone and what it shows, each with Change tile (and Type for a message).
  - Then Name, then Layout and Size, each as "value · Change".
  - Then "In Morning and Office".
  - The more menu has Add to a playlist, Duplicate, Share and Delete. Delete is never blocked: it names the playlists and offers Undo.
- **A playlist.**
  - Name, then the order: thumbnail, name, size and time, seconds stepper, up and down, and take out.
  - + Add a board.
  - When, marked Advanced: per board times and days, Show alone, and Today's playlist.
  - The 0.7 week view goes here unchanged. It isn't redrawn in this prototype.
- **Explore.** Sections, then a section, then a template.
  - The template page shows it on the screen at once. Its description is followed by Use this in gold, its boards, and Add to a playlist.
  - Use this copies the template into Boards, shows it, and replaces the level with the board (or the playlist if there are several boards). You never leave the tab.
- **Account.** Five groups: You, Home (city, stops, currency), Your sources, The app, and Leave. A guest keeps Home in the browser, and it's offered to the account at sign-in.
- **Put this on another screen.**
  - The wall link with a Copy button 48 px tall.
  - One sentence on what the wall does.
  - A QR code 296 px square on white, which is 8 px a module at 29 modules. The drawing is a placeholder, so use the real encoder, no smaller than 4 px a module.
  - Then the signed-in way.

## Answers to the open questions

1. **Where the gold bar sits:** below the board, with the frame as backup. Over the bottom rows hides content (`barPlace="over"` shows it), and a frame alone doesn't read at three metres.
2. **One label?** Yes, I'd make it one: "Show on this screen" everywhere, with the status line adding "It's in your boards" when a copy was made. The person does the same thing either way. The prototype keeps the brief's two labels by default, and `oneLabel` shows the single one.
3. **Mixed shapes in the grid:** equal cells, letterboxed boards, and the size under each in mono.
4. **Showing above the fold with a playlist:** the card, its strip, Show another board in turn and the start of This screen fit at 390 × 844 under a board 31% of the height.
5. **Where people could still trip:**
   - **Change on Showing** goes to Boards, or to Explore when Boards is empty. Test whether people expect a picker in place.
   - **A board in two playlists.** Editing it changes both, which is the point of figure N, but the only warning is the "In Morning and Office" line at the foot. Consider repeating it in the first Saved line after an edit.
   - **Solari at 12 × 40 on a phone** is small inside the 31% stage. Test whether the preview still convinces there.
   - **"Show both in turn"** is only right from a single board. From a playlist the bar says "Add to Morning", which is what the prototype does.

## Presets

arrive, first, built, template, template-white, template-black, used, show-one, show-pl, edit-on, edit-off, type, tile, pick, turn, playlist, playlist-when, wall, boards, boards-empty, boards-one, boards-many, boards-guest, timeout, newdevice, home, home-guest, st-undo, st-follow, st-fail, st-two, help.

## Copy

- **Everything is in `nav-10.js`.** British spelling, no exclamation marks, and no dashes as punctuation.
- **Swedish needs a native read,** especially "Visa en till tavla i tur" and "Förhandsvisar".
