# Split-Flap 0.10: design brief, making it usable by people who didn't build it

Date: 30 September 2026. Owner: Matthew. Written by Opus for the design team, from Matthew's testing, Fable's QA of 0.9.3 and Fable's review of the 0.10 plan.
Read with:
- `flows.html` in this folder, or the PNGs in `png/`
- figure 0 first, then D, then E to J
- figure L, which has rough wireframes for shape only

Settled and carried over:
- the look of the board, the three themes, the control bar, the tile picker and the composer (`DESIGN-HANDOVER.md`, `DESIGN-HANDOVER-editor.md`)
- the drawer's chrome and Back from 0.7 (`DESIGN-HANDOVER-0.7.md`)

This brief is about how the editor behaves and in what order. The look of the drawer isn't changing.

## 1. The problem

Split-Flap turns any spare screen into a split-flap board, with a free web app. Matthew and the people he tested with couldn't follow the editor. In their words:

- "Why are templates and examples different?"
- "Adding a template doesn't do anything visually."
- "No confirmation."
- "You then need to navigate elsewhere."
- Picking a board doesn't make it appear, and nobody can say why it has to go into a storyboard, how, or what happens after.

The cause is the model under the screens, not the look. The app has three kinds of thing (a board, a storyboard and a template), and two lists of boards. Opening a thing is also different from showing it, and that difference is invisible. Figure A shows today's map, and figure B shows one simple task taking 9 steps with no answer at any of them.

## 2. Who it's for

Design for these three situations. Each is a real person Matthew has in mind.

1. **The newcomer.** They came from a link or a Reddit post, with a spare monitor or TV in mind. They've never seen a split-flap app, and they'll give it about a minute. They want to see their own city on it, and type one line.
2. **The regular.** They have a board in the hallway and a phone in their hand. They come back once a week to change the message, add the departures, or show something for a party. They don't remember how it worked last time.
3. **The wall.** It isn't a person. A screen, a Raspberry Pi or a TV runs all day with nobody touching it. It must never be left showing a half-finished choice, a prompt or a preview.

## 3. What success looks like

The same testers, ten minutes each, no help, working on a phone and a laptop:

1. Put the London weather on this screen.
2. Show the departures from your stop.
3. Put your own message on it.
4. Show the weather and the departures in turn.
5. Put it on another screen.
6. Find the board you made yesterday.
7. Make every new board use Manchester.

Tasks 1 to 4 should pass for everyone at 0.10.0, and all seven at 0.10.1. Note where each person hesitates, not only where they stop. A hesitation of more than a few seconds counts as a design problem.

## 4. The rules the design has to make visible

These come from the plan, and figure D is their state diagram. If a screen design breaks one of them, the screen is wrong.

1. **What you open, you see.** Opening a board, a playlist or a template shows it on the screen behind the drawer at once.
2. **You can always tell a preview from what's really on.** While you're looking at something that isn't showing yet, a gold bar sits on the board and says so, with the action that makes it real. The words in the frames are "Previewing Departures · Use this" for a template and "Show on this screen" for a board.
3. **Only two buttons change what the screen runs:** Show on this screen, and Use this.
   - Leaving without pressing either puts the screen back, and says so: "Back to Morning".
   - So does a reload, or three minutes untouched, so a wall is never left on a preview.
4. **Every press answers in words**, in one place, the status line under the panel's title: "Now showing Weather", "Saved", "Added to Morning", "Deleted Weather. Also taken out of Morning. Undo".
   - It's visible without looking for it.
   - It lasts long enough to read.
   - A screen reader hears it.
5. **You finish where you are.** No action sends you to another tab or level to complete it. Use this keeps you on the thing you just used, now showing.
6. **One kind of thing.** Everything is a board. A template is a board you haven't taken yet. The demo is a template that's already on, and it appears in Explore marked On now.
7. **A playlist only appears when you ask for two boards in turn.** Someone with one board never sees the word, the times or the week view.
8. **The first tab is this screen:** what it's showing, how to change it, and how to show more.

## 5. The moments to design

This follows figure 0. For each moment: what the person wants, what they must see, and what not to do.

### 5.1 Arrive
- **They want** to know what this is in a few seconds.
- **They see** the demo running, and one cue: "This is a demo. Press Edit to make it yours."
- **Don't** put jargon above the board. Today "Now showing Welcome, Big clock, Departures..." is the first thing on the page.

### 5.2 Make it mine (figure E, wireframe L1)
- **They want** to see their city.
- **They see:**
  - Edit opens Showing, with one card: "Where is this screen?".
  - Picking a city rebuilds the demo in place, and the status line says what changed: "Built for London, with Trafalgar Square, London weather and English holidays".
  - The card goes for good.
  - Two ways on: "Type your own message" and "Browse templates".
