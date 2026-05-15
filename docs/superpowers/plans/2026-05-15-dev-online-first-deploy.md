# Dev Online First Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** portare online il primo ambiente `dev-online` di `adottaungatto.it`, con deploy automatizzato dall'agente AI e interventi dell'utente solo per account, billing, login, DNS e segreti.

**Architecture:** l'ambiente dev-online usa Azure Italy North per Container Apps, ACR, PostgreSQL, Key Vault e Redis, Cloudflare per DNS, Access e R2, GitHub Actions per CI/CD con OIDC. Il primo rilascio avviene prima su domini Azure generati, poi sui domini `dev.adottaungatto.it`, `api-dev.adottaungatto.it`, `admin-dev.adottaungatto.it` e `media-dev.adottaungatto.it`.

**Tech Stack:** pnpm 9, Node >=20, Next.js 16, NestJS 11, Drizzle/PostgreSQL/PostGIS, Azure CLI, GitHub CLI, Wrangler, Docker, GitHub Actions, Azure Container Apps, Cloudflare R2.

---

## Principi Operativi

- L'utente non deve mai scrivere password, token o secret in chat.
- L'agente puo' eseguire comandi locali e cloud dopo login interattivo dell'utente.
- Ogni comando distruttivo su risorse cloud deve fermarsi e chiedere conferma esplicita.
- Il primo deploy dev-online usa dati demo o sintetici, mai dump produzione.
- `APP_ENV=production` anche in dev-online, per attivare cookie/header/validazioni di ambiente non-local.
- `release:smoke` resta smoke locale; dev-online usa uno smoke remoto separato.
- Il merge su `develop` e' il trigger standard per `deploy-dev.yml`.

## File Structure

**Nuovi file**

- `.dockerignore`: riduce il contesto Docker e impedisce di copiare `.env*`, log, cache e build locali.
- `apps/web/Dockerfile`: immagine dev-online del frontend Next.js.
- `apps/api/Dockerfile`: immagine dev-online dell'API NestJS.
- `apps/worker/Dockerfile`: immagine dev-online del worker media/job.
- `scripts/deploy/remote-smoke.mjs`: smoke remoto senza dipendenza da Mailpit locale.
- `.github/workflows/ci.yml`: verifica PR e push.
- `.github/workflows/deploy-dev.yml`: build, push, migrazioni, seed demo opzionale, deploy Container Apps, smoke remoto.

**File da modificare**

- `package.json`: aggiunge `smoke:remote`.
- `turbo.json`: aggiunge `ADMIN_ALLOWED_HOSTS` e variabili deploy se usate a build/runtime.
- `apps/api/package.json`: aggiunge comando runtime container dev-online senza watch.
- `apps/worker/package.json`: aggiunge comando runtime container dev-online senza watch.
- `apps/web/proxy.ts`: blocca `/moderation` fuori dagli host admin in ambiente production-like.
- `docs/deploy-strategy.md`: aggiorna lo stato dopo il primo deploy dev-online.

---

## Task 1: Decisioni e Accessi Utente

**Files:**
- Modify: nessuno

- [ ] **Step 1: Confermare le decisioni minime**

  L'utente conferma questi punti prima di far lavorare l'agente:

  - subscription Azure con billing attivo;
  - budget dev-online accettato: 30-70 USD/mese attesi dalla strategia;
  - Redis dev-online: Azure Redis Basic C0 per massima automazione, oppure Upstash se il budget e' prioritario;
  - osservabilita' dev-online: Azure Monitor iniziale;
  - email provider dev-online: sandbox o account reale con mittente verificato;
  - DNS gestito da Cloudflare;
  - nessun dato reale in dev-online.

- [ ] **Step 2: Login interattivi gestiti dall'utente**

  L'agente esegue i controlli CLI:

  ```powershell
  az version
  gh --version
  wrangler --version
  docker --version
  pnpm --version
  ```

  Expected: ogni comando stampa una versione.

  Se una CLI manca, l'agente la installa secondo il sistema locale. Poi l'utente completa:

  ```powershell
  az login
  gh auth login
  wrangler login
  ```

  Expected: login completato per Azure, GitHub e Cloudflare.

- [ ] **Step 3: Selezionare subscription Azure**

  L'agente mostra le subscription:

  ```powershell
  az account list --query "[].{name:name,id:id,isDefault:isDefault}" -o table
  ```

  L'utente indica quale usare senza comunicare credenziali. L'agente imposta la subscription:

  ```powershell
  $env:AZURE_SUBSCRIPTION_ID = Read-Host "Azure subscription id da usare per dev-online"
  az account set --subscription $env:AZURE_SUBSCRIPTION_ID
  az account show --query "{name:name,id:id,tenantId:tenantId}" -o table
  ```

  Expected: la subscription scelta risulta attiva.

## Task 2: Branch e Preflight Locale

**Files:**
- Modify: nessuno

- [ ] **Step 1: Verificare stato repository**

  ```powershell
  git status --short
  git branch --show-current
  ```

  Expected: il branch corrente e' noto. Se ci sono modifiche non correlate, l'agente le lascia intatte e lavora in modo compatibile.

- [ ] **Step 2: Creare branch di bootstrap deploy**

  ```powershell
  git switch develop
  git pull --ff-only
  git switch -c deploy/dev-online-bootstrap
  ```

  Expected: branch `deploy/dev-online-bootstrap` creato da `develop`.

- [ ] **Step 3: Installare dipendenze e verificare qualita' locale**

  ```powershell
  pnpm install --frozen-lockfile
  pnpm release:check
  ```

  Expected: `pnpm release:check` termina con exit code 0. Se fallisce, l'agente applica `superpowers:systematic-debugging` e corregge prima di proseguire.

