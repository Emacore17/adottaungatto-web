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
- [docs/agent-coding-roadmap.md](docs/agent-coding-roadmap.md): milestone
  operative per agenti di coding AI e traguardo locale finale.
- [docs/test-data.md](docs/test-data.md): contratto dati demo e fixture locali.
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

## Demo locale da zero

Per preparare infrastruttura, migrazioni, luoghi demo, annunci pubblicati,
asset immagini e avviare web/API/worker:

```bash
pnpm dev:demo
```

Account demo:

- `rifugio.torino@demo.adottaungatto.local`
- `volontari.italia@demo.adottaungatto.local`
- `marta.demo@demo.adottaungatto.local`

Password comune: `demo-password-123`

Per ricreare tutto da zero eliminando i volumi Docker locali:

```bash
pnpm demo:reset
pnpm dev:demo
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
pnpm db:seed:demo
pnpm demo:setup
pnpm demo:reset
pnpm dev:demo
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

Il progetto ha una base applicativa funzionante: monorepo pnpm, API NestJS,
worker, Next.js/shadcn, database PostGIS, auth, bozze annuncio, immagini,
moderazione iniziale, ricerca pubblica, preferiti, like, contatti, notifiche e
demo locale.

Non e' ancora completo come prodotto locale. I prossimi sviluppi seguono
`docs/agent-coding-roadmap.md`: completare dati demo, flusso "Inserisci
annuncio" con immagini e revisione, dashboard account, preferiti con cuore
toggle, lista annunci orizzontale con sponsorizzato mock e admin/moderazione
separati.

Il traguardo locale e': `pnpm dev:demo` + `pnpm smoke:e2e` devono produrre un
giro completo navigabile e verificabile con utenti, annunci, immagini,
moderazione e notifiche.
