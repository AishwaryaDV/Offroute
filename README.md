# Offroute

Travel circuit planner — pin places on an immersive world map, chain them into
shareable routes with photos, and track the countries you've covered.

A **circuit** is an ordered, personally-curated route of exact locations —
not a passive photo album, not a GPS auto-tracker. Build one from your own
trip, share it via link, and someone else can clone it and actually follow
your route.

**Live:** [offroute.aishwaryadv.space](https://offroute.aishwaryadv.space)

## Features

- **Circuits & points** — drop pins via GPS, search, or a map tap; attach
  photos, notes, categories, and ratings; drag-reorder; export to PDF
- **Astra** — a per-circuit AI chat assistant (Claude, with an automatic
  Gemini fallback) that logs and edits points from natural language instead
  of forms — every change is reversible via an undo log
- **Sharing** — private, link-access, or public visibility, with rich Open
  Graph previews for WhatsApp/iMessage link unfurls
- **Clone & star** — fork someone else's public circuit into your own
  account and track your own progress against it
- **Collaboration** — invite others as viewer/editor on a circuit, with a
  notification inbox and web push for activity
- **World map & activity timeline** — every point across every circuit on
  one map, and a chronological feed of everything you've logged
- **Travel Profile** — an opt-in public profile page of your circuits
- **PWA** — installable on iOS/Android, offline-ready shell

## Stack

| | |
|---|---|
| Frontend | Next.js (App Router), TypeScript, Tailwind CSS, TanStack Query, MapLibre GL |
| Backend | FastAPI, async SQLAlchemy, PostGIS (geospatial queries), Alembic |
| Auth | Supabase Auth (JWT) — identity provider only, never in the data path |
| Storage | S3-compatible (AWS S3 or self-hosted MinIO), pre-signed uploads |
| AI | `claude-agent-sdk` (Claude Code subscription login) + Gemini fallback |
| Deployment | Self-hosted — nginx, systemd, GitHub-webhook auto-deploy |

See [`docs/architecture.md`](docs/architecture.md) for the full system design.

## Project Structure

```
frontend/   — Next.js (TypeScript, Tailwind CSS)
backend/    — FastAPI (Python), app/services/assistant/ for Astra
docs/       — architecture notes, deployment runbook
```

## Getting Started

Prerequisites: a Postgres database with the `postgis` extension (a free
[Supabase](https://supabase.com) project works well), Node 20+, Python 3.11+.

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in your DB/Supabase values
alembic upgrade head
uvicorn app.main:app --reload --port 8001
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local   # fill in your values
npm run dev   # http://localhost:3000
```

The AI assistant (Astra) is off by default — set `ASSISTANT_ENABLED=true` /
`NEXT_PUBLIC_ASSISTANT_ENABLED=true` to turn it on. It needs either a logged-in
Claude Code CLI session or a `GEMINI_API_KEY`; place search quality improves
with an optional `STADIA_API_KEY` (free tier), otherwise falls back to
Nominatim.

## Deployment

Self-hosted: nginx reverse-proxies the FastAPI backend and Next.js frontend
(both run as systemd services), with self-hosted MinIO for object storage. A
GitHub webhook triggers an auto-deploy script on push to `main` that pulls,
reinstalls dependencies, runs pending migrations, and restarts only the
service that changed.

## License

No license file yet — all rights reserved by default. Reach out if you'd
like to use or build on this.