- [ ] **Step 4: Eseguire smoke locale solo se infrastruttura locale e' disponibile**

  ```powershell
  pnpm docker:up
  pnpm release:smoke
  ```

  Expected: lo stdout contiene `E2E_SMOKE_OK`. Se Docker locale non e' disponibile, l'agente annota il blocco e non usa questo step come prova di deploy remoto.

## Task 3: Runtime Container Dev-Online

**Files:**
- Create: `.dockerignore`
- Create: `apps/web/Dockerfile`
- Create: `apps/api/Dockerfile`
- Create: `apps/worker/Dockerfile`
- Modify: `apps/api/package.json`
- Modify: `apps/worker/package.json`

- [ ] **Step 1: Aggiungere script runtime non-watch per API**

  In `apps/api/package.json`, aggiungere lo script:

  ```json
  "start:container:dev": "tsx src/main.ts"
  ```

  Expected: `pnpm --filter api start:container:dev` avvia l'API senza file watcher quando le variabili ambiente sono presenti.

- [ ] **Step 2: Aggiungere script runtime non-watch per worker**

  In `apps/worker/package.json`, aggiungere lo script:

  ```json
  "start:container:dev": "tsx src/main.ts"
  ```

  Expected: `pnpm --filter worker start:container:dev` avvia il worker senza file watcher quando le variabili ambiente sono presenti.

- [ ] **Step 3: Creare `.dockerignore`**

  ```dockerignore
  .git
  .github
  .next
  .turbo
  **/.next
  **/.turbo
  **/dist
  **/node_modules
  node_modules
  coverage
  .env
  .env.*
  *.log
  docs
  immagini-gattini
  ```

  Expected: i build Docker non includono segreti locali ne' cache.

- [ ] **Step 4: Creare `apps/api/Dockerfile`**

  ```dockerfile
  FROM node:20-bookworm-slim

  ENV PNPM_HOME="/pnpm"
  ENV PATH="$PNPM_HOME:$PATH"
  ENV NODE_ENV="production"

  RUN corepack enable

  WORKDIR /app

  COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json ./
  COPY apps ./apps
  COPY packages ./packages

  RUN pnpm install --frozen-lockfile
  RUN pnpm --filter api typecheck

  EXPOSE 4000

  CMD ["pnpm", "--filter", "api", "start:container:dev"]
  ```

  Expected: immagine API costruibile da root repo.

- [ ] **Step 5: Creare `apps/worker/Dockerfile`**

  ```dockerfile
  FROM node:20-bookworm-slim

  ENV PNPM_HOME="/pnpm"
  ENV PATH="$PNPM_HOME:$PATH"
  ENV NODE_ENV="production"

  RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
  RUN corepack enable

  WORKDIR /app

  COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json ./
  COPY apps ./apps
  COPY packages ./packages

  RUN pnpm install --frozen-lockfile
  RUN pnpm --filter worker typecheck

  CMD ["pnpm", "--filter", "worker", "start:container:dev"]
  ```

  Expected: immagine worker costruibile e compatibile con `sharp`.

- [ ] **Step 6: Creare `apps/web/Dockerfile`**

  ```dockerfile
  FROM node:20-bookworm-slim

  ENV PNPM_HOME="/pnpm"
  ENV PATH="$PNPM_HOME:$PATH"
  ENV NODE_ENV="production"

  RUN corepack enable

  WORKDIR /app

  COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json ./
  COPY apps ./apps
  COPY packages ./packages

  RUN pnpm install --frozen-lockfile
  RUN pnpm --filter web build

  EXPOSE 3000

  CMD ["pnpm", "--filter", "web", "start"]
  ```

  Expected: immagine web costruibile da root repo.

- [ ] **Step 7: Verificare build immagini in locale**

  ```powershell
  docker build -f apps/api/Dockerfile -t adotta-api-dev:test .
  docker build -f apps/worker/Dockerfile -t adotta-worker-dev:test .
  docker build -f apps/web/Dockerfile -t adotta-web-dev:test .
  ```

  Expected: tutte e tre le build terminano con exit code 0.

- [ ] **Step 8: Verificare repository**

  ```powershell
  pnpm release:check
  git diff --check
  ```

  Expected: exit code 0.

- [ ] **Step 9: Commit**

  ```powershell
  git add .dockerignore apps/api/package.json apps/worker/package.json apps/api/Dockerfile apps/worker/Dockerfile apps/web/Dockerfile
  git commit -m "chore: add dev-online container runtime"
  ```

  Expected: commit creato.

## Task 4: Smoke Remoto

**Files:**
- Create: `scripts/deploy/remote-smoke.mjs`
- Modify: `package.json`

- [ ] **Step 1: Aggiungere script root**

  In `package.json`, aggiungere:

  ```json
  "smoke:remote": "node scripts/deploy/remote-smoke.mjs"
  ```

  Expected: `pnpm smoke:remote` e' disponibile.

- [ ] **Step 2: Creare `scripts/deploy/remote-smoke.mjs`**

  ```javascript
  const apiBaseUrl = readRequiredUrl("API_URL")
  const webBaseUrl = readRequiredUrl("WEB_URL")

  await expectJson("api health", `${apiBaseUrl}/health`, (data) => {
    return data?.service === "api" && data?.status === "ok"
  })

  await expectJson("api readiness", `${apiBaseUrl}/health/ready`, (data) => {
    return data?.service === "api" && data?.status === "ready"
  })

  await expectJson("public listings", `${apiBaseUrl}/listings?page=1&pageSize=1`, (data) => {
    return Array.isArray(data?.items)
  })

  await expectText("web home", `${webBaseUrl}/`, (text) => {
    return text.includes("adottaungatto") || text.includes("Adozione")
  })

  await expectText("web listings", `${webBaseUrl}/listings`, (text) => {
    return text.includes("data-listing") || text.includes("Nessun annuncio")
  })

  console.log(`REMOTE_SMOKE_OK api=${apiBaseUrl} web=${webBaseUrl}`)

  async function expectJson(label, url, predicate) {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    })
    const text = await response.text()
    const data = text ? JSON.parse(text) : null

    check(label, response.ok && predicate(data), `status=${response.status}`)
  }

  async function expectText(label, url, predicate) {
    const response = await fetch(url)
    const text = await response.text()

    check(label, response.ok && predicate(text), `status=${response.status}`)
  }

  function check(label, condition, detail = "") {
    if (!condition) {
      throw new Error(`FAIL ${label}${detail ? ` ${detail}` : ""}`)
    }

    console.log(`PASS ${label}${detail ? ` ${detail}` : ""}`)
  }

  function readRequiredUrl(name) {
    const value = process.env[name]

    if (!value) {
      throw new Error(`Missing required env ${name}`)
    }

    return value.replace(/\/+$/, "")
  }
  ```

  Expected: lo smoke remoto non contatta Mailpit e non crea dati mutativi.

