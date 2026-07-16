# Travel circuits app — product & system design spec

Handoff doc for build. Written for a solo builder using Claude Code as the implementation agent.

## 1. Vision

A frontend-heavy PWA for logging travel as **circuits** — ordered, named routes made of precise, personally-curated points (not just tourist checkpoints). Each point holds rich memory content (photos, video, notes, attachments). Circuits can be kept private, shared via link, or published for others to clone and follow themselves.

This is not a GPS auto-tracker (Polarsteps) and not a passive memory book (TripMemo). The core differentiator is: **a circuit is a reusable, shareable artifact** — something someone else can pick up and actually go do.

## 2. Core concepts & terminology

| Term | Definition |
|---|---|
| **User** | An individual account. Two partners each have their own account. |
| **Circuit** | An ordered collection of points with a name, cover photo, description, and visibility setting. The top-level shareable unit. |
| **Point** | A single location within a circuit. Has exact coordinates, a title, notes, and attached media. Belongs to exactly one circuit and has an order index. |
| **Media** | A photo, video, or file attachment belonging to a point. |
| **Clone** | A copy of someone else's circuit (and its points) into your own account, so you can follow it and mark progress independently. |
| **Collaborator** | A user with edit access to a circuit you own (e.g. your partner co-building a shared trip). |
| **Trip** | An optional grouping of several circuits from one longer journey (e.g. 3 cities in 2 weeks). Purely organizational — a circuit can belong to zero or one trip. |
| **Travel Profile** | A curated, opt-in public page for a user, built from their public circuits plus manual curation (bio, cover photo, featured circuits). |

## 3. UX guidelines (no designer — reference-driven approach)

There is no designer on this project. All UI is built by referencing real apps and following simple layout rules — no original design work, no Figma.

### Design references per screen

Each screen in Offroute has a real-world reference app to mirror for layout and interaction patterns. When building a page, pull up the reference on your phone and match its structure — don't invent layouts from scratch.

- **`/dashboard` (Me — default landing)** — reference **Polarsteps' home screen**: full-screen satellite map as the permanent background, profile ("Me") overlay on top (avatar, name + nationality, email), horizontally scrollable circuit cards above a **floating beige translucent bottom nav** (Me · Circuits · New · Activity, deep-blue icons with labels). "New" opens a white bottom sheet (name, description capped at 200 chars, trip dates, visibility). Settings is a gear icon in the header, not a nav tab. A translucent loading overlay with a spinning compass covers the map until tiles finish rendering (MapLibre `idle` event), then fades out. *(Superseded the original Wanderlog card-grid dashboard during the Phase 2 build, 2026-07-11.)*
- **`/circuits` (circuit log)** — the full aggregated list of circuits (the original Wanderlog-style scannable list lives here): each row shows title, description, point count, visibility, date, plus the empty state when there are no circuits yet.
- **`/circuits/[id]` (circuit detail)** — reference **Google Maps saved lists**: map fills the top half, scrollable list of points below; tapping a pin on the map scrolls the list to that point and vice versa. Also look at **Polarsteps' trip detail** for how they draw the route path between steps with photos alongside.
- **`/points/[id]` (point detail)** — reference **Polarsteps' step detail card**: photo carousel at the top, title + notes below, location info + action button (Directions) at the bottom.
- **`/world` (aggregate map)** — reference **Polarsteps' world map**: dark or muted map, colored pins/paths grouped by circuit, zoomable from globe to street level. Also reference **Stampie's filled-countries effect** for visual satisfaction at the global zoom level.
- **Travel Profile (`/u/[username]`)** — reference **GitHub's profile page**: avatar + bio at the top, featured/pinned items (circuits) below, stats summary (countries, points, circuits). The fork/star counts on a circuit page are structurally identical to GitHub's repo header — use that layout directly.
- **Shared circuit view (`/s/[token]`)** — reference **Strava's public route pages**: clean map + stats, minimal chrome, clear "clone this" or "get directions" call-to-action. No login required to view; login prompted only on clone.

### Layout rules

