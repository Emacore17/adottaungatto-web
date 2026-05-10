# Strategia per gestione immagini

## Obiettivi

- Upload sicuro.
- Validazione formato e dimensione.
- Varianti ottimizzate per web.
- Compatibilita locale/cloud.
- Cancellazione logica e tracciabilita.
- Nessuna dipendenza dal filesystem dell'app.

## Flusso proposto

1. L'utente richiede una upload session.
2. L'API verifica permessi e limiti.
3. L'API genera una chiave oggetto non prevedibile.
4. Il frontend carica su URL presigned `PUT` verso MinIO.
5. Il frontend conferma l'upload all'API.
6. L'API verifica la presenza dell'oggetto originale e porta il file in
   `processing`.
7. Il worker valida e processa il file.
8. Il worker genera varianti `large` e `thumb` in WebP.
9. Il database registra metadata e stato `ready`.
10. L'utente sceglie o aggiorna la copertina.

## Validazioni

- MIME type consentiti: JPEG, PNG, WebP.
- Dimensione massima iniziale: 10 MB.
- Numero massimo iniziale: 10 immagini per bozza.
- Verifica magic bytes, non solo estensione.
- Dimensione massima file.
- Dimensione massima pixel.
- Rimozione EXIF.
- Ricalcolo formato e compressione.
- Nome originale non usato come path.
- Antivirus o scanning asincrono in fase successiva.

## Varianti iniziali

- originale privato o protetto;
- large per dettaglio annuncio;
- thumbnail per lista;
- eventuale blur hash per placeholder.

## Persistenza

La tabella `listing_images` traccia chiavi oggetto, metadata tecnici, ordine,
copertina, stato di processamento e cancellazione logica. Una unique parziale
impedisce piu' copertine attive per lo stesso annuncio.

## Storage

Locale:

- MinIO con bucket `adottaungatto-local`.
- L'API crea il bucket locale alla prima richiesta di upload se non esiste.

Endpoint iniziale:

- `POST /listings/me/drafts/:id/images/upload-url` richiede bearer token,
  verifica ownership e stato bozza, crea un record `listing_images`, restituisce
  una URL presigned `PUT`, gli header richiesti e la scadenza.
- `POST /listings/me/drafts/:id/images/:imageId/confirm` verifica l'oggetto su
  MinIO, salva checksum/size da storage e porta il record in `processing`.
- `GET /listings/me/drafts/:id/images` restituisce la galleria immagini della
  bozza con stato, conteggi, copertina corrente e limite massimo.
- `PATCH /listings/me/drafts/:id/images/order` aggiorna l'ordine delle immagini
  attive validando che la richiesta contenga ogni immagine una sola volta.
- `PATCH /listings/me/drafts/:id/images/:imageId/cover` imposta la copertina
  della bozza garantendo una sola copertina attiva.
- `DELETE /listings/me/drafts/:id/images/:imageId` cancella logicamente
  l'immagine; se era copertina, la prima immagine attiva rimasta diventa
  copertina.
- `pnpm media:process` processa le immagini in `processing`, genera varianti
  WebP `large` e `thumb`, aggiorna dimensioni e stato `ready`, oppure marca
  l'immagine `rejected` con il motivo.
- L'invio a moderazione richiede almeno una immagine `ready`, nessuna immagine
  ancora `uploaded`/`processing` e nessuna immagine `rejected` associata alla
  bozza.
- Le chiavi oggetto seguono il formato
  `{app_env}/listings/{listing_id}/original/{random}.{ext}`.
- Le varianti usano lo stesso nome random nelle cartelle `large` e `thumb`.

Produzione futura:

- bucket S3-compatible;
- CDN per asset pubblici;
- lifecycle policy per file orfani;
- backup metadata nel database.

## Sicurezza

- Oggetti organizzati per ambiente e listing.
- Chiavi non indovinabili.
- Upload limitati per utente e annuncio.
- Nessun eseguibile servito come immagine.
- Content-Type impostato dal worker dopo validazione.
