# Split-Flap 0.7: navigation and structure, design handover

Date: 28 September 2026. Owner: Matthew. Lands in the app repo as `~/split-flap/DESIGN-HANDOVER-0.7.md` plus the files below.
Built from `BRIEF-0.7-navigation.md`, `BRIEF-week.md`, `GLOSSARY.md` and the 0.7 inventory. `DESIGN-HANDOVER.md` and `DESIGN-HANDOVER-editor.md` stay settled: tile, themes, control bar, picker, composer and the look of the drawer carry over unchanged.

## Fidelity

- **High fidelity, build as shown:**
  - the four sections and the tab row
  - the levels, their addresses and Back
  - the week grid: blocks, lanes, alone, waiting, past midnight, Now, coming dates
  - Today's playlist and where it sits
  - the more menu
  - the add and copy flow with its size preview and warning
  - the empty states
  - the offer and the prompt
  - the What has changed note
- **High fidelity in structure, copy to review:**
  - every string, in both languages (`nav-07.js`, `STR`)
  - the Swedish needs a native read
- **Reference only:**
  - the sample data and the mocked live channels
  - the fixed demo clock
  - Share and Save as image, which only show a note
  - the QR code and sign-in, which are not wired
  - the prototype's state handling

## Files

| File | Status | What it is |
|---|---|---|
| `Split-Flap 0.7.dc.html` | Reference prototype | The whole 0.7 structure, working. Props: `chrome` (dark or light), `frame` (auto, desktop or phone), `lang`, `signedIn`, `preset` (opens straight into one of 26 states), `now` (holds the clock), `showAddress`. |
| `Split-Flap 0.7 Storyboard.dc.html` | Reference | Every deliverable as live frames at 1440 × 900 and 400 × 860, plus the address table. |
| `nav-07.js` | **Partly ships** | Keep the schedule rules (`applies`, `open`, `allowed`, `playlist`, `blocksFor`, `comingDates`, `shiftWin`), `fixedCut` and `vestaboard`, or check them line by line against `src/schedule.js`. Also here: the strings in EN and SV, the board colour hues, and the seed data. |
| `flap-renderer.js`, `editor-channels.js` | Unchanged | From the earlier handovers. |

The prototype uses inline styles because of how it was built. Port it to plain CSS classes on the chrome tokens in `src/app.css`.

## Structure

- **Four sections: Storyboards, My boards, Explore, Account.**
  - They sit as a tab row under the drawer head, on every level, at every width.
  - The end of the row holds a disabled search button. That is where the one search goes later.
  - Screens becomes a fifth tab when the relay ships.
- **A tab returns to where you last were in that section.** Tapping the current tab goes to the top of the section.
- **Levels, at most two below a section:**
  - Storyboards list, then a storyboard (Week, Boards and Display as tabs inside it), then a board.
  - My boards, then one blueprint.
  - Explore, then one template.
  - Account, then Help or the version log.
- **Choosing a zone's content happens in place on the board's level**, not a level deeper. That keeps the phone at two levels.
- **Sheets are not levels.** Add a board, Copy to and Import replace the drawer body, keep the head, and close with Back or Escape.
- **Addresses:** `#/storyboards`, `#/storyboards/<id>/week`, `/boards` and `/display`, `#/storyboards/<id>/boards/<boardId>`, `#/my-boards/<id>`, `#/explore/<id>`, `#/account/help` and `/log`.
  - Each move to a level pushes a history entry, so browser Back and the phone back gesture go up one level.
  - Reload lands in the same place.
  - `#b=` board links are unchanged and sit outside the `#/` paths.
- **Back goes up one level.** It is hidden at the top of a section.
- **Escape closes a menu or sheet first, and otherwise closes the editor.** Done always closes the editor.
- **Desktop from 1024 px:** a 600 px drawer beside the board.
- **Under 1024 px:** the board on top at 32% of the height, and the drawer below.

## Storyboard

- **Week is the main view.** It opens on the week, scrolled to 06:00.
  - At 1440 px it shows seven days, starting Monday. On a phone it shows one day, with day chips above.
  - Each board keeps one hue, used for its blocks, list dots and playlist. The hues are defined in oklch and have both dark and light values.
- **Any time.** Boards with no time sit in an Any time strip above the grid. A 4 px rail on the left of each day shows when they may play: solid when they take turns, hatched while a board set to show alone holds them back.
- **Show alone.** Its blocks use the stronger fill of their hue, with a 2 px outline in text colour and an Alone tag.
- **Overlaps** sit side by side in lanes, and the time line says "takes turns".
- **Past midnight.** The time belongs to the day it starts. It is drawn to 24:00 on that day and from 00:00 on the next, dashed at both ends and labelled.
- **Dates.** A one-off date shows in its week. Coming dates are listed under the grid, one-off and yearly together, and a tap jumps to that week.
- **Now** is an accent line with the time on today's column. On the phone it also names the board.
- **Making a time.**
  - Drag down an empty part of a day, snapping to 15 minutes.
  - A card then asks which board shows then, with the day and times as fields, and offers + New board.
  - Add a time opens the same card without dragging. That is the keyboard route.
