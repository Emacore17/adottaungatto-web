# Specifica ricerca full-text e ranking

Questo documento guida l'evoluzione della ricerca pubblica PostgreSQL/PostGIS.

## Stato attuale

Implementato:

- `GET /listings` pubblico, paginato e filtrabile;
- `GET /listings/:id` per scheda pubblica;
- `GET /listings/breeds` per filtri razza pubblici;
- query `q` con full-text PostgreSQL inline;
- tabella denormalizzata `listing_search_documents` con migrazione e backfill
  iniziale;
- ranking `postgres-v1` con testo, distanza opzionale, freschezza, qualita,
  trust ed engagement iniziale;
- tabella `listing_promotions` per promozioni attive dichiarate nello slot
  alto della lista, separate dal punteggio organico;
- sort pubblico `relevance`, `recent` e `distance`;
- fallback trigram tracciato quando la prima pagina full-text non restituisce
  risultati;
- refresh idempotente del documento ricerca dopo decisioni di moderazione,
  processing immagini del worker e like/unlike;
- CLI worker per dataset sintetici di ricerca ed EXPLAIN JSON locali;
- filtri principali su luogo, razza, sesso, eta, gratuitita, fascia contributo,
  dati sanitari e presenza immagini;
- indici parziali sugli annunci pubblici.

Non implementato:

- refresh sul futuro endpoint di modifica annunci pubblicati;
- espansioni geografiche e rilassamento filtri per risultati vuoti;
- benchmark limite 1M o benchmark con fixture realistiche;
- metriche specifiche di ricerca.

## Obiettivo

La ricerca deve restare su PostgreSQL/PostGIS nella prima versione e supportare
migliaia di annunci con latenza prevedibile. Deve combinare:

- corrispondenza testuale;
- filtri espliciti;
- distanza geografica;
- freschezza;
- qualita e completezza dell'annuncio;
- affidabilita minima del profilo;
- segnali sponsorizzati separati e dichiarabili.

## Fuori scope

- Motore search dedicato.
- Machine learning ranking.
- Gestione completa campagne/pagamenti per annunci sponsorizzati.
- Personalizzazione per utente.
- UI frontend.

## API pubblica

Endpoint:

```http
GET /listings?q=siamese%20roma&page=1&pageSize=20
GET /listings/breeds
```

Query param aggiuntivi:

- `q`: testo libero, opzionale, minimo 2 caratteri, massimo 120;
- `lat` e `lng`: origine geografica opzionale, da inviare insieme;
- `radiusKm`: raggio opzionale, default 50 km quando `lat`/`lng` sono presenti;
- `sort`: `relevance`, `recent`, `distance`;

I filtri gia implementati restano validi e hanno priorita sul ranking. Se un
filtro e' esplicito, non va rimosso senza dichiararlo nella risposta.
Le promozioni attive non modificano `rankingVersion`: sono uno slot dichiarato
e ordinato prima dei risultati organici solo quando l'annuncio promosso rispetta
i filtri applicati.

Meta risposta:

```json
{
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 42,
    "totalPages": 3,
    "query": "siamese roma",
    "sort": "relevance",
    "rankingVersion": "postgres-v1",
    "expansion": {
      "type": "trigram_text",
      "reason": "empty_full_text",
      "originalQuery": "siamese roma"
    }
  }
}
```

## Documento di ricerca

Creare una tabella denormalizzata, preferibile a una materialized view nella
fase iniziale per aggiornamenti controllati da worker o trigger applicativi.

Tabella implementata: `listing_search_documents`.

Campi minimi:

- `listing_id` primary key;
- `owner_user_id`;
- `title`;
- `description`;
- `breed_name`;
- `breed_slug`;
- `municipality_name`;
- `province_name`;
- `region_name`;
- `search_text`;
- `search_vector`;
- `location_point`;
- `published_at`;
- `updated_at`;
- `ready_image_count`;
- `has_cover_image`;
- `like_count`;
- `profile_type`;
- `quality_score`;
- `trust_score`;
- `indexed_at`.

Indici minimi:

- GIN su `search_vector`;
- GIN trigram su `search_text`;
- GiST su `location_point`;
- btree su `published_at`;
- btree combinato su `quality_score` e `trust_score`;
- btree o partial index per soli annunci pubblici se si denormalizzano stati.

## Costruzione testo

Usare pesi PostgreSQL:

- `A`: titolo e razza;
- `B`: comune, provincia, regione;
- `C`: descrizione;
- `D`: sinonimi o metadata secondari futuri.

Normalizzazione:

- `unaccent`;
- lowercase;
- rimozione punteggiatura non significativa;
- lingua italiana dove utile;
- conservare anche testo trigram per typo tolerance leggera.

## Query pipeline

1. Validare query e filtri con Zod.
2. Applicare sempre il filtro pubblico:
   - `moderation_status = approved`;
   - `lifecycle_status = published`;
   - `deleted_at is null`;
   - `expires_at is null or expires_at > now()`.
3. Applicare filtri espliciti.
4. Se `q` e' presente, calcolare `websearch_to_tsquery`.
5. Usare `listing_search_documents.search_vector` quando presente, con fallback
   sul vettore inline per annunci non ancora indicizzati.
6. Usare trigram fallback se la prima pagina full-text produce zero risultati.
7. Calcolare punteggi.
8. Ordinare per score e tie-break stabile.
9. Restituire meta con versione ranking ed eventuale espansione.

## Ranking v1

Formula iniziale:

```text
score =
  text_score * 0.45 +
  distance_score * 0.20 +
  freshness_score * 0.15 +
  quality_score * 0.12 +
  trust_score * 0.05 +
  engagement_score * 0.03
```

Definizioni:

- `text_score`: `ts_rank_cd` normalizzato, con boost titolo/razza;
- `distance_score`: 1.0 vicino all'origine, decresce fino al raggio massimo;
- `freshness_score`: massimo nei primi giorni, decadimento morbido;
- `quality_score`: immagini pronte, copertina, campi sanitari, descrizione
  sufficiente;
- `trust_score`: profilo verificato, tipo profilo, storico futuro;
- `engagement_score`: like e preferiti, con cap per evitare abusi.

Tie-break:

1. `score desc`;
2. `published_at desc`;
3. `id asc`.

Implementazione attuale:

```text
score =
  text_score * 0.45 +
  distance_score * 0.20 +
  freshness_score * 0.15 +
  quality_score * 0.12 +
  trust_score * 0.05 +
  engagement_score * 0.03
```

`text_score` usa `ts_rank_cd` solo quando `q` e' presente. `distance_score` e'
maggiore di zero solo quando la richiesta include `lat` e `lng`; in quel caso
la query applica `ST_DWithin` entro `radiusKm`. `quality_score`, `trust_score` e
`like_count` arrivano dal documento denormalizzato quando presente. Gli annunci
senza documento restano ricercabili via fallback inline, ma ricevono `0` sui
boost non testuali fino al refresh del documento.

## Qualita annuncio

Punteggio iniziale:

- +0.30 almeno una immagine pronta;
- +0.20 copertina pronta;
- +0.15 descrizione sopra soglia;
- +0.05 razza presente;
- +0.10 eta presente;
- +0.10 comune presente;
- +0.03 vaccinazione indicata;
- +0.03 sterilizzazione indicata;
- +0.02 sverminazione indicata;
- +0.02 microchip indicato.

Il punteggio va salvato nel documento di ricerca per evitare ricalcolo pesante.

## Fallback risultati vuoti

Implementato:

- se `q` e' presente, la pagina richiesta e' la prima e la query full-text non
  restituisce righe, l'API esegue una seconda query con `similarity` e
  `word_similarity` di `pg_trgm`;
- i filtri espliciti restano invariati;
- il fallback usa `listing_search_documents.search_text` quando disponibile e
  un testo inline equivalente per annunci non ancora indicizzati;
- la risposta valorizza `meta.expansion` con `type: "trigram_text"`,
  `reason: "empty_full_text"` e `originalQuery`.
- se una ricerca con coordinate e raggio non restituisce righe, l'API usa
  `expanded_radius`: rimuove `ST_DWithin`, mantiene ordinamento per distanza e
  segnala `originalRadiusKm`;
- se testo/filtri/raggio continuano a produrre zero risultati, l'API usa
  `relaxed_filters`: propone annunci pubblicati ordinati per distanza, matching
  geografico e similarita testuale quando disponibili.

Pianificato:

Applicare espansioni tracciate:

1. passaggio esplicito da comune a provincia;
2. passaggio esplicito da provincia a regione;
3. rimozione selettiva solo di filtri soft definiti dal prodotto;
4. suggerimenti diretti di luoghi o razze alternative.

La risposta deve indicare cosa e' stato espanso:

```json
{
  "type": "geo_radius",
  "fromRadiusKm": 20,
  "toRadiusKm": 50,
  "reason": "too_few_results"
}
```

## Benchmark

Comando implementato:

```bash
pnpm search:benchmark -- --size=10000
pnpm search:benchmark -- --size=100000 --output-dir=benchmark-results/search
pnpm search:benchmark -- --cleanup
```

Il comando worker crea o ricrea annunci sintetici marcati, immagini pronte e
like sintetici, aggiorna `listing_search_documents` in bulk, esegue EXPLAIN
JSON sulle query principali e salva artefatti locali in
`benchmark-results/search/<timestamp>`. L'opzione `--skip-seed` riusa il
dataset sintetico gia presente, mentre `--no-explain-analyze` evita
`EXPLAIN ANALYZE` quando serve solo verificare il piano stimato. L'opzione
`--cleanup` rimuove dal database locale il dataset benchmark sintetico.

Dataset sintetici:

- 10k annunci, eseguito localmente l'8 maggio 2026;
- 100k annunci, eseguito localmente l'8 maggio 2026;
- 1M annunci, solo per test di limite.

Risultati locali disponibili:

- [search-benchmark-results.md](search-benchmark-results.md).

Misure obbligatorie:

- p50, p95, p99;
- EXPLAIN ANALYZE delle query principali;
- hit ratio indici;
- tempo aggiornamento documento ricerca;
- latenza con filtri combinati;
- latenza con `q` vuota e con `q` selettiva;
- latenza con distanza geografica.

Soglie iniziali:

- p95 sotto 300 ms per lista filtrata senza `q`;
- p95 sotto 500 ms per ricerca con `q` e ranking;
- p99 sotto 900 ms su 100k annunci.

## Test

Unit test:

- validazione query;
- normalizzazione testo;
- calcolo quality score;
- mapping response e meta espansione;
- fallback trigram quando la prima pagina full-text e' vuota.

Integration test:

- indicizzazione documento;
- full-text su titolo, razza e luogo;
- filtri combinati;
- ordinamento stabile;
- fallback trigram;
- esclusione annunci non pubblici.

Load test:

- ricerca pubblica;
- ricerca con distanza;
- aggiornamento documenti dopo moderazione;
- picchi di traffico su pagina risultati.

## Osservabilita

Metriche:

- `search.request.count`;
- `search.request.duration`;
- `search.result.count`;
- `search.expansion.count`;
- `search.query.empty_result.count`;
- `search.query.error.count`;
- `search.index.refresh.duration`;
- `search.index.stale.count`.

Log:

- query normalizzata;
- filtri applicati;
- ranking version;
- durata;
- numero risultati;
- tipo espansione;
- mai loggare token, email o dati personali non necessari.

## Piano incrementale

1. Fatto: aggiungere `q` allo schema validation di lista pubblica.
2. Fatto: implementare query full-text inline senza fallback.
3. Fatto: aggiungere schema e migrazione `listing_search_documents`.
4. Fatto: aggiungere backfill iniziale degli annunci pubblicati.
5. Fatto parziale: usare il documento nella lista pubblica con fallback inline.
6. Fatto: aggiungere servizio refresh documento lato API e SQL condivisa con
   worker.
7. Fatto: popolare o rimuovere documento quando un annuncio viene approvato,
   respinto o sospeso.
8. Fatto: aggiornare documento dopo processing immagini e like/unlike.
9. Collegare il refresh al futuro endpoint di modifica annunci pubblicati.
10. Fatto: aggiungere ranking v1 con distanza, freschezza ed engagement.
11. Fatto parziale: aggiungere fallback trigram per risultati full-text vuoti.
12. Fatto: aggiungere CLI benchmark e dataset sintetici.
13. Fatto: eseguire benchmark 10k/100k, confrontare EXPLAIN e aggiungere indici
    geography.
14. Fatto: aggiungere `listing_promotions` e slot sponsorizzato dichiarato
    nella lista pubblica senza mescolarlo al punteggio organico.
15. Eseguire benchmark limite 1M o fixture realistiche quando serve misurare il
    margine prima della produzione.
16. Valutare motore search dedicato solo se PostgreSQL non rispetta le soglie.

## Rischi

- Ranking opaco che penalizza annunci validi ma nuovi.
- Query troppo costose con filtri combinati.
- Documento ricerca stale dopo moderazione o update immagini.
- Engagement score manipolabile.
- Fallback non chiaro per l'utente.

## Domande aperte

- La distanza deve restare esplicita da `lat`/`lng` o essere dedotta dal luogo
  scelto?
- Quali filtri sono soft e possono essere rilassati?
- Quanto peso dare ai profili professionali rispetto agli utenti privati?
- Come evolvere `listing_promotions` in campagne reali senza confondere slot
  dichiarati e risultati organici?
