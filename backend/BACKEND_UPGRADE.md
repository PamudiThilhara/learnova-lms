# Learnova backend upgrade

## Scope and inspection

This upgrade extends the existing Express/Mongoose backend. It does not replace the backend, change frontend files, overwrite `backend/.env`, change MongoDB credentials, migrate collections, seed Atlas, or alter existing Atlas documents. No commit or push was performed.

The existing PDF quiz module and its `AiDocument`, `AiQuiz`, and `AiAttempt` models were reused. No parallel AI implementation, additional AI feature, or unnecessary endpoint was added.

Implementation plan:

1. Audit the frontend API calls against existing routes and authorization.
2. Repair the identified quiz validation, timing, history, and PDF isolation gaps while preserving response compatibility.
3. Run the existing LMS and new regression tests, check live configuration/connectivity safely, and compare preservation checksums.

## Existing API integration audit

The frontend uses `frontend/lib/api.ts`, HTTP-only session cookies, `credentials: include`, and the `X-Learnova-Request` header. `LearnovaProvider` loads real data from `/api/state` and sends mutations to the existing routes. All inspected calls have matching backend routes; the frontend needed no edits.

| Frontend workflow | Existing API paths under `/api` | Authorization |
| --- | --- | --- |
| Registration / login / logout | `POST /auth/register`, `/auth/login`, `/auth/logout` | Registration permits students and instructors, never self-assigned admin |
| Current user / profile | `GET/PATCH /auth/me` | Authenticated user; editable fields validated |
| Password recovery | `POST /auth/forgot-password`, `/auth/reset-password` | Existing expiring single-use token flow; requires SMTP for delivery |
| Dashboards / community data | `GET /state` | Public course metadata; private learning/users/activity scoped to the caller's role |
| Catalog / search / details | `GET /courses`, `/courses/:id` | Public published content; quiz answer keys redacted for learners |
| Course and lesson management | `POST /courses`, `PUT/DELETE /courses/:id` | Instructors own their courses; administrators have platform access |
| Enrollment / completion | `POST /courses/:id/enrollments`, `PUT /courses/:id/lessons/:lessonId/completion` | Student, with enrollment and valid lesson checks |
| Existing course quizzes | `POST /courses/:id/quiz-attempts` | Enrolled student; backend scoring and post-submission review |
| Assignment / grading | `PUT /courses/:id/submission`, `PATCH /courses/:id/submissions/:userId/grade` | Student submission; course owner/admin grading |
| Attachment / certificate | `GET /courses/:id/submissions/:userId/attachment`, `/courses/:id/certificate` | Ownership/course permissions; certificate eligibility checked on backend |
| Admin management | `PATCH /admin/users/:id/status`, `DELETE /admin/users/:id`, `PUT /admin/settings` | Admin only; protected administrator accounts and session revocation retained |
| Admin support / contact | `GET /admin/contact-messages`, `POST /contact-messages` | Admin reads; validated/rate-limited contact submission |
| Development sample restoration | `POST /admin/sample-data` | Existing admin/development/explicit-enable gates; never invoked against Atlas during this work |

Existing models remain `User`, `Course`, `Enrollment`, `QuizAttempt`, `Submission`, `Session`, `Setting`, `Activity`, and `ContactMessage`, plus the previously implemented AI models. Existing controllers, role middleware, JWT validation, session revocation, course ownership, enrollment rules, assessment scoring, and certificates were preserved.

## PDF quiz module and changes

The existing workflow supports PDF upload, configuration, Gemini generation, explicit quiz start, saved answers, refresh restoration, manual submission, automatic expiration, scoring, results/review, and private history. Configurations remain 5/10/20/30 questions, Easy/Medium/Hard, and 5/10/15/30 minutes.

Changes made in this upgrade:

