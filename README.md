# 🎬 Cinetrack — Movies & Series Tracker

A production-ready full-stack app to track movies and TV series.
Rate, review, analyse your watch history — and deploy it yourself.

---

## Tech Stack

| Layer         | Technology                                     |
|---------------|------------------------------------------------|
| Backend       | Go 1.22 · Gin · sqlx · JWT (HS256) · bcrypt   |
| Frontend      | React 18 · Vite · Tailwind CSS · Recharts      |
| Database      | PostgreSQL 16 (persistent volume)              |
| Cache         | Redis 7 (session cache, graceful fallback)     |
| Container     | Docker (multi-stage, scratch/alpine images)    |
| Orchestration | Kubernetes + Helm 3                            |
| CI/CD         | GitLab CI/CD                                   |

---

## ── OPTION 1: Run locally with Docker Compose ────────────────────────────────

### Prerequisites
- Docker Desktop or Docker Engine + Compose v2

### Steps

```bash
# 1. Clone
git clone https://gitlab.com/YOUR_USERNAME/cinetrack.git
cd cinetrack

# 2. Copy env file and optionally add your TMDB key
cp .env.example .env
# Edit .env — at minimum set JWT_SECRET to any 32+ char string

# 3. Start everything
docker compose up --build

# 4. Open
#   Frontend  → http://localhost:3000
#   API       → http://localhost:8080
#   Health    → http://localhost:8080/health
```

To stop: `docker compose down`
To wipe DB too: `docker compose down -v`

---

## ── OPTION 2: Deploy via GitLab CI/CD to Kubernetes ─────────────────────────

### Step 1 — Push code to GitLab

```bash
git remote add origin https://gitlab.com/YOUR_USERNAME/cinetrack.git
git push -u origin main
```

### Step 2 — Set CI/CD Variables in GitLab

Go to **GitLab → Your project → Settings → CI/CD → Variables** and add:

| Variable          | Value                                  | Protected | Masked |
|-------------------|----------------------------------------|-----------|--------|
| `PROD_DATABASE_URL` | `postgres://postgres:PASS@host:5432/movietracker?sslmode=disable` | ✅ | ✅ |
| `PROD_JWT_SECRET`   | Random 32+ char string                | ✅ | ✅ |
| `PROD_TMDB_KEY`     | Your TMDB API key (optional)          | ✅ | ✅ |
| `KUBE_CONFIG`       | `cat ~/.kube/config \| base64`         | ✅ | ✅ |
| `DEPLOY_HOST`       | `cinetrack.yourdomain.com`            | ❌ | ❌ |

### Step 3 — Pipeline runs automatically on push

The pipeline has 4 stages:

```
test  →  build  →  push  →  deploy
```

| Stage    | What happens                                            |
|----------|---------------------------------------------------------|
| `test`   | Go tests + frontend build check                        |
| `build`  | Docker images built with layer caching                 |
| `push`   | Images pushed to GitLab Container Registry             |
| `deploy` | `helm upgrade` to your K8s cluster (staging auto, production manual) |

### Step 4 — Apply K8s base manifests (first time only)

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/service.yaml

# Fill in real values in k8s/ingress.yaml first, then:
kubectl apply -f k8s/ingress.yaml
kubectl apply -f k8s/deployment.yaml
```

Or use Helm directly:

```bash
helm upgrade --install cinetrack ./helm \
  --namespace cinetrack \
  --create-namespace \
  --set backend.secrets.DATABASE_URL="postgres://..." \
  --set backend.secrets.JWT_SECRET="your-32-char-secret" \
  --set ingress.host="cinetrack.yourdomain.com"
```

---

## ── OPTION 3: Local backend + frontend dev (no Docker) ──────────────────────

```bash
# Terminal 1 — Start Postgres + Redis
docker compose up postgres redis

# Terminal 2 — Backend
cd backend
export DATABASE_URL="postgres://postgres:password@localhost:5432/movietracker?sslmode=disable"
export REDIS_URL="redis://localhost:6379"
export JWT_SECRET="dev-secret-change-in-production-32ch"
go run ./cmd/server

