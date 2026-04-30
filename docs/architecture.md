# Analisi architetturale

## Contesto

adottaungatto.it e' un marketplace verticale per annunci di adozione di gatti e
gattini in Italia. Il prodotto richiede ricerca testuale e geografica, profili
utente, gestione immagini, moderazione, contatti, preferiti, notifiche e una
area interna per moderatori e amministratori.

La prima fase non deve implementare l'applicazione completa. Deve rendere
esplicite le decisioni tecniche, preparare il monorepo e ridurre il rischio
delle fasi successive.

## Principi architetturali

- Modular monolith prima dei microservizi: un singolo backend modulare e'
  sufficiente per partire, piu semplice da testare e piu facile da evolvere.
- Database relazionale come fonte di verita: annunci, utenti, ruoli, luoghi,
  audit e moderazione richiedono consistenza forte.
- Ricerca progressiva: PostgreSQL copre la fase iniziale con full-text,
  trigrammi e PostGIS; un motore dedicato potra essere aggiunto quando i volumi
  o il ranking lo richiederanno.
- Storage immagini fuori dal filesystem applicativo: usare API S3-compatible
  da subito permette parita tra locale e cloud.
- Permessi lato server: il frontend non e' mai fonte di verita per ruoli,
  ownership o stato di pubblicazione.
- Eventi e code per lavori lenti: import geografico, processamento immagini,
  email, notifiche e controlli di moderazione vanno fuori dal ciclo request/
  response.
- Documentazione viva: ogni scelta non banale deve avere una traccia in docs e,
  se architetturale, un ADR.

## Vista logica

Il sistema e' diviso in questi blocchi:

- Web app: Next.js per esperienza pubblica, account utente e area admin.
- API backend: NestJS per dominio, autorizzazione, workflow, validazioni e API.
- Worker: processi asincroni per import luoghi, immagini, notifiche e job
  periodici.
- Database: PostgreSQL con PostGIS come fonte dati primaria.
- Cache/code: Redis per rate limiting, cache breve e job queue.
- Object storage: MinIO in locale, S3-compatible in cloud.
- Email provider: Mailpit in locale, provider transazionale in produzione.

## Vista deployment iniziale

In locale:

- web su porta 3000;
- api su porta 4000;
- PostgreSQL/PostGIS su porta 5432;
- Redis su porta 6379;
- MinIO su porte 9000 e 9001;
- Mailpit su porte 1025 e 8025.

In produzione futura:

- web su hosting Next.js o container;
- api e worker come container separati;
- database gestito PostgreSQL con estensione PostGIS;
- Redis gestito;
- bucket S3-compatible;
- CDN davanti alle immagini pubbliche;
- osservabilita centralizzata per log, metriche e tracing.

## Rischi principali

- Qualita dei dati geografici: i comuni cambiano nel tempo; serve import
  ripetibile e storicizzabile.
- Moderazione: pubblicare annunci senza revisione espone a contenuti non
  pertinenti o abusivi.
- Privacy: contatti e dati personali devono essere minimizzati e visibili solo
  quando necessario.
- Immagini: upload non validati sono un vettore di sicurezza e costo.
- Ricerca: risultati vuoti peggiorano il prodotto; il ranking deve poter
  espandere luogo e filtri in modo esplicito.

