# Changelog

Each version is a release, newest first. The app shows this log under Edit, at the foot of the page list.

## v0.11.3 (2026-10-04): Finishing

The last of 0.11: glass, smoke and paper sound like what they are, and old copies of boards are cleared out.

- **A sound for each material.** Glass ticks high and short, smoke the same but lower, and paper taps softly. Flap and Solari clack as before. If you chose a sound for the playlist yourself, that one wins.
- **The old copies go.** Boards from before 0.10.1 were also kept in their old form, so the move could be undone. They are cleared out now, after a wait that the privacy page describes.
- Help covers the light, the sky, Listen and the Music meter.

## v0.11.2 (2026-10-04): Music

A Music meter board, and Party, a look whose light moves to the music in the room. Both listen through the microphone, only while Listen is on.

- **Music meter.** Level bars across the board, green, amber and red, with the peak held for a moment. Before you press Listen it sits there unlit, like a real meter switched off. Mixer, Bars or Mirror, and it is made for 12 × 40.
- **Party.** Smoked glass, rose letters and a wide light on Music. Without Listen the light breathes slowly, and with it on it follows the beat.
- **Listen** is in the control bar and on Showing whenever the board can use it, and the L key starts it on a kiosk. Stop turns the microphone off, and a reload always does.
- The clack is off while the meter runs, since the meter turns flaps many times a second.

## v0.11.1 (2026-10-04): Light and sky

Looks can now have light round the frame and follow the sky outside. Five new looks use them: Backlit, Classic RGB, Signal, Outside and Sunday.

- **Light round the frame.** It can glow, breathe, chase or flash when the board changes, in a colour you pick or the board's own: Signal goes red when a red chip is on the board, so a late train shows from across the room.
- **Follow the sky.** Outside takes the time of day and the weather where the screen is, so the wall goes from night to dawn to day, and rain on the forecast is rain on the wall. Without a place it follows the sun alone, and the board's page says so.
- **Classic RGB.** Classic as it is, with a ring of colour round it. The board itself is Classic to the pixel.
- **Make your own** has Light and Sky rows now, with a few stops for speed, brightness and size instead of sliders.
- **Smoothness.** A slow screen drops the moving wall first and the light last, and says so once. Showing has the setting for this screen, Automatic or a step of your own.
- Templates start in the look made for them: the station board in Signal, the weather in Outside, the markets in Backlit and the café menu in Sunday.

## v0.11.0 (2026-10-04): Looks

Every board can now have a look of its own: what its flaps are made of, the type, the letters and the wall behind it. This release has Classic, which is the board as it was, and Calm, with Make your own for the rest.

- **Calm.** Clear glass flaps over three fields of colour that drift too slowly to notice, with serif letters that glow. The glass is solid while it turns, so the next letter never shows through it.
- **Change it on the board.** A board's page has Look, with Change. Each card shows that board in the look, and opening one puts it on the screen under the gold bar until you press Use this look.
- **Make your own.** Pick the material, the type, the letter colour, the motion and the wall. It only offers what works together, so lit letters need a dark material and glass always has colour behind it.
- **The default, a pin and Same look for all.** Account sets the look new boards start as, and every board on Default follows it. Showing can pin one look to a screen, and a playlist can give every board one look, with Undo.
- Classic is the board you had, pixel for pixel, and boards from before keep their look: a white board is now Paper and a Solari board is Solari. Times in Calm's serif now sit at full height.

## v0.10.3 (2026-10-04): Fixes

A fix for signing out and back in, and templates that start at the size they are made for.

- **Signing out and in again adds nothing.** Signing out left a blank playlist behind, and signing in then offered it next to your own, while its board went to your account by itself. The blank is now left out at sign-in, and your playlists come back in their order. A stray "Board 1" from before can be deleted in Boards.
- **Templates start at their own size.** Station board and Office lobby are 10 × 32, the big tiles are 12 × 40, and messages and the currency board are 6 × 22. A template shows at that size, and you can pick another in its preview before you show it.
- **No instructions on the flaps.** A new message board says HELLO instead of TYPE HERE, since nobody types on the wall, and a tile with nothing set yet shows its name and a dash instead of PICK A CITY or ADD A FEED. What to do is in the editor, beside the tile.

