# Roadmap a milestone

## Milestone 0 - Fondamenta documentali - completata

Obiettivo: chiarire architettura, stack, moduli, dati e sviluppo locale.

Deliverable:

- documentazione iniziale in `docs`;
- ADR per stack backend e strategia database/search;
- `.env.example`;
- `docker-compose.yml` con servizi locali.

## Milestone 1 - Scaffolding monorepo - base completata

Obiettivo: creare una base eseguibile ma senza funzionalita applicative ricche.

Deliverable:

- monorepo pnpm;
- app Next.js/shadcn creata con il comando del prompt master;
- app API NestJS minima;
- worker minimo;
- script `dev`, `test`, `lint`, `typecheck`;
- script Docker e Drizzle iniziali;
- schema database iniziale;
- migrazione verificata in locale.

## Milestone 2 - Database e geografia - in corso

Obiettivo: rendere stabile il modello dati iniziale e importare luoghi italiani.

Deliverable:

- schema Drizzle iniziale;
- migrazioni;
- seed razze e dati minimi;
- import comuni/province/regioni da fonti ufficiali e promozione idempotente;
- geometrie e centroidi da confini amministrativi Istat;
- query autocomplete luogo API iniziale;
- query distanza con PostGIS.
- schema immagini annuncio e moderazione.

## Milestone 3 - Identita e profili

Obiettivo: introdurre utenti, sessioni, ruoli e profili.

Deliverable:

- schema `user_roles` e `sessions`;
- registrazione email/password;
- login/logout;
- sessioni sicure;
- ruoli e permessi base;
- guard auth riusabile;
- endpoint profilo utente autenticato.
- update profilo utente con policy per `profile_type`.
- verifica email con token monouso e Mailpit locale.
- recupero password con token monouso e revoca sessioni.
- cambio password autenticato con rotazione sessione.

Stato: base completata.

## Milestone 4 - Annunci e immagini

Obiettivo: permettere la creazione controllata di annunci in bozza.

Deliverable:

- CRUD annunci dell'utente;
- stati bozza e invio a moderazione;
- upload immagini su MinIO;
- varianti thumbnail;
- immagine di copertina;
- validazioni server-side.

Stato: avviata con CRUD autenticato delle bozze annuncio dell'utente, invio a
moderazione con controlli minimi, upload session presigned verso MinIO locale e
worker iniziale per varianti immagini WebP. Il frontend account include editor
bozze per creazione, modifica, upload immagine e invio a moderazione. L'invio
a moderazione richiede almeno una immagine pronta.

## Milestone 5 - Ricerca pubblica

Obiettivo: rendere consultabili gli annunci approvati.

Deliverable:

- lista annunci pubblica;
- scheda annuncio;
- filtri principali;
- full-text search;
- ricerca geografica;
- espansione progressiva dei risultati.

Stato: avviata con `GET /listings` per lista pubblica paginata degli annunci
approvati, `GET /listings/:id` per scheda pubblica per UUID e
`GET /listings/breeds` per i filtri razza. La lista supporta filtri principali
per luogo, razza, sesso, fascia eta, gratuitita, fascia contributo, dati
sanitari e presenza immagini. Il frontend pubblico e' avviato con homepage
orientata alla ricerca, lista annunci server-rendered, scheda dettaglio,
metadata dinamici, JSON-LD, sitemap e robots. Restano da consolidare flussi
operativi, fixture realistiche, test e area admin/moderazione.

## Milestone 6 - Moderazione

Obiettivo: controllare pubblicazione e qualita dei contenuti.

Deliverable:

- coda moderazione;
- approvazione/rifiuto/sospensione;
- motivazioni;
- audit log;
- segnalazioni utenti;
- filtri contenuti sospetti.

Stato: avviata con endpoint autenticato per coda annunci `pending_review`,
decisioni moderatore per approvazione, rifiuto e sospensione con audit log e
segnalazioni utenti collegate ai casi di moderazione. E' presente anche una
coda moderazione dedicata ai casi con segnalazioni utenti. Le decisioni
chiudono le segnalazioni collegate come `resolved` o `dismissed` e inviano
notifiche email a proprietario e reporter. Il frontend ha una pagina
`/moderation` iniziale, protetta da login, `noindex`, collegata alle code API
e dotata di azioni base approva/rifiuta/sospendi con motivo obbligatorio.
Restano da estendere strumenti interni, template di motivazione e workflow
operativi piu avanzati.

## Milestone 7 - Contatti, preferiti e notifiche

Obiettivo: chiudere il ciclo utente registrato.

Deliverable:

- contatto proprietario con privacy by default;
- preferiti;
- like pubblici aggregati;
- notifiche email;
- centro notifiche minimale.

Stato: avviata con preferenze email utente per notifiche non essenziali di
moderazione annuncio e aggiornamento segnalazioni. Le email di sicurezza
account restano fuori dall'opt-out. E' presente anche un primo centro notifiche
in-app autenticato con inbox, conteggio non lette e marcatura lettura; le
decisioni di moderazione generano notifiche per proprietari e reporter. I
preferiti utente sono avviati per annunci pubblicati, con lista autenticata,
aggiunta idempotente e rimozione idempotente. I like pubblici aggregati sono
avviati con conteggio pubblico per annuncio pubblicato e mutazioni autenticate
idempotenti. Il frontend account mostra dashboard, preferiti e inbox notifiche
in lettura. E' presente anche il primo contatto proprietario privacy-first:
richiesta autenticata, inoltro email dal backend, consenso esplicito alla
risposta via email, tracciamento in `listing_contact_requests` e rate limit
dedicato. E' presente anche una preferenza per-annuncio per
abilitare/disabilitare il contatto proprietario. Le mutazioni account coprono
rimozione preferiti, lettura notifiche, cancellazione bozze ed editor bozze con
creazione/modifica/upload, galleria immagini con stato, eliminazione,
riordino/copertina e invio. Restano da completare eventuali canali aggiuntivi
o finestre orarie per il contatto, se previsti dal prodotto.

## Milestone 8 - Hardening e deploy

Obiettivo: preparare una prima messa online controllata.

Deliverable:

- sicurezza upload rafforzata;
- rate limit completo;
- backup e restore;
- logging strutturato;
- metriche;
- pipeline CI/CD;
- deploy cloud documentato.

Stato: avviata a livello implementativo con un primo rate limit Redis per i
flussi auth sensibili. Sono presenti checklist e piano operativo in
`production-readiness.md` e `ops-monitoring-release.md`; il progetto non e'
ancora rilasciabile in produzione.
