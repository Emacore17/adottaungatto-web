# Documentazione tecnica

Questa cartella raccoglie la documentazione iniziale del progetto
adottaungatto.it.

## Documenti creati

- [architecture.md](architecture.md): analisi architetturale e principi guida.
- [backend-stack.md](backend-stack.md): scelta motivata dello stack backend.
- [monorepo-structure.md](monorepo-structure.md): struttura consigliata del monorepo.
- [roadmap.md](roadmap.md): roadmap a milestone incrementali.
- [modules.md](modules.md): moduli principali del sistema.
- [data-model.md](data-model.md): modello dati iniziale.
- [project-state.md](project-state.md): stato reale del repository e gap principali.
- [frontend-nextjs-shadcn-guidelines.md](frontend-nextjs-shadcn-guidelines.md): linee guida operative per scaffolding frontend Next.js, shadcn/ui, SEO e agenti AI.
- [search-and-geo.md](search-and-geo.md): strategia di ricerca full-text e geografica.
- [search-full-text-ranking.md](search-full-text-ranking.md): specifica operativa per ranking, indici e benchmark ricerca.
- [search-benchmark-results.md](search-benchmark-results.md): risultati locali dei benchmark ricerca.
- [italian-places-import.md](italian-places-import.md): import dei luoghi italiani da fonti ufficiali.
- [authz.md](authz.md): autenticazione, autorizzazione e ruoli.
- [production-readiness.md](production-readiness.md): checklist per arrivare a produzione.
- [ops-monitoring-release.md](ops-monitoring-release.md): ambienti, osservabilita, Dynatrace e CI/CD.
- [local-testing-and-mocks.md](local-testing-and-mocks.md): mock, fixture e prova locale.
- [sponsored-listings-business.md](sponsored-listings-business.md): strategia per annunci sponsorizzati.
- [agent-documentation-plan.md](agent-documentation-plan.md): piano documentale ottimizzato per agenti AI.
- [contacts.md](contacts.md): contatto proprietario privacy-first.
- [favorites.md](favorites.md): preferiti degli annunci pubblicati.
- [likes.md](likes.md): like pubblici aggregati sugli annunci pubblicati.
- [moderation.md](moderation.md): moderazione annunci e segnalazioni.
- [notifications.md](notifications.md): centro notifiche in-app.
- [images.md](images.md): gestione immagini e asset statici.
- [local-development-docker.md](local-development-docker.md): sviluppo locale con Docker.
- [first-technical-tasks.md](first-technical-tasks.md): primi task tecnici.
- [adr](adr): decisioni architetturali.

## Regole di aggiornamento

- Ogni scelta tecnica rilevante va registrata in un ADR.
- Ogni milestone deve aggiornare almeno roadmap, task e setup se cambia il modo
  di sviluppare o testare in locale.
- La documentazione deve descrivere lo stato reale del repository, non uno stato
  desiderato non ancora implementato.
