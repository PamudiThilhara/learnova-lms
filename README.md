> **October 30, 2026 update:** The local application now has a complete dark theme and a student AI PDF Quiz Generator. See [REDESIGN.md](REDESIGN.md) for implementation details, API/model additions, executed tests, external setup requirements, and exact run commands. `backend/.env` was preserved.

# Learnova

Learnova's existing Next.js 16 / React 19 interface now uses an Express 5 REST API and MongoDB through Mongoose. Existing routes, components, CSS, images, fonts, spacing, and navigation are retained. Frontend changes connect forms and state to the API, enforce sign-in, and correct preview text about storage and authentication. No UI library was added.

See [the implementation handoff](IMPLEMENTATION.md) for the full file inventory, executed test results and remaining external setup.

## Run locally (PowerShell)

Requirements: Node.js 22 or newer, npm, and a running MongoDB instance. Development and tests were verified with MongoDB 8.2.6. For the existing Atlas Cluster0 setup and local password instructions, see [backend/ATLAS_SETUP.md](backend/ATLAS_SETUP.md). Do not copy the example over an already configured `.env`. Run these commands from `C:\pamudi\smartlearn-lms`:

```powershell
npm --prefix backend install
npm --prefix frontend install
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env.local
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Paste the generated value into `JWT_SECRET` in `backend/.env`. Set `MONGODB_URI` to your local database or Atlas connection string. Environment files are ignored; never commit credentials.

For a local database, install MongoDB Community and run its service, or use Docker:

```powershell
docker run -d --name learnova-mongo -p 127.0.0.1:27017:27017 -v learnova-mongo:/data/db mongo:8.2
```

The default URI is `mongodb://127.0.0.1:27017/learnova`. The volume preserves data across container restarts. For Atlas, create a database user and network access rule, URL-encode credentials in your URI, and place the `mongodb+srv://...` URI only in `backend/.env`. No hosted cluster or production database is created automatically.

Optional sample catalog and accounts: set a strong `SEED_PASSWORD` in `backend/.env`, then run:

```powershell
npm --prefix backend run seed
```

The seed inserts 13 existing sample courses and six sample users, including `student@learnova.demo`, `instructor@learnova.demo`, and `admin@learnova.demo`. All sample accounts use your configured seed password. It preserves existing records and passwords and does not invent enrollment counts or learner activity. It is disabled in production. The existing Student / Instructor / Admin buttons require this password in the password field; they cannot bypass authentication.

For a fresh administrator without sample accounts, set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and optionally `ADMIN_NAME` in `backend/.env`, then run `npm --prefix backend run create-admin`. This refuses to overwrite existing accounts. Public registration supports students and instructors; it cannot create administrators.

Start these in separate terminals:

```powershell
# Terminal 1, from the project root
npm run dev:backend
# Terminal 2, from the project root
npm run dev:frontend
```

Open http://localhost:3000. API readiness: http://localhost:4000/api/health. Backend startup fails if MongoDB or required configuration is unavailable; it never substitutes browser mock data.

Production build: `npm run build`. Start the backend with `npm --prefix backend start` and the built frontend with `npm --prefix frontend start`. Set environment variables before building because `NEXT_PUBLIC_API_URL` is embedded in the browser bundle.

## Configuration

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | Required MongoDB connection string |
| `JWT_SECRET` | Required random secret of at least 32 characters |
| `PORT` | API port, default 4000 |
| `NODE_ENV` | `development`, `test`, or `production` |
| `FRONTEND_URL` | Frontend origin used for password reset links |
| `CORS_ORIGINS` | Comma-separated permitted browser origins; default http://localhost:3000 |
| `TRUST_PROXY` | `1` only behind one trusted reverse proxy; otherwise `0` |
| `NEXT_PUBLIC_API_URL` | Frontend API URL; default http://localhost:4000/api |
| `SEED_PASSWORD` | Required only for development sample seed |
| `ALLOW_SAMPLE_SEED` | `true` permits admin Restore Sample Data in development; otherwise denied |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | Initial administrator CLI configuration |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Password reset email delivery configuration |

