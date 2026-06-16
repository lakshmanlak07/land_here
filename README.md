# LandHere

**LandHere** is an information-first mobile companion for international students. It guides students through every step of relocating to study abroad — from accepting an admission offer, through the visa process and departure prep, to settling in after arrival — with plain-English explanations and direct links to official government sources.

The app deliberately does not give legal or immigration advice. Every piece of information is tied to an official source URL and an `is_verified` flag so the team can track what has been human-checked.

---

## Tech stack

| Layer | Technology |
|---|---|
| Mobile | Expo (SDK 54) + React Native 0.81 + TypeScript |
| Navigation | Expo Router v6 (file-system routing) |
| State / data-fetching | Zustand (auth), TanStack Query v5 (server state) |
| Backend | Python 3.12 + FastAPI |
| ORM / migrations | SQLAlchemy 2 + Alembic |
| Database | PostgreSQL (local dev: `land_here` db) |
| Auth | JWT (python-jose) + bcrypt (passlib) |
| HTTP client | Axios (mobile → backend) |

---

## Folder structure

```
land_here/               ← repo root
├── app/                 ← FastAPI application
│   ├── main.py          ← app factory, middleware, router registration
│   ├── core/
│   │   ├── config.py    ← pydantic-settings (reads .env)
│   │   ├── database.py  ← SQLAlchemy engine + SessionLocal + Base
│   │   ├── security.py  ← JWT encode/decode, bcrypt hash/verify
│   │   ├── deps.py      ← FastAPI dependency: get_current_user
│   │   ├── seed.py      ← one-time seed: countries + IN→US InfoSteps
│   │   └── seed_facts.py← standalone fun-facts data (no DB calls)
│   ├── models/          ← SQLAlchemy ORM models
│   │   ├── country.py
│   │   ├── user.py
│   │   ├── info_step.py
│   │   └── country_guide.py
│   ├── schemas/         ← Pydantic request/response models
│   │   ├── country.py
│   │   ├── user.py
│   │   ├── info_step.py
│   │   └── country_guide.py
│   └── routes/          ← FastAPI routers
│       ├── auth.py      ← /auth/register, /auth/login, /auth/me
│       ├── countries.py ← /countries, /countries/destinations, /countries/origins
│       ├── info.py      ← /info/journey, /info/corridors, /info/phases
│       └── guides.py    ← /guides/{country_code}
├── alembic/             ← database migration scripts
├── tests/               ← pytest test suite (SQLite in-memory, no real DB)
├── mobile/              ← Expo React Native app
│   ├── app/             ← Expo Router screens (file-system routes)
│   │   ├── (auth)/      ← login.tsx, register.tsx
│   │   ├── (tabs)/      ← index.tsx, journey.tsx, explore.tsx, profile.tsx
│   │   └── country/     ← [code].tsx (country detail)
│   ├── components/      ← shared UI components
│   ├── constants/       ← funFacts.ts and other static data
│   ├── context/         ← ThemeContext
│   ├── lib/             ← api.ts (axios), store.ts (zustand), types.ts
│   └── content/         ← draft city guides and corridor content (not in DB)
├── .env                 ← backend env vars (DATABASE_URL, SECRET_KEY)
├── requirements.txt     ← Python runtime dependencies
├── requirements-dev.txt ← Python dev/test dependencies (pytest, httpx)
└── alembic.ini
```

---

## What is built

**Backend**
- Full CRUD-ready data model: `Country`, `User`, `InfoStep`, `CountryGuide`
- REST API: country list/filter, journey info-step retrieval, country guides, auth
- One seeded corridor: India → United States (15 steps across 4 phases)
- 22 countries seeded (16 destinations, 6 origin-only)
- JWT authentication with `is_verified` flag on all content

**Mobile**
- Auth flows: register (with origin + destination country selection), login, persistent JWT in SecureStore
- Home screen: journey progress card, fun-fact card, destination browser
- Journey screen: phased step list with read/unread tracking (Zustand + AsyncStorage)
- Explore screen: destination country list
- Country detail screen: country info + city image
- Profile screen: user details, country preferences, logout
- Fun facts: 6–8 per destination country, surfaced on home screen

**Not yet built**
- Corridors beyond IN→US (content files drafted in `mobile/content/drafts/`)
- Country guides in the database (draft markdown files exist in `mobile/content/`)
- Push notifications, search, community features