- [ ] **Step 3: Eseguire type/format check applicabile**

  ```powershell
  pnpm smoke:remote
  ```

  Expected: fallisce con `Missing required env API_URL` quando non sono impostate le URL. Questo conferma che lo script parte.

- [ ] **Step 4: Commit**

  ```powershell
  git add package.json scripts/deploy/remote-smoke.mjs
  git commit -m "chore: add remote smoke checks"
  ```

  Expected: commit creato.

## Task 5: Protezione Host Admin/Moderazione

**Files:**
- Modify: `apps/web/proxy.ts`
- Modify: `turbo.json`

- [ ] **Step 1: Aggiungere `ADMIN_ALLOWED_HOSTS` a `turbo.json`**

  In `globalEnv`, aggiungere:

  ```json
  "ADMIN_ALLOWED_HOSTS"
  ```

  Expected: Turbo considera la variabile nei task che la usano.

- [ ] **Step 2: Bloccare `/moderation` fuori dagli host admin**

  In `apps/web/proxy.ts`, applicare questa logica prima di `protectRoutes`:

  ```typescript
  function protectAdminHost(request: NextRequest) {
    const { pathname } = request.nextUrl

    if (!pathname.startsWith("/moderation")) {
      return null
    }

    if (!isProduction) {
      return null
    }

    if (isAllowedAdminHost(request)) {
      return null
    }

    return NextResponse.json({ status: 404 }, { status: 404 })
  }

  function isAllowedAdminHost(request: NextRequest) {
    const host = request.headers.get("host")?.split(":")[0]?.toLowerCase()

    if (!host) {
      return false
    }

    const allowedHosts = (
      process.env.ADMIN_ALLOWED_HOSTS ??
      "admin.adottaungatto.it,admin-dev.adottaungatto.it"
    )
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)

    return allowedHosts.includes(host)
  }
  ```

  Poi aggiornare `proxy` cosi':

  ```typescript
  export function proxy(request: NextRequest) {
    const response =
      protectAdminHost(request) ?? protectRoutes(request) ?? NextResponse.next()

    applySecurityHeaders(request, response)

    return response
  }
  ```

  Expected: in `APP_ENV=production`, `/moderation` risponde solo su host admin consentiti.

- [ ] **Step 3: Verificare**

  ```powershell
  pnpm --filter web typecheck
  pnpm release:check
  ```

  Expected: exit code 0.

- [ ] **Step 4: Commit**

  ```powershell
  git add apps/web/proxy.ts turbo.json
  git commit -m "fix: restrict moderation routes to admin hosts"
  ```

  Expected: commit creato.

## Task 6: CI GitHub Actions

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Creare `ci.yml`**

  ```yaml
  name: ci

  on:
    pull_request:
      branches:
        - develop
        - main
    push:
      branches:
        - develop
        - main

  jobs:
    release-check:
      runs-on: ubuntu-latest
      steps:
        - name: Checkout
          uses: actions/checkout@v5

        - name: Setup pnpm
          uses: pnpm/action-setup@v4

        - name: Setup Node
          uses: actions/setup-node@v5
          with:
            node-version: 20
            cache: pnpm

        - name: Install
          run: pnpm install --frozen-lockfile

        - name: Release check
          run: pnpm release:check

        - name: Build API image
          run: docker build -f apps/api/Dockerfile -t adotta-api-ci:${{ github.sha }} .

        - name: Build worker image
          run: docker build -f apps/worker/Dockerfile -t adotta-worker-ci:${{ github.sha }} .

        - name: Build web image
          run: docker build -f apps/web/Dockerfile -t adotta-web-ci:${{ github.sha }} .
  ```

  Expected: CI installa, verifica e costruisce immagini senza push.

- [ ] **Step 2: Verificare sintassi YAML**

  ```powershell
  git diff --check
  ```

  Expected: exit code 0.

- [ ] **Step 3: Commit**

  ```powershell
  git add .github/workflows/ci.yml
  git commit -m "ci: add release checks and image builds"
  ```

  Expected: commit creato.

## Task 7: Deploy Dev Workflow

**Files:**
- Create: `.github/workflows/deploy-dev.yml`

