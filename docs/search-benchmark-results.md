# Risultati benchmark ricerca

Questo documento registra le misure locali disponibili per la ricerca
PostgreSQL/PostGIS. I risultati sono indicativi: dipendono dalla macchina locale,
dalla cache del database e dal dataset sintetico generato dal worker.

## Comando

```bash
pnpm docker:up
pnpm db:migrate
pnpm search:benchmark -- --size=10000
pnpm search:benchmark -- --size=100000
pnpm search:benchmark -- --cleanup
```

Gli artefatti EXPLAIN JSON sono generati localmente in
`benchmark-results/search/<timestamp>` e sono ignorati da Git. Il cleanup
rimuove solo il dataset sintetico dal database locale, non gli artefatti JSON.

## Esecuzione 8 maggio 2026

Dataset sintetico con annunci pubblicati, immagini pronte e like sintetici.
I risultati sotto usano il ranking `postgres-v1`.

| Dimensione |    Seed | Refresh documenti |  Totale | Artefatti                                           |
| ---------- | ------: | ----------------: | ------: | --------------------------------------------------- |
| 10k        |  1.90 s |            2.73 s |  4.71 s | `benchmark-results/search/2026-05-08T08-55-23-511Z` |
| 100k       | 12.67 s |           26.17 s | 39.17 s | `benchmark-results/search/2026-05-08T08-55-36-477Z` |

Execution time EXPLAIN ANALYZE:

| Query                 |      10k |      100k | Piano 100k                                        |
| --------------------- | -------: | --------: | ------------------------------------------------- |
| `recent-public`       |  0.19 ms |   0.99 ms | `listing_search_documents_published_idx`          |
| `full-text-selective` |  6.64 ms |  77.30 ms | `listing_search_documents_vector_gin`             |
| `combined-filters`    |  2.80 ms |  31.94 ms | `listing_search_documents_quality_idx`            |
| `geo-distance`        | 47.49 ms | 180.10 ms | `listing_search_documents_location_geography_gix` |

## Esito

Le query benchmark su 100k annunci restano sotto le soglie iniziali:

- lista filtrata senza `q`: sotto 300 ms;
- ricerca con `q` e ranking: sotto 500 ms;
- query geografica entro 300 ms nel caso sintetico misurato.

Il primo smoke benchmark ha mostrato che `location_point::geography` non usava
l'indice geometrico esistente e produceva una scansione sequenziale. La
migrazione `0013_elite_juggernaut.sql` aggiunge indici GiST expression su
`location_point::geography` per `listings` e `listing_search_documents`; dopo la
migrazione il piano geografico usa `Bitmap Index Scan`.

## Prossimi controlli

- Eseguire il test limite da 1M annunci solo quando serve misurare il margine.
- Ripetere i benchmark con fixture piu realistiche prima della produzione.
- Misurare p50/p95/p99 con un vero load test API, non solo EXPLAIN locale.
- Valutare un indice composito aggiuntivo per filtri combinati se i dati reali
  mostrano scansioni estese su `quality_score`.
