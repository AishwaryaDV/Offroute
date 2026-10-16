"""Model-driven write via the real endpoint: 'add Toit...' should resolve the
place, add the point, set writes=true; then undo removes it."""

import asyncio
import pathlib
import re
import uuid

import httpx

BACKEND = "http://localhost:8001"


def _env(path, key):
    m = re.search(rf"^{key}=(.+)$", pathlib.Path(path).read_text(), re.M)
    return m.group(1).strip() if m else ""


SUPABASE_URL = _env(".env", "SUPABASE_URL")
SERVICE_ROLE = _env(".env", "SUPABASE_SERVICE_ROLE_KEY")
ANON = _env("../frontend/.env.local", "NEXT_PUBLIC_SUPABASE_ANON_KEY")


async def main() -> None:
    async with httpx.AsyncClient(timeout=120) as c:
        admin = {"apikey": SERVICE_ROLE, "Authorization": f"Bearer {SERVICE_ROLE}"}
        email = f"chatwrite-{uuid.uuid4().hex[:8]}@offroute-qa.dev"
        uid = (await c.post(f"{SUPABASE_URL}/auth/v1/admin/users", headers=admin,
                            json={"email": email, "password": "Pw123456!", "email_confirm": True})).json()["id"]
        token = (await c.post(f"{SUPABASE_URL}/auth/v1/token?grant_type=password", headers={"apikey": ANON},
                              json={"email": email, "password": "Pw123456!"})).json()["access_token"]
        auth = {"Authorization": f"Bearer {token}"}

        await c.get(f"{BACKEND}/me", headers=auth)
        cid = (await c.post(f"{BACKEND}/circuits", headers=auth, json={"title": "Bangalore Weekend"})).json()["id"]

        r = (await c.post(f"{BACKEND}/circuits/{cid}/chat", headers=auth, json={
            "message": "Add Toit in Indiranagar Bangalore to this circuit — it's a drinks spot, 5 stars.",
        })).json()
        print("model:", r.get("model"))
        print("reply:", r.get("reply"))
        print("steps:", [(s["tool"], s["is_error"]) for s in r.get("steps", [])])
        print("writes:", r.get("writes"))

        pts = (await c.get(f"{BACKEND}/circuits/{cid}/points", headers=auth)).json()
        print("points after add:", [(p["title"], p["category"], p["rating"]) for p in pts])

        undo = (await c.post(f"{BACKEND}/circuits/{cid}/chat/undo", headers=auth)).json()
        pts2 = (await c.get(f"{BACKEND}/circuits/{cid}/points", headers=auth)).json()
        print("undo:", undo, "| points after undo:", len(pts2))

        await c.delete(f"{BACKEND}/me", headers=auth)
        await c.delete(f"{SUPABASE_URL}/auth/v1/admin/users/{uid}", headers=admin)
        print("cleaned up ✓")


if __name__ == "__main__":
    asyncio.run(main())
