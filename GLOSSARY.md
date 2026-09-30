# Split-Flap: words

These are the words Split-Flap uses, in English and Swedish. They apply to every string in the app, the Help guide, the README and the version logs. Any later change stays in line with this file, and a new word is added here first.

They came into the app with 0.7.0. In 0.10.0 "storyboard" became "playlist", and Showing became the first tab (D1 in the 0.10 plan).

| English | Svenska | Is | In the code and stored data |
|---|---|---|---|
| Board | Tavla | One designed screen: a layout, its zones and their content. In a playlist, that playlist's own copy. | a page, `board.pages[i]` |
| My boards | Mina tavlor | Your boards to start from, added to any playlist as a copy. Kept in the browser for guests, and synced with an account. | a blueprint, `sf_myboards`, the `blueprint` table |
| Playlist | Spellista | Boards shown in turn: their order, when each shows, each board's transition, and the display settings. Called a storyboard from 0.7 to 0.9. | a board, `sf_boards`, the `board` table |
| Showing | Visas | This screen: what it runs now, and the first tab of the editor. | `sb:showing`, `#/showing` |
| Previewing | Förhandsvisar | Looking at something that is not on the screen yet. The screen shows it with the gold bar, and Show on this screen makes it real. | `app.looking()` |
| Today's playlist | Dagens spellista | What a playlist plays on a given day, worked out from its times. It is never edited directly. | worked out with `nextPage` in `src/schedule.js` |
| Explore | Utforska | Templates, and later boards from other people. | `TEMPLATES` |
| Template | Mall | A playlist or board to start from, copied when used. | `TEMPLATES` |
| Screen | Skärm | The physical display on the wall. "Display" is the settings for it. | not yet |
| Account | Konto | Your profile, language, sync, your data, Help and the version log. Later connections and your submissions. | `src/account.js` |
| Zone | Zon | One part of a board's layout, showing one thing. | `zones` |
| Channel | Kanal | What a zone shows: a message, a clock, the weather, departures and so on. | `ch` |
| Layout | Layout | How a board is split into zones. | `layout` |

## Rules

- A playlist contains boards. Say "add a board to a playlist", never "add a page".
- Show on this screen is the only button that changes what the screen runs. Everything else only previews.
- Stored field names stay as they are (`pages`, `sf_boards`, `board`), since renaming stored fields costs a migration for nothing. The comment at the top of `src/strings.js` maps them to these words.
- The control bar's board menu lists playlists.

## Words to stop using, from 0.7.0

A grep for these in both languages is part of each 0.7 handover:

- "page", "sida" for a board
- "board", "tavla" for a storyboard
- "storyboard" in the interface, from 0.10.0
