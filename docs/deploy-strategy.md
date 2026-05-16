# Strategia di deploy

Documento operativo per portare `adottaungatto.it` online in modo sicuro,
economico e scalabile. La strategia assume che il deploy venga guidato da un
agente AI eseguito da locale, con interventi espliciti dell'utente solo quando
servono credenziali, approvazioni, billing o decisioni non delegabili.

Data verifica prezzi e servizi: 14 maggio 2026.

## Obiettivi

- Pubblicare l'app in tutta Italia con latenza bassa e dati in area UE.
- Tenere basso il costo iniziale senza bloccare la scalabilita futura.
- Separare sviluppo locale, ambiente online per sviluppatori e produzione.
- Rendere il deploy ripetibile da CLI e da pipeline CI/CD.
- Proteggere produzione con approvazione manuale e rollback documentato.
- Separare e proteggere fortemente admin/moderazione.
- Mantenere log, metriche, trace e alert utili fin dal primo go-live.

## Stack scelto

La scelta consigliata e':

- GitHub per repository, pull request, branch protection e GitHub Actions.
- Azure Italy North come cloud primario per compute, database, secret e
  registry.
- Azure Container Apps Consumption per `web`, `api` e `worker`.
- Azure Container Registry Basic per immagini container private.
- Azure Database for PostgreSQL Flexible Server con PostGIS.
- Azure Key Vault per segreti runtime.
- Redis gestito. Scelta iniziale:
  - dev-online: Upstash Redis free/pay-as-you-go oppure Azure Redis Basic C0;
  - production: Azure Redis Standard C0 se il budget lo consente, Basic C0 solo
    accettando esplicitamente il rischio di assenza SLA.
- Cloudflare per DNS, CDN, WAF base, protezione admin e R2 object storage.
- Cloudflare R2 come storage S3-compatible per immagini e asset utente.
- Provider email transazionale: Resend o Brevo per MVP, SendGrid/Mailgun se
  servono SLA e deliverability enterprise.
- Twilio Verify o provider equivalente solo quando la verifica telefono deve
  inviare SMS/WhatsApp reali. Fino ad allora la verifica telefono resta
  controllata via codice server e provider mock/local.
- OpenTelemetry come standard di strumentazione.
- Dynatrace SaaS per osservabilita production se il budget lo permette;
  altrimenti avvio con Azure Monitor/Application Insights mantenendo output
  OpenTelemetry compatibile con Dynatrace.

Motivo: Azure copre Key Vault, Container Apps, Postgres gestito, regione in
Italia, OIDC con GitHub e crescita futura. Cloudflare riduce costi e rischio su
DNS/CDN/admin/accesso, mentre R2 evita costi di egress sugli asset pubblici.

## Ambienti

### local

Uso: sviluppo quotidiano.

- Docker Compose: Postgres/PostGIS, Redis, MinIO, Mailpit.
- App avviate con `pnpm dev:demo` o `pnpm dev`.
- Seed e dati demo ripristinabili.
- Nessun segreto reale.

### dev-online

Uso: ambiente online per sviluppatori, molto vicino alla produzione.

- Trigger: merge su `develop` e, opzionalmente, preview per PR verso `develop`.
- Accesso: Cloudflare Access o allowlist utenti sviluppatori.
- Dati: sintetici, demo o anonimizzati; mai dump produzione in chiaro.
- Provider: stessi servizi della produzione dove costa poco; sandbox dove
  serve.
- Scopo: verificare flussi reali, domini, HTTPS, storage, mail, immagini,
  auth, moderazione e smoke post-deploy.

#### Stato dev-online - primo deploy

Aggiornato il 16 maggio 2026.

- Commit deployato: `b774d14c5987c3e7ff362a261fbf15aa22845fae`.
- CI: GitHub Actions `ci.yml` run `25960255733`, esito `success`.
- Deploy: GitHub Actions `deploy-dev.yml` run `25960255717`, esito `success`.
- Web temporaneo:
  `https://ca-adotta-dev-web.purpletree-ad0ff43a.italynorth.azurecontainerapps.io`.
- API temporanea:
  `https://ca-adotta-dev-api.purpletree-ad0ff43a.italynorth.azurecontainerapps.io`.
- Media temporaneo:
  `https://pub-7e18477ae9734ea7b8f6cc21bee5810b.r2.dev`.
- Resource group: `rg-adotta-dev-itn`, regione `italynorth`.
- Risorse Azure create: `acradottadev`, `kv-adotta-dev-itn`,
  `workspace-rgadottadevitnMMfW`, `cae-adotta-dev-itn`,
  `psql-adotta-dev-itn`, `redis-adotta-dev-itn`, `id-adotta-dev-pull`,
  `ca-adotta-dev-api`, `ca-adotta-dev-worker`, `ca-adotta-dev-web`.
