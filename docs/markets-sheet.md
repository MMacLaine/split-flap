# Your own sheet for the Markets tile

Split-Flap has London and New York shares and ETFs built in. For anything else, such as Stockholm itself, OMXS30 or your funds, you can use a Google Sheet of your own. The sheet looks the prices up with `GOOGLEFINANCE`, you publish it as a CSV file, and the board reads it every five minutes.

Google doesn't let a published sheet show price history, so the board draws the line itself from the prices it reads. You see today's line straight away, and the week and the month fill in as the days go by on that screen.

## Make the sheet

1. Open [sheets.new](https://sheets.new) in the Google account you want to use.
2. Put these headers in row 1: `Symbol`, `Name`, `Price`, `Change %`, `Currency`, `Exchange`.
3. Add one row per share, fund or index. For example:

| Symbol | Name | Price | Change % | Currency | Exchange |
|---|---|---|---|---|---|
| OMXS30 | OMX Stockholm 30 | `=GOOGLEFINANCE("INDEXNASDAQ:OMXS30","price")` | `=GOOGLEFINANCE("INDEXNASDAQ:OMXS30","changepct")` | SEK | STO |
| ERIC-B | Ericsson B | `=GOOGLEFINANCE("STO:ERIC-B","price")` | `=GOOGLEFINANCE("STO:ERIC-B","changepct")` | SEK | STO |
| SPX | S&P 500 | `=GOOGLEFINANCE("INDEXSP:.INX","price")` | `=GOOGLEFINANCE("INDEXSP:.INX","changepct")` | USD | US |

   The Symbol column is what you type in the Markets tile. It can be anything, as long as it matches.
   If a price cell shows `#N/A`, look the share up on [Google Finance](https://www.google.com/finance) and use the code it shows, for example `STO:ERIC-B`.

4. Go to File, Share, Publish to web, choose the sheet, pick "Comma-separated values (.csv)", and press Publish.
5. Copy the link. It ends in `output=csv`.

## Use it on the board

1. In the Markets tile, open More options and pick **Your published sheet** under Your own source.
2. Paste the link.
3. Type each symbol from your Symbol column and press Enter.

The link is kept in this browser only, never in the board or its share link. A wall screen needs it pasted once on the screen itself.

`GOOGLEFINANCE` is Google's, and its terms say the data isn't for professional use. The sheet and its use are yours.