- **Mobile-first, single-column.** Every screen is designed for a phone held vertically first; desktop gets wider margins and optional side-by-side layout, not a different design.
- **One action per screen.** Dashboard = pick a circuit. Circuit detail = explore the route. Point detail = see the memory and get directions. Add point = drop a pin and save. If a screen tries to do more than one thing, it's too complex — split it.
- **Map + list is the core pattern.** Most screens are a map (top or background) paired with a scrollable list/card (bottom or overlay). This is the same pattern Google Maps, Polarsteps, and Uber all use — users already know how it works.
- **Generous spacing, minimal decoration.** Let photos and the map do the visual work. Text is secondary. Avoid borders, shadows, and ornamental elements — use whitespace to separate sections.
- **Photos are hero-sized.** This is a memories app — photos should be large, edge-to-edge where possible (especially in the point detail carousel and circuit cover). Never thumbnail photos into small grids; that's for galleries, not memories.

### Practical workflow for Claude Code

Before building any page, drop the relevant reference screenshot(s) into a `/design-refs` folder in the repo. When prompting Claude Code for a page, include the screenshot and say "layout like this reference" — it produces significantly better UI when it has a visual target versus a text description alone.

## 4. User roles & accounts

- Individual accounts via **Supabase Auth** (email/password + Google/Apple OAuth). FastAPI verifies the JWTs and auto-provisions a row in the app's own `users` table on first authentication; all application data lives in the app's own Postgres.
- No forced "household" or pairing model — partners are just two independent users who can collaborate on specific circuits or share/clone each other's.
- A circuit has one owner and zero or more collaborators (edit access) and zero or more viewers (read access, via share link or explicit invite).

## 5. Feature scope

### Phase 1 — Auth & identity (complete)
- Auth: sign up / log in / log out (Supabase Auth)
- JWT verification, auto-provisioned `users` table, protected routes
- Settings: display name, nationality, change password, delete account

### Phase 2 — Circuits, points & POC core (complete)
- Create, edit, delete a circuit (name, description, cover image, visibility, trip dates)
- Add, edit, delete, reorder points within a circuit (title, lat/lng via map pin drop or GPS, notes, category, rating)
- Map view: category-icon pin markers with order badges, smooth bezier route lines, horizontal points carousel with map fly-to
- Upload photos to a point (pre-signed S3 uploads via Supabase Storage, point photo carousel, pin thumbnails)
- Share a circuit via link (`/s/[token]` read-only public view with OG tags for WhatsApp/iMessage previews)
- Aggregate world map (`/world`): every point from all circuits on one map, colored by circuit
- PWA shell: manifest + service worker, installable on iOS and Android
- Map style switcher: swap between satellite/streets/dark/terrain at runtime (Stadia Maps free tier)
- Location permission guidance screen before first GPS call in add-point
- Share circuit button: Web Share API with copy-link fallback (done)

### Phase 3 — Social & sharing (complete)
- Tags on circuits (e.g. "off-grid," "food crawl," "day trip") — chip-style input, displayed as pills on cards and detail page
- Star/unstar circuits with count — junction table, subquery joins for efficient list queries
- Clone a circuit via share token — copies circuit + all points, blocks self-clone, tracks clone_count, stores cloned_from_token for lineage ("View original circuit" link)
- Collaborator invites (viewer/editor roles) — invite by email, accept/decline flow, pending invites on dashboard
- Notifications — event-driven from stars, clones, invites, acceptances; bell icon with unread badge on dashboard, color-coded notification sheet

### Phase 4 — Export (in progress)
- Export a circuit as a PDF — client-side jsPDF generation with title, description, tags, dates, stats, and all points with details
- ~~Video and file attachments~~ — **dropped**: user decided not to add media attachments
- ~~AI: auto-caption, OCR, route reorder~~ — **parked**: user unsure if needed, revisit later
- ~~Offline logging~~ — **parked**: revisit post-launch

