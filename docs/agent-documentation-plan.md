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
3. `docs/agent-coding-roadmap.md`
4. Il documento dell'area toccata.
5. `docs/first-technical-tasks.md` solo se si aggiorna la roadmap operativa.

Per task frontend Next.js/shadcn leggere invece:

1. `docs/project-state.md`
2. `docs/agent-coding-roadmap.md`
3. `docs/frontend-nextjs-shadcn-guidelines.md`
4. Il documento di dominio toccato, per esempio ricerca, auth o immagini.

Non caricare tutta `docs/` per task frontend locali.

## Ordine consigliato dei prossimi step

1. Seguire `docs/agent-coding-roadmap.md` come sequenza primaria.
2. Per il giro locale iniziare da Milestone A o B:
   - `docs/test-data.md`;
   - `docs/local-testing-and-mocks.md`;
   - flusso annunci in `docs/moderation.md` e `docs/images.md`.
3. Specificare hardening quando una milestone tocca sicurezza:
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
   - espansioni risultati vuoti.

   Stato: specifica iniziale completata in
   `docs/search-full-text-ranking.md`.
5. Fatto: specificare frontend Next.js/shadcn:
   - struttura app;
   - Server e Client Components;
   - shadcn/ui monorepo;
   - SEO;
   - auth/proxy;
   - configurazione centrale.

   Stato: specifica iniziale completata in
   `docs/frontend-nextjs-shadcn-guidelines.md`.
6. Specificare admin/moderazione:
   - ruoli;
   - MFA;
   - audit;
   - UI interna;
   - policy operative.
7. Specificare osservabilita e release:
   - Dynatrace/OpenTelemetry;
   - log;
   - dashboard;
   - CI/CD;
   - rollback.
8. Specificare business:
   - sponsorizzazioni;
   - profili professionali;
   - reportistica.

## Chiusura round

Ogni round deve:

1. aggiornare stato e documenti toccati;
2. eseguire verifiche proporzionate al diff;
3. controllare `git status --short`;
4. fare commit con messaggio breve.

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
docs/project-state.md, docs/agent-coding-roadmap.md e il documento dell'area
richiesta. Aggiorna lo stato reale, crea checklist operative, non modificare
codice applicativo e committa a fine round.
```
