# Strategia per autenticazione, autorizzazione e ruoli

## Autenticazione

Flussi da prevedere:

- registrazione email e password;
- verifica email;
- login e logout;
- recupero password;
- cambio email;
- cambio password;
- login con Google;
- eventuale verifica telefono in una milestone successiva.

Password:

- implementazione iniziale con `scrypt` nativo Node.js;
- possibile hardening futuro verso Argon2id;
- policy minima ragionevole;
- nessun log di password o token;
- reset token monouso, hashato e con scadenza breve.

Sessioni:

- implementazione iniziale con bearer token restituito da API;
- token sessione salvato hashato a database o Redis;
- cookie `HttpOnly`, `Secure` in produzione e `SameSite=Lax` quando il
  frontend usera sessioni browser complete;
- rotazione sessione dopo login e azioni sensibili;
- logout con revoca server-side;
- scadenza assoluta e inattivita.

## API implementata

Endpoint iniziali:

- `POST /auth/register`: crea utente `pending_verification`, assegna il ruolo
  `registered_user` se presente, crea una sessione e invia una mail di
  verifica;
- `POST /auth/login`: verifica email/password e crea una nuova sessione;
- `POST /auth/email-verification/request`: crea un nuovo token monouso e invia
  la mail di verifica all'utente autenticato;
- `POST /auth/email-verification/verify`: consuma il token monouso, imposta
  `email_verified_at` e porta lo stato da `pending_verification` ad `active`;
- `POST /auth/password-reset/request`: accetta una email e risponde sempre in
  modo generico, inviando un token solo se l'utente esiste;
- `POST /auth/password-reset/confirm`: consuma un token valido, aggiorna la
  password e revoca le sessioni attive dell'utente;
- `POST /auth/password/change`: richiede sessione bearer, verifica la password
  attuale, aggiorna la password, revoca le sessioni attive e restituisce una
  nuova sessione;
- `GET /auth/me`: restituisce utente e sessione corrente da header
  `Authorization: Bearer ...`;
- `POST /auth/logout`: revoca la sessione associata al bearer token;
- `GET /users/me`: restituisce profilo utente corrente, contatti verificati e
  ruoli;
- `PATCH /users/me`: aggiorna nome visualizzato, telefono e, quando consentito,
  `profile_type`;
- `GET /users/me/notification-preferences`: restituisce le preferenze email
  non essenziali dell'utente autenticato;
- `PATCH /users/me/notification-preferences`: aggiorna le preferenze email non
  essenziali dell'utente autenticato;
- `GET /listings`: lista pubblicamente gli annunci approvati, pubblicati, non
  cancellati e non scaduti;
- `GET /listings/:id`: restituisce la scheda pubblica di un annuncio approvato
  usando l'UUID dell'annuncio;
- `GET /listings/me/drafts`: lista le bozze annuncio dell'utente autenticato;
- `POST /listings/me/drafts`: crea una bozza annuncio;
- `POST /listings/me/drafts/:id/submit-review`: invia una bozza completa a
  moderazione e apre il caso di revisione iniziale;
- `POST /listings/me/drafts/:id/images/upload-url`: crea una upload session
  presigned per una nuova immagine della bozza;
- `POST /listings/me/drafts/:id/images/:imageId/confirm`: conferma che
  l'oggetto originale e' presente su storage e porta l'immagine in
  `processing`;
- `GET /listings/me/drafts/:id`: restituisce una bozza posseduta dall'utente;
- `PATCH /listings/me/drafts/:id`: aggiorna una bozza posseduta dall'utente;
- `DELETE /listings/me/drafts/:id`: cancella logicamente una bozza posseduta
  dall'utente;
- `GET /moderation/listings/pending-review`: lista i casi aperti per annunci in
  `pending_review`, accessibile solo a ruoli `moderator` e `admin`.
- `GET /moderation/listings/reported`: lista casi aperti collegati a
  segnalazioni `linked` su annunci, accessibile solo a ruoli `moderator` e
  `admin`.
- `POST /moderation/listings/cases/:caseId/approve`: approva un caso aperto e
  pubblica o mantiene pubblicato l'annuncio;
- `POST /moderation/listings/cases/:caseId/reject`: rifiuta un caso aperto;
- `POST /moderation/listings/cases/:caseId/suspend`: sospende un caso aperto.
- `POST /reports/listings/:listingId`: crea o riusa una segnalazione attiva
  per un annuncio pubblicato e la collega a un caso di moderazione.
