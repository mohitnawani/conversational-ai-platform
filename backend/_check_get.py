from app import create_app
import re

app = create_app()
client = app.test_client()

r = client.post("/api/auth/register", json={"name": "Probe", "email": "probe@ex.com", "password": "ProbePass123"})
r = client.post("/api/auth/login", json={"email": "probe@ex.com", "password": "ProbePass123"})
cookies = r.headers.getlist("Set-Cookie")
csrf = next((re.search(r"csrf_access_token=([^;]+)", c).group(1) for c in cookies if "csrf_access_token=" in c), None)
print("LOGGED IN. csrf:", bool(csrf))

def post(path, data):
    return client.post(path, json=data, headers={"X-CSRF-TOKEN": csrf})

def post_msg(path, data):
    return client.post(path, json=data, headers={"X-CSRF-TOKEN": csrf})

r = post("/api/conversations", {"title": "refresh probe chat"})
print("CREATE:", r.status_code)
conv_id = r.get_json()["id"] if r.status_code == 201 else None

if conv_id:
    for text in ["Hello there", "Tell me about KG triples"]:
        rr = client.post(
            f"/api/conversations/{conv_id}/message",
            json={"message": text},
            headers={"X-CSRF-TOKEN": csrf},
        )
        print("MSG:", rr.status_code)
    g = client.get(f"/api/conversations/{conv_id}")
    j = g.get_json()
    msgs = (j or {}).get("messages", [])
    print("GET CONV:", g.status_code, "msgs:", len(msgs))
    for m in msgs[:3]:
        print("  -", m["role"], "|", m["content"][:40])