For production use HTTPS and deploy frontend and API on the same site (for example, app.example.com and api.example.com) for SameSite cookies. `NODE_ENV=production` makes the HTTP-only session cookie Secure. Restrict CORS origins to your actual frontend. The API requires `X-Learnova-Request: 1` on every mutation and checks browser origins. Send cookies with `credentials: 'include'`. There are no tokens in local/session storage. Remember Me lasts seven days; other sessions last at most twelve hours and use browser-session cookies. Logout deletes the server session; blocking users and resetting passwords revoke their sessions.

## Architecture and storage

`backend/config/` validates configuration and connects MongoDB, `models/` declares schemas, `validators/` validates request DTOs with Zod, `controllers/` implements use cases, `services/` contains authentication, access rules, scoped state, and sample seeding, `routes/` defines REST routes, and `middleware/` handles errors. `frontend/lib/api.ts` is the centralized HTTP client. `LearnovaProvider` fetches role-scoped state and updates it after successful mutations. Catalog searches, filters, sorting, dashboard calculations and CSV reports operate on database-backed state. Refreshing or returning focus to the window reloads current state.

| MongoDB collection | Stored data |
| --- | --- |
| `users` | Unique normalized email, bcrypt password hash, profile, role, status, hashed expiring reset token |
| `courses` | Instructor reference, catalog fields, lessons, quiz questions/answer key, assignment definition |
| `enrollments` | Unique user/course pair, completed lesson IDs, server completion date |
| `quizattempts` | Latest attempt per user/course, validated answers and server-calculated score |
| `submissions` | Latest reflection, optional attachment bytes/name, marks and feedback per user/course |
| `sessions` | JWT session IDs, user references, TTL expiry for revocable sessions |
| `settings` | Platform communication preferences |
| `activities` | Actor/course-scoped activity messages |
| `contactmessages` | Contact form name, email, subject and message |

All collections have timestamps. References use string IDs compatible with existing course routes. Unique indexes protect email and user/course records. Course text/category and relationship indexes support queries. Deleting courses and users cleans related learning records; instructor accounts with courses cannot be deleted. Administrator accounts are protected from blocking/deletion through the UI APIs. The sample restore action is additive and does not erase real database records.

Students see their own profile and learning records. Instructors see students and learning records only for courses they own. Administrators see platform records. Public visitors get the catalog and aggregate user counts. Quiz keys are redacted for visitors and students until an enrolled student submits answers. The backend ignores submitted scores, user IDs, roles, enrollment dates, and course ownership fields. Completion and certificate eligibility are verified by the server. The printable certificate keeps the original design.

Assignment attachments up to 10 MB are persisted in MongoDB and downloaded only after an owner/instructor/admin check. Allowed formats are PDF, DOCX, TXT, ZIP, PNG and JPEG, with file-signature checks; downloads use attachment disposition and nosniff. Profile photos and thumbnails use validated size-limited image data URLs in their existing upload controls. No public file storage is used.

## API reference

All paths below are relative to `/api`. Successful responses are JSON except attachment downloads and `204` deletions/logout. Errors use `{ message, errors? }` with `401`, `403`, `404`, `409`, `422`, `429`, or `503` as appropriate. Unrecognized routes return `404`. Mutation bodies use JSON except assignment uploads, which use multipart form data (`text`, optional `file`, optional `removeFile=true`).

