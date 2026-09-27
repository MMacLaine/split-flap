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
