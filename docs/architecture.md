# Offroute — System Architecture

## 1. High-Level Overview

```
                          INTERNET
                             |
              +--------------+--------------+
              |                             |
         [ FRONTEND ]                 [ BACKEND ]
         Next.js App                  FastAPI Server
         Vercel / Self-hosted         Fly.io / Self-hosted
              |                             |
              |   REST API (JSON + JWT)     |
              +-----------> <--------------+
                                            |
                        +-------------------+-------------------+
                        |                   |                   |
                   [ DATABASE ]        [ STORAGE ]         [ AUTH ]
                   PostgreSQL          Supabase Storage     Supabase Auth
                   + PostGIS           (S3 protocol)        (JWT issuer)
                   Supabase /          MinIO / R2 /         Google OAuth
                   Self-hosted         Self-hosted          provider
```

## 2. Frontend Architecture

### Stack
- **Framework**: Next.js 16 (App Router) + TypeScript
- **Styling**: Tailwind CSS + lucide-react icons
- **State**: TanStack Query (server state), useState/context (UI state)
- **Forms**: react-hook-form + sonner (toasts)
- **Maps**: MapLibre GL + Stadia Maps tiles
- **Auth**: @supabase/supabase-js (auth flows only, never in data path)
- **Media**: browser-image-compression (client-side resize before upload)
- **PWA**: Custom service worker + web app manifest

### Request Flow

```
User Action (tap, submit, navigate)
         |
         v
+-------------------+
|  React Component  |  (pages in app/ directory)
|  - useQuery()     |  reads server state via TanStack Query
|  - useMutation()  |  writes via TanStack Query
+--------+----------+
         |
         v
+-------------------+
|   lib/ layer      |  Typed API functions: getCircuits(), createPoint(), etc.
|   (api.ts,        |  Components NEVER construct raw fetch calls.
|    circuits.ts,   |  Single source of truth for all endpoint URLs.
|    points.ts,     |
|    media.ts)      |
+--------+----------+
         |
         v
+-------------------+
|   apiFetch()      |  Central fetch wrapper in lib/api.ts
|                   |  - Attaches Supabase JWT from session
|                   |  - Signs out + redirects on 401
|                   |  - Throws ApiError on non-OK responses
+--------+----------+
         |
         v
    HTTPS request to backend API
```

### File Structure

```
frontend/src/
  app/                    # Next.js App Router pages
    layout.tsx            # Root layout (manifest, theme-color, SW registration)
    page.tsx              # Landing page (/)
    login/page.tsx        # Auth page
    dashboard/page.tsx    # Main home screen (map + profile + circuits)
    circuits/
      page.tsx            # Circuit list (/circuits)
      new/page.tsx        # Create circuit
      [id]/
        page.tsx          # Circuit detail (map + points)
        points/
          new/page.tsx    # Add point (GPS/search/pin drop)
          [pointId]/
            page.tsx      # Point detail (photos, notes, edit)
    world/page.tsx        # Aggregate world map
    activity/page.tsx     # Activity timeline
    search/page.tsx       # Search circuits + points
    settings/page.tsx     # User settings
    s/[token]/page.tsx    # Shared circuit (public, SSR with OG tags)
    u/[username]/page.tsx # Public profile (SSR with OG tags)
  components/             # Reusable UI components
    AuthGuard.tsx         # Redirect to /login if not authenticated
    BottomNav.tsx         # Floating bottom navigation bar
    DatePicker.tsx        # Custom modal date picker
    MapDynamic.tsx        # MapLibre map (dynamic import, ssr: false)
    ServiceWorker.tsx     # SW registration on mount
    StepLoader.tsx        # Multi-step loading animation
    TagInput.tsx          # Chip-style tag input
  lib/                    # API client layer + utilities
    api.ts                # apiFetch() wrapper, API_URL export
    supabase.ts           # Supabase client (auth only)
    circuits.ts           # Circuit API functions
    points.ts             # Point API functions
    media.ts              # Media upload/delete functions
    profiles.ts           # Public profile fetchers
    push.ts               # Push notification subscribe/unsubscribe
  types/
    api.ts                # TypeScript interfaces for all API responses
  public/
    manifest.json         # PWA manifest
    sw.js                 # Service worker (caching + push)
    icons/                # PWA icons (180, 192, 512)
```