- [ ] **Step 1: Creare workflow `deploy-dev.yml`**

  Il workflow deve:

  - usare GitHub Environment `dev-online`;
  - autenticarsi su Azure via OIDC;
  - buildare e pushare `web`, `api`, `worker` su `acradottadev`;
  - leggere i secret runtime da Key Vault;
  - eseguire migrazioni;
  - se `DEV_ONLINE_SEED_DEMO=true`, eseguire seed demo e upload asset demo;
  - creare o aggiornare Container Apps;
  - eseguire `pnpm smoke:remote`.

  Base YAML:

  ```yaml
  name: deploy-dev

  on:
    push:
      branches:
        - develop
    workflow_dispatch:

  permissions:
    contents: read
    id-token: write

  jobs:
    deploy:
      runs-on: ubuntu-latest
      environment: dev-online
      env:
        AZURE_RESOURCE_GROUP: rg-adotta-dev-itn
        AZURE_LOCATION: italynorth
        AZURE_ACR_NAME: acradottadev
        AZURE_KEY_VAULT_NAME: kv-adotta-dev-itn
        AZURE_CONTAINERAPP_ENV: cae-adotta-dev-itn
        API_APP_NAME: ca-adotta-dev-api
        WEB_APP_NAME: ca-adotta-dev-web
        WORKER_APP_NAME: ca-adotta-dev-worker
        API_PORT: "4000"
        WEB_PORT: "3000"
        DEV_ONLINE_SEED_DEMO: "true"

      steps:
        - name: Checkout
          uses: actions/checkout@v5

        - name: Setup pnpm
          uses: pnpm/action-setup@v4

        - name: Setup Node
          uses: actions/setup-node@v5
          with:
            node-version: 20
            cache: pnpm

        - name: Install
          run: pnpm install --frozen-lockfile

        - name: Preflight
          run: pnpm release:check

        - name: Azure login
          uses: azure/login@v2
          with:
            client-id: ${{ secrets.AZURE_CLIENT_ID }}
            tenant-id: ${{ secrets.AZURE_TENANT_ID }}
            subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

        - name: Resolve image names
          shell: bash
          run: |
            ACR_LOGIN_SERVER="${AZURE_ACR_NAME}.azurecr.io"
            echo "ACR_LOGIN_SERVER=${ACR_LOGIN_SERVER}" >> "$GITHUB_ENV"
            echo "API_IMAGE=${ACR_LOGIN_SERVER}/adotta/api:${GITHUB_SHA}" >> "$GITHUB_ENV"
            echo "WEB_IMAGE=${ACR_LOGIN_SERVER}/adotta/web:${GITHUB_SHA}" >> "$GITHUB_ENV"
            echo "WORKER_IMAGE=${ACR_LOGIN_SERVER}/adotta/worker:${GITHUB_SHA}" >> "$GITHUB_ENV"

        - name: ACR login
          run: az acr login --name "$AZURE_ACR_NAME"

        - name: Build and push images
          shell: bash
          run: |
            docker build -f apps/api/Dockerfile -t "$API_IMAGE" .
            docker build -f apps/web/Dockerfile -t "$WEB_IMAGE" .
            docker build -f apps/worker/Dockerfile -t "$WORKER_IMAGE" .
            docker push "$API_IMAGE"
            docker push "$WEB_IMAGE"
            docker push "$WORKER_IMAGE"

        - name: Read runtime secrets from Key Vault
          shell: bash
          run: |
            read_secret() {
              az keyvault secret show \
                --vault-name "$AZURE_KEY_VAULT_NAME" \
                --name "$1" \
                --query value \
                -o tsv
            }
            DATABASE_URL="$(read_secret DATABASE-URL)"
            REDIS_URL="$(read_secret REDIS-URL)"
            S3_ACCESS_KEY_ID="$(read_secret S3-ACCESS-KEY-ID)"
            S3_SECRET_ACCESS_KEY="$(read_secret S3-SECRET-ACCESS-KEY)"
            echo "::add-mask::$DATABASE_URL"
            echo "::add-mask::$REDIS_URL"
            echo "::add-mask::$S3_ACCESS_KEY_ID"
            echo "::add-mask::$S3_SECRET_ACCESS_KEY"
            {
              echo "DATABASE_URL=$DATABASE_URL"
              echo "REDIS_URL=$REDIS_URL"
              echo "S3_ACCESS_KEY_ID=$S3_ACCESS_KEY_ID"
              echo "S3_SECRET_ACCESS_KEY=$S3_SECRET_ACCESS_KEY"
            } >> "$GITHUB_ENV"

        - name: Run migrations
          shell: bash
          run: |
            docker run --rm \
              -e DATABASE_URL="$DATABASE_URL" \
              "$API_IMAGE" \
              pnpm db:migrate

        - name: Seed demo data and assets
          if: env.DEV_ONLINE_SEED_DEMO == 'true'
          shell: bash
          run: |
            docker run --rm \
              -e DATABASE_URL="$DATABASE_URL" \
              "$API_IMAGE" \
              pnpm db:seed
            docker run --rm \
              -e DATABASE_URL="$DATABASE_URL" \
              "$API_IMAGE" \
              pnpm db:seed:demo
            docker run --rm \
              -e DATABASE_URL="$DATABASE_URL" \
              -e S3_ENDPOINT="${{ vars.S3_ENDPOINT }}" \
              -e S3_PUBLIC_ENDPOINT="${{ vars.S3_PUBLIC_ENDPOINT }}" \
              -e S3_BUCKET="${{ vars.S3_BUCKET }}" \
              -e S3_REGION="${{ vars.S3_REGION }}" \
              -e S3_ACCESS_KEY_ID="$S3_ACCESS_KEY_ID" \
              -e S3_SECRET_ACCESS_KEY="$S3_SECRET_ACCESS_KEY" \
              "$WORKER_IMAGE" \
              pnpm --filter worker demo:assets

        - name: Deploy API
          shell: bash
          run: |
            az containerapp up \
              --name "$API_APP_NAME" \
              --resource-group "$AZURE_RESOURCE_GROUP" \
              --environment "$AZURE_CONTAINERAPP_ENV" \
              --image "$API_IMAGE" \
              --target-port "$API_PORT" \
              --ingress external
            az containerapp secret set \
              --name "$API_APP_NAME" \
              --resource-group "$AZURE_RESOURCE_GROUP" \
              --secrets \
                database-url="$DATABASE_URL" \
                redis-url="$REDIS_URL" \
                s3-access-key-id="$S3_ACCESS_KEY_ID" \
                s3-secret-access-key="$S3_SECRET_ACCESS_KEY"
            az containerapp update \
              --name "$API_APP_NAME" \
              --resource-group "$AZURE_RESOURCE_GROUP" \
              --min-replicas 0 \
              --max-replicas 2 \
              --set-env-vars \
                APP_ENV=production \
                APP_URL="${{ vars.WEB_URL }}" \
                API_PORT="$API_PORT" \
                API_TRUST_PROXY=true \
                RATE_LIMIT_ENABLED=true \
                DATABASE_URL=secretref:database-url \
                REDIS_URL=secretref:redis-url \
                S3_ENDPOINT="${{ vars.S3_ENDPOINT }}" \
                S3_PUBLIC_ENDPOINT="${{ vars.S3_PUBLIC_ENDPOINT }}" \
                S3_BUCKET="${{ vars.S3_BUCKET }}" \
                S3_REGION="${{ vars.S3_REGION }}" \
                S3_ACCESS_KEY_ID=secretref:s3-access-key-id \
                S3_SECRET_ACCESS_KEY=secretref:s3-secret-access-key \
                MAIL_HOST="${{ vars.MAIL_HOST }}" \
                MAIL_PORT="${{ vars.MAIL_PORT }}" \
                MAIL_FROM="${{ vars.MAIL_FROM }}"

        - name: Deploy worker
          shell: bash
          run: |
            az containerapp up \
              --name "$WORKER_APP_NAME" \
              --resource-group "$AZURE_RESOURCE_GROUP" \
              --environment "$AZURE_CONTAINERAPP_ENV" \
              --image "$WORKER_IMAGE" \
              --ingress disabled
            az containerapp secret set \
              --name "$WORKER_APP_NAME" \
              --resource-group "$AZURE_RESOURCE_GROUP" \
              --secrets \
                database-url="$DATABASE_URL" \
                redis-url="$REDIS_URL" \
                s3-access-key-id="$S3_ACCESS_KEY_ID" \
                s3-secret-access-key="$S3_SECRET_ACCESS_KEY"
            az containerapp update \
              --name "$WORKER_APP_NAME" \
              --resource-group "$AZURE_RESOURCE_GROUP" \
              --min-replicas 0 \
              --max-replicas 1 \
              --set-env-vars \
                APP_ENV=production \
                DATABASE_URL=secretref:database-url \
                REDIS_URL=secretref:redis-url \
                S3_ENDPOINT="${{ vars.S3_ENDPOINT }}" \
                S3_BUCKET="${{ vars.S3_BUCKET }}" \
                S3_REGION="${{ vars.S3_REGION }}" \
                S3_ACCESS_KEY_ID=secretref:s3-access-key-id \
                S3_SECRET_ACCESS_KEY=secretref:s3-secret-access-key

        - name: Deploy web
          shell: bash
          run: |
            az containerapp up \
              --name "$WEB_APP_NAME" \
              --resource-group "$AZURE_RESOURCE_GROUP" \
              --environment "$AZURE_CONTAINERAPP_ENV" \
              --image "$WEB_IMAGE" \
              --target-port "$WEB_PORT" \
              --ingress external
            az containerapp update \
              --name "$WEB_APP_NAME" \
              --resource-group "$AZURE_RESOURCE_GROUP" \
              --min-replicas 0 \
              --max-replicas 2 \
              --set-env-vars \
                APP_ENV=production \
                APP_URL="${{ vars.WEB_URL }}" \
                API_URL="${{ vars.API_URL }}" \
                NEXT_PUBLIC_SITE_URL="${{ vars.WEB_URL }}" \
                NEXT_PUBLIC_API_URL="${{ vars.API_URL }}" \
                NEXT_PUBLIC_S3_PUBLIC_ENDPOINT="${{ vars.S3_PUBLIC_ENDPOINT }}" \
                NEXT_PUBLIC_S3_BUCKET="${{ vars.S3_BUCKET }}" \
                ADMIN_ALLOWED_HOSTS="admin-dev.adottaungatto.it"

        - name: Remote smoke
          run: pnpm smoke:remote
          env:
            API_URL: ${{ vars.API_URL }}
            WEB_URL: ${{ vars.WEB_URL }}
  ```

  Expected: il workflow crea/aggiorna le tre app e fallisce se health/readiness/web non rispondono.

