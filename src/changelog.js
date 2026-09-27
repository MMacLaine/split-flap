// Version log. One version per day of work: everything done on a day ships as the
// next 0.x. Newest first. CHANGELOG.md is generated from this file by
// _dev/deploy-to-site.mjs, so edit here only.

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
        'The board itself, drawn on one canvas so a Raspberry Pi keeps up: every flap steps forward through the drum, folds over its hinge and settles with a small bounce. Three themes: Vestaboard Black, Vestaboard White and Solari Amber.',
        'Å Ä Ö Æ Ø Ü É each have their own flap.',
        'Channels: messages typed straight onto the grid, clock, a big clock and big text made of colour chips, countdowns, SL departures, weather, colour patterns (Nordic flags, rain, waves, confetti) and quotes.',
        'SL departures from any SL stop, or from the home station you starred on the Stockholm SL map. Search forgives spelling, so "vestra skogen" finds Västra skogen.',
        'Departures keep loading when SL\'s servers are busy: a refused request is retried within seconds instead of the board giving up.',
        'Departure times as minutes away, as clock time (24 h or 12 h), or alternating between the two.',
        'This version log, at the foot of the editor.',
        'Weather from Open-Meteo in three views: now (feels like, wind, rain, sunrise and sunset), the next hours and three days, with colour chips as icons.',
        'Seven templates, from a hallway dashboard to Everything at once, which fills the screen and never sits still.',
        'Playlists with page timers, day and time windows, and quiet hours that dim or blank the board overnight.',
        'Four transitions at three speeds, played on the board as you pick them. Authentic turns every flap the full way round.',
        'Four synthesised flap sounds: Clack, Heavy, Soft and Tick, with a volume slider.',
        'Board links and QR (Quick Response) codes carry a whole board to another screen, including a version for wall screens with no controls. Nothing is stored on a server.',
        'Made for walls: keeps the screen awake, shifts one pixel every few minutes against burn-in, keeps running offline, and says when live data is getting old.'
      ],
      sv: [
        'Själva tavlan, ritad på en enda canvas så att en Raspberry Pi hänger med: varje blad stegar framåt genom trumman, fäller över gångjärnet och landar med en liten studs. Tre teman: Vestaboard Black, Vestaboard White och Solari Amber.',
        'Å Ä Ö Æ Ø Ü É har varsitt eget blad.',
        'Kanaler: meddelanden som skrivs direkt på rutnätet, klocka, en stor klocka och stor text av färgbrickor, nedräkningar, SL-avgångar, väder, färgmönster (nordiska flaggor, regn, vågor, konfetti) och citat.',
        'SL-avgångar från vilken SL-hållplats som helst, eller från hemstationen du stjärnmärkt på SL-kartan. Sökningen förlåter stavfel, så "vestra skogen" hittar Västra skogen.',
        'Avgångarna fortsätter laddas när SL:s servrar är upptagna: en nekad förfrågan görs om inom några sekunder i stället för att tavlan ger upp.',
        'Avgångstider som minuter kvar, som klockslag (24 h eller 12 h) eller växlande mellan de två.',
        'Den här versionsloggen, längst ned i redigeraren.',
        'Väder från Open-Meteo i tre vyer: nu (känns som, vind, regn, soluppgång och solnedgång), kommande timmar och tre dagar, med färgbrickor som ikoner.',
        'Sju mallar, från en hallpanel till Allt på en gång, som fyller skärmen och aldrig står still.',
        'Spellistor med tider per sida, dag- och tidsfönster, och tysta timmar som dämpar eller släcker tavlan på natten.',
        'Fyra övergångar i tre hastigheter, som spelas upp på tavlan när du väljer dem. Äkta vrider varje blad hela varvet runt.',
        'Fyra syntetiska bladljud: Klack, Tungt, Mjukt och Tick, med ett volymreglage.',
        'Tavellänkar och QR-koder (Quick Response) tar med en hel tavla till en annan skärm, även en version för väggskärmar utan kontroller. Inget sparas på någon server.',
        'Gjord för väggar: håller skärmen vaken, flyttar sig en pixel med några minuters mellanrum mot inbränning, fortsätter utan nät och säger till när livedata börjar bli gammal.'
      ]
    }
  }
];

export const VERSION = CHANGELOG[0].v;
