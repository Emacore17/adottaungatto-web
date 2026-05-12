# Roadmap operativa per agenti di coding

Questo documento e' il punto di ingresso per i prossimi sviluppi. Traduce lo
stato reale del repository in milestone piccole, verificabili e adatte a un
agente AI.

## Traguardo finale locale

Il progetto raggiunge il traguardo locale quando un agente puo eseguire:

```bash
pnpm dev:demo
pnpm smoke:e2e
```

e ottenere una demo navigabile con:

- utenti demo privato, proprietario, moderatore e admin;
- annunci pubblici con immagini realistiche, annunci in moderazione, bozze,
  rifiutati, sospesi, scaduti e almeno uno sponsorizzato mock;
- flusso "Inserisci annuncio" completo: dati, immagini, invio a revisione,
  schermata di conferma e notifica al proprietario;
- preferiti con cuore toggle dalla lista e dalla scheda;
- dashboard account ordinata con impostazioni profilo modificabili;
- autorizzazione corretta: ogni utente vede e modifica solo i propri dati;
- pagina `/listings` a card orizzontali, una per riga, con slot sponsorizzato;
- dettaglio annuncio con carosello immagini sfogliabile;
- notifiche real-time applicative, con fallback solo di resilienza;
- moderazione/admin protetta, separata e utilizzabile in locale;
- smoke test che copre i flussi principali senza interventi manuali.

Stato attuale: il backend, la base frontend, il giro inserimento annuncio, il
mock sponsorizzato in lista, le immagini demo locali, il cuore preferiti toggle
e la pagina impostazioni profilo, la dashboard account operativa, la inbox
contatti ricevuti lato proprietario e i messaggi di errore account leggibili
sono funzionanti in locale. Il contatto proprietario supporta anche il consenso
separato per condividere il telefono del richiedente. Le notifiche in-app hanno
un canale real-time SSE locale con badge live e smoke dedicato. Invio a
revisione, contatto proprietario e decisione di moderazione generano gia'
notifiche in-app. Il punto piu urgente ora e' estendere la moderazione/admin
con strumenti operativi, dettaglio casi e audit piu leggibile.

## Regole per ogni round

- Leggere `docs/project-state.md`, questo documento e il documento dell'area
  toccata.
- Prima di cambiare codice frontend leggere
  `docs/frontend-nextjs-shadcn-guidelines.md`.
- Tenere il diff piccolo e chiudere una sola milestone o sotto-task.
- Aggiornare documentazione e stato reale nello stesso round.
- Eseguire `pnpm typecheck`, `pnpm test`, `pnpm lint` e `git diff --check` se
  si tocca codice. Per soli Markdown basta `git diff --check`.
- A fine round fare commit con messaggio breve.

## Milestone A - Demo locale verificabile

Obiettivo: rendere `pnpm dev:demo` una demo completa per sviluppo e test.

Task:

- Fatto: aggiornare `seed-demo` con account demo `private`, `owner`,
  `moderator`, `admin`;
- Fatto: aggiungere annunci demo in tutti gli stati rilevanti;
- Fatto: caricare immagini demo per tutti gli annunci pubblici e in revisione;
- Fatto: aggiungere almeno uno slot sponsorizzato mock o dati preparatori;
- Fatto: aggiornare `pnpm smoke:e2e` per verificare dati demo, immagini e
  ruoli;
- Fatto: documentare credenziali e casi in `docs/test-data.md`.

Avanzamento 12 maggio 2026:

- Fatto: seed demo con 5 account verificati e ruoli privato, proprietario,
  moderatore e admin.
- Fatto: 15 annunci/casi demo con pubblicati, in revisione, bozza incompleta,
  bozza completa, rifiutato, sospeso da segnalazione e scaduto.
- Fatto: asset deterministici per 11 annunci, inclusi tutti i pubblici e quelli
  in revisione.
- Fatto: `worker demo:assets` usa le foto locali in `immagini-gattini/` quando
  presenti e cade su placeholder generati quando non ci sono.
- Fatto: la UI usa immagini storage non ottimizzate da Next per evitare il
  blocco locale di MinIO su `localhost:9000`.
- Fatto: lo smoke E2E verifica che la lista pubblica abbia cover, che l'oggetto
  storage risponda e che l'HTML usi URL storage diretti.
- Fatto: lo smoke E2E verifica login admin e presenza della coda
  `pending_review`.
- Fatto: promozione mock attiva su un annuncio pubblicato e visibile in cima a
  `/listings`.
- Fatto: lo smoke E2E approva un caso appena inviato a revisione, verifica il
  dettaglio pubblico e la notifica al proprietario.
