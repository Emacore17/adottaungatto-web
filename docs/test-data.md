# Dati demo e fixture locali

Questo documento definisce cosa deve contenere la demo locale per permettere a
un agente di coding di sviluppare e verificare i flussi senza inventare dati.

## Stato attuale

Esistono:

- `pnpm demo:setup`;
- `pnpm dev:demo`;
- `pnpm demo:reset`;
- seed base con ruoli e razze;
- seed demo con 5 utenti verificati: privato, rifugio, associazione,
  moderatore e admin;
- 15 annunci/casi demo: pubblicati, in revisione, bozze, rifiutato, sospeso e
  scaduto;
- upload asset demo su MinIO per 11 annunci;
- smoke E2E locale `pnpm smoke:e2e` con login admin e controllo coda
  `pending_review`.

Gap attuali:

- le immagini demo sono placeholder generati, non foto realistiche di gatti;
- lo smoke copre upload immagine sintetica, processing worker e invio a
  revisione riuscito, ma non usa ancora immagini demo realistiche e non approva
  un caso demo fino alla pubblicazione;
- non esiste un annuncio sponsorizzato mock visibile in lista.

## Account target

Password comune locale:

```text
demo-password-123
```

Account disponibili:

- `marta.demo@demo.adottaungatto.local`: utente privato;
- `rifugio.torino@demo.adottaungatto.local`: proprietario/rifugio;
- `volontari.italia@demo.adottaungatto.local`: associazione;
- `moderatore@demo.adottaungatto.local`: moderatore;
- `admin@demo.adottaungatto.local`: amministratore.

Gli account sono verificati via email nel seed locale.

## Annunci target

La demo include:

- 8 annunci pubblicati con immagini pronte e copertina;
- 2 annunci in `pending_review`;
- 1 bozza incompleta senza immagini;
- 1 bozza completa con immagini pronte;
- 1 annuncio rifiutato con motivazione;
- 1 annuncio sospeso da segnalazione;
- 1 annuncio scaduto non visibile pubblicamente.

Manca ancora 1 annuncio sponsorizzato mock, approvato e pubblicato.

## Immagini target

- Ogni annuncio pubblico e in revisione ha almeno una immagine `ready`.
- Almeno un annuncio deve avere piu immagini per testare galleria,
  riordino e copertina.
- Gli asset placeholder sono generati in modo deterministico da
  `worker demo:assets`.
- Se si usano immagini reali, devono essere libere da vincoli di licenza e
  archiviate con attribuzione nel documento dedicato.

## Smoke target

`pnpm smoke:e2e` deve verificare:

- health API, database e Redis;
- lista pubblica con immagini;
- dettaglio annuncio;
- registrazione e login;
- creazione annuncio completa;
- upload immagine; Fatto con immagine PNG sintetica deterministica.
- processing immagine o fixture immagine pronta; Fatto tramite worker locale.
- invio a revisione riuscito; Fatto.
- login admin e coda `pending_review`; Fatto.
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
