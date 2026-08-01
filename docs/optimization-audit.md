# Offroute — Optimization Audit

Comprehensive audit of working features that could be optimized for performance, edge cases, and UX. Each item is a working feature with room for improvement — not a bug.

---

## SOLVED

### S1. Auth token caching with proactive refresh
**Files:** `frontend/src/lib/supabase.ts`, `frontend/src/lib/api.ts`
**Problem:** Every `apiFetch` call invoked `supabase.auth.getSession()` — a network round-trip to Supabase's auth servers. A dashboard load with 4 parallel API calls meant 4 redundant auth lookups, causing noticeable delay and making it look like the backend was down.
**Solution:** Module-level cached access token with proactive refresh. On app init:
- `supabase.auth.onAuthStateChange` listener stores `access_token` and `expires_at` in module variables
- `supabase.auth.getSession()` called once at import to seed the cache
- New `getAccessToken()` function returns the cached token instantly. If the token is within 60 seconds of expiry, it proactively calls `supabase.auth.refreshSession()` before returning — so the user never hits an expired token.
- `apiFetch` now calls `await getAccessToken()` instead of `await supabase.auth.getSession()`, eliminating per-request Supabase network calls.
**Impact:** Dashboard load went from sluggish (multiple Supabase round-trips) to near-instant auth header injection.

---

## HIGH PRIORITY

### H1. Remove unused `three.js` dependencies from bundle
**File:** `frontend/package.json`
`three` (785KB) and `@react-three/fiber` (175KB) are in dependencies but no file imports them. The Globe uses MapLibre, not Three.js. Removing them shrinks install size by ~1MB.
**Fix:** `npm uninstall three @types/three @react-three/fiber`

### H2. Missing database indexes on foreign key columns
**Files:** All model files in `backend/app/models/`
PostgreSQL does NOT auto-create indexes on FK columns. These columns are queried on every request but have no index: `circuits.owner_id`, `points.circuit_id`, `media.point_id`, `notifications.user_id`, `stars.circuit_id`, `collaborators.circuit_id`, `circuits.slug`, `circuits.visibility`.
**Fix:** Alembic migration adding indexes. Single biggest backend performance win as data grows.

### H3. User loaded from DB on every authenticated request
**File:** `backend/app/dependencies.py:54-64`, `backend/app/services/users.py:19-36`
Every API call does `db.get(User, user_id)`. The user row rarely changes. For a dashboard load (4 parallel queries), that's 4 identical DB lookups.
**Fix:** In-memory TTL cache (e.g., `cachetools.TTLCache` with 30s TTL) keyed by user_id. Invalidate on `/me` PATCH.

### H4. `webpush()` blocks the async event loop
**File:** `backend/app/services/push.py:70-79`
`pywebpush.webpush()` is synchronous HTTP — it blocks the event loop while sending push notifications. Multiple subscriptions = multiple sequential blocks.
**Fix:** Wrap in `asyncio.to_thread()`.

### H5. `boto3` S3 calls block the async event loop
**File:** `backend/app/services/media.py:86-91, 101-109`
`delete_object()` and `generate_presigned_url()` are synchronous boto3 calls inside async functions.
**Fix:** Use `aioboto3` or wrap in `asyncio.to_thread()`.

### H6. JWKS key fetch blocks event loop on first request
**File:** `backend/app/dependencies.py:39`
`get_signing_key_from_jwt()` makes a synchronous HTTP call to Supabase. Cached after first call, but the initial fetch (and any cache refresh) blocks the loop for all concurrent requests.
**Fix:** Prefetch JWKS at startup via a lifespan event. Wrap subsequent calls in `run_in_executor`.

### H7. S3 orphaned files on circuit/point/user deletion
**Files:** `backend/app/services/circuits.py:150-152`, `points.py:80-82`, `users.py:68-107`
CASCADE deletes remove media DB rows, but actual S3 files are never cleaned up. Every deletion leaks storage.
**Fix:** Query media rows before deletion and delete S3 objects. Or implement a periodic orphan cleanup job.

### H8. `list_all_points` returns every point with no pagination
**File:** `backend/app/services/points.py:85-99`
`GET /me/aggregate` returns ALL points across ALL circuits. A power user with 1000 points gets everything in one response.
**Fix:** Add `limit`/`offset` query params.

### H9. N+1 query in `reorder_points`
**File:** `backend/app/services/points.py:105-113`
Each point in the reorder request triggers a separate `db.get(Point, item.id)`. 20 points = 20 queries.
**Fix:** Fetch all circuit points in one query, validate/update in memory, commit once.

### H10. `resolve_circuit` slug lookup not scoped to owner
**File:** `backend/app/services/circuits.py:44`
When resolving by slug, the query doesn't filter by `owner_id`. If two users have circuits with the same slug, the wrong one could be loaded (then caught by `assert_owner`, but still wrong data loaded).
**Fix:** Pass `owner_id` into the slug query.