- Fatto: lo smoke E2E usa immagini reali da `immagini-gattini/` quando
  disponibili e carica piu immagini per una bozza.
- Da fare: se gli asset reali saranno versionati, aggiungere licenza e
  attribuzione documentata.

Done:

- dopo `pnpm demo:reset` e `pnpm dev:demo`, la lista pubblica mostra annunci
  con immagini e l'admin vede casi in moderazione.

## Milestone B - Inserimento annuncio senza attriti

Obiettivo: risolvere il problema utente attuale sulla creazione annuncio.

Task:

- sostituire il concetto visibile di "Crea bozza" con "Inserisci annuncio";
- trasformare dati e immagini in un flusso unico o wizard guidato;
- bloccare l'invio a revisione solo con indicazioni precise e azionabili;
- dopo l'invio mostrare una pagina/stato di conferma: annuncio inserito, in
  attesa di revisione, notifica futura;
- rendere chiaro lo stato immagini `uploaded`, `processing`, `ready`;
- aggiornare smoke/e2e con upload immagine e invio a revisione riuscito.

Avanzamento 12 maggio 2026:

- Fatto: il worker applicativo processa automaticamente le immagini in
  `processing` all'avvio e poi a intervalli regolari.
- Fatto: la UI account espone "Inserisci annuncio", stati immagine piu'
  leggibili e una schermata di conferma dopo l'invio a revisione.
- Fatto: `pnpm smoke:e2e` copre creazione annuncio completa, upload immagine
  presigned, processing worker, invio a revisione e pagina di conferma.
- Fatto: `pnpm smoke:e2e` copre upload multiplo immagini usando fixture
  gattini locali quando disponibili.
- Fatto: la UI mostra un flusso guidato dati, foto e revisione, con invio
  disabilitato finche' dati e foto non sono pronti.

Stato: Milestone B completata per il giro funzionale locale. La verifica con
fixture demo realistiche resta nella Milestone A.

Done:

- un utente demo crea un annuncio completo, carica almeno una immagine, invia a
  revisione e non incontra l'errore generico "bozza non pronta".

## Milestone C - Account, profilo e sicurezza dati

Obiettivo: rendere l'area utente comprensibile e corretta multi-utente.

Task:

- Fatto: riorganizzare `/account` in dashboard operativa: annunci, notifiche,
  preferiti, profilo;
- Fatto: aggiungere impostazioni profilo modificabili dall'utente;
- Fatto: verificare ownership smoke su bozze, immagini, preferiti e
  notifiche;
- Fatto: estendere ownership e gestione contatti con superficie account
  proprietario `/account/contacts`;
- Fatto: completare test authz smoke su accesso multi-utente e dati propri per
  bozze, immagini, preferiti e notifiche;
- Fatto: rendere i messaggi di errore account leggibili e non tecnici.

Avanzamento 12 maggio 2026:

- Fatto: aggiunta `/account/settings` con modifica nome visualizzato,
  telefono e preferenze email non essenziali.
- Fatto: dashboard `/account` collegata alle impostazioni profilo.
- Fatto: smoke E2E aggiorna profilo/preferenze e verifica la pagina settings.
- Fatto: smoke E2E registra un secondo utente e verifica accesso negato o
  isolamento su bozza, immagini bozza, preferiti e notifiche del primo utente.
- Fatto: `/account` mostra riepilogo operativo, attivita prioritarie, profilo,
  azioni rapide, notifiche recenti, bozze e preferiti recenti.
- Fatto: smoke E2E verifica i contenuti chiave della dashboard account.
- Fatto: aggiunta lista owner `GET /contacts/me/received`, pagina
  `/account/contacts` e smoke su isolamento owner.
- Fatto: il client API frontend normalizza errori HTTP, rate limit e timeout in
  messaggi italiani user-facing per le schermate account.
- Da fare: valutare vista admin contatti solo se serve per audit/supporto.

Done:

- due utenti demo non possono leggere o modificare risorse reciproche e la UI
  espone impostazioni personali chiare, con errori account comprensibili.

## Milestone D - Ricerca pubblica e preferiti

Obiettivo: migliorare scoperta annunci e interazioni rapide.

Task:

- Fatto: rendere `/listings` una lista a card orizzontali, un annuncio per riga;
- Fatto: aggiungere cuore toggle per preferito con animazione e stato
  autenticato;
- Fatto: prevedere slot visivo per annuncio sponsorizzato in alto, con label
  chiara;
- Fatto: aggiungere carosello immagini sfogliabile nel dettaglio annuncio;
- mantenere filtri, SEO e performance della pagina lista;
- Fatto: aggiornare smoke per preferiti da lista con stato salvato/rimosso.

