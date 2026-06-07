# Redesign marketplace pulito — design spec

Data: 7 giugno 2026
Branch: `fix/bug-fixes`
Stato: approvato direzione, implementazione in corso

## Obiettivo

Trasformare adottaungatto.it da look editoriale-pastel ("non professionale" per il
proprietario) a marketplace pulito stile Airbnb/Idealista: bianco dominante, un
solo accento colore, sans moderno, foto protagoniste.

## Decisioni utente

| Area | Scelta |
|------|--------|
| Stile globale | Marketplace pulito |
| Palette | Bianco + 1 accento (coral) |
| Tipografia | Sans moderno (solo Inter) |
| Logo | Monocromatico |
| Card annuncio | Griglia 3 colonne |
| Detail annuncio | Airbnb-style |
| Hero home | Search-first immerso |

## Design system

### Palette (CSS variables `--*`)

Sostituisce intera famiglia `--brand-*`. Mantiene shadcn token names.

```
--background: oklch(1 0 0)            (white)
--foreground: oklch(0.13 0.01 286)    (zinc-900)
--card: oklch(1 0 0)
--card-foreground: var(--foreground)
--popover: oklch(1 0 0)
--popover-foreground: var(--foreground)
--primary: oklch(0.13 0.01 286)       (zinc-900 — CTA scura default)
--primary-foreground: oklch(1 0 0)
--secondary: oklch(0.97 0.005 286)    (zinc-50)
--secondary-foreground: var(--foreground)
--muted: oklch(0.97 0.005 286)
--muted-foreground: oklch(0.45 0.01 286) (zinc-500)
--accent: oklch(0.65 0.17 27)         (coral #e85d4e)
--accent-foreground: oklch(1 0 0)
--destructive: oklch(0.58 0.21 27)    (red-600)
--border: oklch(0.92 0.005 286)       (zinc-200)
--input: var(--border)
--ring: oklch(0.13 0.01 286)
--radius: 0.75rem
```

Dark mode: invertita (zinc-900 bg, zinc-50 fg, accent leggermente più chiaro).

### Tipografia

- Famiglia unica: **Inter** (load via `next/font/google`)
- Rimuove: Fraunces, Geist Mono, `--font-brand-heading`, utility `font-heading`
- Scala heading:
  - h1 (page): `text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight`
  - h1 (hero home): `text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight`
  - h2: `text-2xl sm:text-3xl font-semibold tracking-tight`
  - h3: `text-xl font-semibold`
- Body: `text-base text-zinc-700 leading-relaxed`
- Eyebrow: `text-xs font-medium uppercase tracking-wider text-zinc-500`

### Spacing & layout

- Container: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- Sezioni: `py-12 sm:py-16 lg:py-20`
- Card gap (griglia listings): `gap-6`

### Shadow

- Default card: nessuna
- Hover card: `shadow-md`
- Modal/dropdown: `shadow-lg shadow-zinc-900/5`

## Componenti base

### Button

```
Primary:  bg-zinc-900 text-white hover:bg-zinc-800 rounded-lg
Accent:   bg-accent text-white hover:bg-accent/90 rounded-lg
Outline:  border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50
Ghost:    text-zinc-700 hover:bg-zinc-100
Sizes:    sm h-9, default h-10, lg h-11
Font:     font-medium text-sm
```

### Input + Textarea

```
h-11 rounded-lg border border-zinc-200 bg-white px-3.5 text-sm text-zinc-900
placeholder:text-zinc-400
focus:border-zinc-900 focus:ring-0
disabled:bg-zinc-50 disabled:text-zinc-400
```

### Select (Radix wrapper esistente)

- Trigger: come Input, chevron destra
- Content: `rounded-xl border border-zinc-200 bg-white shadow-lg p-1.5`
- Item: `rounded-md px-3 py-2 text-sm hover:bg-zinc-100 data-[state=checked]:bg-zinc-100 data-[state=checked]:text-zinc-900 font-medium`
- Z-index: 100 (sopra modal Filtri)

### Card

```
rounded-xl border border-zinc-200 bg-white overflow-hidden
hover (cliccabile): transition-shadow hover:shadow-md
```

### Badge

```
Default:  bg-zinc-100 text-zinc-700 px-2.5 py-0.5 rounded-full text-xs font-medium
Accent:   bg-accent/10 text-accent
Success:  bg-emerald-50 text-emerald-700
```

### Avatar

`rounded-full bg-zinc-100 text-zinc-700 font-medium`

## Layout pagine

### Header

- `h-16 sticky top-0 z-50 border-b border-zinc-200 bg-white/95 backdrop-blur`
- Desktop: logo sinistra, nav center (Home, Annunci), CTA destra ("Inserisci annuncio" accent + account avatar/login)
- Mobile: logo sinistra + hamburger destra
- Niente glass card, niente shadow

