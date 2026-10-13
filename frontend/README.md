# Frontend

React, TypeScript, Vite, Tailwind CSS, and Socket.IO client.

See the [project README](../README.md) for Docker setup, environment variables, demo accounts, and backend setup.

```sh
npm ci
npm run dev
```

Use Node.js 22.12 or newer. The API defaults to `http://localhost:3000`; override it with `VITE_API_URL` in `.env.local`.

```sh
npm run build
npm run lint
```

The Docker image builds static assets and serves them through Nginx with a React Router fallback for nested URLs.
