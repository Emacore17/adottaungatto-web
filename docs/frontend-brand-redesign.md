# Redesign visuale brand

Questo documento guida il redesign completo di `adottaungatto.it` a partire dal
nuovo logo `adottaungattoit-logo.svg` e dai suoi colori:

- `#ee5659`
- `#f7a010`
- `#00a9aa`
- `#89ad35`

Il documento non descrive uno stato gia implementato. E' una specifica
operativa per un agente di coding: prima si realizza una pagina campione, poi si
aspetta approvazione esplicita dell'utente, poi si applica il sistema visuale a
tutto il sito.

Aggiornamento 13 maggio 2026: la pagina campione e' stata approvata e il
rollout globale del tema brand e' stato completato nel frontend esistente.
Inter resta il font principale; eventuali font piu caratterizzati restano
limitati a futuri momenti specifici di brand, da valutare separatamente.

Ambito completato:

- token globali brand e mapping shadcn in `packages/ui/src/styles/globals.css`;
- primitive UI condivise principali (`Button`, `Card`, `Input`, `Textarea`,
  `Empty`) riallineate al tema;
- navbar, menu mobile, footer e logo pubblico aggiornati al nuovo asset;
- home, search, annunci vicini, lista annunci e scheda annuncio riallineati;
- auth, account e moderazione rifiniti con badge, card e stati coerenti;
- Open Graph image aggiornata alla palette brand.

Verifiche eseguite: `pnpm typecheck`, `pnpm lint`, `pnpm test` e
`git diff --check`.

## Obiettivo

Creare una veste piu riconoscibile, premium e coerente con il logo, senza
trasformare il prodotto in una landing page decorativa. Il sito resta un
marketplace operativo: ricerca, annunci, schede, account e moderazione devono
essere leggibili, veloci e densi dove serve.

Priorita:

- rendere il logo leggibile e protagonista nella navbar;
- definire token colore globali coerenti con il logo;
- introdurre una tipografia con piu personalita senza perdere usabilita;
- uniformare cards, bottoni, form, badge, stati e layout;
- eliminare colori raw e gradienti scollegati dal brand;
- validare prima una sola pagina campione.

Non obiettivi:

- modificare backend, API, database o logica prodotto;
- cambiare copy, SEO o flussi funzionali se non necessario per il layout;
- applicare subito il redesign a tutto il sito senza approvazione.

## Diagnosi attuale

Il tema corrente e' neutro/freddo, con base quasi monocromatica e accenti
violacei o borgogna nella home. La navbar usa una superficie scura traslucida
che fa perdere forza al logo colorato: il marchio non respira, i colori del logo
non guidano il resto dell'interfaccia e la prima impressione non e' distintiva.

Il nuovo logo ha una palette vivace e amichevole. Per ottenere un risultato
premium non bisogna usare tutti i colori con la stessa intensita: i colori pieni
devono restare accenti misurati, mentre superfici, testo e navigazione devono
essere costruiti con varianti piu profonde o piu morbide.

## Lettura dei colori

| Colore logo     | Lettura                              | Uso consigliato                                                                        |
| --------------- | ------------------------------------ | -------------------------------------------------------------------------------------- |
| `#ee5659` coral | emotivo, affettuoso, energia         | heart/favorite, micro-accenti, CTA secondarie, error/destructive in versione piu scura |
| `#f7a010` amber | calore, ottimismo, evidenza          | highlight, metriche, pill, focus decorativo, dettagli hero                             |
| `#00a9aa` teal  | fiducia, pulizia digitale, stabilita | base del sistema primario, ma con variante piu scura per testo e bottoni               |
| `#89ad35` olive | natura, benessere, esito positivo    | stati verificati, successo, adozione, segnali di affidabilita                          |

Regola: i colori esatti del logo sono perfetti come accenti grafici, ma spesso
non sono abbastanza contrastati per testi piccoli su fondi chiari. Per componenti
interattivi e testo usare varianti accessibili.

## Direzione visuale

La direzione proposta e' "warm trust": base calda e chiara, testo scuro morbido,
teal profondo come colore primario, coral come accento emotivo, amber e olive
per evidenze e stati. Il risultato deve sembrare curato, umano e affidabile,
non infantile e non corporate generico.

Principi:

- superfici calde: ivory, sand, card bianche;
- testo scuro caldo, non nero puro;
- primary teal scuro per azioni principali;
- coral usato con parsimonia per elementi ad alta emozione;
- amber e olive come dettagli funzionali, non come grandi campiture;
- immagini reali degli annunci come contenuto visivo principale;
- nessuna palette dominata da una sola tinta.

