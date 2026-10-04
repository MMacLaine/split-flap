# Split-Flap: words

These are the words Split-Flap uses, in English and Swedish. They apply to every string in the app, the Help guide, the README and the version logs. Any later change stays in line with this file, and a new word is added here first.

They came into the app with 0.7.0. In 0.10.0 "storyboard" became "playlist", and Showing became the first tab (D1 in the 0.10 plan). In 0.10.1 My boards became Boards, and every board is kept once there.

| English | Svenska | Is | In the code and stored data |
|---|---|---|---|
| Board | Tavla | One designed screen: a layout, its zones and their content, at its own size and theme. Kept once, in Boards. | a blueprint, `app.blueprints`, `sf_library`, the `blueprint` table; in a resolved playlist, `board.pages[i]` |
| Boards | Tavlor | Your playlists, then every board you have. Called My boards from 0.7.1 to 0.10.0. | `my:list`, `#/my-boards` |
| Playlist | Spellista | Boards shown in turn: which boards, in what order, how long and when each shows, and the display settings. It points at boards in Boards. Called a storyboard from 0.7 to 0.9. | `app.playlists`, `sf_playlists`, the `playlist` table; resolved with its boards as `app.boards` |
| Look | Utseende | How a board is made: its material, type, letters, motion and wall. A board has its own, or Default, which follows the account's default look. Never "theme" or "mood". | `look`, `lookParts` on a board; `src/looks.js` |
| Default look | Standardutseende | The look new boards start as, and every board on Default shows, chosen in Account. | settings row `look` |
| Light | Ljus | The light round a board's frame, in a look: Off, Glow, Breathe, Chase or Flash on change. | `parts.ring`, `RING` in `src/looks.js`, `.sf-ring` |
| Sky | Himmel | A look following the time of day and the weather at the board's place. | `parts.sky`, `SKY`, `skyAt`, `src/ambient.js` |
| Smoothness | Jämnhet | What a slow screen drops to keep the flaps smooth, Automatic or set per screen. | `QUALITY`, `sf_quality`, `sf_quality_auto` |
| Pinned | Fäst | A look held on one screen, over every board it shows. | `sf_look_pin`, never synced |
| Home | Hem | The city, stops and currency new tiles start from, under Account. | `settings` row `home`, `sf_settings` |
| Showing | Visas | This screen: what it runs now, and the first tab of the editor. | `sb:showing`, `#/showing` |
| Previewing | Förhandsvisar | Looking at something that is not on the screen yet. The screen shows it with the gold bar, and Show on this screen makes it real. | `app.looking()` |
| Today's playlist | Dagens spellista | What a playlist plays on a given day, worked out from its times. It is never edited directly. | worked out with `nextPage` in `src/schedule.js` |
| Explore | Utforska | Templates, and later boards from other people. | `TEMPLATES` |
| Template | Mall | A playlist or board to start from, copied into Boards when used. | `TEMPLATES` |
| Screen | Skärm | The physical display on the wall. "Display" is the settings for it. | not yet |
| Account | Konto | Your profile, language, sync, your data, Help and the version log. Later connections and your submissions. | `src/account.js` |
| Zone | Zon | One part of a board's layout, showing one thing. | `zones` |
| Channel | Kanal | What a zone shows: a message, a clock, the weather, departures and so on. | `ch` |
| Layout | Layout | How a board is split into zones. | `layout` |

## Rules

- A playlist contains boards. Say "add a board to a playlist", never "add a page".
- Show on this screen is the only button that changes what the screen runs. Everything else only previews.
- Inside your Boards a playlist points at boards. Anything from outside (a template, a board link, a file) is copied in.
- A playlist of one board, made to show it, is shown as that board, not as a playlist (`solo`).
- Code names stay as they are where nothing is stored under them (`pages` in a resolved playlist, `blueprints`, `sb` in routes). The 0.10.1 migration moved the stored data to `sf_library`, `sf_playlists` and the `playlist` table; `sf_boards` and the `board` table are read once and kept as the way back.
- The control bar's board menu lists playlists.

## Words to stop using, from 0.7.0

A grep for these in both languages is part of each 0.7 handover:

- "page", "sida" for a board
- "board", "tavla" for a storyboard
- "storyboard" in the interface, from 0.10.0
- "My boards", "Mina tavlor", from 0.10.1
