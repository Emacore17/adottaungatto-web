Sei un senior software architect e coding agent. Devi aiutarmi a progettare e sviluppare progressivamente una piattaforma web chiamata adottaungatto.it.

L’obiettivo è creare una piattaforma italiana per facilitare l’adozione responsabile di gatti e gattini in tutta Italia. La piattaforma sarà inizialmente web, poi in futuro potrà diventare anche app iOS e Android.

Il progetto deve essere professionale, scalabile, testabile in locale e pensato per una futura messa in produzione cloud.

Non devi cercare di implementare tutto in una sola volta. Devi procedere per fasi, mantenendo sempre documentazione aggiornata, decisioni architetturali chiare e codice funzionante.

Quando è necessario l’intervento dell’utente, fermati, spiega esattamente cosa deve fare e attendi conferma prima di continuare.

---

## Visione del prodotto

adottaungatto.it è una piattaforma simile, come modello generale di marketplace, a portali tipo subito.it, ma focalizzata esclusivamente su annunci di gatti e gattini da adottare.

Gli utenti non registrati possono:
- cercare annunci;
- usare la ricerca full text;
- filtrare gli annunci;
- visualizzare le schede pubbliche degli annunci;
- vedere il numero di “Mi piace” su un annuncio;
- condividere un annuncio.

Gli utenti registrati possono:
- contattare chi ha pubblicato l’annuncio;
- salvare annunci tra i preferiti;
- pubblicare annunci;
- caricare immagini dei gatti;
- scegliere l’immagine di copertina;
- modificare i propri dati personali;
- gestire i propri annunci;
- ricevere notifiche;
- recensire altri utenti, se previsto dal flusso applicativo.

La piattaforma deve prevedere anche un’area interna per amministratori e moderatori.

---

## Tipologie di utenti

Prevedi almeno questi ruoli:

1. Visitatore anonimo
   - Può cercare e visualizzare annunci pubblici.
   - Non può contattare il proprietario dell’annuncio.
   - Non può salvare preferiti.
   - Non può pubblicare annunci.

2. Utente privato registrato
   - Può pubblicare annunci occasionali, ad esempio per una cucciolata.
   - Può gestire i propri annunci.
   - Può contattare altri utenti.
   - Può salvare preferiti.
   - Può ricevere notifiche.

3. Utente professionale / associazione / allevamento / gattile
   - Può pubblicare annunci con un profilo più strutturato.
   - Potrà eventualmente avere campi aggiuntivi rispetto al privato.

4. Moderatore
   - Può revisionare annunci.
   - Può approvare, rifiutare, sospendere o modificare lo stato degli annunci.
   - Può gestire segnalazioni.

5. Amministratore
   - Può gestire utenti, annunci, ruoli, segnalazioni, moderazione e configurazioni di piattaforma.

---

## Funzionalità principali

### Ricerca annunci

La ricerca è il cuore della piattaforma.

La home page deve mostrare una barra di ricerca full text per cercare gatti e gattini.

La ricerca deve supportare:
- testo libero;
- razza;
- luogo;
- prezzo;
- età;
- sesso;
- stato sanitario;
- distanza geografica;
- annunci vicino all’utente, se la posizione è stata condivisa.

La ricerca deve essere progettata per evitare il più possibile risultati vuoti.

Se non ci sono risultati esatti:
1. espandere progressivamente l’area geografica;
2. proporre annunci simili;
3. suggerire razze o località alternative;
4. mostrare annunci consigliati;
5. spiegare chiaramente all’utente che i risultati sono stati ampliati.

L’algoritmo di ranking deve tenere conto almeno di:
- pertinenza testuale;
- distanza geografica;
- freschezza dell’annuncio;
- qualità dell’annuncio;
- presenza di immagini;
- stato dell’annuncio;
- eventuali segnali di affidabilità dell’utente;
- preferenze esplicite nei filtri.

---

## Filtri di ricerca

Implementare una struttura dati che consenta questi filtri:

### Razza
L’utente deve poter filtrare per:
- una razza specifica da un set predefinito;
- tutte le razze;
- non di razza;
- indifferente.

Il set di razze deve essere gestito come dato configurabile/semi-statico.

### Luogo
L’input del luogo deve supportare suggerimenti intelligenti.

Esempio: se l’utente scrive “Aosta”, il sistema deve suggerire:
- Aosta — Comune;
- Valle d’Aosta — Regione;
- Aosta e provincia — Provincia, se applicabile secondo i dati territoriali disponibili.

La ricerca geografica deve supportare:
- comune;
- provincia / area equivalente;
- regione;
- coordinate geografiche;
- distanza dall’utente;
- espansione progressiva dell’area quando non ci sono risultati.

Serve uno script, job o processo autonomo per importare e aggiornare i luoghi italiani da fonti ufficiali, idealmente ISTAT e/o altre fonti istituzionali aggiornate al giorno di esecuzione.

