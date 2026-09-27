# Changelog

One version per day of work. The app shows this log under Edit, at the foot of the drawer.

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