### Rendering Strategy

```
+---------------------------+-----------------------------+
|  Server-Rendered (SSR)    |  Client Components          |
+---------------------------+-----------------------------+
|  /s/[token]  (OG tags)    |  /dashboard                 |
|  /u/[username] (OG tags)  |  /circuits, /circuits/[id]  |
|  / (landing)              |  /world, /activity          |
|                           |  /search, /settings         |
|                           |  All map + form pages       |
+---------------------------+-----------------------------+

SSR pages: previews/SEO (WhatsApp unfurls, Google indexing)
Client pages: interactivity, maps, real-time data via TanStack Query
```

## 3. Backend Architecture

### Stack
- **Framework**: Python FastAPI (async)
- **ORM**: SQLAlchemy (async) + GeoAlchemy2 (PostGIS)
- **Validation**: Pydantic v2 schemas
- **Migrations**: Alembic
- **Storage**: boto3 (S3 protocol for pre-signed URLs)
- **Auth**: PyJWKClient (verifies Supabase JWTs via JWKS)
- **Push**: pywebpush (VAPID web push notifications)

### Request Flow

```
HTTPS Request from Frontend
         |
         v
+-------------------+
|   FastAPI App     |  (app/main.py)
|   CORS Middleware |  Configured origins list from env
+--------+----------+
         |
         v
+-------------------+
|   Router Layer    |  app/routers/
|   (12 routers)    |  circuits, points, media, me, health,
|                   |  collaborators, notifications, profiles,
|                   |  push, search, stats, trips
+--------+----------+
         |
    +----+----+
    |         |
    v         v
+-------+ +------------------+
| Auth  | | No Auth          |
| Dep.  | | (public routes)  |
+---+---+ +------------------+
    |         |
    |    /health, /shared/{token},
    |    /u/{username}, /push/vapid-key
    |
    v
+-------------------+
|  JWT Verification |  Dependency: get_current_user()
|  - Decode JWT     |  - Fetches JWKS from Supabase
|  - Extract sub/   |  - Auto-provisions user row on first auth
|    email          |  - Returns User ORM object
+--------+----------+
         |
         v
+-------------------+
|  Service Layer    |  app/services/
|  (business logic) |  - Authorization checks (owner/collaborator/visibility)
|                   |  - Data operations
|                   |  - Notification creation
|                   |  - Media S3 operations
+--------+----------+
         |
         v
+-------------------+
|  Database Layer   |  SQLAlchemy async sessions
|  app/models/      |  ORM models mapped to Postgres tables
|  - User           |  GeoAlchemy2 for PostGIS geography columns
|  - Circuit        |
|  - Point          |
|  - Media          |
|  - Notification   |
|  - etc.           |
+--------+----------+
         |
         v
   PostgreSQL + PostGIS
```

### File Structure

```
backend/app/
  main.py               # FastAPI app, CORS, router registration
  config.py             # pydantic-settings: DB, S3, Supabase, VAPID config
  database.py           # Async SQLAlchemy engine + session factory
  auth.py               # JWT verification dependency (PyJWKClient + JWKS)
  routers/
    health.py           # GET /health
    me.py               # GET/PATCH/DELETE /me, invites, notifications
    circuits.py         # Circuit CRUD, share, star
    points.py           # Point CRUD, reorder, world aggregate
    media.py            # Upload URL generation, list, delete
    collaborators.py    # Invite, accept, decline, remove
    notifications.py    # List, mark read, unread count
    profiles.py         # Public profile + public circuits
    push.py             # VAPID key, subscribe, unsubscribe
    search.py           # Full-text search across circuits + points
    stats.py            # User stats (circuits, points, categories)
    trips.py            # Trip CRUD, add/remove circuits
  services/
    media.py            # boto3 S3 client, pre-signed URLs, delete objects
    notifications.py    # Create notification + fire web push
  schemas/              # Pydantic request/response models
    circuit.py, point.py, user.py, media.py, collaborator.py, health.py
  models/               # SQLAlchemy ORM models
    user.py, circuit.py, point.py, media.py, notification.py, etc.
  alembic/              # Database migrations
```