- Database: PostgreSQL Flexible Server 16, database `adottaungatto`,
  estensioni allow-listed `postgis`, `pg_trgm`, `unaccent`,
  `pg_stat_statements`, `pgcrypto`.
- Redis: Azure Redis Basic C0 `redis-adotta-dev-itn`.
- Storage: Cloudflare R2 bucket `adotta-dev-assets`, location `EEUR`, con
  endpoint pubblico `r2.dev` temporaneo.
- Segreti presenti in Key Vault, senza valori: `DATABASE-URL`, `REDIS-URL`,
  `S3-ACCESS-KEY-ID`, `S3-SECRET-ACCESS-KEY`.
- GitHub Environment `dev-online`: OIDC Azure configurato; variabili R2, mail
  placeholder e `USE_CUSTOM_DOMAINS=false` configurate.
- Smoke remoto manuale: `REMOTE_SMOKE_OK` contro gli URL Azure generati.
- Health API: `/health` HTTP 200; `/health/ready` HTTP 200 con database e
  Redis `ok`.
- Dati demo: seed applicato, 8 annunci pubblicati interrogabili da API.
- Asset demo: 33 oggetti `demo/listings/*` caricati e verificati su R2; route
  web `/api/storage/demo/listings/artu-thumb.png` HTTP 200 `image/png`.
- Moderazione: `/moderation` sul FQDN web Azure ritorna HTTP 404, come atteso
  per host non admin.
- Log: ultimi log API, web e worker senza errori ricorrenti; API mostra
  richieste health/listings HTTP 200 e worker `status=ok`.
- Budget: budget Azure mensile `budget-adotta-dev-online` configurato a 70 USD
  con soglie 50%, 80% e 100%.

Problemi aperti:

- `adottaungatto.it` non e' ancora disponibile in Cloudflare: custom domain
  dev, DNS, Cloudflare Access e `media-dev.adottaungatto.it` restano bloccati.
- Gli URL Azure e `r2.dev` sono endpoint gratuiti/temporanei, non il perimetro
  finale protetto da Cloudflare Access.
- Email non pronta: `MAIL_HOST=smtp.invalid` e `MAIL_FROM` placeholder; i flussi
  che inviano email falliscono finche non viene configurato un provider SMTP
  reale supportato dall'app.
- PostgreSQL dev-online ha accesso pubblico abilitato per permettere migrazioni
  da GitHub Actions; da restringere quando sara disponibile una strategia di
  networking o allowlist stabile.
- GitHub Actions mostra warning non bloccante sulla deprecazione Node.js 20 per
  alcune actions.

### production

Uso: utenti reali.

- Trigger: PR `develop -> main` e approvazione manuale su GitHub Environment
  `production`.
- Dati reali isolati da dev-online.
- Backup, restore testato, alert e logging attivi.
- Deploy protetto da verifiche automatiche e manuali.

## Branching e promozione

Flusso standard:

1. Lo sviluppatore parte da `develop`.
2. Crea branch `feature/<nome>` o `fix/<nome>`.
3. Apre PR verso `develop`.
4. La PR esegue CI completa.
5. Opzionale: la PR puo' creare una preview online protetta.
6. Merge su `develop` deploya automaticamente `dev-online`.
7. Verifica su `dev-online`.
8. PR da `develop` verso `main`.
9. CI, diff migrazioni, smoke `dev-online` e review manuale.
10. Merge/approval su `main` prepara il deploy produzione.
11. GitHub Environment `production` richiede approvazione manuale.
12. Deploy produzione, migrazioni controllate, smoke e annotazione release.

Regole repository:

- `develop` protetto: PR obbligatoria, `release:check` verde, niente push
  diretti.
- `main` protetto: PR solo da `develop`, reviewer obbligatorio, ambiente
  `production` con approvazione manuale.
- Segreti mai nel repository.
- Migrazioni gia rilasciate non si modificano.
- Ogni release indica commit, migrazioni, variabili nuove, test, rischi e
  rollback.

## Ruolo dell'agente AI locale

L'agente AI puo' eseguire:

- installazione CLI;
- controlli locali `pnpm release:check` e `pnpm release:smoke`;
- creazione branch e PR con `gh`;
- build immagini;
- creazione risorse cloud con `az`, `gh`, `wrangler`;
- configurazione secret se l'utente li inserisce in modo sicuro;
- avvio deploy dev/prod;
- monitoraggio workflow e log;
- rollback applicativo;
- aggiornamento documentazione.

L'agente AI non deve:

- ricevere password o token in chat;
- salvare segreti in file locali non cifrati;
- approvare produzione al posto dell'utente;
- disabilitare branch protection;
- cancellare dati o risorse produzione senza conferma esplicita;
- usare seed/demo su produzione.

Intervento utente obbligatorio:

- creare o confermare account Azure, Cloudflare, GitHub, Dynatrace, email/SMS;
- completare login interattivi `az login`, `gh auth login`, `wrangler login`
  quando richiesto;
- confermare subscription Azure e budget;
- registrare o delegare dominio `adottaungatto.it`;
- inserire DNS records richiesti;
- creare credenziali OAuth Google e redirect URI;
- inserire segreti reali in Key Vault o GitHub Environment;
- approvare manualmente deploy produzione;
- accettare costi ricorrenti e soglie budget;
- confermare qualsiasi operazione distruttiva su produzione.

## Architettura runtime

Domini consigliati:

- `www.adottaungatto.it`: sito pubblico.
- `api.adottaungatto.it`: API pubblica.
- `media.adottaungatto.it`: asset pubblici da Cloudflare R2/CDN.
- `admin.adottaungatto.it`: area admin/moderazione.
- `dev.adottaungatto.it`: dev-online pubblico solo dietro accesso
  sviluppatori.
- `api-dev.adottaungatto.it`: API dev-online.
- `admin-dev.adottaungatto.it`: admin dev-online.

Componenti:

- `web`: Next.js, Container App stateless.
- `api`: NestJS, Container App stateless.
- `worker`: processi asincroni, media processing, ricerca/geo jobs.
- PostgreSQL/PostGIS: dati applicativi, ricerca full-text e geografia.
- Redis: rate limit, realtime/SSE, cache operativa.
- R2: immagini originali e derivate.
- Mail provider: reset password, notifiche, verifica email.
- SMS provider: verifica telefono quando abilitata.
- Dynatrace/Azure Monitor: metriche, log, trace, alert.

### DNS e TLS

Cloudflare deve gestire DNS e protezione edge, ma bisogna evitare conflitti con
i certificati di Azure Container Apps:

- se si usano certificati gestiti da Container Apps, il CNAME deve puntare
  direttamente al dominio generato da Azure e non a un CNAME intermedio proxato;
- durante issuance/rinnovo certificato puo' essere necessario mettere il record
  Cloudflare in modalita DNS-only;
- se si vuole tenere Cloudflare proxy sempre attivo, preferire certificato
  custom sull'origine Container Apps o una configurazione origin compatibile con
  Cloudflare Full Strict;
- documentare per ogni dominio chi termina TLS: Cloudflare edge, Azure origin o
  entrambi;
- non usare mai modalita Cloudflare Flexible in produzione.

### Admin/moderazione

L'area admin deve essere trattata come applicazione interna:

- sottodominio dedicato `admin.adottaungatto.it`;
- Cloudflare Access obbligatorio con MFA e allowlist email;
- WAF/rate limit dedicati;
- blocco di `/moderation` sui domini pubblici;
- ruoli applicativi `admin`/`moderator` sempre verificati lato API;
- audit log per decisioni, claim, commenti interni e azioni sensibili;
- niente indicizzazione (`noindex`);
- sessioni brevi per admin;
- alert su login falliti e azioni ad alto rischio.

Nota tecnica: il codice attuale espone la moderazione nel web principale. Prima
del go-live pubblico va aggiunta una protezione host-level: le route
`/moderation` devono rispondere solo da `admin.*` o da `admin-dev.*`, mentre il
dominio pubblico deve redirigere o restituire 404/403.

## CI/CD

### Workflow `ci.yml`

Trigger:

- PR verso `develop`;
- PR verso `main`;
- push su `develop` e `main`.

Step:

1. checkout;
2. setup Node e pnpm;
3. installazione con lockfile;
4. `pnpm release:check`;
5. controllo migrazioni Drizzle presenti;
6. secret scan;
7. dependency scan;
8. build immagini container senza push;
9. upload artifact/report.

### Workflow `deploy-dev.yml`

Trigger:

- push su `develop`;
- `workflow_dispatch` per rilancio manuale.

Step:

1. usa GitHub Environment `dev-online`;
2. login Azure via OIDC, non password;
3. build immagini `web`, `api`, `worker`;
4. push su Azure Container Registry;
5. esegue migrazioni sul database dev-online;
6. aggiorna Container Apps dev;
7. esegue smoke su `dev-online`;
8. pubblica link release e log.

### Workflow `deploy-prod.yml`

Trigger:

- push su `main`;
- `workflow_dispatch` con commit/tag.

Protezione:

- GitHub Environment `production`;
- reviewer obbligatorio;
- nessun deploy automatico senza approvazione;
- controllo che commit sia contenuto in `main`;
- controllo che `develop` o staging abbiano gia passato smoke.

Step:

1. `pnpm release:check`;
2. build e push immagini immutabili taggate con SHA;
3. backup database o verifica PITR attivo;
4. preflight env production;
5. migrazioni produzione;
6. deploy API/worker/web;
7. smoke produzione;
8. annotazione release in Dynatrace;
9. notifica esito.