## Palette target

I token globali restano il punto di verita. Definirli in
`packages/ui/src/styles/globals.css`, non nei singoli componenti.

### Brand tokens

Questi token possono essere aggiunti in `:root` e mappati in `@theme inline`
quando servono utility Tailwind dedicate.

| Token                  | Hex       | OKLCH                       | Uso                                              |
| ---------------------- | --------- | --------------------------- | ------------------------------------------------ |
| `--brand-coral`        | `#ee5659` | `oklch(0.657 0.187 22.76)`  | accento logo, favorite, dettagli emotivi         |
| `--brand-coral-strong` | `#c43a42` | `oklch(0.554 0.174 21.85)`  | CTA coral accessibile, destructive               |
| `--brand-coral-soft`   | `#fff2ee` | `oklch(0.970 0.015 37.88)`  | badge/superfici leggere coral                    |
| `--brand-amber`        | `#f7a010` | `oklch(0.775 0.165 70.23)`  | highlight, rating, metriche                      |
| `--brand-amber-soft`   | `#fff7e8` | `oklch(0.978 0.022 83.26)`  | superfici leggere amber                          |
| `--brand-teal`         | `#00a9aa` | `oklch(0.666 0.113 195.52)` | accento logo, focus, decorazione                 |
| `--brand-teal-strong`  | `#006f72` | `oklch(0.492 0.084 198.07)` | primary accessibile                              |
| `--brand-teal-ink`     | `#123f43` | `oklch(0.339 0.048 203.49)` | testo su superfici chiare, navbar scura se serve |
| `--brand-teal-soft`    | `#eaf6f4` | `oklch(0.964 0.013 185.10)` | superfici leggere teal                           |
| `--brand-olive`        | `#89ad35` | `oklch(0.698 0.151 124.72)` | stati positivi, verifiche                        |
| `--brand-olive-strong` | `#6f8d28` | `oklch(0.600 0.131 124.68)` | testo/stati olive piu contrastati                |
| `--brand-olive-soft`   | `#f2f6e8` | `oklch(0.966 0.019 119.75)` | superfici leggere olive                          |
| `--brand-cream`        | `#fffbf5` | `oklch(0.990 0.009 78.28)`  | background principale                            |
| `--brand-sand`         | `#f6efe4` | `oklch(0.955 0.016 79.35)`  | secondary/muted surface                          |
| `--brand-border`       | `#eadfd2` | `oklch(0.909 0.021 72.14)`  | border caldi                                     |
| `--brand-muted-text`   | `#70635c` | `oklch(0.510 0.020 50.18)`  | testo secondario                                 |
| `--brand-ink`          | `#2a2421` | `oklch(0.266 0.011 48.30)`  | testo principale                                 |

### Mapping shadcn consigliato

Mantenere le primitive shadcn su token semantici. Il primo passaggio deve
aggiornare questi valori, poi i componenti devono usare `bg-background`,
`bg-card`, `bg-primary`, `text-muted-foreground`, `border-border`, ecc.

```css
:root {
  --background: oklch(0.99 0.009 78.28);
  --foreground: oklch(0.266 0.011 48.3);

  --card: oklch(1 0 0);
  --card-foreground: oklch(0.266 0.011 48.3);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.266 0.011 48.3);

  --primary: oklch(0.492 0.084 198.07);
  --primary-foreground: oklch(0.99 0.009 78.28);

  --secondary: oklch(0.955 0.016 79.35);
  --secondary-foreground: oklch(0.266 0.011 48.3);

  --muted: oklch(0.948 0.012 79.78);
  --muted-foreground: oklch(0.51 0.02 50.18);

  --accent: oklch(0.97 0.015 37.88);
  --accent-foreground: oklch(0.461 0.148 21.02);

  --destructive: oklch(0.554 0.174 21.85);
  --border: oklch(0.909 0.021 72.14);
  --input: oklch(0.909 0.021 72.14);
  --ring: oklch(0.666 0.113 195.52);
}
```

La dark mode, se mantenuta, deve diventare una variante teal profonda e calda,
non il tema viola/neutro attuale. Non aggiungere `dark:` locali salvo casi gia
previsti dalle primitive UI.

## Tipografia

La tipografia deve distinguere brand/editoriale da interfaccia operativa.

Proposta:

- Body/UI: mantenere `Inter`, ottimo per form, filtri, dashboard e liste.
- Heading/brand moments: usare `Inter` attraverso `--font-heading` per mantenere
  coerenza. Un font piu caratterizzato si introduce solo per elementi specifici
  e strettamente legati al marchio `adottaungatto.it`, dopo approvazione.
- Mono: mantenere `Geist_Mono` solo per uso tecnico.

Uso:

- H1 homepage e titoli sezione pubblici: `font-heading`, peso 600/650, tracking
  normale, line-height compatto ma leggibile.
- Titoli card, form, dashboard: restare piu sobri, spesso `font-sans`.
- Testi piccoli: niente uppercase con tracking eccessivo per navigazione
  primaria; usare label leggibili.

Implementazione:

- mantenere `Inter` come `--font-sans`;
- impostare `--font-heading` come alias controllato su Inter tramite
  `--font-brand-heading`, senza aggiungere altri font nella pagina campione.

## Navbar e logo

La navbar e' il primo intervento critico.

Problema da risolvere:

- superficie scura traslucida sopra hero chiara;
- logo colorato poco leggibile e poco premium;
- navigazione troppo compressa e poco riconoscibile.

Direzione:

- usare una superficie chiara, calda e stabile: ivory/white glass, non nero;
- il logo deve stare su sfondo pulito, senza texture, blur o scurimenti dietro;
- desktop: logo visibile e bilanciato, larghezza indicativa `18rem-22rem`;
- mobile: logo leggibile ma non schiacciato, max width controllata;
- nav link in `brand-ink` o `brand-teal-ink`;
- CTA principale in `primary` teal strong oppure coral strong se il contesto e'
  emotivo;
- stato active con underline/marker sottile teal o coral, non pill scure;
- navbar con border caldo e ombra morbida, non effetto vetro nero.

File coinvolti nella pagina campione:

- `apps/web/components/layout/site-header.tsx`
- `apps/web/components/layout/desktop-navigation.tsx`
- `apps/web/components/layout/mobile-navigation.tsx`
- `apps/web/components/layout/site-logo-link.tsx`
- `packages/ui/src/styles/globals.css`

Regole:

- non usare `bg-black/*`, `text-white`, `border-white/*` nella navbar pubblica;
- evitare overlay decorativi dietro il logo;
- usare token semantici o brand tokens;
- verificare header su desktop, tablet e mobile;
- verificare il menu mobile aperto.

## Componenti

### Button

`Button` resta la primitiva centrale. Aggiornare solo se serve per armonizzare
radius, ombre e stati. Non creare bottoni custom nei componenti applicativi.

Linee guida:

- `default`: teal strong, testo cream;
- `outline`: bordo caldo, hover su sand o teal soft;
- `secondary`: sand surface, testo ink;
- `ghost`: hover sand leggero;
- `destructive`: coral strong;
- focus ring teal con alpha.

### Card

Le card devono sembrare leggere e curate, non blocchi grigi.

Linee guida:

- background `card`, border/ring caldo, shadow minima;
- radius coerente con sistema, evitare raggi molto grandi salvo hero/search;
- listing card: immagine protagonista, contenuto denso, badge ordinati;
- nessuna card dentro card;
- hover con border teal/coral leggero, non ombre pesanti.

### Form e ricerca

Il search form e' un punto chiave del prodotto.

Linee guida:

- superficie chiara o white glass calda;
- input con border caldo e focus teal;
- chips filtri con stati leggibili;
- CTA ricerca in primary teal;
- errori in coral strong;
- non perdere densita e velocita di scansione.

### Badge e stati

Mappatura consigliata:

- Sponsorizzato/highlight: amber soft + amber/dark text;
- Adozione/free: olive soft + olive strong;
- Preferito/heart: coral;
- Risultati simili/info: teal soft + teal ink;
- Errori: destructive/coral strong;
- Moderazione: usare colori semantici, non brand full saturation ovunque.

## Hero e home

La home e' la pagina campione consigliata perche contiene navbar, logo, hero,
search form, annunci e stati geolocalizzati.

Direzione:

- mantenere la prima schermata orientata alla ricerca, non a una landing;
- sostituire gradienti borgogna attuali con campiture brand leggere:
  `cream`, `teal-soft`, `coral-soft`, micro-highlight amber;