### Authorization Model

```
Every request passes through:

  1. JWT verification (is the token valid?)
  2. User lookup (does this user exist in our DB?)
  3. Resource authorization (can this user do this action on this resource?)

Authorization rules (enforced in service layer, NOT database RLS):

  Circuit:
    - Owner: full CRUD, share, manage collaborators
    - Editor (collaborator): read, add/edit/delete points
    - Viewer (collaborator): read only
    - Public (no auth): read if visibility = shared/public

  Point:
    - Same as parent circuit's permissions

  Media:
    - Same as parent point's circuit permissions

  User:
    - Own profile: full CRUD
    - Other profiles: read public profile if profile_enabled = true
```

## 4. Database Architecture

### Engine
- PostgreSQL 15+ with PostGIS extension
- Connected via async SQLAlchemy (`postgresql+asyncpg://`)
- Alembic migrations via sync driver (`postgresql+psycopg2://`)

### Schema

```
+------------------+       +-------------------+       +------------------+
|     users        |       |    circuits        |       |     points       |
+------------------+       +-------------------+       +------------------+
| id (uuid, PK)   |<------| owner_id (FK)      |  +-->| id (uuid, PK)   |
| email            |       | id (uuid, PK)      |  |   | circuit_id (FK) |----+
| username         |       | trip_id (FK) ----+ |  |   | order_index     |    |
| display_name     |       | title             | |  |   | title           |    |
| nationality      |       | slug              | |  |   | notes           |    |
| avatar_url       |       | description       | |  |   | location (geog) |    |
| profile_enabled  |       | cover_media_id    | |  |   | visited_at      |    |
| profile_bio      |       | visibility        | |  |   | category        |    |
| created_at       |       | tags (text[])     | |  |   | rating (1-5)    |    |
+------------------+       | share_token       | |  |   | created_at      |    |
         |                 | start_date        | |  |   +------------------+    |
         |                 | end_date          | |  |                           |
         |                 | clone_count       | |  |   +------------------+    |
         |                 | star_count        | |  |   |     media        |    |
         |                 | cloned_from_token | |  |   +------------------+    |
         |                 | created_at        | |  |   | id (uuid, PK)   |    |
         |                 | updated_at        | |  +---| point_id (FK)   |    |
         |                 +-------------------+ |      | circuit_id (FK) |----+
         |                          |            |      | type            |
         |                          |            |      | storage_path    |
         |                          |            |      | caption         |
         |                 +--------+--------+   |      | created_at      |
         |                 |                 |   |      +------------------+
         |        +--------v-------+ +------v---+---+
         |        | circuit_stars  | | collaborators |
         |        +----------------+ +---------------+
         +------->| circuit_id(FK) | | circuit_id(FK)|
         +------->| user_id (FK)   | | user_id (FK)  |
                  | created_at     | | role           |
                  +----------------+ | status         |
                                     | created_at     |
                                     +---------------+

+------------------+       +---------------------+
|     trips        |       |   notifications     |
+------------------+       +---------------------+
| id (uuid, PK)   |       | id (uuid, PK)       |
| owner_id (FK)   |       | recipient_id (FK)   |
| title            |       | type                |
| description      |       | message             |
| created_at       |       | circuit_id (FK)     |
+------------------+       | actor_name          |
                           | read (bool)         |
+------------------+       | created_at          |
| push_subscriptions|      +---------------------+
+------------------+
| id (uuid, PK)   |
| user_id (FK)    |
| endpoint         |
| p256dh           |
| auth_key         |
| created_at       |
+------------------+
```

### Key Design Decisions
- **PostGIS `geography(Point, 4326)`** for point locations — enables real geospatial queries (distance, bounding box), not just float columns
- **Counter caches** (`clone_count`, `star_count`) on circuits — avoids expensive COUNT queries on every list render
- **`share_token`** is generated on first share, reused after — stable URLs
- **`slug`** on circuits for clean URLs, auto-generated from title, uniqueness enforced with `-1` suffix
- **No database-level RLS** — all authorization in the API service layer for portability

## 5. Media Upload Flow

