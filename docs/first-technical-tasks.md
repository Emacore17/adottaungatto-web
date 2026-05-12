# Primi task tecnici

## Task immediati

Stato aggiornato al completamento dello scaffolding iniziale:

1. Fatto: repository Git presente in `adottaungatto-web`.
2. Fatto: monorepo Next.js/shadcn creato.
3. Fatto: lock skill shadcn/ui presente.
4. Fatto: script root configurati.
5. Fatto: app `api` NestJS minima.
6. Fatto: app `worker` minima.
7. Fatto: TypeScript, ESLint e test configurati.
8. Fatto: `.env.example` e validazione env iniziale.
9. Fatto: `packages/db` configurato con Drizzle.
10. Fatto: prima migrazione con estensioni PostgreSQL:
    - `postgis`;
    - `unaccent`;
    - `pg_trgm`.
11. Fatto: schema iniziale per geografia, utenti, ruoli e annunci.
12. Fatto: seed ruoli e razze base.
13. Fatto: job import luoghi in modalita dry-run.
14. Fatto: endpoint health per API.
15. Fatto: test minimi per API e worker.

## Prossimi task tecnici

1. Fatto: collegare API a `packages/db` con dependency injection.
2. Fatto: health check database/Redis separati da `/health`.
3. Fatto: implementare staging e dry-run reale dell'import luoghi.
4. Fatto: promuovere lo staging luoghi nelle tabelle geografiche definitive.
5. Fatto: aggiungere endpoint API iniziale per autocomplete luoghi.
6. Fatto: importare o calcolare geometrie e centroidi da fonti territoriali ufficiali.
7. Fatto: aggiungere query distanza con PostGIS.
8. Fatto: aggiungere schema `listing_images` e tabelle di moderazione.
9. Fatto: aggiungere schema `user_roles` e `sessions` per avviare identita e profili.
10. Fatto: implementare modulo auth API iniziale: registrazione, login e sessioni.
11. Fatto: aggiungere guard auth riusabile e endpoint profilo utente.
12. Fatto: aggiungere update profilo utente e policy per cambio `profile_type`.
13. Fatto: implementare verifica email con token monouso e Mailpit in locale.
14. Fatto: implementare recupero password con token monouso.
15. Fatto: implementare cambio password autenticato e rotazione sessione.
16. Fatto: avviare CRUD annunci utente in bozza.
17. Fatto: aggiungere invio bozza a moderazione con controlli minimi.
18. Fatto: avviare upload immagini annuncio su storage locale.
19. Fatto: aggiungere conferma/processamento immagini e varianti thumbnail.
20. Fatto: integrare immagini pronte nei controlli di invio a moderazione.
21. Fatto: avviare coda moderazione admin per annunci `pending_review`.
22. Fatto: aggiungere decisioni moderatore: approva, rifiuta, sospendi.
23. Fatto: aggiungere segnalazioni utenti e collegamento ai casi di moderazione.
24. Fatto: aggiungere coda moderazione per casi nati da segnalazioni utenti.
25. Fatto: aggiungere gestione report dopo decisione: risoluzione/dismiss
    delle segnalazioni collegate.
26. Fatto: aggiungere notifiche email per esiti di moderazione e segnalazioni.
27. Fatto: aggiungere preferenze notifiche e opt-out per email non essenziali.
28. Fatto: aggiungere prime notifiche in-app e centro notifiche minimale.
29. Fatto: avviare preferiti utente per annunci pubblicati.
30. Fatto: avviare like pubblici aggregati per annunci pubblicati.
31. Fatto: avviare endpoint pubblici di lista e scheda annuncio.
32. Fatto: aggiungere filtri principali alla lista pubblica annunci.
33. Fatto: avviare ricerca full-text per la lista pubblica annunci.
34. Fatto: aggiungere schema e migrazione `listing_search_documents` con
    backfill iniziale e uso nella query pubblica.
35. Fatto: aggiungere refresh automatico del documento ricerca dopo decisioni
    di moderazione, processing immagini e like/unlike.
36. Collegare il refresh al futuro endpoint di modifica annunci pubblicati.
37. Fatto: aggiungere CLI benchmark ricerca con dataset sintetici ed EXPLAIN
    JSON salvati localmente.
38. Fatto: eseguire benchmark 10k/100k, confrontare EXPLAIN e aggiungere indici
    geography per le query distanza.
39. Eseguire benchmark limite 1M o fixture realistiche quando serve misurare il
    margine prima della produzione.
40. Fatto: aggiungere ranking pubblico `postgres-v1` con distanza opzionale,
    freschezza ed engagement iniziale.
