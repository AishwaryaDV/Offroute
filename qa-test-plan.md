# Offroute QA Test Plan

Comprehensive test plan covering all features, flows, and edge cases.
Tests marked **[AUTO]** can be automated with API/integration tests.
Tests marked **[MANUAL]** require human verification — justification included.

---

## 1. Health & Infrastructure

### [AUTO] API Health

- [ ] `GET /health` returns `{"status":"ok","database":"ok"}`
- [ ] `GET /health` returns `database: "error"` when DB is unreachable
- [ ] Frontend `API_URL` resolves correctly in dev and prod environments

---

## 2. Authentication & Session

### [AUTO] Supabase Auth Integration

- [ ] Signup with valid email + password creates user in Supabase and syncs to `users` table
- [ ] Signup with duplicate email returns appropriate error
- [ ] Signup with weak password (< 6 chars) returns validation error
- [ ] Login with valid credentials returns access + refresh tokens
- [ ] Login with wrong password returns 400
- [ ] Login with non-existent email returns 400
- [ ] JWT token is included in `Authorization: Bearer` header on API calls
- [ ] Expired JWT token returns 401 from backend
- [ ] 401 response triggers frontend `signOut()` + redirect to `/login`
- [ ] Refreshed token is used transparently by `getAccessToken()`

### [AUTO] AuthGuard Component

- [ ] `getUser()` call validates session server-side (not just localStorage)
- [ ] Invalid/stale session triggers `signOut()` + redirect to `/login`
- [ ] Valid session renders children with fade-in animation
- [ ] `onAuthStateChange` listener redirects to `/login` when session is cleared

### Edge Cases

- [ ] **[AUTO]** Clear all cookies/localStorage → app redirects to `/login`, not blank screen
- [ ] **[AUTO]** Tampered JWT (modified payload) returns 401
- [ ] **[AUTO]** Expired refresh token forces full re-login
- [ ] **[MANUAL]** Session persists across browser restart (why: requires actual browser restart cycle)
- [ ] **[MANUAL]** Multiple tabs share auth state correctly (why: requires multi-tab browser coordination)

---

## 3. User Profile (`/me`)

### [AUTO] CRUD

- [ ] `GET /me` returns current user with all fields (id, email, username, display_name, nationality, avatar_url, profile_enabled, profile_bio)
- [ ] `PATCH /me` with `display_name` updates and returns updated user
- [ ] `PATCH /me` with `username` updates and returns updated user
- [ ] `PATCH /me` with `nationality` (valid country code) updates correctly
- [ ] `PATCH /me` with `avatar_url` (base64 data URL) stores and returns correctly
- [ ] `PATCH /me` with `profile_enabled: true` enables public profile
- [ ] `PATCH /me` with `profile_bio` updates bio text
- [ ] `DELETE /me` removes user account and all associated data
- [ ] `DELETE /me` cascades: circuits, points, notifications, collaborators, stars, trips, push subscriptions all removed
- [ ] `GET /me` with no auth returns 401

### Edge Cases

- [ ] **[AUTO]** `PATCH /me` with empty string `display_name` — should accept or reject?
- [ ] **[AUTO]** `PATCH /me` with very long `display_name` (500+ chars) — validate max length
- [ ] **[AUTO]** `PATCH /me` with `username` containing special chars (`@`, spaces, unicode)
- [ ] **[AUTO]** `PATCH /me` with duplicate `username` already taken by another user
- [ ] **[AUTO]** `PATCH /me` with `avatar_url` exceeding reasonable size (5MB+ base64)
- [ ] **[MANUAL]** Avatar upload via camera button on dashboard (why: file picker + image compression is browser-native)

---

## 4. Circuits

### [AUTO] CRUD

