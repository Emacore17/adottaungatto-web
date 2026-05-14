# adottaungatto.it

Monorepo della piattaforma italiana per annunci di adozione responsabile di
gatti e gattini.

## Workspace

- `apps/web`: frontend Next.js.
- `apps/api`: API NestJS/Fastify.
- `apps/worker`: job asincroni per media, geografia e benchmark ricerca.
- `packages/db`: schema Drizzle, migrazioni e seed.
- `packages/domain`: costanti e tipi di dominio.
- `packages/validation`: schemi Zod condivisi.
- `packages/ui`: componenti UI condivisi.
- `docs`: documentazione tecnica e operativa.

## Avvio locale

```bash
pnpm install
pnpm dev:demo
```

`pnpm dev:demo` avvia l'infrastruttura Docker, applica migrazioni, prepara dati
demo, carica asset immagini e avvia web/API/worker.

Se database o MinIO locali sono incoerenti:

```bash
pnpm dev:demo -- --reset
```

Per ricreare solo infrastruttura e dati senza avviare i processi applicativi:

```bash
pnpm demo:fresh
```

URL locali:

- Web: http://localhost:3000
- API health: http://localhost:4000/health
- API readiness: http://localhost:4000/health/ready
- API metrics: http://localhost:4000/health/metrics
- MinIO console: http://localhost:9001
- Mailpit: http://localhost:8025

Account demo:

- `rifugio.torino@demo.adottaungatto.local`
- `volontari.italia@demo.adottaungatto.local`
- `marta.demo@demo.adottaungatto.local`
- `moderatore@demo.adottaungatto.local`
- `admin@demo.adottaungatto.local`

Password demo: `demo-password-123`

## Comandi principali

```bash
pnpm dev
pnpm build
pnpm test
pnpm lint
pnpm typecheck
pnpm release:check
pnpm release:smoke
pnpm db:migrate
pnpm db:seed
pnpm db:seed:demo
pnpm smoke:e2e
pnpm media:process
pnpm search:benchmark -- --size=10000
```

`pnpm release:check` esegue lint, typecheck, test e build dell'intero
workspace. `pnpm release:smoke` applica migrazioni e lancia lo smoke E2E locale
contro servizi e app gia attivi.

## Produzione

Usare `.env.production.example` come riferimento e non committare mai env reali.
Con `APP_ENV=production` l'API rifiuta configurazioni locali come localhost,
MinIO default o bucket locale.

Prima del go-live seguire [docs/production-readiness.md](docs/production-readiness.md).
La strategia concreta di deploy e' in
[docs/deploy-strategy.md](docs/deploy-strategy.md).
I gate minimi sono:

- `pnpm release:check` verde;
- migrazioni verificate in staging;
- smoke staging/post-deploy verde;
- segreti gestiti fuori dal repository;
- provider reali per database, Redis, mail, storage e osservabilita;
- backup/restore e rollback documentati.

## Documentazione

- [docs/README.md](docs/README.md): indice documentazione.
- [docs/production-readiness.md](docs/production-readiness.md): gate di
  produzione e checklist go-live.
- [docs/deploy-strategy.md](docs/deploy-strategy.md): stack cloud, CI/CD,
  segreti, costi e guida deploy.
- [docs/project-state.md](docs/project-state.md): stato reale del repository.
- [docs/local-development-docker.md](docs/local-development-docker.md): sviluppo
  locale con Docker.
- [docs/test-data.md](docs/test-data.md): dati demo e fixture.
- [docs/moderation.md](docs/moderation.md): moderazione e segnalazioni.
- [docs/search-full-text-ranking.md](docs/search-full-text-ranking.md): ricerca
  full-text/geografica e ranking.
- [docs/ops-monitoring-release.md](docs/ops-monitoring-release.md): ambienti,
  monitoraggio e rilascio.