- **Insufficient content:** a conservative preflight rejects notes with fewer than 10 words per requested question or fewer than `max(20, 3 × questionCount)` distinct words. This is a minimum-input check, not a claim that word count proves semantic sufficiency. Gemini can now explicitly return `insufficientContent: true` with an empty question list. The API returns HTTP 422 asking for fewer questions or more detailed notes, rather than forcing the model to pad a quiz.
- **Validated output:** questions still require four distinct options, one integer answer index, an explanation, and a source quote found in the notes. Choice comparison now normalizes Unicode, zero-width characters, case, and whitespace. Duplicate question checks also ignore numbering prefixes and punctuation. The prompt prohibits reworded duplicates and outside facts. Structural validation and matching quotes cannot guarantee factual correctness; AI output should still be reviewed against the document.
- **Private PDF processing:** only the PDF bytes are sent to a separate parser process. Its environment now contains only required OS/runtime paths and locale settings; it does not inherit database, JWT, SMTP, AI keys, or `NODE_OPTIONS`. Parser logs remain suppressed. Actual PDF parsing, 10 MB/100 page limits, memory/timeout/concurrency bounds, disabled PDF evaluation, and scanned/corrupt PDF errors are retained.
- **Database-clock submission:** manual and automatic finalization atomically freeze answers and set submission time using MongoDB `$$NOW`, capped at the stored deadline. Late edits already use the same database clock. A caller cannot backdate a result, extend time, submit trusted marks, or modify a completed attempt.
- **Scoring:** existing persisted correct/incorrect/unanswered counts, total, percentage, and time taken are retained. Submitted responses now also expose compatible `marks` and `maxMarks` aliases. No new stored fields or data migration are needed.
- **History:** metadata for every quiz referenced by the current attempt page is included, even if that quiz is older than the latest 100 generated quizzes. This fixes generic/missing titles in long histories without changing the frontend contract. Ownership and answer-key redaction remain enforced.
- **Expiration recovery:** one missing source quiz no longer stops other due attempts from being processed or prevents loading other history records. A missing quiz still produces a clear 404 when that individual attempt is opened; no missing answer key or score is fabricated. The existing restart recovery for frozen grading attempts remains intact.
- **Health:** `GET /api/health` now performs a bounded database ping. A stale connected-driver flag cannot produce a successful health response if MongoDB is unavailable. The existing JSON shape is preserved.

## AI endpoints and storage

All AI routes remain under `/api/ai-quizzes` and require an authenticated student. Instructors and administrators do not gain access to another student's private AI documents or attempts.

| Method | Existing path | Purpose |
| --- | --- | --- |
| GET | `/status` | Provider configured flag and PDF limits; never a secret value |
| GET / POST | `/documents` | Own document metadata / validated PDF upload |
| GET | `/documents/:id` | Own document metadata |
| POST | `/documents/:id/generate` | Rate-limited, owner-scoped generation with a temporary lock |
| GET | `/quizzes/:id` | Own generated quiz metadata |
| POST | `/quizzes/:id/attempts` | Idempotent start/resume using UUID `requestId` |
| GET | `/attempts/:id` | Saved answers and questions; explanations/correct answers only after submission |
| PATCH | `/attempts/:id/answers` | Save `{ questionIndex, answer }` before the database deadline |
| POST | `/attempts/:id/submit` | Empty-body, idempotent submission of saved answers |
| GET | `/history?page=1` | Private paginated attempts and required quiz metadata |

`AiDocument` retains owner-scoped metadata, hash, and private extracted text. Original PDF bytes are processed temporarily, not exposed through a public upload directory or retained unnecessarily. `AiQuiz` keeps questions/answer keys private by default. `AiAttempt` keeps start/deadline/submission timestamps, saved choices, status, counts, percentage, and time taken. Existing unique indexes protect upload deduplication, start-request idempotency, and one active attempt per user/quiz. Existing collections and indexes were not dropped or rebuilt.

## Files changed

- `backend/app.js`: real database-ping health check.
- `backend/services/ai-question-generator.js`: content sufficiency protocol/preflight and stronger validation.
- `backend/services/ai-attempts.js`: database-clock freeze, explicit owner filtering, and independent expiration processing.
- `backend/services/pdf-text.js`: restricted parser environment.
- `backend/routes/ai-quizzes.js`: content preflight, compatible scoring aliases, and historical quiz metadata.
- `backend/test/ai-quiz.test.js`, `backend/test/api.test.js`: regression coverage.
- `backend/test/helpers/ai-questions.js`, `backend/scripts/test-server.js`: distinct grounded questions for explicitly isolated tests only. Production `server.js` never imports or enables this provider double.
- `backend/BACKEND_UPGRADE.md`: this audit and handoff.

