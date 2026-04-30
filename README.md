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
- API auth: `POST http://localhost:4000/auth/register`,
  `POST http://localhost:4000/auth/login`,
  `POST http://localhost:4000/auth/email-verification/request`,
  `POST http://localhost:4000/auth/email-verification/verify`,
  `POST http://localhost:4000/auth/password-reset/request`,
  `POST http://localhost:4000/auth/password-reset/confirm`,
  `GET http://localhost:4000/auth/me`
- API profilo: `GET http://localhost:4000/users/me`,
  `PATCH http://localhost:4000/users/me`
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
logout, profilo utente autenticato e update profilo con policy per
`profile_type`.

Le funzionalita applicative complete non sono ancora implementate.
