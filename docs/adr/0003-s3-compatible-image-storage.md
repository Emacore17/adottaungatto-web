# ADR 0003 - Storage immagini S3-compatible

## Stato

Accettata per fase iniziale.

## Contesto

Gli annunci includono immagini. Lo storage deve essere sicuro, scalabile,
compatibile con sviluppo locale e pronto per cloud.

## Decisione

Usare object storage S3-compatible:

- MinIO in locale;
- bucket S3-compatible in produzione;
- metadata immagini nel database;
- worker per validazione e varianti.

## Conseguenze positive

- Nessun legame al filesystem applicativo.
- Contratto stabile tra locale e cloud.
- Possibilita di usare CDN.
- Gestione piu semplice di varianti e lifecycle policy.

## Conseguenze negative

- Richiede gestione bucket e credenziali.
- Richiede cleanup dei file orfani.
- Richiede worker per processamento robusto.