No frontend file, backend environment file, credential, dependency, or database model definition was changed by this upgrade.

## Verification performed

- Baseline suite before the upgrade: **29 tests passed**.
- Upgraded backend suite: **40 tests passed**, including the original registration/login/JWT/role boundaries, dashboards, search, course editing, enrollment, lessons/progress, assessments/scoring, assignments/grading, certificates, profile, blocking/unblocking, and record-preserving database tests.
- AI tests cover real searchable PDF extraction; corrupted/scanned/spoofed/oversized PDF rejection; student ownership; all advertised configuration values; duplicate questions/options; source quotes; insufficient notes before provider calls and explicit provider insufficiency; lock release; private subprocess environment; answer hiding; start/submission races; refresh persistence; database deadlines; stored scoring/history; older quiz metadata; and interrupted/orphaned expiration recovery.
- Automated tests use isolated temporary MongoDB instances. Provider HTTP responses and email delivery are test doubles only; production data was not replaced by fixtures.
- Live Atlas read-only connection/ping was attempted with the existing credentials and TLS validation. It failed during secure connection establishment. Therefore live Atlas startup/connectivity is **not verified** by this run. The probe did not create collections, indexes, or records.
- The live AI check was run and correctly reported a missing `GEMINI_API_KEY`. No successful real-Gemini generation is claimed. SMTP is also unconfigured.
- All **125 frontend files** matched their original checksums with no added or removed files, and `backend/.env` matched its original checksum. No frontend build or redesign was needed for this backend-only change.

## Manual setup and run commands

### 1. Resolve the live Atlas connection

In Atlas, use your existing **Project 0 / Cluster0**. Confirm the cluster is active, the backend computer's current public IP is allowed in **Network Access**, and `learnova_user` has `readWrite` on `learnova` with no collection restriction. Use **Add Current IP Address** if an entry is needed; do not open access to all addresses. If a secure connection still fails, check the machine clock, trusted certificates, firewall/VPN, and TLS inspection. Keep TLS and certificate validation enabled. No credential reset is indicated by a failure before authentication.

### 2. Configure Gemini on the backend

Obtain a key from [Google AI Studio](https://aistudio.google.com/apikey) and provide it through the backend runtime environment. `GEMINI_MODEL` is optional and defaults to `gemini-3.5-flash-lite`; choose an available supported model for your account. Do not put keys in frontend code or a `NEXT_PUBLIC_` variable.

PowerShell example that does not display the key or put its value in command history:

```powershell
Set-Location C:\pamudi\smartlearn-lms
$learnovaAiKey = Read-Host 'Gemini API key' -AsSecureString
$env:GEMINI_API_KEY = [System.Net.NetworkCredential]::new('', $learnovaAiKey).Password
npm.cmd --prefix backend run check:ai -- "C:\path\to\lecture.pdf"
npm.cmd run dev:backend
```

The live AI check sends that PDF's extracted text to Gemini, validates five questions, and prints no private document contents or answer keys. It does not write database records. Real-provider testing must be completed after configuration.

### 3. Start and test

From the project root:

```powershell
npm.cmd --prefix backend test
npm.cmd run dev:backend
```

In a second terminal, run the existing frontend unchanged:

```powershell
Set-Location C:\pamudi\smartlearn-lms
npm.cmd run dev:frontend
```

Frontend: `http://localhost:3000`. API: `http://localhost:4000/api`. Health: `http://localhost:4000/api/health`; HTTP 200 now requires a successful real MongoDB ping.

Password-recovery email requires the existing SMTP environment settings shown in `backend/.env.example`. Normal authentication and learning do not require SMTP.

References: [Gemini GenerateContent API](https://ai.google.dev/api/generate-content), [MongoDB update pipelines and database timestamps](https://www.mongodb.com/docs/manual/tutorial/update-documents-with-aggregation-pipeline/), [Mongoose findOneAndUpdate](https://mongoosejs.com/docs/api/model.html#Model.findOneAndUpdate()).