- **Don't** ask the question again, put a sign-in card in the way, or make them find Explore to answer it.

### 5.3 Pick something ready (figure F, wireframe L2)
- **They want** to try things without breaking anything.
- **They see:**
  - A template on the screen as soon as they open it, at its own size, with the gold bar.
  - Use this keeps it and shows it, and they stay on it.
  - Back returns the screen to what it was.
- **Don't** show thumbnails only, or send them to a week view.

### 5.4 Change it (figure G, wireframe L4)
- **They want** to make it say something.
- **They see:**
  - The zones first, since they're what you came to change. Name, layout and size come below.
  - "Saved" after each change.
  - If the board is in a playlist, the playlist holds on it while they edit, and says so.
  - If the board is used in more than one playlist, it says where: "In Morning and Office".
- **Don't** lead with a primary button for something else. Today it's "Save to my boards", above the name.

### 5.5 Show more than one (figure H)
- **They want** the weather and the departures, taking turns.
- **They see:**
  - One button on Showing: "Show another board in turn".
  - Picking the second board makes a playlist, and the status line says so.
  - Times and days are there under When, marked Advanced.
- **Don't** make them create a container first and then fill it.

### 5.6 Put it on a wall (figure I)
- **They want** it on the TV.
- **They see:**
  - The wall link first, with Copy.
  - A QR code large enough to scan from a phone held at arm's length.
  - On the wall, the link opens as a screen, with no prompts.
- **Don't** show anything on the wall that needs someone to press it.

### 5.7 Come back later (figure C, wireframe L3)
- **They want** to find what they made.
- **They see:**
  - One Boards list: playlists first, then boards, each at its own shape, with the one on the screen marked On now.
  - A new device suggests what they showed last, without switching to it.
- **Don't** split boards across two lists.

### 5.8 Home (figure J, wireframe L5)
- **They want** to set their city once.
- **They see** Home in Account (city, stops and currency), with one line saying "New tiles and templates use these".
- **Don't** change their existing boards when Home changes.

## 6. States every frame needs

Design each of these, and don't leave any to the build:

- The gold bar:
  - on a phone, on a laptop with the drawer open, and on a 1080p wall
  - on all three themes (black, white, Solari)
  - in both languages. Swedish runs longer.
- The status line:
  - a plain confirmation
  - one with Undo
  - one with a follow-on action ("Saved. Back to Morning · Show it now")
  - a failure ("Couldn't save. Try again")
  - two in quick succession
- Showing, with one board, with a playlist, and with the demo.
- Boards when empty, with one board, and with 40 boards and 5 playlists.
- A playlist of mixed sizes, 6 × 22 and 12 × 40, in the Boards grid and in the playlist page.
- A preview that timed out, as seen by the person who comes back to the drawer.
- A guest and a signed-in person, for Home and Boards.

## 7. Constraints

- **Phone first.** 390 px wide. The thing they came to change should be on the first screen, not 800 px down.
- **Wall at three metres.** Anything drawn on the board itself, the gold bar included, must read from across a room at 720p.
- **Keyboard and screen readers:**
  - Everything reachable, with focus moved sensibly on every level change.
  - The status line is announced.
  - The gold bar's action is a real button.
- **Touch targets of 44 px** for anything a thumb presses.
- **Two languages,** English and Swedish, written by the same person in each. Matthew's copy rules apply: plain, British spelling, no dashes as punctuation, no exclamation marks.
- **Words.** Board, playlist, template, tile, source, screen and display, one meaning each. The plan's glossary change comes with 0.10.0. Don't introduce new nouns.

## 8. What to hand back

As in 0.7:
- a working reference prototype with presets for each moment in section 5 and each state in section 6
- a storyboard of frames at 1440 × 900 and 390 × 844
- the strings in both languages

Mark what ships in 0.10.0 (the rule, Showing, the first visit, the status line and the gold bar) apart from 0.10.1 (one Boards list, playlists, Home). Then the build can start on 0.10.0 while 0.10.1 is finished.

## 9. Open questions for the design team

1. Where the gold bar sits on the board so it's unmistakable and still leaves the board readable: over the bottom rows, beside the board, or as a frame round it.
2. Whether "Show on this screen" and "Use this" should be one label. They do the same thing from the person's side. The difference is only whether a copy is made.
3. How the Boards grid shows boards of different shapes without looking ragged.
4. How much of Showing fits above the fold on a phone when a playlist is on.
5. Anything in the flows that a person would still trip on. Say so, even if it changes the plan.
