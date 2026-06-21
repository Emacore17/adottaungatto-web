# Cose da fare prima del go-live

> Checklist operativa per portare adottaungatto.it in produzione "che funziona
> davvero". Basata su analisi del codice del 21 giu 2026 (non solo sui doc, che
> sono fermi al 14 mag). Stato codice: `pnpm release:check` **verde** (lint +
> typecheck + 248 test API + build web).
>
> Legenda effort: **[CODICE]** = sviluppo app · **[INFRA]** = cloud/CI/DNS ·
> **[LEGAL]** = contenuti legali · **[TU]** = decisione/azione del proprietario.

---

## ✅ Fase 0 — completata lato codice (21 giu 2026)

Lavoro svolto, `pnpm release:check` **verde** (251 test API, build web ok):

- **#1 Email**: SMTP autenticato + TLS provider-agnostico; prod rifiuta config
  email rotta. Resta a te l'account Resend + i secret.
- **#2 Telefono**: scelta email-only; flag `PHONE_VERIFICATION_ENABLED` (off in
  prod); il form nasconde il telefono e il submit forza il contatto email.
- **#3 Legale**: pagine `/privacy`, `/cookie`, `/termini` + banner cookie + link
  footer + sitemap. Testi in bozza, da far validare e compilare (dati titolare).

Prossimo: **Fase 1 (infra)** — richiede i tuoi account (Azure/Cloudflare).

---

## Stato in breve

Il codice è una release-candidate tecnica. Ciò che manca per il go-live **non è
quasi mai codice applicativo**: sono 3 integrazioni esterne, l'infrastruttura
prod e la compliance legale. Oggi un utente reale **non completa i flussi
chiave** (no email reale, telefono non verificabile in prod, niente pagine
legali). Avanzamento verso MVP pubblico: ~75%.

### Cosa già funziona (verificato)
- Auth email/password, session token hashati, verifica email, reset, cambio
  password con rotazione sessione, RBAC moderazione, rate-limit Redis, origin
  check, CSP stretta in prod, cookie sicuri.
- Admin host guard reale: `/moderation` → 404 fuori da `admin.*` in prod
  (`apps/web/proxy.ts:57`).
- Ricerca PG full-text/trigram/geo, moderazione code/batch/audit, preferiti,
  notifiche SSE, contatto privacy-first, storage via proxy same-origin.
- Smoke E2E locale copre il flusso fino a pubblicazione.

---

## 🔴 BLOCKER GO-LIVE (senza questi il sito non funziona davvero)

### 1. Provider email reale — [CODICE] ✅ FATTO · [TU] resta account
- [x] **Codice**: `mail.service.ts` ora usa SMTP autenticato + TLS
      (`MAIL_USER`/`MAIL_PASS`/`MAIL_SECURE`), provider-agnostico (Resend/Brevo).
- [x] **Codice**: in produzione l'app rifiuta l'avvio se SMTP è
      localhost/`smtp.invalid` o se mancano le credenziali (`env.ts` + test).
- [x] **Codice**: `.env.example` e `.env.production.example` con guida Resend/Brevo.
- [ ] **[TU]** Creare account **Resend**, verificare il dominio mittente.
- [ ] **[TU]** Mettere `MAIL_PASS` (API key) nei secret (Key Vault / GitHub env)
      e `MAIL_HOST/MAIL_PORT/MAIL_SECURE/MAIL_USER/MAIL_FROM`.
- [ ] **[TU]** Verificare end-to-end su dev-online: verifica email, reset
      password, inoltro contatti.
- **Impatto**: alto. Sblocca verifica email, reset, inoltro contatti, notifiche.

### 2. Verifica telefono — [CODICE] ✅ FATTO (scelta: email-only)
- [x] **Scelta**: email-only ora, SMS (Twilio) dopo.
- [x] **Codice API**: flag `PHONE_VERIFICATION_ENABLED` (off in prod, sempre on
      in local/test). Off => endpoint OTP rispondono 503 e il submit a revisione
      **forza il contatto email** (nessun telefono non verificato pubblicato).
- [x] **Codice web**: il form annuncio nasconde il contatto telefonico quando il
      flag è off e mostra un avviso "contatto via email".
- [ ] **[TU] — dopo** (non bloccante): integrare **Twilio Verify** e impostare
      `PHONE_VERIFICATION_ENABLED=true` (API + web). Vedi Fase 3.