Done:

- un utente salva e rimuove preferiti cliccando il cuore, senza passare da form
  testuali o pagine secondarie.

## Milestone E - Contatti e notifiche

Obiettivo: chiudere il ciclo di comunicazione in modo privacy-first.

Task:

- Fatto: aggiungere consenso esplicito per condividere telefono del
  richiedente;
- Fatto: mantenere email proprietario nascosta nella UI pubblica;
- Fatto: implementare notifiche real-time applicative con fallback server/API
  solo per resilienza locale;
- Fatto: notificare proprietario su invio a revisione e contatto;
- Fatto: notificare proprietario su approvazione, con consegna real-time;
- Fatto: documentare limiti anti-abuso e preferenze contatto;
- Fatto: inbox account per richieste ricevute con email richiedente visibile
  solo dopo consenso;
- Fatto: documentare e implementare consenso granulare per telefono;
- documentare eventuali altri dati sensibili solo quando entrano nel prodotto.

Avanzamento 12 maggio 2026:

- Fatto: `listing_contact_requests` traccia `phone_shared`.
- Fatto: il form contatto pubblico abilita la condivisione telefono solo se il
  richiedente lo ha impostato nel profilo.
- Fatto: l'inbox owner `/account/contacts` mostra il telefono solo quando
  `phone_shared = true`.
- Fatto: lo smoke E2E copre richiesta contatto con consenso telefono e
  visibilita lato proprietario.
- Fatto: `GET /notifications/stream` espone SSE autenticato; Next proxy
  `/api/notifications/stream` usa il cookie sessione senza esporre bearer token
  al browser.
- Fatto: il provider frontend aggiorna badge account, mostra avviso live e
  rinfresca le viste account su eventi `created`, `read` e `read_all`.
- Fatto: lo smoke E2E apre lo stream notifiche e verifica l'evento real-time
  durante approvazione moderatore.
- Fatto: l'invio a revisione crea `listing_review_submission` per il
  proprietario.
- Fatto: una richiesta di contatto riuscita crea `listing_contact_request` per
  il proprietario e viene verificata via stream nello smoke.

Done:

- le notifiche importanti arrivano in locale e i contatti sensibili sono
  condivisi solo dopo consenso.

## Milestone F - Moderazione e admin separati

Obiettivo: avere una piattaforma interna protetta per revisione annunci.

Task:

- Fatto: separare visivamente e strutturalmente area admin/moderazione;
- Fatto: aggiungere ruoli demo moderatore e admin;
- migliorare code, filtri, dettaglio annuncio e template motivazioni;
- verificare MFA o requisito equivalente almeno come backlog hardening;
- aggiungere audit leggibile e test di accesso negato.

Avanzamento 12 maggio 2026:

- Fatto: il route group `(admin)` usa un layout interno dedicato, senza
  header/footer pubblici, con navigazione distinta, badge area interna e link
  rapidi verso sito pubblico e account.
- Fatto: la pagina `/moderation` e' presentata come dashboard moderazione
  server-rendered, protetta da login, `noindex` e collegata alle code API.
- Fatto: la dashboard moderazione espone un filtro operativo server-rendered
  per vedere tutte le code, solo `pending_review` o solo segnalazioni.
- Fatto: ogni card moderazione mostra un dettaglio operativo del caso con ID,
  ownership, stato ciclo, motivo apertura e riferimenti segnalazione quando
  presenti.
- Fatto: i motivi rapidi sono presentati come template orientati all'azione
  prevista: approva, rifiuta o sospendi.
- Fatto: lo smoke E2E verifica login admin, coda `pending_review` e presenza
  dello shell admin separato, filtro segnalazioni, dettaglio operativo,
  template motivazione e accesso negato per utente non moderatore.
- Da fare: aggiungere audit consultabile da UI.

Done:

- il moderatore demo approva/rifiuta/sospende annunci da UI locale protetta e
  l'utente riceve notifica.

## Milestone G - Scalabilita e readiness

Obiettivo: rendere il progetto pronto a staging chiuso e poi produzione.

Task:

- completare rate limit per upload, admin e flussi pubblici sensibili;
- aggiungere logging strutturato, trace id, metriche e alert;
- misurare ricerca e pagina lista su fixture realistiche;
- definire CI/CD, backup/restore e rollback;
- completare privacy, cookie, retention dati e hardening upload.

Done:

- staging chiuso con smoke post-deploy, dashboard operative e piano rollback.

## Prossimo round consigliato

Proseguire con Milestone F aggiungendo audit consultabile da UI e backlog
hardening MFA per ruoli interni.
