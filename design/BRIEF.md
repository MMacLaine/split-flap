# Design brief: Split-Flap Board (maclaine.se/split-flap)

For: a dedicated Claude design session. Output: a design handoff an
engineering session can implement (precedent format:
`_local/design_handoff_guides_v3`, `_local/design_handoff_finance_wiki`).
Date: 2026-09-27. Owner: Matthew. The handoff lands in the app repo
(`~/split-flap/DESIGN-HANDOVER.md` + assets), like Tunnelbana's
`DESIGN-HANDOVER-*.md`. Engineering plan:
`_local/plans/PLAN-split-flap-2026-09-27.md` (decisions there are settled,
do not reopen them).

## The task in one line

Design a free, browser-based split-flap display (a Vestaboard alternative)
that looks convincingly physical on a wall monitor, and wraps it in a
control surface and editor that disappear when not in use.

## What it is

- A grid of flaps (default 6 rows x 22 columns, also 3x15, fill-screen and
  custom sizes) that flips through characters like a railway departure
  board.
- It runs full screen on a spare monitor (Raspberry Pi, old laptop, a tab
  cast to Chromecast) for hours or days at a time.
- Content is a playlist of pages. Each page is made of zones (Full,
  Header+body, Split, Ticker row) bound to channels: message, clock/date,
  countdown, SL departures, weather, quotes.
- It is a public tool. Anyone can open it, and all state stays in their
  browser. Matthew's wall display is one instance.

## Surfaces to design (all of them)

1. **The flap tile (the hero; spend most of the effort here).**
   - Anatomy: housing gap, flap face, the horizontal split line/crease,
     glyph, subtle top/bottom shading, the edge of the next flap peeking
     out.
   - The fold, frame by frame: the top half falls over the hinge and
     reveals the bottom half of the next character. Specify the lighting
     and shading on the falling half at about 0%, 50% and 100% of the fold.
   - Colour chips: the Vestaboard 8 (red, orange, yellow, green, blue,
     violet, white, black) plus "filled". They are flaps with no glyph.
   - Glyph: typeface choice and weight, cap height relative to the flap, and
     how Å Ä Ö sit (the ring and dots must fit inside the flap). Candidates
     are self-hosted DM Mono or Schibsted Grotesk, or a proposal with its
     licence.
   - **Rendering constraint:** everything is drawn on a single 2D canvas
     (weak hardware). Specify it as flat shapes, gradients and a glyph, not
     CSS 3D or filters. The fold is a vertical scale of each half plus
     shading. Glyphs are pre-rendered into an atlas, so no per-frame blur
     or shadow effects.
2. **Board themes (at least three).**
   - Vestaboard Black: matte black flaps, warm white glyphs.
   - Vestaboard White: white flaps, black glyphs.
   - Solari/airport: dark grey, yellow or amber glyphs, visible screws and
     frame.
   - For each theme, specify the frame/bezel around the grid and the
     backdrop that fills the rest of the screen (the board never fills a
     16:9 or ultrawide monitor exactly; the letterbox must look deliberate).
3. **Control bar.** It appears on mouse movement or a tap and hides again
   with the cursor after about 3 seconds. Actions: Edit, Fullscreen, Sound
   (off by default), Share (board link + QR code), board switcher, and a
   language toggle (EN|SV). It must never cover the board in a way that
   looks broken in a screenshot.
4. **Editor drawer.** It is a side drawer with a live board preview beside
   it. It holds:
   - **Pages list:** reorder, duration, optional day/time window.
   - **Page editor:** choose a layout preset, then fill each zone with a
     channel and set that channel's options. Examples: message text with a
     colour-chip picker, clock format, countdown target, SL station search,
     weather city search.
   - **Board settings:** grid size preset or custom rows/cols, theme,
     transition (classic/wave/drift/curtain) and speed (gentle/fast), quiet
     hours (blank or dim), sound.
   - **Boards:** save, duplicate, export/import JSON.
   - **Mobile layout:** people compose on a phone, then send a board link
     to the monitor, so the editor must be good at 400px. There the preview
     sits above the controls.