### Workflow `rollback-prod.yml`

Trigger:

- solo `workflow_dispatch`;
- GitHub Environment `production` con approvazione.

Step:

1. seleziona SHA immagine precedente;
2. verifica compatibilita migrazioni;
3. aggiorna Container Apps;
4. smoke produzione;
5. annota rollback.

Le migrazioni distruttive non devono essere rollbackate automaticamente. Per
queste serve runbook dedicato.

## Segreti e configurazione

### Dove stanno i segreti

- GitHub Environment secrets: solo credenziali necessarie alla pipeline, meglio
  OIDC senza secret statici.
- Azure Key Vault: segreti runtime per app.
- Cloudflare dashboard/Secrets: token R2 e Access.
- Dynatrace: token ingest in Key Vault o GitHub Environment.

Non committare mai `.env.production`.

### Nomi ambiente

Usare prefissi espliciti:

- `adotta-dev-*` per dev-online;
- `adotta-prod-*` per produzione.

Resource group:

- `rg-adotta-dev-itn`;
- `rg-adotta-prod-itn`.

Key Vault:

- `kv-adotta-dev-itn`;
- `kv-adotta-prod-itn`.

Container Registry:

- `acradottadev`;
- `acradottaprod`.

### Secret runtime minimi

API:

- `APP_ENV=production`;
- `APP_URL=https://www.adottaungatto.it`;
- `API_URL=https://api.adottaungatto.it`;
- `DATABASE_URL`;
- `REDIS_URL`;
- `S3_ENDPOINT`;
- `S3_PUBLIC_ENDPOINT=https://media.adottaungatto.it`;
- `S3_BUCKET`;
- `S3_REGION=auto` o valore R2/Azure scelto;
- `S3_ACCESS_KEY_ID`;
- `S3_SECRET_ACCESS_KEY`;
- `MAIL_HOST`;
- `MAIL_PORT`;
- `MAIL_FROM`;
- eventuali credenziali SMTP/API provider email;
- `GOOGLE_CLIENT_ID`;
- `GOOGLE_CLIENT_SECRET`;
- `TRUSTED_ACTION_ORIGINS=https://www.adottaungatto.it,https://admin.adottaungatto.it`;
- `API_TRUST_PROXY=true`;
- `RATE_LIMIT_ENABLED=true`;
- `API_GLOBAL_RATE_LIMIT_PER_MINUTE`;
- `OTEL_EXPORTER_OTLP_ENDPOINT`;
- `OTEL_EXPORTER_OTLP_HEADERS`.

Web:

- `APP_ENV=production`;
- `NEXT_PUBLIC_SITE_URL=https://www.adottaungatto.it`;
- `NEXT_PUBLIC_API_URL=https://api.adottaungatto.it`;
- `API_INTERNAL_URL` verso API interna Container Apps se disponibile;
- `NEXT_PUBLIC_S3_PUBLIC_ENDPOINT=https://media.adottaungatto.it`;
- `NEXT_PUBLIC_S3_BUCKET`;
- `TRUSTED_ACTION_ORIGINS=https://www.adottaungatto.it,https://admin.adottaungatto.it`;

Admin web separato, se deployato come container dedicato:

- `NEXT_PUBLIC_SITE_URL=https://admin.adottaungatto.it`;
- `ADMIN_HOST_ONLY=true`;
- `TRUSTED_ACTION_ORIGINS=https://admin.adottaungatto.it`.

## Database

Scelta iniziale:

- Azure Database for PostgreSQL Flexible Server;
- regione `italynorth` se tutte le feature richieste sono disponibili;
- Postgres 16 o 17;
- PostGIS abilitato;
- dev-online e production separati;
- backup 7 giorni dev, 14-35 giorni prod;
- PITR attivo;
- SSL obbligatorio;
- utenti DB separati per app e migrazioni;
- niente accesso pubblico in prod se e' possibile usare networking privato.

Dimensionamento iniziale:

- dev-online: Burstable B1ms, storage minimo, backup 7 giorni.
- production MVP: Burstable B1ms o B2ms, storage 32-64 GB, backup 14 giorni.
- production con traffico: General Purpose 2 vCore, storage autoscale,
  `pg_stat_statements`, alert su CPU, IOPS, connessioni e query lente.

Estensioni:

- `pgcrypto`;
- `postgis`;
- `pg_trgm`;
- `unaccent` se usata dalla ricerca;
- `pg_stat_statements` per tuning produzione.

Regola dati:

- `dev-online` non deve contenere dati personali reali.
- Dump produzione solo anonimizzato.
- Backup produzione cifrati e accessibili solo a ruoli operativi.

## Cache, rate limit ed eventi

### Redis

Uso attuale:

- rate limit applicativo;
- realtime/notifiche;
- cache operativa dove necessario.

Strategia:

- dev-online: Upstash o Azure Basic C0 per costo minimo.
- prod MVP: Azure Redis Standard C0 se si vuole SLA e ridondanza base.
- prod budget estremo: Azure Basic C0, ma va scritto nel registro rischi.
- crescita: Azure Managed Redis o Premium con private networking e persistence,
  se Redis diventa componente critico.

Rate limit:

- Cloudflare WAF/rate limit per bordo pubblico;
- API rate limit Redis per login, reset password, upload, preferiti,
  notifiche, moderazione;
- soglie diverse dev/prod;
- alert su 429 anomali.

### Eventi

Fase 1:

- eventi applicativi persistiti su database dove serve audit;
- notifiche in-app e stream real-time su infrastruttura esistente;
- worker separato per job.

Fase 2, se traffico cresce:

- pattern outbox su Postgres;
- coda gestita Azure Service Bus o Redis Streams;
- idempotenza su job;
- dead-letter queue;
- dashboard code e retry.

## Asset e immagini

Scelta:

- Cloudflare R2 come storage S3-compatible.
- Bucket separati `adotta-dev-assets` e `adotta-prod-assets`.
- Dominio pubblico `media.adottaungatto.it`.
- CDN/cache Cloudflare davanti agli asset.

Regole:

- bucket non pubblico in scrittura;
- upload solo con URL firmate generate dall'API;
- worker produce preview/derivati;
- originali e derivati hanno naming stabile;
- lifecycle policy per file temporanei e upload non confermati;
- backup o replica R2 da valutare quando gli asset diventano business-critical;
- cache headers lunghi per immagini versionate;
- purge mirato solo se serve.

Rischio costo:

- R2 non addebita egress, ma addebita operazioni. Con traffico alto su immagini
  bisogna massimizzare cache hit Cloudflare e controllare Class B operations.

## Auth e sicurezza

Applicativo:

- cookie sicuri in produzione;
- `APP_ENV=production` blocca configurazioni locali;
- origin check su azioni mutative;
- RBAC API per moderazione/admin;
- password reset via email;
- verifica telefono solo con provider reale in produzione;
- nessun codice telefono esposto/loggato fuori da local/test.

Cloud:

- GitHub OIDC verso Azure, niente password cloud statiche;
- Key Vault con RBAC;
- Managed Identity per Container Apps;
- secret rotation trimestrale o su incidente;
- accesso prod con least privilege;
- MFA obbligatorio per GitHub, Azure, Cloudflare, Dynatrace, email provider;
- branch protection e environment protection obbligatorie.

Admin:

- Cloudflare Access con MFA;
- allowlist utenti interni;
- sessione corta;
- audit log;
- alert login falliti;
- blocco route admin su dominio pubblico.

## Logging, monitoraggio e osservabilita

### Segnali minimi

- request logs JSON con `requestId` e `traceId`;
- error rate per route;
- p50/p95/p99 API;
- latency ricerca;
- query lente DB;
- job worker falliti;
- code depth;
- upload/processamento immagini;
- Redis hit/miss e errori;
- rate limit 429;
- login falliti;
- azioni moderazione/admin;
- consumo R2;
- costi giornalieri.

### Dynatrace

Modalita consigliata:

- strumentare con OpenTelemetry;
- esportare trace, metriche e log verso Dynatrace;
- annotare ogni release;
- dashboard separate dev/prod;
- alert production only per eventi ad alta priorita.

Se il budget iniziale non consente Dynatrace:

- partire con Azure Monitor/Application Insights;
- mantenere OpenTelemetry;
- abilitare Dynatrace appena il traffico o il rischio operativo lo giustifica.

Retention:

- dev-online: log 7 giorni;
- production: log tecnici 30 giorni;
- audit moderazione/security: 180-365 giorni secondo requisiti legali e policy
  privacy.

## Costi indicativi

I prezzi sotto sono indicativi e in USD, verificati il 14 maggio 2026 su fonti
ufficiali o Azure Retail Prices API. I prezzi reali dipendono da regione,
contratto, valuta, traffico e sconti. Prima dell'acquisto usare sempre Azure
Pricing Calculator e dashboard provider.

### Prezzi unitari utili