Il processo deve gestire:
- regioni;
- province o enti equivalenti;
- comuni;
- codici ISTAT;
- coordinate geografiche;
- eventuali variazioni amministrative nel tempo;
- migrazioni e aggiornamenti ripetibili.

### Prezzo
Prevedere:
- prezzo minimo;
- prezzo massimo;
- opzione “in regalo”.

Nota: se il prezzo minimo è zero o se l’utente seleziona “in regalo”, il sistema deve trattarlo coerentemente come annuncio gratuito.

Valutare anche se usare il termine “contributo spese” invece di “prezzo”, dato il contesto di adozione animali.

### Età
Prevedere:
- età minima;
- età massima;
- supporto a mesi e anni;
- distinzione tra cucciolo, giovane, adulto e anziano, se utile.

### Altri filtri
Prevedere:
- sesso;
- vaccinato;
- sterilizzato;
- sverminato;
- microchip;
- stato dell’annuncio;
- data di pubblicazione;
- distanza geografica.

---

## Annunci

Un utente registrato può pubblicare annunci.

Ogni annuncio deve includere almeno:
- titolo;
- descrizione;
- specie, in questo caso gatto;
- razza o “non di razza”;
- sesso;
- età;
- località;
- eventuale prezzo/contributo spese;
- stato vaccinazione;
- stato sterilizzazione;
- stato sverminazione;
- microchip;
- immagini;
- immagine di copertina;
- dati di contatto configurabili;
- stato di moderazione;
- stato del ciclo di vita dell’annuncio.

Gli asset statici, in particolare le immagini, devono essere gestiti in modo professionale:
- upload sicuro;
- validazione formato e dimensione;
- generazione eventuale di thumbnail;
- storage compatibile con ambiente locale e futuro cloud;
- protezione da upload malevoli;
- ottimizzazione per performance.

### Ciclo di vita annuncio

Prevedere almeno questi stati:
- bozza;
- in attesa di approvazione;
- approvato / pubblicato;
- rifiutato;
- sospeso;
- scaduto;
- adottato / concluso;
- eliminato logicamente.

Ogni cambio di stato rilevante deve poter generare una notifica.

---

## Moderazione e segnalazioni

La piattaforma deve avere un’area admin/moderazione.

I moderatori e gli amministratori devono poter:
- visualizzare annunci in attesa;
- approvare annunci;
- rifiutare annunci con motivazione;
- sospendere annunci;
- gestire segnalazioni;
- vedere storico delle decisioni;
- filtrare annunci sospetti;
- gestire utenti problematici.

Gli utenti devono poter segnalare annunci o profili per motivi come:
- contenuto non pertinente;
- immagini inappropriate;
- sospetta truffa;
- informazioni false;
- abuso;
- altro.

Il sistema deve essere pensato per prevenire contenuti non inerenti alla piattaforma.

---

## Autenticazione e autorizzazione

L’autenticazione e l’autorizzazione devono essere progettate con grande attenzione.

Prevedere:
- registrazione classica con email e password;
- verifica email;
- eventuale verifica numero di telefono;
- login con Google;
- recupero password;
- cambio email;
- cambio password;
- gestione profilo personale;
- ruoli e permessi;
- protezione delle route;
- session management sicuro;
- rate limiting sulle azioni sensibili.

La piattaforma deve distinguere chiaramente:
- visitatore anonimo;
- utente registrato;
- utente professionale;
- moderatore;
- amministratore.

Non esporre dati personali non necessari.

---

## Privacy, contatti e recensioni

Gli utenti registrati possono contattare chi ha pubblicato un annuncio.

Prevedere modalità di contatto:
- email;
- telefono, se l’utente decide di renderlo disponibile;
- eventuale sistema interno di messaggistica in una fase successiva.

La visibilità dei dati personali deve essere configurabile e conforme a principi GDPR:
- minimizzazione dei dati;
- consenso;
- trasparenza;
- possibilità di modificare/eliminare dati;
- audit log per operazioni sensibili.

Prevedere anche:
- recensioni del venditore/proprietario/associazione;
- preferiti;
- Mi piace sugli annunci;
- conteggio pubblico dei Mi piace, senza mostrare chi ha messo Mi piace;
- condivisione pubblica dell’annuncio.

---

## Stack tecnologico

Il frontend deve usare:
- Next.js;
- TypeScript;
- shadcn/ui;
- monorepo.

Il progetto frontend deve essere creato usando questo comando:

pnpm dlx shadcn@latest init --preset b6YpVdNv0 --template next --monorepo --pointer

Dopo la creazione del progetto, nel repository bisogna aggiungere le skills:

pnpm dlx skills add shadcn/ui

Se questi comandi richiedono input interattivo o intervento manuale dell’utente, fermati e chiedi all’utente di eseguirli. Dopo la conferma dell’utente, continua.

