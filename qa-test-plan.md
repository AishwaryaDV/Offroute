# Offroute QA — Bug & Issue Log

Tested 2026-07-29 against local dev (backend :8000, frontend :3000).

---

## Test Results Summary

| Area | Status | Notes |
|------|--------|-------|
| Auth (email/password) | PASS | Login, JWT, auto-provision |
| Auth (Google OAuth) | PASS | Identity auto-linking verified |
| Circuit CRUD | PASS | Create, read, update, delete |
| Point CRUD | PASS | Create, update, delete, reorder |
| Photo uploads (S3) | PASS | Pre-signed URL, upload 200, public URL, delete |
| Media limit (9/point) | PASS | Backend enforces MAX_PHOTOS_PER_POINT |
| Share circuit | PASS | Token gen, public access no-auth |
| Clone flow | PASS | Endpoint responds (full test needs 2 users) |
| Star/unstar | PASS | Count increment/decrement correct |
| Collaborator invites | PASS | Endpoint responds (full test needs 2 users) |
| Search | PASS | Returns circuits + points |
| World map aggregate | PASS | All points with circuit context |
| Stats | PASS | Correct counts + categories |
| Notifications | PASS | Endpoint responds |
| Trips | PASS | CRUD works |
| Push (VAPID) | PASS | Key endpoint responds |
| All frontend routes | PASS | 12+ routes return 200 |
| TypeScript | PASS | `tsc --noEmit` zero errors |
| No debug code | PASS | No console.log, no TODO/FIXME |
| Unauthorized access | PASS | 401 without token |
| Invalid IDs | PASS | 404 for nonexistent resources |
| No hardcoded secrets | PASS | All via env vars |

---

## Bugs Found

### BUG-1: Backend accepts whitespace-only circuit titles
- **Severity**: Low (frontend validates, but API is unprotected)
- **File**: `backend/app/schemas/circuit.py` — `CircuitCreate.title` has `min_length=1` but no strip validation
- **Repro**: `POST /circuits {"title": "   "}` returns 201 with title `"   "`
- **Fix**: Add Pydantic `field_validator` to strip and reject empty-after-strip

### BUG-2: Backend accepts whitespace-only point titles
- **Severity**: Low (frontend validates, but API is unprotected)
- **File**: `backend/app/schemas/point.py` — `PointCreate.title` same issue
- **Repro**: `POST /circuits/{id}/points {"title": "   ", ...}` returns 201
- **Fix**: Same strip validator

### BUG-3: API_URL constant duplicated across 4 frontend files
- **Severity**: Low (not a bug, maintenance smell)
- **Files**: `frontend/src/lib/api.ts`, `push.ts`, `profiles.ts`, `circuits.ts`
- **Each has**: `const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"`
- **Fix**: Export once from `api.ts`, import in others

---

## Pending (User-Side)

- [ ] UI fixes document from user (visual polish, spacing, color tweaks)
- [ ] Mobile device testing (iOS Safari, Android Chrome)
- [ ] Production deployment config (Vercel env vars, Fly.io)
