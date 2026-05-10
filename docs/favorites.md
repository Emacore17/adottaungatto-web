# Preferiti annunci

## Obiettivo iniziale

I preferiti permettono a un utente autenticato di salvare annunci pubblicati e
ritrovarli da una lista personale.

## Endpoint

- `GET /favorites/listings`: lista preferiti dell'utente autenticato con
  `page` e `pageSize`.
- `POST /favorites/listings/:listingId`: aggiunge un annuncio pubblico ai
  preferiti. L'operazione e' idempotente.
- `DELETE /favorites/listings/:listingId`: rimuove un annuncio dai preferiti.
  L'operazione e' idempotente.

## Regole

- L'aggiunta richiede che l'annuncio sia pubblico:
  `moderation_status = approved`, `lifecycle_status = published`,
  `deleted_at is null` e non scaduto.
- La lista restituisce solo preferiti collegati ad annunci ancora pubblici.
- La rimozione non richiede che l'annuncio sia ancora pubblico, cosi' puo
  ripulire preferiti rimasti su annunci sospesi, scaduti o rimossi.

## Dati restituiti

Ogni item include `favoritedAt` e un riepilogo annuncio con:

- titolo, slug e descrizione;
- proprietario;
- luogo quando completo;
- conteggio immagini pronte;
- copertina pronta quando disponibile.

## Frontend attuale

- `/account` mostra un riepilogo dei preferiti recenti per utenti autenticati.
- `/listings/:id` permette a un utente autenticato di salvare l'annuncio nei
  preferiti tramite server action collegata a `POST /favorites/listings/:id`.
- `/account/favorites` mostra la lista paginata dei preferiti collegata a
  `GET /favorites/listings`.
- `/account` e `/account/favorites` permettono di rimuovere un preferito tramite
  server action collegata a `DELETE /favorites/listings/:listingId`.
