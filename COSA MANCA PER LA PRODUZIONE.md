# Cosa manca per andare in produzione

> Gap analysis aggiornata al **5 luglio 2026**, basata su analisi del knowledge
> graph (graphify) + verifica diretta di working tree, workflow CI e env.
> Consolida e aggiorna [COSE DA FARE PRE LOGIN.md](COSE%20DA%20FARE%20PRE%20LOGIN.md)
> e [PROSSIMI PASSI.md](PROSSIMI%20PASSI.md) (fermi al 21 giu).
>
> **Sintesi**: il codice applicativo è pronto (release candidate). Ciò che manca
> è quasi tutto **fuori dal repo**: account esterni, infrastruttura Azure/Cloudflare,
> secret, compliance legale. Più un passo zero: **committare e mergiare il lavoro
> corrente**, che oggi vive solo sul working tree.

Legenda effort: **[CODICE]** sviluppo app · **[INFRA]** cloud/CI/DNS ·
**[LEGAL]** contenuti legali · **[TU]** decisione/azione del proprietario.

---

## Stato verificato (5 lug 2026)

- Branch: `feat/go-live-prep`, **5 commit non ancora su `master`**
  (fase 0 email/telefono, pagine legali, workflow prod, security scan, export GDPR).
- Working tree: **~1.590 righe modificate/aggiunte NON committate**, tra cui:
  - **Google OAuth** completo dietro flag (`google-oauth.service.ts` + client +
    test, bottone web, route `/auth/google/finish`, `middleware.ts` web);
  - **migrazione DB `0023`** (tabella `oauth_identities`);
  - UI sessioni attive, gate verifica email su pubblicazione, hardening vari.
- `deploy-prod.yml` parte su **push a `master`** + `workflow_dispatch`:
  finché il lavoro non è su `master`, il deploy prod non vede nulla di tutto questo.
