# Linee guida frontend Next.js e shadcn/ui

Questo documento e' il riferimento operativo per far lavorare un agente AI sul
frontend con pochi token e senza perdere coerenza di progetto.

## Stato attuale

Stack locale verificato:

- Next.js `16.1.6` con App Router;
- React `19.2.4`;
- TypeScript `5.9`;
- Tailwind CSS `4`;
- shadcn/ui monorepo, stile `radix-vega`, RSC attivo, icone `lucide`;
- componenti UI condivisi in `packages/ui`;
- app frontend in `apps/web`.

La UI pubblica iniziale e' avviata: homepage di ricerca, lista annunci,
scheda dettaglio con carosello immagini, layout pubblici/auth/account e shell
admin dedicato, client API, SEO base, sitemap, robots, JSON-LD, dashboard
account operativa con riepilogo, azioni rapide, bozze/preferiti/notifiche,
inbox contatti ricevuti, form contatto proprietario e pagina `/moderation` con
filtro code, dettaglio operativo caso, audit caso, template motivazioni e
decisioni base motivate sono presenti.
Il client API restituisce messaggi di errore gia' normalizzati per la UI. Le
notifiche in-app hanno un provider real-time globale via SSE same-origin, badge
account live e avviso visuale su nuova notifica.
La priorita ora e' consolidare i flussi operativi autenticati senza rompere la
separazione Server/Client Components.

## Lettura minima per agenti

Per task frontend leggere solo:

1. `docs/project-state.md`;
2. questo documento;
3. il documento di dominio toccato, per esempio `docs/search-full-text-ranking.md`
   per la lista annunci o `docs/authz.md` per login/account;
4. il file o la cartella da modificare.

Non leggere tutta `docs/` se il task e' locale. Se servono API shadcn,
eseguire il comando documentato sotto invece di indovinare componenti o props.

## Regole di repository

- Non mischiare refactor frontend con modifiche backend, schema o worker.
- Prima di aggiungere dipendenze verificare se shadcn, Next o React coprono gia
  il caso.
- Ogni nuova feature frontend deve aggiornare questo documento o il documento
  di dominio solo se cambia una convenzione stabile.
- Eseguire almeno `pnpm typecheck`, `pnpm lint` e, quando ci sono test,
  `pnpm test`.
- Non committare output locali: `.next`, `.turbo`, report Playwright,
  coverage, benchmark e `*.tsbuildinfo` restano ignorati.

## Struttura target

Struttura consigliata per `apps/web`:

```text
apps/web/
  app/
    layout.tsx
    page.tsx
    robots.ts
    sitemap.ts
    opengraph-image.tsx
    proxy.ts

    (public)/
      listings/
        page.tsx
        [id]/
          page.tsx
      _components/
      _lib/

    (auth)/
      login/
        page.tsx
      register/
        page.tsx
      _components/

    (account)/
      account/
        page.tsx
      listings/
        drafts/
          page.tsx
      _components/

    (admin)/
      moderation/
        page.tsx
      _components/

  components/
    layout/
    providers/
    shared/

  hooks/
  lib/
    api/
    auth/
    config/
    seo/
    routes.ts
```

Regole:

- `app/` contiene route, layout, metadata e piccoli componenti colocati.
- Route groups tra parentesi organizzano senza cambiare URL.
- `_components` e `_lib` dentro un segmento sono dettagli privati di quella
  sezione.
- `components/` contiene componenti applicativi riusabili, non primitive UI.
- `packages/ui/src/components` contiene solo primitive shadcn o wrapper
  davvero condivisi tra app.
- `lib/config` centralizza env client/server, URL, feature flag e limiti UI.
- `lib/seo` centralizza helper metadata, JSON-LD e URL canonici.
- `lib/api` centralizza client fetch tipizzato verso `apps/api`.

## shadcn/ui

Comandi:

```bash
cd apps/web
pnpm dlx shadcn@latest info --json
pnpm dlx shadcn@latest docs button dialog select
pnpm dlx shadcn@latest add button card form
```

Regole:

- Eseguire i comandi shadcn da `apps/web`.
- Non creare componenti UI custom se esiste una primitive shadcn adatta.
- Componenti installati dalla CLI vanno in `packages/ui` quando sono primitive
  condivise; blocchi applicativi vanno in `apps/web/components`.
- Import UI condivisa da `@workspace/ui/components/...`.
- Import utility da `@workspace/ui/lib/utils`.
- `components.json` di `apps/web` e `packages/ui` devono mantenere stesso
  `style`, `baseColor`, `iconLibrary` e Tailwind v4 con `config` vuoto.
- Usare `cn()` per classi condizionali.
- Usare token semantici (`bg-background`, `text-muted-foreground`,
  `border-border`) invece di colori raw.
