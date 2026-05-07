# Scelta motivata dello stack backend

## Decisione

Lo stack backend proposto e':

- Runtime: Node.js LTS.
- Linguaggio: TypeScript.
- Framework API: NestJS con Fastify adapter.
- Database: PostgreSQL con estensione PostGIS.
- Accesso dati e migrazioni: Drizzle ORM e Drizzle Kit.
- Cache, rate limiting e code: Redis.
- Job queue: BullMQ come target, non ancora integrato.
- Storage immagini: API S3-compatible, MinIO in locale.
- Validazione: Zod o class-validator, con preferenza per schemi condivisibili
  quando utile tra API e frontend.
- Test: Vitest per unita e integrazione leggera, Playwright per flussi web.

## Motivazioni

### TypeScript end-to-end

Il frontend e' gia vincolato a Next.js e TypeScript. Usare TypeScript anche nel
backend riduce il cambio di contesto, facilita pacchetti condivisi per tipi e
validazioni e rende il progetto piu gestibile da un coding agent.

### NestJS

NestJS e' adatto a un dominio con moduli chiari: annunci, utenti, moderazione,
luoghi, immagini, notifiche e audit. Offre dependency injection, testing,
guard, interceptor, pipe di validazione e una struttura prevedibile.

Fastify e' preferibile all'adapter Express per performance e modello plugin
moderno, senza cambiare l'ergonomia di NestJS.

### PostgreSQL + PostGIS

PostgreSQL e' la scelta primaria per consistenza, query relazionali, vincoli,
transazioni e audit. PostGIS consente query geografiche robuste: distanza,
coordinate, centroidi, bounding box e relazione tra annunci e comuni.

### Drizzle ORM

Drizzle mantiene il modello vicino a SQL, offre tipizzazione TypeScript e non
costringe ad astrarre troppo le funzionalita PostgreSQL/PostGIS. Questo e'
importante per full-text search, estensioni, indici GIN/GiST e query geografiche.

### Redis + BullMQ

Redis serve per cache breve, rate limit e code. BullMQ resta il target per job
asincroni come processamento immagini, invio email, notifiche, import luoghi e
pulizia dati; al momento il worker usa comandi espliciti senza coda persistente.

### S3-compatible storage

Le immagini non devono stare nel filesystem dell'applicazione. MinIO replica in
locale il contratto S3 e permette in futuro di usare AWS S3, Cloudflare R2,
Google Cloud Storage compatibile o altri provider.

## Cosa non introdurre subito

- Microservizi: aumentano coordinamento e complessita operativa senza benefici
  nella fase iniziale.
- NoSQL general purpose: il dominio e' fortemente relazionale.
- Motore search dedicato obbligatorio da subito: PostgreSQL basta per validare
  prodotto e ranking iniziale.
- Kubernetes: utile solo quando esistono ambienti e carichi che lo giustificano.
