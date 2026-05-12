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
- smoke E2E locale `pnpm smoke:e2e` con login admin, controllo coda
  `pending_review`, filtro segnalazioni, dettaglio operativo caso, template
  motivazioni, audit caso, accesso negato per utente non moderatore e verifica
  dello shell interno di moderazione. Se il login admin demo e' limitato da
  rate limit locale dopo run ravvicinati, lo smoke usa il moderatore demo come
  fallback equivalente per la coda interna.

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
- registrazione e login; Fatto con utente effimero quando il rate limit locale
  lo consente, fallback su account demo distinto quando la finestra IP e'
  satura.
- aggiornamento profilo e preferenze email; Fatto via `PATCH /users/me`,
  `PATCH /users/me/notification-preferences` e pagina `/account/settings`.
- creazione annuncio completa;
- upload immagine; Fatto con immagini reali da `immagini-gattini/` quando
  disponibili e fallback sintetico solo se mancano fixture locali.
- processing immagine o fixture immagine pronta; Fatto tramite worker locale.
- invio a revisione riuscito; Fatto.
- login admin e coda `pending_review`; Fatto con verifica dello shell interno
  `/moderation`.
- filtro code moderazione; Fatto verificando `/moderation?queue=reported`.
- dettaglio operativo moderazione; Fatto verificando la presenza dei dati caso
  nella dashboard admin.
- audit caso moderazione; Fatto verificando la sezione `Audit caso` e le azioni
  recenti nelle code admin.
- accesso negato moderazione; Fatto verificando la UI per utente non
  moderatore.
- annuncio sponsorizzato mock in cima alla lista pubblica; Fatto.
- approvazione moderatore; Fatto con approvazione admin del caso creato dallo
  smoke.
- annuncio pubblicato visibile; Fatto via dettaglio pubblico dopo approvazione.
- preferito toggle; Fatto via add/remove API e verifica stato cuore UI su
  `/listings` e scheda annuncio.
- contatto proprietario; Fatto con scelta di un annuncio demo contattabile,
  consenso email/telefono e fallback quando il cooldown locale blocca un
  annuncio gia contattato; lo smoke apre anche lo stream del proprietario e
  verifica la notifica real-time `listing_contact_request`.
- inbox contatti ricevuti proprietario; Fatto via
  `GET /contacts/me/received`, pagina `/account/contacts`, telefono visibile
  solo dopo consenso e isolamento multi-utente.
- upload immagini annuncio; Fatto con piu immagini reali da
  `immagini-gattini/` quando disponibili, invece del placeholder generato.
- dettaglio annuncio pubblicato; Fatto con verifica del carosello immagini e
  conteggio foto dopo approvazione moderatore.
- notifica generata; Fatto per decisione di moderazione approvata.
- notifica invio a revisione; Fatto con verifica di
  `listing_review_submission` dopo `submit-review`.
- notifica real-time; Fatto aprendo lo stream web
  `/api/notifications/stream` prima dell'approvazione moderatore e verificando
  gli eventi `created` senza refresh per contatto proprietario e approvazione
  moderatore.
- accesso negato tra utenti diversi; Fatto per bozza, immagini bozza,
  preferiti e notifiche. Da estendere ai contatti quando saranno esposti in
  una vista proprietario/admin.

## Regole

- I dati demo devono essere idempotenti.
- `pnpm demo:reset` puo eliminare volumi Docker locali, ma nessuno script demo
  deve toccare dati fuori dai servizi locali.
- Gli ID stabili sono preferibili per test e documentazione.
- Ogni nuovo caso demo va aggiornato qui e nello smoke se e' parte del giro
  locale principale.
