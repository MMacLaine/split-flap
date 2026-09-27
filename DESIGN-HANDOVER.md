# Split-Flap: design handover

Date: 27 September 2026. Owner: Matthew. Target: `~/split-flap/DESIGN-HANDOVER.md` plus the files below.
Engineering decisions in `PLAN-split-flap-2026-09-27.md` are settled; nothing here reopens them.

## Fidelity

- **High fidelity, ship as written:** tile geometry, fold shading, themes, chip colours, glyph metrics, timing. These are the constants at the top of `flap-renderer.js`. The spec sheet draws itself from that file, so if the file changes, the sheet changes with it.
- **High fidelity layout, restyle only to match the build:** control bar, editor drawer (desktop and phone), share popover, board switcher, first visit cue, offline indicator, below the fold page.
- **Reference only:** the mocked SL and weather tables, the QR (Quick Response) code placeholder, the sound synthesis, and the Swedish copy for the page below the fold (not written yet; the chrome and board content are translated).

## Files

| File | Status | What it is |
|---|---|---|
| `flap-renderer.js` | **Ships** (port or keep) | Single 2D canvas renderer: atlas, fold, stagger, background layer. Zero dependencies. `new SplitFlap.Board(canvas, {rows, cols, theme, speed, transition})`, then `board.setGrid(rows)`. |
| `board-content.js` | Reference, partly ships | Layouts, zone maths, channel formatting, demo playlist, EN and SV strings. Swap the `MOCK_*` tables for SL and Open-Meteo fetchers. |
| `Split-Flap Board.dc.html` | Reference prototype | The whole product working: board, control bar, drawer, composer, kiosk, quiet hours, below the fold. Tweaks panel previews `chrome` (dark or light), `preview` (quiet blank, quiet dim, offline), `kiosk`, `firstVisit`. |
| `Split-Flap Spec.dc.html` | Reference | Tile anatomy, fold frames with shading table, glyph metrics, chips, themes, viewports, motion. |

The prototype files use inline styles because of how they were authored. Port them to plain CSS classes on the chrome tokens; every value is visible in the markup.

## Tile (ratios of tile height H)

- Flap width 0.68H, radius 0.05H. Gap 0.11H across, 0.17H down. Round H to an even number of device pixels.
- Split at 0.5H: crease 0.022H (at least 1px), lip 0.010H under it, occlusion gradients 0.08H above and 0.06H below, pin notches 0.035W by 0.05H on both edges.
- Flap stack: edge lines at +0.010H and +0.030H below each flap.
- Glyph: cap height 0.46H, baseline 0.73H, font size = 0.46H / cap ratio. Rings and dots top out near 0.10H.
- Faces: DM Mono 500 (Black, White), Schibsted Grotesk 700 (Solari). Both SIL Open Font License 1.1, self host.

## Fold

θ = π · t^1.35. Under π/2 the old top half is scaled by cos θ toward the hinge with black overlay `fallDark · sin θ`, and the revealed top gets black `cast · cos θ`. Over π/2 the new bottom half grows by −cos θ with white overlay `riseLight · sin θ`, casting a 0.12H gradient shadow `cast · sin θ` below it. Near edge on (sin θ over 0.85) draw a 0.012H edge line. After the final flap: rebound θ = π − 0.13 · sin(πs).

## Timing

Fast: step 70ms, final 160ms, rebound 90ms, max 10 steps. Gentle: 110, 260, 120, max 14. Stagger: classic 22ms per column plus 0 to 30ms jitter, wave 28ms per diagonal, drift random up to 1200ms, curtain 140ms per row. Reduced motion: 140ms crossfade. Control bar: in 180ms ease-out, out 420ms ease-in after 3s idle; cursor hides with it. Drawer: 260ms slide and fade; board re-lays out once, never animate canvas size.

## Decisions made in this pass

- **Composer types on the grid**, not in a reflowing text field. You see exactly where each character lands, chips insert at the caret, and there is no hidden overflow: at the last flap typing stops and a note says the board is full. An unsupported character is placed as a blank flap and a note names it. Arrow keys, Enter (next row), Backspace, Delete. A hidden input keeps the phone keyboard working.
- **Ticker rows page, they do not scroll.** Real flaps cannot scroll smoothly, so a ticker row steps through word wrapped segments every 3.5s.
- **Control bar sits bottom left** on a solid surface with a border, so in any screenshot it reads as a deliberate panel, not a glitch. It is hidden while editing and absent with `?kiosk=1`. In fullscreen it still appears on movement so there is a way out.
- **First visit cue:** one sentence tied to the Edit button, shown above the bar, which stays up for 12s on the first visit. Dismissed for good on Got it or on first Edit.
- **Letterbox is the wall:** static radial gradient plus a contact shadow painted once. The board uses at most 88% of the limiting axis.
- **Offline indicator:** a 6px ring and "Live data 14 min old" in 11px DM Mono at 45% ink, bottom left of the wall.
- **Quiet hours:** dim fades the canvas to 22% over 1.6s; blank flips every cell to space.
- **Light chrome tokens are proposed** (the homepage only defines dark): bg #F4F0E7, bg-2 #EBE6DB, surface #FBF8F2, text #1B1D22, muted #686B72, pale #4F535A, accent #8C6222.

## Accessibility

Every control is a real button or input, reachable by Tab, with visible focus in the accent. Shortcuts E (edit), F (fullscreen), S (sound), Escape (close). Board text is mirrored into an `aria-live="polite"` region; chips are read as spaces.

## Open items for engineering

- Real QR code generation in the share popover.
- The share link should carry the full board (the prototype shows a short stub).
- Swedish copy for the page below the fold.
- Check the Pi 4 frame rate on a 6 × 22 curtain transition at 1080p with DPR 1.