- [ ] `GET /circuits` returns all circuits owned by authenticated user
- [ ] `GET /circuits` returns empty array for new user with no circuits
- [ ] `POST /circuits` with `{title: "Test"}` creates circuit with auto-generated slug
- [ ] `POST /circuits` with full payload (title, description, visibility, tags, start_date, end_date) creates correctly
- [ ] `GET /circuits/{id}` returns circuit by UUID
- [ ] `GET /circuits/{slug}` returns circuit by slug
- [ ] `PATCH /circuits/{id}` updates title and regenerates slug
- [ ] `PATCH /circuits/{id}` updates visibility (private -> shared -> public)
- [ ] `PATCH /circuits/{id}` updates tags array
- [ ] `PATCH /circuits/{id}` updates dates
- [ ] `DELETE /circuits/{id}` removes circuit and cascades (points, media, collaborators, stars, notifications)
- [ ] Response includes computed fields: `point_count`, `star_count`, `is_starred`, `clone_count`, `cover_url`

### [AUTO] Authorization

- [ ] `GET /circuits/{id}` for another user's circuit returns 403
- [ ] `PATCH /circuits/{id}` for another user's circuit returns 403
- [ ] `DELETE /circuits/{id}` for another user's circuit returns 403
- [ ] All endpoints return 401 without auth token

### [AUTO] Slugs

- [ ] Slug is auto-generated from title (lowercase, hyphens, no special chars)
- [ ] Duplicate title for same owner generates suffixed slug (`my-trip`, `my-trip-1`, `my-trip-2`)
- [ ] Slug max length is 80 chars
- [ ] Updating title regenerates slug
- [ ] Circuit accessible by both UUID and slug

### [AUTO] Cover URL & Cover Picker

- [ ] `GET /circuits` returns `cover_url` from manually chosen cover (`cover_media_id`) when set
- [ ] `GET /circuits` falls back to auto-picked first photo when `cover_media_id` is null
- [ ] `GET /circuits/{id}` returns correct `cover_url` for manual cover selection
- [ ] `GET /circuits/{id}` returns auto-picked first photo when no manual cover
- [ ] `PATCH /circuits/{id}` with `cover_media_id: <valid media id>` updates cover
- [ ] `PATCH /circuits/{id}` with `cover_media_id: null` resets to auto-pick
- [ ] Circuit with no photos returns `cover_url: null`

### [AUTO] Sharing

