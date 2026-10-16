"""Fire more messages than the per-minute cap allows and confirm the 7th gets 429."""

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
CAP = int(_env(".env", "ASSISTANT_RATE_LIMIT_PER_MINUTE") or 20)


async def main() -> None:
    async with httpx.AsyncClient(timeout=120) as c:
        admin = {"apikey": SERVICE_ROLE, "Authorization": f"Bearer {SERVICE_ROLE}"}
        email = f"ratelimit-{uuid.uuid4().hex[:8]}@offroute-qa.dev"
        uid = (await c.post(f"{SUPABASE_URL}/auth/v1/admin/users", headers=admin,
                            json={"email": email, "password": "Pw123456!", "email_confirm": True})).json()["id"]
        token = (await c.post(f"{SUPABASE_URL}/auth/v1/token?grant_type=password", headers={"apikey": ANON},
                              json={"email": email, "password": "Pw123456!"})).json()["access_token"]
        auth = {"Authorization": f"Bearer {token}"}

        await c.get(f"{BACKEND}/me", headers=auth)
        cid = (await c.post(f"{BACKEND}/circuits", headers=auth, json={"title": "Rate Limit Test"})).json()["id"]

        for i in range(1, CAP + 3):
            r = await c.post(f"{BACKEND}/circuits/{cid}/chat", headers=auth,
                              json={"message": f"how many points are in this circuit? (msg {i})"})
            print(f"msg {i}: {r.status_code}")

        await c.delete(f"{BACKEND}/circuits/{cid}", headers=auth)
        await c.delete(f"{SUPABASE_URL}/auth/v1/admin/users/{uid}", headers=admin)
        print("cleaned up ✓")


if __name__ == "__main__":
    asyncio.run(main())
