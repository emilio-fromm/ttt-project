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
minikube addons enable ingress        # needed for k8s/ingress.yaml
eval $(minikube docker-env)          # build images straight into minikube's docker
docker build -t ttt-frontend ./frontend
docker build -t ttt-entries ./services/entries-service
docker build -t ttt-integrations ./services/integrations-service

# Before applying: k8s/config.yaml's AZURE_STORAGE_CONNECTION_STRING still has the local
# Azurite placeholder -- swap it for a real Azure Storage Account connection string first,
# or image uploads will fail inside the cluster (there's no Azurite pod in k8s/).

kubectl apply -f k8s/
echo "$(minikube ip) ttt.local" | sudo tee -a /etc/hosts
```

Then open `http://ttt.local/` in a browser.

**Access it through the Ingress (`http://ttt.local/`), not `minikube service ttt-frontend --url`.**
The frontend talks to the backends over relative paths (`/api/entries`, `/api/integrations`) that only
the ingress (`k8s/ingress.yaml`) knows how to route to the right Service — `minikube service` on the
frontend alone bypasses the ingress entirely and the API calls would 404.

Take screenshots of `kubectl get pods`, `kubectl get svc`, and the app running via `http://ttt.local/` —
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

## Where things actually run (grading evidence)

This project deliberately splits two requirements across different infrastructure, because
the assignment lists them as two separate bullet points with different constraints:

**"Host the entire website" — live, always-on, at the submitted link:**
- **Netlify** — the frontend (static build).
- **Render** — both backend microservices (`entries-service`, `integrations-service`) *and*
  their Postgres databases.
- **Azure** — Blob Storage (uploaded post-it images) *and* both serverless Functions
  (thumbnail generation, GitHub issue sync).

None of the above involves Kubernetes, and that's intentional.

**"Implement Container Orchestration" — Minikube, run on demand, not continuously hosted:**
The assignment explicitly allows this: *"Kubernetes or any cloud services e.g., Azure
Kubernetes Services"* and *"you can use any cloud-based tool or open-source to implement
these concepts."* We tried Azure Kubernetes Service first; it's blocked by VM SKU quota
limits on our student subscription (most SKUs an AKS node pool needs are disabled for
student subscriptions). Minikube is a full, real Kubernetes cluster — Deployments with
multiple replicas, readiness/liveness probes, Services, Ingress routing — it just runs
locally instead of in the cloud, which is exactly what the assignment text permits.

**How to verify the orchestration is real** (see the Minikube section above to set it up):
- `kubectl get pods` — two replicas each of `entries-service`, `integrations-service` and
  `ttt-frontend`, plus `postgres`, all `Running`.
- `kubectl get svc` / `kubectl get ingress` — routing wired up.
- `http://ttt.local/` — the actual app, served end-to-end through the cluster.
- **Self-healing:** `kubectl delete pod <one of the entries-service pods>`, then immediately
  `kubectl get pods` — a replacement pod is already spinning up on its own, no one touched it.
- **Scaling:** `kubectl scale deployment entries-service --replicas=4`, then `kubectl get pods`
  — four running instances.

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
