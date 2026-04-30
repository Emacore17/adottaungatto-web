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
4. Il moderatore vede l'annuncio in coda.
5. Il moderatore approva, rifiuta o sospende.
6. Ogni decisione salva motivazione e audit log.
7. Il proprietario riceve notifica.

## Segnalazioni

Motivi iniziali:

- contenuto non pertinente;
- immagini inappropriate;
- sospetta truffa;
- informazioni false;
- abuso;
- altro.

Le segnalazioni aprono o aggiornano un caso di moderazione. Il sistema deve
evitare duplicati rumorosi aggregando segnalazioni sullo stesso target.

## Persistenza

Lo schema iniziale usa `moderation_cases` per la coda operativa,
`moderation_actions` per audit delle decisioni e `reports` per collegare le
segnalazioni utente al target e, quando disponibile, al caso di moderazione.

## Controlli automatici iniziali

- Campi obbligatori completi.
- Numero massimo immagini.
- Formati immagini consentiti.
- Keyword palesemente non pertinenti.
- Annunci duplicati dello stesso utente.
- Rate limit su creazione e invio a revisione.

## Evoluzione

- Scoring rischio.
- Coda prioritaria per annunci con molte segnalazioni.
- Revisione immagini automatica.
- Policy interne versionate.
- Template di motivazione per moderatori.
