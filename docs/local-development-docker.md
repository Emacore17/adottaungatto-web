# Strategia per sviluppo locale con Docker

## Servizi locali

Il file [../docker-compose.yml](../docker-compose.yml) definisce:

- PostgreSQL con PostGIS;
- Redis;
- MinIO;
- Mailpit.

Questi servizi coprono database, geografia, code, cache, storage immagini ed
email locale senza richiedere account cloud.

## Porte

- PostgreSQL: `5432`
- Redis: `6379`
- MinIO API: `9000`
- MinIO console: `9001`
- Mailpit SMTP: `1025`
- Mailpit web UI: `8025`

## Variabili ambiente

Usare [.env.example](../.env.example) come template per `.env`.

Non committare mai `.env` reali.

## Comandi disponibili

Gli script root attuali sono:

```bash
pnpm dev
pnpm test
pnpm lint
pnpm typecheck
pnpm db:migrate
pnpm db:seed
pnpm geo:import
pnpm geo:import:apply
pnpm geo:promote
pnpm geo:promote:apply
pnpm geo:boundaries
pnpm geo:boundaries:apply
pnpm media:process
```

Per dettagli su mock, fixture e script locali mancanti vedere
[local-testing-and-mocks.md](local-testing-and-mocks.md).

## Note

- Docker Compose deve avviare solo servizi infrastrutturali.
- Web, API e worker restano processi di sviluppo pnpm nella prima fase.
- I dati Docker sono in volumi nominati.
- Per reset locale va documentato un comando esplicito, da non eseguire
  automaticamente.
- I log locali e la cache `.turbo` sono artefatti ignorati da Git e possono
  essere rimossi durante la pulizia del workspace.
