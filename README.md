# Timeless™

Patent-pending legacy message demo — React + Vite, deployed on Vercel.

## Live site

**https://timeless-three-flax.vercel.app**

## Local development

```bash
cd timeless
npm install --cache ./.npm-cache --legacy-peer-deps
npm run dev
```

Open http://localhost:5173

## Deploy updates to Vercel

```bash
cd timeless
npm run build          # optional: verify build locally
npm run deploy         # production deploy
```

Or: `./node_modules/.bin/vercel --prod`

## Project layout

- `src/Timeless.jsx` — main app
- `src/main.jsx` — React entry
- `index.html` — Vite shell
- `vercel.json` — SPA fallback (all routes → index.html)
