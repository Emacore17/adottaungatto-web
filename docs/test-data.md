# Dati demo e fixture locali

Questo documento definisce cosa deve contenere la demo locale per permettere a
un agente di coding di sviluppare e verificare i flussi senza inventare dati.

## Stato attuale

Esistono:

- `pnpm demo:setup`;
- `pnpm dev:demo`;
- `pnpm demo:reset`;
- seed base con ruoli e razze;
- seed demo con 3 utenti verificati;
- 8 annunci demo approvati e pubblicati;
- upload asset demo su MinIO per 5 annunci;
- smoke E2E locale `pnpm smoke:e2e`.

Gap attuali:

- mancano utenti demo `moderator` e `admin`;
- mancano annunci demo in `pending_review`, `rejected`, `suspended`, `expired`
  e bozza incompleta;
- non tutti gli annunci demo hanno immagini;
- le immagini demo sono placeholder generati, non foto realistiche di gatti;
- lo smoke non copre upload immagine reale e invio a revisione riuscito;
- non esiste un annuncio sponsorizzato mock visibile in lista.

## Account target

Password comune locale:

```text
demo-password-123
```

Account target:

- `marta.demo@demo.adottaungatto.local`: utente privato;
- `rifugio.torino@demo.adottaungatto.local`: proprietario/rifugio;
- `volontari.italia@demo.adottaungatto.local`: associazione;
- `moderatore@demo.adottaungatto.local`: moderatore;
- `admin@demo.adottaungatto.local`: amministratore.

Gli account devono essere verificati via email nel seed locale.

## Annunci target

La demo deve includere almeno:

- 6 annunci pubblicati con immagini pronte e copertina;
- 2 annunci in `pending_review`;
- 1 bozza incompleta senza immagini;
- 1 bozza completa con immagini pronte;
- 1 annuncio rifiutato con motivazione;
- 1 annuncio sospeso da segnalazione;
- 1 annuncio scaduto non visibile pubblicamente;
- 1 annuncio sponsorizzato mock, approvato e pubblicato.

## Immagini target

- Ogni annuncio pubblico e in revisione deve avere almeno una immagine `ready`.
- Almeno un annuncio deve avere piu immagini per testare galleria,
  riordino e copertina.
- Gli asset devono essere versionati o generati in modo deterministico.
- Se si usano immagini reali, devono essere libere da vincoli di licenza e
  archiviate con attribuzione nel documento dedicato.

## Smoke target

`pnpm smoke:e2e` deve verificare:

- health API, database e Redis;
- lista pubblica con immagini;
- dettaglio annuncio;
- registrazione e login;
- creazione annuncio completa;
- upload immagine;
- processing immagine o fixture immagine pronta;
- invio a revisione riuscito;
- approvazione moderatore;
- annuncio pubblicato visibile;
- preferito toggle;
- contatto proprietario;
- notifica generata;
- accesso negato tra utenti diversi.

## Regole

- I dati demo devono essere idempotenti.
- `pnpm demo:reset` puo eliminare volumi Docker locali, ma nessuno script demo
  deve toccare dati fuori dai servizi locali.
- Gli ID stabili sono preferibili per test e documentazione.
- Ogni nuovo caso demo va aggiornato qui e nello smoke se e' parte del giro
  locale principale.
