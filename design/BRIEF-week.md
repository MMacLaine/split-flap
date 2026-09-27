# Design brief: Split-Flap week view

For: a Claude Design session. Output: a design handoff an engineering session can implement,
in the same format as `DESIGN-HANDOVER-editor.md` (fidelity, files, decisions, open items).
Date: 27 September 2026. Owner: Matthew. The handoff lands in the app repo as
`~/split-flap/DESIGN-HANDOVER-week.md` plus its files.
Background: `ROADMAP.md`, section "Planning the week". Settled and not to be reopened:
everything in `DESIGN-HANDOVER.md` and `DESIGN-HANDOVER-editor.md`, and the data shape below.

## The task in one line

Design a week view of a board's pages, so you can plan a week at a glance and change when a
page shows by dragging.

## Why

The example that started it: train times alone from 06:30 to 07:15 on weekdays, a welcome home
message at 17:00, and the weather and a countdown the rest of the evening. Since 0.3 all of this
can be set on each page, with several times per page, dates, and Show alone. What is missing is
seeing the week as a whole, and changing it without opening every page.

## What is there today (0.3)

- The page level has a Timing section. "Only on some days and times" opens a list of times, each
  with day buttons or a date, from and to, and a remove control. "Add another time" adds one, and
  "Show alone while this is on" sits under the list.
- The playlist shows the first time of a page as a badge, and "+1", "+2" when there are more.
- Run the app locally to see it (`npm run serve`, then open http://localhost:8801). Press E to
  edit, open a page, and tick Only on some days and times.

## The data shape (settled)

```js
page.wins = [{ from: 'HH:MM', to: 'HH:MM', days: [0..6], date?: 'YYYY-MM-DD', yearly?: true }]
page.alone = true   // only on a page with at least one time
```

- An empty list means the page can show at any time.
- `days` are `Date.getDay()` numbers, 0 is Sunday. An empty list is every day.
- With a `date`, the days are ignored. `yearly` matches the month and day in any year.
- A time that crosses midnight (22:00 to 02:00) belongs to the day it starts on.
- `from` equal to `to` is the whole day.
- Up to eight times per page.
- Show alone: while a page marked alone is in one of its times, only pages with a time open
  right now can show. Pages with no times wait.
- When no page is allowed, the board shows the clock.

## Surfaces to design

1. **The week at 1440 px.** Beside the playlist rail, in place of the page panel, reached from
   the playlist. Seven days across, starting Monday, the hours down. Each time drawn as a block
   in a colour taken from its page, with the page name. Pages with no times need a place too,
   likely a strip at the top that reads "any time".
2. **A day at a time at 400 px.** The phone version, with a way to move between days.
3. **Making a time by dragging** on an empty part of a day: which page it belongs to, and how
   that is picked.
4. **Changing a time** by dragging a block's top or bottom edge, and moving it by dragging the
   block. Show how a time that crosses midnight is drawn.
5. **Opening a page** by tapping its block, and coming back to the week.
6. **A time on a date.** A one-off date inside the week shown, and a yearly date. Show how a date
   outside the week shown is found, perhaps a list of coming dates under the grid.
7. **Show alone on the grid.** Its blocks look different, and the pages it holds back during
   its time are shown as waiting.
8. **Overlaps.** Two pages in the same slot take turns on the board. Show that without the grid
   getting unreadable.
9. **An empty week.** A board where no page has a time yet, with one sentence on what to do.
10. **Now.** A line at the current time, and which page is showing.

## Hard constraints

- Plain CSS on the chrome tokens in `src/app.css`, dark and light, no framework, no dependencies.
- Everything left aligned. The board is the one exception.
- Good at 400 px. Desktop from 1280 × 800.
- Dragging needs a keyboard alternative, as the playlist handle has (focus and arrow keys).
- Both languages, with room for the longer Swedish labels.
- No dash punctuation in any copy. Expand acronyms on first use.
- The playlist rail and the page level stay as they are. The week view is a second way to see
  the same pages.

## Deliverables

1. Static HTML and CSS for the week at 1440 px and the day at 400 px, dark and light.
2. The drag interactions: making, stretching and moving a time, with the keyboard alternative.
3. How Show alone, overlaps, dates and the empty week look.
4. Motion notes, if any, in the handoff format.
5. A README in the handoff format covering fidelity, which files ship and what is reference only.