## v0.10.2 (2026-10-04): Big boards

New playlists have been 12 × 40 since 0.9, but most tiles were still drawn for 6 × 22 and left most of the board dark. This release gives the most used ones a layout for the big board, and makes the editor work on a phone.

- **Tiles for 12 × 40.** The clock has digits twice the size with the date under them, Today has the day in big letters, the world clock has a column a city, the weather has now, the next hours and three days together, and currency and menus are in two columns.
- **Fill screen is the wall's.** A board set to Fill screen takes the size of the wall that shows it. The editor shows it at the size a wall in this browser last filled, or 8 × 22, so a phone no longer edits a tall board the wall never shows.
- **The editor on a phone.** Typing on a 12 × 40 board keeps cells big enough for a finger and scrolls sideways, a landscape phone puts the editor beside the board, and on a short screen Today's playlist folds to one line above the week.

## v0.10.1 (2026-10-04): Boards

Testers could not see why templates, examples and My boards were different things. From this release every board is kept once, in Boards, and a playlist shows boards from there.

- **One Boards list.** Your playlists, then every board you have made or taken from a template, each drawn at its own shape. My boards is gone, since everything is in Boards now.
- **A board is the same board in every playlist.** Change it in one and the others show the change, and the board says which playlists it is in. Duplicate it if you want one of its own. Deleting a board takes it out of each playlist and says which, with Undo.
- **Each board has its own size and theme.** A playlist can mix a 6 × 22 board with a 12 × 40 one, and the screen takes each at its own size as it comes round.
- **A tap on a board shows it alone.** On Showing, tapping a board previews it on its own, and Show on this screen puts just that board on. Show another board in turn makes a playlist of the two.
- **Home in Account.** Your city, your stops and your currency, which new tiles start from. With an account it is kept there, and a new device offers what you showed last.
- Smaller changes: Type your own message is always on Showing, one status line shows at a time, and before you pick a city the demo shows a world clock instead of departures from Stockholm.

## v0.10.0 (2026-09-30): Showing

People who had not built Split-Flap found the editor hard to follow. This release changes how it behaves: what you open is on the screen at once, and nothing changes what the screen runs until you press Show on this screen.

- **Showing comes first.** Edit opens on this screen, with what it shows now, the board on now, and the ways to change it.
- **What you open, you see.** A playlist, a board in My boards or a template goes on the screen as soon as you open it, with a gold bar under it that says it is a preview. Leave without pressing and the screen goes back, and says so.
- **Storyboards are called playlists.** It is the word most people used for them anyway.
- Picking a city on a first visit ends the first visit, a template lands on its board instead of the week view, and a board's zones come first on its page.

## v0.9.4 (2026-09-30): Fixes

I had a few people try Split-Flap and a full test round done. These are the fixes that do not need the new navigation, which comes next.

- **Every press answers.** Lines like "Saved to My boards" were hidden while the editor was open, so it looked like nothing happened. They now show under the editor's title, with Undo where it applies.
- **A QR code you can scan.** The code under Share was too small for a phone to read. It now opens full size when the panel cannot draw it big enough, and the wall link comes first, in kiosk mode.
- **A screen that restarts offline keeps its board.** The last departures, weather and prices are kept in the browser, so a screen that comes back before the network shows them with a note saying how old they are.
- **A wall link asks nothing.** A screen opened from a board link no longer asks anyone to sign in.
- Smaller fixes: the yen and other small currencies are quoted per 100 instead of as 0.00, Electricity price is only offered in Sweden, the demo's ticker message fits, a mistyped editor address corrects itself, and the placeholders for features to come later are gone.

## v0.9.3 (2026-09-30): Headlines

News and other feeds on the board, including on wall screens that never sign in.

- **Headlines.** A new tile shows the latest from a news site or any other RSS, Atom or JSON feed, one headline at a time under the feed's name. It works in a ticker row too.
- **Any feed, on any screen.** Most news sites do not let other pages read their feeds, so Split-Flap's server fetches them. BBC News, NASA and Hacker News work for everyone. Any other feed works once you have added it signed in, and a wall screen showing it can then read it without signing in.
- A new template, Headlines, in Home.

