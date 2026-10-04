// Version log. Each version is a release, newest first. CHANGELOG.md is generated
// from this file by _dev/gen-changelog.mjs, so edit here only.

export const CHANGELOG = [
  {
    v: '0.11.4', date: '2026-10-04',
    tag: { en: 'When it shows', sv: 'När den visas' },
    desc: {
      en: 'A board\'s times are on a week you can drag now, at the top of When it shows, instead of a form behind Advanced.',
      sv: 'En tavlas tider ligger nu på en vecka du kan dra i, överst under När den visas, i stället för ett formulär bakom Avancerat.'
    },
    items: {
      en: [
        '**Drag to set a time.** Drag down a day to add a time, drag an edge to make it longer or shorter, and tap it to change or remove it. The playlist\'s other boards sit faintly behind, so you can see where this one fits.',
        '**On a phone** it is one day at a time with arrows, and a finger draws a time without the page scrolling under it.',
        '**The form is still there,** under the week, for exact times, dates and the keyboard. Both change the same times as the playlist\'s Week, and every change says what it did, with Undo.'
      ],
      sv: [
        '**Dra för att sätta en tid.** Dra nedåt i en dag för att lägga till en tid, dra i en kant för att göra den längre eller kortare, och tryck på den för att ändra eller ta bort den. Spellistans andra tavlor syns svagt bakom, så du ser var den här passar in.',
        '**På en telefon** är det en dag i taget med pilar, och ett finger ritar en tid utan att sidan rullar under.',
        '**Formuläret finns kvar,** under veckan, för exakta tider, datum och tangentbordet. Båda ändrar samma tider som spellistans Vecka, och varje ändring säger vad den gjorde, med Ångra.'
      ]
    }
  },
  {
    v: '0.11.3', date: '2026-10-04',
    tag: { en: 'Finishing', sv: 'Det sista' },
    desc: {
      en: 'The last of 0.11: glass, smoke and paper sound like what they are, and old copies of boards are cleared out.',
      sv: 'Det sista i 0.11: glas, rök och papper låter som det de är, och gamla kopior av tavlor rensas bort.'
    },
    items: {
      en: [
        '**A sound for each material.** Glass ticks high and short, smoke the same but lower, and paper taps softly. Flap and Solari clack as before. If you chose a sound for the playlist yourself, that one wins.',
        '**The old copies go.** Boards from before 0.10.1 were also kept in their old form, so the move could be undone. They are cleared out now, after a wait that the privacy page describes.',
        '**Looks on an empty board.** The look sheet shows HELLO, the Nordic letters, a time and a row of colours on a board with nothing on it yet, so a change of type or letter colour shows. A new board starts with HELLO now, never blank.',
        'Help covers the light, the sky, Listen and the Music meter.'
      ],
      sv: [
        '**Ett ljud för varje material.** Glas tickar högt och kort, rök likadant men lägre, och papper knackar mjukt. Flapp och Solari klapprar som förut. Har du själv valt ett ljud för spellistan är det det som gäller.',
        '**De gamla kopiorna försvinner.** Tavlor från före 0.10.1 sparades också i sin gamla form, så att flytten kunde göras ogjord. Nu rensas de bort, efter en väntan som integritetssidan beskriver.',
        '**Utseenden på en tom tavla.** Utseendepanelen visar HEJ, de nordiska bokstäverna, ett klockslag och en rad färger på en tavla som inte har något på sig än, så att ett byte av typsnitt eller bokstavsfärg syns. En ny tavla börjar med HEJ nu, aldrig tom.',
        'Hjälpen tar upp ljuset, himlen, Lyssna och Musikmätaren.'
      ]
    }
  },
  {
    v: '0.11.2', date: '2026-10-04',
    tag: { en: 'Music', sv: 'Musik' },
    desc: {
      en: 'A Music meter board, and Party, a look whose light moves to the music in the room. Both listen through the microphone, only while Listen is on.',
      sv: 'En musikmätare, och Fest, ett utseende vars ljus rör sig efter musiken i rummet. Båda lyssnar genom mikrofonen, bara medan Lyssna är på.'
    },
    items: {
      en: [
        '**Music meter.** Level bars across the board, green, amber and red, with the peak held for a moment. Before you press Listen it sits there unlit, like a real meter switched off. Mixer, Bars or Mirror, and it is made for 12 × 40.',
        '**Party.** Smoked glass, rose letters and a wide light on Music. Without Listen the light breathes slowly, and with it on it follows the beat.',
        '**Listen** is in the control bar and on Showing whenever the board can use it, and the L key starts it on a kiosk. Stop turns the microphone off, and a reload always does.',
        'The clack is off while the meter runs, since the meter turns flaps many times a second.'
      ],
      sv: [
        '**Musikmätare.** Nivåstaplar över tavlan, gröna, gula och röda, med toppen kvar en stund. Innan du trycker på Lyssna står den släckt, som en riktig mätare som är avstängd. Mixer, Staplar eller Spegel, och den är gjord för 12 × 40.',
        '**Fest.** Rökfärgat glas, rosa bokstäver och ett brett ljus på Musik. Utan Lyssna andas ljuset långsamt, och med det på följer det takten.',
        '**Lyssna** finns i kontrollraden och under Visas när tavlan kan använda det, och tangenten L startar det på en kiosk. Stoppa stänger av mikrofonen, och det gör en omladdning alltid.',
        'Klapprandet är av medan mätaren går, eftersom mätaren vänder flappar många gånger i sekunden.'
      ]
    }
  },
  {
    v: '0.11.1', date: '2026-10-04',
    tag: { en: 'Light and sky', sv: 'Ljus och himmel' },
    desc: {
      en: 'Looks can now have light round the frame and follow the sky outside. Five new looks use them: Backlit, Classic RGB, Signal, Outside and Sunday.',
      sv: 'Utseenden kan nu ha ljus runt ramen och följa himlen ute. Fem nya utseenden använder det: Bakljus, Klassisk RGB, Signal, Ute och Söndag.'
    },
    items: {
      en: [
        '**Light round the frame.** It can glow, breathe, chase or flash when the board changes, in a colour you pick or the board\'s own: Signal goes red when a red chip is on the board, so a late train shows from across the room.',
        '**Follow the sky.** Outside takes the time of day and the weather where the screen is, so the wall goes from night to dawn to day, and rain on the forecast is rain on the wall. Without a place it follows the sun alone, and the board\'s page says so.',
        '**Classic RGB.** Classic as it is, with a ring of colour round it. The board itself is Classic to the pixel.',
        '**Make your own** has Light and Sky rows now, with a few stops for speed, brightness and size instead of sliders.',
        '**Smoothness.** A slow screen drops the moving wall first and the light last, and says so once. Showing has the setting for this screen, Automatic or a step of your own.',
        'Templates start in the look made for them: the station board in Signal, the weather in Outside, the markets in Backlit and the café menu in Sunday.'
      ],
      sv: [
        '**Ljus runt ramen.** Det kan lysa, andas, jaga eller blinka när tavlan ändras, i en färg du väljer eller tavlans egen: Signal blir röd när ett rött fält finns på tavlan, så ett sent tåg syns från andra sidan rummet.',
        '**Följ himlen.** Ute tar tiden på dygnet och vädret där skärmen är, så väggen går från natt till gryning till dag, och regn i prognosen är regn på väggen. Utan en plats följer den bara solen, och tavlans sida säger det.',
        '**Klassisk RGB.** Klassisk som den är, med en ring av färg runt. Själva tavlan är Klassisk pixel för pixel.',
        '**Gör ditt eget** har raderna Ljus och Himmel nu, med några steg för hastighet, ljusstyrka och storlek i stället för reglage.',
        '**Jämnhet.** En långsam skärm tar bort den rörliga väggen först och ljuset sist, och säger det en gång. Visas har inställningen för den här skärmen, Automatiskt eller ett eget steg.',
        'Mallar börjar i utseendet gjort för dem: stationstavlan i Signal, vädret i Ute, marknaderna i Bakljus och kafémenyn i Söndag.'
      ]
    }
  },
  {
    v: '0.11.0', date: '2026-10-04',
    tag: { en: 'Looks', sv: 'Utseenden' },
    desc: {
      en: 'Every board can now have a look of its own: what its flaps are made of, the type, the letters and the wall behind it. This release has Classic, which is the board as it was, and Calm, with Make your own for the rest.',
      sv: 'Varje tavla kan nu ha ett eget utseende: vad flapparna är gjorda av, typsnittet, bokstäverna och väggen bakom. Den här versionen har Klassisk, som är tavlan som den var, och Lugn, med Gör ditt eget för resten.'
    },
    items: {
      en: [
        '**Calm.** Clear glass flaps over three fields of colour that drift too slowly to notice, with serif letters that glow. The glass is solid while it turns, so the next letter never shows through it.',
        '**Change it on the board.** A board\'s page has Look, with Change. Each card shows that board in the look, and opening one puts it on the screen under the gold bar until you press Use this look.',
        '**Make your own.** Pick the material, the type, the letter colour, the motion and the wall. It only offers what works together, so lit letters need a dark material and glass always has colour behind it.',
        '**The default, a pin and Same look for all.** Account sets the look new boards start as, and every board on Default follows it. Showing can pin one look to a screen, and a playlist can give every board one look, with Undo.',
        'Classic is the board you had, pixel for pixel, and boards from before keep their look: a white board is now Paper and a Solari board is Solari. Times in Calm\'s serif now sit at full height.'
      ],
      sv: [
        '**Lugn.** Klara glasflappar över tre färgfält som rör sig för långsamt för att märkas, med bokstäver i antikva som lyser. Glaset är helt medan det vänder, så nästa bokstav syns aldrig igenom.',
        '**Ändra det på tavlan.** En tavlas sida har Utseende, med Byt. Varje kort visar tavlan i utseendet, och öppnar du ett visas det på skärmen under den gyllene raden tills du trycker Använd det här utseendet.',
        '**Gör ditt eget.** Välj material, typsnitt, bokstävernas färg, rörelse och vägg. Bara det som går ihop erbjuds, så lysande bokstäver behöver ett mörkt material och glas har alltid färg bakom sig.',
        '**Standard, fäst och Samma utseende för alla.** Under Konto väljer du utseendet nya tavlor börjar som, och varje tavla på Standard följer det. Visas kan fästa ett utseende vid en skärm, och en spellista kan ge alla sina tavlor samma utseende, med Ångra.',
        'Klassisk är tavlan du hade, pixel för pixel, och tavlor från förut behåller sitt utseende: en vit tavla heter nu Papper och en Solari-tavla Solari. Klockslag i Lugns antikva står nu i full höjd.'
      ]
    }
  },
  {
    v: '0.10.3', date: '2026-10-04',
    tag: { en: 'Fixes', sv: 'Rättningar' },
    desc: {
      en: 'A fix for signing out and back in, and templates that start at the size they are made for.',
      sv: 'En rättning för att logga ut och in igen, och mallar som börjar i storleken de är gjorda för.'
    },
    items: {
      en: [
        '**Signing out and in again adds nothing.** Signing out left a blank playlist behind, and signing in then offered it next to your own, while its board went to your account by itself. The blank is now left out at sign-in, and your playlists come back in their order. A stray "Board 1" from before can be deleted in Boards.',
        '**Templates start at their own size.** Station board and Office lobby are 10 × 32, the big tiles are 12 × 40, and messages and the currency board are 6 × 22. A template shows at that size, and you can pick another in its preview before you show it.',
        '**No instructions on the flaps.** A new message board says HELLO instead of TYPE HERE, since nobody types on the wall, and a tile with nothing set yet shows its name and a dash instead of PICK A CITY or ADD A FEED. What to do is in the editor, beside the tile.'
      ],
      sv: [
        '**Att logga ut och in igen lägger inte till något.** Att logga ut lämnade en tom spellista kvar, och vid inloggningen erbjöds den bredvid din egen, medan dess tavla hamnade i ditt konto av sig själv. Den tomma lämnas nu utanför vid inloggningen, och dina spellistor kommer tillbaka i sin ordning. En överbliven "Tavla 1" från förut kan tas bort i Tavlor.',
        '**Mallar börjar i sin egen storlek.** Stationstavla och Kontorsentré är 10 × 32, de stora rutorna är 12 × 40, och meddelanden och Valutatavla är 6 × 22. En mall visas i den storleken, och du kan välja en annan i förhandsvisningen innan du visar den.',
        '**Inga instruktioner på flapparna.** En ny meddelandetavla säger HEJ i stället för SKRIV HÄR, eftersom ingen skriver på väggen, och en ruta som inte är inställd än visar sitt namn och ett streck i stället för VÄLJ EN STAD eller LÄGG TILL ETT FLÖDE. Vad du ska göra står i redigeraren, bredvid rutan.'
      ]
    }
  },
  {
    v: '0.10.2', date: '2026-10-04',
    tag: { en: 'Big boards', sv: 'Stora tavlor' },
    desc: {
      en: 'New playlists have been 12 × 40 since 0.9, but most tiles were still drawn for 6 × 22 and left most of the board dark. This release gives the most used ones a layout for the big board, and makes the editor work on a phone.',
      sv: 'Nya spellistor har varit 12 × 40 sedan 0.9, men de flesta rutorna ritades fortfarande för 6 × 22 och lämnade det mesta av tavlan mörkt. Den här versionen ger de mest använda en layout för den stora tavlan, och gör att redigeraren fungerar på en telefon.'
    },
    items: {
      en: [
        '**Tiles for 12 × 40.** The clock has digits twice the size with the date under them, Today has the day in big letters, the world clock has a column a city, the weather has now, the next hours and three days together, and currency and menus are in two columns.',
        '**Fill screen is the wall\'s.** A board set to Fill screen takes the size of the wall that shows it. The editor shows it at the size a wall in this browser last filled, or 8 × 22, so a phone no longer edits a tall board the wall never shows.',
        '**The editor on a phone.** Typing on a 12 × 40 board keeps cells big enough for a finger and scrolls sideways, a landscape phone puts the editor beside the board, and on a short screen Today\'s playlist folds to one line above the week.'
      ],
      sv: [
        '**Rutor för 12 × 40.** Klockan har siffror i dubbel storlek med datumet under, Idag har dagen med stora bokstäver, världsklockan har en kolumn per stad, vädret visar nu, de närmaste timmarna och tre dagar tillsammans, och valuta och menyer står i två kolumner.',
        '**Fyll skärmen hör till väggen.** En tavla som ska fylla skärmen tar storleken på väggen som visar den. Redigeraren visar den i storleken en vägg i den här webbläsaren senast fyllde, eller 8 × 22, så en telefon redigerar inte längre en hög tavla som väggen aldrig visar.',
        '**Redigeraren på en telefon.** När du skriver på en tavla i 12 × 40 behåller rutorna en storlek som går att träffa med fingret och rullar åt sidan, en telefon på tvären visar redigeraren bredvid tavlan, och på en låg skärm viks Dagens spellista ihop till en rad ovanför veckan.'
      ]
    }
  },
  {
    v: '0.10.1', date: '2026-10-04',
    tag: { en: 'Boards', sv: 'Tavlor' },
    desc: {
      en: 'Testers could not see why templates, examples and My boards were different things. From this release every board is kept once, in Boards, and a playlist shows boards from there.',
      sv: 'Testarna förstod inte varför mallar, exempel och Mina tavlor var olika saker. Från den här versionen sparas varje tavla en gång, i Tavlor, och en spellista visar tavlor därifrån.'
    },
    items: {
      en: [
        '**One Boards list.** Your playlists, then every board you have made or taken from a template, each drawn at its own shape. My boards is gone, since everything is in Boards now.',
        '**A board is the same board in every playlist.** Change it in one and the others show the change, and the board says which playlists it is in. Duplicate it if you want one of its own. Deleting a board takes it out of each playlist and says which, with Undo.',
        '**Each board has its own size and theme.** A playlist can mix a 6 × 22 board with a 12 × 40 one, and the screen takes each at its own size as it comes round.',
        '**A tap on a board shows it alone.** On Showing, tapping a board previews it on its own, and Show on this screen puts just that board on. Show another board in turn makes a playlist of the two.',
        '**Home in Account.** Your city, your stops and your currency, which new tiles start from. With an account it is kept there, and a new device offers what you showed last.',
        'Smaller changes: Type your own message is always on Showing, one status line shows at a time, and before you pick a city the demo shows a world clock instead of departures from Stockholm.'
      ],
      sv: [
        '**En lista med tavlor.** Dina spellistor, sedan varje tavla du gjort eller tagit från en mall, var och en ritad i sin egen form. Mina tavlor finns inte längre, eftersom allt ligger i Tavlor nu.',
        '**En tavla är samma tavla i varje spellista.** Ändrar du den i en syns ändringen i de andra, och tavlan säger vilka spellistor den finns i. Duplicera den om du vill ha en egen. Tar du bort en tavla tas den ur varje spellista, och raden säger vilka, med Ångra.',
        '**Varje tavla har sin egen storlek och sitt eget tema.** En spellista kan blanda en tavla i 6 × 22 med en i 12 × 40, och skärmen visar var och en i sin storlek när den kommer.',
        '**Ett tryck på en tavla visar den ensam.** På Visas förhandsvisar ett tryck på en tavla den ensam, och Visa på den här skärmen visar bara den. Visa en till tavla i tur gör en spellista av de två.',
        '**Hem i Konto.** Din stad, dina hållplatser och din valuta, som nya rutor börjar från. Med ett konto sparas det där, och en ny enhet erbjuder det du visade senast.',
        'Mindre ändringar: Skriv ditt eget meddelande finns alltid på Visas, en statusrad visas åt gången, och innan du valt stad visar demon en världsklocka i stället för avgångar från Stockholm.'
      ]
    }
  },
  {
    v: '0.10.0', date: '2026-09-30',
    tag: { en: 'Showing', sv: 'Visas' },
    desc: {
      en: 'People who had not built Split-Flap found the editor hard to follow. This release changes how it behaves: what you open is on the screen at once, and nothing changes what the screen runs until you press Show on this screen.',
      sv: 'Personer som inte byggt Split-Flap tyckte att redigeraren var svår att följa. Den här versionen ändrar hur den beter sig: det du öppnar syns på skärmen direkt, och inget ändrar vad skärmen visar förrän du trycker Visa på den här skärmen.'
    },
    items: {
      en: [
        '**Showing comes first.** Edit opens on this screen, with what it shows now, the board on now, and the ways to change it.',
        '**What you open, you see.** A playlist, a board in My boards or a template goes on the screen as soon as you open it, with a gold bar under it that says it is a preview. Leave without pressing and the screen goes back, and says so.',
        '**Storyboards are called playlists.** It is the word most people used for them anyway.',
        'Picking a city on a first visit ends the first visit, a template lands on its board instead of the week view, and a board\'s zones come first on its page.'
      ],
      sv: [
        '**Visas kommer först.** Redigera öppnar den här skärmen, med det den visar nu, tavlan som visas och sätten att ändra det.',
        '**Det du öppnar ser du.** En spellista, en tavla i Mina tavlor eller en mall syns på skärmen så fort du öppnar den, med en gyllene rad under som säger att det är en förhandsvisning. Går du därifrån utan att trycka går skärmen tillbaka, och säger det.',
        '**Storyboards heter spellistor.** Det var ordet de flesta använde ändå.',
        'Att välja en stad vid första besöket avslutar första besöket, en mall landar på sin tavla i stället för veckovyn, och en tavlas zoner kommer först på dess sida.'
      ]
    }
  },
  {
    v: '0.9.4', date: '2026-09-30',
    tag: { en: 'Fixes', sv: 'Rättningar' },
    desc: {
      en: 'I had a few people try Split-Flap and a full test round done. These are the fixes that do not need the new navigation, which comes next.',
      sv: 'Jag lät några personer testa Split-Flap och gjorde en hel testrunda. Det här är rättningarna som inte behöver den nya navigeringen, som kommer härnäst.'
    },
    items: {
      en: [
        '**Every press answers.** Lines like "Saved to My boards" were hidden while the editor was open, so it looked like nothing happened. They now show under the editor\'s title, with Undo where it applies.',
        '**A QR code you can scan.** The code under Share was too small for a phone to read. It now opens full size when the panel cannot draw it big enough, and the wall link comes first, in kiosk mode.',
        '**A screen that restarts offline keeps its board.** The last departures, weather and prices are kept in the browser, so a screen that comes back before the network shows them with a note saying how old they are.',
        '**A wall link asks nothing.** A screen opened from a board link no longer asks anyone to sign in.',
        'Smaller fixes: the yen and other small currencies are quoted per 100 instead of as 0.00, Electricity price is only offered in Sweden, the demo\'s ticker message fits, a mistyped editor address corrects itself, and the placeholders for features to come later are gone.'
      ],
      sv: [
        '**Allt du trycker på svarar.** Rader som "Sparad i Mina tavlor" doldes medan redigeraren var öppen, så det såg ut som att inget hände. Nu visas de under redigerarens rubrik, med Ångra där det går.',
        '**En QR-kod som går att skanna.** Koden under Dela var för liten för en mobil. Nu öppnas den i full storlek när panelen inte kan rita den stor nog, och länken för väggen kommer först, i kioskläge.',
        '**En skärm som startar om utan nät behåller sin tavla.** De senaste avgångarna, vädret och priserna sparas i webbläsaren, så en skärm som kommer tillbaka före nätet visar dem med en rad om hur gamla de är.',
        '**En länk till väggen frågar inget.** En skärm som öppnats från en tavellänk ber ingen att logga in längre.',
        'Mindre rättningar: yenen och andra små valutor visas per 100 i stället för som 0,00, Elpris erbjuds bara i Sverige, demons löptext får plats, en felskriven adress i redigeraren rättar sig själv, och platshållarna för sådant som kommer senare är borta.'
      ]
    }
  },
  {
    v: '0.9.3', date: '2026-09-30',
    tag: { en: 'Headlines', sv: 'Rubriker' },
    desc: {
      en: 'News and other feeds on the board, including on wall screens that never sign in.',
      sv: 'Nyheter och andra flöden på tavlan, även på väggskärmar som aldrig loggar in.'
    },
    items: {
      en: [
        '**Headlines.** A new tile shows the latest from a news site or any other RSS, Atom or JSON feed, one headline at a time under the feed\'s name. It works in a ticker row too.',
        '**Any feed, on any screen.** Most news sites do not let other pages read their feeds, so Split-Flap\'s server fetches them. BBC News, NASA and Hacker News work for everyone. Any other feed works once you have added it signed in, and a wall screen showing it can then read it without signing in.',
        'A new template, Headlines, in Home.'
      ],
      sv: [
        '**Rubriker.** En ny ruta visar det senaste från en nyhetssajt eller något annat RSS-, Atom- eller JSON-flöde, en rubrik i taget under flödets namn. Den fungerar i en löptextrad också.',
        '**Alla flöden, på alla skärmar.** De flesta nyhetssajter låter inte andra sidor läsa deras flöden, så Split-Flaps server hämtar dem. BBC News, NASA och Hacker News fungerar för alla. Andra flöden fungerar när du har lagt till dem inloggad, och en väggskärm som visar dem kan sedan läsa dem utan att logga in.',
        'En ny mall, Rubriker, under Hemma.'
      ]
    }
  },
  {
    v: '0.9.2', date: '2026-09-30',
    tag: { en: 'Your sources', sv: 'Dina källor' },
    desc: {
      en: 'Your own keys and sheets are kept with your account, and a new tile shows central banks\' interest rates.',
      sv: 'Dina egna nycklar och kalkylark sparas med ditt konto, och en ny ruta visar centralbankernas räntor.'
    },
    items: {
      en: [
        '**Your sources, with your account.** An Alpha Vantage key or a published sheet you add is kept with your account and reaches your other devices. On the server it is encrypted. Account lists them, and signing out removes them from that browser.',
        '**Interest rates.** A new tile shows the policy rate of the Riksbank, the ECB, the Bank of England or the Fed, with the date it last changed and a line over one or five years. A new template in Finance shows your own central bank and then all four.'
      ],
      sv: [
        '**Dina källor, med ditt konto.** En Alpha Vantage-nyckel eller ett publicerat kalkylark som du lägger till sparas med ditt konto och följer med till dina andra enheter. På servern är den krypterad. Konto listar dem, och när du loggar ut tas de bort från den webbläsaren.',
        '**Räntor.** En ny ruta visar styrräntan hos Riksbanken, ECB, Bank of England eller Fed, med datumet den senast ändrades och en linje över ett eller fem år. En ny mall under Ekonomi visar din egen centralbank och sedan alla fyra.'
      ]
    }
  },
  {
    v: '0.9.1', date: '2026-09-30',
    tag: { en: 'Sheets', sv: 'Kalkylark' },
    desc: {
      en: 'Your own Google Sheet can give the Markets tile its history.',
      sv: 'Ditt eget Google-kalkylark kan ge rutan Marknader dess historik.'
    },
    items: {
      en: [
        '**History from your sheet.** I thought a published sheet could not share price history, but it can. Add a row with the symbol, and under it GOOGLEFINANCE\'s closes, and the line starts from the first day instead of building up over weeks. The guide linked from the tile shows how.'
      ],
      sv: [
        '**Historik från ditt kalkylark.** Jag trodde att ett publicerat kalkylark inte kunde dela kurshistorik, men det kan det. Lägg till en rad med symbolen och under den GOOGLEFINANCE-funktionens stängningskurser, så börjar linjen från första dagen i stället för att byggas upp under veckor. Guiden som rutan länkar till visar hur.'
      ]
    }
  },
  {
    v: '0.9.0', date: '2026-09-30',
    tag: { en: 'Markets', sv: 'Marknader' },
    desc: {
      en: 'Shares, ETFs and crypto on the board, drawn as a line in a new kind of flap.',
      sv: 'Aktier, fonder och krypto på tavlan, ritade som en linje med en ny sorts flapp.'
    },
    items: {
      en: [
        '**Half flaps.** A flap can now be coloured on its top or bottom half only, so a line on the board has twice the height to move in.',
        '**Markets.** A new tile draws a share, an ETF or a coin as a line, green where it rises and red where it falls, with its price, the day\'s change, and whether its market is open in your own time.',
        '**Built in for London and New York.** Shares and ETFs there work with no setup, with each trading day\'s close. Swedish shares are priced through their London listings. Split-Flap was approved for Alpha Vantage\'s programme for open-source projects, which is what makes this possible.',
        '**Crypto with no setup.** Bitcoin, ether and a few other coins, from CoinGecko.',
        '**Your own source.** For anything not built in, such as Stockholm itself or your funds, use your own Alpha Vantage key or a Google Sheet. Both stay in this browser.',
        '**Explore in sections.** Templates are in sections with pages of their own, and Finance has Stocks, ETFs, Crypto and Currency. There are three new templates: Stocks, Index trackers and Crypto.',
        'A new storyboard is 12 × 40, since this is about screens. Storyboards you have keep their size.'
      ],
      sv: [
        '**Halva flappar.** En flapp kan nu vara färgad bara på övre eller undre halvan, så en linje på tavlan har dubbelt så mycket höjd att röra sig i.',
        '**Marknader.** En ny ruta ritar en aktie, en fond eller ett mynt som en linje, grön där den stiger och röd där den faller, med pris, dagens förändring och om marknaden är öppen i din egen tid.',
        '**Inbyggt för London och New York.** Aktier och fonder där fungerar utan att ställa in något, med varje handelsdags stängningskurs. Svenska aktier prissätts via sina noteringar i London. Split-Flap godkändes för Alpha Vantages program för projekt med öppen källkod, och det är det som gör det möjligt.',
        '**Krypto utan inställningar.** Bitcoin, ether och några andra mynt, från CoinGecko.',
        '**Din egen källa.** För allt som inte finns inbyggt, till exempel Stockholmsbörsen eller dina fonder, använd din egen Alpha Vantage-nyckel eller ett Google-kalkylark. Båda stannar i den här webbläsaren.',
        '**Utforska i sektioner.** Mallarna ligger i sektioner med egna sidor, och Ekonomi har Aktier, Fonder, Krypto och Valuta. Det finns tre nya mallar: Aktier, Indexfonder och Krypto.',
        'En ny storyboard är 12 × 40, eftersom det här handlar om skärmar. Storyboards du redan har behåller sin storlek.'
      ]
    }
  },
  {
    v: '0.8.0', date: '2026-09-29',
    tag: { en: 'Anywhere', sv: 'Var som helst' },
    desc: {
      en: 'Split-Flap was built around Stockholm. This release makes it work for a screen almost anywhere, starting from one city search.',
      sv: 'Split-Flap byggdes kring Stockholm. Den här versionen får den att fungera för en skärm nästan var som helst, med en sökning på staden som start.'
    },
    items: {
      en: [
        '**The place.** Search for your city in Display and new boards start from it: the weather, the nearest stop, the holidays, the currency, and 12 or 24 hours. A first visit asks where the screen is and builds the demo for it.',
        '**Departures, almost anywhere.** A new Departures tile finds the stop nearest your place and shows its next trains, buses and trams, from Transitous, which covers most of Europe and North America. Stockholm stops still come from SL.',
        '**Station board.** Departures can look like a railway station, with the time, the destination, the platform and on time, late or cancelled.',
        '**Names in any alphabet.** Łódź prints as LODZ and Москва as MOSKVA. Before, letters the flaps do not carry came out blank.',
        '**Holidays for your country.** Today shows the public holidays of the place\'s country, and Countdown can count to the next one. Sweden keeps its flag days.',
        '**World clock.** A new tile with the time in a few cities, marked +1 or -1 when a city is on another day.',
        '**Currency in your currency.** Any of about thirty currencies can be the base, and bitcoin and a few other coins can go on the list, with a green or red flap for their day.',
        '**Rain soon.** The weather says when rain starts or stops in the next two hours.',
        '**Explore by use.** Templates are grouped (home, commute, office, café, money and fun), built for your place, and there are three new ones: Morning, World clock wall and Currency board.',
        'Every live tile names its source under its options, and Help lists them all.'
      ],
      sv: [
        '**Platsen.** Sök efter din stad under Visning så utgår nya tavlor från den: vädret, närmaste hållplats, helgdagarna, valutan och 12 eller 24 timmar. Vid första besöket frågar appen var skärmen finns och bygger demon för platsen.',
        '**Avgångar, nästan var som helst.** En ny ruta, Avgångar, hittar hållplatsen närmast platsen och visar nästa tåg, bussar och spårvagnar, från Transitous, som täcker större delen av Europa och Nordamerika. Hållplatser i Stockholm kommer fortfarande från SL.',
        '**Stationstavla.** Avgångar kan se ut som på en järnvägsstation, med tid, destination, spår och i tid, sen eller inställd.',
        '**Namn i alla alfabet.** Łódź skrivs LODZ och Москва MOSKVA. Förut blev bokstäver som flapparna saknar tomma.',
        '**Helgdagar för ditt land.** Idag visar helgdagarna i platsens land, och Nedräkning kan räkna till nästa. Sverige behåller sina flaggdagar.',
        '**Världsklocka.** En ny ruta med tiden i några städer, märkt +1 eller -1 när en stad är på en annan dag.',
        '**Valuta i din valuta.** En av ett trettiotal valutor kan vara basen, och bitcoin och några andra mynt kan stå på listan, med en grön eller röd flapp för dygnet.',
        '**Regn snart.** Vädret säger när regn börjar eller slutar inom två timmar.',
        '**Utforska efter användning.** Mallarna är grupperade (hemma, pendling, kontor, kafé, pengar och lek), byggda för din plats, och det finns tre nya: Morgon, Världsklocka och Valutatavla.',
        'Varje liveruta anger sin källa under sina alternativ, och Hjälp listar alla.'
      ]
    }
  },
  {
    v: '0.7.3', date: '2026-09-28',
    tag: { en: 'Fixes', sv: 'Rättningar' },
    desc: {
      en: 'Fixes from a full test of the live site, across the editor, the content, accounts and the pages around it.',
      sv: 'Rättningar efter ett fullständigt test av webbplatsen, av redigeraren, innehållet, kontona och sidorna runt omkring.'
    },
    items: {
      en: [
        'If signing in did not finish, someone who had visited before got a browser error page in place of the message 0.7.2 added. They get the message now.',
        'On a phone, swiping through the week scrolls it. Before, a swipe could start a new time and jump the week back to midnight. A tap on an empty part of a day asks for a time there.',
        'The week keeps its place when something changes, and on a wide screen it opens at six in the morning.',
        'Departures and weather in a ticker row show their data. Before, the row showed only the station or the city, and other channels broke into pieces there.',
        'The demo weather board no longer cuts the wind unit in half.',
        'Keep the demo storyboard on a first visit opens the demo, where before it did nothing you could see.',
        'Share in a storyboard\'s ⋯ menu opens beside the editor on a wide screen, Escape closes an Import sheet even from its text box, and a double press of Save to my boards saves once.',
        'Swedish pages start Rotating messages and Menu in Swedish, a few hints use the new words, and small text is easier to read, in the light theme especially.'
      ],
      sv: [
        'Om inloggningen inte blev klar fick den som varit här förut en felsida från webbläsaren i stället för meddelandet från 0.7.2. Nu kommer meddelandet.',
        'På en telefon scrollar ett svep genom veckan. Förut kunde ett svep starta en ny tid och hoppa tillbaka till midnatt. Ett tryck på en tom del av en dag frågar efter en tid där.',
        'Veckan behåller sin plats när något ändras, och på en bred skärm öppnas den klockan sex på morgonen.',
        'Avgångar och väder i en löptextrad visar sin data. Förut visade raden bara stationen eller staden, och andra kanaler föll isär där.',
        'Demons vädertavla klipper inte längre vindens enhet på mitten.',
        'Behåll demostoryboarden vid första besöket öppnar demon, där den förut inte gjorde något du kunde se.',
        'Dela i en storyboards ⋯-meny öppnas bredvid redigeraren på en bred skärm, Escape stänger Importera även från textrutan, och två snabba tryck på Spara i mina tavlor sparar en gång.',
        'Svenska sidor börjar Växlande meddelanden och Meny på svenska, några tips använder de nya orden, och liten text är lättare att läsa, särskilt i det ljusa temat.'
      ]
    }
  },
  {
    v: '0.7.2', date: '2026-09-28',
    tag: { en: 'Fixes', sv: 'Rättningar' },
    desc: {
      en: 'Three fixes from using 0.7.1 on a computer and a phone together.',
      sv: 'Tre rättningar efter att ha använt 0.7.1 på en dator och en telefon samtidigt.'
    },
    items: {
      en: [
        'If signing in with Google does not finish, for example when a phone opens Google in another app, you come back to Split-Flap with a message saying so. Before, it stopped on a bare error page that said Mismatch.',
        'On a new device, the demo made for a first visit no longer stays behind after you sign in. It goes if your account already has storyboards, and joins your account if it is empty.',
        'The editor no longer redraws when a sync finds nothing new, so a menu you have open stays still while you use it.'
      ],
      sv: [
        'Om inloggningen med Google inte blir klar, till exempel när en telefon öppnar Google i en annan app, kommer du tillbaka till Split-Flap med ett meddelande om det. Förut stannade den på en tom felsida där det stod Mismatch.',
        'På en ny enhet ligger inte längre demon som gjordes vid första besöket kvar efter att du loggat in. Den försvinner om ditt konto redan har storyboards, och läggs i kontot om det är tomt.',
        'Redigeraren ritas inte längre om när en synk inte hittar något nytt, så en meny du har öppen står still medan du använder den.'
      ]
    }
  },
  {
    v: '0.7.1', date: '2026-09-28',
    tag: { en: 'My boards', sv: 'Mina tavlor' },
    desc: {
      en: 'My boards, the fourth section, for boards you want to use again.',
      sv: 'Mina tavlor, den fjärde sektionen, för tavlor du vill använda igen.'
    },
    items: {
      en: [
        'Save to my boards keeps a copy of any board, from a storyboard or a template. It is the first button on every board, and it is in the ⋯ menu too.',
        "+ Add a board on a storyboard can now take a board from My boards or from a template, and shows the copy on the big board at that storyboard's size before you add it. If flaps you typed or painted would be cut at the new size, it says how many first.",
        'A copy stands on its own, so changing it, or the one in My boards, leaves the other as it was.',
        'My boards can import a board file or a pasted Vestaboard message, one line per row, shown on the big board as you type.',
        'Guests get My boards too, kept in the browser. With an account they sync like storyboards, and the first sign-in asks about them board by board, beside your storyboards.',
        'Each board keeps its own colour in the week now, so moving boards around no longer changes their colours.',
        'The version line is back at the foot of Storyboards, one tap from this log. In 0.7.0 the log was only under Account.'
      ],
      sv: [
        'Spara i mina tavlor behåller en kopia av vilken tavla som helst, från en storyboard eller en mall. Det är den första knappen på varje tavla, och finns också i ⋯-menyn.',
        '+ Lägg till en tavla på en storyboard kan nu ta en tavla från Mina tavlor eller från en mall, och visar kopian på den stora tavlan i storyboardens storlek innan du lägger till den. Om flappar du skrivit eller målat skulle klippas bort i den nya storleken säger den hur många först.',
        'En kopia står för sig själv, så om du ändrar den, eller den i Mina tavlor, är den andra som förut.',
        'Mina tavlor kan importera en tavelfil eller ett inklistrat Vestaboard-meddelande, en rad per rad, som visas på den stora tavlan medan du skriver.',
        'Gäster får också Mina tavlor, sparade i webbläsaren. Med ett konto synkas de som storyboards, och första inloggningen frågar om dem tavla för tavla, bredvid dina storyboards.',
        'Varje tavla behåller nu sin egen färg i veckan, så att flytta runt tavlor ändrar inte längre deras färger.',
        'Versionsraden är tillbaka längst ned under Storyboards, ett tryck från den här loggen. I 0.7.0 fanns loggen bara under Konto.'
      ]
    }
  },
  {
    v: '0.7.0', date: '2026-09-28',
    tag: { en: 'Structure', sv: 'Struktur' },
    desc: {
      en: 'A new structure for the editor, planned with Fable and Claude Design so there is room to grow. Nothing you made has changed, only where things are and what they are called.',
      sv: 'En ny struktur för redigeraren, planerad med Fable och Claude Design så att det finns plats att växa. Inget du har gjort har ändrats, bara var saker finns och vad de heter.'
    },
    items: {
      en: [
        'What was a board is now a storyboard, and what was a page is now a board. A storyboard is what a screen plays, its boards in order and when each one shows.',
        'The editor has its sections along the top: Storyboards, Explore for the templates, and Account, which now holds Help and the version log. They are the same on a phone and on a wide screen.',
        "Week is a storyboard's main view, with every board's times as blocks. Drag down a day to give a board a time, and drag a block to move it or change how long it runs. Before, the times sat at the bottom of each page, where they were easy to miss.",
        "Today's playlist shows what the storyboard plays today, worked out from the times. It sits beside the week, and in one line on the wall while the controls show.",
        "Every level has its own address, so the browser's back button and the back gesture on a phone go up one level, and a reload lands in the same place.",
        'Each storyboard and board has one ⋯ menu with the same actions in the same order, and Delete asks twice.',
        "A board's content is chosen in place, under its zone, so a board is never more than two levels deep."
      ],
      sv: [
        'Det som var en tavla är nu en storyboard, och det som var en sida är nu en tavla. En storyboard är det en skärm spelar, dess tavlor i ordning och när var och en visas.',
        'Redigeraren har sina sektioner längst upp: Storyboards, Utforska för mallarna, och Konto, som nu också har Hjälp och versionsloggen. De är likadana på en telefon och på en bred skärm.',
        'Vecka är storyboardens huvudvy, med varje tavlas tider som block. Dra nedåt i en dag för att ge en tavla en tid, och dra ett block för att flytta det eller ändra hur länge det pågår. Förut låg tiderna längst ned på varje sida, där de var lätta att missa.',
        'Dagens spellista visar vad storyboarden spelar idag, uträknat från tiderna. Den ligger bredvid veckan, och på en rad på väggen medan kontrollerna syns.',
        'Varje nivå har en egen adress, så webbläsarens bakåtknapp och bakåtgesten på en telefon går upp en nivå, och en omladdning hamnar på samma ställe.',
        'Varje storyboard och tavla har en ⋯-meny med samma val i samma ordning, och Radera frågar två gånger.',
        'En tavlas innehåll väljs på plats, under dess zon, så en tavla ligger aldrig mer än två nivåer ned.'
      ]
    }
  },
  {
    v: '0.6.4', date: '2026-09-28',
    tag: { en: 'Fixes', sv: 'Rättningar' },
    desc: {
      en: 'Two fixes from the review of 0.6.3, one of them to boards being lost as a guest.',
      sv: 'Två rättningar från granskningen av 0.6.3, varav en för tavlor som kunde försvinna för en gäst.'
    },
    items: {
      en: [
        'With Split-Flap open in two tabs, a change in one tab could save its older list of boards over the other, so a board made in the other tab was lost. Signed in it came back from your account, but as a guest it was gone. Now each tab picks up what the other saved before it saves again.',
        'After your first sign-in, if you deleted one of the boards you had kept before it reached the server, the message saying how many are in your account never came. It comes now, and counts only the boards that arrived.',
        'Delete page is red like the other delete buttons, and Help no longer says nothing leaves the browser, which has not been true with an account since 0.5.'
      ],
      sv: [
        'Med Split-Flap öppet i två flikar kunde en ändring i den ena fliken spara dess äldre lista med tavlor över den andra, så att en tavla som gjorts i den andra fliken försvann. Inloggad kom den tillbaka från ditt konto, men som gäst var den borta. Nu tar varje flik in det den andra har sparat innan den sparar igen.',
        'Om du efter första inloggningen raderade en av tavlorna du behöll innan den hade nått servern, kom aldrig meddelandet om hur många som finns i ditt konto. Det kommer nu, och räknar bara tavlorna som kom fram.',
        'Ta bort sida är röd som de andra raderingsknapparna, och Hjälp säger inte längre att inget lämnar webbläsaren, vilket inte har stämt med ett konto sedan 0.5.'
      ]
    }
  },
  {
    v: '0.6.3', date: '2026-09-28',
    tag: { en: 'Accounts', sv: 'Konton' },
    desc: {
      en: 'Making an account after using Split-Flap as a guest, with nothing lost on the way.',
      sv: 'Att skaffa ett konto efter att ha använt Split-Flap som gäst, utan att något försvinner på vägen.'
    },
    items: {
      en: [
        'The first time you sign in, the question about your guest boards stays until you answer it. Before, closing the tab while it showed skipped it, and the boards went into your account without asking.',
        'You choose board by board what goes to your account. The rest stay in this browser as they are.',
        'The app keeps a copy of your guest boards until the server has every one you kept, then tells you how many are now in your account.',
        'As a guest, once you have made a second board, the app suggests signing in once, and asks the browser not to clear your boards on its own. Dismiss it and it does not come back.'
      ],
      sv: [
        'Första gången du loggar in ligger frågan om dina gästtavlor kvar tills du har svarat. Förut försvann den om du stängde fliken medan den visades, och tavlorna gick till ditt konto utan att du blev tillfrågad.',
        'Du väljer tavla för tavla vad som går till ditt konto. Resten ligger kvar i den här webbläsaren som de är.',
        'Appen sparar en kopia av dina gästtavlor tills servern har alla du valde att behålla, och säger sedan hur många som nu finns i ditt konto.',
        'Som gäst föreslår appen en gång att du loggar in när du har gjort en andra tavla, och ber webbläsaren att inte rensa dina tavlor av sig själv. Stänger du förslaget kommer det inte tillbaka.'
      ]
    }
  },
  {
    v: '0.6.2', date: '2026-09-28',
    tag: { en: 'Fix', sv: 'Rättning' },
    desc: {
      en: 'A sync bug that could delete boards from your account. It deleted most of mine, and it is fixed here.',
      sv: 'En synkbugg som kunde radera tavlor ur ditt konto. Den raderade de flesta av mina, och den är rättad här.'
    },
    items: {
      en: [
        'If a browser was missing some of your account boards, because another tab had saved an older list for example, the next change you made there deleted those boards from your account. Now a board only leaves your account when you delete it, and a board missing from a browser comes back from the account instead.',
        'Delete in the list of boards looked greyed out, like Delete account did. It is red now too.'
      ],
      sv: [
        'Om en webbläsare saknade några av dina kontotavlor, till exempel för att en annan flik hade sparat en äldre lista, raderade nästa ändring du gjorde där de tavlorna ur ditt konto. Nu lämnar en tavla ditt konto bara när du raderar den, och en tavla som saknas i en webbläsare kommer tillbaka från kontot i stället.',
        'Radera i listan över tavlor såg gråmarkerad ut, precis som Radera kontot gjorde. Den är också röd nu.'
      ]
    }
  },
  {
    v: '0.6.1', date: '2026-09-28',
    tag: { en: 'Fixes', sv: 'Rättningar' },
    desc: {
      en: 'Three changes from using 0.6.0, one of them a sync fix.',
      sv: 'Tre ändringar efter att ha använt 0.6.0, varav en rättar synken.'
    },
    items: {
      en: [
        'A board made while the app could not reach your account, during a server update say, stayed in that browser only, even once the account was back. It goes to your account now, and the app asks the server again when you are back online or after half a minute.',
        'Language has moved from the control bar and Board settings to Account, since it is yours and applies to every board. A page keeps its own language the first time you open it, and once you pick one it is remembered.',
        'Delete account looked greyed out, as if it did not work. It is red now.'
      ],
      sv: [
        'En tavla som gjordes medan appen inte nådde ditt konto, till exempel under en uppdatering av servern, fanns bara kvar i den webbläsaren, även när kontot var tillbaka. Den går till ditt konto nu, och appen frågar servern igen när du är online igen eller efter en halv minut.',
        'Språk har flyttat från kontrollraden och Tavlans inställningar till Konto, eftersom det är ditt och gäller alla tavlor. En sida behåller sitt eget språk första gången du öppnar den, och när du har valt ett kommer appen ihåg det.',
        'Radera kontot såg gråmarkerad ut, som om den inte fungerade. Den är röd nu.'
      ]
    }
  },
  {
    v: '0.6.0', date: '2026-09-27',
    tag: { en: 'Groundwork', sv: 'Grundarbete' },
    desc: {
      en: 'Groundwork before wall screens can follow an account. Most of it is behind the scenes, but some of it you will notice.',
      sv: 'Grundarbete innan skärmar på väggen kan följa ett konto. Det mesta sker bakom kulisserna, men en del märker du.'
    },
    items: {
      en: [
        'With a screen reader on, the board reads a page out when you open it, switch board or close the editor, and whenever you press R. Pages that rotate by themselves are not read out. Before, a clock or departures page was read out every minute, so it never stopped talking.',
        'The editor, the board menu and Share work with the keyboard alone. Focus moves into each one when it opens and goes back to its button when it closes.',
        'When a sync has made a copy of a board, the board menu shows when each board last changed, so you can tell which one is newer.',
        'If I have to restore the accounts database to an earlier point, a board you changed after that point goes back up from your browser. Before, the older copy from the server replaced it.',
        'The tests run on every change to the code, and the server logs requests that fail, with nothing about you or your boards in the log.'
      ],
      sv: [
        'Med en skärmläsare på läser tavlan upp en sida när du öppnar den, byter tavla eller stänger redigeraren, och varje gång du trycker R. Sidor som byts av sig själva läses inte upp. Förut lästes en klocka eller avgångar upp varje minut, så den slutade aldrig prata.',
        'Redigeraren, tavelmenyn och Dela går att använda med bara tangentbordet. Fokus flyttas in när de öppnas och tillbaka till knappen när de stängs.',
        'När en synk har gjort en kopia av en tavla visar tavelmenyn när varje tavla ändrades senast, så du ser vilken som är nyast.',
        'Om jag måste återställa kontodatabasen till en tidigare tidpunkt, skickas en tavla du ändrade efter den tidpunkten upp igen från din webbläsare. Förut ersatte den äldre kopian från servern den.',
        'Testerna körs vid varje ändring av koden, och servern loggar förfrågningar som misslyckas, utan något om dig eller dina tavlor i loggen.'
      ]
    }
  },
  {
    v: '0.5.3', date: '2026-09-27',
    tag: { en: 'Fixes', sv: 'Rättningar' },
    desc: {
      en: 'Three small things left over from the 0.5.2 review.',
      sv: 'Tre små saker som blev kvar efter granskningen av 0.5.2.'
    },
    items: {
      en: [
        'When your account holds the most boards it can and you delete one, a board that was kept here only goes to the account on its own. Before, it waited until you changed it.',
        'If the server asks the app to slow down, it tries again after a minute. Before, it waited for your next change.',
        'On a phone, the bar says Sign in with a ! when your session has run out, so it stays on two rows.'
      ],
      sv: [
        'När ditt konto har så många tavlor det kan ha och du raderar en, går en tavla som bara fanns här till kontot av sig själv. Förut väntade den tills du ändrade den.',
        'Om servern ber appen att sakta ner försöker den igen efter en minut. Förut väntade den på din nästa ändring.',
        'På en telefon säger raden Logga in med ett ! när din inloggning har gått ut, så den håller sig på två rader.'
      ]
    }
  },
  {
    v: '0.5.2', date: '2026-09-27',
    tag: { en: 'Fixes', sv: 'Rättningar' },
    desc: {
      en: 'I had the account sync reviewed and it found ways to lose changes. All of them are fixed here, with a few smaller ones.',
      sv: 'Jag lät granska kontosynken och den hittade sätt att tappa ändringar. Alla är rättade här, tillsammans med några mindre saker.'
    },
    items: {
      en: [
        'Signing out while a change had not reached your account yet, when offline say, took that board out of the browser and the change was lost. Sign out now tells you how many boards are not synced yet, and if you sign out anyway they stay here as guest boards.',
        'If your session ran out, changes made after that were not marked, so signing in again could replace them with the copy in your account. Now the bar says Sign in to sync and the changes are kept. If the board also changed on another device, you get both versions, one of them as a copy.',
        'A board the account could not take, the 51st say, stopped every board after it from syncing, and the app only said the sync had failed. Each board syncs on its own now, and the account panel names a refused board and says why.',
        'Deleting a new board before it had synced could leave the status on Waiting to sync for good. Fixed, the status clears.',
        'The bar shows a ! next to your name when a sync has failed, so you can see it with the editor closed.',
        'If a guest board here clashes with one in your account when you sign in, it is kept as a copy and you are asked before it goes into the account.',
        'Export everything is called Export my account now, since the guest boards in this browser are not in the file. The privacy page also mentions the sign-in cookie.',
        'If deleting the account fails, the message says it failed. Before, it always asked you to sign in again.',
        'The warnings for signing out and deleting the account sit below the button, so they are easy to read on a phone.'
      ],
      sv: [
        'Om du loggade ut medan en ändring inte hade nått ditt konto än, till exempel utan nät, togs tavlan bort från webbläsaren och ändringen försvann. Logga ut säger nu hur många tavlor som inte är synkade än, och loggar du ut ändå finns de kvar här som gästtavlor.',
        'Om din inloggning gick ut märktes ändringar gjorda efter det inte, så när du loggade in igen kunde kopian i ditt konto ersätta dem. Nu säger raden Logga in för att synka och ändringarna finns kvar. Om tavlan också ändrades på en annan enhet får du båda versionerna, den ena som kopia.',
        'En tavla som kontot inte kunde ta emot, den 51:a till exempel, stoppade alla tavlor efter den från att synkas, och appen sa bara att synken misslyckades. Varje tavla synkas för sig nu, och kontopanelen visar vilken tavla som nekades och varför.',
        'Om du raderade en ny tavla innan den hade synkats kunde statusen fastna på Väntar på att synka. Rättat, statusen försvinner.',
        'Raden visar ett ! bredvid ditt namn när en synk har misslyckats, så du ser det även när redigeraren är stängd.',
        'Om en gästtavla här krockar med en i ditt konto när du loggar in, sparas den som kopia och du får frågan innan den läggs i kontot.',
        'Exportera allt heter Exportera mitt konto nu, eftersom gästtavlorna i den här webbläsaren inte finns med i filen. Integritetssidan nämner också inloggningscookien.',
        'Om det inte går att radera kontot säger meddelandet att det misslyckades. Förut bad det dig alltid logga in igen.',
        'Varningarna när du loggar ut och raderar kontot ligger under knappen, så de är lätta att läsa på en telefon.'
      ]
    }
  },
  {
    v: '0.5.1', date: '2026-09-27',
    tag: { en: 'Fixes', sv: 'Rättningar' },
    desc: {
      en: 'A fix for the editor, and two things that were hard to find.',
      sv: 'En rättning av redigeraren, och två saker som var svåra att hitta.'
    },
    items: {
      en: [
        'Typing a name while signed in could leave a stale copy of the editor on screen, so Done seemed to open a second one. Fixed, the editor closes on Done.',
        'Sign in is in the control bar now, so the account is easy to find. Once you are signed in, the bar shows your first name.',
        'A board can be renamed where its name is shown: press the name at the top of the page list, or Rename in the board menu. Enter saves and Escape keeps the old name.'
      ],
      sv: [
        'Om du skrev ett namn medan du var inloggad kunde en gammal kopia av redigeraren ligga kvar på skärmen, så att Klar verkade öppna en till. Rättat, redigeraren stängs när du trycker Klar.',
        'Logga in finns i kontrollraden nu, så kontot är lätt att hitta. När du är inloggad visar raden ditt förnamn.',
        'En tavla kan byta namn där namnet visas: tryck på namnet högst upp i sidlistan, eller Byt namn i tavelmenyn. Enter sparar och Escape behåller det gamla namnet.'
      ]
    }
  },
  {
    v: '0.5', date: '2026-09-27',
    tag: { en: 'Accounts', sv: 'Konton' },
    desc: {
      en: 'Optional accounts. Sign in with Google and your boards come with you, and Split-Flap still needs no account.',
      sv: 'Konton, om du vill. Logga in med Google så följer dina tavlor med, och Split-Flap kräver fortfarande inget konto.'
    },
    items: {
      en: [
        'You can sign in with Google now, under Account at the foot of the page list. Your boards are kept with the account and come back on any phone or computer you sign in on.',
        'It is optional. As a guest everything works as before, and the Account and Start panels say that a guest\'s boards live only in this browser.',
        'This browser stays the working copy, so a board runs offline and a wall screen never waits on the server. Wall screens keep using board links and never sign in.',
        'If a board changed in two places before they synced, both versions are kept, the second with (copy) after its name.',
        'The first time you sign in, boards made as a guest are offered up to the account. Signing out takes the account\'s boards out of that browser, so the next person on a shared computer does not see them.',
        'Split-Flap has its own privacy page. The account keeps your Google account id, name, email and boards, in the EU, and nothing else. Export everything and Delete account are in the editor.'
      ],
      sv: [
        'Du kan logga in med Google nu, under Konto längst ned i sidlistan. Dina tavlor sparas med kontot och finns kvar på alla telefoner och datorer där du loggar in.',
        'Det är frivilligt. Som gäst fungerar allt som förut, och panelerna Konto och Start säger att en gästs tavlor bara finns i den här webbläsaren.',
        'Webbläsaren är fortfarande arbetskopian, så en tavla går utan nät och en väggskärm väntar aldrig på servern. Väggskärmar använder tavellänkar som förut och loggar aldrig in.',
        'Om en tavla ändrats på två ställen innan de hunnit synka sparas båda versionerna, den andra med (kopia) efter namnet.',
        'Första gången du loggar in erbjuds tavlor du gjort som gäst att följa med till kontot. När du loggar ut tas kontots tavlor bort från den webbläsaren, så att nästa person på en delad dator inte ser dem.',
        'Split-Flap har en egen integritetssida. Kontot sparar ditt Google-konto-id, namn, e-post och dina tavlor, i EU, och inget annat. Exportera allt och Radera kontot finns i redigeraren.'
      ]
    }
  },
  {
    v: '0.4.1', date: '2026-09-27',
    tag: { en: 'Fixes', sv: 'Rättningar' },
    desc: {
      en: 'Two fixes to 0.4, found in a review.',
      sv: 'Två rättningar av 0.4, som hittades vid en genomgång.'
    },
    items: {
      en: [
        'On the Letter clock, a letter that lit up while its flap was still turning spun the drum round to itself, with sound. It fades in place now, whatever the flap is doing.',
        'A wall screen reloads once for each new version. If a browser cache brings the old version back, it does not try again until the next release.'
      ],
      sv: [
        'På bokstavsklockan snurrade en bokstav som tändes medan bladet fortfarande vände trumman runt till sig själv, med ljud. Nu tonar den på plats, vad bladet än gör.',
        'En väggskärm laddar om en gång för varje ny version. Om webbläsarens cache ger tillbaka den gamla versionen försöker den inte igen förrän nästa version.'
      ]
    }
  },
  {
    v: '0.4', date: '2026-09-27',
    tag: { en: 'Letter clock', sv: 'Bokstavsklocka' },
    desc: {
      en: 'A letter clock, like the designer word clocks where only the words for the time light up.',
      sv: 'En bokstavsklocka, som designklockorna där bara orden för tiden lyser.'
    },
    items: {
      en: [
        'The Letter clock is a grid of letters where the words for the time light up and the rest stay faint, in five minute steps. A dot in a corner lights for each minute in between.',
        'It follows the board language, with a grid of its own in English and Swedish. On the hour the Swedish one says KLOCKAN ÄR PRECIS.',
        'When the time moves on, the letters fade up and down in place.',
        'The Letter clock template sets up a square board for it, with quiet hours overnight. As a tile in the picker it needs a zone of 9 × 13, and anything smaller spells the time out like the Word clock.'
      ],
      sv: [
        'Bokstavsklockan är ett rutnät av bokstäver där orden för tiden lyser och resten är svaga, i steg om fem minuter. En prick i ett hörn tänds för varje minut däremellan.',
        'Den följer tavlans språk, med ett eget rutnät på engelska och svenska. Vid hel timme säger den svenska KLOCKAN ÄR PRECIS.',
        'När tiden går vidare tonar bokstäverna upp och ned på plats.',
        'Mallen Bokstavsklocka ställer in en kvadratisk tavla för den, med tysta timmar på natten. Som ruta i väljaren behöver den en zon på 9 × 13, och i något mindre skrivs tiden ut som i Ordklockan.'
      ]
    }
  },
  {
    v: '0.3', date: '2026-09-27',
    tag: { en: 'Planning the week, part one', sv: 'Planera veckan, del ett' },
    desc: {
      en: 'This one is about when pages show. There is also a heart flap and a few things for wall screens.',
      sv: 'Den här handlar om när sidor visas. Det finns också ett hjärtblad och några saker för väggskärmar.'
    },
    items: {
      en: [
        'A page can have several times now, for example weekday mornings and Saturday mid-morning, without a second copy of the page.',
        'A time can be a date instead of days of the week, once or every year, so a birthday page shows on the day.',
        'Show alone gives a page its time to itself. While it is on, pages without a time of their own wait until it ends. I added it for the train times in the morning.',
        'A page can pick its own transition, so one page can come in as a curtain while the rest use the board’s.',
        'There is a heart flap, like the one on the Vestaboard Note. A heart typed on a phone lands on it.',
        'Each flap is panned by its column, so with headphones or two speakers a wave moves across the room.',
        'Every flap can roll once when the board starts, like a Solari board powering up, and again on the hour if you want. Both are under Board settings.',
        'Adding ?bg=transparent to the link draws the board on nothing, for OBS and other overlays.',
        'A wall screen now looks for a new version by itself and reloads in quiet hours or at 04:00. A screen on the previous version needs one reload by hand first.',
        'A menu line or SL destination that is too long now loses its last word, and a long single word is cut at the letter as before. The Café menu fits its board as well.',
        'The picker shows two tiles a row on a 6 × 22 board. It had dropped to one, which made it a long scroll.'
      ],
      sv: [
        'En sida kan ha flera tider nu, till exempel vardagsmorgnar och lördag förmiddag, utan en kopia av sidan.',
        'En tid kan vara ett datum i stället för veckodagar, en gång eller varje år, så att en födelsedagssida visas på dagen.',
        'Visa ensam ger en sida sin tid för sig själv. Medan den pågår väntar sidor utan egen tid tills den är slut. Jag lade till det för tågtiderna på morgonen.',
        'En sida kan välja sin egen övergång, så att en sida kommer in som en ridå medan resten använder tavlans.',
        'Det finns ett hjärtblad, som det på Vestaboard Note. Ett hjärta skrivet på en mobil hamnar på det.',
        'Varje blad panoreras efter sin kolumn, så med hörlurar eller två högtalare rör sig en våg genom rummet.',
        'Alla blad kan rulla ett varv när tavlan startar, som en Solari-tavla som slås på, och igen varje hel timme om du vill. Båda finns under Tavlans inställningar.',
        'Lägger du till ?bg=transparent i länken ritas tavlan utan bakgrund, för OBS och andra överlägg.',
        'En väggskärm letar nu själv efter en ny version och laddar om under tysta timmar eller klockan 04:00. En skärm med förra versionen behöver laddas om för hand en gång först.',
        'En menyrad eller SL-destination som är för lång tappar nu sitt sista ord, och ett långt enskilt ord kapas vid bokstaven som förut. Kaféets meny ryms på sin tavla också.',
        'Väljaren visar två rutor per rad på en 6 × 22-tavla. Den hade fallit tillbaka till en, vilket gav en lång lista att scrolla.'
      ]
    }
  },
  {
    v: '0.2', date: '2026-09-27',
    tag: { en: 'New editor', sv: 'Ny redigerare' },
    desc: {
      en: 'A new editor, eight new channels and a guide. Boards made in 0.1 open as they were.',
      sv: 'En ny redigerare, åtta nya kanaler och en guide. Tavlor från 0.1 öppnas som de var.'
    },
    items: {
      en: [
        'The editor is built around a content picker. Each kind of content is a tile drawn as a small board in the shape of the zone you are filling, so you see what it looks like before you pick it.',
        'On a wide screen the list of pages stays beside the editor with a thumbnail of each page. Drag a page to reorder it, or use the arrow keys on its handle. On a phone it goes one step at a time with the board above.',
        'A page shows its zones on a diagram, and the zone you are editing is outlined on the big board. There are five layouts now, including a stacked one for portrait screens.',
        'Messages are made on the grid in one of three modes. Type works as before, Paint drags colour flaps across the grid, and Photo turns a picture into colour flaps in the browser. The photo is not uploaded, only the flaps are saved.',
        'Undo and redo work in the message editor, and a message you change is kept under Earlier messages in case you want it back.',
        'Eight new channels: rotating messages, menus, a word clock, Today, electricity prices, exchange rates, On this day and Follow a URL.',
        'Today shows the date, the week number, Swedish red days and flag days, and sunrise and sunset for the board location. It is all worked out on the device, so it keeps going offline.',
        'Electricity prices are the spot price for your price area from elprisetjustnu.se, with the coming hours as coloured flaps. The market prices in quarter hours now, so each hour is the average of its four.',
        'Follow a URL prints lines from any web address that allows other sites to read it, a GitHub Gist or a published Google Sheet for example. You write a line template and the editor shows what the board will print.',
        'A countdown can count up from a date as well, for days since something.',
        'An SL zone can show up to six stations, and departures sooner than your walk to the stop can be hidden.',
        'Nine templates now, shown the first time you edit. Café has a menu with prices, and Office lobby takes turns between a welcome and a few notices.',
        'Save as image downloads the page as a picture.',
        'Help sits at the foot of the page list with a short guide to how the board works. The grid size was hard to find in Board settings, so every page links to it as well.'
      ],
      sv: [
        'Redigeraren är byggd kring en innehållsväljare. Varje sorts innehåll är en ruta som ritas som en liten tavla i samma form som zonen du fyller, så att du ser hur det blir innan du väljer.',
        'På en bred skärm står listan med sidor kvar bredvid redigeraren, med en miniatyr av varje sida. Dra en sida för att flytta den, eller använd piltangenterna på handtaget. På en mobil går det ett steg i taget med tavlan ovanför.',
        'En sida visar sina zoner på en skiss, och zonen du redigerar ramas in på den stora tavlan. Det finns fem layouter nu, bland dem en staplad för stående skärmar.',
        'Meddelanden görs på rutnätet i ett av tre lägen. Skriv fungerar som förut, Måla drar färgblad över rutnätet och Foto gör om en bild till färgblad i webbläsaren. Fotot laddas inte upp, bara bladen sparas.',
        'Ångra och gör om fungerar i meddelanderedigeraren, och ett meddelande du ändrar sparas under Tidigare meddelanden ifall du vill ha tillbaka det.',
        'Åtta nya kanaler: växlande meddelanden, menyer, en ordklocka, Idag, elpriser, växelkurser, Den här dagen och Följ en URL.',
        'Idag visar datum, veckonummer, röda dagar och flaggdagar och soluppgång och solnedgång för tavlans plats. Allt räknas ut på enheten, så det fungerar utan nät.',
        'Elpriser är spotpriset för ditt elområde från elprisetjustnu.se, med de kommande timmarna som färgade blad. Marknaden sätter priser per kvart nu, så varje timme är snittet av sina fyra.',
        'Följ en URL skriver ut rader från vilken webbadress som helst som låter andra webbplatser läsa den, till exempel en GitHub Gist eller ett publicerat Google-kalkylark. Du skriver en radmall och redigeraren visar vad tavlan kommer att skriva.',
        'En nedräkning kan också räkna upp från ett datum, för dagar sedan något hände.',
        'En SL-zon kan visa upp till sex stationer, och avgångar som går innan du hinner gå till hållplatsen kan döljas.',
        'Nio mallar nu, som visas första gången du redigerar. Kafé har en meny med priser, och Kontorsentré turas om mellan ett välkommen och några meddelanden.',
        'Spara som bild laddar ned sidan som en bild.',
        'Hjälp finns längst ned i sidlistan med en kort guide till hur tavlan fungerar. Storleken på rutnätet var svår att hitta i Tavlans inställningar, så varje sida länkar också dit.'
      ]
    }
  },
  {
    v: '0.1', date: '2026-09-27',
    tag: { en: 'First version', sv: 'Första versionen' },
    desc: {
      en: 'Everything from the first day of work. A split-flap board for any screen, now live on maclaine.se.',
      sv: 'Allt från första arbetsdagen. En fällbladstavla för vilken skärm som helst, nu live på maclaine.se.'
    },
    items: {
      en: [
        'The board is drawn on one canvas so a Raspberry Pi keeps up. Each flap steps through the drum to its letter, folds over the hinge and settles with a small bounce. There are three themes, Vestaboard Black, Vestaboard White and Solari Amber.',
        'Å Ä Ö Æ Ø Ü É each have their own flap.',
        'Channels so far are messages, clock, big clock, big text, countdown, SL departures, weather, colour patterns and quotes. Messages are typed straight onto the grid so you see where each letter lands.',
        'SL departures work for any SL stop. If you have starred a home station on my Stockholm SL map, a board can follow it. Station search forgives spelling, so "vestra skogen" finds Västra skogen.',
        'SL refuses requests now and then. A refused request is retried within a few seconds and the board only says no data after four failures in a row. Västra skogen had shown no data on the first refusal.',
        'Departure times can be minutes away, clock time in 24 h or 12 h, or alternate between the two.',
        'Weather comes from Open-Meteo in three views. Now shows feels like, wind, rain and sunrise and sunset. The other two are the next hours and three days ahead. Colour chips stand in for icons.',
        'Seven templates to start from, including Everything at once, which fills the screen and rolls every flap the full way round.',
        'Pages run on a playlist with a timer each, optional day and time windows, and quiet hours that dim or blank the board overnight.',
        'Four transitions and three speeds. Picking one plays it on the board. Authentic turns every flap the whole way round like the hardware does.',
        'Four flap sounds, Clack, Heavy, Soft and Tick, with a volume slider. They are synthesised, so there is nothing to download.',
        'Share gives a link or a QR (Quick Response) code that carries the whole board to another screen, with a kiosk version that hides the controls. Nothing is stored on a server.',
        'For a wall screen it keeps the display awake, shifts one pixel every few minutes against burn-in, keeps running offline and says when live data is getting old.',
        'This version log sits at the foot of the editor.'
      ],
      sv: [
        'Tavlan ritas på en enda canvas så att en Raspberry Pi hänger med. Varje blad stegar genom trumman till sin bokstav, fäller över gångjärnet och landar med en liten studs. Det finns tre teman, Vestaboard Black, Vestaboard White och Solari Amber.',
        'Å Ä Ö Æ Ø Ü É har varsitt eget blad.',
        'Kanalerna hittills är meddelanden, klocka, stor klocka, stor text, nedräkning, SL-avgångar, väder, färgmönster och citat. Meddelanden skrivs direkt på rutnätet så att du ser var varje bokstav landar.',
        'SL-avgångar fungerar för alla SL-hållplatser. Har du stjärnmärkt en hemstation på min SL-karta kan en tavla följa den. Stationssökningen förlåter stavfel, så "vestra skogen" hittar Västra skogen.',
        'SL nekar förfrågningar då och då. En nekad förfrågan görs om inom några sekunder och tavlan säger ingen data först efter fyra misslyckanden i rad. Västra skogen hade visat ingen data redan vid första nekandet.',
        'Avgångstider kan visas som minuter kvar, som klockslag i 24 h eller 12 h, eller växla mellan de två.',
        'Vädret kommer från Open-Meteo i tre vyer. Nu visar känns som, vind, regn och soluppgång och solnedgång. De andra två är kommande timmar och tre dagar framåt. Färgbrickor får stå för ikoner.',
        'Sju mallar att börja från, bland dem Allt på en gång, som fyller skärmen och rullar varje blad hela varvet.',
        'Sidorna går i en spellista med en timer var, valfria dag- och tidsfönster och tysta timmar som dämpar eller släcker tavlan på natten.',
        'Fyra övergångar och tre hastigheter. Väljer du en spelas den upp på tavlan. Äkta vrider varje blad hela varvet, som riktig hårdvara gör.',
        'Fyra bladljud, Klack, Tungt, Mjukt och Tick, med ett volymreglage. De är syntetiska, så det finns inget att ladda ned.',
        'Dela ger en länk eller en QR-kod (Quick Response) som tar med hela tavlan till en annan skärm, med en kioskversion som döljer kontrollerna. Inget sparas på någon server.',
        'För en väggskärm håller den skärmen vaken, flyttar sig en pixel med några minuters mellanrum mot inbränning, fortsätter utan nät och säger till när livedata börjar bli gammal.',
        'Den här versionsloggen finns längst ned i redigeraren.'
      ]
    }
  }
];

export const VERSION = CHANGELOG[0].v;

// The newest version named in this file's own text, so a wall screen can fetch the file
// and see whether a newer release is live (see App.checkVersion).
// Whether to reload for a fetched version. tried is the version a reload was last made
// for: if the page came back still on the old version (a browser cache without the
// service worker), it does not reload for that version again, so it cannot loop.
export const shouldReload = (current, fetched, tried) => !!fetched && fetched !== current && fetched !== tried;
export const versionIn = text => { const m = /\bv:\s*'([^']+)'/.exec(String(text || '')); return m ? m[1] : null; };