### H11. No optimistic updates for star/unstar
**File:** `frontend/src/app/circuits/[id]/page.tsx:308-316`
Star mutation invalidates + refetches on success. The star icon doesn't update until the server responds.
**Fix:** `onMutate` with `queryClient.setQueryData` to toggle star state instantly. Roll back in `onError`.

### H12. Search results flash to loading on each keystroke
**File:** `frontend/src/app/search/page.tsx:54-58`
No `placeholderData` on the search query. Previous results disappear while new ones load.
**Fix:** Add `placeholderData: keepPreviousData` from TanStack Query.

### H13. `redrawLines` fires on every map render frame
**File:** `frontend/src/components/Map.tsx:392-393`
`map.on("render", redrawLines)` runs during every pan/zoom frame. It iterates all coordinates, calls `map.project()` for each, and manipulates SVG DOM.
**Fix:** Throttle with `requestAnimationFrame`. Better: switch to MapLibre's native GeoJSON line layer (GPU-rendered).

### H14. Circuit detail map destroyed on every point add/delete
**File:** `frontend/src/app/circuits/[id]/page.tsx:426`
`key={mapMarkers.length}` forces a full MapLibre remount whenever markers change. New instance, new tile loads.
**Fix:** Remove the `key` prop. The Map component already handles marker changes via useEffect.

### H15. Unsplash placeholder images not lazy-loaded
**Files:** `frontend/src/app/dashboard/page.tsx:348`, `circuits/page.tsx:51`, `circuits/[id]/page.tsx:139,675`
Raw `<img>` tags with no `loading="lazy"`, no width/height (causes layout shift).
**Fix:** Add `loading="lazy"` to all `<img>` tags. For real covers, use Next.js `<Image>` with `fill` and `sizes`.

### H16. Memory leak: Object URL never revoked in avatar upload
**File:** `frontend/src/app/settings/page.tsx:40`
`URL.createObjectURL(file)` is called but `URL.revokeObjectURL()` is never called after the image loads.
**Fix:** Add `URL.revokeObjectURL(img.src)` inside the `img.onload` handler.

---

## MEDIUM PRIORITY

### M1. Circuit detail page is 1073 lines — monolithic component
**File:** `frontend/src/app/circuits/[id]/page.tsx`
15+ useState hooks, 10+ mutations, multiple modals all in one component. Every state change re-renders the entire tree including the map.
**Fix:** Extract bottom sheets, carousel, and modals into separate components.

### M2. Dashboard page similarly monolithic (631 lines)
**File:** `frontend/src/app/dashboard/page.tsx`
**Fix:** Extract "New Circuit" sheet, circuit card grid, and invites section.

### M3. No prefetch when navigating to circuit detail
**File:** `frontend/src/app/circuits/page.tsx:46-84`
Circuit cards are `Link`s. No data prefetch on touch/hover.
**Fix:** `onTouchStart` calls `queryClient.prefetchQuery` for the circuit data.

### M4. Prefetch common queries in AuthGuard
**File:** `frontend/src/components/AuthGuard.tsx`
After session is confirmed, start prefetching `["me"]` and `["circuits"]` so data fetching begins before child components mount.
**Fix:** Call `queryClient.prefetchQuery` after `setReady(true)`.

### M5. `jsPDF` statically imported — 300KB in potential bundle
**File:** `frontend/src/lib/exportPdf.ts:1`
**Fix:** Dynamic import: `const { jsPDF } = await import("jspdf")` inside the function.

### M6. `@dnd-kit` imported on circuit detail (always loaded)
**File:** `frontend/src/app/circuits/[id]/page.tsx:37-47`
Drag-to-reorder is a rare action but the library is always loaded.
**Fix:** Wrap DnD section in a dynamically imported component.

### M7. Duplicate geolocation calls across pages
**Files:** `dashboard/page.tsx:139-147`, `activity/page.tsx:65-73`, `world/page.tsx:24-30`
Three pages call `navigator.geolocation.getCurrentPosition()` independently, on top of the `useUserLocation` hook.
**Fix:** Remove raw geolocation calls, use the hook everywhere.

### M8. No React error boundary
**File:** `frontend/src/app/layout.tsx`
Any render error crashes the entire app to white screen.
**Fix:** Add `error.tsx` files per route segment (Next.js 13+ convention).

### M9. Race condition in Nominatim search debounce
**File:** `frontend/src/app/circuits/[id]/points/new/page.tsx:60-84`
`setTimeout` debounce doesn't cancel in-flight fetches. Stale results can override newer ones.
**Fix:** Use `AbortController` to cancel previous fetch, or use TanStack Query.

