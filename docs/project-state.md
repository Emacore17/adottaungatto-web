# Stato attuale del progetto

Aggiornato all'8 maggio 2026.

Questo documento e' il riepilogo breve da leggere prima di avviare nuovi
sviluppi. Descrive lo stato reale del repository, non lo stato desiderato.

## Implementato

- Monorepo pnpm con app `web`, `api`, `worker` e pacchetti condivisi.
- Docker Compose locale con PostgreSQL/PostGIS, Redis, MinIO e Mailpit.
- Configurazione TypeScript, ESLint, Vitest, Turbo e Drizzle.
- Scaffolding frontend Next.js `16.1.6`, React `19.2.4`, Tailwind CSS `4` e
  shadcn/ui monorepo `radix-vega`, con linee guida operative in
  `docs/frontend-nextjs-shadcn-guidelines.md`.
- Schema database con utenti, ruoli, sessioni, geografia, annunci, immagini,
  moderazione, report, notifiche, preferiti e like.
- Migrazioni Drizzle fino a `0013_elite_juggernaut.sql`.
- Seed iniziale per ruoli e razze.
- Import luoghi italiani e confini amministrativi Istat tramite worker.
- API health, health database e health Redis.
- Auth API con registrazione, login, logout, sessione corrente, verifica email,
  recupero password e cambio password autenticato.
- Profilo utente autenticato con update e preferenze email non essenziali.
- CRUD bozze annuncio, invio a moderazione e upload immagini presigned.
- Worker iniziale per processamento immagini e varianti WebP.
- Moderazione annunci e segnalazioni con code, decisioni e audit su
  `moderation_actions`.
- Email applicative via Mailpit locale e notifiche in-app.
- Preferiti e like per annunci pubblicati.
- Endpoint pubblici `GET /listings` e `GET /listings/:id` con filtri
  principali, ricerca full-text con `q` e documento denormalizzato
  `listing_search_documents` usato quando disponibile.
- Ranking pubblico `postgres-v1` con sort `relevance`, `recent`, `distance`,
  distanza opzionale, freschezza, qualita, trust ed engagement iniziale.
- Fallback trigram tracciato per la prima pagina di ricerche full-text senza
  risultati.
- Refresh del documento ricerca dopo decisioni di moderazione, processing
  immagini e like/unlike.
- CLI worker `pnpm search:benchmark` per generare dataset sintetici di ricerca,
  aggiornare `listing_search_documents` in bulk e salvare EXPLAIN JSON locali
  per query principali.
- Benchmark locali ricerca eseguiti su 10k e 100k annunci sintetici, con piani
  EXPLAIN salvati localmente e indici geography aggiunti per query distanza.

## Non pronto per produzione

Il progetto e' una base backend solida, ma non e' ancora rilasciabile in
produzione. Mancano almeno:

- hardening HTTP, rate limiting e protezioni anti-abuso;
- cookie/sessioni browser production-grade e CSRF quando si useranno cookie;
- logging strutturato, trace id, metriche, alert e audit centralizzato;
- pipeline CI/CD e ambienti separati;
- backup/restore verificati e strategia rollback migrazioni;
- espansioni ricerca geografiche o filtri soft, benchmark 1M o realistici e
  refresh sul futuro update di annunci pubblicati;
- amministrazione completa e UI interna protetta;
- scaffolding frontend applicativo: homepage reale, layout pubblici/account,
  client API tipizzato, SEO dinamica, sitemap/robots e gestione sessione
  browser;
- contatto proprietario con privacy by default;
- test end-to-end e fixture dati realistiche;
- policy GDPR/privacy/cookie e retention dati.

## Stato ricerca

La ricerca pubblica attuale e' una lista SQL paginata con filtri principali e
query `q` full-text su PostgreSQL. Quando `q` e' presente usa
`listing_search_documents.search_vector` se disponibile, cade sul vettore
inline se l'annuncio non e' ancora indicizzato e ordina per rilevanza testuale
con ranking `postgres-v1`. Se la prima pagina full-text e' vuota, esegue un
fallback `pg_trgm` e lo dichiara in `meta.expansion`. Senza `q` ordina per
pubblicazione recente; con `lat`, `lng` e `sort=distance` filtra e ordina per
distanza. Il refresh e' collegato a moderazione, immagini e like; resta da
agganciare al futuro update degli annunci pubblicati. Il CLI worker benchmark
ha prodotto misure locali su 10k e 100k annunci sintetici, entrambe sotto le
soglie iniziali documentate. Mancano espansioni geografiche o filtri soft,
benchmark limite 1M, fixture realistiche e test di carico API.

## Stato sicurezza

Auth e autorizzazione sono avviate correttamente per una fase iniziale:

- bearer session token hashato lato server;
- ruoli base;
- ownership sulle risorse utente;
- controllo ruoli su moderazione;
- token monouso hashati per email verification e reset password.

Prima della produzione servono rate limit, policy sessioni, cookie sicuri se
usati dal browser, log redatti, segreti gestiti da provider, hardening upload,
backup, alert e audit amministrativo piu esteso.

## Stato frontend

`apps/web` e' ancora uno shell Next.js minimale con tema e button shadcn. Il
prossimo sviluppo frontend deve partire da
`docs/frontend-nextjs-shadcn-guidelines.md`: route server by default, componenti
client solo come foglie interattive, configurazioni centralizzate, SEO prima
della UI avanzata e uso della CLI shadcn da `apps/web`.

## Regole per prossimi interventi

- Non introdurre nuove funzionalita senza aggiornare roadmap e documento di
  area.
- Per lavori documentali, non toccare codice applicativo salvo richiesta
  esplicita.
- Tenere ogni nuovo documento focalizzato su un solo scopo.
- Se un documento descrive futuro o backlog, marcarlo chiaramente come
  pianificato.
- Prima di chiudere un task eseguire almeno `pnpm typecheck`, `pnpm test`,
  `pnpm lint` e `git diff --check` quando sono stati toccati codice o schema.
