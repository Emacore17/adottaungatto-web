# Stato attuale del progetto

Aggiornato al 12 maggio 2026.

Questo documento e' il riepilogo breve da leggere prima di avviare nuovi
sviluppi. Descrive lo stato reale del repository, non lo stato desiderato.

## Implementato

- Monorepo pnpm con app `web`, `api`, `worker` e pacchetti condivisi.
- Docker Compose locale con PostgreSQL/PostGIS, Redis, MinIO e Mailpit.
- Configurazione TypeScript, ESLint, Vitest, Turbo e Drizzle.
- Frontend Next.js `16.1.6`, React `19.2.4`, Tailwind CSS `4` e shadcn/ui
  monorepo `radix-vega`, con linee guida operative in
  `docs/frontend-nextjs-shadcn-guidelines.md`, configurazione centrale, route
  builder, client API tipizzato, layout pubblici/auth/account e SEO di base.
- Schema database con utenti, ruoli, sessioni, geografia, annunci, immagini,
  moderazione, report, notifiche, preferiti e like.
- Migrazioni Drizzle fino a `0016_futuristic_boomer.sql`.
- Seed iniziale per ruoli e razze.
- Import luoghi italiani e confini amministrativi Istat tramite worker.
- API health, health database e health Redis.
- Auth API con registrazione, login, logout, sessione corrente, verifica email,
  recupero password e cambio password autenticato.
- Rate limit Redis fixed-window iniziale sui flussi auth sensibili:
  registrazione, login, verifica email, recupero password e cambio password,
  con chiavi identificative hashate e risposta `429` con `retryAfterSeconds`.
- Profilo utente autenticato con update e preferenze email non essenziali,
  esposti anche dalla pagina `/account/settings`.
- CRUD bozze annuncio, invio a moderazione e upload immagini presigned.
- Worker per processamento immagini e varianti WebP, con loop automatico
  durante l'avvio dell'app `worker` e CLI one-shot `pnpm media:process`.
- Moderazione annunci e segnalazioni con code, decisioni e audit su
  `moderation_actions`.
- Email applicative via Mailpit locale e notifiche in-app.
- Preferiti e like per annunci pubblicati; la lista `/listings` e la scheda
  annuncio espongono un cuore toggle per salvare/rimuovere preferiti, con
  redirect al login se l'utente non e' autenticato.
- Contatto proprietario privacy-first con richiesta autenticata, inoltro email
  backend, tracciamento `listing_contact_requests`, rate limit dedicato e
  preferenza per-annuncio per abilitare/disabilitare il contatto, piu lista
  owner dei contatti ricevuti.
- Endpoint pubblici `GET /listings` e `GET /listings/:id` con filtri
  principali, ricerca full-text con `q` e documento denormalizzato
  `listing_search_documents` usato quando disponibile, piu promozione mock
  dichiarata per lo slot alto della lista.
- Endpoint pubblico `GET /listings/breeds` per alimentare i filtri razza del
  frontend.
- Ranking pubblico `postgres-v1` con sort `relevance`, `recent`, `distance`,
  distanza opzionale, freschezza, qualita, trust ed engagement iniziale; le
  promozioni attive sono separate dal punteggio organico e dichiarate nella
  risposta.
- Homepage pubblica server-rendered orientata alla ricerca, pagina lista
  annunci con filtri client isolati, scheda annuncio pubblica con metadata
  dinamici, JSON-LD, `robots.ts`, `sitemap.ts`, `not-found`, `loading` ed
  `error` iniziali.
- Area account server-rendered con dashboard `/account`, impostazioni profilo
  `/account/settings`, inbox contatti ricevuti `/account/contacts`, lista annunci in lavorazione
  `/account/listings/drafts`, lista preferiti `/account/favorites` e inbox
  notifiche `/account/notifications` collegate in lettura alle API autenticate,
  con mutazioni per aggiornare profilo/preferenze email, cancellare bozze,
  rimuovere preferiti e segnare notifiche come lette. Gli annunci in lavorazione
  hanno anche pagine frontend per creazione, modifica, upload immagine
  presigned, galleria immagini con stato, eliminazione, riordino/copertina,
  guida passaggi dati / foto / revisione, invio a revisione e conferma
  post-invio.