| Voce | Prezzo indicativo | Fonte |
| --- | ---: | --- |
| Azure Container Apps Consumption | 180.000 vCPU-s, 360.000 GiB-s e 2M richieste/mese incluse; poi pay-per-use | Azure Container Apps pricing |
| ACA Italy North vCPU active | circa 0,000034 USD/s | Azure Retail Prices API |
| ACA Italy North vCPU idle | circa 0,000004 USD/s | Azure Retail Prices API |
| ACA Italy North memory active/idle | circa 0,000004 USD/GiB-s | Azure Retail Prices API |
| ACA richieste | circa 0,40 USD per 1M richieste oltre free grant | Azure Retail Prices API |
| Azure PostgreSQL Flexible B1ms Italy North | circa 0,0199 USD/h, circa 14,5 USD/mese | Azure Retail Prices API |
| Azure PostgreSQL storage Italy North | circa 0,1369 USD/GB-mese | Azure Retail Prices API |
| Azure Redis Basic C0 Italy North | circa 0,022 USD/h, circa 16 USD/mese | Azure Retail Prices API |
| Azure Redis Standard C0 Italy North | circa 0,055 USD/h, circa 40 USD/mese | Azure Retail Prices API |
| Azure Container Registry Basic | circa 0,1666 USD/giorno, circa 5 USD/mese | Azure Retail Prices API |
| Azure Key Vault Standard operations | circa 0,03 USD per 10K operazioni | Azure Retail Prices API |
| Cloudflare R2 Standard storage | 10 GB-mese free, poi 0,015 USD/GB-mese | Cloudflare R2 pricing |
| Cloudflare R2 Class A | 1M operazioni/mese free, poi 4,50 USD/M | Cloudflare R2 pricing |
| Cloudflare R2 Class B | 10M operazioni/mese free, poi 0,36 USD/M | Cloudflare R2 pricing |
| Upstash Redis free | 256 MB, 500K comandi/mese | Upstash pricing |
| Upstash Redis pay-as-you-go | 0,20 USD per 100K comandi | Upstash pricing |
| Dynatrace Full-Stack Monitoring | 0,01 USD per memory-GiB-hour | Dynatrace rate card |
| Dynatrace logs/traces ingest | 0,20 USD/GB | Dynatrace rate card |

### Stima dev-online

Budget minimo:

- Container Apps con min replicas 0: 0-15 USD/mese con traffico basso.
- PostgreSQL B1ms + 32 GB: circa 19 USD/mese.
- Redis Upstash free/pay-as-you-go: 0-10 USD/mese.
- ACR Basic condiviso: circa 5 USD/mese.
- R2: 0-5 USD/mese se sotto free tier o poco sopra.
- Key Vault: sotto 1 USD/mese.
- Cloudflare Access: spesso 0 USD per piccoli team, verificare piano.

Totale atteso: 30-70 USD/mese.

### Stima production MVP

Budget prudente ma ancora contenuto:

- Container Apps web+api con min replica 1 e worker min 0/1: 35-80 USD/mese.
- PostgreSQL B1ms/B2ms + storage/backups: 20-60 USD/mese.
- Redis Standard C0: circa 40 USD/mese.
- ACR Basic: circa 5 USD/mese.
- R2: 0-20 USD/mese all'inizio, ma monitorare Class B operations.
- Key Vault: sotto 1 USD/mese.
- Email transazionale: 0-20 USD/mese all'inizio.
- Dynatrace: 20-100 USD/mese in base a memoria, log e trace ingest; se troppo,
  usare Azure Monitor inizialmente.
- Cloudflare: Free o Pro se servono WAF/regole avanzate.

Totale atteso: 120-300 USD/mese.

Budget estremo:

- Redis Basic C0 invece di Standard: risparmio circa 24 USD/mese, ma senza SLA.
- Web/API min replica 0: risparmio compute, ma cold start percepibile.
- Dynatrace rimandato: usare Azure Monitor con retention breve.

Questa variante puo' scendere verso 80-150 USD/mese, ma va accettata come
compromesso operativo.

### Quando scalare

Scalare quando:

- p95 API sopra 500-800 ms per piu di 15 minuti;
- DB CPU sopra 70% o connessioni sopra 80%;
- query ricerca lente oltre soglia;
- Redis vicino a limiti connessioni/memoria;
- worker accumula backlog;
- R2 Class B cresce per cache miss;
- error rate sopra 1-2%.

Passi di scala:

1. Aumentare replica max Container Apps.
2. Portare API/web a 1 vCPU e 2 GiB se CPU/memoria saturano.
3. Passare PostgreSQL da B1ms/B2ms a General Purpose 2 vCore.
4. Aggiungere indici e ottimizzare query prima di scalare ancora DB.
5. Passare Redis a Standard/Premium/Managed Redis.
6. Introdurre coda gestita per worker.
7. Valutare motore ricerca dedicato se Postgres full-text non basta.

## Guida step by step

Questa guida assume che il repository sia gia verde con:

```bash
pnpm release:check
pnpm release:smoke
```

### 1. Preparazione account

Intervento utente:

1. Creare o confermare account GitHub con permessi admin sul repository.
2. Creare Azure subscription con billing attivo.
3. Creare account Cloudflare e portare DNS del dominio.
4. Creare tenant Dynatrace o decidere Azure Monitor iniziale.
5. Creare account email provider.
6. Creare account SMS provider se la verifica telefono reale e' richiesta al
   go-live.
