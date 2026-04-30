# Strategia per import dei luoghi italiani

## Fonti ufficiali

Usare fonti istituzionali, con priorita a Istat:

- Codici statistici delle unita amministrative territoriali: comuni, citta
  metropolitane, province e regioni.
- SITUAS, Sistema Informativo Territoriale delle Unita Amministrative e
  Statistiche, per report alla data corrente o a una data di interesse.
- Confini delle unita amministrative a fini statistici, in shapefile WGS84.

Link di riferimento:

- https://www.istat.it/classificazione/codici-dei-comuni-delle-province-e-delle-regioni/
- https://situas.istat.it/
- https://www.istat.it/notizia/confini-delle-unita-amministrative-a-fini-statistici-al-1-gennaio-2018-2/

## Strategia dati

Separare dati amministrativi e dati geografici:

- dati amministrativi: codici, denominazioni, gerarchia, date di validita;
- dati geografici: geometrie, centroidi e bounding box.

Il database deve mantenere:

- `istat_code` come identificativo istituzionale;
- chiavi interne UUID o bigint indipendenti;
- `valid_from` e `valid_to` per variazioni nel tempo;
- import run con checksum, sorgente, data di riferimento e riepilogo.

## Pipeline import

1. Scaricare o acquisire il report Istat/SITUAS per la data di riferimento.
2. Scaricare shapefile confini amministrativi WGS84 dello stesso anno, se
   disponibile.
3. Salvare i file originali in object storage o cartella di cache locale.
4. Calcolare checksum dei sorgenti.
5. Parsare dati amministrativi e geometrie.
6. Normalizzare nomi, slug, alias e codici.
7. Validare gerarchia regione/provincia/comune.
8. Eseguire upsert in tabelle staging.
9. Confrontare staging e tabelle correnti.
10. Applicare modifiche in transazione.
11. Registrare `geo_import_runs`.
12. Aggiornare indici e viste autocomplete.

## Implementazione corrente

Il worker espone uno script verificabile:

```bash
pnpm geo:import
```

Lo script scarica il permalink Istat configurato da
`ISTAT_MUNICIPALITIES_XLSX_URL`, calcola lo SHA-256, legge il foglio `CODICI`
dell'XLSX e produce un riepilogo dry-run senza scrivere nel database.

Il comando `pnpm --filter worker geo:import:apply` scrive invece:

- una riga idempotente in `geo_import_runs`, deduplicata per checksum;
- le regioni in `geo_import_staged_regions`;
- le province, citta metropolitane, province autonome, liberi consorzi e unita
  non amministrative in `geo_import_staged_provinces`;
- i comuni in `geo_import_staged_municipalities`.

Il comando `pnpm geo:promote` confronta l'ultimo staging con le tabelle
definitive e restituisce, senza scrivere, quanti record sono invariati, da
inserire/aggiornare o da chiudere. Il comando `pnpm geo:promote:apply` applica
lo stesso piano in transazione su:

- `geo_regions`;
- `geo_provinces`;
- `geo_municipalities`.

La promozione e' idempotente: ripetere `geo:promote:apply` sullo stesso staging
non deve produrre nuovi inserimenti o chiusure. I record attivi sono quelli con
`valid_to is null`; per i comuni vale anche `is_active = true`.

Verifica del 30 aprile 2026 sul permalink Istat:

- data di riferimento del file: 21 febbraio 2026;
- regioni: 20;
- unita sovracomunali: 110;
- comuni: 7.894;
- errori di validazione: 0.

La stessa esecuzione e' stata promossa sul database locale con:

- regioni attive: 20;
- unita sovracomunali attive: 110;
- comuni attivi: 7.894;
- stato import run: `applied`.

Lo step successivo e' importare o calcolare geometrie e centroidi da fonti
territoriali ufficiali, poi esporre query di autocomplete dei luoghi.

## Confini e centroidi

Il worker espone anche:

```bash
pnpm geo:boundaries
pnpm geo:boundaries:apply
```

La fonte corrente e' il pacchetto Istat generalizzato:

```text
https://www.istat.it/storage/cartografia/confini_amministrativi/generalizzati/2026/Limiti01012026_g.zip
```

Lo script scarica il file ZIP, calcola lo SHA-256, legge gli shapefile WGS84 e
aggiorna `geom` e `centroid` nelle tabelle definitive. Il punto salvato in
`centroid` e' calcolato con `ST_PointOnSurface` sulla geometria ufficiale resa
valida da PostGIS, cosi' il punto resta dentro il poligono anche in presenza di
geometrie complesse.

Verifica del 30 aprile 2026:

- regioni con geometria e punto: 20/20;
- unita sovracomunali con geometria e punto: 110/110;
- comuni con geometria e punto: 7.893/7.894.

Il comune attivo senza geometria e' `Castegnero Nanto` (`024129`), perche' i
confini Istat 2026 sono riferiti al 1 gennaio 2026 mentre l'anagrafica
amministrativa importata e' aggiornata al 21 febbraio 2026.

## Coordinate

Non usare coordinate manuali non tracciate. Per i comuni calcolare il centroide
da geometria ufficiale Istat/PostGIS. Per la ricerca a distanza usare:

- centroide comunale per query per comune;
- geometria o centroide provincia/regione per espansione area;
- coordinate dell'utente solo con consenso esplicito.

## Aggiornamenti

- Job manuale in sviluppo.
- Job schedulato in produzione, almeno mensile.
- Import idempotente: ripetere lo stesso import non deve creare duplicati.
- Storico mantenuto per gestire comuni soppressi, fusioni e cambi
  denominazione.

## Casi particolari

- Province autonome.
- Citta metropolitane.
- Liberi consorzi comunali.
- Variazioni territoriali della Sardegna dal 2026.
- Comuni cessati o rinominati.
- Nomi multilingue o con caratteri speciali.
