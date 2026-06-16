# Running LandHere — Cold-start guide

This guide gets the full stack running from a fresh laptop boot. Follow the steps in order.

---

## Prerequisites (one-time setup, skip if already done)

- Python 3.12 installed and on PATH
- Node.js 20+ and npm installed
- PostgreSQL running locally with a database called `land_here`
- The `land_here/.env` file present (see below)
- Expo Go installed on your phone

### Expected `land_here/.env`
```
DATABASE_URL=postgresql://postgres:<your-password>@localhost:5432/land_here
SECRET_KEY=<your-secret-key>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
```

---

## Step 1 — Check your Wi-Fi IP address

The mobile app must reach the backend over your local network. Every time you boot or switch networks, your IP may change.

Open **Command Prompt** or **PowerShell** and run:

```
ipconfig
```

Look for the **Wireless LAN adapter Wi-Fi** section and note the **IPv4 Address**, e.g.:
```
IPv4 Address. . . . . . . . . . . : 192.168.1.42
```

If this is different from what is in `mobile/.env`, update it now (Step 2).

---

## Step 2 — Update the mobile API URL (if IP changed)

Open `mobile/.env` in any text editor and set `EXPO_PUBLIC_API_URL` to your current Wi-Fi IPv4:

```
EXPO_PUBLIC_API_URL=http://192.168.1.42:8000
EXPO_PUBLIC_UNSPLASH_KEY=
```

Save the file. The change takes effect when you start Expo in the next step.

---

## Step 3 — Start the backend

Open a terminal in the `land_here` root (the folder that contains `app/`, `alembic/`, `requirements.txt`).

**Activate the virtual environment:**

```bash
# Windows PowerShell
.venv\Scripts\Activate.ps1

# Windows Command Prompt
.venv\Scripts\activate.bat

# macOS / Linux
source .venv/bin/activate
```

**Start the server:**

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

You should see output like:
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

**Verify it is running** — open a browser on your laptop and visit:
```
http://localhost:8000/
```
You should see: `{"status":"ok","service":"LandHere API"}`

Also verify it is reachable from your phone's perspective by visiting:
```
http://<your-wifi-ip>:8000/
```
in the phone's browser. If this fails, check Windows Firewall and ensure port 8000 is allowed on private networks.

---

## Step 4 — Seed the database (first run only)

If this is the first time running the app, populate the database with countries and the IN→US content:

```bash
# From the land_here root, with .venv active
python -m app.core.seed
```

Expected output:
```
[seed] Inserted 22 countries.
[seed] Inserted 15 IN->US InfoSteps.
[seed] Done.
```

On subsequent runs the seed script is safe to run again — it skips already-seeded data.

---

## Step 5 — Start the Expo dev server

Open a **second terminal** in the `mobile/` folder.

```bash
npx expo start --clear
```

The `--clear` flag clears Metro's cache, which prevents stale-bundle issues after pulling new code or changing `.env`.

You should see a QR code in the terminal, and the Metro bundler will start.

---

## Step 6 — Open the app on your phone

1. **Close Expo Go completely** on your phone (swipe it away from the app switcher). This ensures a fresh connection.
2. Open Expo Go.
3. **Scan the QR code** shown in your terminal using Expo Go's built-in scanner.

The app will bundle and launch. The first bundle can take 30–60 seconds.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| App shows "Network Error" or can't fetch data | Check `EXPO_PUBLIC_API_URL` in `mobile/.env` matches your current Wi-Fi IP. Re-run `npx expo start --clear` after saving. |
| Expo QR code scan opens the wrong app / old version | Force-close Expo Go and rescan. |
| Backend starts but shows DB connection error | Check PostgreSQL is running and `DATABASE_URL` in `land_here/.env` is correct. |
| `ModuleNotFoundError` on backend start | Virtual environment is not activated. Run the activate command in Step 3 again. |
| Port 8000 refused on phone browser | Allow port 8000 in Windows Firewall for private networks. |
| `uvicorn: command not found` | Virtual environment is not activated. |

---

## Daily workflow (after first setup)

1. Run `ipconfig`, check if Wi-Fi IP changed, update `mobile/.env` if needed.
2. Terminal 1 — `land_here/` with `.venv` active: `uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`
3. Terminal 2 — `mobile/`: `npx expo start --clear`
4. Close Expo Go on phone, rescan QR.
