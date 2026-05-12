# Roadmap operativa per agenti di coding

Questo documento e' il punto di ingresso per i prossimi sviluppi. Traduce lo
stato reale del repository in milestone piccole, verificabili e adatte a un
agente AI.

## Traguardo finale locale

Il progetto raggiunge il traguardo locale quando un agente puo eseguire:

```bash
pnpm dev:demo
pnpm smoke:e2e
```

e ottenere una demo navigabile con:

- utenti demo privato, proprietario, moderatore e admin;
- annunci pubblici con immagini realistiche, annunci in moderazione, bozze,
  rifiutati, sospesi, scaduti e almeno uno sponsorizzato mock;
- flusso "Inserisci annuncio" completo: dati, immagini, invio a revisione,
  schermata di conferma e notifica al proprietario;
- preferiti con cuore toggle dalla lista e dalla scheda;
- dashboard account ordinata con impostazioni profilo modificabili;
- autorizzazione corretta: ogni utente vede e modifica solo i propri dati;
- pagina `/listings` a card orizzontali, una per riga, con slot sponsorizzato;
- moderazione/admin protetta, separata e utilizzabile in locale;
- smoke test che copre i flussi principali senza interventi manuali.

Stato attuale: il backend e la base frontend esistono, ma il giro locale non e'
ancora completo per demo prodotto. Il punto piu urgente e' rendere solido il
flusso annuncio con immagini e revisione.

## Regole per ogni round

- Leggere `docs/project-state.md`, questo documento e il documento dell'area
  toccata.
- Prima di cambiare codice frontend leggere
  `docs/frontend-nextjs-shadcn-guidelines.md`.
- Tenere il diff piccolo e chiudere una sola milestone o sotto-task.
- Aggiornare documentazione e stato reale nello stesso round.
- Eseguire `pnpm typecheck`, `pnpm test`, `pnpm lint` e `git diff --check` se
  si tocca codice. Per soli Markdown basta `git diff --check`.
- A fine round fare commit con messaggio breve.

## Milestone A - Demo locale verificabile

Obiettivo: rendere `pnpm dev:demo` una demo completa per sviluppo e test.

Task:

- aggiornare `seed-demo` con account demo `private`, `owner`, `moderator`,
  `admin`;
- aggiungere annunci demo in tutti gli stati rilevanti;
- caricare immagini demo per tutti gli annunci pubblici e in revisione;
- aggiungere almeno uno slot sponsorizzato mock o dati preparatori;
- aggiornare `pnpm smoke:e2e` per verificare dati demo, immagini e ruoli;
- documentare credenziali e casi in `docs/test-data.md`.

Done:

- dopo `pnpm demo:reset` e `pnpm dev:demo`, la lista pubblica mostra annunci
  con immagini e l'admin vede casi in moderazione.

## Milestone B - Inserimento annuncio senza attriti

Obiettivo: risolvere il problema utente attuale sulla creazione annuncio.

Task:

- sostituire il concetto visibile di "Crea bozza" con "Inserisci annuncio";
- trasformare dati e immagini in un flusso unico o wizard guidato;
- bloccare l'invio a revisione solo con indicazioni precise e azionabili;
- dopo l'invio mostrare una pagina/stato di conferma: annuncio inserito, in
  attesa di revisione, notifica futura;
- rendere chiaro lo stato immagini `uploaded`, `processing`, `ready`;
- aggiornare smoke/e2e con upload immagine e invio a revisione riuscito.

Avanzamento 12 maggio 2026:

- Fatto: il worker applicativo processa automaticamente le immagini in
  `processing` all'avvio e poi a intervalli regolari.
- Fatto: la UI account espone "Inserisci annuncio", stati immagine piu'
  leggibili e una schermata di conferma dopo l'invio a revisione.
- Fatto: `pnpm smoke:e2e` copre creazione annuncio completa, upload immagine
  presigned, processing worker, invio a revisione e pagina di conferma.
- Fatto: la UI mostra un flusso guidato dati, foto e revisione, con invio
  disabilitato finche' dati e foto non sono pronti.

Stato: Milestone B completata per il giro funzionale locale. La verifica con
fixture demo realistiche resta nella Milestone A.

Done:

- un utente demo crea un annuncio completo, carica almeno una immagine, invia a
  revisione e non incontra l'errore generico "bozza non pronta".

## Milestone C - Account, profilo e sicurezza dati

Obiettivo: rendere l'area utente comprensibile e corretta multi-utente.

Task:

- riorganizzare `/account` in dashboard operativa: annunci, notifiche,
  preferiti, profilo;
- aggiungere impostazioni profilo modificabili dall'utente;
- verificare ownership su bozze, immagini, preferiti, notifiche e contatti;
- completare test authz su accesso multi-utente e dati propri;
- rendere i messaggi di errore account leggibili e non tecnici.

Done:

- due utenti demo non possono leggere o modificare risorse reciproche e la UI
  espone impostazioni personali chiare.

## Milestone D - Ricerca pubblica e preferiti

Obiettivo: migliorare scoperta annunci e interazioni rapide.

Task:

- rendere `/listings` una lista a card orizzontali, un annuncio per riga;
- aggiungere cuore toggle per preferito con animazione e stato autenticato;
- prevedere slot visivo per annuncio sponsorizzato in alto, con label chiara;
- mantenere filtri, SEO e performance della pagina lista;
- aggiornare test e fixture per preferiti da lista e scheda.

Done:

- un utente salva e rimuove preferiti cliccando il cuore, senza passare da form
  testuali o pagine secondarie.

## Milestone E - Contatti e notifiche

Obiettivo: chiudere il ciclo di comunicazione in modo privacy-first.

Task:

- aggiungere consenso esplicito per condividere telefono o altri contatti
  sensibili;
- mantenere email proprietario nascosta nella UI pubblica;
- progettare notifiche real-time o near-real-time con fallback polling;
- notificare proprietario su invio a revisione, approvazione e contatto;
- documentare limiti anti-abuso e preferenze contatto.

Done:

- le notifiche importanti arrivano in locale e i contatti sensibili sono
  condivisi solo dopo consenso.

## Milestone F - Moderazione e admin separati

Obiettivo: avere una piattaforma interna protetta per revisione annunci.

Task:

- separare visivamente e strutturalmente area admin/moderazione;
- aggiungere ruoli demo moderatore e admin;
- migliorare code, filtri, dettaglio annuncio e template motivazioni;
- verificare MFA o requisito equivalente almeno come backlog hardening;
- aggiungere audit leggibile e test di accesso negato.

Done:

- il moderatore demo approva/rifiuta/sospende annunci da UI locale protetta e
  l'utente riceve notifica.

## Milestone G - Scalabilita e readiness

Obiettivo: rendere il progetto pronto a staging chiuso e poi produzione.

Task:

- completare rate limit per upload, admin e flussi pubblici sensibili;
- aggiungere logging strutturato, trace id, metriche e alert;
- misurare ricerca e pagina lista su fixture realistiche;
- definire CI/CD, backup/restore e rollback;
- completare privacy, cookie, retention dati e hardening upload.

Done:

- staging chiuso con smoke post-deploy, dashboard operative e piano rollback.

## Prossimo round consigliato

Passare a Milestone A per rendere la demo locale piu' ricca con ruoli
moderatore/admin, stati multipli, immagini realistiche e almeno un annuncio
sponsorizzato mock.
