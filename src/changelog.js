// Version log. Each version is a release, newest first. CHANGELOG.md is generated
// from this file by _dev/gen-changelog.mjs, so edit here only.

export const CHANGELOG = [
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