- Usare `gap-*`, non `space-x-*` o `space-y-*`.
- Icone nei `Button`: icona lucide con `data-icon`, senza classi di size.
- Form: usare `FieldGroup`, `Field`, `FieldLabel`, `InputGroup` e stati
  `data-invalid`/`aria-invalid` quando i componenti sono installati.
- Dialog, Sheet e Drawer devono avere sempre un titolo accessibile.
- Empty state con `Empty`, feedback con `Alert` o `sonner`, loading con
  `Skeleton` o `Spinner`.

## Server e Client Components

Default:

- `page.tsx`, `layout.tsx`, componenti di lista/dettaglio e metadata restano
  Server Components.
- Aggiungere `"use client"` solo a foglie interattive: form controllati,
  toggle, menu, geolocalizzazione, carousel, mappe, preview upload.
- Non marcare layout o pagine intere come client per comodita.
- Passare dati serializzabili da server a client; niente classi, connessioni,
  token o funzioni server in props client.
- Fetch dati pubblici nei Server Components, vicino alla route che li usa.
- Componenti client devono ricevere dati gia ridotti e non devono rifare fetch
  pubblici se non serve interattivita realtime.

Pattern:

```tsx
// Server Component
export default async function ListingsPage() {
  const listings = await listPublicListings()

  return <ListingsFilters initialItems={listings.items} />
}
```

```tsx
"use client"

export function ListingsFilters() {
  // Solo stato UI, eventi e browser API.
}
```

## Data access

- Il browser non parla direttamente con database o storage privato.
- API pubbliche possono essere chiamate dal server Next per SEO e caching.
- Mutazioni autenticate passano da server action o route handler solo se serve
  orchestrare cookie, redirect o normalizzazione; altrimenti usare endpoint API
  esistenti.
- Centralizzare `fetch` in `apps/web/lib/api`, con:
  - base URL da env;
  - timeout o abort quando utile;
  - gestione errori tipizzata;
  - messaggi `ApiResult.message` pronti per la UI, senza dettagli tecnici come
    status HTTP grezzi o stack trace;
  - mapping da DTO API a view model solo se riduce complessita UI.
- Non duplicare schemi: riusare `@workspace/validation` per form e query params
  quando possibile.

## SEO e indicizzazione

La SEO e' parte del prodotto, non un passaggio finale.

Regole:

- Ogni pagina pubblica indicizzabile deve essere Server Component.
- Usare `metadata` statico per pagine stabili e `generateMetadata` per pagine
  dinamiche come dettaglio annuncio.
- `generateMetadata` resta server-only; se serve UI client, spostarla in un
  componente separato.
- Ogni dettaglio annuncio deve avere title, description, canonical, Open Graph,
  Twitter card e immagini reali quando disponibili.
- Aggiungere `app/sitemap.ts` con URL statici e annunci pubblicati.
- Aggiungere `app/robots.ts` con policy per produzione e ambienti non pubblici.
- Usare JSON-LD per organizzazione, website/search action e, quando definito,
  annuncio/listing.
- Usare URL stabili e leggibili, ma mantenere UUID o slug unico per evitare
  collisioni.
- Filtri search interni non devono generare infinite pagine indicizzabili:
  indicizzare categorie/luoghi scelti, mettere noindex su combinazioni rumorose.
- Immagini: usare `next/image` per immagini remote consentite in
  `next.config.mjs`; non usare background image per contenuti SEO rilevanti.

## UX/UI

Principi per adottaungatto.it:

- La prima schermata pubblica deve far cercare o vedere annunci, non essere una
  landing marketing generica.
- La lista annunci deve essere densa ma leggibile: filtri chiari, card sobrie,
  immagini reali, ordinamento e fallback ricerca espliciti.
- Area account e moderazione devono essere strumenti operativi, non pagine
  illustrative.
- Evitare palette monotona: usare token del tema come base e introdurre accenti
  controllati tramite immagini, badge e stati.
- Non inserire card dentro card.
- Dimensioni stabili per card annuncio, toolbar, filtri, skeleton e immagini.
- Testi e pulsanti devono reggere mobile e desktop senza overflow.
- Animazioni leggere, brevi e con `prefers-reduced-motion`; niente animazioni
  che bloccano input o layout.
- DOM leggero: niente wrapper decorativi inutili, niente liste renderizzate
  client-side se possono arrivare dal server.

## Auth e autorizzazione

- Il frontend non decide permessi: mostra/nasconde UI, ma l'API autorizza.
- Usare `proxy.ts` in Next 16 per redirect o gate leggeri prima del render;
  `middleware.ts` e' deprecato nella documentazione attuale.
- `proxy.ts` non deve importare client API pesanti o moduli con stato globale.
- Sessioni browser production-grade devono usare cookie `HttpOnly`, `Secure`,
  `SameSite`, CSRF per mutazioni cookie-based e scadenze configurate.
- Non esporre bearer token, segreti API o ruoli privilegiati al client.
- Area admin/moderazione deve avere layout separato, controllo ruolo server-side
  e metadata `noindex`.

