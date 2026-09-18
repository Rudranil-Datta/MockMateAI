# Day 1 Technical Decisions

## Selected baseline

| Area               | Decision                                                                                                                    | Reason                                                                                                          |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Runtime            | Node.js 22.16.0                                                                                                             | Installed LTS-compatible runtime.                                                                               |
| Package manager    | npm 10.9.2                                                                                                                  | Installed and simplest V1 default.                                                                              |
| Frontend           | React with Vite                                                                                                             | Fast, minimal React setup.                                                                                      |
| Backend            | Node.js with Express                                                                                                        | Required project stack.                                                                                         |
| Database           | MongoDB Atlas for development/deployment                                                                                    | Managed option; no local database dependency.                                                                   |
| Authentication     | Secure HttpOnly cookie session                                                                                              | Keeps browser credential inaccessible to JavaScript.                                                            |
| Backend testing    | Vitest with Supertest                                                                                                       | Fast unit/integration test path for Node/Express.                                                               |
| Frontend testing   | Vitest with React Testing Library                                                                                           | Matches Vite and component testing needs.                                                                       |
| End-to-end testing | Playwright                                                                                                                  | Covers required full user journey.                                                                              |
| AI provider        | Gemini Developer API for V1, behind an `aiProviderService` interface                                                        | Supports low-cost prototyping and an optional future OpenAI adapter without controller/UI changes.              |
| AI development     | Mock provider first, then Gemini integration                                                                                | Avoids cost/quota blockers before live key setup.                                                               |
| Provider contract  | `generateQuestion(input)` and `evaluateAnswer(input)` return common validated shapes                                        | Keeps SDK/prompt/model differences inside adapters and enables an OpenAI adapter without API/UI/schema changes. |
| Quota preservation | Caps, duplicate prevention, one controlled retry, short-lived compatible question cache, and per-user/IP/application limits | Reduces free-tier consumption without quota circumvention.                                                      |
| Quota notification | `429 AI_QUOTA_EXCEEDED`, immediate in-app notice, and safe server log                                                       | Preserves user work and gives an honest retry path; V1 excludes external alerts and key rotation.               |

## Future Storage Decision

**Status:** Deferred until deployment architecture is selected; local V1 development remains unchanged.

Resume PDFs currently use private local backend storage configured by `RESUME_UPLOAD_DIR`. That is suitable for a single persistent development backend. Before deploying to an ephemeral, serverless, or multi-instance host, introduce a small storage adapter with `store`, `read`, and `delete` operations and move files to private object storage.

- Prefer an object-storage service such as S3, Cloudflare R2, or Google Cloud Storage for private document retention and lifecycle controls. Cloudinary is an acceptable future option only when its private/authenticated raw-file delivery and deletion controls meet the same requirements.
- Keep the existing stored `provider` and opaque `key` model; do not persist public URLs or user-supplied filenames.
- Keep provider credentials backend-only. Downloads, when required, must remain authorized through the API or use short-lived controlled URLs.
- If files exist at migration time, copy each object, update its provider/key only after a successful copy, verify authorized read/delete behavior, and retain a rollback path until the migration is checked.

This is a deployment/storage concern, not a reason to replace Multer: Multer remains the HTTP multipart parser at the API boundary, while the future adapter decides where accepted files are stored.

## Deferred Decisions

- Resume extraction provider: decide Week 5.
- Speech-to-text provider and audio retention: decide Week 6.
- Hosting provider: decide Week 7.

## Constraints

- Use Node 22 or newer compatible packages only.
- No secrets in repository. Use `server/.env` locally and deployment environment variables.
- MongoDB and Gemini credentials remain user-managed manual setup items. OpenAI credentials are not required for V1.
