# Design brief: Split-Flap 0.7, navigation and structure

For: a Claude Design session. Output: a design handoff an engineering session can implement, in the same format as `DESIGN-HANDOVER-editor.md` (fidelity, files, decisions, open items).
Date: 28 September 2026. Owner: Matthew. The handoff lands in the app repo as `~/split-flap/DESIGN-HANDOVER-0.7.md` plus its files.
Attached with this brief: the inventory of today's app (`INVENTORY-0.7-2026-09-28.md`) and its screenshots at 1440 and 400 px, and `GLOSSARY.md`.
Settled and not to be reopened, unless this brief names it: `DESIGN-HANDOVER.md` (tile, fold, themes, control bar, kiosk, first visit cue) and `DESIGN-HANDOVER-editor.md` (the picker, previews on real boards, the composer, the look of the drawer). This pass is about structure and wayfinding, and the look carries over.

## The task in one line

Give Split-Flap a structure people can explore without a guide, with a board and a storyboard as two separate things, and room to grow without adding links in odd places.

## Why

Split-Flap was planned around its first versions, and each release since has added to that shape. Matthew, who built it, now finds it confusing to get around. The clearest sign: he asked for boards that show at certain times and on certain days. That has existed since 0.3, but it sits under Timing inside a page, two levels down, so he did not find it.

What goes wrong today (the inventory has the detail):

1. **The words overlap.** "Board" means both the playlist and the display, and "page" is what most people would call a board.
2. **Boards are managed in two places**, the control bar's board menu and the Start panel, with different actions, and neither points to the other.
3. **Scheduling is hidden** inside each page, and there is no view of a day or a week.
4. **Board settings, templates, Help and Account hang off one board's page list**, so they read as belonging to that board.
5. **Phone and desktop differ in depth**, and Back means different things in different places.
6. **New features have nowhere to go** except another link at the foot of the page list.

## The new words

`GLOSSARY.md` is the source. In short:

| Word | Is | Today |
|---|---|---|
| Board (Tavla) | one designed screen: a layout, its zones and their content | a page |
| My boards (Mina tavlor) | your boards to start from, added to any storyboard as a copy | nothing |
| Storyboard (Storyboard) | the plan a display runs: boards in order, when each shows, transitions, display settings | a board |
| Today's playlist (Dagens spellista) | what a storyboard plays on a given day, worked out from the plan, never edited | nothing |
| Explore (Utforska) | templates now, other people's boards later | the Start panel's templates |
| Account (Konto) | profile, language, sync, your data, Help, version log | the Account panel |

## Settled decisions

- **Boards are blueprints, and using one makes a copy.** Adding a board from My boards to a storyboard makes a copy that belongs to that storyboard. Editing the copy changes only it. Deleting from My boards deletes only the blueprint. There is no "used in" warning, because nothing refers to anything else.
- **Save to my boards** is an action on every board in a storyboard, and on templates. Nothing goes into My boards by default, so the action must be easy to find, or My boards stays empty.
- **Grid size.** A blueprint keeps its size. Adding to a storyboard shows blueprints of that storyboard's size first, with the rest one tap away. Most channels are laid out when drawn and fit any size. Only typed, painted and photo cells are fixed, so an add of another size shows a preview at the new size, and warns only when fixed cells would be cut.
- **Storyboard is what you edit, Today's playlist is what plays.** The week view is the storyboard's main view, with Today's playlist beside it. Today's playlist is a label on the storyboard and on the board with the editor closed. It is not a section.
- **Four sections, the same on phone and desktop:** Storyboards, My boards, Explore, Account. Help and the version log live under Account. Screens is added as a fifth when the relay ships. The board with the editor closed is Now showing, and is not a section.
- **Guests get everything,** My boards included, kept in the browser. An account carries it all between devices and keeps it safe. Nothing needs an account.
- **The control bar does not grow.** It is the only chrome on a wall display. Edit, the board menu (which lists storyboards), Fullscreen, Sound, Share and Account stay, and new things go in the editor.
- **Limits:** 50 storyboards and 100 boards in My boards per account.

## Principles

- **Every object has one home.** Anywhere else it appears, it links to that home.
- **At most two levels below a section on a phone.**
- **Back goes up one level, and Escape closes the editor.** The browser's back button and the phone's back gesture are the app's Back, and each level has an address, so a reload lands in the same place.
- **One more menu per object,** in the same place, with the same verbs in the same order: Open, Rename, Duplicate, Save to my boards, Copy to, Share, Export, Delete.
- **Settings sit on the object they describe.** Grid size and theme describe the display, so they belong to the storyboard now. Leave room for them to be overridden per screen later without moving them again.
- **Every section has an empty state** that says what it is for and offers the first step.
- **Room for one search** in the drawer head, across storyboards, boards, channels and settings. It is not built in 0.7.0, but the head should have a place for it.
- **A new feature adds a section, or a panel inside one.** It never becomes a link at the foot of something unrelated.

## What to design

1. **The four sections** and how you move between them, at 1440 and at 400 px, with the board visible behind or beside the drawer as now.
2. **Storyboards:** the list with its empty state, and one storyboard, with:
   - the week view as its main view. Fold in `design/BRIEF-week.md`, whose data shape (times, days, dates, every year, Show alone) is settled.
   - Today's playlist beside it
   - the boards in order, adding a board (from My boards, from Explore, or new), and each board's more menu
   - its display settings
3. **A board:** the editor for one board (layout, zones, content), reached from a storyboard. Reuse the editor handover's picker and composer. Show where Save to my boards sits.
4. **My boards:** the list with the size filter and its empty state, and the add-to-a-storyboard flow with the size preview and the fixed-cell warning. Import (a file, or a Vestaboard message) lives here.
5. **Explore:** templates today, with a place for other people's boards later. Nothing of the community hub itself.
6. **Account:** profile, language, sync, your data, Help, version log, and a place for connections and your submissions later.
7. **The one more menu**, as a pattern.
8. **Guest to account,** in the new structure: the first sign-in offer (board by board, all ticked, now covering storyboards and My boards) and the one sign-in prompt. Both exist in 0.6.3 and can be restyled.
9. **What has changed,** a note shown once on the first open after 0.7.0, since people's words move.
10. **The phone at 400 px** throughout.

## Out of scope

- The community hub itself: publishing, approval, reporting, credit. It gets its own plan.
- Screens and Send now, beyond leaving them a place.
- Custom layouts, recipes and connections, beyond leaving them a place.
- Changing the board's look, the tile, the themes or the composer.

## Engineering notes

- 0.7.0 builds the structure over today's data: storyboards are today's boards and boards are their pages. 0.7.1 adds My boards as a second kind of stored object. Design for the final shape, and mark anything that only works once My boards exists.
- Board links (`#b=`) carry one storyboard with its boards inside, as today, so wall screens keep working with no account and no server.
- The week view's truth is `nextPage` in `src/schedule.js`. Today's playlist is the same rules run across a day, so whatever the design shows must be something those rules can say.
