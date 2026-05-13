# Like annunci

## Obiettivo iniziale

I like forniscono un segnale pubblico aggregato sugli annunci pubblicati, senza
esporre l'elenco degli utenti che hanno lasciato il like.

## Endpoint

- `GET /likes/listings/:listingId`: restituisce `listingId` e `likeCount` per
  un annuncio pubblico.
- `GET /likes/listings/:listingId/me`: restituisce conteggio e stato del like
  dell'utente autenticato per un annuncio pubblico.
- `POST /likes/listings/:listingId`: aggiunge il like dell'utente autenticato.
  L'operazione e' idempotente.
- `DELETE /likes/listings/:listingId`: rimuove il like dell'utente autenticato.
  L'operazione e' idempotente.

## Regole

- Il conteggio pubblico e' disponibile solo per annunci pubblicati:
  `moderation_status = approved`, `lifecycle_status = published`,
  `deleted_at is null` e non scaduti.
- L'aggiunta richiede bearer token valido e un annuncio pubblico.
- La lettura dello stato personale richiede bearer token valido e non espone
  altri utenti.
- Ogni utente puo mettere al massimo un like per annuncio.
- La rimozione puo pulire il like anche se l'annuncio non e' piu pubblico.

## UI

La scheda annuncio usa un pulsante "mi piace" con icona pollice, separato dal
cuore dei preferiti, e aggiorna ottimisticamente conteggio e stato con una breve
animazione quando l'utente mette o toglie il like. La lista pubblica mostra il
conteggio aggregato con la stessa icona non interattiva.

## Risposta mutazioni

Le mutazioni restituiscono:

- `listingId`;
- `likeCount`;
- `liked`: stato finale del like dell'utente;
- `changed`: `true` solo quando la richiesta ha cambiato lo stato.
