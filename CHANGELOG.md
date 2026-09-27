# Changelog

Each version is a release, newest first. The app shows this log under Edit, at the foot of the page list.

## v0.6.2 (2026-09-28): Fix

A sync bug that could delete boards from your account. It deleted most of mine, and it is fixed here.

- If a browser was missing some of your account boards, because another tab had saved an older list for example, the next change you made there deleted those boards from your account. Now a board only leaves your account when you delete it, and a board missing from a browser comes back from the account instead.
- Delete in the list of boards looked greyed out, like Delete account did. It is red now too.

## v0.6.1 (2026-09-28): Fixes

Three changes from using 0.6.0, one of them a sync fix.

- A board made while the app could not reach your account, during a server update say, stayed in that browser only, even once the account was back. It goes to your account now, and the app asks the server again when you are back online or after half a minute.
- Language has moved from the control bar and Board settings to Account, since it is yours and applies to every board. A page keeps its own language the first time you open it, and once you pick one it is remembered.
- Delete account looked greyed out, as if it did not work. It is red now.

## v0.6.0 (2026-09-27): Groundwork

Groundwork before wall screens can follow an account. Most of it is behind the scenes, but some of it you will notice.

- With a screen reader on, the board reads a page out when you open it, switch board or close the editor, and whenever you press R. Pages that rotate by themselves are not read out. Before, a clock or departures page was read out every minute, so it never stopped talking.
- The editor, the board menu and Share work with the keyboard alone. Focus moves into each one when it opens and goes back to its button when it closes.
- When a sync has made a copy of a board, the board menu shows when each board last changed, so you can tell which one is newer.
- If I have to restore the accounts database to an earlier point, a board you changed after that point goes back up from your browser. Before, the older copy from the server replaced it.
- The tests run on every change to the code, and the server logs requests that fail, with nothing about you or your boards in the log.

## v0.5.3 (2026-09-27): Fixes

Three small things left over from the 0.5.2 review.

- When your account holds the most boards it can and you delete one, a board that was kept here only goes to the account on its own. Before, it waited until you changed it.
- If the server asks the app to slow down, it tries again after a minute. Before, it waited for your next change.
- On a phone, the bar says Sign in with a ! when your session has run out, so it stays on two rows.

## v0.5.2 (2026-09-27): Fixes

I had the account sync reviewed and it found ways to lose changes. All of them are fixed here, with a few smaller ones.

- Signing out while a change had not reached your account yet, when offline say, took that board out of the browser and the change was lost. Sign out now tells you how many boards are not synced yet, and if you sign out anyway they stay here as guest boards.
- If your session ran out, changes made after that were not marked, so signing in again could replace them with the copy in your account. Now the bar says Sign in to sync and the changes are kept. If the board also changed on another device, you get both versions, one of them as a copy.
- A board the account could not take, the 51st say, stopped every board after it from syncing, and the app only said the sync had failed. Each board syncs on its own now, and the account panel names a refused board and says why.
- Deleting a new board before it had synced could leave the status on Waiting to sync for good. Fixed, the status clears.
- The bar shows a ! next to your name when a sync has failed, so you can see it with the editor closed.
- If a guest board here clashes with one in your account when you sign in, it is kept as a copy and you are asked before it goes into the account.
- Export everything is called Export my account now, since the guest boards in this browser are not in the file. The privacy page also mentions the sign-in cookie.
- If deleting the account fails, the message says it failed. Before, it always asked you to sign in again.
- The warnings for signing out and deleting the account sit below the button, so they are easy to read on a phone.

## v0.5.1 (2026-09-27): Fixes

A fix for the editor, and two things that were hard to find.

- Typing a name while signed in could leave a stale copy of the editor on screen, so Done seemed to open a second one. Fixed, the editor closes on Done.
- Sign in is in the control bar now, so the account is easy to find. Once you are signed in, the bar shows your first name.
- A board can be renamed where its name is shown: press the name at the top of the page list, or Rename in the board menu. Enter saves and Escape keeps the old name.

## v0.5 (2026-09-27): Accounts

Optional accounts. Sign in with Google and your boards come with you, and Split-Flap still needs no account.

- You can sign in with Google now, under Account at the foot of the page list. Your boards are kept with the account and come back on any phone or computer you sign in on.
- It is optional. As a guest everything works as before, and the Account and Start panels say that a guest's boards live only in this browser.
- This browser stays the working copy, so a board runs offline and a wall screen never waits on the server. Wall screens keep using board links and never sign in.
- If a board changed in two places before they synced, both versions are kept, the second with (copy) after its name.
- The first time you sign in, boards made as a guest are offered up to the account. Signing out takes the account's boards out of that browser, so the next person on a shared computer does not see them.
- Split-Flap has its own privacy page. The account keeps your Google account id, name, email and boards, in the EU, and nothing else. Export everything and Delete account are in the editor.

## v0.4.1 (2026-09-27): Fixes

Two fixes to 0.4, found in a review.

- On the Letter clock, a letter that lit up while its flap was still turning spun the drum round to itself, with sound. It fades in place now, whatever the flap is doing.
- A wall screen reloads once for each new version. If a browser cache brings the old version back, it does not try again until the next release.

## v0.4 (2026-09-27): Letter clock

A letter clock, like the designer word clocks where only the words for the time light up.