### M10. Map markers rebuilt from scratch on every change
**File:** `frontend/src/components/Map.tsx:278-347`
All markers are destroyed and recreated when the array changes.
**Fix:** Diff by ID, only add/remove changed markers.

### M11. `share_token` exposed in list responses
**File:** `backend/app/schemas/circuit.py:82`
The share token grants read access. It's returned in `GET /circuits` (list). Only the owner needs it, and only on the detail view.
**Fix:** Separate list vs. detail response schemas, or omit from list.

### M12. Collaborator access checks never called
**File:** `backend/app/services/circuits.py:121-123`
`assert_owner` is binary — owner or 403. The `is_collaborator` function exists but is never used from any router. Invited collaborators can't access circuits.
**Fix:** Integrate collaborator checks into the permission model.

### M13. No rate limiting on any endpoint
**File:** `backend/app/main.py`
Star/unstar, clone, push subscribe, invite accept — all unprotected.
**Fix:** Add `slowapi` with per-user limits.

### M14. No enum validation on `role`, `visibility`, `media type`
**Files:** `backend/app/schemas/collaborator.py:9`, `circuit.py:10,37`, `media.py:9`
These string fields accept any value. Client could send `role: "admin"`.
**Fix:** Use `Literal["viewer", "editor"]` etc.

### M15. Health endpoint returns 200 when DB is down
**File:** `backend/app/routers/health.py:12-14`
Load balancers would still route traffic to an unhealthy instance.
**Fix:** Return 503 when `db_ok` is false.

### M16. Hardcoded `.jpg` extension for all media types
**File:** `backend/app/services/media.py:59`
Even video/file uploads get a `.jpg` path and `image/jpeg` content type on the presigned URL.
**Fix:** Map media type to correct extension and content type.

### M17. No file size limit on presigned upload URLs
**File:** `backend/app/services/media.py:101-109`
A malicious user could upload arbitrarily large files.
**Fix:** Add `content-length-range` condition to presigned URL.

### M18. Search returns hardcoded `point_count: 0` for circuits
**File:** `backend/app/services/search.py:66`
**Fix:** Add a subquery for actual count, or omit the field.

### M19. Shared circuit endpoint has no HTTP caching
**File:** `backend/app/routers/circuits.py:117`
Public, read-only views that could get many hits from shared links.
**Fix:** Add `Cache-Control: public, max-age=300` header.

---

## LOW PRIORITY

### L1. `watch("visibility")` re-renders entire Dashboard
**File:** `frontend/src/app/dashboard/page.tsx:567`
**Fix:** Extract visibility selector into its own component using `useWatch`.

### L2. `longPressTimer` ref not cleaned up on unmount
**File:** `frontend/src/app/circuits/[id]/points/[pointId]/page.tsx:115`
**Fix:** Add cleanup in `useEffect` return.

### L3. Map SVG overlay cleanup order
**File:** `frontend/src/components/Map.tsx:384-386`
**Fix:** Explicitly remove SVG before `map.remove()`.

### L4. `BottomNav` could use `useLayoutEffect` for measurements
**File:** `frontend/src/components/BottomNav.tsx:62-78`
**Fix:** Switch `useEffect` to `useLayoutEffect` to prevent indicator flash.

### L5. `getSharedCircuit` and `getPublicProfile` bypass `apiFetch` error handling
**Files:** `frontend/src/lib/circuits.ts:48-52`, `profiles.ts:4-14`
**Fix:** Use `apiFetch` or at least throw `ApiError` for consistency.

### L6. No tile caching in service worker
**File:** `frontend/src/components/Map.tsx`
**Fix:** Add tile URL patterns to SW cache for offline/fast reload.

### L7. Stats endpoint fires 5 separate queries
**File:** `backend/app/routers/stats.py:22-52`
**Fix:** Combine circuit_count + total_clones in one query; point_count + categories in another.

### L8. Notifications hardcoded limit 50, no pagination
**File:** `backend/app/services/notifications.py:47`
**Fix:** Accept `offset`/`limit` from router.

### L9. Duplicated `_point_to_dict` function
**Files:** `backend/app/services/points.py`, `search.py:11-14`
**Fix:** Share from a common module.

### L10. No DB connection pool size tuning
**File:** `backend/app/database.py:18`
**Fix:** Make `pool_size`, `max_overflow` configurable via Settings.

---

## Quick wins (can do in < 30 min total)

1. `npm uninstall three @types/three @react-three/fiber` (H1)
2. Add `loading="lazy"` to all `<img>` tags (H15)
3. Add `placeholderData: keepPreviousData` to search query (H12)
4. Add `URL.revokeObjectURL()` in settings avatar handler (H16)
5. Remove `key={mapMarkers.length}` from circuit detail map (H14)
6. Wrap `webpush()` in `asyncio.to_thread()` (H4)
7. Return 503 from health endpoint when DB is down (M15)
8. Add `Literal` types to schema enum fields (M14)