```
1. User picks photo on phone
         |
         v
2. Browser compresses image        (browser-image-compression)
   - Max 1MB, max 1920px           client-side, no server load
         |
         v
3. Frontend calls POST             apiFetch('/points/{id}/media')
   /points/{id}/media               
         |
         v
4. Backend generates:
   - Media row in DB               (storage_path, point_id)
   - Pre-signed S3 PUT URL         (boto3 generate_presigned_url, 10min expiry)
   - Public URL                    (for reading after upload)
   Returns: { id, upload_url, public_url }
         |
         v
5. Frontend PUTs compressed         fetch(upload_url, { method: 'PUT',
   image directly to S3              body: compressedBlob })
         |                          
         v                          Browser --> S3 Storage (direct)
6. Done. Image accessible           Backend never touches the file bytes.
   at public_url                    
```

**Why this matters for migration:**
- Backend only speaks S3 protocol (boto3) — change endpoint + keys to point at MinIO
- Frontend only talks to the backend API + the pre-signed URL — no storage SDK
- Media files are just objects in a bucket — `rclone sync` to migrate

## 6. Auth Flow

```
+----------+        +---------------+        +-----------+        +----------+
|  Browser |        | Supabase Auth |        |  FastAPI  |        | Postgres |
+----+-----+        +-------+-------+        +-----+-----+        +----+-----+
     |                      |                       |                   |
     | 1. signInWithPassword|                       |                   |
     |   or signInWithOAuth |                       |                   |
     +--------------------->|                       |                   |
     |                      |                       |                   |
     |  2. JWT (access_token|+ refresh_token)       |                   |
     |<---------------------+                       |                   |
     |                      |                       |                   |
     | 3. GET /me           |                       |                   |
     |  Authorization:      |                       |                   |
     |  Bearer <JWT>        |                       |                   |
     +--------------------------------------------->|                   |
     |                      |                       |                   |
     |                      | 4. Fetch JWKS         |                   |
     |                      |<----------------------+                   |
     |                      | (cached after first)  |                   |
     |                      +---------------------->|                   |
     |                      |                       |                   |
     |                      |    5. Verify JWT      |                   |
     |                      |    Extract sub, email |                   |
     |                      |                       |                   |
     |                      |                       | 6. SELECT user    |
     |                      |                       |    WHERE id = sub |
     |                      |                       +------------------>|
     |                      |                       |<------------------+
     |                      |                       |                   |
     |                      |                       | 7. If not found:  |
     |                      |                       |    INSERT user    |
     |                      |                       |    (auto-provision|)
     |                      |                       +------------------>|
     |                      |                       |<------------------+
     |                      |                       |                   |
     |  8. Return user JSON |                       |                   |
     |<---------------------------------------------+                   |
     |                      |                       |                   |

Google OAuth adds one extra hop:
  Browser -> Supabase -> Google -> Supabase -> Browser (with JWT)
  Same JWT, same flow after step 2. Supabase auto-links identities
  when the same email signs in with both email/password and Google.
```

## 7. Full Request Lifecycle

```
User taps "Save Point" on their phone
         |
         v
+------------------+
| React Component  |  onSubmit -> useMutation({ mutationFn: createPoint })
+--------+---------+
         |
         v
+------------------+
| lib/points.ts    |  createPoint(circuitId, { title, lat, lng, ... })
|                  |  -> apiFetch(`/circuits/${id}/points`, { method: 'POST', body })
+--------+---------+
         |
         v
+------------------+
| lib/api.ts       |  apiFetch():
| apiFetch()       |  1. Get JWT from Supabase session
|                  |  2. fetch(API_URL + path, { Authorization: Bearer <JWT> })
+--------+---------+
         |
    [ NETWORK ]     HTTPS POST to backend
         |
         v
+------------------+
| FastAPI Router   |  @router.post("/circuits/{id}/points")
| points.py        |  Pydantic validates request body (PointCreate)
+--------+---------+
         |
         v
+------------------+
| Auth Dependency  |  get_current_user():
| auth.py          |  Verify JWT -> extract user_id -> load User from DB
+--------+---------+
         |
         v
+------------------+
| Service Layer    |  1. Check user owns circuit or is editor
|                  |  2. Get next order_index
|                  |  3. Create Point row with PostGIS geography
|                  |  4. Commit transaction
+--------+---------+
         |
         v
+------------------+
| PostgreSQL       |  INSERT INTO points (id, circuit_id, title,
|                  |    location, ...) VALUES (...)
+------------------+
         |
    [ RESPONSE ]    201 Created + PointResponse JSON
         |
         v
+------------------+
| TanStack Query   |  onSuccess:
|                  |  1. Invalidate ["points", circuitId] cache
|                  |  2. Invalidate ["circuit", circuitId] cache (point_count)
|                  |  3. Show success toast
|                  |  4. Navigate back to circuit detail
+------------------+
         |
         v
    UI updates automatically (TanStack refetches stale queries)
```

