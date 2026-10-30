# Learnova dark redesign and AI PDF quiz generator

Implemented locally on October 30, 2026. No commit, push, or deployment was performed. `backend/.env` was not edited; its checksum was checked before and after implementation. Existing Atlas credentials, JWT secret, records, and supplied images were preserved.

## Project inspection

- Frontend: Next.js 16.3.5 App Router, React 19, TypeScript, Tailwind CSS 4, and Lucide icons. No framework migration.
- Shared presentation: `Header`, `Footer`, `DashboardShell`, `AuthForm`, `CourseCard`, `CourseWorkspace`, dashboard views, and course/assessment editors.
- Existing frontend state comes from `/api/state` through `LearnovaProvider`. Mutations continue to call the original Express APIs; production data was not replaced with local samples.
- Backend: Express 5, Mongoose 9, MongoDB database `learnova`, HTTP-only JWT-backed sessions, role middleware, and per-request origin/CSRF checks.
- Students can enroll, complete lessons, take course quizzes, submit assignments, and obtain eligible certificates. Instructors manage their own courses and their enrolled students. Administrators manage platform records. Registration continues to accept student/instructor roles only.
- Instructor quiz answers remain hidden from students until submission. Certificates still require all lessons, a course quiz score of at least 70%, and an assignment submission verified by the backend.
- Existing lessons contain text and exercises, not playable video sources. These were preserved; the redesign does not present an illustration as a functioning video player.
- No PDF upload, AI question generation, timed AI attempts, or AI quiz history existed before this change.

## Pages redesigned

The shared navy theme covers every existing route, including loading, error, 404, legal, and password-recovery pages.

- Home: supplied logo and hero illustration; “Learn Today. Build Tomorrow.” heading; course search; featured backend courses; categories; benefits; real community totals; PDF quiz introduction; About and Contact sections.
- Login and registration: supplied illustrations, dark forms, validation, show/hide password, existing Remember Me and role rules. Successful authentication now loads the destination with the newly issued session, avoiding a dashboard-guard navigation race.
- Forgot password: explicitly states that recovery depends on configured email delivery and displays backend errors rather than claiming that unconfigured email works.
- Student dashboard, courses, assignments, quizzes, progress, and certificates: real learning metrics, welcome illustration, progress cards, recent activities, and responsive workspace navigation.
- Catalog, course details, lesson pages, instructor quizzes, course quiz review, assignments, and printable certificates retain their existing APIs and behavior.
- Profile: existing edit/upload behavior plus enrollment, completion, progress, and certificate links.
- Instructor overview, course creation/editing, lesson and assessment editors, students, grading, and performance views.
- Admin overview, users, student/instructor accounts, blocking/unblocking, courses, reports, settings, and a read-only enrollment/progress view at `/admin-dashboard/enrollments`. Existing enrollment data is used; no enrollment mutation API was invented.
- About, Contact, Terms, and Privacy use the same design. Privacy now explains the AI document flow.

## New components and image handling

- `Artwork`: contained, aspect-ratio-preserving illustration frames.
- `CourseImage`: preserves uploaded/custom thumbnails and provides a fallback for obsolete or failed image paths, without editing stored course records.
- `lib/assets.ts`: central manifest using the exact supplied filenames.
- `QuizGenerator.tsx`: upload, configuration, generation/loading, ready, timed attempt, results, and history components.
- `lib/ai-quiz.ts`: shared quiz types, route constants, and MM:SS formatting.
- Existing shared panels, buttons, form fields, tables, badges, navigation, focus styles, and progress bars were redesigned.

All 20 supplied PNGs were inspected. They are opaque images, including some with light edges. Their original files were not modified or stretched.

| Asset | Use |
| --- | --- |
| `01_learnova_logo.png` | Header/footer branding |
| `02_home_hero.png` | Home hero |
| `03_courses.png` | Catalog and legacy-thumbnail fallback |
| `04_login.png`, `05_signup.png` | Authentication illustrations |
| `06_course_learning.png` | Learning workspace and About introduction |
| `07_quiz.png` | Course assessments and PDF quiz screens |
| `08_certificate.png` | Certificate overview and eligibility screen |
| `09_student_dashboard.png` | Student welcome |
| `10_instructor.png`, `11_admin.png` | Role dashboard welcome panels |
| `12_profile_avatar.png` | Clearly labeled default profile illustration |
| `13_background.png` | Subtle home background |
| `14_course_icon.png` through `19_instructor_icon.png` | Platform-benefit cards |
| `20_settings_icon.png` | Admin settings |

