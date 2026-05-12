# Centro notifiche

## Obiettivo iniziale

Il centro notifiche in-app offre una inbox autenticata per eventi applicativi
non critici. Le preferenze email non disattivano le notifiche in-app.

## Endpoint

- `GET /notifications`: lista notifiche dell'utente autenticato con `page`,
  `pageSize` e `unreadOnly`.
- `GET /notifications/unread-count`: restituisce il conteggio non lette.
- `GET /notifications/stream`: stream SSE autenticato per eventi real-time.
- `POST /notifications/:notificationId/read`: marca una notifica posseduta
  come letta.
- `POST /notifications/read-all`: marca tutte le notifiche non lette come
  lette.

## Eventi iniziali

- `listing_review_submission`: conferma che un annuncio del proprietario e'
  stato inviato in revisione.
- `listing_contact_request`: nuova richiesta di contatto ricevuta dal
  proprietario di un annuncio.
- `listing_moderation_decision`: esito moderazione annuncio per il
  proprietario.
- `listing_report_decision`: aggiornamento su una segnalazione risolta o
  archiviata per il reporter.

## Payload iniziale

I payload sono JSON e includono almeno:

- `caseId`;
- `listingId`;
- `listingSlug`;
- `listingTitle`;
- `decision`;
- `reasonCode`;
- `reasonText`.

Le notifiche da segnalazione includono anche `reportId` e
`reportResolutionStatus`.

Le notifiche di invio a revisione includono `listingId`, `listingSlug`,
`listingTitle` e `moderationStatus = pending_review`.

Le notifiche di contatto proprietario includono `contactRequestId`,
`listingId`, `listingTitle`, `requesterUserId`, `requesterDisplayName`,
`emailShared`, `phoneShared` e `status = sent`; email e telefono del
richiedente restano accessibili dalla inbox contatti, rispettando i consensi.

## Frontend attuale

- `/account` mostra un riepilogo delle notifiche recenti e il conteggio non
  lette.
- `/account/notifications` mostra la inbox paginata collegata a
  `GET /notifications`, con filtro `unreadOnly`.
- `/account/notifications` permette di marcare una singola notifica come letta
  e di marcare tutte le notifiche non lette tramite gli endpoint `POST`
  esistenti.
- il layout globale monta un provider client che apre
  `/api/notifications/stream`, route Next same-origin che inoltra al backend
  con il bearer token letto dal cookie `aug_session`;
- l'header mostra un badge live sull'area account e una notifica visuale quando
  arriva un nuovo evento.

## Requisito real-time

Le notifiche dell'intero applicativo devono essere real-time: ogni funzionalita
che crea un evento utente rilevante deve pubblicare una notifica visibile senza
refresh manuale. Il fallback polling o server-rendered serve solo per
resilienza, recupero dopo disconnessione e primo caricamento, non come
meccanismo principale.

Implementato per il giro locale:

- canale autenticato real-time SSE per semplicita locale e
  compatibilita con Next server-rendered;
- evento iniziale con conteggio non lette e successivi eventi `created`,
  `read`, `read_all`;
- provider UI condiviso per badge e avviso live; le viste account vengono
  rinfrescate via `router.refresh()` quando arriva un evento;
- riconnessione automatica nativa di `EventSource`; il fallback affidabile resta
  `GET /notifications`;
- copertura smoke su nuova notifica ricevuta senza refresh della pagina durante
  approvazione moderatore.
- copertura smoke su notifica di invio a revisione e notifica real-time di
  nuova richiesta di contatto proprietario.

Nota produzione: il fan-out real-time ora e' in memoria nel processo API, quindi
va bene per demo locale e singola istanza. Prima di scalare su piu istanze va
sostituito o affiancato con Redis Pub/Sub, stream Redis o broker equivalente.

## Prossimo target

- Estendere notifiche in-app ad altri eventi prodotto che oggi inviano solo
  email o cambiano stato UI.
- Mantenere la inbox come sorgente affidabile anche se il canale real-time non
  e' disponibile.
