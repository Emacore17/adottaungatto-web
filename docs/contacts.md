# Contatto proprietario

## Obiettivo iniziale

Il contatto proprietario permette a un utente autenticato di inviare una
richiesta per un annuncio pubblico senza esporre l'indirizzo email del
proprietario nella UI o nella risposta API.

## Endpoint

- `POST /contacts/listings/:listingId`: invia una richiesta al proprietario di
  un annuncio pubblicato e approvato.
- `GET /contacts/me/received`: lista paginata delle richieste ricevute per gli
  annunci posseduti dall'utente autenticato.

Payload invio:

- `message`: testo tra 20 e 2000 caratteri;
- `shareEmail`: deve essere `true`, per consenso esplicito alla risposta via
  email;
- `sharePhone`: opzionale, `false` di default; se `true`, il richiedente deve
  avere un telefono impostato nel profilo.

Query lista ricevuti:

- `page`: pagina, default `1`;
- `pageSize`: elementi per pagina, default `20`, massimo `50`.

## Regole

- Il richiedente deve essere autenticato.
- L'annuncio deve essere pubblico: `moderation_status = approved`,
  `lifecycle_status = published`, `deleted_at is null`, non scaduto e con
  `contact_requests_enabled = true`.
- Il proprietario non puo contattare il proprio annuncio.
- L'email del proprietario non viene restituita al richiedente.
- L'email del richiedente viene usata come `Reply-To` solo dopo consenso
  esplicito nel form.
- Il telefono del richiedente viene registrato come condivisibile solo dopo
  consenso esplicito separato e solo se presente nel profilo.
- La lista dei contatti ricevuti mostra solo richieste dove l'utente
  autenticato e' `owner_user_id`.
- La lista dei contatti ricevuti mostra l'email del richiedente solo quando
  `email_shared = true`.
- La lista dei contatti ricevuti mostra il telefono del richiedente solo quando
  `phone_shared = true`.
- Ogni richiesta viene tracciata in `listing_contact_requests` con stato
  `pending`, `sent` o `failed`.
- Il proprietario puo disattivare le richieste di contatto per singola bozza o
  annuncio tramite la preferenza `contact_requests_enabled`; in quel caso la
  scheda pubblica non mostra il form attivo e l'endpoint rifiuta il contatto
  come non disponibile.
- Sono applicati limiti anti-abuso database-backed sui record tracciati:
  - massimo una richiesta dello stesso utente sullo stesso annuncio ogni 24 ore;
  - massimo 5 richieste per richiedente ogni ora;
  - massimo 20 richieste per richiedente ogni 24 ore;
  - massimo 20 richieste in ingresso verso lo stesso proprietario ogni ora.
- Quando un limite viene superato, l'API risponde `429` con `reason` e
  `retryAfterSeconds`.

## Frontend attuale

- La scheda pubblica annuncio mostra una card "Contatta il proprietario".
- Se `contact_requests_enabled` e' falso, la card indica che il contatto non e'
  disponibile.
- Se l'utente non e' autenticato, la card porta al login con `next` sulla scheda.
- Se l'utente e' autenticato, il form invia tramite server action e mostra un
  esito locale tramite query string.
- L'area account espone `/account/contacts` con le richieste ricevute, annuncio
  collegato, messaggio, consensi email/telefono e contatti del richiedente
  quando condivisi.

## Limiti noti

- Mancano preferenze proprietario per canali aggiuntivi e finestre orarie.
- Manca il consenso granulare per altri dati di contatto sensibili oltre email
  e telefono.
- Non esiste ancora una messaggistica interna: la risposta avviene via email.
- Non esiste ancora una vista admin dedicata ai contatti: l'accesso operativo e'
  solo del proprietario.