41. Fatto: aggiungere fallback trigram tracciato per ricerche full-text senza
    risultati in prima pagina.
42. Fatto: aggiungere linee guida frontend Next.js/shadcn per scaffolding,
    SEO, Server/Client Components e lavoro agentico a basso consumo token.
43. Fatto: creare configurazione frontend centrale: env, site, routes, SEO
    helper e client API tipizzato.
44. Fatto: sostituire la placeholder page Next.js con una homepage pubblica
    orientata a ricerca e annunci.
45. Fatto: aggiungere layout route group pubblici, auth e account.
46. Fatto: aggiungere `robots.ts`, `sitemap.ts`, metadata dinamici e primi
    JSON-LD per pagine pubbliche indicizzabili.
47. Fatto: aggiungere endpoint pubblico razze e filtri frontend per razza e
    fascia contributo.
48. Fatto: aggiungere route group admin/moderazione protetto, noindex e
    collegato in lettura alle API di moderazione esistenti.
49. Fatto: collegare UI account a bozze annuncio, preferiti e notifiche.
50. Fatto: implementare contatto proprietario con privacy by default.
51. Fatto: aggiungere azioni UI di moderazione con motivo obbligatorio per
    approvare, rifiutare e sospendere.
52. Fatto: aggiungere mutazioni UI account per rimozione preferiti, lettura
    notifiche, cancellazione bozze ed editor bozze.
53. Fatto: aggiungere rate limit dedicato per il contatto proprietario.
54. Fatto: completare editor bozze frontend con creazione, modifica, upload
    immagini e invio a moderazione.
55. Fatto: aggiungere galleria immagini bozza con stato processamento,
    eliminazione e riordino/copertina.
56. Fatto: aggiungere preferenza per-annuncio per abilitare/disabilitare il
    contatto proprietario.
57. Aggiungere eventuali canali aggiuntivi o finestre orarie per il contatto
    proprietario quando saranno previsti dal prodotto.
58. Fatto: aggiungere rate limit Redis iniziale sui flussi auth sensibili:
    registrazione, login, verifica email, recupero password e cambio password.
59. Fatto: definire roadmap operativa agentica e contratto dati demo locali.
60. Avviato: completare fixture demo con ruoli moderator/admin, stati annuncio
    multipli, asset placeholder, sponsorizzato mock e smoke admin con
    approvazione fino a pubblicazione; restano immagini realistiche.
61. Fatto: correggere il flusso inserimento annuncio con processing automatico
    immagini nel worker dev, copy UI "Inserisci annuncio", stati immagine
    chiari, schermata di conferma, guida passaggi e smoke E2E completo.
62. Fatto: aggiungere smoke E2E per upload immagine e invio a revisione
    riuscito.
63. Riorganizzare dashboard account e aggiungere impostazioni profilo utente.
64. Trasformare preferiti in cuore toggle con animazione su lista e scheda.
65. Fatto: rendere `/listings` una lista a card orizzontali con slot
    sponsorizzato.
66. Estendere area admin/moderazione separata e protetta.

## Task documentali e pre-produzione

1. Fatto: ripulire artefatti locali ignorati da Git.
2. Fatto: allineare documentazione a stato reale del repository.
3. Fatto: aggiungere piano documentale per agenti AI.
4. Fatto: aggiungere checklist readiness produzione.
5. Fatto: aggiungere piano locale per mock, fixture e smoke test.
6. Fatto: aggiungere piano osservabilita, ambienti, release e CI/CD.
7. Fatto: dettagliare specifica tecnica della ricerca full-text e ranking.
8. Avviato: dettagliare hardening auth/sessioni/rate limit in `docs/authz.md`
   e aggiungere il primo rate limit auth; restano cookie/CSRF, gestione
   sessioni production-grade, lock progressivo account e copertura upload/admin.
9. Dettagliare area admin/moderazione sicura.
10. Fatto: dettagliare test data e script bootstrap locale in
    `docs/test-data.md` e `docs/local-testing-and-mocks.md`.

## Task da non fare ancora

- Marketplace completo.
- Area admin completa.
- Messaggistica interna.
- Pagamenti.
- App mobile.
- Kubernetes.
- Motore search dedicato.

## Prompt operativo consigliato

```text
Procedi con la prossima milestone di docs/agent-coding-roadmap.md. Leggi
docs/project-state.md, docs/agent-coding-roadmap.md e il documento dell'area
toccata. Mantieni il diff piccolo, aggiorna documentazione e stato reale,
esegui le verifiche richieste e committa a fine round con messaggio breve.
```
