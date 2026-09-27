// Version log. Each version is a release, newest first. CHANGELOG.md is generated
// from this file by _dev/gen-changelog.mjs, so edit here only.

export const CHANGELOG = [
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
