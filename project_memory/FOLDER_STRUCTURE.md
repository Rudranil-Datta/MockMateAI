# V1 Folder Structure — AI-Powered Interview Preparation Platform

## Recommended Repository Layout

Use one repository containing a React client and a Node.js/Express server. This preserves the documented modular-monolith approach while keeping frontend and backend responsibilities easy to understand and deploy.

```text
MockMateAI/
├── client/                              # React frontend
│   ├── public/
│   ├── src/
│   │   ├── api/                         # HTTP client and endpoint wrappers
│   │   │   ├── authApi.js
│   │   │   ├── resumeApi.js
│   │   │   ├── interviewApi.js
│   │   │   └── analyticsApi.js
│   │   ├── components/                  # Reusable presentational/UI components
│   │   │   ├── common/
│   │   │   ├── auth/
│   │   │   ├── interviews/
│   │   │   ├── feedback/
│   │   │   └── dashboard/
│   │   ├── context/                     # Auth/global UI state where needed
│   │   ├── hooks/                       # Reusable React hooks
│   │   ├── layouts/                     # Shared page layouts/navigation
│   │   ├── pages/                       # Route-level screens
│   │   │   ├── LoginPage.jsx
│   │   │   ├── SignupPage.jsx
│   │   │   ├── InterviewSetupPage.jsx
│   │   │   ├── InterviewSessionPage.jsx
│   │   │   ├── FeedbackPage.jsx
│   │   │   ├── ResumePage.jsx
│   │   │   └── DashboardPage.jsx
│   │   ├── routes/                      # Route declarations/protected routes
│   │   ├── utils/                       # Pure formatters and UI helpers
│   │   ├── styles/                      # Global styles, tokens, and themes
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env.example
│   ├── package.json
│   └── vite.config.js                   # Or the chosen React build config
│
├── server/                              # Node.js + Express backend
│   ├── src/
│   │   ├── config/                      # Environment/config validation, DB setup
│   │   │   ├── env.js
│   │   │   └── db.js
│   │   ├── controllers/                 # Request/response orchestration
│   │   │   ├── authController.js
│   │   │   ├── resumeController.js
│   │   │   ├── interviewController.js
│   │   │   └── analyticsController.js
│   │   ├── middlewares/                 # Auth, validation, upload, error handling
│   │   │   ├── requireAuth.js
│   │   │   ├── validateRequest.js
│   │   │   ├── upload.js
│   │   │   └── errorHandler.js
│   │   ├── models/                      # MongoDB/Mongoose schemas
│   │   │   ├── User.js
│   │   │   ├── Resume.js
│   │   │   └── InterviewSession.js
│   │   ├── routes/                      # Express route definitions
│   │   │   ├── authRoutes.js
│   │   │   ├── resumeRoutes.js
│   │   │   ├── interviewRoutes.js
│   │   │   └── analyticsRoutes.js
│   │   ├── services/                    # Business logic and external integrations
│   │   │   ├── authService.js
│   │   │   ├── resumeService.js
│   │   │   ├── interviewService.js
│   │   │   ├── feedbackService.js
│   │   │   ├── analyticsService.js
│   │   │   ├── openaiService.js
│   │   │   └── transcriptionService.js
│   │   ├── validators/                  # Request schemas and AI-output validation
│   │   │   ├── authSchemas.js
│   │   │   ├── interviewSchemas.js
│   │   │   └── feedbackSchema.js
│   │   ├── utils/                       # Errors, safe logging, common helpers
│   │   ├── app.js                       # Express app composition
│   │   └── server.js                    # Process startup
│   ├── tests/
│   │   ├── integration/
│   │   └── unit/
│   ├── .env.example
│   └── package.json
│
├── docs/                                # Project documentation (optional organization)
│   ├── PROJECT_CONTEXT.md
│   ├── SYSTEM_ARCHITECTURE_AND_DESIGN.md
│   ├── SUCCESS_CRITERIA.md
│   ├── DATA_FLOW.md
│   ├── DATABASE_DESIGN.md
│   ├── API_DESIGN.md
│   └── FOLDER_STRUCTURE.md
│
├── README.md                             # Setup, run, test, and deployment guide
├── .gitignore
└── package.json                          # Optional root scripts/workspace configuration
```