## 8. Deployment Options

### Current (Launch)

```
+----------------+     +----------------+     +------------------+
|   Vercel       |     |   Fly.io       |     |   Supabase       |
|   (Frontend)   |---->|   (Backend)    |---->|   (DB + Storage  |
|                |     |   Docker       |     |    + Auth)        |
|   CDN/Edge     |     |   Single       |     |                  |
|   Auto-deploy  |     |   Region       |     |   Managed        |
|   from GitHub  |     |                |     |   Free tier       |
+----------------+     +----------------+     +------------------+
```

### Future (Self-Hosted on Oracle)

```
+--------------------------------------------------+
|              Oracle Cloud Server                  |
|                                                   |
|   +-------------+     +-----------------------+   |
|   |   nginx     |     |   PostgreSQL          |   |
|   |   (reverse  |     |   + PostGIS           |   |
|   |    proxy +  |     +-----------------------+   |
|   |    SSL)     |                                 |
|   +------+------+     +-----------------------+   |
|          |             |   MinIO               |   |
|     +----+----+        |   (S3-compatible      |   |
|     |         |        |    object storage)    |   |
|     v         v        +-----------------------+   |
|  +------+ +-------+                              |
|  |Next.js| |FastAPI|                              |
|  |:3000  | |:8000  |                              |
|  +------+ +-------+                              |
+--------------------------------------------------+

Migration checklist:
  1. pg_dump from Supabase -> pg_restore on Oracle Postgres
  2. rclone sync media from Supabase Storage -> MinIO
  3. Change env vars:
     - DATABASE_URL -> oracle postgres connection
     - S3_ENDPOINT_URL -> http://localhost:9000 (MinIO)
     - S3_ACCESS_KEY_ID / SECRET -> MinIO credentials
     - STORAGE_PUBLIC_URL -> https://yourdomain.com/media
  4. Zero code changes
  5. Auth stays on Supabase (or migrate later)
```

## 9. Environment Variables

### Backend (.env)

| Variable | Purpose | Changes on migration |
|----------|---------|---------------------|
| `DATABASE_URL` | Async Postgres connection | New connection string |
| `DATABASE_URL_SYNC` | Alembic migrations | New connection string |
| `SUPABASE_URL` | JWKS endpoint for JWT verification | Stays (auth remains) |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin API (account deletion) | Stays |
| `S3_ENDPOINT_URL` | Storage endpoint | MinIO URL |
| `S3_ACCESS_KEY_ID` | Storage auth | MinIO key |
| `S3_SECRET_ACCESS_KEY` | Storage auth | MinIO secret |
| `S3_BUCKET` | Bucket name | Same or new |
| `S3_REGION` | S3 region | Any value for MinIO |
| `STORAGE_PUBLIC_URL` | Public media URL prefix | Your domain |
| `CORS_ORIGINS` | Allowed frontend origins | Your domain |
| `VAPID_PRIVATE_KEY` | Web push signing | Same key (portable) |
| `VAPID_PUBLIC_KEY` | Web push verification | Same key |
| `VAPID_CONTACT` | Push contact email | Same |

### Frontend (.env.local)

| Variable | Purpose | Changes on migration |
|----------|---------|---------------------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | Your domain/api |
| `NEXT_PUBLIC_SUPABASE_URL` | Auth endpoint | Stays |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Auth public key | Stays |
