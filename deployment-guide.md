# Deployment Guide — Prodmee Slate Web

This is the guide for deploying the **frontend** (`prodmee-slate-web`) — a Vue 3 SPA
built with Vite, served from S3 behind CloudFront.

> **Deploy the API first.** The S3 bucket and CloudFront distribution this app
> deploys into are created by the `prodmee-slate-api` repo's Terraform. You cannot
> deploy the web app until that infrastructure exists.

## Architecture (this app's slice)

```
Browser → CloudFront (HTTPS, SPA fallback) → S3 bucket (static dist/)
        → calls the API at VITE_API_BASE (e.g. https://api.slate.prodmee.app)
```

The build is fully static. At runtime the SPA talks to the Laravel API over REST
with a Sanctum bearer token; there is no server-side rendering.

## Prerequisites

| Tool / asset | Why |
| --- | --- |
| The API infra already provisioned | Provides the SPA S3 bucket + CloudFront distribution |
| Node.js 20 + npm | Build the SPA (`npm ci && npm run build`) |
| AWS CLI v2 (configured) | Sync `dist/` to S3, invalidate CloudFront |
| GitHub CLI (`gh`) — optional | Set repo secrets/variables for CI/CD |

## What you must SET

### 1. Build-time env

`VITE_API_BASE` — the public base URL of the API. **It is baked into the build**, so
it must be set at build time (not runtime).

- **Local dev:** leave blank to use the Vite proxy (`/api` → `http://localhost:8001`).
- **Production:** set to the API hostname, e.g. `https://api.slate.prodmee.app`.

### 2. GitHub Actions — secrets & variables (for CI/CD)

CI/CD assumes an IAM role via **OIDC** (the same deploy-role pattern as the API).
Set these on **this** repo:

| Kind | Name | Example | Source |
| --- | --- | --- | --- |
| Secret | `AWS_DEPLOY_ROLE_ARN` | `arn:aws:iam::123…:role/gh-deploy` | your IAM deploy role |
| Variable | `AWS_REGION` | `eu-west-1` | same region as the API |
| Variable | `SPA_BUCKET` | `prodmee-slate-web` | API Terraform output `spa_bucket` |
| Variable | `CLOUDFRONT_DISTRIBUTION_ID` | `E1ABCDEF2GHIJK` | API Terraform output `cloudfront_distribution_id` |
| Variable | `VITE_API_BASE` | `https://api.slate.prodmee.app` | API Terraform output `api_url` |

## What you must KNOW

- **`VITE_API_BASE` is compile-time.** If you change the API URL you must rebuild —
  re-running the workflow (or `npm run build`) is required; re-syncing old assets won't help.
- **CloudFront caching:** the deploy uploads hashed assets with a long
  (`max-age=31536000, immutable`) cache and `index.html` as `no-cache`, then
  invalidates `/` and `/index.html`. New deploys are visible immediately; users
  may need a refresh if their tab is old.
- **SPA history fallback** is handled at the CloudFront layer (403/404 → `index.html`),
  so client-side routes like `/share/:token` and `/settings` work on direct load.
- **Order of operations:** API infra → API image → **then** web. The web deploy
  only needs the bucket + distribution to exist.

## Deploy steps

### Automated (recommended)

With the secrets/variables above set, every push to `main` runs
`.github/workflows/deploy.yml`, which:
1. `npm ci && npm run build` (with `VITE_API_BASE` injected),
2. `aws s3 sync dist/ s3://$SPA_BUCKET/ --delete` (long-cache assets, no-cache `index.html`),
3. invalidates CloudFront (`/` and `/index.html`).

### Manual (one-off)

```bash
npm ci
VITE_API_BASE="https://api.slate.prodmee.app" npm run build
aws s3 sync dist/ "s3://<spa_bucket>/" --delete \
  --cache-control "public,max-age=31536000,immutable" --exclude index.html
aws s3 cp dist/index.html "s3://<spa_bucket>/index.html" \
  --cache-control "no-cache,no-store,must-revalidate"
aws cloudfront create-invalidation --distribution-id <distribution_id> --paths "/index.html" "/"
```

## Post-deploy checklist

- [ ] `npm run build` succeeds with the correct `VITE_API_BASE`.
- [ ] `dist/` synced to the SPA bucket; CloudFront invalidation created.
- [ ] App loads at `https://<app_domain>`; login screen appears.
- [ ] Direct-load of a deep route (e.g. `/settings`) works (SPA fallback).
- [ ] OTP login succeeds end-to-end against the production API.
- [ ] A `/share/:token` link renders the read-only one-pager.