## v0.9.2 (2026-09-30): Your sources

Your own keys and sheets are kept with your account, and a new tile shows central banks' interest rates.

- **Your sources, with your account.** An Alpha Vantage key or a published sheet you add is kept with your account and reaches your other devices. On the server it is encrypted. Account lists them, and signing out removes them from that browser.
- **Interest rates.** A new tile shows the policy rate of the Riksbank, the ECB, the Bank of England or the Fed, with the date it last changed and a line over one or five years. A new template in Finance shows your own central bank and then all four.

## v0.9.1 (2026-09-30): Sheets

Your own Google Sheet can give the Markets tile its history.

- **History from your sheet.** I thought a published sheet could not share price history, but it can. Add a row with the symbol, and under it GOOGLEFINANCE's closes, and the line starts from the first day instead of building up over weeks. The guide linked from the tile shows how.

## v0.9.0 (2026-09-30): Markets

Shares, ETFs and crypto on the board, drawn as a line in a new kind of flap.

- **Half flaps.** A flap can now be coloured on its top or bottom half only, so a line on the board has twice the height to move in.
- **Markets.** A new tile draws a share, an ETF or a coin as a line, green where it rises and red where it falls, with its price, the day's change, and whether its market is open in your own time.
- **Built in for London and New York.** Shares and ETFs there work with no setup, with each trading day's close. Swedish shares are priced through their London listings. Split-Flap was approved for Alpha Vantage's programme for open-source projects, which is what makes this possible.
- **Crypto with no setup.** Bitcoin, ether and a few other coins, from CoinGecko.
- **Your own source.** For anything not built in, such as Stockholm itself or your funds, use your own Alpha Vantage key or a Google Sheet. Both stay in this browser.
- **Explore in sections.** Templates are in sections with pages of their own, and Finance has Stocks, ETFs, Crypto and Currency. There are three new templates: Stocks, Index trackers and Crypto.
- A new storyboard is 12 × 40, since this is about screens. Storyboards you have keep their size.

## v0.8.0 (2026-09-29): Anywhere

Split-Flap was built around Stockholm. This release makes it work for a screen almost anywhere, starting from one city search.

- **The place.** Search for your city in Display and new boards start from it: the weather, the nearest stop, the holidays, the currency, and 12 or 24 hours. A first visit asks where the screen is and builds the demo for it.
- **Departures, almost anywhere.** A new Departures tile finds the stop nearest your place and shows its next trains, buses and trams, from Transitous, which covers most of Europe and North America. Stockholm stops still come from SL.
- **Station board.** Departures can look like a railway station, with the time, the destination, the platform and on time, late or cancelled.
- **Names in any alphabet.** Łódź prints as LODZ and Москва as MOSKVA. Before, letters the flaps do not carry came out blank.
- **Holidays for your country.** Today shows the public holidays of the place's country, and Countdown can count to the next one. Sweden keeps its flag days.
- **World clock.** A new tile with the time in a few cities, marked +1 or -1 when a city is on another day.
- **Currency in your currency.** Any of about thirty currencies can be the base, and bitcoin and a few other coins can go on the list, with a green or red flap for their day.
- **Rain soon.** The weather says when rain starts or stops in the next two hours.
- **Explore by use.** Templates are grouped (home, commute, office, café, money and fun), built for your place, and there are three new ones: Morning, World clock wall and Currency board.
- Every live tile names its source under its options, and Help lists them all.

## v0.7.3 (2026-09-28): Fixes

Fixes from a full test of the live site, across the editor, the content, accounts and the pages around it.

