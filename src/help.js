// The guide in the editor: storyboards, boards and the week, in English and Swedish.
// Plain text per paragraph; the editor turns { k: 'settings' } parts into links to
// that level. `fig` names a small illustration drawn by the renderer, `keys` a list
// of key caps. Kept short, one idea per paragraph.

export const INTRO = {
  en: { title: 'How it works', lede: 'A short guide to making a storyboard and putting it on a wall. Everything here can be changed later. Without an account nothing leaves this browser unless you share it, and with one your storyboards are kept with your account.' },
  sv: { title: 'Så fungerar det', lede: 'En kort guide till att göra en storyboard och sätta upp den på en vägg. Allt här går att ändra senare. Utan konto lämnar inget webbläsaren om du inte delar det, och med ett konto sparas dina storyboards med kontot.' }
};

export const HELP = {
  en: [
    { h: 'Storyboards and boards', fig: 'board', p: [
      'A storyboard is what a screen plays. It holds boards in order, and says when each one shows.',
      'A board is one screen at a time: a layout of one or two zones, and in each zone one kind of content, like a message, the clock, departures or the weather.',
      'The editor has its sections along the top: Storyboards, Explore for the templates, and Account.'
    ] },
    { h: 'Making a board', fig: 'layouts', p: [
      'Open a storyboard, go to Boards and press Add a board, then pick what it shows. The tiles are drawn at the shape of the zone, so what you see on a tile is what the screen will print.',
      'Pick a layout to split the board into two zones, then tap a zone to choose its content. The zone you are working on is outlined on the big board.',
      'Each kind of content has its options under it, and the less used ones are behind More options.'
    ] },
    { h: 'Messages', fig: 'message', p: [
      'Messages are made straight on the grid, so you see where every letter lands. Type puts letters where you click, Paint drags colour flaps across the grid, and Photo turns a picture into colour flaps.',
      'Undo and redo are there, and Ctrl or Cmd and Z works too. A message you change is kept under Earlier messages in this browser.'
    ] },
    { h: 'The week', fig: 'week', p: [
      "Week is the main view of a storyboard, with each board's times as blocks. Drag down a day to give a board a time. A block can be dragged to move it, or by its top or bottom edge to change when it starts or ends.",
      'A board with no time takes turns with the others whenever it can, and sits under Any time. A time can be days of the week, or a date, once or every year, for a birthday. A board keeps the colour of its place in the storyboard.',
      "Show alone on a board with a time keeps the others off while that time is on, which is how the train times get the morning to themselves. Today's playlist beside the week shows what that adds up to. It cannot be edited, so it always matches what plays.",
      ['Quiet hours in ', { k: 'settings', t: 'Display' }, ' dim or blank the screen overnight.']
    ] },
    { h: 'The display', p: [
      ['Grid size, theme, transition, sound and location are in ', { k: 'settings', t: 'Display' }, ', next to Week and Boards on a storyboard. Language is under ', { k: 'account', t: 'Account' }, '.'],
      'The location is used for sunrise and sunset, and for weather zones that have no city of their own.'
    ] },
    { h: 'Putting it on a wall', p: [
      'Press Share for a link or a QR code that carries the whole storyboard. Tick the kiosk option for a wall screen, so the controls stay hidden.',
      'Opening the same link again replaces the storyboard with the same one, so a screen that opens it at every start keeps one copy and stays up to date. The page below the board has steps for a Raspberry Pi, a cast tab and an old laptop.'
    ] },
    { h: 'Where storyboards are kept', p: [
      ['As a guest, storyboards are kept in this browser and nowhere else. To move one, share its link, or export it from its ⋯ menu in ', { k: 'storyboards', t: 'Storyboards' }, ' and import it from ', { k: 'start', t: 'Explore' }, ' in the other browser.'],
      ['With an account, your storyboards are kept with it as well, and come back on any device you sign in on. ', { k: 'account', t: 'Account' }, ' has signing in, export and delete, and the ', { href: 'privacy', t: 'privacy page' }, ' says what it stores.']
    ] },
    { h: 'Keys', keys: [['E', 'Open and close the editor'], ['F', 'Fullscreen'], ['S', 'Sound on and off'], ['R', 'Read the board aloud, with a screen reader on'], ['Esc', 'Close a menu, then the editor'], ['↑ ↓', 'Move a block in the week by 15 minutes, with Shift to change its end'], ['Ctrl Z', 'Undo in a message, with Shift to redo']] }
  ],
  sv: [
    { h: 'Storyboards och tavlor', fig: 'board', p: [
      'En storyboard är det en skärm spelar. Den har tavlor i ordning, och säger när var och en visas.',
      'En tavla är en skärm i taget: en layout med en eller två zoner, och i varje zon en sorts innehåll, som ett meddelande, klockan, avgångar eller vädret.',
      'Redigeraren har sina sektioner längst upp: Storyboards, Utforska för mallarna, och Konto.'
    ] },
    { h: 'Göra en tavla', fig: 'layouts', p: [
      'Öppna en storyboard, gå till Tavlor och tryck Lägg till en tavla, och välj sedan vad den visar. Rutorna ritas i zonens form, så det du ser på en ruta är det skärmen skriver ut.',
      'Välj en layout för att dela tavlan i två zoner, och tryck sedan på en zon för att välja dess innehåll. Zonen du arbetar med ramas in på den stora tavlan.',
      'Varje sorts innehåll har sina val under sig, och de som används mer sällan ligger under Fler val.'
    ] },
    { h: 'Meddelanden', fig: 'message', p: [
      'Meddelanden görs direkt på rutnätet, så du ser var varje bokstav hamnar. Skriv sätter bokstäver där du klickar, Måla drar färgblad över rutnätet, och Foto gör om en bild till färgblad.',
      'Ångra och gör om finns, och Ctrl eller Cmd och Z fungerar också. Ett meddelande du ändrar sparas under Tidigare meddelanden i den här webbläsaren.'
    ] },
    { h: 'Veckan', fig: 'week', p: [
      'Vecka är storyboardens huvudvy, med varje tavlas tider som block. Dra nedåt i en dag för att ge en tavla en tid. Ett block kan dras för att flyttas, eller i över- eller underkanten för att ändra när det börjar eller slutar.',
      'En tavla utan tid turas om med de andra när den kan, och ligger under När som helst. En tid kan vara veckodagar, eller ett datum, en gång eller varje år, för en födelsedag. En tavla har färgen för sin plats i storyboarden.',
      'Visa ensam på en tavla med en tid håller de andra borta medan tiden pågår, och det är så tågtiderna får morgonen för sig själva. Dagens spellista bredvid veckan visar vad det blir. Den går inte att ändra, så den stämmer alltid med det som spelas.',
      ['Tysta timmar under ', { k: 'settings', t: 'Visning' }, ' dämpar eller släcker skärmen över natten.']
    ] },
    { h: 'Skärmen', p: [
      ['Storlek på rutnätet, tema, övergång, ljud och plats finns under ', { k: 'settings', t: 'Visning' }, ', bredvid Vecka och Tavlor på en storyboard. Språk finns under ', { k: 'account', t: 'Konto' }, '.'],
      'Platsen används för soluppgång och solnedgång, och för väderzoner som inte har en egen stad.'
    ] },
    { h: 'Sätta upp den på en vägg', p: [
      'Tryck Dela för en länk eller en QR-kod som bär hela storyboarden. Bocka i kioskläget för en väggskärm, så att kontrollerna hålls dolda.',
      'Öppnas samma länk igen ersätts storyboarden med samma, så en skärm som öppnar den vid varje start har en kopia och hålls aktuell. Sidan under tavlan har steg för en Raspberry Pi, en castad flik och en gammal laptop.'
    ] },
    { h: 'Var storyboards sparas', p: [
      ['Som gäst sparas storyboards i den här webbläsaren och ingen annanstans. För att flytta en, dela dess länk, eller exportera den från dess ⋯-meny under ', { k: 'storyboards', t: 'Storyboards' }, ' och importera den från ', { k: 'start', t: 'Utforska' }, ' i den andra webbläsaren.'],
      ['Med ett konto sparas dina storyboards med det också, och kommer tillbaka på alla enheter där du loggar in. ', { k: 'account', t: 'Konto' }, ' har inloggning, export och radering, och ', { href: 'privacy', t: 'integritetssidan' }, ' säger vad det sparar.']
    ] },
    { h: 'Tangenter', keys: [['E', 'Öppna och stäng redigeraren'], ['F', 'Helskärm'], ['S', 'Ljud på och av'], ['R', 'Läs upp tavlan, med en skärmläsare på'], ['Esc', 'Stäng en meny, sedan redigeraren'], ['↑ ↓', 'Flytta ett block i veckan 15 minuter, med Skift för att ändra slutet'], ['Ctrl Z', 'Ångra i ett meddelande, med Skift för att göra om']] }
  ]
};
