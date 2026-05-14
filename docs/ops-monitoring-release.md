# Ambienti, osservabilita e rilascio

Questo documento definisce il target operativo per sviluppo, staging e
produzione.

La strategia concreta di hosting, CI/CD, segreti, costi e comandi di deploy e'
in [deploy-strategy.md](deploy-strategy.md).

## Ambienti

### local

- Docker Compose per servizi infrastrutturali.
- Web, API e worker avviati con pnpm.
- Mailpit e MinIO come servizi mock.
- Dati demo ripristinabili.

### test

- Usato da CI.
- Database effimero o container dedicato.
- Nessun accesso a servizi reali.
- Seed controllato e fixture deterministiche.

### staging

- Ambiente persistente simile alla produzione.
- Migrazioni reali.
- Provider email/storage configurati come prod o sandbox.
- Smoke test automatici dopo deploy.
- Dati sintetici o anonimizzati.

### production

- Segreti gestiti da secret manager.
- Database gestito con backup e point-in-time recovery.
- Redis gestito.
- Storage S3-compatible con lifecycle policy.
- CDN per immagini.
- Logging, metriche, tracing e alert attivi.

## Dynatrace e OpenTelemetry

La scelta consigliata e' strumentare con OpenTelemetry e inviare i segnali a
Dynatrace. Evitare coupling diretto nel dominio applicativo.

Segnali minimi:

- traces HTTP API;
- traces query database lente;
- traces job worker;
- metriche endpoint p50/p95/p99;
- error rate per endpoint;
- throughput ricerca;
- durata processamento immagini;
- code depth e job failure;
- metriche database e Redis;
- metriche storage e CDN;
- log strutturati correlati con trace id.

## Logging

Target:

- JSON logs in produzione; la base API locale produce gia log JSON per
  richiesta HTTP;
- `requestId` e `traceId` su ogni richiesta; la base API locale propaga gia
  `x-request-id` e `x-trace-id`;
- redazione di token, password, email quando non necessarie, header auth e dati
  personali sensibili;
- livelli `debug`, `info`, `warn`, `error`;
- nessun log di payload upload o contenuti privati;
- retention differenziata per audit e log tecnici.

Stato locale:

- `GET /health/ready` espone readiness aggregata database/Redis.
- `GET /health/metrics` espone metriche HTTP in memoria per richieste, errori,
  status code e durate per route.
- `GET /health/alerts` valuta alert locali su error rate, richieste in flight
  e p95 per route con soglie configurabili via env.
- `pnpm smoke:e2e` verifica header di correlazione, readiness, metriche e
  alert locali.
- Restano da collegare exporter OpenTelemetry, dashboard e alert gestiti dal
  provider operativo.

## Rate Limit Per Ambiente

La base API usa Redis fixed-window e accetta tuning operativo tramite:

- `RATE_LIMIT_ENABLED`;
- `RATE_LIMIT_LIMIT_MULTIPLIER`;
- `RATE_LIMIT_WINDOW_MULTIPLIER`.

I valori di default in `.env.example` mantengono il comportamento locale
attuale. In staging/produzione i valori vanno calibrati su traffico reale,
proxy fidato e alert anti-abuso.

## Alert Locali

La base API espone `GET /health/alerts` per verifiche locali e smoke. Le soglie
sono:

- `OBSERVABILITY_ALERT_ERROR_RATE_THRESHOLD`;
- `OBSERVABILITY_ALERT_IN_FLIGHT_THRESHOLD`;
- `OBSERVABILITY_ALERT_MIN_REQUESTS`;
- `OBSERVABILITY_ALERT_P95_MS_THRESHOLD`.

Queste soglie sono un ponte verso dashboard e alert provider-managed: in
staging/produzione gli stessi segnali vanno esportati tramite OpenTelemetry o
strumentazione equivalente.

## Alert

Alert minimi:

- API error rate sopra soglia;
- p95 ricerca sopra soglia;
- DB connection pool saturo;
- Redis non raggiungibile;
- fallimenti job immagini;
- coda email o notifiche bloccata;
- spazio storage in crescita anomala;
- migrazione fallita;
- login falliti anomali;
- azioni admin ad alto rischio.

## Pipeline CI/CD

Pipeline minima:

1. installazione con pnpm lockfile;
2. `pnpm release:check`;
3. generate/check migrazioni;
4. validazione env `APP_ENV=production`;
5. dependency scan e secret scan;
6. build immagini container;
7. push su registry;
8. deploy staging;
9. migrazioni staging;
10. smoke test staging;
11. approvazione manuale produzione;
12. deploy produzione;
13. migrazioni produzione controllate;
14. smoke test produzione;
15. annotazione release in Dynatrace o provider equivalente.

## Migrazioni

Regole:

- ogni modifica schema deve avere migrazione Drizzle committata;
- non modificare migrazioni gia rilasciate;
- migrazioni distruttive solo con piano backfill e rollback;
- per tabelle grandi usare deploy in piu fasi: add nullable, backfill, enforce;
- eseguire migrazioni in staging prima della produzione;
- applicare le migrazioni additive richieste dall'app prima di avviare nuove
  versioni di API o worker che leggono quelle tabelle;
- salvare output e durata delle migrazioni critiche.

## Deploy

Target iniziale consigliato:

- web come deployment Next.js o container;
- API come container stateless;
- worker come container separato;
- PostgreSQL/PostGIS gestito;
- Redis gestito;
- bucket S3-compatible;
- CDN per media pubblici.

Rollback:

- rollback applicativo rapido tramite immagine precedente;
- rollback migrazioni solo se esplicitamente previsto;
- feature flag per funzionalita rischiose;
- disattivazione worker o code come misura di contenimento.

## Documentazione di rilascio

Ogni release deve includere:

- versione o commit;
- migrazioni incluse;
- feature abilitate;
- variabili ambiente nuove o modificate;
- rischi noti;
- test eseguiti;
- piano rollback;
- link dashboard Dynatrace o equivalente.
