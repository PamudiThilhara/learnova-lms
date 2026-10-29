# Learnova frontend

The existing Next.js interface connects to the Express/MongoDB backend in the sibling backend directory. See [the full setup guide](../README.md) for environment variables, database setup, roles, API endpoints and tests.

From this directory:

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Start the backend as described in the root guide before using the app. The default API is http://localhost:4000/api. Passwords are verified by the server, and sessions use HTTP-only cookies. No application data or tokens are persisted in browser storage. Existing frontend routes and styling are preserved.

Checks: `npm run build`, `npm run lint`. Browser integration verification: `node scripts/verify-frontend.mjs http://localhost:3011` with the isolated test services described in the root guide.