## AI PDF quiz workflow

1. Upload a text-based PDF, up to 10 MB and 100 pages.
2. Extraction runs in a separate Node process with a timeout, limited V8 heap, suppressed library logs, and a three-process concurrency limit. PDF JavaScript evaluation is disabled. Empty/scanned, encrypted, damaged, and oversized documents receive useful errors. OCR is not included.
3. Store owner-scoped document metadata, a content hash, and extracted text. Original PDF bytes are processed temporarily and are not retained. Reuploading the same bytes reuses the owner's document.
4. Choose 5/10/20/30 questions, Easy/Medium/Hard, and 5/10/15/30 minutes. The student explicitly agrees to send extracted text to Gemini before generation.
5. Gemini returns structured JSON. The backend validates exact question count, distinct questions, four distinct options per question, one correct-answer index, an explanation, and a supporting quote present in the extracted text. Invalid, incomplete, blocked, unavailable, or quota-limited responses are rejected. No production hardcoded-question fallback exists.
6. The countdown begins only when Start Quiz is pressed. Start time and deadline are backend-generated and stored in MongoDB. Repeated/concurrent start requests reuse an active attempt.
7. Answers save to the backend as the student navigates. Refresh restores answers and the original deadline. Failed saves are visible and retryable. The browser uses a monotonic clock synchronized to server time; changing the browser clock does not extend the database deadline.
8. MongoDB rejects saves after its deadline using `$$NOW`. A backend sweep finalizes expired attempts, including closed browser tabs, and reads also settle expired attempts. Frozen grading attempts can recover after a process restart.
9. Manual and timed submissions atomically freeze saved answers. Concurrent/retried submissions return the same persisted result. Clients cannot supply trusted scores or change an ended attempt.
10. Results show points, percentage, correct/incorrect/unanswered counts, elapsed time, answer review, explanations, and supporting quotes. History supports review, resume, retake, and generating another quiz from the same PDF. An existing quiz retake uses the same questions; generate again for new questions.

AI questions can still contain factual or interpretive errors. A matching source quote validates grounding, not semantic correctness. The UI tells students to verify explanations against their notes. No chatbot, planner, summarizer, flashcards, or gamification was added.

## API additions