- [ ] **Step 2: Verificare e commit**

  ```powershell
  git diff --check
  git add .github/workflows/deploy-dev.yml
  git commit -m "ci: add automated dev-online deploy"
  ```

  Expected: commit creato.

## Task 8: GitHub Environment e OIDC Azure

**Files:**
- Modify: nessuno

- [ ] **Step 1: Creare Environment GitHub `dev-online`**

  ```powershell
  $repo = gh repo view --json nameWithOwner --jq ".nameWithOwner"
  gh api -X PUT "repos/$repo/environments/dev-online"
  ```

  Expected: environment creato o aggiornato.

- [ ] **Step 2: Creare app registration Azure per OIDC**

  ```powershell
  $repo = gh repo view --json nameWithOwner --jq ".nameWithOwner"
  $subscriptionId = az account show --query id -o tsv
  $tenantId = az account show --query tenantId -o tsv
  $appId = az ad app create --display-name "github-adotta-dev-online" --query appId -o tsv
  $spObjectId = az ad sp create --id $appId --query id -o tsv
  $scope = "/subscriptions/$subscriptionId/resourceGroups/rg-adotta-dev-itn"
  ```

  Expected: `$appId`, `$spObjectId`, `$scope` valorizzati.

- [ ] **Step 3: Assegnare ruoli Azure minimi**

  Dopo la creazione del resource group nel Task 9, eseguire:

  ```powershell
  az role assignment create --assignee-object-id $spObjectId --assignee-principal-type ServicePrincipal --role Contributor --scope $scope
  az role assignment create --assignee-object-id $spObjectId --assignee-principal-type ServicePrincipal --role AcrPush --scope "/subscriptions/$subscriptionId/resourceGroups/rg-adotta-dev-itn/providers/Microsoft.ContainerRegistry/registries/acradottadev"
  az role assignment create --assignee-object-id $spObjectId --assignee-principal-type ServicePrincipal --role "Key Vault Secrets User" --scope "/subscriptions/$subscriptionId/resourceGroups/rg-adotta-dev-itn/providers/Microsoft.KeyVault/vaults/kv-adotta-dev-itn"
  ```

  Expected: role assignment creati.

