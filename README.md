# Prodmee Slate — Web (Vue 3)

The single-page app for Prodmee Slate. Talks to the `prodmee-slate-api` backend
over REST with a Sanctum bearer token.

## Stack
- Vue 3 + Vite
- Vue Router (role-based guards) + Pinia
- vue-chartjs / Chart.js (usage analytics)
- Axios (token-aware client)

## Features
- Passwordless OTP login.
- **Slate** board (drag-and-drop across stages), role-aware filtering.
- Project one-pager: view / edit / create, checklist, comments, links, access, S3 file uploads.
- **Sales**: pitch pipeline (drag to change status) + buyers.
- **Team** directory (admin).
- **Sicala** AI assistant panel + Auto-fill from documents.
- **Settings** (admin): users, company API key, token-usage charts.
- Public read-only **share** pages at `/share/:token`.
- External collaborators get a confined read-only view.

## Local development
```bash
npm install
cp .env.example .env        # leave VITE_API_BASE blank to use the dev proxy
npm run dev                 # http://localhost:5173
```
The dev server proxies `/api` to `http://localhost:8001` (the Laravel API), so
run the backend alongside it.

## Build
```bash
npm run build               # outputs to dist/
```

Set `VITE_API_BASE` (e.g. `https://api.slate.prodmee.app`) for production builds.

## Deployment
`.github/workflows/deploy.yml` builds and syncs `dist/` to S3 + invalidates
CloudFront. See `prodmee-slate-api/DEPLOY.md` for the full infrastructure setup.
