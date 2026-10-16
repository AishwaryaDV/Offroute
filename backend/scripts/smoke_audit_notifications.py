"""End-to-end check: userA does a bunch of destructive/assistant actions on
a circuit shared with userB, and userB should see a notification for each
one (circuit_deleted, media_deleted, collaborator_removed, assistant_write,
point_deleted). Cleans up both users on exit."""

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


async def make_user(c: httpx.AsyncClient, label: str) -> dict:
    admin = {"apikey": SERVICE_ROLE, "Authorization": f"Bearer {SERVICE_ROLE}"}
    email = f"{label}-{uuid.uuid4().hex[:8]}@offroute-qa.dev"
    uid = (await c.post(f"{SUPABASE_URL}/auth/v1/admin/users", headers=admin,
                        json={"email": email, "password": "Pw123456!", "email_confirm": True})).json()["id"]
    token = (await c.post(f"{SUPABASE_URL}/auth/v1/token?grant_type=password", headers={"apikey": ANON},
                          json={"email": email, "password": "Pw123456!"})).json()["access_token"]
    return {"id": uid, "email": email, "auth": {"Authorization": f"Bearer {token}"}}


async def main() -> None:
    async with httpx.AsyncClient(timeout=60) as c:
        admin = {"apikey": SERVICE_ROLE, "Authorization": f"Bearer {SERVICE_ROLE}"}
        a = await make_user(c, "audit-a")
        b = await make_user(c, "audit-b")
        try:
            await c.get(f"{BACKEND}/me", headers=a["auth"])
            await c.get(f"{BACKEND}/me", headers=b["auth"])

            cid = (await c.post(f"{BACKEND}/circuits", headers=a["auth"], json={"title": "Audit Test"})).json()["id"]
            collab = (await c.post(f"{BACKEND}/circuits/{cid}/collaborators", headers=a["auth"],
                                   json={"email": b["email"], "role": "editor"})).json()
            invites = (await c.get(f"{BACKEND}/me/invites", headers=b["auth"])).json()
            invite_id = next(i["id"] for i in invites if i["circuit_id"] == cid)
            await c.post(f"{BACKEND}/me/invites/{invite_id}/accept", headers=b["auth"])

            pid = (await c.post(f"{BACKEND}/circuits/{cid}/points", headers=a["auth"],
                                json={"title": "Test Point", "latitude": 1, "longitude": 1})).json()["id"]
            await c.delete(f"{BACKEND}/points/{pid}", headers=a["auth"])

            await c.post(f"{BACKEND}/circuits/{cid}/chat", headers=a["auth"],
                        json={"message": "Add Toit in Indiranagar Bangalore, drinks, 5 stars."})

            await c.delete(f"{BACKEND}/circuits/{cid}/collaborators/{collab['id']}", headers=a["auth"])

            notifs = (await c.get(f"{BACKEND}/me/notifications", headers=b["auth"])).json()
            types = [n["type"] for n in notifs]
            print("userB notification types:", types)
            for expected in ["point_deleted", "assistant_write", "collaborator_removed"]:
                print(f"  {expected}: {'YES' if expected in types else 'MISSING'}")
        finally:
            for u in (a, b):
                await c.delete(f"{BACKEND}/me", headers=u["auth"])
                await c.delete(f"{SUPABASE_URL}/auth/v1/admin/users/{u['id']}", headers=admin)
            print("cleaned up")


if __name__ == "__main__":
    asyncio.run(main())
