# V1 Success Criteria — AI-Powered Interview Preparation Platform

## Purpose

Version 1 is successful when a student, fresher, or professional can independently complete a useful mock-interview practice session and review saved feedback and progress. These criteria translate the approved project context and architecture into observable acceptance checks for the two-month release.

## Release Gate: Complete User Journey

The product must demonstrate the following journey for a new or returning user without manual database changes or developer intervention:

1. Create an account or sign in.
2. Select DSA, HR, or System Design and an interview level.
3. Optionally upload a supported resume and use it as bounded question context.
4. Receive a relevant interview question.
5. Submit a typed answer, or a short recorded voice answer that is converted to usable text.
6. Receive structured, understandable feedback and scores for that answer.
7. Complete the session and see its result in the dashboard/history.

If any required step fails, has no clear recovery state, or does not persist the user's results, V1 is not ready for release.

## Functional Acceptance Criteria

| Area | Success criterion | Evidence of completion |
| --- | --- | --- |
| Authentication | A user can sign up, sign in, remain authenticated for the intended session, and sign out. | Demonstrate the flow with a fresh account and a returning account. |
| Access control | A signed-in user can access only their own profile, resumes, interview sessions, feedback, and analytics. | Attempt to request another user's known resource ID and receive a denied/not-found response. |
| Interview setup | A user can choose exactly the three supported interview types: DSA, HR, and System Design, plus an appropriate level. | Create one session for each type and verify the chosen type and level are saved. |
| Question generation | The backend generates or retrieves a question appropriate to the selected interview type, level, and available bounded context. | Show one generated question for each interview type; the UI handles a failed/slow generation request clearly. |
| Text answers | A user can submit a non-empty typed answer to an active session. | Submit an answer, receive feedback, and retrieve the saved session after refresh/re-login. |
| Voice answers | A user can record/upload a short supported voice response, obtain usable transcription, and receive feedback through the same evaluation flow. | Complete one short voice-answer example; unsupported files, oversized files, and transcription failures show clear errors. |
| Resume analysis | A user can upload a supported, size-limited resume; usable text is extracted and only used for that user's question context. | Upload a sample resume and show a generated question that reflects relevant resume context. |
| Feedback | Each evaluated answer returns a predictable structured result: overall score, accuracy, clarity, confidence, strengths, improvements, and a practical next step. | Show feedback for a typed and voice-derived answer; missing/invalid AI output is not presented as valid feedback. |
| Session completion | A user can finish a session and see a saved summary of its questions, answers, feedback, and final score(s). | Complete a session, reload it, and verify the same summary remains available. |
| Analytics | The dashboard shows the current user's past sessions with interview type, date, scores, and simple progress summaries/trends. | Complete multiple sessions and verify dashboard values match persisted session data. |
| Error handling | User-facing loading, retry, validation, and failure states exist for AI calls, uploads, authentication, and network/API failures. | Demonstrate at least one controlled failure in each of those paths. |

## Technical and Security Criteria

- The delivered application uses a React frontend, Node.js/Express REST backend, MongoDB persistence, and OpenAI APIs called only by the backend.
- OpenAI credentials, database connection strings, and other secrets are held in environment configuration; they are never sent to or embedded in frontend code.
- Passwords are hashed before storage; plain-text passwords are never logged or stored.
- Protected API routes verify authentication and ownership before reading or changing data.
- Inputs are validated server-side. Resume and audio uploads enforce supported type and size limits.
- Question/feedback requests have development usage limits or safeguards suitable for the project budget.
- AI responses are validated before persistence and rendering. The UI labels feedback as assistive practice feedback, not a hiring decision or an emotion diagnosis.
- The system remains a modular monolith: one frontend, one backend, and one database deployment. Microservices and complex infrastructure are not required.

## Quality and Demo Criteria

- The primary text-answer path is reliable enough to be demonstrated repeatedly from sign-in through dashboard review.
- The interface makes the current interview state, question, response action, feedback, and next action understandable without a guide.
- A demo account or scripted test data can show meaningful dashboard history while preserving normal user-data isolation.
- Core flows work in the selected supported browser(s) and do not expose raw backend/AI errors to users.
- The team can explain the architecture, API flow, data model, AI boundary, and known limitations during a project review or viva.

## Explicitly Not Required for V1

V1 success does **not** depend on company-specific preparation packages, placement-platform integration, live video or multi-user interviews, interviewer matching, proctoring, anti-cheating, payments, native mobile apps, extensive admin question banks, advanced gamification, microservices, Kubernetes, or claims of perfect AI evaluation.

## Definition of Done

The release is ready when every functional criterion is demonstrated, the technical/security criteria are reviewed, and the complete user journey passes with both a typed answer and a voice-derived answer. Any remaining limitations must be documented as known V1 constraints and must not prevent the core text interview flow, saved feedback, or dashboard history from working.
