# Centro notifiche

## Obiettivo iniziale

Il centro notifiche in-app offre una inbox autenticata per eventi applicativi
non critici. Le preferenze email non disattivano le notifiche in-app.

## Endpoint

- `GET /notifications`: lista notifiche dell'utente autenticato con `page`,
  `pageSize` e `unreadOnly`.
- `GET /notifications/unread-count`: restituisce il conteggio non lette.
- `POST /notifications/:notificationId/read`: marca una notifica posseduta
  come letta.
- `POST /notifications/read-all`: marca tutte le notifiche non lette come
  lette.

## Eventi iniziali

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

## Frontend attuale

- `/account` mostra un riepilogo delle notifiche recenti e il conteggio non
  lette.
- `/account/notifications` mostra la inbox paginata collegata a
  `GET /notifications`, con filtro `unreadOnly`.
- `/account/notifications` permette di marcare una singola notifica come letta
  e di marcare tutte le notifiche non lette tramite gli endpoint `POST`
  esistenti.

## Prossimo target

- Aggiungere notifica per annuncio inviato a revisione.
- Aggiungere notifica o stato UI dopo approvazione pubblicazione annuncio.
- Definire real-time o near-real-time: WebSocket/SSE oppure polling leggero con
  fallback server-rendered.
- Mantenere la inbox come sorgente affidabile anche se il canale real-time non
  e' disponibile.