- [ ] **Step 4: Creare federated credential GitHub Environment**

  ```powershell
  $repo = gh repo view --json nameWithOwner --jq ".nameWithOwner"
  $credential = @{
    name = "github-dev-online"
    issuer = "https://token.actions.githubusercontent.com"
    subject = "repo:${repo}:environment:dev-online"
    audiences = @("api://AzureADTokenExchange")
  } | ConvertTo-Json
  $credentialPath = Join-Path $env:TEMP "github-dev-online-federated-credential.json"
  Set-Content -Path $credentialPath -Value $credential -Encoding utf8
  az ad app federated-credential create --id $appId --parameters $credentialPath
  Remove-Item -LiteralPath $credentialPath
  ```

  Expected: GitHub Actions puo' fare login Azure senza client secret.

- [ ] **Step 5: Salvare secrets e variables GitHub**

  Secrets:

  ```powershell
  gh secret set AZURE_CLIENT_ID --env dev-online --body $appId
  gh secret set AZURE_TENANT_ID --env dev-online --body $tenantId
  gh secret set AZURE_SUBSCRIPTION_ID --env dev-online --body $subscriptionId
  ```

  Variables:

  ```powershell
  $r2AccountId = Read-Host "Cloudflare R2 account id dev-online"
  $mailHost = Read-Host "SMTP host dev-online"
  gh variable set API_URL --env dev-online --body "https://api-dev.adottaungatto.it"
  gh variable set WEB_URL --env dev-online --body "https://dev.adottaungatto.it"
  gh variable set S3_ENDPOINT --env dev-online --body "https://$r2AccountId.r2.cloudflarestorage.com"
  gh variable set S3_PUBLIC_ENDPOINT --env dev-online --body "https://media-dev.adottaungatto.it"
  gh variable set S3_BUCKET --env dev-online --body "adotta-dev-assets"
  gh variable set S3_REGION --env dev-online --body "auto"
  gh variable set MAIL_HOST --env dev-online --body $mailHost
  gh variable set MAIL_PORT --env dev-online --body "587"
  gh variable set MAIL_FROM --env dev-online --body "no-reply@adottaungatto.it"
  Remove-Variable r2AccountId
  Remove-Variable mailHost
  ```

  Expected: secrets e variables presenti nell'environment `dev-online`.

## Task 9: Provisioning Azure Dev-Online

**Files:**
- Modify: nessuno

- [ ] **Step 1: Creare resource group**

  ```powershell
  az group create --name rg-adotta-dev-itn --location italynorth
  ```

  Expected: resource group `rg-adotta-dev-itn` in Italy North.

- [ ] **Step 2: Creare ACR e Key Vault**

  ```powershell
  az acr create `
    --resource-group rg-adotta-dev-itn `
    --name acradottadev `
    --sku Basic `
    --admin-enabled false

  az keyvault create `
    --resource-group rg-adotta-dev-itn `
    --name kv-adotta-dev-itn `
    --location italynorth `
    --enable-rbac-authorization true
  ```

  Expected: ACR e Key Vault creati.

- [ ] **Step 3: Creare Container Apps Environment**

  ```powershell
  az containerapp env create `
    --resource-group rg-adotta-dev-itn `
    --name cae-adotta-dev-itn `
    --location italynorth
  ```

  Expected: environment `cae-adotta-dev-itn` pronto.

- [ ] **Step 4: Creare PostgreSQL Flexible Server dev**

  ```powershell
  az postgres flexible-server create `
    --resource-group rg-adotta-dev-itn `
    --name psql-adotta-dev-itn `
    --location italynorth `
    --tier Burstable `
    --sku-name Standard_B1ms `
    --storage-size 32 `
    --version 16
  ```

  Expected: server PostgreSQL 16 creato. L'agente salva la connection string solo in Key Vault, non in file.

- [ ] **Step 5: Abilitare estensioni PostgreSQL**

  ```powershell
  az postgres flexible-server parameter set `
    --resource-group rg-adotta-dev-itn `
    --server-name psql-adotta-dev-itn `
    --name azure.extensions `
    --value postgis,pg_trgm,unaccent,pg_stat_statements
  ```

  Poi eseguire sul database dev:

  ```sql
  CREATE EXTENSION IF NOT EXISTS postgis;
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  CREATE EXTENSION IF NOT EXISTS unaccent;
  CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
  ```

  Expected: estensioni presenti.

