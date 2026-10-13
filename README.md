# Real-Time Client Project Management

An internal workspace for an agency to manage client projects, assign development work, and follow team activity as it happens. Built with **React + TypeScript, Express, PostgreSQL, and Socket.IO**.

The implementation combines API-level role checks with record-level ownership rules. Task changes, activity entries, and notifications are persisted together; WebSocket events then refresh the relevant screens through authorized APIs.

**[Live application](https://real-time-client-project-management.vercel.app)** · **[API health](https://real-time-client-project-management-production.up.railway.app/health)** · **[Repository](https://github.com/susidharan2000/Real-Time-Client-Project-Management)**

## What the application does

| Role | Workspace and access |
| --- | --- |
| **Admin** | Manage clients, projects, and tasks; view global activity, task counts, overdue counts, and a live online-user count. |
| **Project Manager** | Create projects for clients, manage projects they created, assign tasks, and view scoped activity, priority counts, and upcoming due dates for the current UTC week. |
| **Developer** | View assigned tasks, start work, and submit work for review. Assigned tasks are ordered by priority and then due date; other developers' tasks are excluded by backend queries. |

Tasks support title, description, project, assignee, status, priority, and due date. Status values are `TO_DO`, `IN_PROGRESS`, `IN_REVIEW`, and `DONE`; priorities are `LOW`, `MEDIUM`, `HIGH`, and `CRITICAL`.

The developer workflow uses dedicated transitions: `TO_DO → IN_PROGRESS → IN_REVIEW`. Admins and authorized PMs use the task editor for subsequent changes, including completion. Stale developer transitions return a conflict instead of silently overwriting a newer status.

Task filters for status, priority, and due-date range live in the browser URL and are applied by the backend. Activity history and notifications are separate database records: seeing an activity does not automatically mark its notification as read.

> **Current scope:** the included seed creates the seven required accounts and their roles. It does not yet create the required three projects, fifteen or more tasks, two overdue tasks, or historical activity. User-management screens/routes and individual/true mark-all notification controls are also outstanding. See [Known limitations](#known-limitations).

## Architecture

```mermaid
flowchart TD
    B["Browser: React + TypeScript"]
    H["Express HTTP API"]
    W["Socket.IO: WebSocket only"]
    S["Services: permissions and transactions"]
    D["PostgreSQL"]
    J["node-cron: overdue checks"]
    B -->|Requests and filtered reads| H
    H --> S
    S --> D
    H -->|After successful writes| W
    W -->|Targeted events and presence| B
    J --> S
    J -->|After overdue transaction| W
```

Express and Socket.IO share one HTTP server and one Node.js process. PostgreSQL is the source of truth for tasks, activity, notifications, and refresh-token sessions. Presence is held in process memory.

Backend modules separate routes, middleware, controllers, and services. Controllers handle request/response behavior and emit live events after successful service calls. Services contain parameterized SQL, ownership checks, and database transactions.

## Authentication and authorization

- Passwords are verified using bcrypt. The seed hashes its environment-provided password with a cost factor of 12.
- Access JWTs expire after **15 minutes**, contain the user ID, and are kept in React state. Protected HTTP requests send `Authorization: Bearer <accessToken>`.
- Refresh tokens have a **7-day server-side lifetime** and are delivered through an **HttpOnly cookie**. PostgreSQL stores a SHA-256 hash of the token, its expiry, and its revocation state, rather than the raw token.
- On reload, `POST /auth/checksession` checks the cookie against an active, unrevoked database session and returns a new access token plus current user details.
- Logout revokes the refresh-token record, clears the cookie, and removes the authenticated dashboard/socket connection in the current tab.
- Protected middleware verifies the JWT and checks the user's current active status and role in PostgreSQL. Ownership restrictions are enforced again in service queries for scoped operations.

PM project ownership follows **`projects.created_by`**, matching the assessment. `project_manager_id` is stored assignment metadata; it does not grant a different PM permission to manage another creator's project.

Developer reads use `tasks.assigned_to = authenticated_user_id`. Developer status changes lock the assigned task and verify its expected previous status. Modifying a browser role, changing a URL, or sending another user's ID does not grant access.

The refresh cookie currently uses `SameSite=Strict`, and enables `Secure` for production/HTTPS. It is a session cookie in the browser: the database lifetime is seven days, but the cookie does not explicitly set `Max-Age`. Deployment implications are described below.

## Real-time activity, notifications, and presence

### Connection and recipients

The shared authenticated dashboard owns one connection per browser tab. Child pages subscribe to relevant events and remove their listeners when unmounted. The connection uses `auth.token` and `transports: ["websocket"]` on both sides; Socket.IO HTTP long-polling is disabled.

Socket middleware verifies the JWT and loads the active user's current role before joining server-controlled rooms:

| Room | Purpose |
| --- | --- |
| `user:<userId>` | Deliver events to that user's connected tabs/devices. |
| `admins` | Deliver global events and presence counts to authenticated admins. |

Task events are targeted to admins, the project's creator, and the affected assignee. Other PMs and unrelated developers do not receive those task events. Full task/activity records are obtained through scoped HTTP APIs rather than a global broadcast payload.

### A task status change, end to end

1. A developer calls the authenticated task-transition API.
2. The service verifies assignment, locks the task with `FOR UPDATE`, and checks its previous status.
3. In one transaction, it updates the task, stores the old/new status in an activity entry, and inserts recipient notifications.
4. After commit, the controller emits `task:updated` and notification invalidation events to the authorized rooms.
5. Relevant React components refetch their API data and update state without a page reload. Applied task filters are retained.

**Why event-driven refetch?** It reuses the same authorization, filtering, and sorting logic for initial reads and live updates. It keeps socket payloads small and avoids duplicating SQL projection rules in the browser. The tradeoff is an additional HTTP read; event coalescing and pagination are planned improvements for larger workloads. This is WebSocket-triggered refetching, not interval polling.

### Activity history and offline catchup

`GET /activity` retrieves authorized history from PostgreSQL. Admins see global activity; PMs see their created projects; developers see their assigned tasks.

`GET /activity?missed=true` returns up to **20 unseen authorized events**, newest first. The UI combines those with the latest 20, deduplicates by activity ID, and records displayed IDs through `POST /activity/seen`. History is fetched on mount/reconnect and after relevant live events. Reading progress is stored in `activity_feed_seen`, independently of notification read state.

Status-only activities are formatted as, for example, **“Ravi moved Task #12 from In progress → In review · 2 minutes ago.”** Other operations use their stored descriptions. Activity records preserve scope information for deleted tasks/projects through ownership/assignee snapshots.

### Notifications and online count

Notifications are stored with a recipient, optional activity reference, message, creation timestamp, and read timestamp. Assignment creates a developer notification; developer status transitions notify the project creator and admins. The header refetches unread notifications when `notification:created` arrives, without polling. Closing the dropdown marks its displayed unread records as read.

Presence counts **distinct users**, not sockets. Opening a second tab does not increment the user count; disconnecting the last connection removes that user. Admins receive `presence:count` events. Presence is local to one backend process.

## Overdue background job

**node-cron** runs every minute using `* * * * *` in UTC, with local overlap prevention enabled.

Each run processes up to 100 due, unfinished tasks using `FOR UPDATE SKIP LOCKED`. In one transaction it persists `is_overdue`, records a `TASK_OVERDUE` activity, and creates recipient notifications. Socket events are emitted after the transaction succeeds.

`overdue_notified_due_date` records the deadline already processed, preventing repeated overdue activities/notifications for the same deadline. Changing the deadline allows it to be processed again. Read queries also calculate overdue display from the current time so the UI need not wait for the next scheduler tick; persistent flags and notifications are still updated by the job.

**Why node-cron instead of Bull?** This deployment needs one periodic database scan and runs as a single backend process. node-cron avoids adding Redis and a separate worker just for that scan. Durable distributed scheduling, retries independent of API uptime, and a transactional event outbox would be appropriate next steps.

## Database schema and indexes

The schema is defined by [versioned SQL migrations](backend/migrations).

| Table | Responsibility and main relationships |
| --- | --- |
| `roles` | Three constrained role names and a permissions JSONB field; runtime access checks currently use role names. |
| `users` | Role FK, bcrypt password hash, and active flag. |
| `refresh_tokens` | User FK, unique token hash, expiry, revocation, and device metadata. |
| `clients` | Client name and optional contact email; clients are business entities, not login accounts. |
| `projects` | Client FK, creator FK, and optional project-manager metadata. |
| `tasks` | Project FK, creator/assignee FKs, constrained status/priority, UTC-aware due date, and overdue tracking. |
| `activity_logs` | Actor, entity references, action, description, JSONB changes, and historical scope snapshots. |
| `notifications` | Recipient FK, optional activity FK, message, and read state. |
| `activity_feed_seen` | Composite `(user_id, activity_id)` primary key recording activity reading progress. |

Identifiers are PostgreSQL `BIGINT` values; API/feed projections use text IDs where needed to avoid JavaScript integer precision loss. Timestamps use `TIMESTAMPTZ`. Activity references to deleted clients/projects/tasks become null rather than cascading away the audit history; task deletion snapshots preserve assignee scope.

Selected index decisions:

| Index | Intended query benefit |
| --- | --- |
| Unique `lower(email)` / `lower(user_name)` | Enforce case-insensitive user uniqueness. Login currently uses an exact username match. |
| `projects(created_by)` | PM ownership-scoped project reads. |
| `projects(client_id)` / `projects(project_manager_id)` | Client relationships and manager metadata lookups. |
| `tasks(project_id)` / `tasks(assigned_to)` | Project task retrieval and developer-scoped lists. |
| `tasks(status, priority, due_date)` | Combined status/priority/date filtering; usefulness depends on predicate selectivity and column order. |
| Partial overdue indexes | Restrict scheduler candidates to relevant unfinished deadlines. |
| `activity_logs(created_at DESC, activity_id DESC)` | Deterministic recent global history. |
| Entity/time activity indexes | Recent history for a project, task, or client. |
| Partial `notifications(recipient_user_id, created_at DESC) WHERE read_at IS NULL` | Recipient-specific newest unread notifications. |
| Unique refresh-token hash and user FK index | Session lookup and user-session access. |

Indexes are chosen around relationships and read patterns; they are not a claim that every query will use an index. Larger datasets should be evaluated with `EXPLAIN (ANALYZE, BUFFERS)` before further tuning.

## Run with Docker

Requirements: Git, Docker, and Docker Compose v2.

```sh
git clone https://github.com/susidharan2000/Real-Time-Client-Project-Management.git
cd Real-Time-Client-Project-Management
cp docker/.env.example docker/.env
```

Fill in `POSTGRES_PASSWORD`, `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, and `SEED_DEMO_PASSWORD` in `docker/.env`. Generate independent token secrets with:

```sh
openssl rand -hex 32
```

Use a URL-safe PostgreSQL password, such as a generated hexadecimal value, because Compose includes it in the connection URL. Keep the file private.

```sh
docker compose --env-file docker/.env up --build -d
docker compose --env-file docker/.env exec backend ./node_modules/.bin/tsx src/db/seed.ts
```

Compose waits for PostgreSQL health, applies migrations, starts the backend, and starts Nginx serving the frontend. The backend image runs TypeScript using `tsx`. Frontend nested paths have an Nginx fallback to `index.html`.

- **Frontend:** http://localhost:5173
- **API:** http://localhost:3000
- **Health:** http://localhost:3000/health

PostgreSQL is internal to the Docker network. Compose uses a persistent database volume; your local `backend/.env` is not copied into the image or used by Compose.

```sh
# Inspect services and logs.
docker compose --env-file docker/.env ps -a
docker compose --env-file docker/.env logs -f backend
docker compose --env-file docker/.env logs migrate

# Stop while preserving database data.
docker compose --env-file docker/.env down
```

`down -v` deletes the database volume. Changing `POSTGRES_PASSWORD` in the environment file does not change a password in an already-initialized database.

## Run without Docker

Use Node.js **22.12+ within the Node 22 line** (matching the Docker setup), PostgreSQL, and the `golang-migrate` CLI with PostgreSQL support. Create the database first.

Create `backend/.env` with your own values:

```dotenv
DATABASE_URL=postgres://YOUR_USER:YOUR_PASSWORD@localhost:5432/YOUR_DATABASE?sslmode=disable
PORT=3000
FRONTEND_ORIGIN=http://localhost:5173
ACCESS_TOKEN_SECRET=replace-with-an-independent-generated-secret
REFRESH_TOKEN_SECRET=replace-with-another-generated-secret
SEED_DEMO_PASSWORD=choose-a-local-demo-password
NODE_ENV=development
```

Backend terminal:

```sh
cd backend
npm ci
export DATABASE_URL='postgres://YOUR_USER:YOUR_PASSWORD@localhost:5432/YOUR_DATABASE?sslmode=disable'
migrate -path migrations -database "$DATABASE_URL" up
npx tsx src/db/seed.ts
npx tsx src/server.ts
```

The migration CLI does not read `.env`; the URL exported in your shell must point to the same database. The server and seed load environment variables through dotenv.

Frontend terminal:

```sh
cd frontend
npm ci
npm run dev
```

The frontend defaults to `http://localhost:3000`. Set `VITE_API_URL` in `frontend/.env.local` to change it, then restart Vite. For Docker, update `VITE_API_URL` in `docker/.env` and rebuild the frontend. Vite values are bundled at build time and must not contain secrets.

### Seed accounts

Run [backend/src/db/seed.ts](backend/src/db/seed.ts) after applying migrations. All created accounts use the configured `SEED_DEMO_PASSWORD`.

| Role | Usernames |
| --- | --- |
| Admin | `admin` |
| Project Manager | `pm1`, `pm2` |
| Developer | `dev1`, `dev2`, `dev3`, `dev4` |

The seed is transactional and skips existing accounts; it does not reset existing passwords. In the current version, create clients/projects/tasks through the UI after seeding. A complete assessment fixture is still required to make the feed populated on first load.

The local seed password is not automatically the deployed demo password. Provide reviewer credentials separately for the deployed environment.

## API reference

Protected requests require a Bearer access token. Paths below match the current router names, including legacy casing/spelling.

| Method and path | Purpose / access |
| --- | --- |
| `POST /auth/login` | Authenticate and set the refresh cookie. |
| `POST /auth/checksession` | Restore a valid cookie-backed session and user details. |
| `POST /auth/refresh` | Issue a new access token from a valid stored refresh session. |
| `POST /auth/logout` | Revoke the refresh session and clear its cookie. |
| `GET /client` | Client choices/list for admins and PMs; client writes are admin-only. |
| `POST /client`, `PUT /client/:id`, `DELETE /client/:id` | Client management. |
| `GET /project` | All projects for admins. |
| `GET /project/my-projects` | Projects created by the authenticated user. |
| `POST /project`, `PUT /project/:id`, `DELETE /project/:id` | Admin/PM project operations with ownership checks. |
| `GET /task/search` | Admin task search. |
| `GET /task/created-by-me/search` | Project-creator-scoped task search. |
| `GET /task/assigned-to-me/search` | Developer-assigned task search. |
| `POST /task`, `PUT /task/:id`, `DELETE /task/:id` | Admin/PM task operations with project ownership checks. |
| `PATCH /task/:id/start` | Assigned developer: `TO_DO → IN_PROGRESS`. |
| `PATCH /task/:id/submit-review` | Assigned developer: `IN_PROGRESS → IN_REVIEW`. |
| `GET /dashboard/getAdminSummary` | Admin summary. |
| `GET /dashboard/projectManager/summary` | PM summary. |
| `GET /dashboard/developer/summary` | Developer summary. |
| `GET /notification` | Latest 20 unread notifications belonging to the current user. |
| `PATCH /notification/mark-as-readed` | Mark supplied notification IDs read, restricted to their recipient. |
| `GET /activity` | Authorized activity history, with optional missed/cursor filters. |
| `POST /activity/seen` | Save displayed authorized activity IDs as seen. |

Example shareable task-list URL:

```text
/tasks?status=IN_REVIEW&priority=HIGH&due_from=2026-10-01&due_to=2026-10-31
```

The developer page uses `/DeveloperTasks` with the same supported filter parameters. Additional API search filters include `task_name` and `project_id`. `due_from`/`due_to` are UTC calendar dates; the upper bound includes the whole selected day.

Application controllers validate IDs, role-sensitive relationships, enum values, and date ranges. Typical controller failures return JSON containing `message`, with suitable `400`, `401`, `403`, `404`, `409`, or `500` statuses. Internal exceptions are logged rather than returned as stack traces. Central normalization of framework-level errors is a future improvement.

## Project structure

```text
backend/
  migrations/              Versioned SQL schema changes
  src/
    app.ts                 Express middleware and route registration
    server.ts              Shared HTTP server, database check, socket/job startup
    auth/                  Login, refresh sessions, logout
    client/                Client management
    project/               Project ownership and CRUD
    task/                  Tasks, transitions, filters, overdue transactions
    dashboard/             Role-specific summaries
    activitylog/           Scoped history and seen tracking
    notification/          Recipient-scoped notifications and read updates
    socket/                Connection authentication and room membership
    presence/              Single-process online-user tracking
    jobs/                  node-cron scheduling
    db/                    PostgreSQL pool and account seed
frontend/
  src/
    Pages/                 Login, dashboard layout, header, role dashboards
    components/            Clients, projects, tasks, activity, notifications
    api.ts                 Shared browser-facing API URL
  nginx.conf               Docker SPA routing fallback
compose.yaml               Database, migration, backend, frontend services
docker/.env.example        Local Docker configuration template
```

## Verification

These are reproducible checks for a reviewer; they are not a claim of an existing automated integration suite.

Frontend:

```sh
cd frontend
npm run build
npm run lint
```

Backend type check, using its current TypeScript setup:

```sh
cd backend
npx tsc --noEmit --target es2022 --module esnext --moduleResolution bundler --allowImportingTsExtensions --esModuleInterop --skipLibCheck src/server.ts src/db/seed.ts
```

Suggested manual review:

1. Seed the accounts; sign in as `admin` and create a client. Then sign in as `pm1` and create a project for that client and a developer-assigned task.
2. In another browser/session, verify `pm2` cannot list or edit `pm1`'s project, including through direct API requests.
3. Sign in as `dev1`; verify only assigned tasks appear and direct admin/PM requests are rejected.
4. Keep admin, PM, and developer sessions open. Start a task and submit it for review; check task data, activity, and notifications update without reloading.
5. Disconnect a viewer, make changes, reconnect, and verify unseen history is retrieved from PostgreSQL.
6. Create an unfinished task with a past deadline; wait for the cron run and inspect its persisted flag, system activity, and notifications.
7. Open two tabs for one user and check the admin's presence count increments only once; close both and verify it decreases.
8. Share a filtered task URL and reload it. Verify filters, routing, and session restoration.

There is no automated backend test suite configured yet. `npm test` in the backend is currently a placeholder.

## Deployment

The frontend is hosted on Vercel; the persistent Express/Socket.IO backend and PostgreSQL are hosted on Railway. Keeping the socket server on a persistent backend allows long-lived connections alongside the HTTP API and scheduler.

- Frontend root: `frontend`; build: `npm run build`; output: `dist`. Set `VITE_API_URL` before building. Configure an SPA rewrite so refreshing nested routes serves `index.html`.
- Backend root: `backend`; use the Dockerfile or install dependencies and start `npx tsx src/server.ts`. The server reads the platform `PORT` and binds to `0.0.0.0`.
- Set `DATABASE_URL`, `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, `FRONTEND_ORIGIN`, and `NODE_ENV` on the backend. Apply migrations before starting new code. Set `SEED_DEMO_PASSWORD` only where the seed needs it.
- Use HTTPS and a reverse proxy/platform that supports WebSocket connections. `FRONTEND_ORIGIN` must match the actual frontend origin.

**Cookie configuration matters:** the current `SameSite=Strict` refresh cookie expects frontend/API requests to be same-site. Separate `vercel.app` and `railway.app` hosts are cross-site. For reliable deployed session restoration, use frontend/API hosts under one registrable domain, or deliberately implement cross-site cookie support (`SameSite=None; Secure`, credentialed requests, appropriate CSRF protection, and consideration of browser third-party-cookie restrictions). Changing the CORS origin alone does not fix this.

## Known limitations

- **Assessment seed coverage:** the seed creates accounts/roles only; projects, tasks, overdue fixtures, and pre-existing activity must be added to satisfy the required seeded first-run experience.
- **User administration:** no user-management API/UI is implemented. Existing users are provisioned by the seed.
- **Notification controls/count:** the header shows the size of the latest 20 unread results, not a full unread aggregate. Closing the dropdown marks the displayed batch read; explicit individual and database-wide mark-all controls are outstanding. Read updates are not broadcast to other tabs.
- **Token lifecycle:** refresh sessions are revocable but not rotated. The frontend restores a token on reload but does not yet refresh it proactively or retry expired access-token requests. Socket authorization is checked on connection; an established connection is not currently revalidated at token expiry or a role change.
- **Scale:** presence is process-local; there is no Redis adapter, transactional outbox, task-list pagination, or general event-coalescing mechanism. Post-commit socket delivery is best effort; activity catchup covers durable history, not guaranteed delivery of every live event.
- **Scheduler uptime:** the job runs only while the backend is running, processes 100 tasks per tick, and uses overlap prevention within one process. Larger deployments need explicit scheduling/monitoring coordination and shared socket delivery.
- **Validation/testing:** validation and authentication code are repeated across modules. A common schema/error layer and automated role-isolation, transaction, and reconnect tests would improve maintainability and regression confidence.

These boundaries describe the current implementation and the next work required; they should be resolved or disclosed before presenting the assessment as complete.
