# Mock, script e prova locale

Questo documento definisce cosa esiste oggi e cosa va preparato per rendere lo
sviluppo locale rapido, ripetibile e vicino alla produzione.

## Stato attuale

In locale sono disponibili:

- `pnpm docker:up` per PostgreSQL/PostGIS, Redis, MinIO e Mailpit;
- `pnpm db:migrate` e `pnpm db:seed`;
- `pnpm geo:import`, `pnpm geo:promote`, `pnpm geo:boundaries`;
- `pnpm media:process` per processare immagini in coda;
- `pnpm dev`, `pnpm typecheck`, `pnpm test`, `pnpm lint`;
- test unitari e service-level su API e worker.

Non esiste ancora un comando unico che prepara un ambiente locale completo con
dati demo e asset realistici.

## Obiettivo locale

Un nuovo sviluppatore o agente deve poter arrivare a una demo locale con:

1. servizi Docker avviati;
2. migrazioni applicate;
3. seed ruoli, razze e luoghi minimi;
4. utenti demo creati;
5. annunci demo in stati diversi;
6. immagini demo gia processate;
7. Mailpit e MinIO verificabili;
8. comandi di reset chiari e non ambigui.

## File e script da aggiungere in seguito

Questi file non sono ancora implementati. Vanno creati in task dedicati:

- `scripts/local/bootstrap.ps1`: setup locale idempotente;
- `scripts/local/reset-data.ps1`: reset dati applicativi, con conferma
  esplicita;
- `scripts/local/seed-demo.ts`: fixture demo realistiche;
- `scripts/local/smoke-api.ps1`: chiamate smoke contro API locale;
- `scripts/local/create-demo-images.ts`: immagini demo e checksum;
- `docs/api-smoke-tests.md`: sequenza manuale minima per verificare i flussi;
- `docs/test-data.md`: utenti, ruoli e annunci demo standard.

## Fixture consigliate

- Utente privato verificato.
- Utente professionale o associazione.
- Moderatore.
- Admin.
- Annuncio bozza incompleto.
- Annuncio pronto per moderazione.
- Annuncio pubblicato con immagini.
- Annuncio rifiutato.
- Annuncio sospeso da segnalazione.
- Annuncio scaduto, per verificare esclusione pubblica.

## Mock esterni

- Email: Mailpit resta il mock locale del provider transazionale.
- Storage: MinIO resta il mock S3-compatible.
- OAuth Google: usare un provider mock o bypass solo in ambiente `local` e
  `test`, mai in produzione.
- Moderazione automatica immagini/testo: usare adapter mock finche non viene
  scelto un provider reale.
- Pagamenti o promozioni: usare un adapter mock fino alla scelta del provider.

## Convenzioni test

- Unit test per validazioni e mapping.
- Service test per query SQL e policy di dominio.
- Integration test con database reale per migrazioni, auth, ricerca e flussi
  critici.
- End-to-end Playwright per onboarding, creazione annuncio, ricerca, preferiti,
  contatto e moderazione.
- Load test separati per ricerca pubblica e upload immagini.

## Pulizia locale

I file temporanei ignorati da Git sono:

- `.turbo`;
- log locali `*.log` gia previsti in `.gitignore`;
- `node_modules`;
- output build `dist`, `.next`, `coverage`.

Non usare comandi distruttivi generici come reset completo del repository. I
reset dati devono essere script espliciti e limitati ai servizi locali.
