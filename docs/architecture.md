# Offroute — System Architecture

## 1. What is Offroute

Offroute is a mobile-first PWA for logging travel as **circuits** — ordered, shareable routes of personally curated points. Unlike GPS auto-trackers (Polarsteps) or passive memory books, the core idea is that **a circuit is a reusable artifact** — something you build from your own travel, and someone else can pick up, follow, and make their own.

A solo traveler drops pins at hidden cafes, viewpoints, and trails as they explore. Each point gets notes, photos, a category, and a rating. The circuit connects these into an ordered route. They share it with a friend via link — the friend clones it, follows the same route, marks their own progress, and adds their own photos. The original traveler sees the clone count and stars grow.

### What it does
- **Log**: Create circuits of points with GPS/search/pin-drop, attach photos, notes, categories, ratings
- **Organize**: Tag circuits, group into trips, drag-reorder points, assign visited dates
- **Share**: Generate share links with rich previews (OG tags for WhatsApp/iMessage unfurls), public profiles
- **Social**: Clone circuits, star them, collaborate with editors/viewers, get notified on activity
- **Export**: PDF export of any circuit with full point details
- **Install**: PWA with home screen install, push notifications, offline-ready service worker

### Scale and scope
- Solo-built project (one developer + Claude Code as implementation agent)
- ~50 API endpoints, ~12 database tables, ~15 frontend routes
- Built in 3 weeks from zero to feature-complete

---

## 2. High-Level Architecture

```
                          INTERNET
                             |
              +--------------+--------------+
              |                             |
         [ FRONTEND ]                 [ BACKEND ]
         Next.js (React)              FastAPI (Python)
              |                             |
              |   REST API (JSON + JWT)     |
              +-----------> <--------------+
                                            |
                        +-------------------+-------------------+
                        |                   |                   |
                   [ DATABASE ]        [ STORAGE ]         [ AUTH ]
                   PostgreSQL          S3-compatible        Supabase Auth
                   + PostGIS           object storage       (JWT issuer)
```

**Why this split**: Classic two-tier. The frontend talks only to the FastAPI backend over REST. The backend owns all database queries, permission checks, storage access, and third-party calls. No backend-as-a-service, no auto-generated APIs, no vendor SDK in the data path. This makes every layer independently replaceable.

---

## 3. Frontend Architecture

### Stack
- **Next.js 16 (App Router)** + TypeScript — file-based routing, SSR for public pages
- **Tailwind CSS** + **lucide-react** icons — utility-first styling, no component library
- **TanStack Query** — all server state (caching, background refetch, optimistic updates)
- **react-hook-form** — form state with validation, watch/setValue for interactive controls
- **MapLibre GL** + **Stadia Maps** tiles — open-source map renderer, free tile provider
- **browser-image-compression** — client-side photo resize before upload (max 1MB)
- **@supabase/supabase-js** — auth flows only (login, signup, OAuth); never in the data path

### How data flows through the frontend

```
User Action (tap, submit, navigate)
         |
         v
+-------------------+
|  React Component  |  useQuery() for reads, useMutation() for writes
|                   |  TanStack Query handles caching, refetch, loading states
+--------+----------+
         |
         v
+-------------------+
|  lib/ API layer   |  Typed functions: getCircuits(), createPoint(), uploadPhoto()
|                   |  Components NEVER construct raw fetch calls
+--------+----------+
         |
         v
+-------------------+
|  apiFetch()       |  Central wrapper:
|                   |  - Reads JWT from Supabase session
|                   |  - Attaches Authorization header
|                   |  - Auto signs out + redirects on 401
|                   |  - Throws typed ApiError on failures
+--------+----------+
         |
         v
    HTTPS to backend
```

### Rendering split

| Server-Rendered (SSR) | Client Components |
|---|---|
| `/s/[token]` — shared circuit with OG tags | `/dashboard` — map + profile overlay |
| `/u/[username]` — public profile with OG tags | `/circuits/[id]` — map + point list |
| `/` — landing page | `/world`, `/activity`, `/search` |
| | All map and form pages |

SSR pages exist purely for link previews (WhatsApp unfurls, SEO). The authenticated app is client components throughout — interactivity and maps live client-side, data flows through TanStack Query.

---

## 4. Backend Architecture

### Stack
- **FastAPI** (async) — auto OpenAPI docs, Pydantic validation on every request
- **SQLAlchemy** (async) + **GeoAlchemy2** — ORM with PostGIS support
- **Pydantic v2** — request/response schemas with field validators
- **Alembic** — database migrations
- **boto3** — S3 protocol for pre-signed upload URLs (portable to any S3-compatible storage)
- **PyJWKClient** — verifies Supabase JWTs via JWKS endpoint
- **pywebpush** — VAPID web push notifications

