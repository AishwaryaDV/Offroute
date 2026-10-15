"""End-to-end smoke of POST /circuits/{id}/chat through the real HTTP stack:
admin-create a Supabase user -> sign in -> create a circuit + points via the API
-> one chat call -> clean up. Run from backend/ with the server on :8001."""

import asyncio
import pathlib
import re
import uuid

import httpx

BACKEND = "http://localhost:8001"


def _env(path: str, key: str) -> str:
    text = pathlib.Path(path).read_text()
    m = re.search(rf"^{key}=(.+)$", text, re.M)
    return m.group(1).strip() if m else ""


SUPABASE_URL = _env("app/../.env", "SUPABASE_URL")
SERVICE_ROLE = _env(".env", "SUPABASE_SERVICE_ROLE_KEY")
ANON = _env("../frontend/.env.local", "NEXT_PUBLIC_SUPABASE_ANON_KEY")
EMAIL = f"chat-smoke-{uuid.uuid4().hex[:8]}@offroute-qa.dev"
PASSWORD = "ChatSmoke123!"


async def main() -> None:
    async with httpx.AsyncClient(timeout=90) as c:
        # 1. provision + sign in
        r = await c.post(
            f"{SUPABASE_URL}/auth/v1/admin/users",
            headers={"apikey": SERVICE_ROLE, "Authorization": f"Bearer {SERVICE_ROLE}"},
            json={"email": EMAIL, "password": PASSWORD, "email_confirm": True},
        )
        r.raise_for_status()
        user_id = r.json()["id"]
        r = await c.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            headers={"apikey": ANON}, json={"email": EMAIL, "password": PASSWORD},
        )
        token = r.json()["access_token"]
        auth = {"Authorization": f"Bearer {token}"}

        # 2. seed a circuit + points via the API
        await c.get(f"{BACKEND}/me", headers=auth)  # sync the user row
        circ = (await c.post(f"{BACKEND}/circuits", headers=auth, json={"title": "Chat Endpoint Circuit"})).json()
        cid = circ["id"]
        for title, cat, rating, lat, lng in [
            ("Toit", "drink", 5, 12.97, 77.64),
            ("Cubbon Park", "nature", 5, 12.976, 77.59),
            ("Coffee Shop", "food", 4, 12.98, 77.63),
        ]:
            await c.post(f"{BACKEND}/circuits/{cid}/points", headers=auth,
                         json={"title": title, "category": cat, "rating": rating, "latitude": lat, "longitude": lng})

        # 3. the chat call
        resp = await c.post(
            f"{BACKEND}/circuits/{cid}/chat", headers=auth,
            json={"message": "How many points are in this circuit, and which are 5 stars?", "timezone": "Asia/Kolkata"},
        )
        print("status:", resp.status_code)
        data = resp.json()
        print("model:", data.get("model"))
        print("steps:", [(s["tool"], s["is_error"]) for s in data.get("steps", [])])
        print("reply:", data.get("reply"))
        print("error:", data.get("error"))

        # 4. cleanup
        await c.delete(f"{BACKEND}/me", headers=auth)
        await c.delete(f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}",
                       headers={"apikey": SERVICE_ROLE, "Authorization": f"Bearer {SERVICE_ROLE}"})
        print("cleaned up ✓")


if __name__ == "__main__":
    asyncio.run(main())
