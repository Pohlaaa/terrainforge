# TerrainForge — Local Dev Setup Guide

## Step 1: Install Node.js

1. Go to **https://nodejs.org**
2. Download the **LTS** version (18.x or higher — current LTS is fine)
3. Run the installer — accept all defaults
4. Open a new terminal (Windows Terminal, PowerShell, or Command Prompt) and verify:
   ```
   node --version   ← should show v18.x.x or higher
   npm --version    ← should show 9.x or higher
   ```

---

## Step 2: Open the project in your terminal

Open a terminal and navigate to the `terrainforge` folder:

```powershell
cd "C:\Users\PohlaDesk\Documents\Terrain Forge\terrainforge"
```

> **Tip:** In Windows Explorer, shift-right-click on the `terrainforge` folder → "Open in Terminal"

---

## Step 3: Install dependencies

```powershell
npm install
```

Downloads all packages into `node_modules/`. Takes ~1 minute. Only needed once (or when packages change).

---

## Step 4: Set up environment variables

```powershell
copy .env.example .env.local
```

Open `.env.local` in any text editor. Leave values as placeholders for now — the app runs without them, you'll just see console warnings for unconnected services. Fill them in as you set up Supabase, Stripe, etc.

---

## Step 5: Start the dev server

```powershell
npm run dev
```

Open **http://localhost:3000** — you should see TerrainForge running.

---

## Optional but recommended: Install Git

Enables checkpointing your work and Netlify's auto-deploy on push.

1. Download from **https://git-scm.com/download/win** — accept all defaults
2. In your `terrainforge/` folder:
   ```powershell
   git init
   git add .
   git commit -m "Initial React project scaffold"
   ```
3. Create a GitHub repo, push to it, connect to Netlify for auto-deploys

---

## Project structure

```
terrainforge/
├── src/
│   ├── pages/          ← 8 app pages (Dashboard, Projects, Materials, etc.)
│   ├── components/     ← Shared UI components (Modal, Sidebar, KPICard, etc.)
│   ├── stores/         ← Zustand state (projects, materials, crew, equipment)
│   ├── lib/            ← Business logic (manifest engine, work orders, alerts)
│   ├── services/       ← API layers (Supabase, Stripe, Anthropic)
│   ├── types/          ← TypeScript interfaces for all data models
│   └── utils/          ← Formatting, dates, validation helpers
├── supabase/
│   └── migrations/     ← Database schema SQL (run in Supabase SQL editor)
├── package.json
├── .env.example
└── vite.config.ts      ← Dev server on port 3000
```

---

## Packages and why they're here

| Package | Purpose | When needed |
|---|---|---|
| `react` + `react-dom` | Core UI framework | Now |
| `react-router-dom` | Page navigation | Now |
| `zustand` | State management | Now |
| `@supabase/supabase-js` | Database + auth | Auth sprint |
| `@stripe/stripe-js` | Billing | Billing sprint |
| `@react-pdf/renderer` | Manifest PDF export | PDF sprint |
| `leaflet` + `react-leaflet` | Dashboard map | Now |
| `lucide-react` | Icons | Now |
| `clsx` | Conditional CSS classes | Now |
| `@sentry/react` | Error monitoring | Pre-launch |
| `posthog-js` | Product analytics | Pre-launch |

---

## Troubleshooting

**`npm install` fails:** Confirm Node is 18+ with `node --version`. Uninstall and reinstall from nodejs.org if needed.

**Port 3000 in use:** Edit `vite.config.ts`, change `port: 3000` to `port: 3001`.

**TypeScript errors in VS Code:** Press `Ctrl+Shift+P` → "TypeScript: Select TypeScript Version" → "Use Workspace Version".