- The Letter clock is a grid of letters where the words for the time light up and the rest stay faint, in five minute steps. A dot in a corner lights for each minute in between.
- It follows the board language, with a grid of its own in English and Swedish. On the hour the Swedish one says KLOCKAN ÄR PRECIS.
- When the time moves on, the letters fade up and down in place.
- The Letter clock template sets up a square board for it, with quiet hours overnight. As a tile in the picker it needs a zone of 9 × 13, and anything smaller spells the time out like the Word clock.

## v0.3 (2026-09-27): Planning the week, part one

This one is about when pages show. There is also a heart flap and a few things for wall screens.

- A page can have several times now, for example weekday mornings and Saturday mid-morning, without a second copy of the page.
- A time can be a date instead of days of the week, once or every year, so a birthday page shows on the day.
- Show alone gives a page its time to itself. While it is on, pages without a time of their own wait until it ends. I added it for the train times in the morning.
- A page can pick its own transition, so one page can come in as a curtain while the rest use the board’s.
- There is a heart flap, like the one on the Vestaboard Note. A heart typed on a phone lands on it.
- Each flap is panned by its column, so with headphones or two speakers a wave moves across the room.
- Every flap can roll once when the board starts, like a Solari board powering up, and again on the hour if you want. Both are under Board settings.
- Adding ?bg=transparent to the link draws the board on nothing, for OBS and other overlays.
- A wall screen now looks for a new version by itself and reloads in quiet hours or at 04:00. A screen on the previous version needs one reload by hand first.
- A menu line or SL destination that is too long now loses its last word, and a long single word is cut at the letter as before. The Café menu fits its board as well.
- The picker shows two tiles a row on a 6 × 22 board. It had dropped to one, which made it a long scroll.

## v0.2 (2026-09-27): New editor

A new editor, eight new channels and a guide. Boards made in 0.1 open as they were.

- The editor is built around a content picker. Each kind of content is a tile drawn as a small board in the shape of the zone you are filling, so you see what it looks like before you pick it.
- On a wide screen the list of pages stays beside the editor with a thumbnail of each page. Drag a page to reorder it, or use the arrow keys on its handle. On a phone it goes one step at a time with the board above.
- A page shows its zones on a diagram, and the zone you are editing is outlined on the big board. There are five layouts now, including a stacked one for portrait screens.
- Messages are made on the grid in one of three modes. Type works as before, Paint drags colour flaps across the grid, and Photo turns a picture into colour flaps in the browser. The photo is not uploaded, only the flaps are saved.
- Undo and redo work in the message editor, and a message you change is kept under Earlier messages in case you want it back.
- Eight new channels: rotating messages, menus, a word clock, Today, electricity prices, exchange rates, On this day and Follow a URL.
- Today shows the date, the week number, Swedish red days and flag days, and sunrise and sunset for the board location. It is all worked out on the device, so it keeps going offline.
- Electricity prices are the spot price for your price area from elprisetjustnu.se, with the coming hours as coloured flaps. The market prices in quarter hours now, so each hour is the average of its four.
- Follow a URL prints lines from any web address that allows other sites to read it, a GitHub Gist or a published Google Sheet for example. You write a line template and the editor shows what the board will print.
- A countdown can count up from a date as well, for days since something.
- An SL zone can show up to six stations, and departures sooner than your walk to the stop can be hidden.
- Nine templates now, shown the first time you edit. Café has a menu with prices, and Office lobby takes turns between a welcome and a few notices.
- Save as image downloads the page as a picture.
- Help sits at the foot of the page list with a short guide to how the board works. The grid size was hard to find in Board settings, so every page links to it as well.

## v0.1 (2026-09-27): First version

Everything from the first day of work. A split-flap board for any screen, now live on maclaine.se.

- The board is drawn on one canvas so a Raspberry Pi keeps up. Each flap steps through the drum to its letter, folds over the hinge and settles with a small bounce. There are three themes, Vestaboard Black, Vestaboard White and Solari Amber.
- Å Ä Ö Æ Ø Ü É each have their own flap.
- Channels so far are messages, clock, big clock, big text, countdown, SL departures, weather, colour patterns and quotes. Messages are typed straight onto the grid so you see where each letter lands.
- SL departures work for any SL stop. If you have starred a home station on my Stockholm SL map, a board can follow it. Station search forgives spelling, so "vestra skogen" finds Västra skogen.
- SL refuses requests now and then. A refused request is retried within a few seconds and the board only says no data after four failures in a row. Västra skogen had shown no data on the first refusal.
- Departure times can be minutes away, clock time in 24 h or 12 h, or alternate between the two.
- Weather comes from Open-Meteo in three views. Now shows feels like, wind, rain and sunrise and sunset. The other two are the next hours and three days ahead. Colour chips stand in for icons.
- Seven templates to start from, including Everything at once, which fills the screen and rolls every flap the full way round.
- Pages run on a playlist with a timer each, optional day and time windows, and quiet hours that dim or blank the board overnight.
- Four transitions and three speeds. Picking one plays it on the board. Authentic turns every flap the whole way round like the hardware does.
- Four flap sounds, Clack, Heavy, Soft and Tick, with a volume slider. They are synthesised, so there is nothing to download.
- Share gives a link or a QR (Quick Response) code that carries the whole board to another screen, with a kiosk version that hides the controls. Nothing is stored on a server.
- For a wall screen it keeps the display awake, shifts one pixel every few minutes against burn-in, keeps running offline and says when live data is getting old.
- This version log sits at the foot of the editor.
