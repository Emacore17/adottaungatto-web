# adottaungatto.it

Monorepo per la piattaforma italiana di annunci per adozione responsabile di
gatti e gattini.

## Workspace

- `apps/web`: Next.js + shadcn/ui.
- `apps/api`: API NestJS/Fastify, con endpoint `GET /health`.
- `apps/worker`: worker TypeScript per job asincroni, con stub import luoghi.
- `packages/db`: schema Drizzle, client PostgreSQL e migrazioni.
- `packages/domain`: costanti e tipi di dominio condivisi.
- `packages/validation`: schemi Zod condivisibili.
- `packages/ui`: componenti shadcn/ui del template.
- `docs`: documentazione architetturale e ADR.

## Documentazione operativa

- [docs/project-state.md](docs/project-state.md): stato reale e gap principali.
- [docs/production-readiness.md](docs/production-readiness.md): cosa manca per
  la produzione.
- [docs/search-full-text-ranking.md](docs/search-full-text-ranking.md):
  specifica operativa per ricerca full-text, ranking e benchmark.
- [docs/search-benchmark-results.md](docs/search-benchmark-results.md):
  risultati locali dei benchmark ricerca.
- [docs/frontend-nextjs-shadcn-guidelines.md](docs/frontend-nextjs-shadcn-guidelines.md):
  linee guida per scaffolding frontend Next.js, shadcn/ui, SEO e agenti AI.
- [docs/local-testing-and-mocks.md](docs/local-testing-and-mocks.md): mock,
  fixture e prova locale.
- [docs/ops-monitoring-release.md](docs/ops-monitoring-release.md): ambienti,
  osservabilita, Dynatrace e CI/CD.
- [docs/agent-documentation-plan.md](docs/agent-documentation-plan.md): piano
  documentale per i prossimi lavori con agenti AI.

## Servizi locali

```bash
pnpm docker:up
pnpm db:migrate
pnpm dev
```

URL locali:

- Web: http://localhost:3000
- API health: http://localhost:4000/health
- API autocomplete luoghi: http://localhost:4000/places/autocomplete?q=Aosta
- API luoghi vicini: http://localhost:4000/places/nearby?lat=45.7496&lng=7.3063&radiusKm=10&type=municipality
- API annunci pubblici: `GET http://localhost:4000/listings`,
  `GET http://localhost:4000/listings?q=siamese%20roma&sort=relevance`,
  `GET http://localhost:4000/listings?lat=41.8931&lng=12.4828&radiusKm=25&sort=distance`,
  `GET http://localhost:4000/listings/:id`
- API auth: `POST http://localhost:4000/auth/register`,
  `POST http://localhost:4000/auth/login`,
  `POST http://localhost:4000/auth/email-verification/request`,
  `POST http://localhost:4000/auth/email-verification/verify`,
  `POST http://localhost:4000/auth/password-reset/request`,
  `POST http://localhost:4000/auth/password-reset/confirm`,
  `POST http://localhost:4000/auth/password/change`,
  `GET http://localhost:4000/auth/me`
- API profilo: `GET http://localhost:4000/users/me`,
  `PATCH http://localhost:4000/users/me`,
  `GET http://localhost:4000/users/me/notification-preferences`,
  `PATCH http://localhost:4000/users/me/notification-preferences`
- API bozze annunci utente: `GET http://localhost:4000/listings/me/drafts`,
  `POST http://localhost:4000/listings/me/drafts`,
  `POST http://localhost:4000/listings/me/drafts/:id/submit-review`,
  `POST http://localhost:4000/listings/me/drafts/:id/images/upload-url`,
  `POST http://localhost:4000/listings/me/drafts/:id/images/:imageId/confirm`,
  `GET http://localhost:4000/listings/me/drafts/:id`,
  `PATCH http://localhost:4000/listings/me/drafts/:id`,
  `DELETE http://localhost:4000/listings/me/drafts/:id`
- API moderazione: `GET http://localhost:4000/moderation/listings/pending-review`,
  `GET http://localhost:4000/moderation/listings/reported`,
  `POST http://localhost:4000/moderation/listings/cases/:caseId/approve`,
  `POST http://localhost:4000/moderation/listings/cases/:caseId/reject`,
  `POST http://localhost:4000/moderation/listings/cases/:caseId/suspend`
- API segnalazioni: `POST http://localhost:4000/reports/listings/:listingId`
- API preferiti: `GET http://localhost:4000/favorites/listings`,
  `POST http://localhost:4000/favorites/listings/:listingId`,
  `DELETE http://localhost:4000/favorites/listings/:listingId`
