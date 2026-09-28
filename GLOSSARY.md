# Split-Flap: words

These are the words Split-Flap uses, in English and Swedish. They apply to every string in the app, the Help guide, the README and the version logs. Any later change stays in line with this file, and a new word is added here first.

They come into the app with 0.7.0. Until then the app still says "board" for a storyboard and "page" for a board.

| English | Svenska | Is | In the code and stored data |
|---|---|---|---|
| Board | Tavla | One designed screen: a layout, its zones and their content. In a storyboard, that storyboard's own copy. | a page, `board.pages[i]` |
| My boards | Mina tavlor | Your boards to start from, added to any storyboard as a copy. Kept in the browser for guests, and synced with an account. | a blueprint, `sf_myboards`, the `blueprint` table |
| Storyboard | Storyboard | The plan a display runs: boards in order, when each shows, each board's transition, and the display settings. | a board, `sf_boards`, the `board` table |
| Today's playlist | Dagens spellista | What a storyboard plays on a given day, worked out from its plan. It is never edited directly. | worked out with `nextPage` in `src/schedule.js` |
| Explore | Utforska | Templates, and later boards from other people. | `TEMPLATES` |
| Template | Mall | A storyboard or board to start from, copied when used. | `TEMPLATES` |
| Screen | Skärm | A display playing a storyboard, from the relay (0.6 part 2). | not yet |
| Account | Konto | Your profile, language, sync, your data, Help and the version log. Later connections and your submissions. | `src/account.js` |
| Zone | Zon | One part of a board's layout, showing one thing. | `zones` |
| Channel | Kanal | What a zone shows: a message, a clock, the weather, departures and so on. | `ch` |
| Layout | Layout | How a board is split into zones. | `layout` |

## Rules

- A storyboard contains boards. Say "add a board to a storyboard", never "add a page".
- "Playlist" is only ever "Today's playlist", a label on the storyboard and on the board with the editor closed. It is not a section and cannot be edited.
- Stored field names stay as they are (`pages`, `sf_boards`, `board`), since renaming stored fields costs a migration for nothing. The comment at the top of `src/strings.js` maps them to these words.
- The control bar's board menu lists storyboards.

## Words to stop using, from 0.7.0

A grep for these in both languages is part of each 0.7 handover:

- "page", "sida" for a board
- "board", "tavla" for a storyboard
- "playlist", "spellista" for the list you edit
