# Day 1 Technical Decisions

## Selected baseline

| Area | Decision | Reason |
| --- | --- | --- |
| Runtime | Node.js 22.16.0 | Installed LTS-compatible runtime. |
| Package manager | npm 10.9.2 | Installed and simplest V1 default. |
| Frontend | React with Vite | Fast, minimal React setup. |
| Backend | Node.js with Express | Required project stack. |
| Database | MongoDB Atlas for development/deployment | Managed option; no local database dependency. |
| Authentication | Secure HttpOnly cookie session | Keeps browser credential inaccessible to JavaScript. |
| Backend testing | Vitest with Supertest | Fast unit/integration test path for Node/Express. |
| Frontend testing | Vitest with React Testing Library | Matches Vite and component testing needs. |
| End-to-end testing | Playwright | Covers required full user journey. |
| AI development | Service interface with mock provider first | Avoids cost/quota blockers before live key setup. |

## Deferred decisions

- Resume storage and extraction provider: decide Week 5.
- Speech-to-text provider and audio retention: decide Week 6.
- Hosting provider: decide Week 7.

## Constraints

- Use Node 22 or newer compatible packages only.
- No secrets in repository. Use `server/.env` locally and deployment environment variables.
- MongoDB and OpenAI credentials remain user-managed manual setup items.
