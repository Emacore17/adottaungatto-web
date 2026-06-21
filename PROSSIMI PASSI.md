# Prossimi passi (cose ancora da fare)

> Aggiornato: 21 giu 2026. Stato codice: `pnpm release:check` **verde**
> (lint + typecheck + 252 test API + 25 worker + 3 web + build).
> Companion di [COSE DA FARE PRE LOGIN.md](COSE%20DA%20FARE%20PRE%20LOGIN.md):
> qui resta solo ciò che **non** è ancora fatto.
>
> Legenda: **[TU]** = serve un tuo account/azione · **[LEGAL]** = consulente ·
> **[CODICE]** = sviluppo (fattibile senza account) · **[INFRA]** = cloud/CI.

---

## ✅ Già completato lato codice (questa fase)

- **Email**: SMTP autenticato + TLS, prod rifiuta config rotta.
- **Telefono**: email-only via flag `PHONE_VERIFICATION_ENABLED`.
- **Legale**: pagine `/privacy` `/cookie` `/termini` + banner cookie + footer.
- **Pipeline prod**: `deploy-prod.yml` + `rollback-prod.yml`.
- **CI**: `ci.yml` allineato a `master`; doc allineati.
- **Security scan**: `codeql.yml` + `security.yml` (gitleaks, Semgrep, pnpm audit).
- **GDPR**: export dati (`/api/account/export`) + cancellazione/disattivazione.

Tutto è su working tree, **nessun commit** ancora fatto.

---

## 🔴 Bloccanti per il go-live (serve te / account esterni)

### A. Email provider — [TU]
- [ ] Account **Resend** (o Brevo), dominio mittente verificato.
- [ ] `MAIL-PASS` nel Key Vault prod + vars `MAIL_HOST/PORT/SECURE/USER/FROM`.

### B. Infrastruttura Azure prod — [TU] + [INFRA]
- [ ] Risorse: `rg-adotta-prod-itn`, `acradottaprod`, `kv-adotta-prod-itn`,
      `cae-adotta-prod-itn`, `id-adotta-prod-pull`, `psql-adotta-prod-itn`.
- [ ] Estensioni Postgres (postgis, pg_trgm, unaccent, pgcrypto,
      pg_stat_statements).
- [ ] Accesso di rete al Postgres per le migrazioni da GitHub Actions.

### C. GitHub Environment `production` — [TU]
- [ ] Creare environment con **Required reviewers** (= approvazione manuale).
- [ ] Secret: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`.
- [ ] Vars: `MAIL_*`, `S3_*`, `PHONE_VERIFICATION_ENABLED=false`,
      `TRUSTED_ACTION_ORIGINS`, `USE_CUSTOM_DOMAINS`, (`API_URL`/`WEB_URL`).

### D. Dominio + edge Cloudflare — [TU]
- [ ] `adottaungatto.it` in Cloudflare (nameserver).
- [ ] DNS/TLS `www`, `api`, `media`, `admin`.
- [ ] Cloudflare Access **+ MFA** sul dominio admin (copre il gap MFA).

### E. Backup / restore — [TU] + [INFRA]
- [ ] Backup + PITR attivi (il deploy-prod verifica retention ≥ 7gg).
- [ ] **Restore testato** almeno una volta.

### F. Legale — [LEGAL]
- [ ] Validare i testi di privacy/cookie/termini.
- [ ] Compilare i dati del titolare (ragione sociale, P.IVA, indirizzo, email).
- [ ] Definire la retention (log/audit/backup).

---

## 🟠 Sicurezza / qualità (post o pre go-live)

### G. Branch protection — [TU]
- [ ] Proteggere `master` (PR obbligatoria, review).
- [ ] Rendere bloccanti i check CodeQL/Semgrep (oggi solo report nel tab Security).

### H. Gestione sessioni attive da UI — [CODICE]
- [ ] API: lista sessioni + revoca selettiva.
- [ ] Web: sezione in `/account/settings/security` (oggi solo cambio password).

### I. Gate verifica email — [TU decide] + [CODICE]
- [ ] Decidere se la **pubblicazione** richiede email verificata (oggi no).
      Se sì: piccolo gate in `submitDraftForReview` (come per il telefono).

### J. MFA applicativa (oltre Cloudflare Access) — [CODICE]
- [ ] Opzionale: TOTP per admin/moderator a livello app.

### K. DAST — [INFRA]
- [ ] OWASP ZAP su staging in pipeline.

### L. Osservabilità reale — [INFRA] + [CODICE]
- [ ] Export OpenTelemetry → Azure Monitor/Dynatrace.
- [ ] Dashboard p95/p99, error rate, alert (5xx, login falliti, 429, code).

---

## 🟡 Prodotto / crescita

### M. Login Google — [TU] + [CODICE]
- [ ] Credenziali OAuth Google (serve progetto Google Cloud + redirect URI).
- [ ] Implementare il flusso (oggi solo email/password).

### N. Verifica telefono via SMS — [TU] + [CODICE]
- [ ] Account **Twilio Verify**, poi integrare sender e
      `PHONE_VERIFICATION_ENABLED=true` (API + web).

### O. Monetizzazione — [TU] + [CODICE]
- [ ] Stripe/billing per annunci sponsorizzati (oggi mock).

### P. Performance — [INFRA]
- [ ] Load test (ricerca, upload, login, moderazione).
- [ ] Core Web Vitals mobile su home/lista/dettaglio.

---

## Ordine consigliato

1. **Account/infra (A–E)**: sblocca il primo deploy prod reale.
2. **Primo deploy prod** via `deploy-prod.yml` (approvazione manuale) + smoke.
3. **Legale (F)** prima di aprire al pubblico.
4. **Branch protection + scan bloccanti (G)**.
5. **Sessioni UI (H)** + decisione gate email (I).
6. **Osservabilità (L)** + DAST (K).
7. **Crescita (M–P)** dopo il go-live.

---

## Comandi utili

```bash
pnpm release:check        # gate codice completo (verde ora)
pnpm release:smoke        # migrazioni + smoke E2E locale (servizi attivi)
gh workflow run deploy-prod.yml --ref master      # deploy prod (poi approvi)
gh workflow run rollback-prod.yml -f image_tag=<sha-precedente>
```