- **Changing a time.**
  - Drag a block to move it. On desktop, sideways moves it to another day.
  - Drag the top or bottom edge to change the start or end.
  - A tap opens the board.
  - Keyboard: the arrow keys move a block by 15 minutes, Shift and the arrows change the end, left and right change the day, Enter opens the board, and Delete removes the time.
  - A time belongs to all its days, so moving Monday's block of a weekday time moves all five days (see open items).
- **Today's playlist.**
  - Desktop: a panel under the board, beside the week.
  - Phone: a card above the grid, which becomes "Playlist for Thu 1 Oct" on another day.
  - Closed editor: one line at the top left of the wall, "Now showing Weather until 17:00, then Welcome home".
  - It is never editable, and it is computed with the same `allowed` rule as the grid.
- **Boards view:** thumbnails in order, the first time and "+n", Alone, the duration, a drag handle (arrow keys on the handle work too), a more menu, and + Add a board.
- **Display view:** theme, grid size, transition, speed, quiet hours, sound and location. A note says screens can override size, theme and quiet hours later. Nothing here moves when they do.

## A board

- **Save to my boards is the first button on every board**, before See it in the week, and it is also in the more menu. A note then offers a link to My boards.
- **Name, then layout, zones and content**, as in the editor handover. The chosen zone is highlighted on the big board.
- **When it shows** is the form version of the week: days or a date with Every year, from and to, remove, + Add a time (up to eight), Show alone, Show for, and Transition to this board. The board is the home of its times, and the week is a view of them.
- **A blueprint uses the same level** without When it shows. Its first button is Add to a storyboard.

## My boards (from 0.7.1)

- **The list:** search, Import, a size filter built from the sizes present, and cards with a more menu. The count reads "5 / 100".
- **Adding to a storyboard** always makes a copy that stores `from: { kind, id }`.
  - The storyboard's size shows first, and Show all sizes (n) reveals the rest at lower opacity.
  - Choosing one previews the copy on the big board at the storyboard's size.
- **Size changes.** Only typed, painted and photo cells are fixed. They are centred, and cells that fall outside are cut. The warning names the count and appears only when the count is above zero. Channels are simply laid out again.
- **Import:** from a JSON (JavaScript Object Notation) file, or a pasted Vestaboard message, one line per row, centred, with a live preview.

## Explore

- **Templates** as live thumbnails with a board count.
- **A template** has Use as a new storyboard, and each of its boards has Save to my boards and Add to a storyboard.
- **A dashed "From other people, Later"** keeps the hub's place.

## Account

- **Guest:** the plain loss line and Sign in with Google.
- **Signed in:** name, email, sync status, and Sign out.
- **For both:**
  - Language.
  - Your data: the counts against the limits, Export everything, and Delete account (in red when signed in).
  - Help and Version log rows.
  - Connections and Your submissions as dashed Later rows.
- **The offer** on first sign-in has two groups, Storyboards and My boards. Everything is ticked, and Keep with my account (n) counts the ticks.
- **The one prompt** above the control bar is restyled only.

## The more menu

- **One pattern:** a ⋯ button on the right of every storyboard row, board row, blueprint card, open storyboard and open board. It opens a popover with the verbs in one fixed order: Open, Rename, Duplicate, Save to my boards, Copy to, Share, Export, Delete.
- **Verbs that do not apply are left out, and the order never changes.**
  - Storyboard: Open, Rename, Duplicate, Share, Export, Delete.
  - Board in a storyboard: Open, Rename, Duplicate, Save to my boards, Copy to, Share as image, Delete.
  - Blueprint: Open, Rename, Duplicate, Copy to, Export, Delete.
- **Delete sits under a rule and in red** (inventory observation 8).
- **Rename works in place** in lists, and focuses the name field on an open object.

## Empty states and first run

- **Storyboards:** what a storyboard is, then Start from a template or Start empty.
- **My boards:** what it is for, how boards get there, then Browse Explore or Import.
- **An empty week:** one sentence.
- **What has changed:** a note shown once at the top of the drawer on the first open after 0.7.0. It maps the old words to the new ones and offers Got it.

## Motion

- Levels slide 24 px from the right when going in, and from the left when going back, with a fade, over 220 ms on cubic-bezier(0.2, 0.8, 0.2, 1).
- Menus and cards rise 6 px over 160 to 180 ms.
- Drag feedback is immediate, with no easing.
- Reduced motion drops drawer motion to 1 ms.

## Open items

- **Moving one day of a weekday time moves the whole time.** A "this day only" split would make a second time, which is worth deciding before build.
- **Custom grid sizes:** Display offers three presets. Add Fill screen and Custom as today.
- **Copy to another storyboard** keeps the board's content but not its times. I think that is right, since times belong to a plan.
- **The phone board takes 32% of the height.** Check it on a real 400 × 800 phone with the keyboard open.
- **Run the glossary grep** for old words in both languages. The prototype uses only the new words.