- If signing in did not finish, someone who had visited before got a browser error page in place of the message 0.7.2 added. They get the message now.
- On a phone, swiping through the week scrolls it. Before, a swipe could start a new time and jump the week back to midnight. A tap on an empty part of a day asks for a time there.
- The week keeps its place when something changes, and on a wide screen it opens at six in the morning.
- Departures and weather in a ticker row show their data. Before, the row showed only the station or the city, and other channels broke into pieces there.
- The demo weather board no longer cuts the wind unit in half.
- Keep the demo storyboard on a first visit opens the demo, where before it did nothing you could see.
- Share in a storyboard's ⋯ menu opens beside the editor on a wide screen, Escape closes an Import sheet even from its text box, and a double press of Save to my boards saves once.
- Swedish pages start Rotating messages and Menu in Swedish, a few hints use the new words, and small text is easier to read, in the light theme especially.

## v0.7.2 (2026-09-28): Fixes

Three fixes from using 0.7.1 on a computer and a phone together.

- If signing in with Google does not finish, for example when a phone opens Google in another app, you come back to Split-Flap with a message saying so. Before, it stopped on a bare error page that said Mismatch.
- On a new device, the demo made for a first visit no longer stays behind after you sign in. It goes if your account already has storyboards, and joins your account if it is empty.
- The editor no longer redraws when a sync finds nothing new, so a menu you have open stays still while you use it.

## v0.7.1 (2026-09-28): My boards

My boards, the fourth section, for boards you want to use again.

- Save to my boards keeps a copy of any board, from a storyboard or a template. It is the first button on every board, and it is in the ⋯ menu too.
- + Add a board on a storyboard can now take a board from My boards or from a template, and shows the copy on the big board at that storyboard's size before you add it. If flaps you typed or painted would be cut at the new size, it says how many first.
- A copy stands on its own, so changing it, or the one in My boards, leaves the other as it was.
- My boards can import a board file or a pasted Vestaboard message, one line per row, shown on the big board as you type.
- Guests get My boards too, kept in the browser. With an account they sync like storyboards, and the first sign-in asks about them board by board, beside your storyboards.
- Each board keeps its own colour in the week now, so moving boards around no longer changes their colours.
- The version line is back at the foot of Storyboards, one tap from this log. In 0.7.0 the log was only under Account.

## v0.7.0 (2026-09-28): Structure

A new structure for the editor, planned with Fable and Claude Design so there is room to grow. Nothing you made has changed, only where things are and what they are called.

- What was a board is now a storyboard, and what was a page is now a board. A storyboard is what a screen plays, its boards in order and when each one shows.
- The editor has its sections along the top: Storyboards, Explore for the templates, and Account, which now holds Help and the version log. They are the same on a phone and on a wide screen.
- Week is a storyboard's main view, with every board's times as blocks. Drag down a day to give a board a time, and drag a block to move it or change how long it runs. Before, the times sat at the bottom of each page, where they were easy to miss.
- Today's playlist shows what the storyboard plays today, worked out from the times. It sits beside the week, and in one line on the wall while the controls show.
- Every level has its own address, so the browser's back button and the back gesture on a phone go up one level, and a reload lands in the same place.
- Each storyboard and board has one ⋯ menu with the same actions in the same order, and Delete asks twice.
- A board's content is chosen in place, under its zone, so a board is never more than two levels deep.

## v0.6.4 (2026-09-28): Fixes

Two fixes from the review of 0.6.3, one of them to boards being lost as a guest.

- With Split-Flap open in two tabs, a change in one tab could save its older list of boards over the other, so a board made in the other tab was lost. Signed in it came back from your account, but as a guest it was gone. Now each tab picks up what the other saved before it saves again.
- After your first sign-in, if you deleted one of the boards you had kept before it reached the server, the message saying how many are in your account never came. It comes now, and counts only the boards that arrived.
- Delete page is red like the other delete buttons, and Help no longer says nothing leaves the browser, which has not been true with an account since 0.5.

## v0.6.3 (2026-09-28): Accounts

Making an account after using Split-Flap as a guest, with nothing lost on the way.

- The first time you sign in, the question about your guest boards stays until you answer it. Before, closing the tab while it showed skipped it, and the boards went into your account without asking.
- You choose board by board what goes to your account. The rest stay in this browser as they are.
- The app keeps a copy of your guest boards until the server has every one you kept, then tells you how many are now in your account.
- As a guest, once you have made a second board, the app suggests signing in once, and asks the browser not to clear your boards on its own. Dismiss it and it does not come back.

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
