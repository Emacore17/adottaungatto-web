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

Rimanente:

- cambio password autenticato.

## Milestone 4 - Annunci e immagini

Obiettivo: permettere la creazione controllata di annunci in bozza.

Deliverable:

- CRUD annunci dell'utente;
- stati bozza e invio a moderazione;
- upload immagini su MinIO;
- varianti thumbnail;
- immagine di copertina;
- validazioni server-side.

## Milestone 5 - Ricerca pubblica

Obiettivo: rendere consultabili gli annunci approvati.

Deliverable:

- lista annunci pubblica;
- scheda annuncio;
- filtri principali;
- full-text search;
- ricerca geografica;
- espansione progressiva dei risultati.

## Milestone 6 - Moderazione

Obiettivo: controllare pubblicazione e qualita dei contenuti.

Deliverable:

- coda moderazione;
- approvazione/rifiuto/sospensione;
- motivazioni;
- audit log;
- segnalazioni utenti;
- filtri contenuti sospetti.

## Milestone 7 - Contatti, preferiti e notifiche

Obiettivo: chiudere il ciclo utente registrato.

Deliverable:

- contatto proprietario con privacy by default;
- preferiti;
- like pubblici aggregati;
- notifiche email;
- centro notifiche minimale.

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
