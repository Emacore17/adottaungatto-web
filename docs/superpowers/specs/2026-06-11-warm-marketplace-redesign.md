# Warm marketplace — piano di redesign grafico

Data: 11 giugno 2026
Branch: `fix/bug-fixes`
Stato: Fase 1 (home campione) e Fase 2 (rollout listings, dettaglio, account,
auth, moderazione, primitive Badge/Empty/Dialog) implementate l'11 giugno 2026.
Direzione confermata dall'utente: **marketplace caldo di brand**, variante
mockup **V3 "pulito minimal"** (`.mockups/v3-pulito.html`): hero tipografico
centrato su banda neutra, niente Fraunces (solo Plus Jakarta Sans), foto solo
nelle card; palette logo come accenti semantici (coral CTA, teal fiducia,
oliva gratis/successo, ambra sponsorizzato).

Sostituisce come direzione sia il tree attuale (editoriale crema/terracotta)
sia la spec `2026-06-07-marketplace-redesign-design.md` (bianco/zinc puro),
recuperando la semantica colore di `docs/frontend-brand-redesign.md`.

## 1. Diagnosi del tree attuale

Cosa non funziona oggi (file alla mano):

| Problema | Dove | Perché è un problema |
| --- | --- | --- |
| Palette crema/terracotta scollegata dal logo | `packages/ui/src/styles/globals.css` (`--background: oklch(0.984 0.006 85)`, `--accent: oklch(0.6 0.115 40)`) | Il logo è corallo/ambra/teal/oliva; la terracotta non esiste nel brand. Il crema è il default "AI editorial" già giudicato non professionale |
| Fraunces italic ovunque | hero, prezzi card, numeri sezione | Look magazine, non marketplace. Il prezzo in corsivo display è illeggibile e svende l'informazione più scannerizzata |
| Eyebrow uppercase tracked su ogni sezione | `page.tsx` ("Annunci verificati…", "Come funziona") | Pattern AI saturato, nessuna voce di brand |
| Numeri sezione 01/02/03 in display italic | sezione "Come funziona" | Scaffolding riflesso; i 3 passi non hanno bisogno di numeri decorativi giganti |
| Card annidate (frame dentro frame `p-1.5`) | `listing-card.tsx`, card "Come funziona" | Doppio bordo + doppio radius = rumore; vietato anche dalle spec precedenti |
| Header pill flottante glass | `site-header.tsx` (rounded-full, backdrop-blur-xl, shadow) | Da landing SaaS, non da marketplace; riduce lo spazio del logo e della nav |
| Grain overlay fisso su tutto il sito | `globals.css` `body::after` | Texture editoriale, layer fixed sempre composito (costo paint), zero valore su un marketplace fotografico |
| Hero solo tipografico, nessun gatto | `page.tsx` | Il prodotto è il gatto: la prima schermata non mostra nemmeno una foto |
| Ombre teatrali sulle card | `shadow-[0_28px_70px_-55px]` | Le foto devono dominare, non le ombre |
| Reveal 0.9s con blur su superfici prodotto | `reveal.tsx` + utility | Troppo lento per un sito operativo; coreografia da landing |

Cosa invece va tenuto: struttura informativa delle pagine (search-first, vicino
a te, dettaglio Airbnb-style), `Reveal` con gestione `prefers-reduced-motion`
corretta, componenti shadcn su token semantici, Select Radix custom.

## 2. Ricerca: cosa fanno i migliori

Sintesi da Petfinder (redesign), Airbnb design system, casi Idealista e best
practice siti adozione 2025-2026:

- **La foto è la conversione.** Nei marketplace di adozione le card foto-first
  con ritratti reali (non stock, non illustrazioni) sono il principale driver
  emotivo; frustrazioni top degli utenti: foto mancanti e filtri poveri.
- **Caldo + affidabile insieme.** Petfinder post-redesign: UI morbida e
  accogliente (palette calda, iconografia semplificata, tipografia accessibile)
  ma struttura da prodotto, non da campagna.
- **Search-first per i marketplace.** Hero con ricerca immediata (Airbnb,
  Idealista): l'utente ha un bisogno specifico (luogo, razza), la pagina deve
  raccoglierlo subito; il racconto viene dopo il fold.
- **Trust visibile e concreto.** Badge di verifica, processo di moderazione
  dichiarato, contatto diretto: elementi grafici espliciti, non microcopy
  nascosto.
- **Airbnb grammar**: bianco dominante, un accento caldo (rausch/coral), radius
  morbidi, foto 4:3 con cuore in overlay, gallery 2x2+4, colonna contatto
  sticky. È la grammatica che l'utente italiano riconosce come "professionale".

## 3. Sistema visivo target

### 3.1 Colore (token in `packages/ui/src/styles/globals.css`)

Base bianca pulita, ink caldo, palette logo come accenti semantici. OKLCH.