- `GET /favorites/listings`: lista gli annunci pubblici salvati nei preferiti
  dall'utente autenticato;
- `POST /favorites/listings/:listingId`: aggiunge un annuncio pubblico ai
  preferiti dell'utente autenticato in modo idempotente;
- `DELETE /favorites/listings/:listingId`: rimuove un preferito dell'utente
  autenticato in modo idempotente;
- `GET /likes/listings/:listingId`: restituisce il conteggio pubblico dei like
  per un annuncio pubblicato;
- `POST /likes/listings/:listingId`: aggiunge il like dell'utente autenticato a
  un annuncio pubblicato in modo idempotente;
- `DELETE /likes/listings/:listingId`: rimuove il like dell'utente autenticato
  in modo idempotente;
- `GET /notifications`: lista le notifiche in-app dell'utente autenticato,
  paginabili e filtrabili su non lette;
- `GET /notifications/unread-count`: restituisce il conteggio delle notifiche
  non lette dell'utente autenticato;
- `GET /notifications/stream`: apre uno stream SSE autenticato per snapshot
  conteggio e eventi `created`, `read`, `read_all`;
- `POST /notifications/:notificationId/read`: marca come letta una notifica
  posseduta dall'utente autenticato;
- `POST /notifications/read-all`: marca come lette tutte le notifiche non
  lette dell'utente autenticato.
- `POST /contacts/listings/:listingId`: invia al proprietario una richiesta di
  contatto per un annuncio pubblico, senza restituire dati di contatto del
  proprietario.
- `GET /contacts/me/received`: lista le richieste di contatto ricevute per
  annunci posseduti dall'utente autenticato.

Gli endpoint autenticati usano un guard bearer riusabile che valida la sessione
e rende disponibile il contesto autenticato ai controller.

Rate limit auth iniziale:

- usa Redis con finestre fisse e chiavi applicative hashate;
- copre registrazione, login, verifica email, richiesta e conferma reset
  password, richiesta nuova verifica email e cambio password autenticato;
- combina limiti per IP client con limiti per email, token o utente, secondo
  il flusso;
- restituisce `429` con `reason` e `retryAfterSeconds`;
- resta da configurare per ambiente, validare dietro proxy fidato e integrare
  con lock progressivo account, upload e strumenti admin.

Stato produzione: la base auth e autorizzazione e' adatta allo sviluppo, ma non
e' ancora sufficiente per un rilascio pubblico. La checklist di hardening e'
in [production-readiness.md](production-readiness.md).

Policy iniziale per bozze annuncio:

- un utente puo leggere e modificare solo le proprie bozze;
- gli endpoint draft operano solo su annunci con `moderation_status = draft`,
  `lifecycle_status = draft` e `deleted_at is null`;
- la cancellazione e' logica e porta `lifecycle_status` a `deleted`;
- se viene indicato un comune, l'API deriva provincia, regione e punto
  geografico dal comune attivo.
- l'invio a moderazione richiede titolo, descrizione, comune valido, eta'
  coerente, contributo economico coerente con `is_free` e almeno una immagine
  processata in stato `ready`;
- l'invio a moderazione blocca duplicati evidenti dello stesso utente con
  stesso slug e stesso comune;
- l'invio a moderazione blocca bozze con immagini ancora `uploaded` o
  `processing`, oppure immagini `rejected` non rimosse;
- l'invio a moderazione aggiorna `moderation_status` a `pending_review` e crea
  un record in `moderation_cases` e `moderation_actions`.
- l'upload immagini iniziale e' consentito solo su bozze possedute dall'utente;
- l'API genera una chiave oggetto non prevedibile, crea il record
  `listing_images` e restituisce una URL presigned `PUT` verso MinIO;
- dopo il PUT, il client conferma l'upload; l'API verifica l'oggetto su MinIO e
  porta il record da `uploaded` a `processing`;
- l'upload accetta JPEG, PNG e WebP fino a 10 MB e limita ogni bozza a 10
  immagini.

Policy iniziale per annunci pubblici:

- non richiedono autenticazione;
- includono solo annunci con `moderation_status = approved`,
  `lifecycle_status = published`, `deleted_at is null` e non scaduti;
