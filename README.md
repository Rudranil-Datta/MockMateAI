<div align="center">
  <img src="client/public/favicon.svg" width="88" alt="MockMateAI logo" />
  <h1>MockMateAI</h1>
  <p><strong>Practice interviews. Understand your performance. Improve with every session.</strong></p>
  <p>An AI-powered interview preparation platform for students, freshers, and professionals.</p>
</div>

---

## What is MockMateAI?

MockMateAI recreates a focused interview-practice experience in one web
application. Users can choose an interview track and difficulty, answer
AI-generated questions by text or voice, receive structured feedback, and track
their progress over time.

The project is designed to make useful interview practice more accessible and
self-paced. AI feedback is presented as learning guidance, not as a hiring
decision or a substitute for professional assessment.

## Highlights

| Feature                       | What it provides                                                                                                                      |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Three interview tracks        | Practice **DSA**, **HR**, or **System Design** questions at an appropriate level.                                                     |
| AI-generated questions        | Receive questions based on the selected track, level, and optional resume context.                                                    |
| Text and voice answers        | Type an answer or submit a short voice response for transcription and evaluation.                                                     |
| Resume-informed practice      | Upload a supported resume to create more relevant practice questions.                                                                 |
| Structured feedback           | Review scores for accuracy, clarity, and confidence, plus strengths, improvements, and a practical next step.                         |
| Saved interview results       | Complete sessions and revisit saved questions, answers, feedback, and final scores.                                                   |
| Progress dashboard            | View interview history, score summaries, and simple progress trends.                                                                  |
| Secure application boundaries | Keep AI and database credentials on the backend with authentication, ownership checks, validation, upload limits, and request quotas. |

## How it works

1. Create an account or sign in.
2. Choose DSA, HR, or System Design and select a level.
3. Optionally upload a resume for bounded question context.
4. Receive an interview question.
5. Answer using text or a short voice recording.
6. Review structured AI-assisted feedback.
7. Complete the session and track the result from the dashboard.

## Technology

- **Client:** React, React Router, and Vite
- **API:** Node.js and Express
- **Database:** MongoDB with Mongoose
- **AI:** Gemini Developer API, called only from the backend
- **Testing:** Vitest, Testing Library, and Supertest

## Run locally

### Prerequisites

Before starting, install or obtain:

- Git
- Node.js 22 or newer and npm
- Your own reachable MongoDB connection string
- Your own Gemini API key

Use development credentials and a test database for local demos. Never commit
real credentials to the repository.

### 1. Clone the project

```bash
git clone https://github.com/Rudranil-Datta/MockMateAI.git
cd MockMateAI
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create local environment files

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Open `server/.env` and provide at least:

| Variable         | Required value                                                                     |
| ---------------- | ---------------------------------------------------------------------------------- |
| `MONGODB_URI`    | Your MongoDB connection string. The database must be reachable from your machine.  |
| `GEMINI_API_KEY` | Your Gemini Developer API key. It remains on the server.                           |
| `AUTH_SECRET`    | A private random secret used to sign authentication tokens. Use at least 32 bytes. |

Generate a suitable local authentication secret with Node.js:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Paste the generated output into `AUTH_SECRET`. Keep the existing local defaults
for `CLIENT_ORIGIN`, `PORT`, and the other bounded settings unless your setup
requires different values.

The default `client/.env` points the browser to
`http://localhost:4444/api`. Never place MongoDB credentials, authentication
secrets, or Gemini keys in the client environment file because `VITE_` values
are visible in the browser.

### 4. Start the API

In the first terminal, from the project root:

```bash
npm run dev:server
```

### 5. Start the client

In a second terminal, from the project root:

```bash
npm run dev:client
```

Open:

- **Application:** `http://localhost:5173`
- **API health check:** `http://localhost:4444/health`

Stop both processes with `Ctrl+C` when the demo is finished.

## Suggested demo journey

For a clear end-to-end demonstration:

1. Sign up with a new account.
2. Start a text-based interview in one of the three supported tracks.
3. Submit an answer and review its structured feedback.
4. Complete the interview and open the saved result.
5. Return to the dashboard to show interview history and progress.
6. Optionally demonstrate resume-informed questions or one short voice answer.

Use synthetic resume content and non-sensitive demo data. Live AI usage may be
subject to the quota and availability of the Gemini account associated with the
configured API key.