## Configurazione

Creare e mantenere punti centrali:

- `apps/web/lib/config/env.ts`: env server/client validati.
- `apps/web/lib/config/site.ts`: nome sito, URL base, contatti, social.
- `apps/web/lib/routes.ts`: builder URL interni.
- `apps/web/lib/seo/metadata.ts`: helper metadata e canonical.
- `apps/web/lib/api/client.ts`: fetch wrapper.
- `apps/web/lib/auth/session.ts`: lettura sessione lato server, quando
  implementata.

Variabili pubbliche solo con prefisso `NEXT_PUBLIC_`; tutto il resto resta
server-only.

## Performance

- Preferire Server Components e streaming con `loading.tsx` dove serve.
- Tenere i Client Components piccoli e vicini all'interazione.
- Importare icone singole da `lucide-react`, non barrel custom con molte icone.
- Usare `next/font` come gia avviato nel layout.
- Usare `next/image` e dimensioni/aspect-ratio stabili.
- Evitare librerie animation pesanti finche CSS/Tailwind bastano.
- Misurare pagine pubbliche con Lighthouse o Playwright quando la UI cresce.
- Non aggiungere provider globali se servono solo a una sezione. Il provider
  notifiche real-time e' globale per requisito applicativo: deve restare una
  foglia client piccola e autenticata via route proxy same-origin.

## TypeScript

- Niente `any` salvo wrapper di confine con commento motivato.
- Tipi DTO arrivano da API o pacchetti condivisi; view model locali solo quando
  semplificano rendering.
- Form e query params devono usare Zod condiviso quando esiste.
- Preferire discriminated union per stati UI (`idle`, `loading`, `success`,
  `error`) invece di booleani multipli.
- Component props piccole e nominate; evitare prop drilling profondo.

## Piano scaffolding frontend

1. Fatto: creare config centrale: env, site, routes, SEO helper.
2. Fatto: sostituire la pagina placeholder con homepage pubblica orientata a
   ricerca e annunci.
3. Fatto: aggiungere layout pubblico, auth e account con route groups.
4. Fatto: aggiungere client API tipizzato per `GET /listings`, places
   autocomplete, auth base e razze pubbliche.
5. Fatto: implementare lista pubblica annunci come Server Component con filtri
   client isolati.
6. Fatto: implementare dettaglio annuncio con metadata dinamici, Open Graph e
   JSON-LD.
7. Fatto: aggiungere `robots.ts`, `sitemap.ts`, `not-found.tsx`, `loading.tsx`
   ed `error.tsx` iniziali.
8. In corso: login/register con validazione condivisa e gestione sessione
   coerente con la strategia backend.
9. Fatto: route group admin/moderazione protetto, noindex, con layout interno
   dedicato e collegato in lettura alle code API.
10. Fatto: UI account per bozze annuncio, preferiti e notifiche.
11. Fatto: azioni UI di moderazione con motivo obbligatorio.
12. Fatto: form contatto proprietario privacy-first sulla scheda annuncio.
13. Fatto: mutazioni account per rimozione preferiti, lettura notifiche,
    cancellazione bozze ed editor bozze con creazione, modifica, upload
    immagine e invio a moderazione.
14. Fatto: aggiungere galleria/stato immagini bozza con eliminazione e
    riordino.
15. Fatto: aggiungere carosello immagini nel dettaglio annuncio pubblico.
16. Fatto: aggiungere notifiche real-time applicative con componente client
    foglia, route proxy same-origin e fallback server-rendered/API.
17. Aggiungere test leggeri per helper, view model e route critiche.
18. Solo dopo, introdurre animazioni e componenti avanzati.

## Checklist per ogni task frontend

- Il task ha letto solo i documenti necessari?
- I componenti shadcn sono stati verificati con CLI/docs prima dell'uso?
- La route e' server by default?
- La parte client e' una foglia piccola?
- Metadata, canonical e noindex sono corretti?
- Il codice non duplica validazioni gia in `@workspace/validation`?
- Le configurazioni sono centralizzate?
- TypeScript e lint passano?
- La UI regge mobile e desktop senza overflow?
- Non sono stati generati file locali tracciabili?

## Fonti ufficiali

- Next.js App Router project structure:
  https://nextjs.org/docs/app/getting-started/project-structure
- Next.js Server and Client Components:
  https://nextjs.org/docs/app/getting-started/server-and-client-components
- Next.js Metadata API:
  https://nextjs.org/docs/app/api-reference/functions/generate-metadata
- Next.js sitemap:
  https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
- Next.js Proxy:
  https://nextjs.org/docs/app/api-reference/file-conventions/proxy
- shadcn/ui monorepo:
  https://ui.shadcn.com/docs/monorepo
- shadcn/ui Tailwind v4:
  https://ui.shadcn.com/docs/tailwind-v4