### Footer

- `border-t border-zinc-200 bg-white py-12`
- 3 colonne grid: brand+tagline breve, Esplora (links), Legale (Privacy/Termini/Cookie)
- Bottom row: `© 2026 adottaungatto.it` + lingua

### Home

1. **Hero search-first**: `h-[70vh] sm:h-[80vh]` con bg image gatto sfocato + overlay `bg-zinc-900/50`. Centrato: H1 bianco + pill search bar bianca (input cerca + input luogo + CTA accent "Cerca")
2. **Vicino a te**: griglia 3 col card annunci con eyebrow + h2
3. **Per razza**: 8 chip rotonde con foto + nome + count
4. **Come funziona**: 3 step (cerca, contatta, adotta) icona + testo
5. **Adozione responsabile**: banner CTA "Inserisci annuncio"

### Listings

- Top: H1 + sottotitolo + count
- Filter bar sticky sotto header: chip filtri attivi + bottone "Filtri" + sort dropdown
- Desktop: sidebar filtri 280px sinistra fissa, contenuto destra
- Mobile: modal filtri full-screen
- Griglia card `lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-6`
- Paginazione bottom

### Card annuncio

- `rounded-xl border border-zinc-200 bg-white overflow-hidden hover:shadow-md`
- Foto top `aspect-[4/3]` cliccabile, heart icon `top-3 right-3` floating bianco con ombra
- Body `p-4`: titolo `font-semibold line-clamp-1`, location `text-sm text-zinc-500 mt-0.5`, riga età/razza `text-sm text-zinc-600 mt-2`, prezzo `font-semibold mt-3`
- Intera card cliccabile (link wrapping)
- Sponsored: badge `top-3 left-3` accent

### Detail annuncio (Airbnb-style)

- Breadcrumb top: Annunci › [titolo]
- Header: H1 + meta riga (location · pubblicato · favorite + share)
- Gallery: desktop griglia `grid-cols-4 grid-rows-2 gap-2 h-[480px]` — foto 1 occupa 2x2 (sx), foto 2-5 occupano 1x1 ciascuna (dx). Pulsante "Vedi tutte le foto" bottom-right su gallery
- Two-column sotto: `grid-cols-[1fr_380px] gap-12`
  - Sinistra: owner card · descrizione · identikit (chips list) · salute (status row) · politica adozione
  - Destra sticky `top-24`: contact card con prezzo grande + form contatto + CTA "Invia richiesta" accent
- Niente drop-cap, niente call-out fluff, niente serif

### Account

- Layout: sidebar 256px sinistra (nav) + main destra
- Mobile: top horizontal tabs invece di sidebar
- Sidebar nav: Dashboard, I miei annunci, Preferiti, Contatti, Notifiche, Impostazioni
- Dashboard: header saluto + griglia 4 stats card + sezioni lista

### Auth (login/register/forgot/reset)

- `min-h-screen bg-zinc-50 flex items-center`
- Card centrata `max-w-md w-full bg-white rounded-xl border border-zinc-200 p-8`
- Logo top + h1 + sottotitolo + form + CTA accent + link sotto

## Plan implementazione

Ordine sequenziale per minimizzare regressioni:

1. **Tokens CSS**: aggiorna `packages/ui/src/styles/globals.css` con palette neutral
2. **Font**: rimuovi Fraunces + Geist Mono in `apps/web/app/layout.tsx`. Solo Inter.
3. **Components base** (`packages/ui/src/components/`): Button, Input, Textarea, Select, Card, Badge, Avatar
4. **Layout shared**: site-header, site-footer, mobile-navigation
5. **Home page** (`apps/web/app/(public)/page.tsx` + nearby-listings-section + listing-search-form)
6. **Listings page** (`apps/web/app/(public)/listings/page.tsx` + listing-card + listing-image-preview)
7. **Detail page** (`apps/web/app/(public)/listings/[id]/page.tsx` + listing-image-carousel + listing-contact-card)
8. **Account pages** (dashboard, draft editor, favorites, contacts, notifications, settings)
9. **Auth pages** (login, register, forgot-password, reset-password)
10. **Cleanup**: rimuovi classi `bg-brand-*-soft`, `font-heading`, `font-italic` residue
11. **Verify**: lint + typecheck + mobile screenshots
12. **Commit**

## Non-goals

- Loghi nuovi (logo SVG attuale resta — solo wordmark monocromatico variante)
- Foto reali sostituiscono SVG placeholder (out of scope demo locale)
- Dark mode polish (aggiorna ma non priorità)
- i18n nuova
- Animazioni elaborate (transizioni minimali)

## Rischio

- Molti file toccati → test mobile + lint + typecheck ad ogni commit intermedio
- Boolean field draft + sentinel `__none__` ancora valido, mantenere
- Card editorial code rimosso → verificare nessun import rotto