### How a request flows through the backend

```
HTTPS Request
     |
     v
[ CORS Middleware ]  — configured allowed origins
     |
     v
[ Router ]  — 12 routers: circuits, points, media, me, collaborators,
               notifications, profiles, push, search, stats, trips, health
     |
     +--- Public routes (no auth): /health, /shared/{token}, /u/{username}
     |
     v
[ Auth Dependency: get_current_user() ]
  1. Decode JWT using JWKS from Supabase
  2. Extract user_id (sub) and email
  3. Look up user in DB; auto-provision row on first auth
  4. Return User ORM object
     |
     v
[ Service Layer ]
  - Authorization: is this user the owner? editor? viewer?
  - Business logic: create point, generate share token, fire notification
  - S3 operations: generate pre-signed URLs, delete objects
     |
     v
[ Database ]  — async SQLAlchemy sessions → PostgreSQL + PostGIS
```

### Authorization model

All authorization is enforced in the service layer — NOT database RLS. The API is the single gatekeeper.

```
Circuit:
  Owner        → full CRUD, share, manage collaborators
  Editor       → read, add/edit/delete points and media
  Viewer       → read only
  Public       → read if visibility = shared or public
  
Point / Media  → inherits from parent circuit's permissions
User profile   → own profile: full CRUD; others: read if profile_enabled
```

---

## 5. Database Architecture

PostgreSQL with PostGIS extension. Connected via async SQLAlchemy (asyncpg driver). Migrations via Alembic (psycopg2 sync driver).

### Schema overview

```
users ──────────< circuits ──────────< points ──────────< media
                     |                    |
                     |                    +──< point locations (PostGIS geography)
                     |
                     +──< circuit_stars (user ←→ circuit junction)
                     +──< collaborators (user ←→ circuit with role)
                     +──< notifications (triggered by stars, clones, invites)
                     |
                trips ──< circuits (optional grouping)
                
push_subscriptions ──< users (browser push endpoints per device)
```

### Key design decisions

- **PostGIS `geography(Point, 4326)`** — real geospatial queries (distance, bounding box) instead of treating lat/lng as plain floats
- **Counter caches** (`clone_count`, `star_count` on circuits) — avoids expensive COUNT joins on every list render; incremented atomically on star/clone
- **`share_token`** — generated once on first share, reused after — gives stable shareable URLs
- **`slug`** on circuits — auto-generated from title for clean URLs (`/circuits/kotagiri-weekend`), uniqueness enforced with numeric suffix
- **No database RLS** — all auth in the service layer, making the database fully portable (no vendor-specific policies)
- **Cascading deletes** — deleting a circuit cascades to its points, media, stars, and collaborator rows

---

## 6. Media Upload Pipeline

```
1. User picks photo          Phone camera or gallery
         |
         v
2. Client-side compression   browser-image-compression
   Max 1MB, max 1920px       Runs in web worker, no server load
         |
         v
3. POST /points/{id}/media   Backend creates DB row + pre-signed S3 PUT URL
                              (boto3, 10-minute expiry)
         |
         v
4. PUT to pre-signed URL     Browser uploads directly to S3 storage
                              Backend never touches the file bytes
         |
         v
5. Photo live at public URL   Max 9 photos per point, enforced server-side
```

**Why pre-signed URLs**: The backend generates a temporary upload permission (the signed URL) but never proxies the file. This means a 5MB photo goes browser → storage directly, not browser → backend → storage. Halves latency, eliminates backend memory pressure, and the same pattern works with any S3-compatible storage.

---

## 7. Auth Flow

```
Browser                 Supabase Auth              FastAPI              Postgres
   |                         |                        |                     |
   |-- signInWithPassword -->|                        |                     |
   |   (or signInWithOAuth)  |                        |                     |
   |                         |                        |                     |
   |<-- JWT (access_token) --|                        |                     |
   |                         |                        |                     |
   |-- GET /me (Bearer JWT) ----------------------->|                     |
   |                         |                        |                     |
   |                         |<-- fetch JWKS ---------|                     |
   |                         |-- return public keys ->|                     |
   |                         |                        |                     |
   |                         |              verify JWT, extract sub + email |
   |                         |                        |                     |
   |                         |                        |-- SELECT user ----->|
   |                         |                        |<-- user row --------|
   |                         |                        |                     |
   |                         |                        | (if new: INSERT) -->|
   |                         |                        |<--------------------|
   |                         |                        |                     |
   |<-- user JSON -------------------------------|                     |
```

