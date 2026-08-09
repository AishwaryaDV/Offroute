# Toughest Problems & Solutions

Problems that were non-obvious to diagnose or required deeper architectural understanding to fix.

---

## 1. Auth Bypass — Stale Sessions Let Users In Without Login

**Problem:** Users could access auth-gated pages without a valid session. The app appeared to work normally but showed blank data — no login prompt, no redirect.

**Root cause:** `AuthGuard` used Supabase's `getSession()` which only reads the token from localStorage. If a token exists but is expired or revoked server-side, `getSession()` still returns it as valid. The guard never actually validated with Supabase's auth server.

**Solution:** Switched to `getUser()` which makes a server round-trip to validate the token. If invalid, explicitly call `signOut()` (to clear the stale localStorage token) before redirecting to `/login`. Without the `signOut()`, the stale token persists and the user gets stuck in a redirect loop.

**File:** `frontend/src/components/AuthGuard.tsx`

---

## 2. Janky Page Transitions — Blue Flash on Every Navigation

**Problem:** Every tap on the bottom nav caused a full-page flash — dark blue loading spinner briefly visible before content appeared. Felt like a website, not an app.

**Root cause:** Two compounding issues:
1. **AuthGuard re-validated on every page mount.** `getUser()` is a network call to Supabase. Every navigation triggered it, showing the dark spinner for 200-500ms while waiting.
2. **TanStack Query staleTime was 30s.** After 30 seconds, cached data was considered stale. Navigating back to a page after 30s triggered a full refetch with loading spinners.

**Solution:**
1. Added a module-level `cachedAuthValid` flag. Once `getUser()` succeeds on first load, subsequent AuthGuard mounts skip the network call entirely. The auth state listener still catches sign-outs.
2. Bumped global `staleTime` from 30s to 5 minutes. Previously visited pages render instantly from cache. Data still revalidates in the background — users see fresh data without the loading flash.

**Files:** `frontend/src/components/AuthGuard.tsx`, `frontend/src/app/providers.tsx`

**Remaining:** The map component re-initializes on every page (each page creates its own `MapDynamic`). A layout-level persistent map would eliminate the remaining flash, but it's a larger refactor — tracked in the optimization audit.

---

## 3. Backend 500s After Deploy — Missing Environment Variable

**Problem:** All API calls returned 500 with CORS errors in the browser. Backend had been working, then suddenly broke with no code changes.

**Root cause:** `SUPABASE_URL` was missing from backend `.env`. The JWKS endpoint URL was constructed as a relative path (`/auth/v1/.well-known/jwks.json`) instead of a full URL, causing JWT verification to fail on every request. The variable was never added during initial setup — it worked before because an older code path didn't need it.

**Complication:** `uvicorn --reload` only watches `.py` files, not `.env`. Adding the variable required a manual server restart — the reload flag gave false confidence that changes were picked up.

**Solution:** Added `SUPABASE_URL` to `.env`. Documented that `.env` changes require manual restart.

**File:** `backend/.env`

---

## 4. Unsplash Returning Irrelevant Images for Circuit Titles

**Problem:** Circuit titled "Tokyo Street Food Trail" showed a generic stock photo instead of anything related to Tokyo or street food.

**Root cause:** The full title was sent as the Unsplash search query. Unsplash's search algorithm weighs exact phrase matches, and long specific phrases return poor results or generic fallbacks.

**Solution:** Trim the query to the first 3 words of the title and append "travel" as a relevance anchor. `"Tokyo Street Food Trail"` becomes `"Tokyo Street Food travel"` — returns relevant results without over-constraining.

**File:** `frontend/src/hooks/useUnsplashCover.ts`

---

## 5. React Hooks in .map() — Silent Rendering Bug

**Problem:** Needed to call `useUnsplashCover` for each circuit card rendered inside a `.map()` loop. Calling hooks inside `.map()` violates React's rules of hooks — hooks must be called at the top level of a component.

**Root cause:** The circuit cards were rendered inline inside the parent component's JSX. No component boundary existed for each card, so there was no valid place to call a hook per-card.

**Solution:** Extracted inline card rendering into dedicated components (`DashboardCircuitCard`, `CircuitCard`, `PointThumb`). Each component calls `useUnsplashCover` at its own top level — valid per React's rules.

**Files:** `frontend/src/app/dashboard/page.tsx`, `frontend/src/app/circuits/[id]/page.tsx`
