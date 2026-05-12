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
pnpm dev:demo
pnpm demo:setup
pnpm demo:reset
pnpm dev
pnpm test
pnpm lint
pnpm typecheck
pnpm db:migrate
pnpm db:seed
pnpm db:seed:demo
pnpm geo:import
pnpm geo:import:apply
pnpm geo:promote
pnpm geo:promote:apply
pnpm geo:boundaries
pnpm geo:boundaries:apply
pnpm media:process
```

Per dettagli su mock, fixture e script locali mancanti vedere
[local-testing-and-mocks.md](local-testing-and-mocks.md). Per il contratto demo
target vedere [test-data.md](test-data.md).

## Demo end-to-end

`pnpm dev:demo` e' il percorso consigliato dopo un clone del repository:

1. avvia PostgreSQL/PostGIS, Redis, MinIO e Mailpit;
2. attende che i servizi siano raggiungibili;
3. applica le migrazioni;
4. inserisce seed base e fixture demo;
5. carica immagini placeholder nel bucket MinIO locale;
6. avvia `pnpm dev`.

Il comando e' utile gia oggi, ma non rappresenta ancora il traguardo demo
finale definito in [agent-coding-roadmap.md](agent-coding-roadmap.md).

`pnpm demo:setup` esegue solo la preparazione senza avviare i processi di
sviluppo. `pnpm demo:reset` esegue `docker compose down -v --remove-orphans`:
elimina i volumi locali Docker e consente di ripartire da un database vuoto.

## Note

- Docker Compose deve avviare solo servizi infrastrutturali.
- Web, API e worker restano processi di sviluppo pnpm nella prima fase.
- I dati Docker sono in volumi nominati.
- Per reset locale va documentato un comando esplicito, da non eseguire
  automaticamente.
- I log locali e la cache `.turbo` sono artefatti ignorati da Git e possono
  essere rimossi durante la pulizia del workspace.