- Route group admin iniziale con pagina `/moderation` server-rendered,
  `noindex`, login obbligatorio, lettura delle code API `pending_review` e
  segnalazioni, e azioni base approva/rifiuta/sospendi con motivo obbligatorio;
  le autorizzazioni di ruolo restano applicate dalle API.
- Fallback trigram tracciato per la prima pagina di ricerche full-text senza
  risultati.
- Refresh del documento ricerca dopo decisioni di moderazione, processing
  immagini e like/unlike.
- CLI worker `pnpm search:benchmark` per generare dataset sintetici di ricerca,
  aggiornare `listing_search_documents` in bulk e salvare EXPLAIN JSON locali
  per query principali.
- Benchmark locali ricerca eseguiti su 10k e 100k annunci sintetici, con piani
  EXPLAIN salvati localmente e indici geography aggiunti per query distanza.
- Percorso demo locale con `pnpm demo:setup`, `pnpm dev:demo` e
  `pnpm demo:reset`: avvia servizi, applica migrazioni, crea dati demo e carica
  asset MinIO per account, annunci e code demo. Se la cartella locale
  `immagini-gattini/` esiste, `worker demo:assets` usa quelle foto come
  sorgente; altrimenti genera placeholder deterministici.
- Smoke test E2E locale `pnpm smoke:e2e` per health API, ricerca pubblica,
  auth, creazione annuncio, upload immagine, processing worker, invio a
  revisione, approvazione admin fino a pubblicazione visibile, preferiti con
  stato UI a cuore, update profilo/preferenze, like, contatto proprietario,
  inbox contatti ricevuti dal proprietario, notifiche, isolamento multi-utente
  su bozze, immagini, preferiti, notifiche e contatti ricevuti, contenuti
  chiave della dashboard account, pagine account autenticate, piu login admin e
  coda moderazione demo.

## Non pronto per produzione

Il progetto e' una base backend solida, ma non e' ancora rilasciabile in
produzione. Mancano almeno:

- hardening HTTP, rate limiting generalizzato e protezioni anti-abuso estese;
- cookie/sessioni browser production-grade e CSRF quando si useranno cookie;
- logging strutturato, trace id, metriche, alert e audit centralizzato;
- pipeline CI/CD e ambienti separati;
- backup/restore verificati e strategia rollback migrazioni;
- espansioni ricerca geografiche o filtri soft, benchmark 1M o realistici e
  refresh sul futuro update di annunci pubblicati;
- amministrazione completa e UI interna protetta;
- frontend applicativo oltre la consultazione pubblica: eventuali canali o
  finestre orarie per il contatto proprietario e amministrazione interna piu
  estesa;
- suite end-to-end completa e fixture dati realistiche oltre allo smoke locale;
- policy GDPR/privacy/cookie e retention dati.
- giro locale prodotto non ancora completo: demo con ruoli admin/moderatore,
  stati annuncio multipli, sponsorizzato mock, approvazione fino a
  pubblicazione e immagini realistiche locali avviati; restano da consolidare
  licenza/attribuzione degli asset reali se dovranno essere versionati.

## Stato ricerca

La ricerca pubblica attuale e' una lista SQL paginata con filtri principali e
query `q` full-text su PostgreSQL. Quando `q` e' presente usa
`listing_search_documents.search_vector` se disponibile, cade sul vettore
inline se l'annuncio non e' ancora indicizzato e ordina per rilevanza testuale
con ranking `postgres-v1`. Se la prima pagina full-text e' vuota, esegue un
fallback `pg_trgm` e lo dichiara in `meta.expansion`. Senza `q` ordina per
pubblicazione recente; con `lat`, `lng` e `sort=distance` filtra e ordina per
distanza. I filtri pubblici includono luogo, razza, sesso, fascia eta,
gratuita, fascia contributo, dati sanitari e presenza immagini. Il refresh e'
collegato a moderazione, immagini e like; resta da agganciare al futuro update
degli annunci pubblicati. Il CLI worker benchmark ha prodotto misure locali su
10k e 100k annunci sintetici, entrambe sotto le soglie iniziali documentate.
Mancano espansioni geografiche o filtri soft, benchmark limite 1M, fixture
realistiche e test di carico API.

