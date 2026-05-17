# Dev Online Listing Experience Design

Data: 2026-05-17

## Obiettivo

Portare in `dev-online` quattro miglioramenti dell'esperienza annunci:

- immagini con placeholder base64 sfocato durante il caricamento;
- paginazione classica degli annunci pubblici;
- suggerimenti pertinenti quando i risultati richiesti finiscono o non bastano;
- scelta operativa esplicita per evitare cold start in produzione.

L'ambiente `dev-online` resta autorizzato ad avere cold start per contenere i
costi, mentre produzione non deve scalare web/API a zero.

## Contesto Attuale

La API pubblica `/listings` supporta gia' `page`, `pageSize`, filtri, ricerca,
ordinamento e `meta.totalPages`. La pagina web `/listings` mostra solo la pagina
corrente e non espone controlli di paginazione.

Il database conserva gia' `listing_images.blur_hash`, ma il worker immagini non
lo valorizza e il frontend non passa `placeholder="blur"` a `next/image`.

La API ha gia' fallback quando pagina 1 non produce risultati: trigram text,
radius expansion e relaxed filters. Questa logica sostituisce l'elenco quando
non ci sono risultati, ma non separa ancora risultati esatti e suggerimenti.

Su Azure Container Apps `dev-online` ha `minReplicas=0` per web, API e worker.
Questo spiega la lentezza dopo inattivita'. Produzione dovra' usare almeno una
replica sempre calda per web e API.

## Approccio Scelto

### Blur base64

Introdurre un campo esplicito `blur_data_url` su `listing_images`, mappato come
`blurDataUrl` nei tipi API e web. Non riusare `blur_hash`: il nome attuale indica
un algoritmo diverso e non e' direttamente compatibile con `next/image`.

Il worker `process-listing-images` generera' un piccolo WebP sfocato:

- partire dall'immagine normalizzata con `sharp`;
- ridurre a una dimensione molto piccola;
- applicare blur leggero;
- serializzare come `data:image/webp;base64,...`;
- salvare nel record immagine insieme a width, height, large e thumb.

Il seed demo valorizzera' `blur_data_url` per le immagini demo oppure il job
demo asset lo aggiornera' dopo aver creato le immagini. Il frontend usera'
`placeholder="blur"` solo quando `blurDataUrl` e' presente; altrimenti usera'
il comportamento attuale.

### Paginazione classica

La pagina `/listings` usera' paginazione classica via query string:

- `?page=1`, `?page=2`, ecc.;
- link `Precedente` e `Successiva`;
- testo `Pagina X di Y`;
- filtri, ricerca, localita', sort e place label preservati nei link;
- form ricerca che resetta implicitamente `page` a 1.

La scelta e' preferita a infinite scroll perche' e' piu' leggibile, indicizzabile,
condivisibile e gia' supportata dal contratto API.

### Suggerimenti

La risposta pubblica listings verra' estesa con una sezione opzionale:

```ts
suggestions: {
  title: "Potrebbero interessarti anche"
  reason: "end_of_results" | "empty_exact" | "not_enough_results"
  items: PublicListingSummary[]
}
```

Regole:

- `items` continua a contenere i risultati della richiesta esatta;
- `meta.total` e `meta.totalPages` descrivono solo i risultati esatti;
- `suggestions.items` contiene annunci alternativi esclusi dai risultati esatti;
- se il database non ha annunci pubblicati, non mostrare suggerimenti;
- se pagina 1 ha zero risultati esatti, usare `empty_exact`;
- se una pagina ha meno di `pageSize` risultati e ci sono altri annunci utili,
  usare `not_enough_results`;
- se l'utente arriva oltre l'ultima pagina esatta, usare `end_of_results`.

L'ordinamento suggerimenti riusa la logica esistente di pertinenza: distanza
quando sono presenti coordinate, similarita' testuale quando c'e' query,
location rank, ranking score, sponsorship e freshness. La API deve evitare
duplicati tra risultati esatti e suggerimenti.

Nel frontend i suggerimenti saranno visualizzati sotto i risultati con heading
`Potrebbero interessarti anche`. La sezione non deve essere confusa con i
risultati richiesti.

### Cold start dev/prod

`dev-online` puo' restare con `minReplicas=0`, accettando cold start dopo
inattivita' per contenere i costi. Produzione deve invece documentare e applicare:

- web: `minReplicas >= 1`;
- API: `minReplicas >= 1`;
- worker: puo' restare `0` se lavora solo su job/polling controllato, oppure `1`
  se i job devono partire senza latenza.

Il workflow production dovra' essere preparato con questi valori quando verra'
implementato. Per ora si aggiorna la documentazione operativa e si evita di
modificare il costo di `dev-online` senza conferma esplicita.

## Componenti Coinvolti

- `packages/db`: schema e migrazione per `listing_images.blur_data_url`.
- `apps/worker/src/media/process-listing-images.ts`: generazione placeholder.
- `apps/worker/src/demo/upload-demo-assets.ts` e/o seed demo: placeholder per
  asset demo.
- `apps/api/src/listings`: query, tipi, mappatura immagini, suggerimenti.
- `apps/web/lib/api/types.ts`: tipi immagine e risposta listings.
- `apps/web/components/shared/storage-image.tsx`: supporto blurDataURL.
- `apps/web/app/(public)/_components`: cards, preview, sezioni suggerimenti.
- `apps/web/app/(public)/listings/page.tsx`: paginazione e rendering
  suggerimenti.
- `docs/deploy-strategy.md`: nota su cold start e min replicas production.

## Error Handling

- Se la generazione del placeholder fallisce, il worker continua a produrre
  `large` e `thumb`, lasciando `blur_data_url = null`.
- Se la query suggerimenti fallisce, la API deve fallire l'intera risposta solo
  se anche la query principale fallisce. In caso di errore isolato dei
  suggerimenti, meglio loggare e rispondere senza suggerimenti.
- Se il client riceve `suggestions.items = []`, non mostra la sezione.
- Link paginazione invalidi o fuori range devono restare gestiti dalla API e
  dalla validazione esistente; la pagina mostra suggerimenti quando opportuno.

## Test

- Worker: testare che `processImageBuffer` ritorni anche `blurDataUrl` valido e
  che inizi con `data:image/webp;base64,`.
- API listings: aggiornare test esistenti per `blurDataUrl`; aggiungere test per
  suggerimenti con risultati esatti corti, zero risultati esatti e pagina oltre
  fine risultati.
- Web: testare helper di paginazione/query preservation se estratto; al minimo
  typecheck e test esistenti.
- Verifica finale: `pnpm release:check`; dopo merge su `develop`, workflow
  `deploy-dev.yml` e smoke remoto.

## Fuori Scope

- Infinite scroll.
- Protezione dominio Cloudflare, ancora bloccata dal trasferimento dominio.
- Modifica di `minReplicas` in `dev-online` senza approvazione costi.
- Implementazione completa del workflow production.
- Provider email reale.