| Method and endpoint | Access / purpose |
| --- | --- |
| `GET /health` | Database readiness |
| `GET /state` | Public catalog or authenticated role-scoped dashboard state |
| `POST /auth/register` | `{name,email,password,role,terms:true}` |
| `POST /auth/login` | `{email,password,remember?}`; sets HTTP-only JWT cookie |
| `POST /auth/logout` | Revoke current session and clear cookie |
| `GET /auth/me` | Signed-in profile |
| `PATCH /auth/me` | Update `{name,email,phone,bio,avatar}` |
| `POST /auth/forgot-password` | `{email}`; send expiring reset link via SMTP |
| `POST /auth/reset-password` | `{token,password}`; consume token and revoke sessions |
| `GET /courses?q=&category=&level=` | Search/filter catalog |
| `GET /courses/:id` | Catalog detail; quiz keys scoped by role |
| `POST /courses` | Instructor/admin creates a course |
| `PUT /courses/:id` | Course owner/admin updates course, lessons, quiz or assignment |
| `DELETE /courses/:id` | Course owner/admin deletes course and related learning |
| `POST /courses/:id/enrollments` | Student enrolls; repeated requests preserve progress |
| `PUT /courses/:id/lessons/:lessonId/completion` | Enrolled student completes a valid lesson |
| `POST /courses/:id/quiz-attempts` | Enrolled student submits `{answers:number[]}`; returns verified attempt and review |
| `PUT /courses/:id/submission` | Enrolled student's multipart assignment submission |
| `PATCH /courses/:id/submissions/:userId/grade` | Course owner/admin submits `{marks,feedback}` |
| `GET /courses/:id/submissions/:userId/attachment` | Student owner/course instructor/admin attachment download |
| `GET /courses/:id/certificate` | Student's server-verified certificate eligibility and metadata |
| `PATCH /admin/users/:id/status` | Admin toggles student/instructor access |
| `DELETE /admin/users/:id` | Admin deletes account and learning records |
| `PUT /admin/settings` | Admin saves `{notifications,weeklyDigest}` |
| `POST /admin/sample-data` | Explicitly enabled development-only additive sample seed |
| `GET /admin/contact-messages` | Admin retrieves latest 100 contact messages |
| `POST /contact-messages` | Public contact form `{name,email,subject,message}` |

Course writes accept `title`, `description`, `image`, `category`, `level`, `duration`, `price`, `outcomes`, `lessons`, optional `quiz` and `assignment`, as represented by the existing editor. The server assigns IDs/ownership and derives enrollment counts. New courses receive a default assignment definition and an empty quiz that instructors can populate. Quiz attempts and assignment submissions replace the latest record, matching the existing interface. Resubmission clears the previous grade.

## Verification

```powershell
npm test
npm --prefix frontend run lint
npm run build
npm run verify:design
```

Backend tests start an isolated temporary MongoDB using mongodb-memory-server; they do not connect to `MONGODB_URI` or any existing database. The first run downloads a MongoDB binary and requires internet access. `MONGOMS_SYSTEM_BINARY` can point to an installed `mongod` when offline. Tests cover passwords, validation, injection attempts, cookies, CSRF, roles, course CRUD, enrollment, concurrent lesson completion, authoritative scoring, real attachment storage/download, grading, certificate eligibility, profile changes, private data isolation, admin settings/status/deletion, contact persistence, token reset/replay and session revocation.

For browser verification, start an isolated API and a second frontend in separate terminals:

```powershell
# Terminal 1
cd backend
node scripts/test-server.js
# Terminal 2, from project root
cd frontend
$env:NEXT_PUBLIC_API_URL='http://localhost:4011/api'
$env:LEARNOVA_DIST_DIR='.next-integration'
npm run dev -- --port 3011
# Terminal 3, from project root
node frontend/scripts/verify-frontend.mjs http://localhost:3011
```

The test server uses only a temporary database with test-only credentials. The browser script requires Chrome or Edge (`CHROME_PATH` can override), verifies role-based routes, forms, learning, grading and administration, and generates desktop/mobile screenshots and a PDF certificate in the temporary artifact directory reported by the script. The separate build directory avoids stopping an existing frontend development server.

## External setup and limits

MongoDB deployment and production credentials remain your responsibility; tests use a temporary local MongoDB. Configure SMTP to send password recovery emails. Without SMTP, the recovery endpoint returns `503`; it does not pretend to send mail. The emailed link opens the existing login form: enter the account email and a new password, then submit to reset and sign in. Google/Apple sign-in require OAuth provider credentials and are explicitly unavailable. Enrollment collects no payment because no payment flow exists in this frontend. Notification/digest preferences persist, but no scheduler or notification delivery service was present. Contact messages persist and are available to admins via API; outbound support email is not configured. Placeholder contact details remain operator-supplied content. Supply institution-specific legal/support information before a public launch.

There is no import of untrusted browser preview accounts or passwords. Run the seed or create new accounts instead. Backend files are at the workspace root beside `frontend`; the pre-existing Git repository is inside `frontend`, so include the backend/root documentation in your chosen repository before publishing.

Implementation references: [Express security guidance](https://expressjs.com/en/advanced/best-practice-security/) and [Mongoose schema validation and indexes](https://mongoosejs.com/docs/api/schematype.html).