- [ ] **Step 6: Creare Redis dev**

  Variante consigliata per automazione:

  ```powershell
  az redis create `
    --resource-group rg-adotta-dev-itn `
    --name redis-adotta-dev-itn `
    --location italynorth `
    --sku Basic `
    --vm-size c0
  ```

  Expected: Redis Basic C0 creato. Se l'utente sceglie Upstash, l'agente salta questo step e usa l'URL Upstash inserito dall'utente in Key Vault.

- [ ] **Step 7: Creare budget alert Azure**

  L'agente crea o guida l'utente nella creazione di un budget mensile per `rg-adotta-dev-itn` da Azure Portal. Soglie minime:

  - 50% budget;
  - 80% budget;
  - 100% budget.

  Expected: l'utente riceve alert costo prima di superare la soglia concordata.

## Task 10: Provisioning Cloudflare Dev-Online

**Files:**
- Modify: nessuno

- [ ] **Step 1: Confermare dominio e nameserver**

  L'utente conferma che `adottaungatto.it` e' nella zona Cloudflare e che i nameserver sono attivi.

  Verifica agente:

  ```powershell
  wrangler whoami
  ```

  Expected: account Cloudflare autenticato.

- [ ] **Step 2: Creare bucket R2 dev**

  ```powershell
  wrangler r2 bucket create adotta-dev-assets
  ```

  Expected: bucket `adotta-dev-assets` creato o gia esistente.

- [ ] **Step 3: Creare credenziali R2**

  L'utente crea credenziali R2 S3 API dalla dashboard Cloudflare con scope limitato al bucket `adotta-dev-assets`.

  L'utente non incolla le credenziali in chat. L'agente le acquisisce con prompt locale nel Task 11.

- [ ] **Step 4: Preparare DNS**

  Prima del primo deploy, l'agente usera' i domini generati da Azure Container Apps. Dopo il primo workflow riuscito, l'agente mostrera' i FQDN Azure e l'utente creera' questi record Cloudflare:

  - `dev.adottaungatto.it` verso FQDN web dev;
  - `api-dev.adottaungatto.it` verso FQDN api dev;
  - `admin-dev.adottaungatto.it` verso FQDN web/admin dev;
  - `media-dev.adottaungatto.it` verso custom domain R2.

  Expected: record DNS presenti. Durante emissione certificati Azure, usare DNS-only se richiesto.

- [ ] **Step 5: Configurare Cloudflare Access**

  L'utente configura policy Access per:

  - `dev.adottaungatto.it`;
  - `admin-dev.adottaungatto.it`;
  - opzionale `api-dev.adottaungatto.it` se lo smoke remoto puo' passare tramite service token.

  Expected: solo sviluppatori autorizzati possono accedere agli host dev protetti.

## Task 11: Segreti Dev-Online

**Files:**
- Modify: nessuno

- [ ] **Step 1: Inserire connection string PostgreSQL**

  L'agente acquisisce il valore senza chat:

  ```powershell
  $databaseUrl = Read-Host "DATABASE_URL dev-online"
  az keyvault secret set --vault-name kv-adotta-dev-itn --name DATABASE-URL --value $databaseUrl
  Remove-Variable databaseUrl
  ```

  Expected: secret `DATABASE-URL` in Key Vault.

- [ ] **Step 2: Inserire Redis URL**

  ```powershell
  $redisUrl = Read-Host "REDIS_URL dev-online"
  az keyvault secret set --vault-name kv-adotta-dev-itn --name REDIS-URL --value $redisUrl
  Remove-Variable redisUrl
  ```

  Expected: secret `REDIS-URL` in Key Vault.

- [ ] **Step 3: Inserire credenziali R2**

  ```powershell
  $r2AccessKey = Read-Host "R2 S3 access key id dev-online"
  az keyvault secret set --vault-name kv-adotta-dev-itn --name S3-ACCESS-KEY-ID --value $r2AccessKey
  Remove-Variable r2AccessKey

  $r2SecretKey = Read-Host "R2 S3 secret access key dev-online"
  az keyvault secret set --vault-name kv-adotta-dev-itn --name S3-SECRET-ACCESS-KEY --value $r2SecretKey
  Remove-Variable r2SecretKey
  ```

  Expected: secret R2 in Key Vault.

- [ ] **Step 4: Inserire segreti email e OAuth quando pronti**

  Se il provider email richiede password/API key:

  ```powershell
  $mailSecret = Read-Host "MAIL provider secret dev-online"
  az keyvault secret set --vault-name kv-adotta-dev-itn --name MAIL-SECRET --value $mailSecret
  Remove-Variable mailSecret
  ```

  Se Google OAuth e' richiesto in dev-online:

  ```powershell
  $googleSecret = Read-Host "GOOGLE_CLIENT_SECRET dev-online"
  az keyvault secret set --vault-name kv-adotta-dev-itn --name GOOGLE-CLIENT-SECRET --value $googleSecret
  Remove-Variable googleSecret
  ```

  Expected: solo i segreti effettivamente necessari sono presenti.

- [ ] **Step 5: Verificare Key Vault senza stampare valori**

  ```powershell
  az keyvault secret list --vault-name kv-adotta-dev-itn --query "[].name" -o table
  ```

  Expected: lista nomi secret, senza valori.

## Task 12: PR, Merge e Primo Deploy

**Files:**
- Modify: nessuno

- [ ] **Step 1: Push branch e PR**

  ```powershell
  git status --short
  git push -u origin deploy/dev-online-bootstrap
  gh pr create --base develop --head deploy/dev-online-bootstrap --title "Bootstrap dev-online deploy" --body "Adds container runtime, CI, dev deploy workflow, remote smoke, and admin host guard for the first dev-online deployment."
  ```

  Expected: PR aperta verso `develop`.

- [ ] **Step 2: Attendere CI verde**

  ```powershell
  gh pr checks --watch
  ```

  Expected: `ci` verde.

- [ ] **Step 3: Merge verso `develop`**

  L'utente approva la PR. L'agente puo' eseguire il merge solo se autorizzato:

  ```powershell
  gh pr merge --squash --delete-branch
  ```

  Expected: merge su `develop`. Questo avvia `deploy-dev.yml`.

- [ ] **Step 4: Monitorare workflow**

  ```powershell
  gh run list --workflow deploy-dev.yml --limit 5
  gh run watch
  ```

  Expected: workflow `deploy-dev.yml` termina con success.

- [ ] **Step 5: Se il workflow fallisce**

  L'agente raccoglie i log:

  ```powershell
  gh run view --log-failed
  ```

  Expected: errore identificato. L'agente applica `superpowers:systematic-debugging`, corregge su nuovo branch, apre PR verso `develop`, attende CI, merge e rilancia deploy.

## Task 13: DNS, Custom Domain e Secondo Deploy

**Files:**
- Modify: nessuno

- [ ] **Step 1: Recuperare FQDN Azure Container Apps**

  ```powershell
  az containerapp show --resource-group rg-adotta-dev-itn --name ca-adotta-dev-web --query properties.configuration.ingress.fqdn -o tsv
  az containerapp show --resource-group rg-adotta-dev-itn --name ca-adotta-dev-api --query properties.configuration.ingress.fqdn -o tsv
  ```

  Expected: FQDN Azure per web e API.

- [ ] **Step 2: Creare record DNS Cloudflare**

  L'utente crea o approva i record DNS:

  - `dev.adottaungatto.it` CNAME verso FQDN web;
  - `admin-dev.adottaungatto.it` CNAME verso FQDN web;
  - `api-dev.adottaungatto.it` CNAME verso FQDN API;
  - `media-dev.adottaungatto.it` custom domain R2.

  Expected: DNS risolve verso le origini corrette.

- [ ] **Step 3: Configurare custom domain su Container Apps**

  L'agente configura i domini custom e segue le istruzioni di validazione Azure. Se Azure richiede record TXT/CNAME di verifica, l'utente li aggiunge in Cloudflare.

  Expected:

  ```powershell
  curl -I https://dev.adottaungatto.it
  curl -I https://api-dev.adottaungatto.it/health
  ```

  restituiscono HTTP 200 o redirect previsto.

- [ ] **Step 4: Rilanciare deploy dev**

  ```powershell
  gh workflow run deploy-dev.yml --ref develop
  gh run watch
  ```

  Expected: workflow verde usando i domini custom dev.

## Task 14: Verifica Post Deploy Dev-Online

**Files:**
- Modify: nessuno

- [ ] **Step 1: Health API**

  ```powershell
  curl.exe -i https://api-dev.adottaungatto.it/health
  curl.exe -i https://api-dev.adottaungatto.it/health/ready
  ```

  Expected: `/health` ritorna `status: ok`; `/health/ready` ritorna `status: ready`.

- [ ] **Step 2: Smoke remoto manuale**

  ```powershell
  $env:API_URL = "https://api-dev.adottaungatto.it"
  $env:WEB_URL = "https://dev.adottaungatto.it"
  pnpm smoke:remote
  Remove-Item Env:\API_URL
  Remove-Item Env:\WEB_URL
  ```

  Expected: `REMOTE_SMOKE_OK api=https://api-dev.adottaungatto.it web=https://dev.adottaungatto.it`.

