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
│   │   │   ├── aiProviderService.js     # Provider selection and shared contract
│   │   │   ├── geminiProvider.js        # Gemini V1 adapter
│   │   │   ├── openaiProvider.js        # Optional future adapter; not required in V1
│   │   │   └── mockAiProvider.js        # Deterministic UI/test development adapter
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

| Location                 | Owns                                                          | Must not own                                           |
| ------------------------ | ------------------------------------------------------------- | ------------------------------------------------------ |
| `client/src/pages`       | Route-level screen composition and user flow                  | Database access, secrets, AI-provider calls            |
| `client/src/api`         | Frontend request/response wrappers                            | Business rules duplicated from backend                 |
| `client/src/components`  | Reusable UI rendering and local interaction                   | Direct backend/database logic                          |
| `server/src/routes`      | Map HTTP method/path to middleware and controller             | Substantial business logic                             |
| `server/src/controllers` | Translate validated HTTP request to service call and response | AI prompts, database queries scattered across handlers |
| `server/src/services`    | Interview orchestration, feedback, analytics, integrations    | HTTP-specific response formatting                      |
| `server/src/models`      | MongoDB schema, document validation, indexes                  | UI/HTTP behavior                                       |
| `server/src/middlewares` | Cross-cutting auth, upload, validation, and error behavior    | Feature-specific orchestration                         |
| `server/src/validators`  | Request and AI-response shapes                                | Persistence side effects                               |

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
- `services/aiProviderService.*`: the only place that creates Gemini clients or calls question/evaluation APIs. It exposes a provider contract so a future OpenAI adapter can be added without changing controllers or feature services.
- `services/geminiProvider.*`, `services/openaiProvider.*`, and `services/mockAiProvider.*`: adapters that implement the same `generateQuestion` and `evaluateAnswer` contract. Only `geminiProvider` and `mockAiProvider` are required for V1.
- `services/transcriptionService.*`: validates/coordinates approved speech-to-text capability; returns usable text or a controlled error.
- `services/interviewService.*`: enforces session transitions, ownership checks, question limits, and persistence coordination.
- `services/feedbackService.*`: builds minimal evaluation context and validates structured feedback before saving.
- `validators/feedbackSchema.*`: rejects malformed AI output and out-of-range scores.
- `middlewares/errorHandler.*`: converts expected errors and unexpected failures into the API's safe standard error shape.

## Configuration and Secrets

Use `.env` files locally and deployment environment variables in hosted environments. Commit only `.env.example` files containing variable names and non-sensitive example values.

```text
# server/.env.example
PORT=4444
MONGODB_URI=
OPENAI_API_KEY=
AI_PROVIDER=gemini
GEMINI_API_KEY=
AUTH_SECRET=
CLIENT_ORIGIN=http://localhost:5173
MAX_RESUME_SIZE_BYTES=
MAX_AUDIO_SIZE_BYTES=
```

The frontend may contain only public configuration, such as an API base URL. It must not contain `GEMINI_API_KEY`, `OPENAI_API_KEY`, `MONGODB_URI`, `AUTH_SECRET`, or any server credential.

## Test Layout

- Backend unit tests target services, validators, and model behavior.
- Backend integration tests exercise protected routes with a test database and mocked AI/transcription providers.
- Frontend tests target reusable components, API error states, and the key user journey.
- A small set of end-to-end tests should cover signup/login, text interview completion, dashboard history, and the limited voice path.

## Documentation Placement

The existing root-level Markdown documents may remain at the repository root while the project is being planned. Once implementation begins, moving them into `docs/` is recommended for a cleaner root. If moved, update README links in the same change.

## Avoid in V1

Do not create separate microservice repositories, a frontend AI-provider client, a dedicated analytics service, or elaborate infrastructure folders. The above layout is intentionally small enough for a two-month student project while preserving clean separation of concerns.

## V2 Structure

Component ownership follows the exact bounded resources and service boundaries
in [`V2_DAY1_CONTRACTS.md`](V2_DAY1_CONTRACTS.md). Planned filenames remain
non-authoritative until each implementation day inspects the current tree.

Keep the existing folders and responsibility boundaries. Add focused files only
inside them when the owning day is approved:

- Frontend pages/API wrappers/components for Job Targets, confirmed Projects,
  skill profile/recommendations, replay, and the upgraded interview cockpit.
- Backend routes/controllers/validators/services/models for Job Targets,
  Candidate Projects, adaptive decisions, skill evidence, and derived mastery.
- Provider adapters expose identical structured V2 methods; feature services do
  not import Gemini SDK types or perform HTTP response formatting.
- Shared interview services retain deterministic ownership, state,
  idempotency, question-cap, persistence, and completion control.

Do not create `agents/`, tool-execution, queue, microservice, graph-database, or
new infrastructure layers. Add a new dependency only after a concrete approved
need; the planned UI and analytics can use React, accessible HTML/SVG, and the
existing styling system.

### Day 2 implemented modules

```text
server/src/
  controllers/jobTargetController.js
  models/JobTarget.js
  routes/jobTargetRoutes.js
  services/jobTargetService.js
  validators/jobTargetSchemas.js
server/tests/
  integration/jobTargetRoutes.test.js
  unit/jobTargetProvider.test.js
  unit/jobTargetSchemas.test.js
```

Shared Day 2 extensions remain in `app.js`, `aiSchemas.js`,
`aiProviderService.js`, `mockAiProvider.js`, and `geminiProvider.js`. No new
top-level folder, client module, dependency, agent, queue, or service was added.

### Day 3 implemented modules

```text
client/src/
  api/projectApi.js
  pages/ProjectsPage.jsx
server/src/
  controllers/projectController.js
  models/CandidateProject.js
  routes/projectRoutes.js
  services/projectService.js
  validators/projectSchemas.js
server/tests/
  integration/projectRoutes.test.js
  unit/CandidateProject.test.js
  unit/projectProvider.test.js
  unit/projectSchemas.test.js
  unit/projectService.test.js
```

Focused client tests sit beside the new API/page. Day 3 also extends the
existing app/router, shell, styles, resume service, provider service/adapters,
and AI schemas. The documented modular folders were sufficient: no new
top-level folder, dependency, deployment module, agent, queue, or service was
needed.

### Day 4 implemented modules

Day 4 extends existing `InterviewSession`, interview service, AI schemas,
provider service/adapters, practice/result pages, and their focused tests. One
shared client validator was added at `client/src/utils/interviewQuestion.js` so
both active and replay screens enforce the same optional metadata group. No new
top-level folder, route, controller, collection, dependency, deployment module,
agent, queue, or service was needed.
