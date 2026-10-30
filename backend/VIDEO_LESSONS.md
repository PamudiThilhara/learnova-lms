# Lesson videos

## Available now: YouTube

In Instructor Dashboard > My Courses > Create Course or Edit & Publish, open a lesson's
**Lesson Video** section. Paste an HTTPS YouTube watch, share, Shorts, live, or embed URL.
Save Draft, Publish Course, or Save Changes as appropriate. Each lesson can have one video.
Replace the URL to change the video. **Remove Video** clears it; save the course to apply
the removal. Neither action deletes the lesson or resets progress, quizzes, or submissions.

The student learning page displays the player above Lesson Notes. Students must enroll
before Learnova returns playback information. Course instructors and administrators can
preview it. A YouTube API key is not required. The selected video must allow embedding;
private, removed, age-restricted, or region-restricted videos may not play for all viewers.
An authorized viewer can open the same video on YouTube if embedding is unavailable.

YouTube itself is public/unlisted video hosting. Learnova's enrollment checks do not turn
an unlisted YouTube URL into a private, unshareable video. Use private object storage
with authenticated playback for confidential uploads.

## Data and authorization

- Optional embedded lesson reference: `video: { provider: 'youtube', videoId: '...' }`.
- Existing lessons need no migration. Video bytes are never stored in MongoDB.
- POST/PUT course APIs accept that reference, a validated `{ provider: 'youtube', url }`,
  or `video: null` to remove a video. Omitting `video` during an update preserves the
  existing reference, including when older clients edit a course or its assessments.
- Only the owning instructor or an administrator can modify a course or its videos.
- Public course/state responses expose `hasVideo`, not playback references. Owner/admin
  responses include the reference needed by the editor.
- `GET /api/courses/:id/lessons/:lessonId/video` requires a current session, visible course,
  valid lesson, and enrollment or course-owner/admin access. It returns a canonical
  player URL. URL parsing never fetches an instructor-supplied URL.
- HTTPS URLs use exact YouTube host allowlists and valid 11-character IDs. Arbitrary
  iframe HTML, direct-file URLs, unsupported providers, and raw/base64 videos are rejected.
- The player uses YouTube's privacy-enhanced embed host and an origin referrer policy.
  See [YouTube embedding](https://support.google.com/youtube/answer/171780) and
  [player requirements](https://developers.google.com/youtube/iframe_api_reference).

## MP4/WebM: unavailable until private storage is integrated

No storage credentials or video upload infrastructure were present during implementation.
The upload field is deliberately disabled. There is no working direct-upload endpoint,
storage adapter, or signed-upload/playback implementation in this release. Setting the
reserved variables below does **not** enable uploads. No file-upload success is simulated.

Suggested infrastructure: a private Amazon S3 bucket (or a compatible private service).
Prepare the following without replacing the existing backend/.env:

1. Create a dedicated private bucket and keep **Block Public Access** enabled. Enable
   encryption. Do not publish the bucket or use public-read object ACLs.
2. Choose the bucket region and name for `VIDEO_S3_REGION` and `VIDEO_S3_BUCKET`.
3. Grant the backend a scoped IAM role permitting access only to the lesson-video prefix.
   Local development can use `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and an optional
   `AWS_SESSION_TOKEN`. Keep these on the backend, never in NEXT_PUBLIC variables.
4. Configure bucket CORS for the exact frontend origins, the required upload/read methods,
   and signed request headers. Keep this separate from the Express API's existing CORS.
5. Complete and test the storage integration before enabling the input. It must authorize
   instructor/course ownership, issue short-lived upload grants, verify uploaded MP4/WebM
   container contents and actual object size, and bind confirmed objects to their lesson.
   A proposed initial limit is 100 MB per file; this is not an active upload limit today.
6. Issue short-lived private playback URLs only after enrollment/owner/admin checks. Store
   only private object identifiers and metadata in MongoDB. Replacements and removals
   must not delete other lessons or unrelated objects; use explicit orphan cleanup.

See [S3 presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html),
[private access](https://docs.aws.amazon.com/AmazonS3/latest/userguide/ShareObjectPreSignedURL.html),
and [S3 CORS](https://docs.aws.amazon.com/AmazonS3/latest/userguide/cors.html).

## Checks

Run `npm --prefix backend test` and `npm --prefix frontend run lint` from the project root.
Run `npm --prefix frontend run build` with the development server stopped, or use a separate
`LEARNOVA_DIST_DIR` for an isolated build. Tests use disposable MongoDB databases and never
seed or change Atlas records. YouTube availability and actual external playback depend on
the provider, network, browser, and the instructor's chosen video's embedding permissions.
