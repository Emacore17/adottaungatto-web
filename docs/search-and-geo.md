# Strategia per ricerca full-text e geografica

## Fase iniziale: PostgreSQL

Per la prima versione usare PostgreSQL come motore di ricerca:

- `tsvector` su titolo, descrizione, razza, comune, provincia e regione;
- indice GIN per full-text;
- estensioni `unaccent` e `pg_trgm` per normalizzazione, errori di battitura e
  autocomplete;
- PostGIS con `geography(Point, 4326)` per distanza;
- indici GiST/SP-GiST per coordinate e geometrie;
- tabella denormalizzata `listing_search_documents`.

Questa scelta riduce infrastruttura, mantiene consistenza con il database
principale e basta per validare il prodotto.

## Ranking iniziale

Il ranking deve combinare:

- pertinenza testuale;
- distanza dal luogo cercato o dall'utente;
- freschezza dell'annuncio;
- presenza e qualita immagini;
- stato pubblicabile;
- completezza dei dati;
- segnali di affidabilita del profilo;
- filtri espliciti.

Formula iniziale indicativa:

```text
score =
  text_score * 0.45 +
  distance_score * 0.20 +
  freshness_score * 0.15 +
  quality_score * 0.12 +
  trust_score * 0.05 +
  engagement_score * 0.03
```

I pesi devono diventare configurabili dopo i primi test reali.

## Lista e scheda pubblica iniziali

Endpoint:

```http
GET /listings?page=1&pageSize=20&q=siamese%20roma
GET /listings/:id
```

La lista pubblica iniziale restituisce solo annunci pubblicabili:

- `moderation_status = approved`;
- `lifecycle_status = published`;
- `deleted_at is null`;
- `expires_at is null` oppure futura.

Quando `q` e' presente, la lista applica ricerca full-text PostgreSQL con
`websearch_to_tsquery`, `unaccent` e ranking `ts_rank_cd` su titolo,
descrizione, razza e luogo. La query usa `listing_search_documents` quando il
documento indicizzato esiste e cade sul vettore inline se il documento non e'
ancora stato costruito. Se la prima pagina full-text non restituisce risultati,
esegue un fallback `pg_trgm` tracciato in `meta.expansion`, senza rilassare i
filtri espliciti. Il ranking `postgres-v1` combina testo, distanza opzionale,
freschezza, qualita, trust ed engagement iniziale. Senza `q`, resta ordinata
per pubblicazione recente; con `sort=distance` e coordinate esplicite ordina
per distanza entro `radiusKm`.

Filtri iniziali:

- `q`;
- `breedId`;
- `municipalityId`;
- `provinceId`;
- `regionId`;
- `sex`;
- `ageMonthsMin`;
- `ageMonthsMax`;
- `isFree`;
- `isVaccinated`;
- `isSterilized`;
- `isDewormed`;
- `hasMicrochip`;
- `hasImages`.
- `lat`;
- `lng`;
- `radiusKm`;
- `sort`: `relevance`, `recent`, `distance`.

La scheda pubblica usa l'UUID dell'annuncio per evitare collisioni tra slug.
Include gallery delle immagini pronte, conteggio like e dati geografici
completi quando disponibili.

Stato: la lista pubblica filtrabile, `q` full-text e il documento
denormalizzato `listing_search_documents` sono implementati. La migrazione
`0012_aromatic_lyja.sql` crea la tabella, gli indici GIN/GiST/btree e il
backfill iniziale degli annunci gia pubblicati. La migrazione
`0013_elite_juggernaut.sql` aggiunge indici GiST expression su
`location_point::geography` per query distanza. Il refresh e' collegato a
decisioni di moderazione, processing immagini del worker e like/unlike. Il
worker espone `pnpm search:benchmark` per creare dataset sintetici marcati,
aggiornare il documento ricerca in bulk e salvare EXPLAIN JSON locali. Non sono
ancora implementati refresh sul futuro endpoint di modifica annunci pubblicati,
espansioni geografiche per risultati vuoti e benchmark con fixture realistiche.
I benchmark locali 10k/100k sono registrati in
[search-benchmark-results.md](search-benchmark-results.md).