```css
:root {
  /* base */
  --background: oklch(1 0 0);                 /* bianco puro */
  --foreground: oklch(0.27 0.012 50);         /* ink caldo #2a2421 */
  --card: oklch(1 0 0);
  --muted: oklch(0.967 0.004 75);             /* neutro caldo leggerissimo */
  --muted-foreground: oklch(0.49 0.018 50);   /* ≥4.5:1 su bianco */
  --border: oklch(0.918 0.008 70);

  /* brand → semantica */
  --primary: oklch(0.554 0.174 22);           /* coral-strong #c43a42 — CTA */
  --primary-foreground: oklch(1 0 0);
  --accent: oklch(0.657 0.187 23);            /* coral logo #ee5659 — cuore, micro-accenti */
  --ring: oklch(0.554 0.174 22);

  /* famiglie soft per badge/stati (mai per testo piccolo raw) */
  --brand-teal-strong: oklch(0.492 0.084 198);  /* link, verificato, fiducia */
  --brand-teal-soft: oklch(0.964 0.013 185);
  --brand-amber: oklch(0.775 0.165 70);          /* sponsorizzato, highlight */
  --brand-amber-soft: oklch(0.978 0.022 83);
  --brand-olive-strong: oklch(0.60 0.131 125);   /* adottato, successo, gratis */
  --brand-olive-soft: oklch(0.966 0.019 120);
  --brand-coral-soft: oklch(0.97 0.015 38);
}
```

Regole:

- CTA primarie = coral-strong (contrasto AA con testo bianco). Teal-strong per
  link testuali, badge "verificato", stati di fiducia. Oliva per esiti positivi.
  Ambra solo come superficie soft + testo scuro (mai testo ambra su bianco).
- I colori raw del logo (`#ee5659` ecc.) solo come accenti grafici ≥3:1 di
  contesto (cuore preferiti, dot, icone grandi), mai testo piccolo.