All routes below are under `/api/ai-quizzes`, require an authenticated **student**, enforce ownership, use existing cookies/CSRF/origin checks, and return no extracted text or answer key before submission.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/status` | Provider availability and upload limits; no key value |
| GET / POST | `/documents` | List own metadata / upload PDF |
| GET | `/documents/:id` | Own document metadata |
| POST | `/documents/:id/generate` | Generate and validate a quiz; upload/generation are rate limited |
| GET | `/quizzes/:id` | Own quiz configuration |
| POST | `/quizzes/:id/attempts` | Start or resume; UUID `requestId` makes retries safe |
| GET | `/attempts/:id` | Resume/questions or submitted result/review |
| PATCH | `/attempts/:id/answers` | Save `{ questionIndex, answer }`; no late saves |
| POST | `/attempts/:id/submit` | Idempotently submit saved answers; empty body |
| GET | `/history?page=1` | Paginated attempts and recent generated quizzes |

The original course assessment endpoints are unchanged.

## Database additions

- **AiDocument** (`aidocuments`): owner, filename, byte size, page/character counts, SHA-256, private extracted text, temporary generation lock. Unique owner/hash index.
- **AiQuiz** (`aiquizzes`): owner, document, configuration, title, provider model, private questions/answers/explanations/source quotes.
- **AiAttempt** (`aiattempts`): owner, quiz, idempotent start request, backend start/deadline/submission dates, saved answers, status, score counts, percentage, elapsed time, and timeout flag. Unique request index and a partial unique index for one active attempt per user/quiz.
- Added models participate in the existing startup collection/index setup. Existing user deletion also cleans up that user's AI records.

## Files changed or added

| Area | Files |
| --- | --- |
| Shared frontend design | `frontend/app/globals.css`, `frontend/app/layout.tsx`, `frontend/components/ui/index.tsx`, `frontend/components/Header.tsx`, `Footer.tsx`, `layout/Brand.tsx`, `layout/DashboardShell.tsx`, `auth/AuthForm.tsx`, `CourseCard.tsx` |
| Existing views | `frontend/app/page.tsx`, `about/page.tsx`, `contact/page.tsx`, `courses/page.tsx`, `forgot-password/page.tsx`, `profile/page.tsx`, `privacy/page.tsx`, `terms/page.tsx`, `error.tsx`, `global-error.tsx`, `not-found.tsx`; `components/courses/CourseWorkspace.tsx`; `components/dashboard/{StudentViews,InstructorViews,AdminViews,CourseEditor,AssessmentEditor}.tsx`; `data/courses.ts` |
| New shared assets | `frontend/lib/assets.ts`, `frontend/components/ui/Artwork.tsx`, `frontend/components/courses/CourseImage.tsx` |
| New AI frontend | `frontend/lib/ai-quiz.ts`, `frontend/components/ai-quiz/QuizGenerator.tsx`, `frontend/app/student-dashboard/ai-quizzes/page.tsx`, `documents/[id]/page.tsx`, `quizzes/[id]/page.tsx`, `attempts/[id]/page.tsx`, `attempts/[id]/results/page.tsx`, `history/page.tsx` |
| New enrollment view | `frontend/app/admin-dashboard/enrollments/page.tsx` |
| New AI backend | `backend/models/ai-quiz.js`, `backend/routes/ai-quizzes.js`, `backend/services/{pdf-text,pdf-worker,ai-question-generator,ai-attempts}.js`, `backend/scripts/check-ai-quiz.js` |
| Backend integration | `backend/models/index.js`, `backend/routes/index.js`, `backend/app.js`, `backend/server.js`, `backend/controllers/admin.js`, `backend/.env.example`, `backend/package.json`, `backend/package-lock.json` |
| Verification | `backend/test/ai-quiz.test.js`, `backend/test/helpers/lecture-pdf.js`, `backend/scripts/test-server.js`, `frontend/scripts/verify-ai-quiz.mjs`, `frontend/scripts/verify-frontend.mjs` |
| Documentation | `REDESIGN.md`, root `README.md` |

`pdf-parse` was added. Upload/request-parser dependencies were updated to compatible patched versions; the backend installation audit reported zero vulnerabilities. No frontend dependency was added. Alternate Next.js test builds may update generated type includes; these are build-tool metadata, not application behavior.

## Tests actually executed

- **Backend suite: 29 passing tests.** Includes original authentication/registration/role boundaries, courses, enrollment, lesson completion, course assessments, assignments/grading, certificates, profiles, blocking, recovery using an injected test mailer, and record-preserving connection verification.
- **New AI tests:** real searchable PDF extraction; empty/scanned and corrupt PDF rejection; student/owner access; deduplication; invalid configuration and AI output rejection; hidden answer keys; concurrent start/submission; answer refresh persistence; server-only scores; deadline rejection; expired-attempt sweep; interrupted-grading recovery; private histories; Gemini request structure and sanitized failure handling with an injected provider double.
- **Frontend production build and TypeScript:** passed.
- **Browser regression:** 13 checks passed across 39 existing routes, including actual register/enroll/complete-lesson/quiz/assignment/certificate/profile/instructor/admin workflows against an isolated MongoDB instance. Desktop and 390-pixel mobile layouts and navigation were checked.
- **AI browser suite:** 7 checks passed with a real local PDF and an explicitly isolated test-provider double. Covered upload, configuration/loading, answer navigation, reload/deadline persistence, answer hiding, manual submission/results, mobile views/navigation, history, retake, and a full **real five-minute countdown and automatic submission**.
- **Images:** all 20 supplied assets returned HTTP 200 and valid PNG bytes. Screenshots were visually inspected.
- **Final UI smoke checks:** the new admin enrollment table rendered real isolated-test records, and enrollment/settings/profile/login/recovery pages passed mobile overflow checks after the final source changes.
- **Live Atlas:** attempted using the unchanged `.env`. The earlier collection-scope role error is now fixed in Atlas: `learnova_user` has `readWrite` on database `learnova`. Today's connection fails before authentication with a TLS internal alert (alert 80), so live Atlas connectivity/startup is **not verified**. No TLS bypass or credential change was made.
- **Live Gemini:** `check:ai` was executed and correctly reported that the API key is missing. No real-provider generation succeeded or is claimed. SMTP delivery is also unconfigured; only the injected test mailer was tested.
- The old `verify:design` command asserts preservation of the former light design and is intentionally inapplicable to this requested full redesign; it was not used as a pass criterion.

Screenshots and the test certificate are in `.runtime/verification/`: `dark-home-desktop.png`, `dark-home-mobile.png`, `ai-mobile.png`, `ai-timed-quiz.png`, and `certificate.pdf`. These are isolated-test artifacts, not production data.

## Remaining manual configuration

### MongoDB Atlas

1. In Atlas, select **Project 0** and confirm **Cluster0** is active.
2. In **Network Access**, use **Add IP Address > Add Current IP Address** for the computer running the backend if its current public IP is missing. Keep access limited to the needed IP; do not allow all addresses. An optional third-party public-IP lookup was rejected by automatic approval review, so use Atlas's own screen.
3. Confirm **learnova_user** has **readWrite** on **learnova**, with the Collection field entirely empty. This privilege is currently correct; no password reset is indicated by the observed TLS error.
4. If TLS still fails, check the local clock, OS trust store, firewall/VPN, and network TLS inspection. Test on an authorized network that permits Atlas connections. Keep TLS and certificate validation enabled.
5. Run `npm.cmd --prefix backend run check:db`, then start the backend. A successful check prints PASS; a running backend's `/api/health` reports connected.

### Gemini

Create a Gemini API key in [Google AI Studio](https://aistudio.google.com/apikey), enable access/quota for a supported model, and provide it **only to the backend environment**. Optional names are documented in `backend/.env.example`; `backend/.env` was left untouched.

For the current PowerShell session, enter the key without adding it to command history or displaying it:

```powershell
Set-Location C:\pamudi\smartlearn-lms
$learnovaGeminiKey = Read-Host 'Gemini API key' -AsSecureString
$env:GEMINI_API_KEY = [System.Net.NetworkCredential]::new('', $learnovaGeminiKey).Password
$env:GEMINI_MODEL = 'gemini-3.5-flash-lite'
npm.cmd --prefix backend run check:ai -- "C:\path\to\lecture.pdf"
npm.cmd run dev:backend
```

The live AI check sends that PDF's extracted text to Gemini and validates five generated questions without printing private contents or changing the database. A real-provider PDF test is still required after configuration. Never use a `NEXT_PUBLIC_` variable for the key.

The provider adapter follows [Gemini's GenerateContent API](https://ai.google.dev/api/generate-content) and uses a configurable model from the [official model list](https://ai.google.dev/gemini-api/docs/models). The parser uses the [pdf-parse API](https://github.com/mehmet-kozan/pdf-parse).

### Password recovery

SMTP is optional for normal learning/authentication. To enable email recovery, configure `SMTP_HOST`, `SMTP_FROM`, and the remaining delivery/authentication settings shown in `backend/.env.example` in the backend runtime environment. Real delivery was not verified.

## Run the application

Use Node.js 22 or later (Node 24 LTS is suitable for the PDF parser). From `C:\pamudi\smartlearn-lms`:

```powershell
npm.cmd --prefix backend install
npm.cmd --prefix frontend install
npm.cmd --prefix backend run check:db
npm.cmd run dev:backend
```

In a second terminal:

```powershell
Set-Location C:\pamudi\smartlearn-lms
npm.cmd run dev:frontend
```

Open `http://localhost:3000`. The default API is `http://localhost:4000/api`; health is `http://localhost:4000/api/health`. The PDF quiz pages are linked in the student sidebar.

For checks/builds:

```powershell
npm.cmd --prefix backend test
npm.cmd --prefix frontend run build
```

For isolated browser verification, never point the browser scripts at a production database. Start `backend/scripts/test-server.js` with `LEARNOVA_TEST_AI=1`, build/start an alternate frontend with `NEXT_PUBLIC_API_URL=http://localhost:4011/api` and `LEARNOVA_DIST_DIR=.next-qa` on port 3011, then run `frontend/scripts/verify-frontend.mjs` and `frontend/scripts/verify-ai-quiz.mjs`. The latter deliberately waits for a real five-minute timer. This test-only provider injection exists only in the isolated test-server script; production `server.js` always uses the configured real provider.
