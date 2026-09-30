// The guide in the editor: playlists, boards and the week, in English and Swedish.
// Plain text per paragraph; the editor turns { k: 'settings' } parts into links to
// that level. `fig` names a small illustration drawn by the renderer, `keys` a list
// of key caps. Kept short, one idea per paragraph.

export const INTRO = {
  en: { title: 'How it works', lede: 'A short guide to making a playlist and putting it on a wall. Everything here can be changed later.' },
  sv: { title: 'Så fungerar det', lede: 'En kort guide till att göra en spellista och sätta upp den på en vägg. Allt här går att ändra senare.' }
};

export const HELP = {
  en: [
    { h: 'Playlists and boards', fig: 'board', p: [
      'A playlist is what a screen plays. It holds boards in order, and says when each one shows.',
      'A board is one screen at a time: a layout of one or two zones, and in each zone one kind of content, like a message, the clock, departures or the weather.',
      'The editor has its sections along the top: Showing, My boards, Explore for the templates, and Account.'
    ] },
    { h: 'Showing and previewing', p: [
      'Edit opens Showing: what this screen shows now, and the ways to change it.',
      'Anything you open, a playlist, a board in My boards or a template, is on the screen at once with a gold bar under it. That is a preview. Show on this screen makes it what the screen runs. Leave without pressing and the screen goes back to what it was showing, and a preview left alone for three minutes ends by itself.',
      'Changes are saved as you make them, and the line under the editor\'s title says so.'
    ] },
    { h: 'Making a board', fig: 'layouts', p: [
      'Open a playlist, go to Boards and press Add a board, then pick what it shows. The tiles are drawn at the shape of the zone, so what you see on a tile is what the screen will print.',
      'Pick a layout to split the board into two zones, then tap a zone to choose its content. The zone you are working on is outlined on the big board.',
      'Each kind of content has its options under it, and the less used ones are behind More options.'
    ] },
    { h: 'My boards', p: [
      "Save to my boards keeps a copy of any board, from a playlist or a template, to use again. Add it to any playlist with + Add a board, and the copy is fitted to that playlist's size. Only flaps typed or painted on the grid can be cut, and the app says how many before you add it.",
      'A copy stands on its own, so changing it, or the one in My boards, leaves the other as it was. My boards can also import a board file or a pasted Vestaboard message.'
    ] },
    { h: 'Messages', fig: 'message', p: [
      'Messages are made straight on the grid, so you see where every letter lands. Type puts letters where you click, Paint drags colour flaps across the grid, and Photo turns a picture into colour flaps.',
      'Undo and redo are there, and Ctrl or Cmd and Z works too. A message you change is kept under Earlier messages in this browser.'
    ] },
    { h: 'The week', fig: 'week', p: [
      "Week is the main view of a playlist, with each board's times as blocks. Drag down a day to give a board a time. A block can be dragged to move it, or by its top or bottom edge to change when it starts or ends.",
      'A board with no time takes turns with the others whenever it can, and sits under Any time. A time can be days of the week, or a date, once or every year, for a birthday. A board keeps the colour of its place in the playlist.',
      "Show alone on a board with a time keeps the others off while that time is on, which is how the train times get the morning to themselves. Today's playlist beside the week shows what that adds up to. It cannot be edited, so it always matches what plays.",
      ['Quiet hours in ', { k: 'settings', t: 'Display' }, ' dim or blank the screen overnight.']
    ] },
    { h: 'The display', p: [
      ['Grid size, theme, transition, sound and the place are in ', { k: 'settings', t: 'Display' }, ', next to Week and Boards on a playlist. Language is under ', { k: 'account', t: 'Account' }, '.'],
      'The place is where the screen is. New boards start from it: the weather, the nearest stop, the holidays, the currency, and 12 or 24 hours. Sunrise and sunset use it too.'
    ] },
    { h: 'Live data, almost anywhere', p: [
      ['Set the place in ', { k: 'settings', t: 'Display' }, ' by searching for your city, and new boards start from it. Departures picks the nearest stop, the weather and the holidays follow the country, prices are in its currency, and clocks use 12 or 24 hours the way it does. Each tile says what it chose, and you can pick something else.'],
      'Departures covers most of Europe and North America, with platforms, delays and cancelled trains where the operator publishes them. In Stockholm it uses SL directly. Station board, under More options, shows it the way a railway station does.',
      'Names in other alphabets are spelled in Latin letters, so Москва prints as MOSKVA. Where there is no Latin spelling, the English name is used.'
    ] },
    { h: 'Markets', p: [
      'The Markets tile draws a share, an ETF or a coin as a line of half flaps, green where it rises and red where it falls, with its name, price and the day\'s change beside it, and whether its market is open, in your own time.',
      'London and New York shares and ETFs are built in, with each trading day\'s close. Swedish shares are priced through their London listings, in kronor. Crypto updates every 15 minutes.',
      'For anything else, such as Stockholm itself or your funds, use your own Alpha Vantage key or a Google Sheet under More options. Both are kept in this browser only, never in the board or its link. A sheet with a history block per symbol gives the line from the first day; the guide linked from the tile shows how. Signed in, your key and sheet are kept with your account too, listed under Account.'
    ] },
    { h: 'Headlines', p: [
      'The Headlines tile shows the latest from a feed, one headline at a time under the feed\'s name. BBC News, NASA and Hacker News are there to tick. Any other feed can be added by its address.',
      'Most news sites do not let other pages read their feeds, so Split-Flap\'s server fetches them. Add a feed while signed in and it is kept with your account under Account; a wall screen showing it can then read it without signing in.'
    ] },
    { h: 'Where the data comes from', sources: true, p: [
      'Every live tile names its source under its options. These are all of them:'
    ] },
    { h: 'Putting it on a wall', p: [
      'Put this on another screen, under Showing, or Share on the control bar, gives a link and a QR code that carry the playlist as it is now. The link is set for a wall screen, so the controls stay hidden. If you change the playlist later, share it again.',
      'Opening the same link again replaces the playlist with the same one, so a screen that opens it at every start keeps one copy and stays up to date. The page below the board has steps for a Raspberry Pi, a cast tab and an old laptop.'
    ] },
    { h: 'Where playlists are kept', p: [
      ['As a guest, playlists are kept in this browser and nowhere else. To move one, share its link, or export it from its ⋯ menu in ', { k: 'playlists', t: 'Playlists' }, ' and import it from ', { k: 'start', t: 'Explore' }, ' in the other browser.'],
      ['With an account, your playlists are kept with it as well, and come back on any device you sign in on. ', { k: 'account', t: 'Account' }, ' has signing in, export and delete, and the ', { href: 'privacy', t: 'privacy page' }, ' says what it stores.']
    ] },
    { h: 'Keys', keys: [['E', 'Open and close the editor'], ['F', 'Fullscreen'], ['S', 'Sound on and off'], ['R', 'Read the board aloud, with a screen reader on'], ['Esc', 'Close a menu, then the editor'], ['↑ ↓', 'Move a block in the week by 15 minutes, with Shift to change its end'], ['Ctrl Z', 'Undo in a message, with Shift to redo']] }
  ],
  sv: [
    { h: 'Spellistor och tavlor', fig: 'board', p: [
      'En spellista är det en skärm spelar. Den har tavlor i ordning, och säger när var och en visas.',
      'En tavla är en skärm i taget: en layout med en eller två zoner, och i varje zon en sorts innehåll, som ett meddelande, klockan, avgångar eller vädret.',
      'Redigeraren har sina sektioner längst upp: Visas, Mina tavlor, Utforska för mallarna, och Konto.'
    ] },
    { h: 'Visas och förhandsvisning', p: [
      'Redigera öppnar Visas: det den här skärmen visar nu, och sätten att ändra det.',
      'Allt du öppnar, en spellista, en tavla i Mina tavlor eller en mall, syns på skärmen direkt med en gyllene rad under. Det är en förhandsvisning. Visa på den här skärmen gör det till det skärmen visar. Går du därifrån utan att trycka går skärmen tillbaka till det den visade, och en förhandsvisning som lämnas orörd i tre minuter slutar av sig själv.',
      'Ändringar sparas medan du gör dem, och raden under redigerarens rubrik säger det.'
    ] },
    { h: 'Göra en tavla', fig: 'layouts', p: [
      'Öppna en spellista, gå till Tavlor och tryck Lägg till en tavla, och välj sedan vad den visar. Rutorna ritas i zonens form, så det du ser på en ruta är det skärmen skriver ut.',
      'Välj en layout för att dela tavlan i två zoner, och tryck sedan på en zon för att välja dess innehåll. Zonen du arbetar med ramas in på den stora tavlan.',
      'Varje sorts innehåll har sina val under sig, och de som används mer sällan ligger under Fler val.'
    ] },
    { h: 'Mina tavlor', p: [
      'Spara i mina tavlor behåller en kopia av vilken tavla som helst, från en spellista eller en mall, att använda igen. Lägg till den i en spellista med + Lägg till en tavla, så anpassas kopian till spellistans storlek. Bara flappar som skrivits eller målats på rutnätet kan klippas bort, och appen säger hur många innan du lägger till den.',
      'En kopia står för sig själv, så om du ändrar den, eller den i Mina tavlor, är den andra som förut. Mina tavlor kan också importera en tavelfil eller ett inklistrat Vestaboard-meddelande.'
    ] },
    { h: 'Meddelanden', fig: 'message', p: [
      'Meddelanden görs direkt på rutnätet, så du ser var varje bokstav hamnar. Skriv sätter bokstäver där du klickar, Måla drar färgblad över rutnätet, och Foto gör om en bild till färgblad.',
      'Ångra och gör om finns, och Ctrl eller Cmd och Z fungerar också. Ett meddelande du ändrar sparas under Tidigare meddelanden i den här webbläsaren.'
    ] },
    { h: 'Veckan', fig: 'week', p: [
      'Vecka är spellistans huvudvy, med varje tavlas tider som block. Dra nedåt i en dag för att ge en tavla en tid. Ett block kan dras för att flyttas, eller i över- eller underkanten för att ändra när det börjar eller slutar.',
      'En tavla utan tid turas om med de andra när den kan, och ligger under När som helst. En tid kan vara veckodagar, eller ett datum, en gång eller varje år, för en födelsedag. En tavla har färgen för sin plats i spellistan.',
      'Visa ensam på en tavla med en tid håller de andra borta medan tiden pågår, och det är så tågtiderna får morgonen för sig själva. Dagens spellista bredvid veckan visar vad det blir. Den går inte att ändra, så den stämmer alltid med det som spelas.',
      ['Tysta timmar under ', { k: 'settings', t: 'Visning' }, ' dämpar eller släcker skärmen över natten.']
    ] },
    { h: 'Skärmen', p: [
      ['Storlek på rutnätet, tema, övergång, ljud och plats finns under ', { k: 'settings', t: 'Visning' }, ', bredvid Vecka och Tavlor på en spellista. Språk finns under ', { k: 'account', t: 'Konto' }, '.'],
      'Platsen är där skärmen finns. Nya tavlor utgår från den: vädret, närmaste hållplats, helgdagar, valutan och 12 eller 24 timmar. Soluppgång och solnedgång använder den också.'
    ] },
    { h: 'Livedata, nästan var som helst', p: [
      ['Välj platsen under ', { k: 'settings', t: 'Visning' }, ' genom att söka efter din stad, så utgår nya tavlor från den. Avgångar väljer närmaste hållplats, vädret och helgdagarna följer landet, priser står i dess valuta och klockor visar 12 eller 24 timmar som där. Varje ruta säger vad den valde, och du kan välja något annat.'],
      'Avgångar täcker större delen av Europa och Nordamerika, med spår, förseningar och inställda tåg där operatören publicerar dem. I Stockholm används SL direkt. Stationstavla, under Fler alternativ, visar det som på en järnvägsstation.',
      'Namn i andra alfabet stavas med latinska bokstäver, så Москва skrivs MOSKVA. Där det inte finns någon latinsk stavning används det engelska namnet.'
    ] },
    { h: 'Marknader', p: [
      'Rutan Marknader ritar en aktie, en fond eller ett mynt som en linje av halva flappar, grön där den stiger och röd där den faller, med namn, pris och dagens förändring bredvid, och om marknaden är öppen, i din egen tid.',
      'Aktier och fonder i London och New York finns inbyggda, med varje handelsdags stängningskurs. Svenska aktier prissätts via sina noteringar i London, i kronor. Krypto uppdateras var femtonde minut.',
      'För allt annat, till exempel Stockholmsbörsen eller dina fonder, använd din egen Alpha Vantage-nyckel eller ett Google-kalkylark under Fler alternativ. Båda sparas bara i den här webbläsaren, aldrig i tavlan eller dess länk. Ett kalkylark med ett historikblock per symbol ger linjen från första dagen; guiden som rutan länkar till visar hur. Är du inloggad sparas nyckeln och kalkylarket med ditt konto också, listade under Konto.'
    ] },
    { h: 'Rubriker', p: [
      'Rutan Rubriker visar det senaste från ett flöde, en rubrik i taget under flödets namn. BBC News, NASA och Hacker News finns att bocka för. Andra flöden kan läggas till med sin adress.',
      'De flesta nyhetssajter låter inte andra sidor läsa deras flöden, så Split-Flaps server hämtar dem. Lägger du till ett flöde inloggad sparas det med ditt konto under Konto; en väggskärm som visar det kan sedan läsa det utan att logga in.'
    ] },
    { h: 'Var datan kommer ifrån', sources: true, p: [
      'Varje liveruta anger sin källa under sina alternativ. Här är alla:'
    ] },
    { h: 'Sätta upp den på en vägg', p: [
      'Visa på en annan skärm, under Visas, eller Dela på kontrollraden, ger en länk och en QR-kod som bär spellistan som den är nu. Länken är gjord för en väggskärm, så att kontrollerna hålls dolda. Ändrar du spellistan senare, dela den igen.',
      'Öppnas samma länk igen ersätts spellistan med samma, så en skärm som öppnar den vid varje start har en kopia och hålls aktuell. Sidan under tavlan har steg för en Raspberry Pi, en castad flik och en gammal laptop.'
    ] },
    { h: 'Var spellistor sparas', p: [
      ['Som gäst sparas spellistor i den här webbläsaren och ingen annanstans. För att flytta en, dela dess länk, eller exportera den från dess ⋯-meny under ', { k: 'spellistor', t: 'Spellistor' }, ' och importera den från ', { k: 'start', t: 'Utforska' }, ' i den andra webbläsaren.'],
      ['Med ett konto sparas dina spellistor med det också, och kommer tillbaka på alla enheter där du loggar in. ', { k: 'account', t: 'Konto' }, ' har inloggning, export och radering, och ', { href: 'privacy', t: 'integritetssidan' }, ' säger vad det sparar.']
    ] },
    { h: 'Tangenter', keys: [['E', 'Öppna och stäng redigeraren'], ['F', 'Helskärm'], ['S', 'Ljud på och av'], ['R', 'Läs upp tavlan, med en skärmläsare på'], ['Esc', 'Stäng en meny, sedan redigeraren'], ['↑ ↓', 'Flytta ett block i veckan 15 minuter, med Skift för att ändra slutet'], ['Ctrl Z', 'Ångra i ett meddelande, med Skift för att göra om']] }
  ]
};