7. Abilitare MFA su tutti gli account.

L'agente puo' poi verificare CLI:

```bash
az version
gh --version
wrangler --version
pnpm --version
```

Se manca una CLI, l'agente puo' installarla, ma l'utente deve completare i
login interattivi:

```bash
az login
gh auth login
wrangler login
```

### 2. Preparazione repository

Da implementare prima del primo deploy reale:

1. Dockerfile production per `apps/web`, `apps/api`, `apps/worker`.
2. Workflow GitHub Actions `ci.yml`, `deploy-dev.yml`, `deploy-prod.yml`,
   `rollback-prod.yml`.
3. Host guard per admin/moderazione.
4. Script smoke remoto che accetti base URL dev/prod.
5. Script migrazioni eseguibile da container/job.

Comandi locali preflight:

```bash
pnpm release:check
pnpm release:smoke
git status --short
```

### 3. Creazione risorse Azure dev-online

Intervento utente: scegliere subscription e budget.

```bash
az account set --subscription "<subscription-id>"
az group create --name rg-adotta-dev-itn --location italynorth
az acr create \
  --resource-group rg-adotta-dev-itn \
  --name acradottadev \
  --sku Basic \
  --admin-enabled false
az keyvault create \
  --resource-group rg-adotta-dev-itn \
  --name kv-adotta-dev-itn \
  --location italynorth \
  --enable-rbac-authorization true
az containerapp env create \
  --resource-group rg-adotta-dev-itn \
  --name cae-adotta-dev-itn \
  --location italynorth
```

Database dev:

```bash
az postgres flexible-server list-skus --location italynorth
az postgres flexible-server create \
  --resource-group rg-adotta-dev-itn \
  --name psql-adotta-dev-itn \
  --location italynorth \
  --tier Burstable \
  --sku-name Standard_B1ms \
  --storage-size 32 \
  --version 16
```

Abilitare estensioni:

```bash
az postgres flexible-server parameter set \
  --resource-group rg-adotta-dev-itn \
  --server-name psql-adotta-dev-itn \
  --name azure.extensions \
  --value postgis,pg_trgm,unaccent,pg_stat_statements,pgcrypto
```

Poi eseguire nel DB:

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

### 4. Creazione risorse Cloudflare dev/prod

Intervento utente:

- confermare dominio;
- configurare nameserver;
- creare policy Cloudflare Access;
- creare eventuale piano Pro se serve WAF avanzato.

R2:

```bash
wrangler r2 bucket create adotta-dev-assets
wrangler r2 bucket create adotta-prod-assets
```

Creare credenziali R2 S3 API da Cloudflare dashboard e inserirle in Key Vault,
non in file.

DNS iniziale:

- `dev.adottaungatto.it` -> Container App web dev.
- `api-dev.adottaungatto.it` -> Container App api dev.
- `admin-dev.adottaungatto.it` -> Container App admin/web dev.
- `media-dev.adottaungatto.it` -> R2 custom domain.

### 5. Configurazione segreti

Intervento utente: inserire valori reali senza scriverli in chat.

Esempio Key Vault:

```bash
az keyvault secret set --vault-name kv-adotta-dev-itn --name DATABASE-URL --value "<database-url>"
az keyvault secret set --vault-name kv-adotta-dev-itn --name REDIS-URL --value "<redis-url>"
az keyvault secret set --vault-name kv-adotta-dev-itn --name S3-ACCESS-KEY-ID --value "<r2-access-key>"
az keyvault secret set --vault-name kv-adotta-dev-itn --name S3-SECRET-ACCESS-KEY --value "<r2-secret-key>"
az keyvault secret set --vault-name kv-adotta-dev-itn --name GOOGLE-CLIENT-SECRET --value "<google-secret>"
```

GitHub environments:

```bash
gh secret set AZURE_CLIENT_ID --env dev-online --body "<client-id>"
gh secret set AZURE_TENANT_ID --env dev-online --body "<tenant-id>"
gh secret set AZURE_SUBSCRIPTION_ID --env dev-online --body "<subscription-id>"
```

Preferire OIDC con federated credentials e ruoli Azure invece di client secret.

### 6. Deploy dev-online

Dopo workflow e Dockerfile:

```bash
gh workflow run deploy-dev.yml --ref develop
gh run watch
```

Verifiche:

```bash
curl -i https://api-dev.adottaungatto.it/health
curl -i https://api-dev.adottaungatto.it/health/ready
curl -i https://dev.adottaungatto.it
```

Smoke remoto:

```bash
WEB_BASE_URL=https://dev.adottaungatto.it \
API_BASE_URL=https://api-dev.adottaungatto.it \
pnpm smoke:e2e
```

