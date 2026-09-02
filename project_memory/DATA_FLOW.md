# V1 Data Flow — AI-Powered Interview Preparation Platform

## Purpose

This document describes how user, resume, interview, answer, feedback, and analytics data moves through the Version 1 application. V1 uses a modular monolith: a React frontend communicates with one Node.js/Express API, which owns MongoDB access and all OpenAI API calls.

## System Boundary

```text
User
  │ browser input: credentials, settings, resume, text/audio answer
  ▼
React frontend
  │ authenticated HTTPS requests
  ▼
Node.js + Express API
  ├── MongoDB: persistent application data
  └── OpenAI APIs: question generation, transcription (if used), answer evaluation
```

The frontend does not connect directly to MongoDB or OpenAI. API credentials and database connection details remain on the backend.

## Core Data Objects

| Object | Created from | Stored data | Primary owner |
| --- | --- | --- | --- |
| User | Signup form | identity, hashed password, profile/level preferences, timestamps | The authenticated user |
| Auth session/token | Successful login | token/session metadata necessary to authenticate requests | The authenticated user |
| Resume | Resume upload | user reference, file metadata/storage reference, extracted text, timestamps | The uploading user |
| Interview session | Interview setup | user reference, type, level, optional resume reference, status, timestamps, questions, answers, feedback, scores | The creating user |
| Question | AI generation or supported fallback | prompt context/result, order, interview session reference | The session owner |
| Answer | Text input or voice transcription | answer text, optional voice-file reference, timestamps, question/session reference | The session owner |
| Feedback | AI evaluation | overall and dimension scores, strengths, improvements, next step | The session owner |
| Analytics summary | Saved completed sessions | calculated counts, averages, trends, and recent history | The authenticated user |

For a short V1 interview, questions, answers, and feedback may be embedded in `interviewSessions`. If they are separate records, each must retain a session reference and inherit the session's ownership rules.

## End-to-End Flow

```text
Sign up / sign in
  → authenticate request
  → create/read user and auth state
  → return safe user/session data to browser

Interview setup
  → validate selected type, level, optional resume ownership
  → create active interview session
  → build minimal question context
  → call OpenAI question generation
  → validate and save question
  → return question to browser

Answer submission
  → validate session ownership and active question
  → accept typed text OR transcribe validated audio
  → save answer text
  → call OpenAI evaluation
  → validate and save structured feedback
  → return feedback to browser

Session completion
  → calculate/save final session summary
  → mark session completed
  → return result

Dashboard
  → query only authenticated user's completed sessions
  → calculate summary/trend values
  → return history and analytics to browser
```

## Detailed Flows

### 1. Authentication and authorization

1. The user submits signup or login details from the React UI.
2. The backend validates the request. On signup, it hashes the password before creating a user record; on login, it verifies the hash.
3. The backend issues the application's authenticated session/token response and returns only safe user data.
4. For every protected request, the frontend sends the authentication credential over HTTPS.
5. Backend middleware verifies identity before route logic runs. Routes then verify that the requested resume, session, answer, or feedback belongs to that user.

```text
Browser credentials → Auth API → validate/hash or verify → MongoDB users
                                  ↓
                           authenticated response → Browser
```

Passwords never return to the browser after submission, are never stored in plain text, and should not be written to logs.

### 2. Resume upload and extraction

1. The user selects a resume file.
2. The frontend sends it to the authenticated backend upload route.
3. The backend checks authentication, file type, file size, and ownership context before accepting it.
4. The backend stores only the approved file or controlled storage reference and extracts usable text.
5. It saves the resume metadata and extracted text with the authenticated user's ID.
6. The API returns safe resume metadata/status to the frontend, not unnecessary extracted content or another user's file details.

```text
Resume file → Upload API → type/size validation → controlled storage (if retained)
                         → text extraction → MongoDB resumes → upload status → Browser
```

The extracted text is used only as limited, relevant context for that user's question generation. It is not sent wholesale when a shorter relevant excerpt will do.

### 3. Interview creation and question generation

1. The user chooses `DSA`, `HR`, or `System Design`, selects a level, and optionally selects one of their resumes.
2. The frontend requests creation of an interview session.
3. The backend validates the type and level, and confirms that any resume belongs to the user.
4. The backend creates an `active` session with its user ID and setup choices.
5. It builds a minimum necessary AI prompt from interview type, level, optional bounded resume context, and prior session context when applicable.
6. The backend calls OpenAI to generate the next question.
7. It validates the response, saves the question against the session, and returns the question to the browser.

```text
Setup form → POST /api/interviews → validate + create session → MongoDB interviewSessions
                                                       ↓
                        selected context → OpenAI question generation → validate result
                                                       ↓
                                   save question in session → question UI
```

### 4. Text-answer submission and feedback

