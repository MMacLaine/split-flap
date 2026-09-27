# Changelog

One version per day of work. The app shows this log under Edit, at the foot of the drawer.

## v0.1 (2026-09-27): First version

Everything from the first day of work. A split-flap board for any screen, now live on maclaine.se.

- The board itself, drawn on one canvas so a Raspberry Pi keeps up: every flap steps forward through the drum, folds over its hinge and settles with a small bounce. Three themes: Vestaboard Black, Vestaboard White and Solari Amber.
- Å Ä Ö Æ Ø Ü É each have their own flap.
- Channels: messages typed straight onto the grid, clock, a big clock and big text made of colour chips, countdowns, SL departures, weather, colour patterns (Nordic flags, rain, waves, confetti) and quotes.
- SL departures from any SL stop, or from the home station you starred on the Stockholm SL map. Search forgives spelling, so "vestra skogen" finds Västra skogen.
- Departures keep loading when SL's servers are busy: a refused request is retried within seconds instead of the board giving up.
- Departure times as minutes away, as clock time (24 h or 12 h), or alternating between the two.
- This version log, at the foot of the editor.
- Weather from Open-Meteo in three views: now (feels like, wind, rain, sunrise and sunset), the next hours and three days, with colour chips as icons.
- Seven templates, from a hallway dashboard to Everything at once, which fills the screen and never sits still.
- Playlists with page timers, day and time windows, and quiet hours that dim or blank the board overnight.
- Four transitions at three speeds, played on the board as you pick them. Authentic turns every flap the full way round.
- Four synthesised flap sounds: Clack, Heavy, Soft and Tick, with a volume slider.
- Board links and QR (Quick Response) codes carry a whole board to another screen, including a version for wall screens with no controls. Nothing is stored on a server.
- Made for walls: keeps the screen awake, shifts one pixel every few minutes against burn-in, keeps running offline, and says when live data is getting old.