Per il backend puoi proporre lo stack più adatto, ma devi motivare le scelte.

Il sistema deve essere pensato per:
- scalabilità;
- manutenibilità;
- testabilità;
- sicurezza;
- deploy cloud futuro;
- sviluppo locale semplice.

Valuta l’uso di:
- database SQL principale;
- eventuale NoSQL solo se realmente utile;
- motore di ricerca full-text/geografico;
- cache;
- sistema eventi;
- notifiche;
- storage object per immagini;
- code asincrone;
- Docker;
- migrazioni database;
- test automatici;
- CI/CD;
- Kubernetes e Helm per una fase futura.

Non introdurre complessità inutile nella prima fase, ma progetta l’architettura per poter crescere.

---

## Requisiti architetturali

Devi produrre un’architettura professionale ma sviluppabile progressivamente da un coding agent.

Definisci:
- struttura del monorepo;
- applicazioni;
- pacchetti condivisi;
- database schema;
- migrazioni;
- seed data;
- script di sviluppo;
- configurazione ambiente locale;
- Docker Compose;
- strategia test;
- strategia logging;
- strategia error handling;
- strategia sicurezza;
- strategia deploy;
- documentazione tecnica.

Il progetto deve funzionare in locale.

Prevedere almeno:
- file `.env.example`;
- Docker Compose per i servizi necessari;
- script `dev`;
- script `test`;
- script `lint`;
- script `typecheck`;
- script per migrazioni;
- script per seed dati;
- documentazione di setup.

---

## Geografia italiana

Serve una componente dedicata alla gestione dei luoghi italiani.

Progetta:
- modello dati per regioni, province/enti equivalenti e comuni;
- import da fonti ufficiali;
- aggiornamento periodico;
- deduplicazione;
- normalizzazione nomi;
- ricerca autocomplete;
- coordinate geografiche;
- supporto a query per comune, provincia e regione;
- ricerca per distanza;
- espansione area geografica quando non ci sono risultati.

I dati geografici devono essere allineabili ai dati ufficiali disponibili al momento dell’esecuzione dello script.

---

## Sicurezza

Il progetto deve considerare fin dall’inizio:
- validazione input;
- sanitizzazione dati;
- protezione da XSS;
- protezione da CSRF, dove applicabile;
- protezione da SQL injection;
- rate limiting;
- controllo permessi lato server;
- sicurezza upload immagini;
- gestione sicura dei segreti;
- logging di eventi sensibili;
- audit trail per azioni admin/moderatore;
- protezione dati personali.

---

## Output richiesto nella prima fase

Nella prima fase NON devi implementare tutta l’applicazione.

Devi prima analizzare il progetto e produrre:

1. Una proposta di architettura tecnica.
2. Una scelta motivata dello stack backend.
3. Una struttura consigliata del monorepo.
4. Una roadmap incrementale.
5. Una suddivisione in milestone.
6. Un modello dati iniziale.
7. Una lista dei principali moduli applicativi.
8. Una strategia per ricerca full-text e geografica.
9. Una strategia per import/allineamento dei luoghi italiani.
10. Una strategia per autenticazione, autorizzazione e ruoli.
11. Una strategia per moderazione e ciclo di vita annunci.
12. Una strategia per gestione immagini e asset statici.
13. Una strategia per sviluppo locale con Docker.
14. Una lista dei file/documenti iniziali da creare.
15. I primi task concreti da eseguire.

Dopo questa analisi, proponi un piano operativo e chiedi conferma solo se devi eseguire comandi interattivi o fare scelte non deducibili.

---

## Metodo di lavoro

Procedi sempre così:

1. Prima capisci il contesto.
2. Poi proponi una soluzione architetturale.
3. Poi crea o aggiorna documentazione.
4. Poi implementa una piccola parte funzionante.
5. Poi aggiungi test.
6. Poi aggiorna la documentazione.
7. Poi proponi il prossimo passo.

Non saltare direttamente a implementazioni massive.

Ogni milestone deve produrre qualcosa di funzionante, testabile o documentato.

Quando scrivi codice:
- usa TypeScript dove possibile;
- mantieni codice pulito;
- evita duplicazioni;
- crea componenti riutilizzabili;
- valida input lato server;
- scrivi test dove utile;
- aggiorna README e documentazione.

Quando fai una scelta tecnica importante, documentala in un file ADR, per esempio in `docs/adr`.

---

## Obiettivo immediato

L’obiettivo immediato è partire correttamente con OpenAI Codex o un coding agent equivalente.

Quindi devi iniziare creando le fondamenta del progetto:
- architettura;
- documentazione;
- roadmap;
- struttura repository;
- decisioni tecniche;
- setup locale;
- primi modelli dati;
- primi flussi principali.

Non devi creare una piattaforma completa in un’unica risposta.

Inizia con la fase 1: analisi architetturale e piano operativo.