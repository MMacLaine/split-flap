# Fonts

All four families are under the SIL Open Font License 1.1. Each family's licence is beside its files, as the licence asks: `OFL-dm-mono.txt`, `OFL-schibsted-grotesk.txt`, `OFL-plus-jakarta-sans.txt` and `OFL-cormorant.txt`, from the upstream repositories. None of them declares a Reserved Font Name, so a modified file may keep the family's name.

| File | Family | Upstream |
|---|---|---|
| `dm-mono-400.woff2`, `dm-mono-500.woff2` | DM Mono | github.com/googlefonts/dm-mono |
| `schibsted-grotesk.woff2` | Schibsted Grotesk | github.com/schibsted/schibsted-grotesk |
| `plus-jakarta-sans.woff2` | Plus Jakarta Sans | github.com/tokotype/PlusJakartaSans |
| `cormorant-garamond-lnum.woff2` | Cormorant Garamond, modified | github.com/CatharsisFonts/Cormorant |
| `cormorant-garamond-normal.woff2` | Cormorant Garamond, as released | the same |

## The modified Cormorant (0.11.0)

`cormorant-garamond-lnum.woff2` is `cormorant-garamond-normal.woff2` with its lining figures made the default, so times sit at cap height on the Calm look. It was made with `pyftfeatfreeze -f lnum cormorant-garamond-normal.woff2 cormorant-garamond-lnum.woff2` (opentype-feature-freezer, on fontTools). Nothing else changed. It is a Modified Version under the OFL and stays under the same licence. The page uses it from 0.11.0. The original stays here as the way back.