- **Impatto**: gli annunci ora si pubblicano in prod (contatto email).

### 3. Pagine legali + cookie banner — [CODICE] ✅ FATTO · [LEGAL] resta validazione
- [x] Privacy policy → `/privacy` (bozza GDPR).
- [x] Cookie policy → `/cookie` (bozza).
- [x] Termini di servizio → `/termini` (bozza).
- [x] Banner consenso cookie (globale, `localStorage`, accessibile).
- [x] Link nel footer + pagine in sitemap.
- [ ] **[TU/LEGAL]** Far validare i testi da un consulente; compilare dati
      titolare (ragione sociale, P.IVA, indirizzo, email) nei segnaposto `[...]`.
- **Impatto**: i contenuti sono bozze segnalate in pagina come "da validare".

### 4. Pipeline di produzione — [CODICE] ✅ workflow scritti · [INFRA/TU] resto
- [x] `deploy-prod.yml`: push su `main` + `workflow_dispatch`, environment
      `production`, immagini taggate SHA, **verifica backup/PITR prima delle
      migrazioni**, seed base (no demo), web/api `minReplicas=1`, smoke finale.
- [x] `rollback-prod.yml`: `workflow_dispatch` con input `image_tag`, swap
      immagini all'SHA precedente, smoke (no rollback migrazioni distruttive).
