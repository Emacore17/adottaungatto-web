# Readiness per produzione

Decisione attuale: il progetto non e' ancora pronto per produzione. Questa
checklist definisce cosa manca prima di un rilascio corretto.

## Gate minimi di rilascio

Prima della produzione devono essere verdi:

- typecheck, lint, test unitari e test integrazione;
- migrazioni applicate su staging e verificate;
- backup e restore testati;
- health check e readiness check separati;
- log strutturati e trace id propagati;
- rate limit sui flussi sensibili;
- segreti gestiti fuori dal repository;
- scansione dipendenze e immagini container;
- smoke test post-deploy;
- piano rollback documentato.

## Autenticazione e autorizzazione

La base e' corretta per sviluppo: sessioni bearer, token hashati, ruoli e
ownership. Mancano per produzione:

- cookie `HttpOnly`, `Secure`, `SameSite=Lax/Strict` se il frontend usera
  sessioni browser;
- CSRF per richieste state-changing basate su cookie;
- rotazione e scadenza sessioni configurabili per ambiente;
- revoke globale e gestione dispositivi/sessioni utente;
- rate limit iniziale presente su registrazione, login, verifica email, reset
  password, cambio password, upload immagini bozza e principali endpoint
  admin/moderazione; tuning base disponibile via `RATE_LIMIT_ENABLED`,
  `RATE_LIMIT_LIMIT_MULTIPLIER` e `RATE_LIMIT_WINDOW_MULTIPLIER`, da validare
  dietro proxy fidato e completare con altri flussi sensibili e lock
  progressivo account;
- protezione brute force e lock progressivo account;
- OAuth Google completo, se confermato;
- MFA almeno per admin e moderatori;
- audit log esplicito per azioni admin, cambio email, cambio ruoli e ban;
- gestione ruoli da area admin con principio del minimo privilegio.

## Sicurezza applicativa

Mancano:

- security headers e policy CORS per ambiente;
- validazione dimensione payload e timeout request;
- sanitizzazione contenuti testuali dove vengono renderizzati dal frontend;
- log redaction per email, token, header auth e dati personali;
- controllo MIME reale e magic bytes per upload;
- scansione malware o quarantena immagini;
- lifecycle policy e cancellazione sicura oggetti storage;
- dependency scanning, SAST e secret scanning in CI;
- DAST su staging;
- backup cifrati e retention definita;
- policy privacy, cookie, termini e gestione richieste GDPR.

## Frontend e SEO

Lo scaffolding Next.js e le prime viste pubbliche/account/admin esistono. Prima
di produzione servono:

- flusso inserimento annuncio completo e verificato con immagini;
- dashboard account e impostazioni profilo ordinate;
- preferiti con interazione rapida coerente tra lista e scheda;
- area admin/moderazione separata e protetta;
- pagine pubbliche Server Component con metadata, canonical, Open Graph e
  JSON-LD mantenute coerenti;
- `robots.ts` e `sitemap.ts` coerenti con ambienti e annunci pubblicati;
- gestione sessione browser con cookie sicuri e CSRF se si useranno mutazioni
  cookie-based;
- policy noindex per account, admin, preview e combinazioni search rumorose;
- verifica performance mobile, accessibilita e Core Web Vitals sulle route
  pubbliche principali.

Le convenzioni sono in
[frontend-nextjs-shadcn-guidelines.md](frontend-nextjs-shadcn-guidelines.md).

## Scalabilita

Il modular monolith e' adatto alla fase iniziale e puo servire un pubblico ampio
se resta stateless e se i servizi gestiti sono dimensionati correttamente.
Prima di dichiararlo scalabile servono:

- pool connessioni e PgBouncer o equivalente;
- worker separati e code robuste per email, immagini e job lenti;
- CDN davanti alle immagini;
- limiti upload iniziali e protezione costi storage da completare con valori
  calibrati per ambiente;
- cache breve per dati geografici e metadata pubblici;
- indici verificati con EXPLAIN su dataset realistici;
- load test su ricerca, dettaglio annuncio, login e upload;
- metriche p95/p99 per endpoint principali;
- strategia per replica lettura o motore search dedicato quando necessario.

## Ricerca

La ricerca e' il fulcro del prodotto. Oggi esiste una lista pubblica filtrabile
con query full-text `q`, ranking `postgres-v1` e documento denormalizzato
`listing_search_documents` con backfill iniziale e refresh sui flussi principali
di moderazione, immagini e like. Prossimi requisiti:

- refresh del documento ricerca sul futuro endpoint di modifica annunci
  pubblicati;
- filtri espliciti sempre applicati prima del ranking;
- espansioni geografiche o filtri soft per risultati vuoti, oltre al fallback
  trigram gia implementato;
- benchmark limite 1M o con fixture realistiche oltre ai 10k/100k sintetici gia
  eseguiti localmente;
- confronto periodico degli EXPLAIN JSON salvati per query principali;
- soglie p95: lista pubblica sotto 300 ms su dataset iniziale, sotto 500 ms con
  ranking e filtri complessi;
- test antiregressione sugli indici.

PostgreSQL puo gestire migliaia di annunci senza problemi se indicizzato e
misurato. Per centinaia di migliaia o ranking piu evoluto, valutare Typesense,
Meilisearch o OpenSearch con sincronizzazione event-driven.

La specifica tecnica del primo ranking PostgreSQL e' in
[search-full-text-ranking.md](search-full-text-ranking.md).

## Annunci sponsorizzati

Non sono implementati. Prima di svilupparli serve una policy prodotto:

- separazione chiara tra ranking organico e promozione;
- label visibile "sponsorizzato";
- budget, durata, targeting geografico e categoria;
- limiti per evitare saturazione dei risultati;
- audit delle impression e dei click;
- reportistica per inserzionisti;
- controllo moderazione prima di attivare la promozione;
- compatibilita con norme pubblicitarie e privacy.

## Profilo utente

Il profilo base esiste. Mancano:

- avatar e immagini profilo con moderazione;
- descrizione pubblica, tipo soggetto e dati associazione;
- eventuali canali aggiuntivi o finestre orarie per il contatto proprietario;
- estensione anti-abuso contatti oltre al primo rate limit dedicato;
- verifica telefono;
- gestione sessioni attive;
- cambio email;
- export/cancellazione dati personali;
- pagina pubblica profilo, se prevista.

## Moderazione e amministrazione

Moderazione backend avviata, area admin non completa. Prima della produzione:

- UI admin separata o sezione protetta non indicizzata;
- accesso solo per ruoli interni con MFA;
- audit completo e non modificabile;
- filtri coda, assegnazione casi e note interne;
- gestione utenti, sospensioni, ruoli e blocchi;
- template motivazioni versionati;
- strumenti anti-abuso e tuning dei rate limit amministrativi;
- protezione contro enumeration di risorse interne;
- log e alert sulle azioni ad alto rischio.

## Osservabilita attuale

La base locale include:

- interceptor API globale con `x-request-id` e `x-trace-id`;
- log JSON per richiesta senza body, header auth o payload upload;
- contatori HTTP in memoria per richieste, errori, status code e durate per
  route;
- `GET /health/ready` per readiness aggregata database/Redis;
- `GET /health/metrics` per snapshot locale verificata dallo smoke.

Prima della produzione restano necessari esportazione OpenTelemetry,
dashboard/alert reali, log redaction verificata in ambiente, retention e
correlazione con audit amministrativo.

## Decisione operativa

Rilasciare in produzione solo dopo una milestone dedicata di hardening. Prima
di quella milestone e' accettabile una demo locale o staging chiuso, non un
servizio pubblico.
