# Stato attuale del progetto

Aggiornato al 7 maggio 2026.

Questo documento e' il riepilogo breve da leggere prima di avviare nuovi
sviluppi. Descrive lo stato reale del repository, non lo stato desiderato.

## Implementato

- Monorepo pnpm con app `web`, `api`, `worker` e pacchetti condivisi.
- Docker Compose locale con PostgreSQL/PostGIS, Redis, MinIO e Mailpit.
- Configurazione TypeScript, ESLint, Vitest, Turbo e Drizzle.
- Schema database con utenti, ruoli, sessioni, geografia, annunci, immagini,
  moderazione, report, notifiche, preferiti e like.
- Migrazioni Drizzle fino a `0011_safe_kang.sql`.
- Seed iniziale per ruoli e razze.
- Import luoghi italiani e confini amministrativi Istat tramite worker.
- API health, health database e health Redis.
- Auth API con registrazione, login, logout, sessione corrente, verifica email,
  recupero password e cambio password autenticato.
- Profilo utente autenticato con update e preferenze email non essenziali.
- CRUD bozze annuncio, invio a moderazione e upload immagini presigned.
- Worker iniziale per processamento immagini e varianti WebP.
- Moderazione annunci e segnalazioni con code, decisioni e audit su
  `moderation_actions`.
- Email applicative via Mailpit locale e notifiche in-app.
- Preferiti e like per annunci pubblicati.
- Endpoint pubblici `GET /listings` e `GET /listings/:id` con filtri
  principali.

## Non pronto per produzione

Il progetto e' una base backend solida, ma non e' ancora rilasciabile in
produzione. Mancano almeno:

- hardening HTTP, rate limiting e protezioni anti-abuso;
- cookie/sessioni browser production-grade e CSRF quando si useranno cookie;
- logging strutturato, trace id, metriche, alert e audit centralizzato;
- pipeline CI/CD e ambienti separati;
- backup/restore verificati e strategia rollback migrazioni;
- ricerca full-text con ranking e benchmark;
- amministrazione completa e UI interna protetta;
- contatto proprietario con privacy by default;
- test end-to-end e fixture dati realistiche;
- policy GDPR/privacy/cookie e retention dati.

## Stato ricerca

La ricerca pubblica attuale e' una lista SQL paginata ordinata per pubblicazione
recente. I filtri principali sono presenti e indicizzati, ma non esiste ancora
un ranking full-text, un sistema di espansione risultati o un benchmark di
carico. Per migliaia di annunci la base PostgreSQL e' ragionevole, ma va
validata con EXPLAIN, dati realistici e test di carico.

## Stato sicurezza

Auth e autorizzazione sono avviate correttamente per una fase iniziale:

- bearer session token hashato lato server;
- ruoli base;
- ownership sulle risorse utente;
- controllo ruoli su moderazione;
- token monouso hashati per email verification e reset password.

Prima della produzione servono rate limit, policy sessioni, cookie sicuri se
usati dal browser, log redatti, segreti gestiti da provider, hardening upload,
backup, alert e audit amministrativo piu esteso.

## Regole per prossimi interventi

- Non introdurre nuove funzionalita senza aggiornare roadmap e documento di
  area.
- Per lavori documentali, non toccare codice applicativo salvo richiesta
  esplicita.
- Tenere ogni nuovo documento focalizzato su un solo scopo.
- Se un documento descrive futuro o backlog, marcarlo chiaramente come
  pianificato.
- Prima di chiudere un task eseguire almeno `pnpm typecheck`, `pnpm test`,
  `pnpm lint` e `git diff --check` quando sono stati toccati codice o schema.
