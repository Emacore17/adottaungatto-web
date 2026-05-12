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
- 1 promozione mock attiva su un annuncio pubblicato, visibile in cima a
  `/listings`;
- upload asset demo su MinIO per 11 annunci, usando `immagini-gattini/` se
  presente e fallback placeholder se assente;
- smoke E2E locale `pnpm smoke:e2e` con login admin e controllo coda
  `pending_review`.

Gap attuali:

- le immagini realistiche locali dipendono dalla cartella `immagini-gattini/`,
  che non e' versionata;
- se le foto reali diventano asset di repository, servono licenza e
  attribuzione documentate;
- il mock sponsorizzato non e' ancora collegato a un flusso pagamento/campagna
  reale.

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
- 1 annuncio scaduto non visibile pubblicamente;
- 1 annuncio sponsorizzato mock, approvato e pubblicato.

## Immagini target

- Ogni annuncio pubblico e in revisione ha almeno una immagine `ready`.
- Almeno un annuncio deve avere piu immagini per testare galleria,
  riordino e copertina.
- `worker demo:assets` usa le foto locali in `immagini-gattini/` quando
  presenti.
- Se la cartella locale non esiste, gli asset placeholder sono generati in modo
  deterministico.
- Se si versionano immagini reali, devono essere libere da vincoli di licenza e
  archiviate con attribuzione nel documento dedicato.

## Smoke target

`pnpm smoke:e2e` deve verificare:

- health API, database e Redis;
- lista pubblica con immagini; Fatto via cover API, oggetto storage e HTML con
  URL storage diretto.
- dettaglio annuncio;
- registrazione e login;
- creazione annuncio completa;
- upload immagine; Fatto con immagine PNG sintetica deterministica.
- processing immagine o fixture immagine pronta; Fatto tramite worker locale.
- invio a revisione riuscito; Fatto.
- login admin e coda `pending_review`; Fatto.
- annuncio sponsorizzato mock in cima alla lista pubblica; Fatto.
- approvazione moderatore; Fatto con approvazione admin del caso creato dallo
  smoke.
- annuncio pubblicato visibile; Fatto via dettaglio pubblico dopo approvazione.
- preferito toggle;
- contatto proprietario;
- notifica generata; Fatto per decisione di moderazione approvata.
- accesso negato tra utenti diversi.

## Regole

- I dati demo devono essere idempotenti.
- `pnpm demo:reset` puo eliminare volumi Docker locali, ma nessuno script demo
  deve toccare dati fuori dai servizi locali.
- Gli ID stabili sono preferibili per test e documentazione.
- Ogni nuovo caso demo va aggiornato qui e nello smoke se e' parte del giro
  locale principale.