- la lista e' paginata e supporta filtri principali per razza, comune,
  provincia, regione, sesso, fascia eta, gratuitita, dati sanitari e presenza
  immagini;
- la scheda pubblica usa l'UUID dell'annuncio, non lo slug, per evitare
  ambiguita finche lo slug non e' unico globalmente;
- la risposta include riepilogo proprietario, luogo, conteggio like, conteggio
  immagini pronte, copertina e, nella scheda, gallery immagini pronte.

Policy iniziale per moderazione:

- la pagina frontend `/moderation` vive nel route group admin, usa un layout
  interno separato dal sito pubblico e resta `noindex`;
- la coda moderazione richiede bearer token valido;
- solo utenti con ruolo `moderator` o `admin` possono leggere la coda;
- solo utenti con ruolo `moderator` o `admin` possono decidere un caso;
- la coda include solo casi `open` collegati ad annunci
  `moderation_status = pending_review`, `lifecycle_status = draft` e non
  cancellati;
- ogni item contiene caso, annuncio, proprietario, luogo, conteggio immagini
  pronte e copertina pronta quando disponibile.
- la coda segnalazioni include solo casi `open` con almeno una segnalazione
  `linked` verso un annuncio e include conteggio segnalazioni, prima
  segnalazione, ultima segnalazione e dati del reporter piu recente;
- ogni decisione richiede una motivazione, chiude il caso, aggiorna lo stato
  dell'annuncio e crea audit log in `moderation_actions`.
- le decisioni operano su casi aperti collegati ad annunci in
  `pending_review`/`draft` oppure ad annunci gia `approved`/`published`.
- le decisioni chiudono anche le segnalazioni attive collegate al caso:
  `approve` le porta a `dismissed`, `reject` e `suspend` le portano a
  `resolved`.
- le decisioni inviano una email al proprietario dell'annuncio con esito e
  motivazione se il proprietario non ha disattivato queste notifiche; se il
  caso contiene segnalazioni attive, inviano anche un aggiornamento ai reporter
  interessati che non hanno disattivato queste notifiche.
- le decisioni creano notifiche in-app per il proprietario dell'annuncio e per
  i reporter collegati, indipendentemente dalle preferenze email.

Policy iniziale per segnalazioni:

- richiedono bearer token valido;
- sono consentite solo su annunci pubblici:
  `moderation_status = approved`, `lifecycle_status = published`,
  `deleted_at is null` e non scaduti;
- il proprietario non puo segnalare il proprio annuncio;
- lo stesso utente non puo creare duplicati mentre esiste gia una
  segnalazione `linked` verso un caso `open` per lo stesso annuncio;
- una nuova segnalazione riusa un caso `open` esistente per l'annuncio oppure
  apre un nuovo `moderation_cases` con `reason_code = user_report`;
- ogni nuova segnalazione crea anche un'azione `reported` in
  `moderation_actions`.
- dopo una decisione moderatore, le segnalazioni `open` o `linked` dello stesso
  caso ricevono `resolved_at` e non restano piu nella coda attiva.
- i reporter ricevono una email di aggiornamento quando la segnalazione viene
  risolta o archiviata.

Policy iniziale per preferiti:

- richiedono bearer token valido;
- l'aggiunta e' consentita solo su annunci pubblici:
  `moderation_status = approved`, `lifecycle_status = published`,
  `deleted_at is null` e non scaduti;
- l'aggiunta e' idempotente e restituisce se il preferito e' stato creato o era
  gia presente;
- la lista mostra solo preferiti che puntano ad annunci ancora pubblici;
- la rimozione e' idempotente e puo pulire preferiti anche se l'annuncio non e'
  piu pubblico.

Policy iniziale per like:

- il conteggio like e' pubblico solo per annunci pubblicati:
  `moderation_status = approved`, `lifecycle_status = published`,
  `deleted_at is null` e non scaduti;
- aggiunta e rimozione del proprio like richiedono bearer token valido;
- l'aggiunta e' consentita solo su annunci pubblici;
- ogni utente puo avere un solo like per annuncio;
- aggiunta e rimozione sono idempotenti e restituiscono il conteggio aggregato
  aggiornato.

Policy iniziale per `profile_type`:

- l'utente puo sempre mantenere il valore attuale o tornare a `private`;
- il passaggio a `professional`, `association`, `shelter` o `breeder` richiede
  ruolo `professional_user`, `moderator` o `admin`;