- usare immagini o card annuncio reali come contenuto, non illustrazioni SVG;
- H1 in font heading, con accenti testuali misurati;
- search box piu premium: superficie bianca/calda, bordo caldo, shadow morbida;
- lasciare intravedere la sezione annunci sotto il fold.

File:

- `apps/web/app/(public)/page.tsx`
- `apps/web/app/(public)/_components/home-hero-background.tsx`
- `apps/web/app/(public)/_components/listing-search-form.tsx`
- `apps/web/app/(public)/_components/nearby-listings-section.tsx`
- `apps/web/app/(public)/_components/listing-card.tsx`
- `packages/ui/src/styles/globals.css`

## Processo di implementazione

### Fase 0: preparazione

Prima di modificare:

- leggere questo documento;
- leggere `docs/frontend-nextjs-shadcn-guidelines.md`;
- leggere i file della pagina campione;
- verificare con `rg` dove sono presenti colori raw e classi come
  `bg-black`, `text-white`, `border-white`, `shadow-[...]`, gradienti custom.

### Fase 1: pagina campione

Implementare solo la pagina campione `/` con il nuovo sistema visuale.

Scope consentito:

- token globali necessari alla home e alla navbar;
- `layout.tsx` solo per font e `themeColor`;
- navbar pubblica;
- home hero;
- search form;
- sezione annunci vicini e card annuncio usate nella home;
- eventuali piccoli aggiustamenti alle primitive UI se indispensabili.

Scope non consentito:

- pagine account, admin, auth, dettaglio annuncio, lista annunci completa;
- refactor API o dati;
- riscrittura generale dei componenti non toccati dalla home;
- cambio globale di copy e struttura informativa.

Verifiche obbligatorie:

- `pnpm --filter web typecheck`
- `pnpm --filter web lint`
- avvio dev server;
- screenshot o controllo manuale su:
  - desktop `1440x900`;
  - tablet circa `768x1024`;
  - mobile circa `390x844`;
  - menu mobile aperto;
  - stato hover/focus visibile almeno per nav e search.

Output della Fase 1:

- elenco file modificati;
- note sui token introdotti;
- screenshot o descrizione puntuale delle viste verificate;
- richiesta esplicita di approvazione.

Stop: non procedere alla Fase 2 senza approvazione esplicita dell'utente.

### Fase 2: rollout globale dopo approvazione - completata

Dopo approvazione della pagina campione, applicare il sistema a tutto il sito.

Ordine consigliato:

1. Stabilizzare token globali e primitive UI condivise.
2. Completare layout pubblici: listings, dettaglio annuncio, contatto.
3. Completare auth: login, register, stati errore/successo.
4. Completare account: dashboard, bozze, preferiti, notifiche.
5. Completare admin/moderazione: shell operativa, tabelle, badge, stati.
6. Aggiornare Open Graph image per coerenza brand.
7. Cercare e rimuovere colori raw residui non giustificati.
8. Aggiornare documentazione con eventuali decisioni finali.

Ogni step deve mantenere il sito usabile. Non accumulare un mega-refactor senza
verifiche intermedie.

## Checklist finale di design

- Il logo e' leggibile nella navbar su desktop e mobile.
- La navbar non usa piu sfondo nero o bianco puro freddo scollegato dal brand.
- Le azioni principali usano teal strong o coral strong con contrasto adeguato.
- I colori esatti del logo sono usati come accenti, non come testo piccolo su
  fondo chiaro.
- La home resta orientata alla ricerca.
- Le card annuncio valorizzano immagini reali e dati essenziali.
- Form, badge, alert e stati sono coerenti con i token.
- Non ci sono card dentro card.
- Non ci sono testi che overflowano su mobile.
- Non ci sono decorazioni dominanti come orb, blob o gradienti generici.
- `rg` non trova colori raw fuori da token, immagini OG o casi documentati.
- Typecheck e lint passano.

## Comandi utili

```bash
rg -n "#[0-9a-fA-F]{3,8}|bg-black|text-white|border-white|rgba\\(|rgb\\(|oklch\\(" apps/web packages/ui/src
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web dev
```

## Prompt operativo per l'agente

Quando si chiede a un agente di iniziare il redesign, usare questa consegna:

```text
Leggi docs/frontend-brand-redesign.md e implementa solo la Fase 1 sulla home (/).
Non applicare il redesign globalmente. Aggiorna i token necessari, navbar,
hero, search e sezioni home. Verifica desktop, tablet, mobile e menu mobile.
Fermati dopo la pagina campione e chiedi approvazione prima del rollout.
```