5. **Message composer.** Typing directly on the grid, where you see exactly
   where characters land, versus a text field that reflows. Pick one and
   show how the user sees overflow, the invalid character fallback
   (becomes blank) and the colour-chip insertion.
6. **Kiosk mode** (`?kiosk=1` or fullscreen). Only the board and backdrop
   are visible. Show how quiet hours look (blank vs dimmed) and the offline
   indicator (a tiny, unobtrusive sign that live data is stale).
7. **Below-the-fold page** (hidden in kiosk mode). A short explainer, a
   "how to put it on a monitor" guide (Pi, casting, old laptop), an FAQ and
   data attributions (SL, Open-Meteo CC BY 4.0). It must sit within the
   personal-site family (the homepage tokens below), not the finance
   suite.
8. **First visit.** The page opens on a live demo playlist that shows off
   every channel. How does a visitor learn that it is theirs to edit? It
   needs a single cue, not a tour.

## Hard constraints

- **Performance:**
  - A Raspberry Pi 4 must hold a steady frame rate during a full 6x22
    board flip.
  - No full-screen blur, backdrop-filter or box-shadow animation over the
    board.
  - The control bar and drawer may use normal CSS, since they are not on
    the canvas.
- **Tokens for the chrome** (personal site, `index.html :root`):
  - `--bg #13151A`, `--bg-2 #1A1D24`, `--surface #1C1F27`
  - `--text #EDE6D6`, `--muted #868991`, `--pale #A3A8B0`
  - `--accent #C8974A`, `--accent-soft`, `--accent-line`, `--border(-2)`
  - Fonts: DM Mono (self-hosted in `/fonts/`), Plus Jakarta Sans,
    Cormorant Garamond.
  - The board themes may go beyond these tokens; the chrome should not.
- **Both colour schemes:** the chrome needs light and dark versions. The
  board theme is chosen separately from the site theme.
- **Everything left-aligned, every viewport** (standing owner ruling). The
  board itself is the one exception: it is centred in its viewport because
  it is a physical object on a wall.
- **No dash punctuation** in any copy (no em or en dashes). Expand acronyms
  on first use.
- **Viewports to show:** 1920x1080, 3440x1440 ultrawide, 1080x1920
  portrait monitor, 1280x800 laptop, 400px phone (editor).
- **Accessibility:** controls reachable by keyboard, board content mirrored
  to an `aria-live` text region, and reduced-motion mode (flaps cut
  straight to the final character with a brief crossfade).

## Owner taste (calibration)

- The bar is /r/designporn: distinctive and composed, not merely clean.
  Someone should mistake a photo of the monitor for a real board.
- Physical honesty over decoration. No fake reflections, glare or
  skeuomorphic wood. The realism comes from the flap mechanics, shading
  and the glyph.
- References to study:
  - Vestaboard product photos (vestaboard.com)
  - Solari di Udine boards
  - FlipOff (github.com/magnum6actual/flipoff)
  - splitflap.org
  - the "hello-mat" split-flap component write-up (hello-mat.com)
  - Not a reference for look, only for scope: SplitFlapTV
    (splitflaptv.com).

## Deliverables

1. Tile spec: dimensions as ratios of tile height, colours per theme, fold
   frames with shading values, glyph metrics. Numbers an engineer can put
   straight into canvas draw calls.
2. Theme sheet (3+ themes): board, frame and backdrop.
3. Static HTML/CSS for the control bar, editor drawer (desktop + 400px)
   and below-fold page, in plain CSS with zero dependencies.
4. Motion notes: flap timing curve, stagger, how the control bar enters
   and leaves, how the drawer opens.
5. A README in the handoff format covering fidelity, which files ship, and
   what is reference only.