- `.env.production.example` aggiornato con `MAIL_*`, `PHONE_VERIFICATION_ENABLED=false`,
  `GOOGLE_OAUTH_*` (flag off di default). Guard `loadApiEnv()` rifiuta config
  locali/rotte in prod (SMTP invalido = l'API **non parte**: voluto).
- Workflow presenti: `ci.yml`, `codeql.yml`, `security.yml` (gitleaks/Semgrep/
  pnpm audit), `deploy-dev.yml`, `deploy-prod.yml`, `rollback-prod.yml`.
- Gate `pnpm release:check`: **🔴 ROSSO** (verificato 5 lug). La build web
  fallisce: *"Both middleware file `./middleware.ts` and proxy file
  `./proxy.ts` are detected. Please use `./proxy.ts` only."* Il nuovo
  `apps/web/middleware.ts` (CSP con nonce per-richiesta, dal lavoro OAuth non
  committato) convive con `apps/web/proxy.ts` (protezione route + CSP attuale):
  Next.js ne accetta uno solo. Vedi ⓪.

### Cosa già funziona lato codice (non rifare)
Auth completa (email/password + verifica + reset + rotazione sessione), RBAC
moderazione, rate-limit Redis, origin check, CSP prod, host-guard admin,
ricerca PG full-text/trigram/geo, notifiche SSE, storage proxy same-origin,
export/cancellazione GDPR, pagine legali (bozze), pipeline deploy/rollback
scritte, scaffolding Google OAuth dietro flag, smoke E2E locale.

---

## ⓪ Passo zero — mettere il lavoro in salvo [CODICE/TU]

Senza questo, tutto il resto è teorico: il deploy prod legge `master`.

- [ ] **Fixare la build web (unico blocker di codice)**: unificare
      `apps/web/middleware.ts` e `apps/web/proxy.ts`. Next.js accetta solo
      `proxy.ts`: portare la CSP con nonce per-richiesta (e la propagazione
      `x-nonce` usata da `components/shared/json-ld.tsx`) dentro `proxy.ts`,
      preservando la protezione route `/account` + `/moderation` e l'host-guard
      admin già presenti, poi eliminare `middleware.ts`.
- [ ] Committare il working tree su `feat/go-live-prep` (OAuth, migrazione 0023,
      sessioni UI, gate email, env).
- [ ] `pnpm release:check` verde sul commit finale (oggi **rosso**, vedi sopra).
- [ ] PR `feat/go-live-prep` → `master` e merge.
- [ ] (Consigliato) attivare **branch protection su `master`** *prima* del merge
      successivo: PR obbligatoria + check CI richiesti (vedi §G).

---

## 🔴 BLOCKER — senza questi il sito non va online

Tutti richiedono **account/azioni tue**, non codice.

### A. Provider email (Resend) — [TU]
Il gate in `env.ts` blocca l'avvio dell'API in prod senza SMTP valido.
- [ ] Account **Resend** (o Brevo), dominio mittente `adottaungatto.it` verificato
      (record SPF/DKIM via DNS → dipende da §D Cloudflare).
- [ ] `MAIL-PASS` (API key) nel Key Vault prod; vars `MAIL_HOST=smtp.resend.com`,
      `MAIL_PORT=465`, `MAIL_SECURE=true`, `MAIL_USER=resend`, `MAIL_FROM`.
- [ ] Test end-to-end su dev-online: verifica email, reset password, inoltro contatti.

### B. Infrastruttura Azure prod — [TU] + [INFRA]
- [ ] Risorse: `rg-adotta-prod-itn`, `acradottaprod`, `kv-adotta-prod-itn`,
      `cae-adotta-prod-itn`, `id-adotta-prod-pull`, `psql-adotta-prod-itn`
      (dettagli in `docs/deploy-strategy.md`).
- [ ] Estensioni Postgres: `postgis`, `pg_trgm`, `unaccent`, `pgcrypto`,
      `pg_stat_statements`.
- [ ] Accesso di rete al Postgres prod per le migrazioni da GitHub Actions
      (allowlist o public access temporaneo).
- [ ] Redis e object storage (R2/S3) prod con credenziali dedicate.

### C. GitHub Environment `production` — [TU]
È ciò che impone l'**approvazione manuale** al deploy.
- [ ] Environment `production` con **Required reviewers**.
- [ ] Secrets: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` (OIDC).
- [ ] Vars: `MAIL_*`, `S3_*`, `PHONE_VERIFICATION_ENABLED=false`,
      `TRUSTED_ACTION_ORIGINS`, `USE_CUSTOM_DOMAINS`, (`API_URL`/`WEB_URL`).
- [ ] Key Vault prod: `DATABASE-URL`, `REDIS-URL`, `S3-ACCESS-KEY-ID`,
      `S3-SECRET-ACCESS-KEY`, `MAIL-PASS`.

### D. Dominio + edge Cloudflare — [TU]
- [ ] Nameserver `adottaungatto.it` → Cloudflare.
- [ ] DNS/TLS per `www`, `api`, `media`, `admin` (+ varianti dev).
- [ ] **Cloudflare Access + MFA sul dominio admin** — copre anche il gap MFA
      (nel codice non esiste TOTP applicativo; l'host-guard `/moderation` → 404
      fuori da `admin.*` c'è già).
- [ ] Record SPF/DKIM/DMARC per il mittente email (§A).

### E. Backup / restore — [TU] + [INFRA]
- [ ] Backup + PITR attivi sul Postgres prod (`deploy-prod.yml` **verifica
      retention ≥ 7 giorni prima delle migrazioni**: senza, il deploy fallisce).
- [ ] **Restore provato almeno una volta** (non solo configurato).
- [ ] Runbook rollback: app (`rollback-prod.yml -f image_tag=<sha>`) vs
      migrazioni distruttive (nessun rollback automatico: serve piano manuale).

### F. Legale — [LEGAL] + [TU]
Le pagine `/privacy`, `/cookie`, `/termini` esistono ma sono **bozze marcate
"da validare" in pagina**.
- [ ] Validazione testi da consulente.
- [ ] Compilare i segnaposto `[...]`: ragione sociale, P.IVA, indirizzo, email
      del titolare.
- [ ] Definire policy di retention (log tecnici / audit / backup) e citarla
      nella privacy.

### G. CI di deploy stabile — [INFRA]
- [ ] Chiudere i problemi residui ACR data endpoint + service token Cloudflare
      Access (gli ultimi fix — trim BOM, forwarding token — sono su `master`,
      ma serve **un deploy dev-online pulito e ripetibile** come prova).

---

## 🟠 SICUREZZA / QUALITÀ — pre o subito dopo il go-live

### H. Branch protection + scan bloccanti — [TU]
- [ ] Proteggere `master`: PR obbligatoria + review.
- [ ] Rendere **bloccanti** CodeQL/Semgrep come required checks
      (oggi solo report nel tab Security).

### I. Osservabilità reale — [INFRA] + [CODICE]
Oggi health/metrics/alert sono **solo in-memory locali** (`/health`,
`/health/metrics`, `/health/alerts`): a un restart si azzerano, nessuno li guarda.
- [ ] Export OpenTelemetry → Azure Monitor (o Dynatrace).
- [ ] Dashboard: p95/p99, error rate, throughput ricerca, Redis, DB, worker.
- [ ] Alert: 5xx, login falliti, 429 anomali, code worker, upload falliti,
      azioni admin ad alto rischio.
- **Rischio se salti**: sito rotto e nessuno se ne accorge se non dagli utenti.

### J. DAST — [INFRA]
- [ ] OWASP ZAP (baseline scan) su dev-online/staging in pipeline.

### K. MFA applicativa — [CODICE] (opzionale)
- [ ] TOTP per admin/moderator a livello app. Cloudflare Access (§D) copre il
      requisito nel frattempo.

---

## 🟡 PRODOTTO / CRESCITA — dopo il go-live

### L. Google login: attivazione — [TU]
Il codice c'è (flag off). Manca solo:
- [ ] Credenziali nella Google Cloud Console (OAuth client, redirect URI =
      `https://api.../auth/oauth/google/callback`).
- [ ] `GOOGLE_CLIENT_ID/SECRET`, `GOOGLE_OAUTH_REDIRECT_URI`,
      `GOOGLE_OAUTH_ENABLED=true` (API) + `NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED=true` (web).
- [ ] Verifica end-to-end reale (il round-trip con Google non è testabile
      senza credenziali).

### M. Verifica telefono via SMS — [TU] + [CODICE]
- [ ] Account **Twilio Verify**, integrazione sender,
      `PHONE_VERIFICATION_ENABLED=true` (API + web).
- Oggi: email-only, gli annunci si pubblicano col contatto email. Non bloccante.

### N. Monetizzazione — [TU] + [CODICE]
- [ ] Stripe/billing per annunci sponsorizzati (oggi **mock**).

### O. Performance validata — [INFRA]
- [ ] Load test: ricerca, dettaglio, login, upload, code moderazione.
- [ ] Core Web Vitals mobile: home, lista, dettaglio, login.
- [ ] Calibrare rate limit e TTL cache sul traffico reale; CDN per immagini.

---

## Sequenza operativa consigliata

1. **⓪** Commit + PR + merge su `master` (`release:check` verde).
2. **A–E in parallelo dove possibile**: Cloudflare (D) per primo — sblocca DNS
   per email (A) e TLS; poi Azure prod (B), environment GitHub (C), backup (E).
3. **Primo deploy prod**: `gh workflow run deploy-prod.yml --ref master`
   → approvazione manuale → smoke post-deploy.
4. **F (legale)** prima di aprire al pubblico — il sito può stare online
   "chiuso" ma non raccogliere utenti con bozze legali.
5. **G (CI dev pulita) + H (branch protection)** subito dopo il primo deploy.
6. **I (osservabilità)** entro i primi giorni di traffico; **J (DAST)** a seguire.
7. **L–O** dopo il go-live, in base alla trazione.

### Comandi utili

```bash
pnpm release:check                                   # gate codice completo
pnpm release:smoke                                   # migrazioni + smoke E2E locale
gh workflow run deploy-prod.yml --ref master         # deploy prod (poi approvi)
gh workflow run rollback-prod.yml -f image_tag=<sha> # rollback app
```

---

## Definizione di "pronto per la produzione"

Un utente reale: si registra → riceve e verifica l'email → cerca → pubblica un
annuncio → viene contattato → un admin modera — con dominio reale, TLS, backup
ripristinabile, rollback provato, pagine legali validate e almeno un alert che
suona se il sito va giù.

**Gap totale stimato**: ~½ giornata di codice bloccante (merge
middleware/proxy in ⓪) · ~2–4 giornate di setup account/infra (A–E) ·
tempi esterni per legale (F) e verifica dominio.