Se lo smoke usa dati demo, verificare che punti al database dev-online e mai a
produzione.

### 7. Preparazione produzione

Intervento utente:

1. Confermare budget mensile.
2. Confermare dominio produzione.
3. Inserire secret reali prod.
4. Confermare policy admin.
5. Confermare retention log e backup.

Creare resource group e risorse prod come dev, usando nomi `prod` e, se
possibile, networking privato:

```bash
az group create --name rg-adotta-prod-itn --location italynorth
az acr create --resource-group rg-adotta-prod-itn --name acradottaprod --sku Basic --admin-enabled false
az keyvault create --resource-group rg-adotta-prod-itn --name kv-adotta-prod-itn --location italynorth --enable-rbac-authorization true
az containerapp env create --resource-group rg-adotta-prod-itn --name cae-adotta-prod-itn --location italynorth
```

DNS produzione:

- `www.adottaungatto.it`;
- `api.adottaungatto.it`;
- `admin.adottaungatto.it`;
- `media.adottaungatto.it`.

Google OAuth redirect:

- `https://www.adottaungatto.it/login`;
- eventuale callback effettiva usata dall'app;
- `https://dev.adottaungatto.it/...` solo per dev credentials.

### 8. Deploy produzione protetto

Da GitHub:

1. Aprire PR `develop -> main`.
2. Attendere CI verde.
3. Verificare changelog, migrazioni, env nuove.
4. Approvare PR.
5. Avviare o confermare `deploy-prod.yml`.
6. Approvare GitHub Environment `production`.
7. Monitorare workflow.

Da CLI:

```bash
gh workflow run deploy-prod.yml --ref main
gh run watch
```

Il deploy deve:

- verificare backup/PITR;
- applicare migrazioni;
- aggiornare app;
- eseguire smoke produzione;
- annotare release.

### 9. Verifica post go-live

Checklist:

- home pubblica carica;
- ricerca carica annunci;
- immagini da `media.adottaungatto.it` visibili desktop/mobile;
- registrazione/login/logout;
- reset password;
- creazione bozza annuncio;
- upload e processamento immagini;
- submit moderazione;
- admin accessibile solo da `admin.*` e solo utenti autorizzati;
- preferiti;
- notifiche;
- contatto proprietario;
- health/readiness;
- dashboard osservabilita;
- alert test;
- backup presente;
- restore test pianificato.

### 10. Rollback

Rollback applicativo:

```bash
gh workflow run rollback-prod.yml --ref main -f image_tag="<previous-sha>"
gh run watch
```

Se sono state applicate migrazioni additive compatibili, rollback app e'
sufficiente. Se una migrazione e' distruttiva, fermarsi e seguire runbook
specifico con backup/restore o migrazione correttiva.

## Rischi aperti prima del primo go-live

- Serve dominio `adottaungatto.it` in Cloudflare per completare custom domain,
  DNS, Cloudflare Access e protezione dev-only a livello edge.
- Serve provider reale per email e, se richiesto, SMS; l'ambiente dev-online
  usa ancora un placeholder SMTP.
- Serve restringere l'accesso pubblico PostgreSQL dev-online o documentare
  allowlist/networking compatibili con GitHub Actions.
- Serve decisione finale tra Dynatrace immediato o Azure Monitor iniziale per
  produzione; dev-online usa Azure Monitor iniziale.
- Serve test restore backup database.
- Serve budget alert Cloudflare/Dynatrace quando quei servizi diventano
  billing-relevant oltre il free tier.

## Fonti

- Azure Container Apps pricing:
  https://azure.microsoft.com/en-us/pricing/details/container-apps/
- Azure Container Apps custom domains e certificati:
  https://learn.microsoft.com/en-us/azure/container-apps/custom-domains-managed-certificates
- Azure Retail Prices API:
  https://prices.azure.com/api/retail/prices
- Azure Database for PostgreSQL compute:
  https://learn.microsoft.com/en-gb/azure/postgresql/compute-storage/concepts-compute
- Azure PostgreSQL estensioni/PostGIS:
  https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/concepts-extensions
- Azure Container Registry pricing:
  https://azure.microsoft.com/en-us/pricing/details/container-registry/
- Azure Cache for Redis pricing:
  https://azure.microsoft.com/en-us/pricing/details/cache/
- Azure Monitor pricing:
  https://azure.microsoft.com/en-us/pricing/details/monitor/
- Cloudflare R2 pricing:
  https://developers.cloudflare.com/r2/pricing/
- Cloudflare plans:
  https://www.cloudflare.com/plans/
- Upstash Redis pricing:
  https://upstash.com/pricing/redis
- Dynatrace rate card:
  https://www.dynatrace.com/pricing/rate-card/
- GitHub Actions pricing update 2026:
  https://github.com/resources/insights/2026-pricing-changes-for-github-actions