## Stato sicurezza

Auth e autorizzazione sono avviate correttamente per una fase iniziale:

- bearer session token hashato lato server;
- ruoli base;
- ownership sulle risorse utente, coperta dallo smoke locale per bozze,
  immagini bozza, preferiti e notifiche;
- controllo ruoli su moderazione;
- token monouso hashati per email verification e reset password.

Prima della produzione servono tuning dei rate limit per ambiente, supporto
proxy fidato per l'IP client, copertura upload/admin, policy sessioni, cookie
sicuri se usati dal browser, log redatti, segreti gestiti da provider,
hardening upload, backup, alert e audit amministrativo piu esteso.

## Stato frontend

`apps/web` ha superato lo shell minimale: sono presenti configurazione env/site,
route builder, helper SEO, client API, gestione sessione cookie lato server,
layout pubblici/auth/account/admin, homepage pubblica, lista annunci, scheda
annuncio, proxy route per autocomplete/lista pubblica, sitemap, robots,
JSON-LD iniziali, cuore preferiti toggle su lista e scheda annuncio, dashboard
account operativa con riepilogo, attivita prioritarie, profilo, azioni rapide,
annunci in lavorazione, contatti ricevuti, preferiti e notifiche, pagina impostazioni
profilo/preferenze email, form contatto proprietario sulla scheda annuncio e
pagina `/moderation`
collegata alle code API con decisioni base motivate. L'area account supporta
rimozione preferiti, marcatura notifiche lette, cancellazione annunci in
lavorazione ed editor con creazione tramite "Inserisci annuncio", modifica,
upload immagine, galleria immagini con stato chiaro, eliminazione,
riordino/copertina, preferenza contatto per-annuncio, invio a revisione e
schermata di conferma. La schermata annuncio mostra un flusso guidato dati,
foto e revisione e disabilita l'invio finche' i passaggi richiesti non sono
pronti. Lo smoke locale copre anche upload immagine, processing worker e invio
a revisione. Restano incomplete eventuali preferenze contatto per canali o
finestre orarie e amministrazione interna piu estesa. I prossimi sviluppi
frontend devono continuare a seguire
`docs/frontend-nextjs-shadcn-guidelines.md`: route server by default, componenti
client solo come foglie interattive, configurazioni centralizzate, SEO prima
della UI avanzata e uso della CLI shadcn da `apps/web`.

## Stato demo locale

`pnpm dev:demo` e' disponibile ed e' il percorso di avvio consigliato. Oggi
prepara servizi Docker, migrazioni, seed base, 5 utenti demo, 15 annunci/casi
demo e 11 asset immagine. Gli account includono utente privato, rifugio,
associazione, moderatore e admin. Gli annunci coprono pubblicati,
`pending_review`, bozze, rifiutato, sospeso da segnalazione e scaduto. Il worker
processa automaticamente le immagini in `processing` durante l'avvio
applicativo, quindi il flusso locale standard non richiede piu' la CLI manuale.
Gli asset demo usano le foto locali in `immagini-gattini/` quando presenti e
cadono sui placeholder deterministici quando la cartella non esiste. La UI
renderizza le immagini storage senza passare dall'optimizer Next, per evitare il
blocco di `localhost:9000`/MinIO. La lista `/listings` usa card orizzontali, una
per riga, e mostra in cima un annuncio sponsorizzato mock con label dichiarata.
Lo smoke verifica anche URL storage diretti, approva un annuncio appena inviato
a revisione e controlla che sia pubblicato e notificato al proprietario.

## Regole per prossimi interventi

- Non introdurre nuove funzionalita senza aggiornare roadmap e documento di
  area.
- Per lavori documentali, non toccare codice applicativo salvo richiesta
  esplicita.
- Tenere ogni nuovo documento focalizzato su un solo scopo.
- Se un documento descrive futuro o backlog, marcarlo chiaramente come
  pianificato.
- Prima di chiudere un task eseguire almeno `pnpm typecheck`, `pnpm test`,
  `pnpm lint` e `git diff --check` quando sono stati toccati codice o schema;
  se i servizi locali sono avviati, eseguire anche `pnpm smoke:e2e`.
- A fine round committare le modifiche con un messaggio breve.