- API like: `GET http://localhost:4000/likes/listings/:listingId`,
  `POST http://localhost:4000/likes/listings/:listingId`,
  `DELETE http://localhost:4000/likes/listings/:listingId`
- API notifiche: `GET http://localhost:4000/notifications`,
  `GET http://localhost:4000/notifications/unread-count`,
  `POST http://localhost:4000/notifications/:notificationId/read`,
  `POST http://localhost:4000/notifications/read-all`
- MinIO console: http://localhost:9001
- Mailpit: http://localhost:8025

## Script principali

```bash
pnpm dev
pnpm build
pnpm test
pnpm lint
pnpm typecheck
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm geo:import
pnpm geo:import:apply
pnpm geo:promote
pnpm geo:promote:apply
pnpm geo:boundaries
pnpm geo:boundaries:apply
pnpm media:process
pnpm search:benchmark -- --size=10000
```

## Stato

La base della milestone 1 e' pronta: monorepo, API minima, worker minimo,
pacchetti condivisi, Docker locale, schema Drizzle iniziale, migrazione
verificata su PostgreSQL/PostGIS e seed iniziale per ruoli e razze.

La milestone 2 e' in corso: il worker esegue un dry-run reale sul permalink
Istat dei comuni italiani, puo' scrivere run e dati normalizzati nelle tabelle
di staging geografico e puo' promuovere lo staging nelle tabelle geografiche
definitive in modo idempotente. Importa inoltre geometrie e centroidi dai
confini amministrativi Istat 2026. Lo schema include anche immagini annuncio,
casi di moderazione, azioni di moderazione, segnalazioni, ruoli utente e
sessioni. L'API espone un primo modulo auth con registrazione, login, verifica
email via Mailpit, recupero password con token monouso, sessione corrente,
logout, cambio password autenticato con rotazione sessione, profilo utente
autenticato, update profilo con policy per `profile_type` e CRUD autenticato
delle bozze annuncio dell'utente con invio a moderazione e apertura caso
iniziale. Le bozze supportano upload session presigned verso MinIO locale per
immagini JPEG, PNG e WebP, conferma upload e processamento worker delle
varianti `large` e `thumb` in WebP. La moderazione dispone di una prima coda
autenticata per ruoli `moderator` e `admin`, con coda di revisione annunci,
coda segnalazioni e decisioni tracciate per approvazione, rifiuto e
sospensione. Gli utenti autenticati possono segnalare annunci pubblicati; la
segnalazione apre o riusa un caso di moderazione e viene collegata ad audit
log. Le decisioni di moderazione inviano email al proprietario dell'annuncio e,
quando presenti, agli utenti che hanno segnalato l'annuncio.
Le stesse decisioni creano anche notifiche in-app per proprietari e reporter,
con inbox autenticata, conteggio non lette e marcatura lettura.
Gli utenti autenticati possono salvare annunci pubblicati nei preferiti,
listarli e rimuoverli in modo idempotente.
Gli annunci pubblicati espongono anche un conteggio pubblico dei like; gli
utenti autenticati possono aggiungere o rimuovere il proprio like in modo
idempotente.
L'API espone una prima lista pubblica paginata degli annunci approvati e una
scheda pubblica per UUID, con ricerca `q` full-text e filtri per luogo, razza,
sesso, fascia eta, gratuitita, dati sanitari e presenza immagini.
La ricerca usa PostgreSQL con `listing_search_documents` quando il documento
indicizzato e' disponibile e mantiene un fallback inline per gli annunci non
ancora reindicizzati. Il ranking pubblico `postgres-v1` supporta sort
`relevance`, `recent` e `distance`, con distanza opzionale da `lat`/`lng`,
freschezza, qualita, trust ed engagement iniziale. Se la prima pagina
full-text non restituisce risultati, l'API usa un fallback trigram tracciato in
`meta.expansion` senza rimuovere i filtri espliciti. Il documento viene
aggiornato dopo moderazione, processing immagini e like/unlike. Il worker
include anche un benchmark locale per generare dataset sintetici di ricerca e
salvare EXPLAIN JSON delle query principali in `benchmark-results/search`.

Le funzionalita applicative complete non sono ancora implementate.
Gli utenti possono inoltre gestire preferenze email per notifiche non
essenziali di moderazione e segnalazioni; le email di sicurezza account restano
sempre attive.
