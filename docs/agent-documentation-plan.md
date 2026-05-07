# Piano documentale per agenti AI

Questo file serve a ridurre token e ambiguita nei prossimi lavori. Per task
documentali futuri, l'agente deve leggere solo i documenti indicati nello step
attivo.

## Regola base

Se il task dice "documentazione", non modificare codice applicativo. Sono
ammessi solo file Markdown, esempi `.env`, checklist e, se richiesti
esplicitamente, script/documenti di supporto.

## Lettura minima per ogni nuovo task

1. `docs/README.md`
2. `docs/project-state.md`
3. Il documento dell'area toccata.
4. `docs/first-technical-tasks.md` solo se si aggiorna la roadmap operativa.

## Ordine consigliato dei prossimi step

1. Consolidare documenti di produzione:
   - `docs/production-readiness.md`
   - `docs/ops-monitoring-release.md`
2. Scrivere documentazione locale e fixture:
   - `docs/local-testing-and-mocks.md`
   - futuro `docs/test-data.md`
   - futuro `docs/api-smoke-tests.md`
3. Specificare hardening:
   - auth/sessioni;
   - rate limit;
   - upload;
   - audit;
   - GDPR/privacy.
4. Specificare ricerca:
   - modello `listing_search_documents`;
   - ranking;
   - indici;
   - benchmark;
   - fallback risultati vuoti.
5. Specificare admin/moderazione:
   - ruoli;
   - MFA;
   - audit;
   - UI interna;
   - policy operative.
6. Specificare osservabilita e release:
   - Dynatrace/OpenTelemetry;
   - log;
   - dashboard;
   - CI/CD;
   - rollback.
7. Specificare business:
   - sponsorizzazioni;
   - profili professionali;
   - reportistica.

## Template per ogni documento nuovo

```md
# Titolo

## Stato attuale

## Obiettivo

## Fuori scope

## Requisiti

## Piano incrementale

## Test o verifiche

## Rischi

## Domande aperte
```

## Convenzioni

- Tenere i documenti sotto 200 righe quando possibile.
- Usare liste operative e frasi brevi.
- Separare "implementato" da "pianificato".
- Non duplicare dettagli: linkare il documento sorgente.
- Aggiornare `docs/README.md` quando si aggiunge un documento.
- Aggiornare `docs/project-state.md` quando cambia lo stato reale.

## Prompt operativo suggerito

```text
Lavora solo sulla documentazione. Leggi docs/README.md,
docs/project-state.md e il documento dell'area richiesta. Aggiorna lo stato
reale, crea checklist operative e non modificare codice applicativo.
```