**Google OAuth**: Browser → Supabase → Google consent → Supabase → Browser with JWT. Same flow after that. Supabase auto-links identities when the same email signs in with both email/password and Google — no duplicate accounts.

**Auto-provisioning**: The first time a JWT with an unknown `sub` hits the backend, a user row is created automatically. No separate "create account" API call needed.

---

## 8. Full Request Lifecycle (example: saving a point)

```
User taps "Save Point"
         |
         v
React component → useMutation({ mutationFn: createPoint })
         |
         v
lib/points.ts → apiFetch('/circuits/{id}/points', { method: 'POST', body })
         |
         v
apiFetch() → attaches JWT, sends HTTPS POST
         |
    [ NETWORK ]
         |
         v
FastAPI router → Pydantic validates body (PointCreate schema)
         |
         v
Auth dependency → verify JWT → load User from DB
         |
         v
Service layer → check user owns circuit → get next order_index
              → create Point row with PostGIS geography → commit
         |
         v
PostgreSQL → INSERT INTO points (...) → 201 Created
         |
    [ RESPONSE ]
         |
         v
TanStack Query → onSuccess:
  1. Invalidate ["points", circuitId] cache (triggers refetch)
  2. Invalidate ["circuit", circuitId] cache (point_count changed)
  3. Show success toast
  4. Navigate back to circuit detail
         |
         v
UI updates automatically (TanStack refetches stale queries)
```

---

## 9. Challenges Faced During Development

### 1. MapLibre SSR incompatibility
MapLibre GL requires browser APIs (`window`, `document`, WebGL). Next.js tries to server-render everything by default. Had to use dynamic imports with `ssr: false` and wrap all map components as client components. The map also needed careful lifecycle management — the `idle` event fires unpredictably, so the loading overlay (compass spinner) had to handle both fast and slow tile loads gracefully.

### 2. Supabase Storage — S3 protocol vs REST API
Initially built media uploads using Supabase's proprietary REST API. Realized this would tightly couple the app to Supabase, making the planned Oracle server migration require code changes. Rewrote the entire media pipeline to use boto3 with S3v4 signatures. The Supabase Storage S3 endpoint has quirks — required explicit `signature_version="s3v4"` in the boto3 config and specific endpoint URL formatting. Pre-signed URLs also needed the right content-type headers on the PUT request from the browser.

### 3. Google OAuth identity linking
When a user signs up with email/password and later signs in with Google (same email), Supabase auto-links the identities under one account. But testing this initially appeared to create a duplicate account (0 circuits showed up). The actual issue was the backend wasn't running during the test — the frontend silently failed to fetch circuits. Debugging this required checking the Supabase dashboard to verify identity linking, then realizing the data-layer failure was masking the auth success.

### 4. Native form controls overflowing mobile bottom sheets
Native `<select>` dropdowns and `<input type="date">` calendars render as browser-level overlays that ignore CSS overflow/containment. On mobile, these popped outside the bottom sheet, covering the entire screen. Had to replace all native form controls with custom implementations: tappable category dropdown, star rating icons, and a modal date picker — all built from scratch without third-party component libraries.

### 5. Two async database drivers
SQLAlchemy async requires `asyncpg`, but Alembic migrations need a synchronous driver (`psycopg2`). These connect differently to Supabase's connection pooler — asyncpg needs the session pooler (port 5432, supports prepared statements) while psycopg2 works with either. Required maintaining two separate connection strings (`DATABASE_URL` and `DATABASE_URL_SYNC`) and configuring Alembic's `env.py` to read the sync URL from the environment rather than `alembic.ini`.

### 6. PostGIS geography vs geometry
PostGIS has two spatial types: `geometry` (flat plane math) and `geography` (spherical Earth, accurate distances). Using `geography(Point, 4326)` gives correct distance calculations anywhere on Earth but requires GeoAlchemy2's `WKTElement` for inserts and explicit casting for queries. Getting the ORM layer to correctly serialize PostGIS points to plain lat/lng floats in API responses required custom property accessors on the model.

### 7. Pre-signed URL CORS and content-type
The browser's `fetch()` PUT to a pre-signed S3 URL is a cross-origin request. Supabase Storage's S3 endpoint needed CORS configuration to allow PUT from the frontend origin. Additionally, the pre-signed URL is generated for a specific content-type — if the browser sends a different content-type header, S3 rejects the upload with a `SignatureDoesNotMatch` error. Had to ensure the frontend always sends `Content-Type: image/jpeg` matching what the backend signs.

