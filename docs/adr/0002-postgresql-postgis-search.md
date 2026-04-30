# ADR 0002 - PostgreSQL, PostGIS e ricerca iniziale

## Stato

Accettata per fase iniziale.

## Contesto

La piattaforma richiede dati relazionali, geografia italiana, filtri, ranking,
audit e transazioni. La ricerca e' centrale, ma in fase iniziale i volumi non
giustificano necessariamente un motore dedicato.

## Decisione

Usare PostgreSQL come database principale con:

- PostGIS per geografia;
- full-text search PostgreSQL;
- `pg_trgm` per fuzzy/autocomplete;
- `unaccent` per normalizzazione;
- viste o tabelle denormalizzate per documenti di ricerca.

Valutare Typesense, Meilisearch o OpenSearch solo in una fase successiva.

## Conseguenze positive

- Meno infrastruttura iniziale.
- Consistenza forte tra annunci e ricerca.
- Buon supporto per query geografiche.
- Migrazioni e test locali piu semplici.

## Conseguenze negative

- Ranking e typo tolerance meno potenti rispetto a motori dedicati.
- Necessita attenzione a indici e query plan.
- Potrebbe servire estrarre la search quando il traffico cresce.