La specifica operativa per implementare questo blocco e' in
[search-full-text-ranking.md](search-full-text-ranking.md).

## Evitare risultati vuoti

Se la query non restituisce risultati:

1. usare typo tolerance trigram, gia implementata per la prima pagina
   full-text vuota;
2. allargare la distanza geografica;
3. rimuovere filtri meno critici, dichiarandolo all'utente;
4. proporre risultati nella provincia o regione;
5. suggerire luoghi o razze alternative via autocomplete;
6. mostrare annunci recenti e di qualita nella stessa macro-area.

Ogni espansione deve essere tracciata nella risposta API per permettere al
frontend di spiegare cosa e' cambiato.

## Autocomplete luoghi

L'autocomplete deve cercare su:

- comuni;
- province, citta metropolitane ed enti equivalenti;
- regioni;
- alias e nomi normalizzati.

La risposta deve includere tipo, nome, gerarchia e coordinate:

```json
{
  "type": "municipality",
  "label": "Aosta",
  "subtitle": "Comune, Valle d'Aosta",
  "istatCode": "007003",
  "center": { "lat": 45.737, "lng": 7.321 }
}
```

### API iniziale

Endpoint:

```http
GET /places/autocomplete?q=Aosta&limit=8
```

Query params:

- `q`: testo da cercare, minimo 2 caratteri, massimo 80;
- `limit`: numero massimo di risultati, default 8, massimo 20;
- `type`: opzionale, uno tra `municipality`, `province`, `region`.

La ricerca usa i dati attivi in `geo_regions`, `geo_provinces` e
`geo_municipalities`, normalizza accenti e punteggiatura e ordina per:

- corrispondenza esatta;
- prefisso;
- contenuto;
- similarita `pg_trgm`;
- priorita comune, provincia, regione.

Esempio di risposta attuale per `q=Aosta`:

```json
{
  "items": [
    {
      "type": "municipality",
      "label": "Aosta",
      "subtitle": "Comune, Valle d'Aosta/Vallée d'Aoste",
      "istatCode": "007003",
      "center": null
    }
  ],
  "meta": {
    "query": "Aosta",
    "normalizedQuery": "aosta",
    "limit": 8,
    "type": "all"
  }
}
```

`center` e' valorizzato quando la tabella geografica ha il punto calcolato dai
confini Istat. Puo' restare `null` per unita amministrative nate dopo la data di
riferimento del pacchetto confini disponibile.

## Query Distanza

Endpoint:

```http
GET /places/nearby?lat=45.7496&lng=7.3063&radiusKm=10&limit=5&type=municipality
```

Query params:

- `lat`: latitudine dell'origine, tra -90 e 90;
- `lng`: longitudine dell'origine, tra -180 e 180;
- `radiusKm`: raggio in chilometri, default 50, massimo 500;
- `limit`: numero massimo di risultati, default 20, massimo 50;
- `type`: opzionale, uno tra `municipality`, `province`, `region`.

La query usa `ST_DWithin` e `ST_Distance` su `geography`, quindi le distanze
sono calcolate in metri reali a partire dai centroidi/punti delle unita
territoriali. I risultati sono ordinati per distanza crescente e includono
`distanceKm`.

Esempio di risposta:

```json
{
  "items": [
    {
      "type": "municipality",
      "label": "Aosta",
      "istatCode": "007003",
      "center": { "lat": 45.74958867811587, "lng": 7.306255569117242 },
      "distanceKm": 0
    }
  ],
  "meta": {
    "origin": { "lat": 45.7496, "lng": 7.3063 },
    "radiusKm": 10,
    "limit": 5,
    "type": "municipality"
  }
}
```

## Evoluzione futura

Introdurre un motore search dedicato solo quando:

- i tempi di risposta di PostgreSQL non rispettano gli obiettivi;
- servono ranking, sinonimi o typo tolerance piu avanzati;
- il traffico rende utile separare search e database transazionale.

Candidati futuri:

- Typesense per semplicita operativa e typo tolerance;
- Meilisearch per esperienza developer semplice;
- OpenSearch per casi piu complessi e grandi volumi.