### 8. TanStack Query cache invalidation strategy
When a point is created, multiple caches become stale: the points list, the circuit detail (point_count), the world map aggregate, and the activity timeline. Over-invalidating causes unnecessary refetches; under-invalidating shows stale data. Settled on invalidating by query key prefix — `["points", circuitId]` and `["circuit", circuitId]` — which catches all variants without being too broad.

### 9. Slug uniqueness and special characters
Circuit URLs use slugs (`/circuits/kotagiri-weekend`). Generating slugs from user-typed titles required handling: unicode characters (transliterate or strip), consecutive hyphens, leading/trailing hyphens, titles that are entirely special characters (fallback to "circuit"), and uniqueness collisions (append `-1`, `-2`, etc.). Also had to handle slug updates when a circuit is renamed — the old slug becomes a 404.

### 10. PWA service worker + push notification coordination
The service worker handles both asset caching (offline-first for static files) and push notifications (show native OS notification, navigate on tap). These are separate concerns sharing one file. The `notificationclick` handler needs to find an existing app window and navigate it, or open a new one — and `clients.matchAll()` only sees windows in the service worker's scope. Testing push required HTTPS (localhost doesn't work for push), adding another layer of complexity to the dev flow.

---

## 10. Questions You Might Be Asked

### Architecture & Design Decisions

1. Why did you choose a separate FastAPI backend instead of using Next.js API routes for everything?
2. Why PostgreSQL + PostGIS instead of a simpler database like SQLite or a NoSQL option?
3. Why did you put authorization in the service layer instead of using database-level RLS?
4. How does your system handle concurrent writes to the same circuit (e.g., two collaborators editing)?
5. Why TanStack Query over Redux or Zustand for state management?
6. What's the tradeoff of using pre-signed URLs vs proxying uploads through your backend?
7. Why did you use Supabase for auth but not for the rest (database queries, storage SDK)?
8. How would this architecture change if you needed to support 100K users instead of personal use?
9. Why a monolith backend instead of microservices?
10. How does the slug system work and how do you handle collisions?

### Frontend

11. How does TanStack Query's caching work, and how do you decide what to invalidate?
12. Why did you build custom form controls (date picker, dropdown) instead of using a component library like Radix or shadcn/ui?
13. How do you handle the MapLibre SSR problem in Next.js?
14. What's your rendering strategy — which pages are SSR vs client, and why?
15. How does the PWA install flow differ between iOS and Android?
16. How does the service worker handle caching without serving stale data?
17. How does the photo upload flow work end-to-end from the user's perspective?
18. What happens when a user is offline and tries to use the app?
19. How do you handle optimistic updates in the UI?
20. How does react-hook-form's watch/setValue work for the tappable star rating?

### Backend

21. How does JWT verification work without calling Supabase on every request?
22. What's the difference between asyncpg and psycopg2 and why do you need both?
23. How does the collaborator permission model work — walk through an authorization check?
24. How do pre-signed S3 URLs work and what prevents abuse (unlimited uploads)?
25. How does the notification system work — what triggers a notification and how is it delivered?
26. What happens if the S3 upload succeeds but the user closes the browser before the response?
27. How do you handle database migrations in production?
28. What's the circuit cloning flow — what gets copied and what doesn't?
29. How does the share token system work?
30. How does the star/clone counter cache stay in sync — can it drift?

### Database

31. Why PostGIS geography type over geometry, and when would you use each?
32. How do counter caches (star_count, clone_count) work and what's the consistency tradeoff?
33. How does point reordering work without renumbering every row?
34. What indexes exist and why?
35. How would you add full-text search if the current ILIKE approach doesn't scale?

### DevOps & Portability

36. Walk through the migration plan from Supabase to a self-hosted server.
37. What's the minimum you need to change to switch from Supabase Storage to MinIO?
38. How does the Dockerfile work and what's the multi-stage build strategy?
39. How would you set up CI/CD for this project?
40. What monitoring/logging would you add before going to production?

### Security

41. How do you prevent unauthorized access to private circuits?
42. What stops a user from uploading malicious files through the pre-signed URL?
43. How does CORS protect the API?
44. What happens when a JWT expires mid-session?
45. How does the account deletion flow work — what gets cleaned up?

### Product & Tradeoffs

46. What did you drop from v1 and why (AI features, offline logging)?
47. Why is a circuit different from a Google Maps saved list or a Polarsteps trip?
48. How does the cloning model differ from a traditional "fork" (like GitHub)?
49. What's the most complex user flow in the app and how did you simplify it?
50. If you had to rebuild this from scratch, what would you do differently?