- Niente campiture crema: il calore viene da ink caldo, foto, accenti — non dal
  fondo. `--radius: 0.875rem` (tra l'1rem attuale e lo 0.75 della spec pulita).
- Dark mode: variante ink calda funzionale, non prioritaria (come da spec
  giugno).

### 3.2 Tipografia

- **UI/body: Plus Jakarta Sans** (già caricato; più caldo di Inter, resta
  "sans moderno"). Tutto il prodotto — nav, card, form, prezzi, account — solo
  Jakarta.
- **Display: Fraunces SOLO in 2 momenti brand**: H1 hero home e titolo del
  banner CTA finale. Niente italic di default, niente Fraunces su prezzi,
  numeri, label, titoli sezione.
- Scala fissa (register prodotto): h1 pagina `text-3xl sm:text-4xl`, h1 hero
  `clamp` max ~4.5rem, h2 `text-2xl sm:text-3xl font-semibold tracking-tight`,
  body `text-base`, meta `text-sm`. `text-wrap: balance` su h1–h3.
- Eliminare ovunque: eyebrow uppercase tracked, `tracking-[0.2em]`,
  `font-display italic` decorativo.

### 3.3 Motion

- `Reveal`: tenere il componente (reduced-motion già corretto) ma: durata
  0.5s, translate 1rem, niente blur; usarlo solo sulle sezioni home sotto il
  fold, mai su listings/account/dettaglio.
- Micro-interazioni che valgono: cuore preferiti con scale-pop + fill coral,
  card hover = foto `scale(1.03)` 300ms + shadow-md (niente translate-y
  teatrale), bottoni `active:scale-[0.98]`.
- Transizioni prodotto 150–250ms, `--ease-fluid` esistente.

## 4. Interventi per superficie (ordine di impatto)

### A. Token + primitive (`globals.css`, `button.tsx`, `card.tsx`, badge)

1. Sostituire palette crema/terracotta con il sistema §3.1.
2. Rimuovere grain overlay `body::after` e utility reveal blur.
3. Button: `default` coral-strong; `outline` bordo neutro hover muted; `ghost`;
   `destructive` resta. Radius `rounded-xl`, altezze h-10/h-11.
4. Card: singolo bordo `rounded-xl border bg-card`, hover `shadow-md`. Vietato
   frame doppio.
5. Badge semantici: sponsorizzato (amber-soft + ink), gratis/adottato
   (olive-soft + olive-strong), verificato (teal-soft + teal-strong),
   preferito (coral).

### B. Header (`site-header.tsx`)

Pill glass → barra piena: `h-16 sticky border-b bg-white/95 backdrop-blur`,
container `max-w-7xl`. Logo colorato a sinistra su fondo pulito (più grande di
ora), nav centrale sobria (ink, active = underline coral 2px), a destra CTA
"Inserisci annuncio" coral + avatar/login. Mobile: logo + hamburger, menu a
tutto schermo bianco.

### C. Home hero (`page.tsx` + nuovo `home-hero`)

Hero fotografico search-first (decisione utente):

- Fascia `min-h-[72svh]` con **foto vera di gatto** full-bleed (art-directed:
  gatto a sinistra/destra, spazio negativo per il testo), overlay scrim
  `linear-gradient` ink caldo 55→20% per leggibilità AA del testo bianco.
- H1 Fraunces bianco ("Un gatto cerca casa. Forse la tua." funziona — tenere il
  copy), sottotitolo breve.
- **Search bar pill bianca immersa** sotto l'H1: luogo (autocomplete) + razza +
  bottone coral "Cerca"; su mobile collassa in card verticale. Shadow morbida,
  è l'elemento più luminoso della pagina.
- Trust strip sotto la search (dentro l'hero, testo bianco/teal-soft): annunci
  verificati · contatto diretto · gratuito.
- Asset: 1 foto curata committata in `apps/web/public` (formato AVIF/WebP +
  `priority`), non dipendente dal seed demo.

### D. Card annuncio (`listing-card.tsx`)

- Struttura singola: `rounded-xl border bg-card overflow-hidden`.
- Foto `aspect-[4/3]`, hover zoom leggero; cuore floating bianco top-right con
  pop coral; badge sponsorizzato amber-soft top-left.
- Body `p-4`: titolo semibold 1 riga; sotto location `text-sm muted` con pin;
  riga età · razza; **prezzo/contributo in Jakarta semibold** (mai italic),
  "Gratis" come badge olive.
- Skeleton di caricamento con shimmer al posto degli spinner.

### E. Sezioni home sotto il fold

1. **Vicino a te** (`nearby-listings-section.tsx`): h2 sobrio + link "Vedi
   tutti" teal; griglia 3 col gap-6; stato senza-geolocalizzazione con foto, non
   box vuoto.
2. **Per razza**: nuova sezione — 6–8 tile rotonde/`rounded-xl` con foto di
   razza + nome + count, scroll orizzontale su mobile. È la sezione che rende il
   sito "di gatti" a colpo d'occhio.
3. **Come funziona**: riscrivere senza 01/02/03 e senza card annidate: 3
   colonne semplici icona (lucide, stroke 1.5, coral/teal/olive) + titolo +
   testo, su fondo `muted` a tutta fascia. Nessun eyebrow: si apre col solo h2.
4. **Banner CTA finale**: fascia `rounded-2xl` ink caldo (foreground) con
   titolo Fraunces bianco + CTA coral. Rimuovere il radial-gradient decorativo;
   eventualmente foto di gatto ritagliata sul bordo destro.

### F. Listings (`listings/page.tsx`)

- Testata: h1 + count risultati; filter bar sticky sotto header (chip filtri
  attivi rimovibili, bottone "Filtri", sort).
- Chip attive: `muted` + ink con X; hover coral-soft. Sidebar desktop 280px,
  modal full-screen mobile (già così — solo riallineare token).
- Empty state: foto/illustrazione fotografica di gatto + copy umano + CTA
  "Allarga il raggio".

### G. Dettaglio (`listings/[id]/page.tsx`)

- Gallery Airbnb 2x2+4 (già in spec — tenere), bottone "Vedi tutte le foto".
- Colonna destra sticky: card contatto con prezzo grande Jakarta, CTA coral
  "Invia richiesta", sotto badge fiducia teal ("Annuncio verificato il …").
- Identikit: chips `muted`; salute: righe con check olive; politica adozione:
  blocco teal-soft con icona scudo (fiducia = teal, coerente ovunque).

### H. Account + Auth

Solo riallineamento token (nessun redesign strutturale): CTA coral, focus ring
coral, badge semantici nuovi, card singole. Auth su `bg-muted` con card bianca
centrata.

### I. Coerenza finale

- OG image e `themeColor` sulla nuova palette; favicon ok.
- `rg` per residui: `font-display`/Fraunces fuori dai 2 momenti brand,
  eyebrow `tracking-[0.2em]`, `oklch(0.6 0.115 40)` raw, frame `p-1.5`.

## 5. Ordine di implementazione

Fase 1 — pagina campione home (come da processo già collaudato):

1. Token + primitive (A)
2. Header (B)
3. Hero fotografico + search (C)
4. Card annuncio + Vicino a te (D, E1)
5. Sezioni sotto il fold (E2–E4)
6. Verifica: `pnpm --filter web typecheck && pnpm --filter web lint`, dev
   server, screenshot 1440×900 / 768×1024 / 390×844, menu mobile, hover/focus.
7. **Stop → approvazione utente.**

Fase 2 — rollout: listings (F), dettaglio (G), account/auth (H), coerenza (I),
con verifiche a ogni step.

## 6. Criteri di accettazione

- Nessun eyebrow uppercase, nessun 01/02/03 decorativo, nessuna card annidata,
  nessun gradient-text, nessun glass di default.
- Contrasto AA su tutto (incluso testo su foto hero: misurare sullo scrim).
- Fraunces presente solo in hero home e banner CTA.
- Palette = solo token; `rg` non trova colori raw fuori da token/OG.
- Foto di gatto visibile above-the-fold su home, listings e dettaglio.
- Typecheck, lint e screenshot mobile/desktop ok.
