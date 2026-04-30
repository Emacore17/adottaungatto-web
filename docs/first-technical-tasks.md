# Primi task tecnici

## Task immediati

Stato aggiornato al completamento dello scaffolding iniziale:

1. Fatto: repository Git presente in `adottaungatto-web`.
2. Fatto: monorepo Next.js/shadcn creato.
3. Fatto: lock skill shadcn/ui presente.
4. Fatto: script root configurati.
5. Fatto: app `api` NestJS minima.
6. Fatto: app `worker` minima.
7. Fatto: TypeScript, ESLint e test configurati.
8. Fatto: `.env.example` e validazione env iniziale.
9. Fatto: `packages/db` configurato con Drizzle.
10. Fatto: prima migrazione con estensioni PostgreSQL:
    - `postgis`;
    - `unaccent`;
    - `pg_trgm`.
11. Fatto: schema iniziale per geografia, utenti, ruoli e annunci.
12. Fatto: seed ruoli e razze base.
13. Fatto: job import luoghi in modalita dry-run.
14. Fatto: endpoint health per API.
15. Fatto: test minimi per API e worker.

## Prossimi task tecnici

1. Fatto: collegare API a `packages/db` con dependency injection.
2. Fatto: health check database/Redis separati da `/health`.
3. Fatto: implementare staging e dry-run reale dell'import luoghi.
4. Fatto: promuovere lo staging luoghi nelle tabelle geografiche definitive.
5. Fatto: aggiungere endpoint API iniziale per autocomplete luoghi.
6. Fatto: importare o calcolare geometrie e centroidi da fonti territoriali ufficiali.
7. Fatto: aggiungere query distanza con PostGIS.
8. Fatto: aggiungere schema `listing_images` e tabelle di moderazione.
9. Fatto: aggiungere schema `user_roles` e `sessions` per avviare identita e profili.
10. Fatto: implementare modulo auth API iniziale: registrazione, login e sessioni.
11. Fatto: aggiungere guard auth riusabile e endpoint profilo utente.
12. Fatto: aggiungere update profilo utente e policy per cambio `profile_type`.
13. Fatto: implementare verifica email con token monouso e Mailpit in locale.
14. Fatto: implementare recupero password con token monouso.
15. Implementare cambio password autenticato e revoca sessioni correnti.

## Task da non fare ancora

- Marketplace completo.
- Area admin completa.
- Messaggistica interna.
- Pagamenti.
- App mobile.
- Kubernetes.
- Motore search dedicato.

## Prompt operativo consigliato

```text
Procedi con la milestone 1: inizializza il monorepo Next.js/shadcn come da MASTER.md,
aggiungi lo scheletro dell'app API NestJS, configura pnpm workspace, script base,
lint, typecheck e collegamento ai servizi Docker. Se un comando e' interattivo,
fermati e chiedimi conferma prima di eseguirlo.
```
