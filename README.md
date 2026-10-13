# Real-Time Client Project Management

A React and TypeScript dashboard backed by Express, PostgreSQL, and Socket.IO. Admins manage clients, projects, and tasks; project managers work with projects they created; developers work with assigned tasks.

The app includes role-specific dashboards, status and priority counts, due-date filters, notifications, activity feeds, and live updates. An in-process cron job checks overdue tasks every minute while the API is running.

## Run with Docker

Install Docker with Docker Compose v2. From the repository root:

```sh
cp docker/.env.example docker/.env
```

Edit `docker/.env` and fill in `POSTGRES_PASSWORD`, `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, and `SEED_DEMO_PASSWORD`. Generate each secret independently with `openssl rand -hex 32`. Use a URL-safe database password, such as the generated hexadecimal value.

```sh
docker compose --env-file docker/.env up --build -d
docker compose --env-file docker/.env exec backend ./node_modules/.bin/tsx src/db/seed.ts
```

Compose waits for PostgreSQL, applies migrations, starts the API, and then starts Nginx serving the built frontend. It uses its own database volume. Your local `backend/.env` is not copied into the image or used by Compose.

Open **http://localhost:5173**. The API is at **http://localhost:3000**, with a health endpoint at `/health`. PostgreSQL is available only inside the Docker network.

The seed creates these accounts, all using `SEED_DEMO_PASSWORD`:

| Role | Usernames |
| --- | --- |
| Admin | `admin` |
| Project manager | `pm1`, `pm2` |
| Developer | `dev1`, `dev2`, `dev3`, `dev4` |

The seed creates roles and users only. Create clients, projects, and tasks through the UI. Running the seed again leaves existing accounts and passwords unchanged.

```sh
# Status and logs
docker compose --env-file docker/.env ps -a
docker compose --env-file docker/.env logs -f backend
docker compose --env-file docker/.env logs migrate

# Stop while preserving database data
docker compose --env-file docker/.env down
```

`down -v` also deletes the database volume and all its data. Changing `POSTGRES_PASSWORD` in the environment file does not change an existing database user's password.

## Run locally without Docker

Use Node.js 22.12 or newer, PostgreSQL, and the `golang-migrate` CLI with PostgreSQL support.

Create `backend/.env` with your own values:

```dotenv
DATABASE_URL=postgres://YOUR_USER:YOUR_PASSWORD@localhost:5432/YOUR_DATABASE?sslmode=disable
PORT=3000
FRONTEND_ORIGIN=http://localhost:5173
ACCESS_TOKEN_SECRET=your-independent-access-secret
REFRESH_TOKEN_SECRET=your-independent-refresh-secret
SEED_DEMO_PASSWORD=your-demo-password
NODE_ENV=development
```

Create the database first. In a backend terminal:

```sh
cd backend
npm ci
# Use the same URL as backend/.env.
export DATABASE_URL='postgres://YOUR_USER:YOUR_PASSWORD@localhost:5432/YOUR_DATABASE?sslmode=disable'
migrate -path migrations -database "$DATABASE_URL" up
npx tsx src/db/seed.ts
npx tsx src/server.ts
```

The migration CLI does not automatically read `backend/.env`. The server and seed script do.

In a separate terminal:

```sh
cd frontend
npm ci
npm run dev
```

The frontend defaults to `http://localhost:3000`. To change it, put `VITE_API_URL=https://your-api-host` in `frontend/.env.local` and restart Vite. For Docker, change `VITE_API_URL` in `docker/.env` and rebuild the frontend image. This must be a browser-facing URL, not the Docker service name `backend`.

## Structure

```text
backend/
  migrations/        Versioned PostgreSQL migrations
  src/
    auth/            Login, refresh tokens, and sessions
    client/          Client API
    project/         Project API and permissions
    task/            Task API, filters, and status transitions
    dashboard/       Dashboard summaries
    activitylog/     Scoped activity feed and seen tracking
    notification/    Notifications and read tracking
    socket/          Authenticated sockets and presence
    jobs/            Overdue task scheduler
    db/              Connection pool and user seed
frontend/
  src/Pages/         Dashboards, login, and shared header
  src/components/    Client, project, task, and activity views
compose.yaml         Database, migrations, API, and frontend
```

## API and live updates

Protected HTTP routes use `Authorization: Bearer <accessToken>`. Login and session refresh use an HTTP-only refresh cookie. Sockets send the access token in `auth.token` and use WebSocket transport.

| Route prefix | Purpose |
| --- | --- |
| `/auth` | Login, logout, refresh, and session checks |
| `/client` | Client management |
| `/project` | Projects and project counts |
| `/task` | Tasks, filters, counts, and developer transitions |
| `/dashboard` | Role-specific summaries |
| `/notification` | Notifications and marking them read |
| `/activity` | Authorized activity history and seen tracking |

Socket events tell the frontend to refresh affected data through authorized APIs. Notifications are stored in PostgreSQL; activity history is a separate feed. The overdue job runs inside the backend process, so it stops when that process stops.

## Checks

From `frontend/`:

```sh
npm run build
npm run lint
```

From `backend/`:

```sh
npx tsc --noEmit --target es2022 --module esnext --moduleResolution bundler --allowImportingTsExtensions --esModuleInterop --skipLibCheck src/server.ts src/db/seed.ts
```

The backend currently has no configured automated `npm test` suite. For a manual smoke test, log in as each role, create a project and task, open another session to check live updates, change an assigned task's status, and check notifications and activity history. Refresh a nested frontend URL to verify routing.

## Deployment notes

The supplied Compose setup is for local HTTP use and binds exposed ports to loopback. For hosting, configure an HTTPS reverse proxy with WebSocket support, set the exact `FRONTEND_ORIGIN`, use `NODE_ENV=production`, and rebuild the frontend with its public API URL. The refresh cookie uses `SameSite=Strict`; host the frontend and API on the same site for cookie-based sessions.

Keep environment files private, use fresh secrets, and apply migrations before starting new application code. Presence lives in process memory, and the scheduler runs in the API process; multiple API replicas need shared presence/socket infrastructure and coordinated scheduling.

If a migration reports a dirty version, inspect and repair the failed migration and schema before using `migrate force`. Forcing a version only changes migration metadata; it does not execute or repair SQL.
