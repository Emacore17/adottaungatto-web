# Ambienti, osservabilita e rilascio

Questo documento definisce il target operativo per sviluppo, staging e
produzione.

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

- JSON logs in produzione;
- `requestId` e `traceId` su ogni richiesta;
- redazione di token, password, email quando non necessarie, header auth e dati
  personali sensibili;
- livelli `debug`, `info`, `warn`, `error`;
- nessun log di payload upload o contenuti privati;
- retention differenziata per audit e log tecnici.

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
2. typecheck;
3. lint;
4. test;
5. build;
6. generate/check migrazioni;
7. dependency scan e secret scan;
8. build immagini container;
9. push su registry;
10. deploy staging;
11. migrazioni staging;
12. smoke test staging;
13. approvazione manuale produzione;
14. deploy produzione;
15. migrazioni produzione controllate;
16. smoke test produzione;
17. annotazione release in Dynatrace.

## Migrazioni

Regole:

- ogni modifica schema deve avere migrazione Drizzle committata;
- non modificare migrazioni gia rilasciate;
- migrazioni distruttive solo con piano backfill e rollback;
- per tabelle grandi usare deploy in piu fasi: add nullable, backfill, enforce;
- eseguire migrazioni in staging prima della produzione;
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