- [ ] `POST /circuits/{id}/share` generates a random share token
- [ ] `GET /shared/{token}` returns circuit data with points (no auth required)
- [ ] `GET /shared/{token}` returns `photo_url` for each point that has photos
- [ ] `GET /shared/{token}` returns `photo_url: null` for points without photos
- [ ] `GET /shared/{token}` includes `owner_name` from circuit owner's display_name
- [ ] `GET /shared/{token}` with invalid token returns 404
- [ ] `POST /shared/{token}/clone` creates a copy owned by authenticated user
- [ ] `POST /shared/{token}/clone` without auth returns 401
- [ ] Cloned circuit has `cloned_from_token` set
- [ ] Cloning increments `clone_count` on source circuit
- [ ] Clone notification sent to original owner
- [ ] Cloned points are independent copies (editing clone doesn't affect original)
- [ ] Cloning own circuit returns 400

### [AUTO] Stars

- [ ] `POST /circuits/{id}/star` creates star, returns updated count + `is_starred: true`
- [ ] `DELETE /circuits/{id}/star` removes star, returns updated count + `is_starred: false`
- [ ] Starring own circuit does NOT create a notification
- [ ] Starring another user's circuit creates `star` notification for the owner
- [ ] Double-star (star twice) is idempotent or returns appropriate error
- [ ] `is_starred` field in circuit list is per-user

### Edge Cases

- [ ] **[AUTO]** Create circuit with empty title — returns 422 (whitespace-only validator)
- [ ] **[AUTO]** Create circuit with title of only spaces/special chars — returns 422
- [ ] **[AUTO]** Create circuit with title > 500 chars
- [ ] **[AUTO]** `start_date` after `end_date` — should reject or accept?
- [ ] **[AUTO]** Delete circuit with 100+ points — verify cascade completes
- [ ] **[AUTO]** Non-existent circuit UUID returns 404
- [ ] **[AUTO]** Invalid UUID format in path returns 422

---

## 5. Points

### [AUTO] CRUD

- [ ] `GET /circuits/{id}/points` returns ordered list of points
- [ ] `GET /circuits/{id}/points` for empty circuit returns `[]`
- [ ] `POST /circuits/{id}/points` creates point with auto-assigned `order_index`
- [ ] `POST /circuits/{id}/points` with all fields (title, notes, lat, lng, visited_at, category, rating)
- [ ] `GET /points/{id}` returns single point
- [ ] `PATCH /points/{id}` updates title
- [ ] `PATCH /points/{id}` updates location (lat/lng)
- [ ] `PATCH /points/{id}` updates category
- [ ] `PATCH /points/{id}` updates rating (1-5)
- [ ] `PATCH /points/{id}` partial update — only specified fields change
- [ ] `DELETE /points/{id}` removes point
- [ ] `GET /points/all` returns all points across all user's circuits with `circuit_title` and `circuit_slug`

### [AUTO] Reorder

- [ ] `PATCH /circuits/{id}/points/reorder` with new order indices updates all points
- [ ] Reorder with point ID not in circuit returns 400
- [ ] Reorder preserves all point data (only `order_index` changes)

### [AUTO] Collaborator Notifications

- [ ] When a collaborator adds a point, circuit owner gets `point_added` notification
- [ ] When a collaborator adds a point, other collaborators get `point_added` notification
- [ ] When the owner adds a point, they do NOT get a self-notification
- [ ] When a collaborator deletes a point, owner gets `point_deleted` notification
- [ ] Notification message includes actor name, point title, and circuit title

### [AUTO] Authorization

- [ ] Creating a point on another user's circuit returns 403
- [ ] Updating a point on another user's circuit returns 403
- [ ] Deleting a point on another user's circuit returns 403

### [AUTO] Geolocation

- [ ] Point stores lat/lng as PostGIS geometry (SRID 4326)
- [ ] Response includes decoded `latitude` and `longitude` fields
- [ ] Valid coordinate ranges: lat [-90, 90], lng [-180, 180]

### Edge Cases

- [ ] **[AUTO]** Point with coordinates at poles (lat=90, lat=-90)
- [ ] **[AUTO]** Point with coordinates at date line (lng=180, lng=-180)
- [ ] **[AUTO]** Point with lat=0, lng=0 (null island)
- [ ] **[AUTO]** Point with rating=0 or rating=6 (boundary/out of range)
- [ ] **[AUTO]** Point title with unicode/emoji characters
- [ ] **[AUTO]** Notes field with very long text (10000+ chars)
- [ ] **[AUTO]** Creating 100+ points on a single circuit
- [ ] **[AUTO]** Empty point title — returns 422 (whitespace-only validator)

---

## 6. Trips

### [AUTO] CRUD

- [ ] `GET /trips` returns all trips for the authenticated user
- [ ] `POST /trips` with `{title: "Europe 2026"}` creates trip
- [ ] `PATCH /trips/{id}` updates title
- [ ] `DELETE /trips/{id}` removes trip (circuits are NOT deleted, just unlinked)
- [ ] Response includes `circuit_count`

### [AUTO] Circuit Association

- [ ] `POST /trips/{id}/circuits/{circuit_id}` assigns circuit to trip
- [ ] `DELETE /trips/{id}/circuits/{circuit_id}` unlinks circuit from trip (sets `trip_id = null`)
- [ ] Assigning circuit already in another trip moves it
- [ ] Deleting a trip unlinks all its circuits (circuits survive)

### [AUTO] Authorization

- [ ] Cannot modify another user's trip — returns 404
- [ ] Cannot add another user's circuit to your trip — returns 404

### Edge Cases

- [ ] **[AUTO]** Create trip with empty title
- [ ] **[AUTO]** Delete trip that has 50+ circuits assigned
- [ ] **[AUTO]** Assign same circuit to same trip twice (idempotent?)

---

## 7. Collaborators

### [AUTO] Invite Flow

- [ ] `POST /circuits/{id}/collaborators` with valid email + role creates pending invite
- [ ] Invite creates `invite` notification for the invitee
- [ ] `GET /circuits/{id}/collaborators` lists all collaborators with status
- [ ] `GET /me/invites` returns pending invites for the authenticated user

### [AUTO] Accept / Decline

- [ ] `POST /me/invites/{id}/accept` changes status to `accepted`
- [ ] Accepting creates `invite_accepted` notification for the inviter
- [ ] `POST /me/invites/{id}/decline` changes status to `declined`
- [ ] Declining does NOT create a notification

### [AUTO] Remove

- [ ] `DELETE /circuits/{id}/collaborators/{collab_id}` removes collaborator
- [ ] Only circuit owner can remove collaborators

### [AUTO] Authorization

- [ ] Only circuit owner can invite collaborators
- [ ] Only circuit owner can list collaborators
- [ ] Only the invited user can accept/decline their own invite

### Edge Cases

- [ ] **[AUTO]** Invite yourself — returns 400
- [ ] **[AUTO]** Invite non-existent email — returns 404
- [ ] **[AUTO]** Invite same user twice (while first is pending) — returns 409
- [ ] **[AUTO]** Invite same user after they declined — should allow re-invite
- [ ] **[AUTO]** Accept/decline already-responded invite — returns 400
- [ ] **[AUTO]** Accept invite with non-matching user ID — returns 404

---

## 8. Notifications

### [AUTO] List & Count

- [ ] `GET /me/notifications` returns notifications ordered by `created_at` desc (limit 50)
- [ ] `GET /me/notifications/unread-count` returns `{count: N}` for unread notifications
- [ ] New notification has `read: false` by default
- [ ] Notification includes `type`, `message`, `circuit_id`, `actor_name`, `read`, `created_at`

### [AUTO] Mark Read

- [ ] `POST /me/notifications/read` marks all unread as read
- [ ] After marking read, unread count returns 0
- [ ] Already-read notifications are unaffected

### [AUTO] Delete

- [ ] `DELETE /me/notifications/{id}` removes single notification
- [ ] `DELETE /me/notifications/{id}` for non-existent or other user's notification returns 404
- [ ] `DELETE /me/notifications` removes ALL notifications for the user
- [ ] After clearing, list returns empty and unread count returns 0

### [AUTO] Notification Triggers

- [ ] Star -> notification to circuit owner (type: `star`)
- [ ] Clone -> notification to circuit owner (type: `clone`)
- [ ] Invite -> notification to invitee (type: `invite`)
- [ ] Accept invite -> notification to inviter (type: `invite_accepted`)
- [ ] Collaborator adds point -> notification to owner + other collaborators (type: `point_added`)
- [ ] Collaborator deletes point -> notification to owner + other collaborators (type: `point_deleted`)
- [ ] Owner adds/deletes own point -> NO self-notification
- [ ] Starring own circuit -> NO notification
- [ ] Circuit with no collaborators -> `notify_circuit_members` sends nothing (no crash)

### Edge Cases

- [ ] **[AUTO]** User with 0 notifications — list returns `[]`, count returns `{count: 0}`
- [ ] **[AUTO]** Delete notification then check count — count decrements correctly
- [ ] **[AUTO]** Clear all then check list — returns empty
- [ ] **[AUTO]** 50+ notifications — only most recent 50 returned

---

## 9. Media

### [AUTO] CRUD

- [ ] `POST /points/{id}/media` with `{type: "photo"}` creates media record with `upload_url` + `public_url`
- [ ] `GET /points/{id}/media` returns all media for a point
- [ ] `DELETE /media/{id}` removes media record

### [AUTO] Upload Flow

- [ ] `upload_url` is a valid S3 presigned PUT URL
- [ ] Uploading to `upload_url` with `Content-Type: image/jpeg` succeeds
- [ ] After upload, `public_url` serves the image

### [AUTO] Authorization

- [ ] Cannot create media on another user's point — returns 403
- [ ] Cannot delete another user's media — returns 403

### Edge Cases

- [ ] **[AUTO]** Create media for non-existent point — returns 404
- [ ] **[MANUAL]** Upload large image (10MB+) -> frontend compresses to < 1MB before upload (why: requires browser image compression library)
- [ ] **[MANUAL]** Upload non-image file -> frontend rejects before API call (why: file type validation is browser-side)

---

## 10. Search

### [AUTO] Basic Search

- [ ] `GET /search?q=tokyo` returns matching circuits and points
- [ ] Search matches circuit titles, descriptions, tags
- [ ] Search matches point titles, notes
- [ ] Results are scoped to the authenticated user's data only
- [ ] `limit` parameter caps results (default 20, max 50)
- [ ] Empty query (< 1 char) returns 422 validation error
- [ ] Query > 200 chars returns 422

### Edge Cases

- [ ] **[AUTO]** Search with special characters (`&`, `%`, `'`, `"`)
- [ ] **[AUTO]** Search with unicode/non-Latin text
- [ ] **[AUTO]** Search that matches nothing returns `{circuits: [], points: []}`
- [ ] **[AUTO]** SQL injection attempt in query — safely handled

---

## 11. Stats

### [AUTO] User Stats

- [ ] `GET /me/stats` returns `circuits`, `points`, `stars_received`, `total_clones`, `categories`
- [ ] New user with no data returns all zeros and empty categories
- [ ] After creating circuit + points, counts update correctly
- [ ] `categories` is a map of category name -> count
- [ ] `stars_received` counts stars from other users on your circuits
- [ ] `total_clones` sums `clone_count` across all owned circuits

---

## 12. Public Profiles

### [AUTO] Profile Pages

- [ ] `GET /u/{username}` returns public profile when `profile_enabled: true`
- [ ] `GET /u/{username}` returns 404 when `profile_enabled: false`
- [ ] `GET /u/{username}` returns 404 for non-existent username
- [ ] `GET /u/{username}/circuits` returns only `public` visibility circuits
- [ ] Private and shared circuits are NOT included
- [ ] No auth required for public profile endpoints

### Edge Cases

- [ ] **[AUTO]** Username with uppercase letters — should be case-insensitive
- [ ] **[AUTO]** Username with special characters in URL — properly encoded

---

## 13. Push Notifications

### [AUTO] Subscription Management

- [ ] `GET /push/vapid-key` returns `{publicKey: "..."}` (no auth required)
- [ ] `POST /push/subscribe` with valid subscription data stores subscription
- [ ] `POST /push/unsubscribe` removes subscription
- [ ] Duplicate subscription for same endpoint — idempotent or updates

### [AUTO] Push Delivery

- [ ] When a notification is created, push is sent to all user's subscriptions
- [ ] Push includes correct title based on notification type
- [ ] Push includes notification message as body
- [ ] Invalid/expired subscription endpoints handled gracefully (no crash)

### [MANUAL] Browser Push (why: all require browser-native APIs that can't be automated)

- [ ] Clicking "Enable notifications" triggers browser permission dialog
- [ ] Granting permission registers push subscription with backend
- [ ] Receiving a push shows a native OS notification
- [ ] Clicking the push notification navigates to the relevant circuit
- [ ] Denying permission gracefully handles the rejection (no error)

---

## 14. Frontend Pages & Navigation

### [AUTO] Route Accessibility

- [ ] `/` redirects to `/dashboard` or `/login` based on auth state
- [ ] `/dashboard` loads behind AuthGuard
- [ ] `/circuits` loads behind AuthGuard
- [ ] `/circuits/[id]` loads circuit detail
- [ ] `/circuits/[id]/points/new` loads new point form
- [ ] `/circuits/[id]/points/[pointId]` loads point detail
- [ ] `/circuits/new` loads new circuit form
- [ ] `/activity` loads activity timeline
- [ ] `/notifications` loads notifications inbox
- [ ] `/settings` loads settings page
- [ ] `/search` loads search page
- [ ] `/s/[token]` loads shared circuit view (no auth required)
- [ ] `/u/[username]` loads public profile (no auth required)
- [ ] `/login` loads login/signup page
- [ ] `/world` loads world map page

### [MANUAL] Bottom Navigation (why: visual layout + animation + touch interaction)

- [ ] All 5 nav items visible: Account, Circuits, Activity, Alerts, Settings
- [ ] Settings is always the last item
- [ ] Active tab highlighted with sliding indicator animation
- [ ] Alerts badge shows unread count in red circle
- [ ] Badge shows "9+" for counts > 9
- [ ] Search button navigates to `/search`
- [ ] Nav items fit on small screens (iPhone SE, 375px) without overflow

### [MANUAL] Sheet Interactions (why: touch gesture physics + subjective UX)

- [ ] Dashboard sheet drags between collapsed/half/full snaps
- [ ] Sheet drag momentum feels natural
- [ ] Sheet content scrolls within full snap without fighting sheet drag
- [ ] Sheet handle visible and tappable

### [MANUAL] Notifications Page (why: touch gestures + animations)

- [ ] Swipe left on notification reveals X icon
- [ ] Swiping past threshold deletes notification with slide-out animation
- [ ] Swiping less than threshold snaps back
- [ ] X button clears all notifications
- [ ] Empty state shows "No notifications yet" with BellOff icon
- [ ] Push notification enable banner shown when browser permission not granted
- [ ] Push banner dismisses and stays dismissed across page refreshes (localStorage)
- [ ] Clock icon appears next to all timestamps
- [ ] Unread notifications have blue dot, read ones do not
- [ ] Opening notifications page marks all as read automatically
- [ ] Unread count badge in bottom nav updates after mark-all-read
- [ ] Pending invites section shows with Accept (check) and Decline (X) buttons
- [ ] Accepting invite shows circuit in user's circuits list
- [ ] Declining invite removes it from pending list
- [ ] Each notification type shows correct icon and color (star=amber, clone=purple, invite=blue, etc.)

### [MANUAL] Map Rendering (why: WebGL/canvas rendering, interaction with map library)

- [ ] Dashboard map renders centered on user's location
- [ ] Activity world map shows all points with colored markers
- [ ] Circuit route lines connect points in order on the map
- [ ] Map zoom controls (+/-) work
- [ ] Tapping a marker on world map shows circuit card
- [ ] Map doesn't freeze or lag on devices with 50+ markers
- [ ] Markers with photos show photo thumbnail with white border (no category color border)
- [ ] Markers without photos show category icon with colored border
- [ ] Photo marker thumbnails are circular and properly cropped (object-fit cover)
- [ ] Photo markers render on circuit detail, activity page, and shared page

---

## 15. End-to-End Flow Tests

### [AUTO] Flow 1: New User Onboarding

- [ ] Sign up with new email + password
- [ ] `GET /me` returns new user record
- [ ] Create first circuit: `POST /circuits {title: "Weekend Trip"}`
- [ ] Add first point: `POST /circuits/{id}/points {title: "Coffee Shop", lat: 11.4, lng: 76.7}`
- [ ] Get circuit with count: `GET /circuits/{id}` -> `point_count: 1`
- [ ] Stats reflect: `GET /me/stats` -> `circuits: 1, points: 1`

### [AUTO] Flow 2: Collaboration + Notifications

- [ ] User A creates circuit
- [ ] User A invites User B: `POST /circuits/{id}/collaborators {email: B, role: "editor"}`
- [ ] User B sees invite: `GET /me/invites` -> 1 pending
- [ ] User B gets notification: `GET /me/notifications` -> type `invite`
- [ ] User B accepts: `POST /me/invites/{id}/accept`
- [ ] User A gets notification: type `invite_accepted`
- [ ] User B adds point to circuit (as collaborator)
- [ ] User A gets notification: type `point_added` with point title
- [ ] User B deletes a point
- [ ] User A gets notification: type `point_deleted`

### [AUTO] Flow 3: Share + Clone

- [ ] User A creates circuit with 3 points
- [ ] User A generates share token: `POST /circuits/{id}/share`
- [ ] Anyone can view: `GET /shared/{token}` -> circuit + points with photo_url
- [ ] User B clones: `POST /shared/{token}/clone`
- [ ] User B's clone has same points but different IDs
- [ ] User B's clone has `cloned_from_token` set
- [ ] User A's circuit `clone_count` incremented
- [ ] User A gets notification: type `clone`
- [ ] Editing clone does NOT affect original (independent copy)
- [ ] Editing original does NOT affect clone
- [ ] User A cloning own circuit returns 400

### [MANUAL] Flow 3b: Share + Clone UI (why: auth redirect + browser navigation)

- [ ] Unauthenticated user opens `/s/{token}` — sees shared page with Clone + Share buttons
- [ ] Tapping Clone redirects to `/login?redirect=/s/{token}?clone=1`
- [ ] After login, auto-redirects back to shared page with `?clone=1`
- [ ] Auto-clone triggers and redirects to cloned circuit detail page
- [ ] Green "Cloned" pill shown after successful clone (if staying on page)
- [ ] Share button produces clean URL (no extra text concatenated)
- [ ] Login page `redirect` param works for signup and Google OAuth too

### [AUTO] Flow 4: Star / Unstar Cycle

- [ ] User B stars User A's circuit: `POST /circuits/{id}/star`
- [ ] Response: `star_count: 1, is_starred: true`
- [ ] User A gets notification: type `star`
- [ ] User B unstars: `DELETE /circuits/{id}/star`
- [ ] Response: `star_count: 0, is_starred: false`
- [ ] No notification sent for unstar

### [AUTO] Flow 5: Trip Organization

- [ ] Create trip: `POST /trips {title: "India 2026"}`
- [ ] Create 3 circuits
- [ ] Assign all to trip: `POST /trips/{id}/circuits/{cid}` x 3
- [ ] `GET /trips` -> `circuit_count: 3`
- [ ] Remove one circuit from trip: `DELETE /trips/{id}/circuits/{cid}`
- [ ] `GET /trips` -> `circuit_count: 2`
- [ ] Delete trip -> circuits still exist, `trip_id` is null

### [AUTO] Flow 6: Account Deletion Cascade

- [ ] Create user with circuits, points, stars, collaborations, notifications, push subscriptions
- [ ] `DELETE /me`
- [ ] All user data is cascade-deleted
- [ ] Auth session is invalidated
- [ ] Collaborations on other users' circuits are cleaned up

---

## 16. Cross-Cutting Edge Cases & Regression

### [AUTO] Input Validation

- [ ] Circuit title with `<script>alert(1)</script>` — stored safely, no XSS on render
- [ ] Point notes with SQL injection: `'; DROP TABLE points; --` — safely parameterized
- [ ] Very long inputs (10000 chars) in text fields — handled or rejected with clear error
- [ ] Empty string vs null in optional fields — consistent behavior
- [ ] Unicode in all text fields (Japanese, Arabic, emoji) — stored and returned correctly

### [AUTO] Concurrent Operations

- [ ] Two users star the same circuit simultaneously — both succeed, count = 2
- [ ] Two users clone the same circuit simultaneously — both get independent copies
- [ ] Delete circuit while someone is viewing shared link — 404 on next request

### [AUTO] Pagination & Scale

- [ ] User with 100+ circuits — `GET /circuits` returns all
- [ ] Circuit with 200+ points — `GET /circuits/{id}/points` returns all ordered
- [ ] 50+ notifications — only 50 returned (limit enforced)

### [AUTO] Error Responses

- [ ] All 404s return `{"detail": "..."}` JSON, not HTML
- [ ] All 403s return `{"detail": "Not the circuit owner"}`
- [ ] All 422s return Pydantic validation error details
- [ ] All 401s trigger frontend redirect to `/login`
- [ ] CORS headers present on all responses for allowed origins

### [MANUAL] Shared Page `/s/[token]` (why: visual layout + auth redirect + interaction)

- [ ] Offroute branding (compass icon + "Offroute" text) shows top-left on map, links to `/`
- [ ] Author name shown with icon, bolder than description text
- [ ] Clone button visible for unauthenticated users
- [ ] Tapping Clone when not logged in redirects to `/login?redirect=/s/{token}?clone=1`
- [ ] After login, auto-clones circuit and redirects to cloned circuit detail page
- [ ] After cloning, Clone button replaced by green "Cloned" pill with check icon
- [ ] "Find it in your circuits on the dashboard" helper text shown after cloning
- [ ] Cloning own circuit shows "You can't clone your own circuit" error toast
- [ ] Share button uses `navigator.share` (no `text` field — clean URL only)
- [ ] Share button falls back to clipboard copy on desktop
- [ ] Point cards show photo thumbnail when `photo_url` exists
- [ ] Point cards show category icon when no photo
- [ ] Point notes truncated to 2 lines (`line-clamp-2`)
- [ ] Page doesn't overflow horizontally (`overflow-x-hidden`)
- [ ] CTA button centered, rounded-full, not full width
- [ ] Error state shows "Looks like this trail went cold" with link back to Offroute

### [MANUAL] Circuit Cover Picker (why: visual overlay + image selection UX)

- [ ] Cover picker appears in edit circuit sheet
- [ ] Circuits with 0 photos show no cover picker section
- [ ] Circuits with 1-4 photos show inline grid of thumbnails
- [ ] Circuits with >4 photos show first 3 + "+N" button to open fullscreen overlay
- [ ] Fullscreen overlay shows all photos in 3-column grid at z-[60]
- [ ] Currently selected cover photo has checkmark/highlight
- [ ] Tapping a photo selects it as cover
- [ ] Reset button clears manual cover selection (reverts to auto-pick)
- [ ] Saving edit sheet persists `cover_media_id` to backend
- [ ] Cover change reflected on circuit card in circuits list

### [MANUAL] Activity Page Photos (why: visual rendering of thumbnails)

- [ ] Timeline tab: points with photos show circular photo thumbnail with white ring
- [ ] Timeline tab: points without photos show category icon circle with colored bg
- [ ] World map tab: bottom card points show same photo/icon logic
- [ ] Map markers on activity page show photo thumbnails when available

### [MANUAL] Dashboard Tweaks (why: visual sizing and interactions)

- [ ] Stat icons (circuits, points, stars, clones) at 60% opacity (not too faint, not too bold)
- [ ] Stat labels at 11px (readable on all devices)
- [ ] Bottom nav labels at 10px
- [ ] Travel stats button is clickable and shows "Coming soon" toast
- [ ] Travel stats text is grey (text-gray-300) indicating disabled state

### [MANUAL] Circuit Detail Dropdown (why: visual styling)

- [ ] Three-dot menu dropdown has white background (not dark blue)
- [ ] Dropdown text is dark colored for readability
- [ ] Dropdown has subtle ring/shadow (`ring-1 ring-black/5`)

### [MANUAL] Performance & UX (why: subjective perception, real device timing)

- [ ] First load after cold start < 3 seconds
- [ ] Page transitions feel smooth, no flicker
- [ ] Map doesn't freeze UI while loading tiles
- [ ] Unsplash cover images load and cache correctly in localStorage

### [MANUAL] PWA (why: requires browser install flow + OS integration)

- [ ] App installable via "Add to Home Screen"
- [ ] Installed app opens in standalone mode (no browser chrome)
- [ ] Service worker caches shell for offline access
- [ ] App icon and splash screen display correctly

### [MANUAL] Cross-Browser / Device (why: device/browser-specific rendering)

- [ ] Chrome mobile (Android) — all features work
- [ ] Safari mobile (iOS) — all features work, safe area insets correct
- [ ] Chrome desktop — responsive layout at 390px width
- [ ] Firefox — no rendering issues

---

## 17. Security

### [AUTO] Authorization Boundary Tests

- [ ] Every authenticated endpoint returns 401 without token
- [ ] Every resource-specific endpoint returns 403/404 when accessed by non-owner
- [ ] Share token endpoints work without auth but only expose permitted data
- [ ] Public profile endpoints only expose `public` visibility circuits
- [ ] `DELETE /me` requires valid auth (can't delete arbitrary accounts)

### [AUTO] Data Isolation

- [ ] User A cannot see User B's circuits via `GET /circuits`
- [ ] User A cannot see User B's notifications
- [ ] User A cannot see User B's trips
- [ ] User A cannot delete User B's notifications
- [ ] Search results are scoped to authenticated user only

---

## Previous Bug Fixes (Verified)

These were found in earlier QA passes and have been fixed:

- [x] BUG-1: Backend accepted whitespace-only circuit titles — added `field_validator`, returns 422
- [x] BUG-2: Backend accepted whitespace-only point titles — same fix
- [x] BUG-3: API_URL constant duplicated across 4 frontend files — centralized in `api.ts`
- [x] BUG-4: Auth bypass via stale localStorage session — switched `getSession()` to `getUser()` server-side validation
- [x] BUG-5: SUPABASE_URL missing from backend `.env` causing 500 on JWT verification

---

*Last updated: 2026-08-09*
*Total test cases: ~260 (automated: ~180, manual: ~80)*
