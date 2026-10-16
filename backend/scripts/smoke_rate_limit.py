"""Fire cap+3 messages with a short stagger between *launches* (not waiting
for each response, like a runaway retry loop would) and confirm the extras
get 429. Neither fully-sequential (each turn takes several seconds for the
model round-trip, so waiting for each response means the earliest ones age
out of the 60s window before the cap is ever hit) nor fully-concurrent
(asyncio.gather fires requests close enough together that every check reads
the pre-burst count — a TOCTOU race) exercises the real risk, which is code
that resends without backoff. Cleans up its test user/circuit even on
failure."""

import asyncio
import pathlib
import re
import sys
import uuid

import httpx

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
from app.config import get_settings  # noqa: E402

BACKEND = "http://localhost:8001"


def _env(path, key):
    m = re.search(rf"^{key}=(.+)$", pathlib.Path(path).read_text(), re.M)
    return m.group(1).strip() if m else ""


SUPABASE_URL = _env(".env", "SUPABASE_URL")
SERVICE_ROLE = _env(".env", "SUPABASE_SERVICE_ROLE_KEY")
ANON = _env("../frontend/.env.local", "NEXT_PUBLIC_SUPABASE_ANON_KEY")
CAP = get_settings().assistant_rate_limit_per_minute


async def main() -> None:
    async with httpx.AsyncClient(timeout=120) as c:
        admin = {"apikey": SERVICE_ROLE, "Authorization": f"Bearer {SERVICE_ROLE}"}
        email = f"ratelimit-{uuid.uuid4().hex[:8]}@offroute-qa.dev"
        uid = (await c.post(f"{SUPABASE_URL}/auth/v1/admin/users", headers=admin,
                            json={"email": email, "password": "Pw123456!", "email_confirm": True})).json()["id"]
        token = (await c.post(f"{SUPABASE_URL}/auth/v1/token?grant_type=password", headers={"apikey": ANON},
                              json={"email": email, "password": "Pw123456!"})).json()["access_token"]
        auth = {"Authorization": f"Bearer {token}"}

        try:
            await c.get(f"{BACKEND}/me", headers=auth)
            cid = (await c.post(f"{BACKEND}/circuits", headers=auth, json={"title": "Rate Limit Test"})).json()["id"]

            async def send(i: int) -> tuple[int, int]:
                r = await c.post(f"{BACKEND}/circuits/{cid}/chat", headers=auth,
                                  json={"message": f"how many points are in this circuit? (msg {i})"})
                return i, r.status_code

            tasks = []
            for i in range(1, CAP + 10):
                tasks.append(asyncio.create_task(send(i)))
                await asyncio.sleep(0.1)  # stagger launches, don't wait for responses

            results = await asyncio.gather(*tasks)
            for i, code in sorted(results):
                print(f"msg {i}: {code}")

            ok = sum(1 for _, code in results if code == 200)
            limited = sum(1 for _, code in results if code == 429)
            print(f"cap={CAP} -> {ok} succeeded, {limited} rate-limited")

            await c.delete(f"{BACKEND}/circuits/{cid}", headers=auth)
        finally:
            await c.delete(f"{SUPABASE_URL}/auth/v1/admin/users/{uid}", headers=admin)
            print("cleaned up ✓")


if __name__ == "__main__":
    asyncio.run(main())