## Responsibility Boundaries

| Location | Owns | Must not own |
| --- | --- | --- |
| `client/src/pages` | Route-level screen composition and user flow | Database access, secrets, OpenAI calls |
| `client/src/api` | Frontend request/response wrappers | Business rules duplicated from backend |
| `client/src/components` | Reusable UI rendering and local interaction | Direct backend/database logic |
| `server/src/routes` | Map HTTP method/path to middleware and controller | Substantial business logic |
| `server/src/controllers` | Translate validated HTTP request to service call and response | OpenAI prompts, database queries scattered across handlers |
| `server/src/services` | Interview orchestration, feedback, analytics, integrations | HTTP-specific response formatting |
| `server/src/models` | MongoDB schema, document validation, indexes | UI/HTTP behavior |
| `server/src/middlewares` | Cross-cutting auth, upload, validation, and error behavior | Feature-specific orchestration |
| `server/src/validators` | Request and AI-response shapes | Persistence side effects |

## Key File Responsibilities

### Frontend

- `api/interviewApi.js`: create a session, fetch next question, submit typed/voice answers, fetch and complete a session.
- `context/AuthContext.*`: expose the signed-in user and login/logout state to protected views.
- `pages/InterviewSetupPage.*`: select type, level, and optional resume.
- `pages/InterviewSessionPage.*`: show active question, answer input, voice capture, loading/retry state, and navigation.
- `components/feedback/*`: render validated feedback as scores, strengths, improvements, and recommended next step.
- `pages/DashboardPage.*`: render saved history and summary/trend data returned by the API.

### Backend

- `middlewares/requireAuth.*`: derive authenticated user identity and attach it to the request.
- `services/openaiService.*`: the only place that creates OpenAI clients or calls question/evaluation APIs.
- `services/transcriptionService.*`: validates/coordinates approved speech-to-text capability; returns usable text or a controlled error.
- `services/interviewService.*`: enforces session transitions, ownership checks, question limits, and persistence coordination.
- `services/feedbackService.*`: builds minimal evaluation context and validates structured feedback before saving.
- `validators/feedbackSchema.*`: rejects malformed AI output and out-of-range scores.
- `middlewares/errorHandler.*`: converts expected errors and unexpected failures into the API's safe standard error shape.

## Configuration and Secrets

Use `.env` files locally and deployment environment variables in hosted environments. Commit only `.env.example` files containing variable names and non-sensitive example values.

```text
# server/.env.example
PORT=5000
MONGODB_URI=
OPENAI_API_KEY=
AUTH_SECRET=
CLIENT_ORIGIN=http://localhost:5173
MAX_RESUME_SIZE_BYTES=
MAX_AUDIO_SIZE_BYTES=
```

The frontend may contain only public configuration, such as an API base URL. It must not contain `OPENAI_API_KEY`, `MONGODB_URI`, `AUTH_SECRET`, or any server credential.

## Test Layout

- Backend unit tests target services, validators, and model behavior.
- Backend integration tests exercise protected routes with a test database and mocked AI/transcription providers.
- Frontend tests target reusable components, API error states, and the key user journey.
- A small set of end-to-end tests should cover signup/login, text interview completion, dashboard history, and the limited voice path.

## Documentation Placement

The existing root-level Markdown documents may remain at the repository root while the project is being planned. Once implementation begins, moving them into `docs/` is recommended for a cleaner root. If moved, update README links in the same change.

## Avoid in V1

Do not create separate microservice repositories, a frontend OpenAI client, a dedicated analytics service, or elaborate infrastructure folders. The above layout is intentionally small enough for a two-month student project while preserving clean separation of concerns.