# Terminal 3 — Frontend
cd frontend
npm install
npm run dev    # → http://localhost:3000
```

---

## API Reference

All routes except auth require `Authorization: Bearer <token>`.

### Auth
| Method | Path                 | Auth | Description       |
|--------|----------------------|------|-------------------|
| POST   | `/api/auth/register` | No   | Create account    |
| POST   | `/api/auth/login`    | No   | Sign in, get JWT  |
| GET    | `/api/auth/me`       | Yes  | Current user info |

### Media
| Method | Path                | Auth | Description                   |
|--------|---------------------|------|-------------------------------|
| GET    | `/api/media/search` | Yes  | Search `?q=title&type=movie`  |
| POST   | `/api/media`        | Yes  | Add/upsert a media item to DB |
| GET    | `/api/media/:id`    | Yes  | Get media item by UUID        |

### Watchlist
| Method | Path                 | Auth | Description                    |
|--------|----------------------|------|--------------------------------|
| GET    | `/api/watchlist`     | Yes  | List `?status=watching&type=series` |
| POST   | `/api/watchlist`     | Yes  | Add or update an entry         |
| DELETE | `/api/watchlist/:id` | Yes  | Remove an entry                |

### Analytics
| Method | Path             | Auth | Description           |
|--------|------------------|------|-----------------------|
| GET    | `/api/analytics` | Yes  | Dashboard stats + genres |

---

## Data & Security

| Concern           | How it's handled                                      |
|-------------------|-------------------------------------------------------|
| Passwords         | bcrypt hashed (cost 10) — never stored plain text    |
| Auth tokens       | JWT HS256, 7-day expiry, validated server-side        |
| Data at rest      | PostgreSQL on PVC — survives pod restarts/restarts    |
| Data in transit   | HTTPS via Nginx + TLS (cert-manager in production)   |
| Session cache     | Redis with 7-day TTL — cleared on logout             |
| After logout      | JWT deleted from browser. PostgreSQL data untouched  |
| Secrets in CI     | Passed via GitLab masked variables → Helm → K8s Secret |

---

## Project Structure

```
cinetrack/
├── .gitlab-ci.yml              ← CI/CD pipeline
├── .env.example                ← Template for local env vars
├── docker-compose.yml          ← Local dev stack
├── backend/
│   ├── cmd/server/main.go      ← Entry point
│   ├── internal/
│   │   ├── config/             ← Env-based config
│   │   ├── database/           ← PG + Redis connections
│   │   ├── handlers/           ← Auth, media, watchlist, analytics
│   │   ├── middleware/         ← JWT auth middleware
│   │   ├── models/             ← Domain models + DTOs
│   │   └── routes/             ← Gin router + CORS
│   ├── migrations/001_init.sql ← Standalone SQL schema
│   └── Dockerfile              ← Multi-stage → scratch image
├── frontend/
│   ├── src/
│   │   ├── pages/              ← Login, Register, Dashboard, Search, Watchlist, Analytics
│   │   ├── components/layout/  ← Sidebar layout
│   │   ├── contexts/           ← AuthContext (JWT + user state)
│   │   └── lib/api.js          ← Axios client + all API calls
│   └── Dockerfile              ← Multi-stage → nginx:alpine
├── k8s/
│   ├── namespace.yaml
│   ├── deployment.yaml         ← All 4 services
│   ├── service.yaml
│   └── ingress.yaml            ← Ingress + secret template
└── helm/
    ├── Chart.yaml
    ├── values.yaml             ← All configurable values
    └── templates/              ← Deployment + Service + Ingress + Secret
```

---

## TMDB Integration (Optional)

1. Sign up at [developer.themoviedb.org](https://developer.themoviedb.org)
2. Copy your **v3 API key**
3. Set `TMDB_API_KEY` in your `.env` or CI variable

Without a key, search works against titles already saved in your local PostgreSQL.

---

## © 2026 Cinetrack. All rights reserved.
Not affiliated with any streaming platform. Movie/series data sourced from TMDB where configured.

---

## Go live: GitHub Pages (frontend) + Render (backend + database)

GitHub Pages only serves static files, so the app is split in two.

1. **Push to GitHub** (repo name is used in the Pages URL):
   ```bash
   git init && git add . && git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/cinetrack.git
   git push -u origin main
   ```
2. **Backend on Render:** render.com → New → Blueprint → select this repo.
   It reads `render.yaml` and creates the API and a Postgres database.
   Optionally set `TMDB_API_KEY`. Copy the API URL when it is live,
   e.g. `https://cinetrack-api.onrender.com`.
3. **Point the frontend at it:** GitHub repo → Settings → Secrets and variables →
   Actions → Variables → New variable: `API_URL` = `https://cinetrack-api.onrender.com/api`
4. **Enable Pages:** Settings → Pages → Source: **GitHub Actions**.
   Then Actions → "Deploy frontend to GitHub Pages" → Run workflow.
5. Open `https://YOUR_USERNAME.github.io/cinetrack/`

Notes: Render's free web service sleeps after inactivity (first request is slow),
and its free Postgres expires after 30 days. Use Neon for a longer-lived free
database by setting `DATABASE_URL` manually. The Kubernetes, Helm and GitLab
files are optional and can be deleted for this route.
