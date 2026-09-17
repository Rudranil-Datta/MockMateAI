# System Architecture & Design — Version 1

## Architecture goal

Deliver a complete AI-powered interview-practice web application in about two months using the technologies named in the synopsis. The design is intentionally a **modular monolith**: one React frontend, one Node/Express backend, one MongoDB database, and Gemini Developer API called by the backend for V1. A provider interface preserves optional future OpenAI integration without changing product flows. This is simpler to build, test, deploy, and explain in a final-year-project viva than microservices or container orchestration.

## System context

```text
User
  │ browser
  ▼
React.js frontend
  │ HTTPS / REST API
  ▼
Node.js + Express.js backend
  ├── MongoDB (users, resumes, interview sessions, answers, feedback)
  └── Gemini Developer API (V1 question generation and response evaluation)
```

The frontend never exposes an AI-provider API key. It sends requests only to the backend, which validates the user, persists relevant data, builds prompts, calls the configured provider, and returns validated results.

## V1 component design

```text
React.js frontend
├── Authentication pages
├── Interview setup and simulation screens
├── Resume upload screen
├── Answer input: text and voice capture
├── Feedback/result screen
└── Analytics dashboard

Node.js + Express.js API
├── Authentication module
├── Interview orchestration module
├── Resume analysis module
├── Speech/text analysis module
├── Feedback module
├── Analytics module
├── AI provider service (Gemini implementation for V1)
└── MongoDB data-access layer

MongoDB
├── users
├── resumes
├── interviewSessions
└── answers / feedback (embedded in a session or separate, as selected by the team)
```

## Six synopsis modules and V1 responsibilities

| Module                 | V1 responsibility                                                                                                                      |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| User Authentication    | Register, log in, maintain an authenticated session, and associate data with a user.                                                   |
| Interview Simulation   | Let the user select DSA, HR, or System Design; create a session; request questions; advance through a small, defined set of questions. |
| Speech & Text Analysis | Accept text answers and a simple voice-answer path; obtain usable text for evaluation, then evaluate the answer.                       |
| Resume Analysis        | Accept a resume, extract usable content, and use it as context for relevant questions.                                                 |
| Feedback System        | Return per-answer and/or end-of-session feedback, scores, strengths, weaknesses, and practical improvement suggestions.                |
| Analytics Dashboard    | Show past sessions, scores, interview type, date, and basic progress trends.                                                           |

## Core user flow and data flow

```text
1. User signs in
2. User selects interview type and optionally uses a resume
3. Frontend creates an interview session through the API
4. Backend loads permitted user/resume context and asks Gemini for a question
5. User submits a text answer or voice-derived text
6. Backend stores the answer and asks Gemini to evaluate it against the question/context
7. Backend stores structured feedback and returns it to the frontend
8. At completion, the dashboard reads the user's saved session history
```

For V1, feedback should be returned in a predictable structured shape, for example: overall score, accuracy, clarity, confidence, strengths, improvements, and a short next-step recommendation. This is an implementation decision to make UI rendering and analytics dependable; the synopsis requires the underlying feedback and scoring, not this exact format.

## API surface (pragmatic initial design)

| Method | Endpoint                        | Purpose                                               |
| ------ | ------------------------------- | ----------------------------------------------------- |
| POST   | `/api/auth/signup`              | Create an account.                                    |
| POST   | `/api/auth/login`               | Authenticate a user.                                  |
| GET    | `/api/auth/me`                  | Retrieve the signed-in user.                          |
| POST   | `/api/resumes`                  | Upload and save a resume for analysis.                |
| POST   | `/api/interviews`               | Create a DSA, HR, or System Design interview session. |
| POST   | `/api/interviews/:id/questions` | Generate or retrieve the next question.               |
| POST   | `/api/interviews/:id/answers`   | Submit an answer and receive feedback.                |
| POST   | `/api/interviews/:id/complete`  | Mark a session complete and calculate summary data.   |
| GET    | `/api/interviews/:id`           | Retrieve an interview session and results.            |
| GET    | `/api/analytics/summary`        | Retrieve the current user's dashboard data.           |

Endpoint names are implementation decisions, not synopsis requirements. The team may adjust them while preserving the same responsibilities.

## Data design

### `users`

- identity and login fields
- basic profile information needed for interview level/preferences
- timestamps

### `resumes`

- user reference
- original file metadata or controlled storage reference
- extracted text used for question context
- timestamps

### `interviewSessions`

- user reference
- interview type: `DSA`, `HR`, or `System Design`
- selected level and optional resume reference
- status: created, active, completed
- questions and submitted answers, or references to them
- feedback and scores
- start/completion timestamps

### `answers` (only if separate from sessions)

- session reference and question reference
- answer text; voice-file reference only when retained
- evaluation result and score dimensions
- timestamps

For a small V1, embedding a short interview's questions, answers, and feedback within `interviewSessions` is often simpler. A separate `answers` collection is appropriate only if it keeps code clearer or sessions are expected to grow substantially.

## AI provider integration design

The backend uses a single provider interface, implemented by Gemini for V1. It should have two main responsibilities:

1. Generate an appropriate question from interview type, chosen level, prior session context, and optional resume context.
2. Evaluate an answer against the question and return concise, structured feedback.

Practical safeguards:

