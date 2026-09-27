// The guide in the editor: how a board is put together, in English and Swedish.
// Plain text per paragraph; the editor turns { k: 'settings' } parts into links to
// that level. Kept short, one idea per paragraph.

export const HELP = {
  en: [
    { h: 'How a board is put together', p: [
      'A board is a playlist of pages. The board shows one page at a time, for as long as that page is set to show, then moves on to the next.',
      'Each page has a layout of one or two zones, and each zone shows one kind of content: a message, the clock, departures, the weather and so on.'
    ] },
    { h: 'Making a page', p: [
      'Press Add page and pick what it should show. The tiles are drawn at the shape of the zone, so what you see on the tile is what the board will print.',
      'Pick a layout on the page to split it into two zones, then tap a zone to choose its content. The zone you are editing is outlined on the big board.',
      'Each kind of content has its options below it. Less used ones are behind More options.'
    ] },
    { h: 'Messages', p: [
      'Messages are made straight on the grid, so you see where every letter lands. Type puts letters where you click, Paint drags colour flaps across the grid, and Photo turns a picture into colour flaps.',
      'Undo and redo are there, and Ctrl or Cmd and Z works too. A message you change is kept under Earlier messages in this browser.'
    ] },
    { h: 'When pages show', p: [
      'Show for sets how long a page stays up before the next one. Tick Only on some days and times to give a page a window, for example weekdays from 06:30 to 07:30.',
      'A page without a window can show at any time. So if you want the train times alone in the morning, give the other pages windows too. When no page is allowed, the board shows the clock.',
      'Quiet hours in Board settings dim or blank the whole board overnight.'
    ] },
    { h: 'The board itself', p: [
      ['Grid size, theme, transition, sound, language and the board location are all in ', { k: 'settings', t: 'Board settings' }, ', at the foot of the page list.'],
      'The board location is used for sunrise and sunset, and for weather zones that have no city of their own.'
    ] },
    { h: 'Putting it on a wall', p: [
      'Press Share for a link or a QR code that carries the whole board. Tick the kiosk option for a wall screen, so the controls stay hidden.',
      'Opening the same link again replaces the board with the same one, so a screen that opens it at every start keeps one copy and stays up to date. The page below the board has steps for a Raspberry Pi, a cast tab and an old laptop.'
    ] },
    { h: 'Where boards are kept', p: [
      ['Boards are kept in this browser and nowhere else. To move one, use its link, or export it from ', { k: 'start', t: 'Boards and templates' }, ' and import it in the other browser.']
    ] },
    { h: 'Keys', p: [
      'E opens and closes the editor, F is fullscreen, S turns the sound on and off, and Escape goes back one step.'
    ] }
  ],
  sv: [
    { h: 'Så är en tavla uppbyggd', p: [
      'En tavla är en spellista med sidor. Tavlan visar en sida i taget, så länge sidan är inställd på, och går sedan vidare till nästa.',
      'Varje sida har en layout med en eller två zoner, och varje zon visar en sorts innehåll: ett meddelande, klockan, avgångar, vädret och så vidare.'
    ] },
    { h: 'Göra en sida', p: [
      'Tryck Lägg till sida och välj vad den ska visa. Rutorna ritas i zonens form, så det du ser på rutan är det tavlan skriver.',
      'Välj en layout på sidan för att dela den i två zoner, och tryck sedan på en zon för att välja innehåll. Zonen du redigerar ramas in på den stora tavlan.',
      'Varje sorts innehåll har sina inställningar under sig. De som används mindre ligger under Fler alternativ.'
    ] },
    { h: 'Meddelanden', p: [
      'Meddelanden görs direkt på rutnätet, så du ser var varje bokstav hamnar. Skriv sätter bokstäver där du klickar, Måla drar färgblad över rutnätet och Foto gör om en bild till färgblad.',
      'Ångra och gör om finns, och Ctrl eller Cmd och Z fungerar också. Ett meddelande du ändrar sparas under Tidigare meddelanden i den här webbläsaren.'
    ] },
    { h: 'När sidor visas', p: [
      'Visa i anger hur länge en sida står kvar innan nästa. Kryssa i Bara vissa dagar och tider för att ge sidan ett fönster, till exempel vardagar 06:30 till 07:30.',
      'En sida utan fönster kan visas när som helst. Vill du ha tågtiderna ensamma på morgonen behöver de andra sidorna också fönster. När ingen sida får visas visar tavlan klockan.',
      'Tysta timmar i Tavlans inställningar dämpar eller släcker hela tavlan på natten.'
    ] },
    { h: 'Själva tavlan', p: [
      ['Storlek på rutnätet, tema, övergång, ljud, språk och tavlans plats finns i ', { k: 'settings', t: 'Tavlans inställningar' }, ', längst ned i sidlistan.'],
      'Tavlans plats används för soluppgång och solnedgång, och för väderzoner som inte har en egen stad.'
    ] },
    { h: 'Sätta upp den på en vägg', p: [
      'Tryck Dela för en länk eller en QR-kod som tar med hela tavlan. Kryssa i kioskläget för en väggskärm, så att kontrollerna hålls dolda.',
      'Öppnar du samma länk igen ersätts tavlan med samma tavla, så en skärm som öppnar den vid varje start har en enda kopia som hålls uppdaterad. Sidan under tavlan har steg för en Raspberry Pi, en castad flik och en gammal laptop.'
    ] },
    { h: 'Var tavlorna sparas', p: [
      ['Tavlorna sparas i den här webbläsaren och ingen annanstans. För att flytta en, använd dess länk, eller exportera den från ', { k: 'start', t: 'Tavlor och mallar' }, ' och importera den i den andra webbläsaren.']
    ] },
    { h: 'Tangenter', p: [
      'E öppnar och stänger redigeraren, F är helskärm, S slår på och av ljudet och Escape går tillbaka ett steg.'
    ] }
  ]
};
