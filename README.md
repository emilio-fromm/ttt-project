# TTT — Tool Task Tracker

A whiteboard-styled productivity hub. Log in, pick the tools you use (GitHub, Notion, Figma, Discord, ...),
and stick tasks, deadlines, notes and images to each one like Post-its on a corkboard, one board per calendar
day. GitHub is wired up as a real integration (via a Personal Access Token) and shows your live issues/PRs.
"Daily News" is a selectable tool too — it shows one cached, English-language headline per day from a free,
keyless news API (see `NEWS_API_URL` in `.env.example`).

## Architecture

```
frontend/                 React + Vite SPA (whiteboard/post-it UI)
services/entries-service/     Node/Express — users, tools, entries (tasks/notes), images
services/integrations-service/ Node/Express — GitHub PAT integration, favicon lookup, issue cache
azure-functions/
  thumbnail-generator/    Blob-trigger — makes a thumbnail whenever an image is uploaded
  github-cache/           Timer-trigger — refreshes cached GitHub issues every 15 min
k8s/                       Kubernetes manifests (Deployment/Service/Ingress) for Minikube or AKS
docker-compose.yml         Local dev: frontend + both services + Postgres + Azurite (Blob emulator)
```

Two microservices talk to two separate Postgres schemas/databases and are only ever called over REST
by the frontend — they never call each other directly, so failure in one doesn't take down the other.

## 1. Local development (day-to-day)

Requirements: Docker Desktop.

```bash
cp .env.example .env        # fill in JWT_SECRET, GITHUB defaults if you want
docker-compose up --build
```

This starts:
- `frontend` on http://localhost:5173
- `entries-service` on http://localhost:4000
- `integrations-service` on http://localhost:4001
- `postgres` on localhost:5432 (two databases: `entries_db`, `integrations_db`, both auto-migrated on boot)
- `azurite` on localhost:10000 (local Blob Storage emulator, so you don't need a real Azure account yet)

Hot reload is on for both frontend (Vite) and backend (nodemon), so this is where you'll do ~90% of your
testing while building.

## 2. Kubernetes test (Minikube) — do this once things are stable

```bash
minikube start
eval $(minikube docker-env)          # build images straight into minikube's docker
docker build -t ttt-frontend ./frontend
docker build -t ttt-entries ./services/entries-service
docker build -t ttt-integrations ./services/integrations-service

kubectl apply -f k8s/
minikube service ttt-frontend --url
```

Take screenshots of `kubectl get pods`, `kubectl get svc`, and the app running via the Minikube URL —
that's your Container Orchestration evidence for the submission.

## 3. Cloud deployment (for the final submitted link)

- **Frontend** → Netlify or Vercel: connect the repo, root dir `frontend`, build command `npm run build`,
  publish dir `dist`.
- **entries-service / integrations-service** → Render.com: "New Web Service" per folder, Render reads
  the Dockerfile automatically. Add the env vars from `.env.example`.
- **Postgres** → Render's free Postgres, or Azure Database for PostgreSQL.
- **Blob Storage** → a real Azure Storage Account (swap `AZURE_STORAGE_CONNECTION_STRING` from Azurite's
  dev value to the real one — nothing else changes).
- **Azure Functions** → deploy `azure-functions/*` via the Azure Functions Core Tools or VS Code extension.

## Environment variables

See `.env.example` in the repo root — copy it to `.env` before running docker-compose.

## Required-feature checklist

- [x] Microservice architecture (frontend + 2 independent backend services)
- [x] Images stored in cloud storage (Azure Blob Storage / Azurite locally)
- [x] REST API between frontend and backends
- [x] Docker containers for every service
- [x] Kubernetes manifests for orchestration (`k8s/`)
- [x] Cloud hosting instructions (Netlify/Render/Azure)
- [x] Two serverless components (thumbnail generator, GitHub issue cache)