### Phase 5 — Profile & timeline
- Travel Profile: opt-in curated public page (`/u/[username]` — bio, cover photo, featured public circuits)
- Aggregate view, timeline mode: Activity page with all points laid out chronologically
- Stats dashboard: countries visited, points logged, distance traveled
- Trip grouping: bundle several circuits from one longer journey under an optional parent Trip
- PWA push notifications (revisit when social features from Phase 3 land)

### Explicitly out of scope for now
- Live GPS trip tracking (that's Polarsteps' job, not this app's)
- Public social feed / discovery algorithm
- Native mobile app (revisit after PWA is solid)
- Screenshot detection for sharing (not possible in web/PWA — share button covers this)

## 6. System architecture

```
Client (PWA)  →  FastAPI backend (Python)  →  PostgreSQL + PostGIS
                        │
                        ├→  S3-compatible object storage (media files)
                        └→  Claude API (AI features, key held server-side)
```

Classic two-tier design: the frontend talks only to the FastAPI backend over a REST API; the backend owns all database queries, permission checks, file storage access, and third-party calls. No backend-as-a-service, no auto-generated APIs, no vendor SDKs in the frontend.

- **Frontend:** **Next.js (App Router) + TypeScript**, deployed on Vercel. Tailwind CSS, lucide-react icons, **TanStack Query** for all server state (caching, background refetch, optimistic updates — e.g. starring, point reorder), plain `useState`/context for the small amount of client-only UI state (map viewport, selected pin). No MobX, no react-router (file-based routing). axios or fetch wrapper with an interceptor that attaches the Supabase JWT and signs out on 401; `@supabase/supabase-js` used for auth flows only — never in the data path. react-hook-form for forms, sonner for toasts. Offroute-specific: **MapLibre GL** with **Stadia Maps** tiles as the primary provider (free tier; API key in env), with **MapTiler** as the backup option — the tile source is just a style URL in config, so switching providers is an env-var change, no code changes — all map components are client components loaded with `ssr: false`; **next-pwa** for manifest + service worker (installability); **browser-image-compression** for client-side photo resize before upload; Next's `<Image>` for optimized photo rendering.

  Structure: `app/` (routes) · `components/` · `lib/` (API client layer — one folder of typed functions like `getCircuits()`, `createPoint()`; components never construct raw fetch calls) · `hooks/` · `types/`.

  Routes (App Router): `/` landing · `/login` · `/dashboard` (Me over full-screen map, default home) · `/circuits` (circuit log list) · `/activity` (timeline placeholder, fleshed out with aggregate timeline mode in a later phase) · `/circuits/new` · `/circuits/[id]` (detail, map+list toggle) · `/circuits/[id]/points/new` · `/points/[id]` (detail + Directions) · `/world` (aggregate map) · `/s/[token]` (public shared circuit — server-rendered with full Open Graph tags: cover photo, title, point count, so links unfurl richly in WhatsApp/iMessage; no separate backend OG endpoint needed) · `/u/[username]` (Travel Profile, server-rendered with OG tags, phase 2) · `/settings` · `/notifications` (phase 2).

  Rendering split: public pages (`/s/[token]`, `/u/[username]`, landing) are server-rendered for previews/SEO; the authenticated app (dashboard, circuit editing, maps) is client components throughout — interactivity lives client-side, data flows through TanStack Query against the FastAPI REST API below.

- **Backend:** Python **FastAPI**, mirroring the owner's existing production app: layered structure `routers/ → services/ → schemas/ (Pydantic) → models/ (SQLAlchemy ORM)`, async SQLAlchemy sessions, Alembic migrations, GeoAlchemy2 for the PostGIS point type. Eight routers: auth, circuits, points, media, aggregate, profile, ai, notifications. Authorization (owner / collaborator role / visibility) enforced in the service layer.
- **Database:** plain **PostgreSQL with the PostGIS extension**, hosted on Supabase — but connected to *directly* via a standard `postgresql://` connection string into async SQLAlchemy. No Supabase SDK, no auto-generated API, no RLS reliance: Supabase is used purely as a managed Postgres host. Because only standard Postgres features are used, migrating to a self-hosted Postgres later is `pg_dump` → restore → change one connection string.
- **Auth:** **Supabase Auth for identity only** (same proven pattern as the owner's existing app): Supabase handles sign-up, login, OAuth, and JWT issuance; FastAPI verifies tokens via PyJWKClient against `{SUPABASE_URL}/auth/v1/.well-known/jwks.json`, extracts `sub`/email, and **auto-provisions a local `users` row on first authentication**. All application data about the user lives in the app's own Postgres; Supabase only holds identity.
- **Media storage:** **Supabase Storage accessed via its S3-compatible protocol** — FastAPI uses `boto3` (standard S3 client) to issue **pre-signed upload URLs** so photo/video uploads go browser → storage directly, never streaming through the API server. The `media` table stores relative paths only. Because the code speaks only the S3 protocol, a later move to self-hosted MinIO (or R2/S3) is a file sync + env var change, zero code changes.
- **AI:** Claude API called directly from FastAPI endpoints (`/ai/*`), API key in server environment config. No edge functions needed in this architecture.
- **Deployment:** FastAPI in a minimal backend-only Dockerfile (single-stage, requirements layer-cached, secrets never baked in — config via pydantic-settings from platform env vars), deployed to **Fly.io** as primary (`fly.toml`, internal port 8080, `/health` check); `railway.toml` maintained as a parallel path with `builder = "nixpacks"`, which ignores the Dockerfile — matching the owner's existing app exactly. Frontend on Vercel, no Docker. **No docker-compose and no local dev database:** local dev runs `uvicorn` and `next dev` directly against the local venv/node_modules, connected to the hosted Supabase Postgres via its **session pooler** (port 5432 — it supports the prepared statements asyncpg relies on; the transaction pooler on 6543 does not). Two URLs point at the same database: `DATABASE_URL` (`postgresql+asyncpg://`) for the app runtime, `DATABASE_URL_SYNC` (`postgresql+psycopg2://`) used only by Alembic (`alembic.ini` leaves `sqlalchemy.url` blank; `alembic/env.py` reads it from the environment). Auth is coupled to the same Supabase project (JWKS verification), so user rows and JWT `sub` IDs never drift. One project serves as the dev DB from Phase 0; whether it becomes prod or a separate prod project is created is decided at Phase 4 (first deployment). All of this mirrors the owner's existing app.

### Why this stack
- PostGIS gives real geospatial queries (nearest point, distance, bounding-box search) instead of treating lat/lng as plain floats — matters for the "exact non-touristy location" requirement.
- A hand-written FastAPI backend means the owner controls and understands every query and permission rule, and it mirrors a structure the owner already runs in production — familiar to navigate, debug, and deploy.
- Supabase's footprint is deliberately narrow: managed Postgres host + identity provider + S3-compatible file bucket, all accessed via standard protocols (`postgresql://`, JWKS, S3). No SDK in the data path, so migration is trivially scoped: move the database and the media bucket; the application code is already portable.
- FastAPI specifically: async-friendly (good for calling Claude without blocking), automatic OpenAPI docs (the frontend gets a self-documenting API contract for free), and Pydantic validation on every request body.

## 7. Data model

```
users
  id (uuid, pk)
  email
  display_name
  nationality (text, nullable)   -- collected in settings via searchable country picker, shown next to name
  avatar_url
  created_at
  profile_enabled (bool, default false)
  profile_bio (text, nullable)
  profile_cover_media_id (fk -> media.id, nullable)

trips
  id (uuid, pk)
  owner_id (fk -> users.id)
  title
  description
  created_at

circuits
  id (uuid, pk)
  owner_id (fk -> users.id)
  trip_id (fk -> trips.id, nullable)
  title
  description
  cover_media_id (fk -> media.id, nullable)
  visibility (enum: private | shared | public)
  tags (text[], nullable)
  start_date (date, nullable)   -- trip dates, collected in the create-circuit sheet
  end_date (date, nullable)
  created_at
  updated_at

circuit_collaborators
  circuit_id (fk -> circuits.id)
  user_id (fk -> users.id)
  role (enum: editor | viewer)

points
  id (uuid, pk)
  circuit_id (fk -> circuits.id)
  order_index (int)
  title
  notes (text)
  location (geography(Point, 4326))  -- PostGIS
  visited_at (date, nullable)   -- when the owner was actually there; defaults to today when logging on-site, editable for retro-logging
  category (enum: food | drink | stay | viewpoint | activity | nature | culture | hidden_gem | other, nullable)  -- drives pin icons/colors and filtering
  rating (int 1-5, nullable)    -- personal rating; surfaces "unmissable" stops to cloners
  created_at

media
  id (uuid, pk)
  point_id (fk -> points.id, nullable)  -- nullable so it can also be a circuit cover
  circuit_id (fk -> circuits.id, nullable)
  type (enum: photo | video | file)
  storage_path
  caption (text, nullable)  -- AI-generated or manual
  created_at

circuit_clones
  id (uuid, pk)
  source_circuit_id (fk -> circuits.id)
  cloned_circuit_id (fk -> circuits.id)
  cloned_by (fk -> users.id)
  created_at

point_progress            -- phase 2, for cloned circuits
  point_id (fk -> points.id)
  user_id (fk -> users.id)
  completed_at (nullable)

circuit_stars             -- phase 2
  circuit_id (fk -> circuits.id)
  user_id (fk -> users.id)
  created_at
  -- unique on (circuit_id, user_id)

notifications             -- phase 2
  id (uuid, pk)
  recipient_id (fk -> users.id)
  type (enum: cloned | starred)
  actor_id (fk -> users.id)
  circuit_id (fk -> circuits.id)
  read_at (nullable)
  created_at

profile_featured_circuits  -- phase 2
  user_id (fk -> users.id)
  circuit_id (fk -> circuits.id)  -- must have visibility = public
  order_index (int)
```

`circuits` also gets two cached counter columns, `fork_count` and `star_count`, incremented on clone/star so the UI doesn't need a live aggregate query on every render.

## 8. API surface (FastAPI — all endpoints hand-written)

Auth (sign-up/login/refresh handled by Supabase Auth from the frontend; FastAPI only verifies tokens):
- `GET /me` — current user profile (auto-provisions local `users` row on first call); `PATCH /me` — update display name, nationality, avatar, profile fields
- `DELETE /me` — delete account: removes the local user row (cascades circuits/points/media via FKs), then deletes the Supabase Auth identity via the admin API (requires `SUPABASE_SERVICE_ROLE_KEY` in backend env; if unset, app data is still deleted and the orphaned identity is logged). Frontend gates this behind a type-DELETE-to-confirm danger modal in settings. Password change goes through `supabase.auth.updateUser()` client-side — no backend endpoint needed.

Circuits:
- `GET /circuits` — list circuits owned by or shared with the current user
- `POST /circuits` · `GET /circuits/{id}` · `PATCH /circuits/{id}` · `DELETE /circuits/{id}`
- `POST /circuits/{id}/clone` — copy structure (points, titles, notes as reference; no media) into the caller's account; increments fork_count, writes notification
- `POST /circuits/{id}/star` · `DELETE /circuits/{id}/star`
- `GET /circuits/{id}/collaborators` · `POST /circuits/{id}/collaborators` · `DELETE /circuits/{id}/collaborators/{user_id}`
- `GET /share/{share_token}` — public read-only circuit view (no auth), for `shared`/`public` circuits

Points:
- `GET /circuits/{id}/points` · `POST /circuits/{id}/points`
- `PATCH /points/{id}` · `DELETE /points/{id}`
- `PATCH /circuits/{id}/points/reorder` — bulk order_index update
- `POST /points/{id}/progress` — mark visited on a cloned circuit (phase 2)

Media:
- `POST /media/presign` — returns a pre-signed upload URL for direct browser → object storage upload
- `POST /media` — register uploaded file (path, type, point/circuit link) after upload completes
- `DELETE /media/{id}`

Aggregate & profile:
- `GET /me/aggregate` — all points across all owned circuits (map mode POC; timeline params phase 2)
- `GET /users/{username}/profile` — public Travel Profile: bio, cover, featured circuits, public-circuit aggregate (phase 2)

AI (phase 2, Claude API called server-side):
- `POST /ai/caption` — point_id → generated caption from its photos + note
- `POST /ai/ocr` — media_id → extracted text/fields from an attachment image
- `POST /ai/optimize-route` — circuit_id → suggested point order

Notifications (phase 2):
- `GET /notifications` · `PATCH /notifications/{id}/read`

Every endpoint enforces authorization in the service layer (owner / collaborator role / visibility checks) — there is no database-level RLS in this architecture; the API is the single gatekeeper, and the frontend never talks to Postgres or storage directly (except pre-signed uploads).

## 9. Sharing & privacy model

Two distinct sharing mechanisms, both supported by the existing schema:
1. **Share link** — anyone holding a `shared`/`public` circuit's link can view it. Zero-friction, no account required. For "hey, look at this."
2. **Explicit invite** — the owner adds a specific user to `circuit_collaborators` as `viewer` (view-only, circuit appears in their app) or `editor` (full co-authoring, e.g. a partner building a trip together).

Visibility levels:
- `private` — only owner and explicitly invited collaborators (viewer or editor) can view; only owner/editors can edit. No link access.
- `shared` — owner, collaborators, and anyone with the share link can view; only owner/editors can edit.
- `public` — discoverable and viewable by anyone; clone-able by any logged-in user.
- All of the above is enforced in the FastAPI service layer — every endpoint checks ownership, collaborator role, and visibility before touching data. The API is the single gatekeeper.

## 10. Aggregate view & Travel Profile

- **Personal aggregate view** — a rollup of every point across every circuit the logged-in owner has, shown two ways: **map mode** (all points on a world map, colored/grouped by circuit) and **timeline mode** (the same points laid out chronologically across the owner's whole travel history, regardless of geography — ordered by `visited_at`, falling back to `created_at` when unset). Always shows everything the owner has, since only the owner sees it — no visibility filtering needed on their own view.
- **Public aggregate** — when anyone other than the owner views a user's world, it's the same aggregate computed live, filtered to that user's `public` circuits only. Not a separate copy of data — toggling a circuit's visibility just changes what appears, automatically.
- **Travel Profile** — an opt-in curated public page (`users.profile_enabled`) built on top of the public aggregate: bio, cover photo, and a manually ordered list of *featured* circuits (`profile_featured_circuits`). A circuit can only be featured if it's already `public` — enforced at the database level, so a private circuit can never accidentally surface there.
- **Default app view for the owner is the "Me" map landing** (`/dashboard`): full-screen map with profile overlay, recent circuits, and the floating nav — the working surface for actually logging things. The full circuit log lives one tab over at `/circuits`; the aggregate/world view stays a secondary surface for reflection, not the landing screen. *(Updated 2026-07-11: originally this read "My Circuits" as the default view.)*

## 11. Offline strategy (phase 2, "nice to have")
- New points/media created offline get written to a local IndexedDB queue with a temporary client-generated ID.
- On reconnect, queue flushes to the FastAPI backend in order; temporary IDs get reconciled with server IDs.
- Not required for POC — build online-first, add the queue once the core flows are stable.

## 12. Build phases (trackable milestones)

Each phase ends with a working, deployed increment and a clear exit test. Do not start a phase until the previous one's exit test passes.

**Phase 0 — Foundations.** Next.js scaffold (Tailwind, TanStack Query, typed API-client layer; map provider config stubbed — Stadia Maps primary, MapTiler backup, key added in Phase 2) + FastAPI scaffold (routers/services/schemas/models layout, async SQLAlchemy, Alembic wired to the sync URL, minimal Fly-only Dockerfile + fly.toml/railway.toml) + Supabase project created (Postgres with PostGIS enabled; session-pooler connection strings in gitignored `backend/.env` — dev runs against this hosted database, no local DB). Deployment deferred to Phase 4.
*Exit test: local frontend calls the local `/health` endpoint, which round-trips the Supabase database.*

**Phase 1 — Identity.** Supabase Auth in the frontend (signup/login/logout), JWT verification dependency + `users` auto-provisioning in FastAPI, protected routes, `/me` + settings page.
*Exit test: two real accounts (you and partner) can sign up, log in on phones, and see their own empty dashboards.*

**Phase 2 — Circuits & points (the core).** Alembic migrations for the full data model. Circuit CRUD + dashboard. Point CRUD: add via current GPS or pin-drop, edit, delete with confirm, drag reorder. Circuit detail with map+list toggle, paths drawn between ordered points.
*Exit test: you can build a real circuit from a real outing, entirely on your phone.*

**Phase 3 — Memories.** Media pipeline: presign → client-side compress → direct upload → register. Photos on points, cover photos, point detail view with carousel and Directions button (Google Maps universal link).
*Exit test: a circuit with 20+ photos loads fast on mobile data and directions open in the native maps app.*

**Phase 4 — Sharing & the world view (POC complete).** Visibility levels + share links; `/s/[token]` server-rendered with OG tags (rich unfurl verified in WhatsApp/iMessage). Aggregate world map at `/world`. PWA shell: manifest, service worker, installability — iOS Add-to-Home-Screen hint banner, Android install prompt. **First deployment happens in this phase** (share links, OG unfurls, and PWA install all need public URLs): frontend to Vercel, backend to Fly.io via the Dockerfile; also decide here whether the existing Supabase project becomes prod or a separate prod project is created.
*Exit test: partner installs the app on an iPhone, views your shared circuit from a link whose preview shows the cover photo, and sees her own aggregate map.*

**Phase 5 — Social layer.** Clone flow (structure only, no media; fork_count + "forked by" list), per-point visited progress on clones, stars, notifications (in-app inbox primary; push as progressive enhancement given iOS caveats), collaborator invites (viewer/editor).
*Exit test: partner clones your circuit, marks two points visited, stars it — you get both notifications.*

**Phase 6 — Intelligence & polish.** AI endpoints: /ai/caption, /ai/ocr, /ai/optimize-route (all fail-gracefully). Tags + trip grouping. Aggregate timeline mode. Travel Profile (`/u/[username]`, featured circuits). Stats. Offline queue (IndexedDB → sync). Export.
*Exit test: airplane-mode point logging syncs on reconnect; your Travel Profile link unfurls and renders your featured circuits.*

## 13. Key user flows

### Add a point
1. From inside a circuit, tap "Add point."
2. Choose location via **current GPS location** (one tap, common case while on-site) or **drop a pin on the map** (for logging after the fact, or correcting a fuzzy GPS fix).
3. Add title, optional notes, optional photos (camera or gallery), and optionally: visited date (pre-filled with today, editable for after-the-fact logging), category (fixed set — food, drink, stay, viewpoint, activity, nature, culture, hidden gem, other), and a 1–5 personal rating. All optional so quick on-site logging stays quick.
4. Save — point is appended to the end of the circuit's order; reorder later via drag on the list view.
5. Coordinates are written to the PostGIS `location` column; photos upload to Storage and link via `point_id`.

### Delete a point
1. Open the point → delete action → confirmation modal (deletion removes attached media too).
2. On confirm: delete the point row (cascades to its media), remaining points re-index.
3. POC: hard delete. Optional phase-2 hardening: soft-delete (`deleted_at` timestamp) with an undo toast instead of immediate removal.
4. Deleting a point on the original circuit never affects clones — a clone is an independent copy.

### Viewing a shared circuit (view-only)
- Anyone with a `shared`/`public` circuit's link sees the map, ordered points, and the owner's photos/notes exactly as built.
- Read-only: no account changes, nothing is copied into their account.

### Cloning a circuit (make it theirs)
- From a `shared`/`public` circuit, "Clone this circuit" copies the *structure* — point order, locations, titles, and the owner's notes as reference — into a brand-new circuit owned by the cloning user.
- Photos are **not** bulk-copied; the goal is for the person to make their own memories at each stop. Each cloned point shows the original owner's note as "from the original" context, plus an empty slot for the new owner's own photos/notes and a "visited" checkbox (`point_progress` table).
- Deleting or editing the source circuit after cloning does not affect any existing clones.
- On clone: increment the source circuit's `fork_count`, record the row in `circuit_clones` (so the owner can see a "forked by" list, GitHub-style), and write a `notifications` row so the original owner is notified.
- Starring works the same way: toggles a `circuit_stars` row, increments/decrements `star_count`, and notifies the owner on a new star.

### Home (Me) & the circuit log
- Home screen for a logged-in user is the **Me map landing**: full-screen satellite map, profile overlay, a horizontal strip of recent circuit cards, and the floating bottom nav with a persistent "New" (create circuit) action.
- The **circuit log** (`/circuits`, "Circuits" tab) lists every circuit they own — title, point count, visibility, date, and (phase 5) star/fork counts. No limit on number of circuits per user — this is inherent to the data model (each circuit just has an `owner_id`), not a separate feature to build.
- **Settings** (gear icon on the home header): edit profile (display name, nationality via searchable country picker), change password, log out, and delete account behind a type-DELETE-to-confirm danger modal.

### Installing the app (another person making it their own)
- **Platform priority: iOS first** — the owner and most expected users are on iPhone, so iOS Safari is the primary test/polish target for every feature; Android Chrome must also be verified working, but iOS quirks are never acceptable to punt on.
- Anyone can use the app fully from their mobile/desktop browser with no install: sign up, create circuits, clone others' circuits. Install is optional polish, not a gate.
- **iOS (Safari):** manual only — Share icon → "Add to Home Screen." iOS never shows an automatic install prompt, so the app should show a small one-time hint banner on iOS Safari explaining this.
- **Android (Chrome):** Chrome fires the `beforeinstallprompt` event when the manifest is detected — capture it and surface an in-app "Install" button/banner; manual fallback is browser menu → "Install app."
- Once installed, the app opens standalone (own icon, no browser chrome) with the user's own logged-in account — full functionality, identical to browser use.

**iOS PWA caveats (relevant to phase 2):** Safari's PWA support lags Android on push notifications (supported only in recent iOS versions and only for installed PWAs, with quirks) and background sync. Design the notifications feature with an in-app notifications inbox as the primary surface, treating push as progressive enhancement — so iPhone users get full functionality even where push is unreliable.

### Point detail view & directions
- Tapping a point (in either owner mode or shared/cloned view) opens a detail view: title, notes, photo carousel, exact coordinates, and a **Directions** button.
- Directions uses a Google Maps universal link: `https://www.google.com/maps/dir/?api=1&destination={lat},{lng}`. On iOS/Android this is intercepted by the native Google Maps or Apple Maps app if installed (OS-level handling), otherwise it opens in the browser. One link covers both platforms — no need to maintain separate `geo:`/`maps://` URI schemes.

## 14. Non-functional requirements

- Mobile-first responsive layout (most usage will be on a phone while traveling)
- Image uploads should compress/resize client-side before upload to keep storage costs and load times reasonable
- All AI endpoint calls must fail gracefully — the app should never block core logging functionality if the Claude API call fails or is slow
- **Portability (the "own server later" plan, kept deliberately boring):** the database must remain plain Postgres + PostGIS with no host-proprietary features; media access must go only through the S3 protocol; the frontend keeps all API calls in a single client/service layer (one folder of typed functions like `getCircuits()`, `createPoint()`). Full self-hosting migration is then: (1) `pg_dump` from Supabase → restore into own Postgres with PostGIS, (2) sync media files to self-hosted MinIO via `rclone`/`aws s3 sync`, (3) change two env vars (DB connection string, S3 endpoint/keys). Application code untouched. Auth can remain on Supabase Auth indefinitely (it is independent of where data lives) or be migrated later via Supabase's user export (includes password hashes).

## 15. Appendix: app name

**Decided: Offroute.** (Double meaning: off the beaten path / off the planned route.) Use it as the project and product name throughout. Earlier candidates for reference: Waypost, Loopway, Tracewell, Driftpin, Fernweh, Pathlore.
