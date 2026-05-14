# Documentazione tecnica

Indice aggiornato della documentazione di `adottaungatto.it`.

## Operativa

- [production-readiness.md](production-readiness.md): gate di produzione,
  configurazione e checklist go-live.
- [deploy-strategy.md](deploy-strategy.md): strategia concreta di deploy,
  stack cloud, CI/CD, segreti, costi e guida operativa.
- [project-state.md](project-state.md): stato reale del repository e rischi
  residui.
- [local-development-docker.md](local-development-docker.md): sviluppo locale,
  Docker, demo e reset.
- [test-data.md](test-data.md): utenti, annunci, immagini e fixture demo.
- [ops-monitoring-release.md](ops-monitoring-release.md): ambienti,
  osservabilita, CI/CD e rilascio.

## Architettura

- [architecture.md](architecture.md): principi architetturali.
- [backend-stack.md](backend-stack.md): scelta dello stack backend.
- [monorepo-structure.md](monorepo-structure.md): struttura workspace.
- [data-model.md](data-model.md): modello dati.
- [modules.md](modules.md): moduli applicativi.
- [adr](adr): decisioni architetturali.

## Aree funzionali

- [authz.md](authz.md): autenticazione, autorizzazione e ruoli.
- [moderation.md](moderation.md): moderazione, segnalazioni e audit.
- [notifications.md](notifications.md): notifiche in-app e real-time locale.
- [contacts.md](contacts.md): contatto proprietario privacy-first.
- [favorites.md](favorites.md): preferiti.
- [likes.md](likes.md): like aggregati storici.
- [images.md](images.md): upload, processamento e storage immagini.
- [search-and-geo.md](search-and-geo.md): ricerca e geografia.
- [search-full-text-ranking.md](search-full-text-ranking.md): ranking e indici.
- [italian-places-import.md](italian-places-import.md): import luoghi ISTAT.

## Storico e roadmap

Questi documenti descrivono evoluzioni o decisioni passate. Usarli come
contesto, non come stato di produzione:

- [roadmap.md](roadmap.md)
- [agent-coding-roadmap.md](agent-coding-roadmap.md)
- [frontend-nextjs-shadcn-guidelines.md](frontend-nextjs-shadcn-guidelines.md)
- [frontend-brand-redesign.md](frontend-brand-redesign.md)
- [search-benchmark-results.md](search-benchmark-results.md)
- [sponsored-listings-business.md](sponsored-listings-business.md)
- [local-testing-and-mocks.md](local-testing-and-mocks.md)
- [first-technical-tasks.md](first-technical-tasks.md)
- [agent-documentation-plan.md](agent-documentation-plan.md)

## Regole

- La documentazione deve descrivere lo stato reale, non solo quello desiderato.
- Ogni scelta tecnica rilevante va registrata in ADR o nel documento dell'area.
- Ogni modifica a setup, env, migrazioni o release deve aggiornare
  `production-readiness.md` o `ops-monitoring-release.md`.
