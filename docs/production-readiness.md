# Production readiness

Aggiornato al 14 maggio 2026.

Questo documento e' la checklist operativa per portare il repository in
produzione. Distingue tra:

- readiness del codice: build, test, migrazioni e smoke locali verdi;
- go-live pubblico: infrastruttura, provider, segreti, monitoraggio e policy
  legali configurati fuori dal repository.

## Stato attuale

Il codice applicativo e' allineato per una release candidate tecnica:

- monorepo pnpm/Turbo con `web`, `api`, `worker` e pacchetti condivisi;
- auth email/password con verifica email, reset password, cambio password,
  logout, revoca sessioni e cookie browser `HttpOnly`/`SameSite=Lax`;
- RBAC API centralizzato per moderazione tramite `RolesGuard`;
- origin check su Server Action e route handler mutative same-origin;
- rate limit Redis su auth, luoghi, ricerca pubblica, upload, contatti,
  utenti, notifiche, moderazione e limite globale API;
- cache contract centralizzato con tag Next e `Cache-Control` esplicito per
  endpoint pubblici, privati e storage proxy;
- immagini gestite via object storage, proxy web same-origin e fallback UI;
- ricerca PostgreSQL full-text/trigram/geografica con metriche aggregate;
- admin/moderazione con code separate, claim casi, azioni batch, note interne,
  segnalazioni e attivita recenti;
- lifecycle annunci con limiti per account, scadenza pubblicati e cleanup
  worker di bozze stale;
- health, readiness, metriche locali e alert locali API;
- demo locale ripetibile con dati, immagini e smoke end-to-end.

Non dichiarare il servizio pubblico finche' i gate esterni sotto non sono stati
eseguiti nell'ambiente reale.

## Comandi gate

Gate repository senza dipendenze esterne oltre al workspace:

```bash
pnpm release:check
```

Equivale a:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Gate locale completo con servizi Docker gia avviati e app in esecuzione:

```bash
pnpm release:smoke
```

Equivale a:

```bash
pnpm db:migrate
pnpm smoke:e2e
```

Prima di una release:

- `pnpm release:check` deve essere verde;
- le migrazioni devono essere applicate prima in staging;
- `pnpm release:smoke` deve passare su staging o ambiente equivalente;
- `git diff --check` deve essere pulito;
- il deploy deve avere rollback applicativo e piano di migrazione.

## Configurazione produzione

Usare `.env.production.example` come riferimento. In produzione:

- `APP_ENV=production`;
- URL pubblici devono essere HTTPS;
- `API_TRUST_PROXY=true` se API e' dietro proxy, load balancer o CDN;
- `TRUSTED_ACTION_ORIGINS` deve includere solo origin web autorizzati;
- database, Redis, mail e object storage devono essere provider reali;
- credenziali MinIO/locali non sono accettate;
- segreti devono provenire da secret manager o variabili ambiente del provider.
- `LISTING_LIMIT_DEFAULT_ACTIVE`, `LISTING_LIMIT_ORGANIZATION_ACTIVE`,
  `LISTING_PUBLISHED_TTL_DAYS`, `LISTING_STALE_DRAFT_TTL_DAYS` e
  `LISTING_LIFECYCLE_CLEANUP_INTERVAL_SECONDS` devono essere coerenti con la
  policy business approvata.

`loadApiEnv()` rifiuta configurazioni `production` che puntano a localhost o
usano i default locali MinIO/bucket.

## Sicurezza

Gia presente:

- session token hashati lato API;
- cookie browser sicuri in `production`;
- origin check per mutazioni web;
- RBAC per code e decisioni di moderazione;
- rate limit multi-chiave per endpoint sensibili;
- header di sicurezza web/API, HSTS in HTTPS production;
- validazione Zod sui payload pubblici e privati principali;
- audit moderazione su `moderation_actions`;
- private responses `no-store` su dati account/notifiche/favoriti.

Da chiudere come gate esterno o milestone immediata post-RC:

- MFA obbligatoria per `admin` e `moderator`;
- provider SMS reale o feature flag esplicito per verifica telefono;
- gestione sessioni attive da UI e revoca selettiva;
- secret scanning, dependency scanning e SAST in CI;
- DAST su staging;
- policy privacy/cookie/termini e procedure GDPR;
- retention differenziata per log tecnici, audit e dati personali.

## Osservabilita

Gia presente:

- `GET /health`;
- `GET /health/ready`;
- `GET /health/metrics`;
- `GET /health/alerts`;
- log JSON API per richieste HTTP con `requestId` e `traceId`;
- metriche aggregate ricerca pubblica senza query raw.

Per produzione:

- esportare metriche/traces/log a OpenTelemetry, Dynatrace o provider
  equivalente;
- creare dashboard p95/p99, error rate, throughput ricerca, Redis, database,
  storage e worker;
- alertare login falliti, rate limit anomali, errori 5xx, code worker, upload
  falliti e azioni admin ad alto rischio.

## Dati e migrazioni

Regole:

- ogni modifica schema deve avere migrazione Drizzle committata;
- non modificare migrazioni gia rilasciate;
- migrazioni distruttive solo con backfill, finestra manutenzione e rollback;
- backup e restore devono essere testati prima del go-live;
- applicare migrazioni in staging prima della produzione;
- registrare durata e output delle migrazioni critiche.

Le fixture demo sono solo locali. Non usare account o password demo in ambienti
pubblici.

## Performance e cache

Gia presente:

- cache Next con tag centralizzati;
- `Cache-Control` differenziato per dati pubblici, privati e storage;
- indici ricerca e immagini pronte;
- metriche aggregate di latenza ricerca.

Gate produzione:

- verificare Core Web Vitals su mobile per home, lista, dettaglio, login e
  moderazione;
- eseguire load test su ricerca, dettaglio annuncio, login, upload e code
  moderazione;
- calibrare rate limit e TTL cache su traffico reale;
- usare CDN per immagini pubbliche.

## Go-live checklist

1. `pnpm release:check` verde.
2. Migrazioni applicate e verificate in staging.
3. Smoke staging verde.
4. Backup/restore provati.
5. Variabili produzione validate con `APP_ENV=production`.
6. Segreti fuori dal repository.
7. Provider email, storage, Redis e database configurati.
8. OpenTelemetry/dashboard/alert attivi.
9. Rate limit calibrati.
10. Policy privacy/cookie/termini pubblicate.
11. Piano rollback e owner release definiti.
12. Smoke post-deploy produzione eseguito.