1. The user enters a non-empty text answer for the current question.
2. The frontend submits the session/question reference and answer to the backend.
3. The backend authenticates the request, confirms session ownership and active state, and validates the answer.
4. It saves the answer text with its question/session context.
5. The backend sends the answer, the relevant question, and limited context to OpenAI for evaluation.
6. The backend validates the returned structured feedback before saving it.
7. The API returns the feedback to the browser, which presents scores, strengths, improvements, and a next-step recommendation.

```text
Typed answer → Answer API → ownership/input checks → save answer
                                            ↓
                question + answer + limited context → OpenAI evaluation
                                            ↓
                    validate structured feedback → save → feedback UI
```

### 5. Voice-answer submission and feedback

1. The user records a short voice response in the browser and submits it.
2. The backend validates authentication and audio type/size before processing the upload.
3. The backend sends approved audio to the chosen speech-to-text capability.
4. The resulting transcription is checked for usable text and becomes the answer text for the shared evaluation pipeline.
5. The backend evaluates it, saves the transcription and feedback, and returns both as appropriate.

```text
Recorded audio → Upload API → audio validation → speech-to-text
                                             ↓
                                 usable transcript → shared answer evaluation flow
                                             ↓
                                  saved feedback → Browser
```

Feedback must state that it evaluates the submitted or transcribed response. V1 does not infer emotion or make automated hiring decisions.

### 6. Session completion and analytics

1. When the interview ends, the frontend requests session completion.
2. The backend verifies ownership, calculates any session-level score/summary from saved feedback, marks the session `completed`, and persists it.
3. The dashboard requests the signed-in user's analytics summary.
4. The backend retrieves only that user's completed sessions and calculates history, averages, and basic trends.
5. The API returns dashboard-ready data to the browser.

```text
Complete request → Completion API → ownership check → calculate/save summary → MongoDB

Dashboard request → Analytics API → user's completed sessions → aggregate summary → dashboard UI
```

## Validation, Failure, and Retry Boundaries

| Point | Backend responsibility | User-facing result |
| --- | --- | --- |
| Authentication | Reject missing, expired, or invalid credentials. | Sign-in prompt or clear authorization error. |
| Request data | Validate allowed interview types, levels, IDs, and non-empty answers. | Field-level or actionable validation message. |
| Resource ownership | Verify the authenticated user owns every requested resume/session/resource. | Denied or not-found response without leaking another user's data. |
| File uploads | Enforce file type and size limits before storage/processing. | Clear unsupported/oversized-file message. |
| AI question/evaluation | Apply usage limits, timeouts, response-shape validation, and safe error handling. | Loading state, retry option, or clear failure state; never misleading feedback. |
| Transcription | Validate audio and transcription result before evaluation. | Prompt to retry with a short, clear recording if transcription is unusable. |
| Persistence | Save only validated application data and surface failures. | Do not claim a response/session was saved when it was not. |

## Data Minimisation and Privacy Rules

- Send OpenAI only the question, answer, and the smallest relevant context required for generation or evaluation.
- Keep resume and audio data only when necessary for the demo and configured product behavior; store controlled references rather than duplicate files where possible.
- Do not expose OpenAI keys, database credentials, password hashes, raw internal errors, or another user's data to the frontend.
- Provide a documented retention/removal approach if resume or session deletion is implemented.
- Treat AI feedback as practice assistance rather than an authoritative assessment.

## API-to-Data Mapping

| Endpoint | Input | Reads/writes | Output |
| --- | --- | --- | --- |
| `POST /api/auth/signup` | Registration details | Creates user | Safe user/auth response |
| `POST /api/auth/login` | Login details | Reads user; creates auth state as designed | Safe user/auth response |
| `GET /api/auth/me` | Auth credential | Reads current user | Safe profile data |
| `POST /api/resumes` | Auth credential, resume file | Creates resume metadata/extracted text | Upload status and safe metadata |
| `POST /api/interviews` | Type, level, optional resume ID | Creates session; reads permitted resume; saves question | Session and first question |
| `POST /api/interviews/:id/questions` | Session ID, auth credential | Reads/updates owned active session; saves next question | Next question |
| `POST /api/interviews/:id/answers` | Session ID, answer or approved audio | Saves answer/transcript and feedback | Structured feedback |
| `POST /api/interviews/:id/complete` | Session ID | Updates owned session summary/status | Completed session result |
| `GET /api/interviews/:id` | Session ID | Reads owned session | Session and result data |
| `GET /api/analytics/summary` | Auth credential | Reads current user's sessions; calculates summary | Dashboard history and metrics |

## Completion Check

The data flow is complete when a test user can sign in, create each interview type, submit a text answer and a voice-derived answer, receive valid saved feedback, complete a session, and see correct user-isolated history on the dashboard. Every external AI, upload, validation, and persistence failure must leave the application in an honest, recoverable state.