- Keep API credentials in backend environment variables only.
- Limit resume context and session history sent to the model to what is needed for the current request.
- Validate API responses before saving or showing them.
- Handle failed or slow AI calls with a clear retry/error state in the UI.
- Use development limits on question generation and answer evaluation to control cost.
- Validate Gemini's structured response before persistence. An optional future OpenAI adapter must satisfy the same interface and validation contract before use.
- Keep Gemini free-tier use within configured request quotas. Send minimal or synthetic resume context during development because free-tier data handling may differ from paid services.

The exact Gemini model, prompts, scoring rubric, speech-to-text route, and file-storage provider are **implementation details to choose during development**. They should be selected for reliability, cost, quota, privacy, and the team's available access. OpenAI is an optional future provider, not a required deployment-time swap.

### Provider contract and switch strategy

Only `aiProviderService` may select or call an AI SDK. It exposes provider-neutral operations:

```text
generateQuestion({ interviewType, level, resumeContext, previousQuestions })
evaluateAnswer({ interviewType, level, question, answer })
```

Both the Gemini V1 adapter and an optional future OpenAI adapter must return the same validated question and feedback shapes. Provider-specific prompts, SDK objects, model identifiers, and raw responses must not escape the adapter. The selected adapter is controlled only by `AI_PROVIDER`; changing `gemini` to `openai` is permitted only after the OpenAI adapter passes the shared provider contract tests and deployed smoke tests.

### V1 quota-preservation and notification behavior

- Use a mock adapter for UI development and automated tests; reserve live Gemini requests for integration tests and demonstrations.
- Cap the defined V1 interview length, prevent duplicate question/evaluation submits, allow no more than one controlled transient retry, and use short-lived cached questions only for the same interview type and level.
- Enforce per-user, per-IP, and application-wide AI request limits before calling the provider.
- On provider quota exhaustion (`429 RESOURCE_EXHAUSTED`), do not switch keys or retry indefinitely. Preserve the active session, return the stable `AI_QUOTA_EXCEEDED` API error with retry guidance, log only safe operational metadata, and show an immediate in-app notice to the active user.
- V1 notification means in-app feedback plus safe server logs. Email, SMS, Slack, or other owner-alert integrations are future work unless separately approved.

## Voice-answer approach for V1

The synopsis requires voice and text analysis. The lowest-risk V1 design is:

1. Capture a short voice response in the browser.
2. Send it to the backend through a controlled upload endpoint.
3. Convert it to text using an approved speech-to-text capability.
4. Evaluate the resulting text through the same feedback pipeline used for typed answers.

The project should label the feedback honestly: it evaluates the submitted or transcribed response. It should not claim to measure advanced vocal emotion or make high-stakes judgments unless that capability is actually implemented and validated.

## Security and privacy baseline

- Protect authenticated API routes and ensure each user can access only their own resumes and sessions.
- Hash passwords; never store plain-text passwords.
- Validate input and uploaded file type/size.
- Keep Gemini/OpenAI keys and database connection strings out of frontend code and source control.
- Retain only the user data needed for the project demonstration and state how a user can remove a resume/session if that feature is implemented.

## Deployment approach

Deploy one frontend and one backend application, backed by a managed MongoDB instance. Use environment variables for configuration. A simple managed hosting setup is sufficient for V1; Docker, Kubernetes, message queues, separate AI services, and multi-region deployment are not required for the project goal.

## In scope for V1

- React-based user interface for the stated flow.
- Node/Express REST backend with MongoDB persistence.
- Account authentication.
- DSA, HR, and System Design interview selection.
- AI-assisted questions and response feedback through Gemini Developer API in V1.
- Text answers and a limited, working voice-answer path.
- Resume-informed questions.
- Saved interview results and a basic analytics dashboard.

## Out of scope for V1

- Company-specific interview packages and placement-platform integrations.
- Microservices, Kubernetes, event-driven infrastructure, and complex distributed systems.
- Live multi-user/video interviews, interviewer matching, proctoring, or anti-cheating systems.
- Payment systems, subscriptions, recruiting workflows, or job placement guarantees.
- Extensive question-bank administration, native mobile apps, or advanced gamification.
- Claims of perfect evaluation, emotional diagnosis, or automated hiring decisions.

## Suggested two-month implementation order

1. Establish repository, React UI shell, Express API, MongoDB connection, and authentication.
2. Build the core text interview flow end to end: type selection, question, answer, AI feedback, saved session.
3. Add resume upload/extraction and use its text as bounded question context.
4. Add dashboard history and simple score summaries.
5. Add the limited voice-answer route, error handling, validation, and final testing/demo data.

This ordering protects the essential demo flow first. Voice and visual refinement should not delay the core ability to complete an interview, receive feedback, and review results.

## Requirement traceability

| Synopsis requirement          | Design response                                                                                                                          |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| React.js frontend             | React browser application.                                                                                                               |
| Node.js + Express.js backend  | Single REST API backend.                                                                                                                 |
| MongoDB database              | Stores user, resume, session, answer, feedback, and analytics data.                                                                      |
| OpenAI APIs named in synopsis | Gemini Developer API is the backend-only V1 provider; an optional OpenAI adapter may be added later through the same provider interface. |
| DSA, HR, System Design        | Interview-type selection in session creation.                                                                                            |
| Voice + text analysis         | One shared feedback pipeline with typed or transcribed answer text.                                                                      |
| Resume-based questions        | Resume extraction/context at interview setup.                                                                                            |
| Feedback and analytics        | Stored structured feedback and dashboard summaries.                                                                                      |
