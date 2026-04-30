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
4. Il frontend carica su API o URL presigned, in base alla milestone.
5. Il file entra in stato `uploaded` o `processing`.
6. Un worker valida e processa il file.
7. Il worker genera varianti.
8. Il database registra metadata e stato `ready`.
9. L'utente sceglie o aggiorna la copertina.

## Validazioni

- MIME type consentiti: JPEG, PNG, WebP.
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
