"""Live API smoke test. Usage: python scripts/smoke_api.py [base_url]
Creates a throwaway account, exercises the launch flows, deletes the account."""
import sys, time, uuid
import httpx

B = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000"
for _ in range(30):
    try:
        httpx.get(B + "/health/live", timeout=2); break
    except Exception:
        time.sleep(1)
c = httpx.Client(base_url=B, timeout=20)
res = []
def R(name, ok, detail=""): res.append((name, "PASS" if ok else "FAIL", detail))

R("health/live", c.get("/health/live").status_code == 200)
R("health/ready", c.get("/health/ready").status_code == 200)
email = f"smoke-{uuid.uuid4().hex[:8]}@example.com"; pw = "smoke-pass-123"
r = c.post("/auth/register", json={"email": email, "password": pw, "origin_country_code": "IN", "destination_country_code": "US"})
R("register", r.status_code == 201, r.status_code)
t = c.post("/auth/login", json={"email": email, "password": pw}).json()
H = {"Authorization": "Bearer " + t["access_token"]}
R("login wrong password 401", c.post("/auth/login", json={"email": email, "password": "wrong-pass-1"}).status_code == 401)
R("patch profile", c.patch("/auth/me", headers=H, json={"stage": "accepted", "confidence": 6}).status_code == 200)
R("patch unknown country 422", c.patch("/auth/me", headers=H, json={"destination_country_code": "ZZ"}).status_code == 422)
for dest in ("US", "UK", "CA"):
    j = c.get("/info/journey", params={"origin": "IN", "destination": dest}, headers=H).json()
    n = sum(len(p["steps"]) for p in j["phases"])
    R(f"journey IN->{dest} without purchase", n > 0 and j["locked_phases"] == [], f"{n} steps")
r = c.get("/universities", params={"limit": 200}, headers=H)
total = int(r.headers.get("X-Total-Count", "0"))
rows = r.json() + c.get("/universities", params={"limit": 200, "offset": 200}, headers=H).json()
R("rankings full list without purchase", len(rows) == total and total > 0, f"total={total}")
if rows:
    R("university detail without purchase", c.get(f"/universities/{rows[-1]['id']}", headers=H).status_code == 200)
R("purchases disabled (404)", c.get("/purchases/entitlements", headers=H).status_code == 404)
t2 = c.post("/auth/refresh", json={"refresh_token": t["refresh_token"]})
R("refresh rotates", t2.status_code == 200)
R("refresh replay rejected", c.post("/auth/refresh", json={"refresh_token": t["refresh_token"]}).status_code == 401)
R("forgot (real account) 202", c.post("/auth/password/forgot", json={"email": email}).status_code == 202)
R("forgot (unknown) 202 same body", c.post("/auth/password/forgot", json={"email": "nobody-" + email}).json()
  == {"detail": "If an account exists for that email, a reset link is on its way."})
R("reset with bad token 400", c.post("/auth/password/reset", json={"token": "x" * 43, "new_password": "whatever-123"}).status_code == 400)
t3 = c.post("/auth/login", json={"email": email, "password": pw}).json()
R("logout 204", c.post("/auth/logout", json={"refresh_token": t3["refresh_token"]}).status_code == 204)
R("refresh after logout 401", c.post("/auth/refresh", json={"refresh_token": t3["refresh_token"]}).status_code == 401)
t4 = c.post("/auth/login", json={"email": email, "password": pw}).json(); H4 = {"Authorization": "Bearer " + t4["access_token"]}
R("delete account 204", c.request("DELETE", "/account", headers=H4, json={"password": pw}).status_code == 204)
R("deleted: token rejected", c.get("/auth/me", headers=H4).status_code == 401)
R("deleted: login fails", c.post("/auth/login", json={"email": email, "password": pw}).status_code == 401)
for n, s, d in res:
    print(f"{s:4} {n} {d}")
print(f"\n{sum(s == 'PASS' for _, s, _ in res)}/{len(res)} passed")
sys.exit(0 if all(s == "PASS" for _, s, _ in res) else 1)
