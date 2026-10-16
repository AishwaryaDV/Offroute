"""Checks two things: (1) deleting media notifies collaborators normally,
and (2) deleting the circuit itself still notifies collaborators even
though the notification can't be linked to the (about-to-not-exist)
circuit_id — it has ondelete=CASCADE, so a linked notification would
vanish the instant the circuit does."""

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


async def make_user(c, label):
    admin = {"apikey": SERVICE_ROLE, "Authorization": f"Bearer {SERVICE_ROLE}"}
    email = f"{label}-{uuid.uuid4().hex[:8]}@offroute-qa.dev"
    uid = (await c.post(f"{SUPABASE_URL}/auth/v1/admin/users", headers=admin,
                        json={"email": email, "password": "Pw123456!", "email_confirm": True})).json()["id"]
    token = (await c.post(f"{SUPABASE_URL}/auth/v1/token?grant_type=password", headers={"apikey": ANON},
                          json={"email": email, "password": "Pw123456!"})).json()["access_token"]
    return {"id": uid, "email": email, "auth": {"Authorization": f"Bearer {token}"}}


async def main():
    async with httpx.AsyncClient(timeout=60) as c:
        admin = {"apikey": SERVICE_ROLE, "Authorization": f"Bearer {SERVICE_ROLE}"}
        a = await make_user(c, "cdel-a")
        b = await make_user(c, "cdel-b")
        try:
            await c.get(f"{BACKEND}/me", headers=a["auth"])
            await c.get(f"{BACKEND}/me", headers=b["auth"])

            cid = (await c.post(f"{BACKEND}/circuits", headers=a["auth"], json={"title": "Circuit Delete Test"})).json()["id"]
            await c.post(f"{BACKEND}/circuits/{cid}/collaborators", headers=a["auth"], json={"email": b["email"], "role": "editor"})
            invites = (await c.get(f"{BACKEND}/me/invites", headers=b["auth"])).json()
            invite_id = next(i["id"] for i in invites if i["circuit_id"] == cid)
            await c.post(f"{BACKEND}/me/invites/{invite_id}/accept", headers=b["auth"])

            pid = (await c.post(f"{BACKEND}/circuits/{cid}/points", headers=a["auth"],
                                json={"title": "Photo point", "latitude": 1, "longitude": 1})).json()["id"]
            media = (await c.post(f"{BACKEND}/points/{pid}/media", headers=a["auth"],
                                  json={"point_id": pid, "type": "photo"})).json()
            await c.delete(f"{BACKEND}/media/{media['id']}", headers=a["auth"])

            notifs = (await c.get(f"{BACKEND}/me/notifications", headers=b["auth"])).json()
            media_notif = next((n for n in notifs if n["type"] == "media_deleted"), None)
            print(f"media_deleted: {'YES circuit_id=' + str(media_notif['circuit_id']) if media_notif else 'MISSING'}")

            del_status = (await c.delete(f"{BACKEND}/circuits/{cid}", headers=a["auth"])).status_code
            print("circuit delete status:", del_status)

            notifs = (await c.get(f"{BACKEND}/me/notifications", headers=b["auth"])).json()
            circuit_notif = next((n for n in notifs if n["type"] == "circuit_deleted"), None)
            print(f"circuit_deleted: {'YES circuit_id=' + str(circuit_notif['circuit_id']) if circuit_notif else 'MISSING'} (expect None — must survive the cascade)")
            print(f"media_deleted notification after circuit delete: {'still present (unexpected)' if any(n['type'] == 'media_deleted' for n in notifs) else 'gone (expected — cascaded with the circuit)'}")
        finally:
            for u in (a, b):
                await c.delete(f"{BACKEND}/me", headers=u["auth"])
                await c.delete(f"{SUPABASE_URL}/auth/v1/admin/users/{u['id']}", headers=admin)
            print("cleaned up")


if __name__ == "__main__":
    asyncio.run(main())
