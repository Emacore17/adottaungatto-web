# Struttura consigliata del monorepo

## Obiettivo

La struttura deve accogliere il monorepo Next.js/shadcn richiesto dal prompt
master e aggiungere backend, worker, pacchetti condivisi e infrastruttura senza
forzare complessita prematura.

## Struttura proposta

```text
adottaungatto-it/
  apps/
    web/
      # Next.js, shadcn/ui, pagine pubbliche e area utente/admin
    api/
      # NestJS API backend
    worker/
      # Job asincroni: immagini, notifiche, import luoghi

  packages/
    ui/
      # Componenti shadcn/ui condivisi dal web
    config/
      # Config TypeScript, ESLint, Prettier, test
    db/
      # Schema Drizzle, migrazioni, seed, client database
    domain/
      # Tipi dominio condivisi e costanti stabili
    validation/
      # Schemi Zod condivisibili tra web e api
    testing/
      # Factory test, fixture e helper

  scripts/
    import-italian-places/
      # Script/job per import geografico

  infra/
    docker/
      # Config locali aggiuntive, init SQL, profili compose
    helm/
      # Fase futura

  docs/
    adr/
      # Architecture Decision Records

  docker-compose.yml
  .env.example
  pnpm-workspace.yaml
  package.json
```

## Note operative

- `apps/web` deve essere creato con il comando indicato nel prompt master.
- `apps/api` e `apps/worker` devono partire come scheletri minimi, non come
  implementazioni complete.
- `packages/db` deve essere l'unico punto proprietario di schema e migrazioni.
- `packages/domain` non deve dipendere da framework.
- `packages/validation` puo dipendere da Zod, ma deve rimanere indipendente da
  NestJS e Next.js.
- `infra/helm` resta vuota o documentale finche non serve davvero un deploy
  Kubernetes.

