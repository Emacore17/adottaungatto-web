# ADR 0001 - Backend TypeScript modulare con NestJS

## Stato

Accettata per fase iniziale.

## Contesto

Il progetto richiede Next.js e TypeScript lato frontend. Il backend deve gestire
dominio applicativo, workflow di moderazione, sicurezza, ruoli, immagini, import
geografico e API pubbliche/private.

## Decisione

Usare:

- Node.js LTS;
- TypeScript;
- NestJS con Fastify adapter;
- modular monolith;
- worker separato per job asincroni.

## Conseguenze positive

- Linguaggio unico tra frontend, backend e worker.
- Struttura modulare adatta a un dominio ampio.
- Testabilita buona grazie a dependency injection.
- Possibilita di separare moduli in servizi futuri se necessario.

## Conseguenze negative

- NestJS introduce struttura e convenzioni da rispettare.
- Richiede disciplina per evitare moduli troppo accoppiati.
- Non elimina il bisogno di progettare bene confini e contratti interni.