- [ ] **[TU]** Creare GitHub Environment `production` con **Required reviewers**
      (è questo che impone l'approvazione manuale).
- [ ] **[TU]** Creare risorse Azure prod (`rg-adotta-prod-itn`, `acradottaprod`,
      `kv-adotta-prod-itn`, `cae-adotta-prod-itn`, `id-adotta-prod-pull`,
      `psql-adotta-prod-itn`) — vedi `docs/deploy-strategy.md`.
- [ ] **[TU]** Secret nel Key Vault prod: `DATABASE-URL`, `REDIS-URL`,
      `S3-ACCESS-KEY-ID`, `S3-SECRET-ACCESS-KEY`, **`MAIL-PASS`** (nuovo).
- [ ] **[TU]** GitHub Environment secrets: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`,
      `AZURE_SUBSCRIPTION_ID` (OIDC).
- [ ] **[TU]** GitHub Environment vars: `MAIL_HOST`, `MAIL_PORT`, `MAIL_SECURE`,
      `MAIL_USER`, `MAIL_FROM`, `S3_*`, `PHONE_VERIFICATION_ENABLED=false`,
      `TRUSTED_ACTION_ORIGINS`, `USE_CUSTOM_DOMAINS`, (`API_URL`/`WEB_URL` se
      domini custom).
- **Nota DB**: per far girare le migrazioni da GitHub Actions serve accesso di
  rete al Postgres prod (public access temporaneo o allowlist/networking).
- **Nota mail**: senza `MAIL_USER`/`MAIL-PASS` l'API **non parte** in prod (gate
  voluto). Configurali prima del primo deploy.

### 5. Dominio + edge (Cloudflare) — [TU] + [INFRA]
- [ ] Portare `adottaungatto.it` in Cloudflare (nameserver).
- [ ] DNS/TLS per `www`, `api`, `media`, `admin` (+ varianti dev).
- [ ] Cloudflare Access su admin.
- **Perché**: dev gira su URL Azure temporanei + `r2.dev`; dominio e perimetro
  edge non ancora configurati.

### 6. Backup / restore — [INFRA] + [TU]
- [ ] Backup DB + PITR attivi in prod.
- [ ] **Restore testato** almeno una volta.
- [ ] Runbook rollback (app vs migrazioni distruttive).

### 7. Stabilizzare la CI di deploy — [INFRA]
- [ ] Chiudere i problemi ACR data endpoint + service token Cloudflare Access
      (ultimi 6 commit erano su questo).
- [ ] Un deploy dev-online pulito ripetibile.

---

## 🟠 SICUREZZA / COMPLIANCE (pre o subito dopo go-live)

### 8. MFA admin/moderator — [INFRA] (veloce) o [CODICE]
- [ ] Soluzione rapida senza codice: **Cloudflare Access + MFA** sul dominio
      admin.
- [ ] (Opz.) MFA a livello applicativo.
- **Perché**: cercato `mfa/totp/2fa` → **nessuna implementazione**. I doc la
  richiedono per i ruoli interni.

### 9. Gate verifica email — [TU] + [CODICE]
- [ ] Decidere se il login / la pubblicazione richiedono email verificata.
- **Perché**: `login()` (`auth.service.ts:470`) controlla solo password + status,
  **non** la verifica email → oggi la verifica è informativa.

### 10. Gestione sessioni attive da UI — [CODICE]
- [ ] Lista sessioni + revoca selettiva.
- **Perché**: `/account/settings/security` fa **solo cambio password**.

### 11. Scanning in CI — [CODICE] ✅ FATTO (resta DAST + branch protection)
- [x] Secret scanning: `security.yml` (gitleaks) + `.gitleaks.toml` allowlist.
- [x] Dependency scanning: `pnpm audit --prod` (report) in `security.yml`.
- [x] SAST: `codeql.yml` (CodeQL, repo pubblico → free) + Semgrep OWASP/CWE.
- [ ] **[TU]** Rendere bloccanti: aggiungere i check alla branch protection di
      `master` (CodeQL/Semgrep oggi solo report nel tab Security).
- [ ] **[INFRA]** DAST (OWASP ZAP) su staging — vedi Fase 2.

### 12. GDPR data lifecycle — [CODICE] ✅ FATTO
- [x] **Export dati** (portabilità): API `GET /users/me/export` + download web
      `/api/account/export` + bottone "Scarica i miei dati" in
      `/account/settings/account` (profilo, annunci, preferiti, contatti inviati).
- [x] **Cancellazione account** (diritto all'oblio): già presente (`DELETE me`
      → anonimizza email/dati + revoca sessioni) + disattivazione.
- [ ] **[TU/LEGAL]** Definire policy di retention (log/audit/backup) e citarla
      nella privacy.

### 13. Osservabilità reale — [INFRA] + [CODICE]
- [ ] Export OpenTelemetry → Azure Monitor/Dynatrace.
- [ ] Dashboard p95/p99, error rate, throughput ricerca.
- [ ] Alert su 5xx, login falliti, 429 anomali, code worker, azioni admin.
- **Perché**: oggi health/metrics/alert sono solo **in-memory locali**.

---

## 🟡 PRODOTTO / UX (per renderlo "vero")

### 14. Migliorare autenticazione — [CODICE]
- [ ] Social login **Google** (i doc assumono `GOOGLE_CLIENT_ID` ma **non è
      implementato**).
- [ ] (Vedi MFA + UI sessioni sopra.)

### 15. Rivedere "Crea annuncio" — [CODICE]
- [ ] Sistemare il ramo del gate telefono (legato al punto #2).
- [ ] Verificare messaggi d'errore quando email/SMTP non risponde.
- **Nota**: il flusso UI è completo (dati → foto presigned → galleria/cover →
  invio a revisione → conferma); il problema è il gate telefono, non la UI.

### 16. Performance validata — [INFRA] + [CODICE]
- [ ] Load test reale (ricerca, dettaglio, login, upload, code moderazione).
- [ ] Core Web Vitals mobile su home/lista/dettaglio/login.

### 17. Monetizzazione (opzionale per MVP) — [CODICE] + [TU]
- [ ] Stripe/billing per sponsored listings (oggi **mock**).

---

## Sequenza consigliata

**Fase 0 — sblocca i flussi (codice):**
1. Provider email (Resend) → #1
2. Decisione + fix telefono → #2
3. Pagine legali + cookie banner → #3

**Fase 1 — infra prod:**
4. Dominio Cloudflare + DNS/TLS + Access/MFA admin → #5, #8
5. `deploy-prod.yml` + `rollback-prod.yml` + env `production` → #4
6. Backup/PITR + restore testato → #6
7. Stabilizzare CI deploy → #7

**Fase 2 — hardening pre-traffico:**
8. OTel + dashboard + alert → #13
9. Scanning CI + DAST → #11
10. UI sessioni + gate verifica email → #9, #10
11. Load test + Core Web Vitals → #16

**Fase 3 — growth:**
12. Google login → #14
13. Stripe sponsored → #17
14. Export/delete account GDPR → #12

---

## Definizione di "funziona davvero"

Un utente: si registra → verifica email → cerca → pubblica annuncio → viene
contattato → admin modera — **con** copertura legale, osservabilità e rollback.
Oggi mancano gli anelli **email**, **telefono**, **legale** e **infra-prod**.

---

_Primo passo ad alto impatto: provider email (#1). Sblocca da solo verifica
email, reset password, inoltro contatti e notifiche._
