// Version log. One version per day of work: everything done on a day ships as the
// next 0.x. Newest first. CHANGELOG.md is generated from this file by
// _dev/gen-changelog.mjs, so edit here only.

export const CHANGELOG = [
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
        'Channels so far are messages, rotating messages, menus, big text, quotes, the clock in digits, big digits or words, countdowns, Today, SL departures, weather, electricity prices, exchange rates, On this day, Follow a URL and colour patterns.',
        'The editor is built around a content picker. Each kind of content is a tile drawn as a small board in the shape of the zone you are filling, so you see what it looks like before you pick it.',
        'On a wide screen the list of pages stays beside the editor with a thumbnail of each page. Drag a page to reorder it, or use the arrow keys on its handle. On a phone it goes one step at a time with the board above.',
        'A page shows its zones on a diagram, and the zone you are editing is outlined on the big board. There are five layouts, including a stacked one for portrait screens.',
        'Messages are made straight on the grid in one of three modes. Type puts letters where you click, Paint drags colour flaps across it, and Photo turns a picture into colour flaps in the browser. The photo is not uploaded, only the flaps are saved.',
        'Undo and redo work in the message editor, and a message you change is kept under Earlier messages in case you want it back.',
        'SL departures work for any SL stop, and a zone can show up to six stations. If you have starred a home station on my Stockholm SL map, a board can follow it. Station search forgives spelling, so "vestra skogen" finds Västra skogen.',
        'SL refuses requests now and then. A refused request is retried within a few seconds and the board only says no data after four failures in a row. Västra skogen had shown no data on the first refusal.',
        'Departure times can be minutes away, clock time in 24 h or 12 h, or alternate between the two. Departures sooner than your walk to the stop can be hidden.',
        'Weather comes from Open-Meteo in three views. Now shows feels like, wind, rain and sunrise and sunset. The other two are the next hours and three days ahead. Colour chips stand in for icons.',
        'Today shows the date, the week number, Swedish red days and flag days, and sunrise and sunset for the board location. It is all worked out on the device, so it keeps going offline.',
        'Electricity prices are the spot price for your price area from elprisetjustnu.se, with the coming hours as coloured flaps. The market prices in quarter hours now, so each hour is the average of its four.',
        'Follow a URL prints lines from any web address that allows other sites to read it, a GitHub Gist or a published Google Sheet for example. You write a line template and the editor shows what the board will print.',
        'A countdown can count up from a date as well, for days since something.',
        'Nine templates to start from, shown the first time you edit. Café has a menu with prices, and Everything at once fills the screen and rolls every flap the full way round.',
        'Pages run on a playlist with a timer each, optional day and time windows, and quiet hours that dim or blank the board overnight.',
        'Four transitions and three speeds. Picking one plays it on the board. Authentic turns every flap the whole way round like the hardware does.',
        'Four flap sounds, Clack, Heavy, Soft and Tick, with a volume slider. They are synthesised, so there is nothing to download.',
        'Share gives a link or a QR (Quick Response) code that carries the whole board to another screen, with a kiosk version that hides the controls. Nothing is stored on a server. Save as image downloads the page as a picture.',
        'For a wall screen it keeps the display awake, shifts one pixel every few minutes against burn-in, keeps running offline and says when live data is getting old.',
        'This version log sits at the foot of the page list in the editor.'
      ],
      sv: [
        'Tavlan ritas på en enda canvas så att en Raspberry Pi hänger med. Varje blad stegar genom trumman till sin bokstav, fäller över gångjärnet och landar med en liten studs. Det finns tre teman, Vestaboard Black, Vestaboard White och Solari Amber.',
        'Å Ä Ö Æ Ø Ü É har varsitt eget blad.',
        'Kanalerna hittills är meddelanden, växlande meddelanden, menyer, stor text, citat, klockan i siffror, stora siffror eller ord, nedräkningar, Idag, SL-avgångar, väder, elpriser, växelkurser, Den här dagen, Följ en URL och färgmönster.',
        'Redigeraren är byggd kring en innehållsväljare. Varje sorts innehåll är en ruta som ritas som en liten tavla i samma form som zonen du fyller, så att du ser hur det blir innan du väljer.',
        'På en bred skärm står listan med sidor kvar bredvid redigeraren, med en miniatyr av varje sida. Dra en sida för att flytta den, eller använd piltangenterna på handtaget. På en mobil går det ett steg i taget med tavlan ovanför.',
        'En sida visar sina zoner på en skiss, och zonen du redigerar ramas in på den stora tavlan. Det finns fem layouter, bland dem en staplad för stående skärmar.',
        'Meddelanden görs direkt på rutnätet i ett av tre lägen. Skriv sätter bokstäver där du klickar, Måla drar färgblad över det och Foto gör om en bild till färgblad i webbläsaren. Fotot laddas inte upp, bara bladen sparas.',
        'Ångra och gör om fungerar i meddelanderedigeraren, och ett meddelande du ändrar sparas under Tidigare meddelanden ifall du vill ha tillbaka det.',
        'SL-avgångar fungerar för alla SL-hållplatser, och en zon kan visa upp till sex stationer. Har du stjärnmärkt en hemstation på min SL-karta kan en tavla följa den. Stationssökningen förlåter stavfel, så "vestra skogen" hittar Västra skogen.',
        'SL nekar förfrågningar då och då. En nekad förfrågan görs om inom några sekunder och tavlan säger ingen data först efter fyra misslyckanden i rad. Västra skogen hade visat ingen data redan vid första nekandet.',
        'Avgångstider kan visas som minuter kvar, som klockslag i 24 h eller 12 h, eller växla mellan de två. Avgångar som går innan du hinner gå till hållplatsen kan döljas.',
        'Vädret kommer från Open-Meteo i tre vyer. Nu visar känns som, vind, regn och soluppgång och solnedgång. De andra två är kommande timmar och tre dagar framåt. Färgbrickor får stå för ikoner.',
        'Idag visar datum, veckonummer, röda dagar och flaggdagar och soluppgång och solnedgång för tavlans plats. Allt räknas ut på enheten, så det fungerar utan nät.',
        'Elpriser är spotpriset för ditt elområde från elprisetjustnu.se, med de kommande timmarna som färgade blad. Marknaden sätter priser per kvart nu, så varje timme är snittet av sina fyra.',
        'Följ en URL skriver ut rader från vilken webbadress som helst som låter andra webbplatser läsa den, till exempel en GitHub Gist eller ett publicerat Google-kalkylark. Du skriver en radmall och redigeraren visar vad tavlan kommer att skriva.',
        'En nedräkning kan också räkna upp från ett datum, för dagar sedan något hände.',
        'Nio mallar att börja från, som visas första gången du redigerar. Kafé har en meny med priser, och Allt på en gång fyller skärmen och rullar varje blad hela varvet.',
        'Sidorna går i en spellista med en timer var, valfria dag- och tidsfönster och tysta timmar som dämpar eller släcker tavlan på natten.',
        'Fyra övergångar och tre hastigheter. Väljer du en spelas den upp på tavlan. Äkta vrider varje blad hela varvet, som riktig hårdvara gör.',
        'Fyra bladljud, Klack, Tungt, Mjukt och Tick, med ett volymreglage. De är syntetiska, så det finns inget att ladda ned.',
        'Dela ger en länk eller en QR-kod (Quick Response) som tar med hela tavlan till en annan skärm, med en kioskversion som döljer kontrollerna. Inget sparas på någon server. Spara som bild laddar ned sidan som en bild.',
        'För en väggskärm håller den skärmen vaken, flyttar sig en pixel med några minuters mellanrum mot inbränning, fortsätter utan nät och säger till när livedata börjar bli gammal.',
        'Den här versionsloggen finns längst ned i sidlistan i redigeraren.'
      ]
    }
  }
];

export const VERSION = CHANGELOG[0].v;
