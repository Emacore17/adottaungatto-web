# Strategia per moderazione annunci

## Stati annuncio

Separare moderazione e ciclo di vita.

Moderazione:

- `draft`;
- `pending_review`;
- `approved`;
- `rejected`;
- `suspended`.

Ciclo di vita:

- `draft`;
- `published`;
- `expired`;
- `adopted`;
- `deleted`.

Un annuncio e' pubblico solo se:

- `moderation_status = approved`;
- `lifecycle_status = published`;
- non e' scaduto;
- non e' cancellato logicamente.

## Workflow

1. L'utente crea una bozza.
2. L'utente invia a revisione.
3. Il sistema esegue controlli automatici minimi.
4. Il moderatore vede l'annuncio in coda tramite
   `GET /moderation/listings/pending-review`.
5. Il moderatore approva, rifiuta o sospende.
6. Ogni decisione salva motivazione e audit log.
7. Il proprietario riceve notifica in-app real-time ed email se le preferenze
   lo consentono.

## Coda iniziale

- Richiede ruolo `moderator` o `admin`.
- Applica rate limit Redis per IP e operatore interno.
- Mostra casi `open` collegati ad annunci in `pending_review`.
- Ordina dai casi piu' vecchi ai piu' recenti.
- Include dati annuncio, proprietario, luogo, conteggio immagini pronte,
  copertina pronta e anteprima ordinata delle prime immagini pronte quando
  disponibili.
- Il frontend espone `/moderation` server-rendered, `noindex` e protetta da
  login, dentro un layout interno separato dal sito pubblico. La pagina legge
  questa coda tramite bearer token. Se l'API restituisce `403`, mostra uno
  stato di accesso non consentito. La dashboard mostra KPI e preview compatte
  delle code.
- La gestione operativa veloce vive in `/moderation/queue`: vista tabellare,
  selezione multipla, decisioni batch `approve`, `reject`, `suspend`, azioni
  rapide per singola riga, stati parlanti e anteprima multi-foto per valutare i
  contenuti visuali. Su mobile la stessa coda usa card operative con checkbox,
  anteprima immagini, dati essenziali e pulsanti touch per approvare, rifiutare
  o sospendere.
- La pagina supporta il filtro query `queue=all|pending|reported`, usato solo
  per scegliere quali sezioni operative mostrare. Le API restano la fonte per
  autorizzazioni, paginazione e dati.
- Ogni item di coda include dati operativi essenziali: annuncio, proprietario,
  luogo, immagini pronte, data apertura e conteggio segnalazioni dove presente.
  Le ultime azioni `moderation_actions` restano disponibili dalla risposta API.
- I motivi rapidi batch usano un default in base all'azione: approvazione
  conforme, rifiuto per policy o sospensione per rischio. Il moderatore puo
  cambiare motivo e aggiungere una nota; `other` richiede nota obbligatoria.
- Se un utente autenticato non ha ruolo `moderator` o `admin`, il frontend
  mostra uno stato di accesso non consentito; il blocco resta applicato dalle
  API con risposta `403`.

## Coda segnalazioni

Endpoint:

- `GET /moderation/listings/reported`.

La coda richiede ruolo `moderator` o `admin` e mostra casi `open` con almeno
una segnalazione `linked` verso un annuncio. Ogni item include dati annuncio,
proprietario, luogo, immagini pronte, conteggio segnalazioni, data della prima
segnalazione, data dell'ultima segnalazione e dettaglio dell'ultima
segnalazione. La pagina `/moderation` legge anche questa coda e consente le
stesse decisioni motivate. Anche questa coda applica rate limit Redis per IP e
operatore interno.

Le decisioni `approve`, `reject` e `suspend` sono riutilizzate anche su casi da
segnalazione collegati ad annunci gia pubblicati. In questo contesto
`approve` chiude il caso mantenendo l'annuncio approvato e pubblicato, mentre
`reject` o `suspend` rimuovono l'annuncio dalla pubblicazione.

## Decisioni iniziali

Endpoint:

- `POST /moderation/listings/cases/:caseId/approve`;
- `POST /moderation/listings/cases/:caseId/reject`;
- `POST /moderation/listings/cases/:caseId/suspend`.

Ogni decisione:

- richiede ruolo `moderator` o `admin`;
- applica rate limit Redis per IP, operatore interno e caso;
- richiede `reasonCode` o `reasonText` nel body;
- opera solo su casi `open` collegati ad annunci in `pending_review` e
  `draft`, oppure ad annunci `approved` e `published`;
- aggiorna `moderation_cases.status` e `closed_at`;
- assegna il caso al moderatore che decide;
- inserisce una riga in `moderation_actions` con stato precedente e stato
  finale.
- chiude le segnalazioni attive collegate al caso:
  - `approve` imposta i report a `dismissed`;
  - `reject` e `suspend` impostano i report a `resolved`.
- invia email applicative, rispettando le preferenze opt-out dell'utente:
  - al proprietario dell'annuncio con esito e motivazione;
  - ai reporter collegati ai report attivi chiusi dalla decisione.
- crea notifiche in-app per proprietario e reporter collegati,
  indipendentemente dalle preferenze email; in locale vengono pubblicate anche
  sullo stream SSE `/notifications/stream`.

Effetti sugli annunci:

- approvazione: `moderation_status = approved`,
  `lifecycle_status = published`, `published_at` valorizzato;
- rifiuto: `moderation_status = rejected`, `lifecycle_status = draft`;
- sospensione: `moderation_status = suspended`, `lifecycle_status = draft`.

## Segnalazioni

Endpoint iniziale:

- `POST /reports/listings/:listingId`.

Motivi iniziali:

- contenuto non pertinente;
- immagini inappropriate;
- sospetta truffa;
- informazioni false;
- abuso;
- altro.

Le segnalazioni sono autenticate e riguardano solo annunci pubblicati. Una
nuova segnalazione apre un caso `open` con `reason_code = user_report` oppure
riusa un caso `open` gia presente per lo stesso annuncio. Il record `reports`
viene salvato in stato `linked`, collegato al caso, e genera un'azione
`reported` in `moderation_actions`.

Per evitare duplicati rumorosi, se lo stesso utente ha gia una segnalazione
`linked` verso un caso `open` per lo stesso annuncio, l'API restituisce la
segnalazione esistente invece di crearne una nuova.

Quando il caso viene deciso, le segnalazioni `open` o `linked` collegate
ricevono `resolved_at` e passano a `dismissed` se il moderatore conferma
l'annuncio, oppure a `resolved` se il moderatore rifiuta o sospende l'annuncio.
I reporter vengono avvisati via email con un riepilogo dell'esito se non hanno
disattivato questa preferenza.
Ricevono inoltre una notifica in-app leggibile dal centro notifiche.

## Persistenza

Lo schema iniziale usa `moderation_cases` per la coda operativa,
`moderation_actions` per audit di apertura, segnalazioni e decisioni e
`reports` per collegare le segnalazioni utente al target e, quando disponibile,
al caso di moderazione. La dashboard interna mostra le ultime azioni per ogni
caso in coda; per produzione l'audit deve diventare completo, non modificabile
e ricercabile.

## Controlli automatici iniziali

- Campi obbligatori completi.
- Comune valido e ancora attivo.
- Eta' minima non superiore all'eta' massima.
- Coerenza tra `is_free` e `contribution_cents`.
- Duplicati evidenti dello stesso utente nello stesso comune.
- Numero massimo immagini.
- Formati immagini consentiti.
- Almeno una immagine in stato `ready`.
- Nessuna immagine ancora in `uploaded` o `processing`.
- Nessuna immagine `rejected` ancora associata alla bozza.
- Keyword palesemente non pertinenti.
- Annunci duplicati dello stesso utente.
- Rate limit su creazione e invio a revisione.

## Evoluzione

- Estendere l'area admin separata e protetta oltre la dashboard moderazione
  iniziale.
- Audit completo e non modificabile per produzione.
- Scoring rischio.
- Coda prioritaria per annunci con molte segnalazioni.
- Revisione immagini automatica.
- Policy interne versionate.
- Template di motivazione per moderatori.

## Gap produzione

La moderazione backend e' avviata e la dashboard interna locale esiste, ma
l'area amministrativa completa non e' pronta per produzione. Prima di un
rilascio pubblico servono MFA per ruoli interni, audit piu esteso, gestione
ruoli, tuning dei rate limit, strumenti anti-abuso, filtri coda avanzati e
logging/alert sulle azioni ad alto rischio.
