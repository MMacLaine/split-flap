# Changelog

Each version is a release, newest first. The app shows this log under Edit, at the foot of the page list.

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