- la modifica del telefono resetta `phone_verified_at`.

Preferenze notifiche:

- ogni utente autenticato puo leggere e aggiornare le preferenze email non
  essenziali;
- in assenza di una riga dedicata, le preferenze sono considerate abilitate per
  compatibilita con gli utenti esistenti;
- l'opt-out riguarda le email di esito moderazione annuncio e aggiornamento
  segnalazione;
- le email di verifica account, recupero password e altre comunicazioni di
  sicurezza non sono disattivabili da queste preferenze.

Centro notifiche in-app:

- richiede bearer token valido;
- ogni utente vede e modifica solo le proprie notifiche;
- la lista supporta `page`, `pageSize` e `unreadOnly`;
- il conteggio non lette e' disponibile separatamente per badge UI;
- lo stream real-time usa lo stesso guard bearer e pubblica solo eventi
  dell'utente autenticato;
- le notifiche iniziali sono generate dagli esiti di moderazione annuncio e
  dagli aggiornamenti sulle segnalazioni;
- l'invio a revisione genera una notifica `listing_review_submission` per il
  proprietario;
- una richiesta di contatto consegnata genera una notifica
  `listing_contact_request` per il proprietario, senza includere email o
  telefono nel payload.

Contatto proprietario privacy-first:

- solo utenti autenticati possono inviare richieste di contatto;
- il contatto e' consentito solo per annunci pubblici, approvati, pubblicati,
  non cancellati, non scaduti e con `contact_requests_enabled = true`;
- il proprietario non puo contattare il proprio annuncio;
- l'API non espone email o telefono del proprietario;
- l'email del richiedente viene condivisa come risposta al messaggio solo dopo
  consenso esplicito;
- il telefono del richiedente viene condiviso nella richiesta ricevuta solo dopo
  consenso esplicito separato e solo se presente nel profilo;
- la lista ricevuti filtra sempre su `owner_user_id` dell'utente autenticato;
- la lista ricevuti espone l'email del richiedente solo quando `email_shared`
  e' true;
- la lista ricevuti espone il telefono del richiedente solo quando
  `phone_shared` e' true;
- ogni richiesta viene tracciata in `listing_contact_requests`.
- ogni richiesta consegnata crea una notifica in-app per il proprietario.

Verifica email:

- i token sono salvati solo come hash;
- ogni nuova richiesta invalida i token precedenti non consumati;
- i token sono monouso e hanno scadenza configurabile con
  `EMAIL_VERIFICATION_TTL_MINUTES`;
- in locale le email sono recapitate su Mailpit.

Recupero password:

- l'endpoint di richiesta non espone se l'email e' registrata;
- i token sono salvati solo come hash;
- ogni nuova richiesta invalida i token precedenti non consumati;
- i token sono monouso e hanno scadenza configurabile con
  `PASSWORD_RESET_TTL_MINUTES`;
- al reset riuscito tutte le sessioni attive dell'utente sono revocate;
- in locale le email sono recapitate su Mailpit.

Cambio password autenticato:

- richiede la password attuale;
- la nuova password deve rispettare la stessa policy minima della
  registrazione;
- la nuova password deve essere diversa da quella inserita come password
  attuale;
- al cambio riuscito tutte le sessioni attive sono revocate e viene creata una
  nuova sessione per la richiesta corrente.

## Autorizzazione

Usare RBAC per ruoli generali e controlli di ownership per le risorse.

Ruoli iniziali:

- anonimo;
- utente registrato;
- utente professionale;
- moderatore;
- amministratore.

Esempi di permessi:

- `listing:create`;
- `listing:update:own`;
- `listing:submit_review:own`;
- `listing:moderate`;
- `report:create`;
- `report:manage`;
- `user:manage`;
- `config:manage`.

## Regole server-side

- Un utente puo modificare solo i propri annunci, salvo ruoli interni.
- Solo moderatore/admin puo approvare, rifiutare o sospendere.
- Solo annunci pubblicati e approvati sono visibili pubblicamente.
- I dati personali di contatto sono visibili solo secondo preferenze utente e
  permessi.
- Ogni azione admin/moderatore genera audit log.

## Protezioni

- Rate limit su login, registrazione, reset password, contatto e upload.
- CSRF dove si usano cookie e richieste browser state-changing.
- Validazione input lato API.
- Protezione brute force su credenziali.
- Logging eventi sensibili senza dati personali superflui.