- [ ] **Step 3: Verifica browser utente**

  L'utente apre:

  - `https://dev.adottaungatto.it`;
  - `https://dev.adottaungatto.it/listings`;
  - `https://admin-dev.adottaungatto.it/moderation`.

  Expected: area pubblica accessibile agli sviluppatori, moderazione visibile solo dopo Cloudflare Access e login con ruolo admin/moderator.

- [ ] **Step 4: Verifica blocco moderazione sul dominio pubblico dev**

  ```powershell
  curl.exe -i https://dev.adottaungatto.it/moderation
  ```

  Expected: HTTP 404 in `APP_ENV=production` quando host non e' `admin-dev.adottaungatto.it`.

- [ ] **Step 5: Verifica immagini**

  L'utente o l'agente controlla che almeno un annuncio demo mostri immagini. Se le immagini mancano:

  ```powershell
  gh workflow run deploy-dev.yml --ref develop
  gh run watch
  ```

  Expected: lo step `Seed demo data and assets` carica asset demo su R2.

- [ ] **Step 6: Verifica log**

  ```powershell
  az containerapp logs show --resource-group rg-adotta-dev-itn --name ca-adotta-dev-api --tail 100
  az containerapp logs show --resource-group rg-adotta-dev-itn --name ca-adotta-dev-web --tail 100
  az containerapp logs show --resource-group rg-adotta-dev-itn --name ca-adotta-dev-worker --tail 100
  ```

  Expected: nessun errore ricorrente su API, web o worker.

## Task 15: Aggiornamento Documentazione e Chiusura

**Files:**
- Modify: `docs/deploy-strategy.md`

- [ ] **Step 1: Aggiornare stato deploy strategy**

  In `docs/deploy-strategy.md`, aggiungere una sezione "Stato dev-online" con:

  - data primo deploy;
  - commit SHA;
  - URL dev;
  - risorse Azure create;
  - bucket R2 creato;
  - scelta Redis;
  - scelta monitoraggio;
  - lista segreti presenti senza valori;
  - esito smoke remoto;
  - problemi aperti.

- [ ] **Step 2: Commit documentazione**

  ```powershell
  git add docs/deploy-strategy.md
  git commit -m "docs: record dev-online deployment status"
  git push
  ```

  Expected: documentazione aggiornata su `develop`.

## Stop Conditions

L'agente deve fermarsi e chiedere conferma utente se:

- un comando prevede cancellazione di risorse Azure, Cloudflare o dati;
- il costo stimato cambia rispetto al budget concordato;
- una risorsa deve essere creata fuori da Italy North;
- un secret deve essere inserito o ruotato;
- `deploy-dev.yml` richiede permessi GitHub/Azure piu' ampi di quelli documentati;
- lo smoke remoto fallisce dopo una correzione gia' tentata.

## Exit Criteria

Il primo dev-online e' completato quando:

- `ci.yml` e `deploy-dev.yml` sono verdi su `develop`;
- `https://api-dev.adottaungatto.it/health/ready` ritorna ready;
- `pnpm smoke:remote` passa contro i domini dev;
- `https://dev.adottaungatto.it` carica;
- `/moderation` e' bloccato sul dominio dev pubblico e accessibile solo su `admin-dev.adottaungatto.it`;
- dati demo e immagini demo sono visibili;
- log Container Apps non mostrano errori ricorrenti;
- budget alert e documentazione deploy sono aggiornati.
