# V1 UI Design — AI-Powered Interview Preparation Platform

## Design Goal

The interface should make interview practice feel calm, focused, and encouraging—not like an exam portal or an intimidating analytics tool. A first-time user should understand the main path within seconds: choose a practice type, answer a question, get useful feedback, and see progress.

The visual direction is contemporary and professional: generous spacing, strong typography, a restrained neutral base, one confident accent color, and clear states for progress and feedback. The experience should borrow familiar interaction patterns from polished learning, productivity, and interview-practice products without copying any specific brand.

## UX Principles

- **One primary action per screen.** Guide the user through setup, question, response, feedback, and completion without competing calls to action.
- **Text first, voice supported.** Typed answers are always visible and reliable; voice is an optional enhancement with a clear fallback.
- **Progress without pressure.** Show question number and completion progress, but avoid aggressive countdowns or high-stakes language in V1.
- **Feedback that teaches.** Scores need plain-language meaning, strengths, improvements, and one immediate next step.
- **Trust through clarity.** Explain that AI feedback assists practice and evaluates the submitted/transcribed response; it is not a hiring decision.
- **Fast recovery.** Empty, loading, upload, retry, and permission states must tell users what happened and what to do next.
- **Accessible by default.** Keyboard navigation, visible focus, readable contrast, descriptive labels, and non-color-only feedback are required.

## Information Architecture

```text
Public
├── Landing / Welcome
├── Sign up
└── Log in

Authenticated application
├── Dashboard
├── Start Interview
│   ├── Interview setup
│   └── Active interview session
├── Resume management
├── Session result / feedback
└── Profile / logout
```

Primary navigation for authenticated users: **Dashboard**, **Practice**, **Resumes**, and a compact profile menu. On narrow screens, collapse this into a clear menu while keeping the current page title/action visible.

## Visual System

### Color and mood

Use a light, neutral canvas with dark ink text and a single blue or indigo accent. This signals focus and confidence without the anxiety associated with red-heavy testing interfaces.

| Token | Suggested role |
| --- | --- |
| Canvas | Very light cool gray/off-white page background |
| Surface | White cards, dialogs, and input backgrounds |
| Ink | Near-black/navy text for high contrast |
| Muted ink | Secondary labels and helper text |
| Primary | Indigo/blue for main actions, selected states, links |
| Success | Green for completed/sustained improvement—not the only score signal |
| Warning | Amber for recoverable attention states |
| Danger | Red only for destructive actions/errors |

Use semantic color tokens rather than hard-coding colors in individual components. Every text/background pair must meet accessible contrast; score meaning must also be expressed with labels and icons/text, not color alone.

### Type, spacing, and shape

- Use a clean sans-serif font available through the web or system fallback.
- Establish a simple scale: page title, section title, body, label, and caption; avoid many near-duplicate sizes.
- Use a consistent spacing scale (for example, 4/8/12/16/24/32/48 px) and comfortable card padding.
- Use medium-radius cards and inputs with subtle borders/shadows. Avoid heavy glass effects, excessive gradients, and decorative animation.
- Keep body text comfortably readable and lines reasonably short, especially in question and feedback panels.

### Reusable components

| Component | Behavior |
| --- | --- |
| `AppShell` | Header, navigation, responsive content container. |
| `PrimaryButton` / `SecondaryButton` | Clear priority, disabled/loading state, keyboard focus. |
| `Card` | Shared surface for setup choices, question, feedback, and dashboard metrics. |
| `ProgressIndicator` | Textual “Question 2 of 5” plus visual progress. |
| `ScoreBadge` | Score, plain-language label, and accessible semantic state. |
| `FeedbackList` | Strengths, improvements, and next-step sections with icons and text. |
| `EmptyState` | Explains absent data and gives one direct action. |
| `InlineAlert` | Contextual success, warning, error, or retry message. |
| `LoadingState` | Short message/skeleton that signals active work; never an indefinite spinner alone. |

## Core Screens

### 1. Welcome, login, and signup

Keep public screens minimal. Use a split or centered layout with a concise value statement such as “Practise interviews. Get actionable feedback. Track your progress.”

- Login: email, password, login button, sign-up link, clear inline error.
- Signup: name, email, password, account creation button, login link.
- Do not overload authentication with resume upload or profile questionnaires.
- After signup, route users directly to the interview setup or a welcoming empty dashboard.

### 2. Dashboard

The dashboard should answer: *How am I doing, what should I practise next, and where do I continue?*

```text
Good afternoon, Asha                         [Start practice]
Keep building your interview confidence.

[ Overall average ] [ Sessions completed ] [ Latest score ]

Your progress
[ simple score-over-time chart ]  [ score dimensions / type breakdown ]

Recent sessions
DSA · Intermediate · 82 · Sep 2                    [View]
HR  · Beginner     · 76 · Aug 28                   [View]
```

- Put **Start practice** in the most prominent position.
- Show only a few high-value metrics; avoid a dense data wall.
- Use a simple line/bar trend only when there are at least two completed sessions. Otherwise show an encouraging empty state.
- Recent session rows should show type, level, date, and overall score, with a clear view action.
- If no completed sessions exist, show an illustration/icon and “Start your first mock interview” action instead of blank charts.

### 3. Interview setup

Use a short, card-based guided form. It should fit on one desktop screen where possible.

```text
Start a mock interview
Choose the kind of conversation you want to practise.

[ DSA ]       [ HR ]       [ System Design ]
Algorithms     Behavioural  Architecture and trade-offs

Choose your level
[ Beginner ] [ Intermediate ] [ Advanced ]

Use a resume? (optional)
[ Select uploaded resume / Upload resume ]

                                  [ Start interview ]
```

- Make each interview type card explain its focus in a short phrase.
- Use selected card styling plus an icon/checkmark; do not rely on color alone.
- Keep resume optional and describe it honestly: “We use relevant details to tailor questions.”
- Validate selection inline and disable **Start interview** only until required choices are complete.
- On AI generation delay/failure, retain setup choices and show a retry action.

### 4. Resume management

Keep this screen practical, not document-management heavy.

- Show uploaded resume name, upload date, extraction status, and use/delete actions.
- Upload drop zone also supports a normal file-picker button; show supported formats and maximum size before upload.
- During extraction show a clear status: “Reading your resume…”
- On failure, explain whether the user can retry, upload another file, or continue without resume context.
- Do not show full extracted resume text by default.

### 5. Active interview session

This is the most important screen. Give the question and answer space visual priority.

```text
← Exit and save later                 DSA · Intermediate     Question 2 of 5
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Question
Explain how you would detect a cycle in a linked list.

Your response
[ Large, resizable text area                                      ]
[                                                                  ]

[ Type answer ]  [ Record answer ]     Transcript/recording status

                                  [ Submit for feedback ]
```

- Place question type/level and question count in the top area; avoid distracting navigation during a response.
- Use a large text area with example helper text only when empty. Preserve entered text if a request fails.
- Provide two clearly labeled modes: **Type answer** and **Record answer**. Switching to voice never removes typed text without confirmation.
- Voice mode must show microphone permission, recording duration, stop/re-record, upload/processing, and transcription status. Always offer “Type instead.”
- Disable duplicate submission while feedback is being generated. Replace the button label with “Evaluating your answer…” and show a concise progress note.
- Allow an intentional exit/back action with a confirmation if unsaved work would be lost.

### 6. Per-answer feedback

Present feedback immediately after evaluation in a scannable layout; do not bury advice under charts.

```text
Your feedback                                      Overall 82 · Strong

[ Accuracy 86 ] [ Clarity 80 ] [ Confidence 78 ]

What worked well
✓ You named the fast/slow pointer approach.

Improve next time
→ Explain why the pointers must meet when a cycle exists.

Try this next
Practise describing time and space complexity aloud.

[ Next question ]                                  [ Review answer ]
```

- Make **Next question** the primary action; provide **Review answer** as secondary.
- Render score labels such as “Developing,” “Solid,” or “Strong” alongside numbers. Ensure labels are based on a documented score range.
- Keep strengths and improvements concrete, short, and actionable.
- Include a discreet note: “AI feedback supports practice and may not be perfectly accurate.”
- If feedback cannot be generated, show the saved response status and retry option rather than an empty feedback card.

### 7. Completion result

End the session with encouragement and a useful summary.

- Show overall score, dimension scores, top strengths, priority improvement, and a single recommended exercise.
- Include **View dashboard** as primary and **Start another practice** as secondary.
- Avoid confetti or overstated success language for poor/early scores; frame results as a baseline for improvement.
- Confirm that the session was saved before linking to the dashboard.

## Interaction States

| State | UX requirement |
| --- | --- |
| Loading question | Keep selected setup visible; state that a question is being prepared; offer retry after a bounded wait. |
| Evaluating answer | Prevent duplicate submission, preserve answer text, and show meaningful progress text. |
| Empty dashboard | Explain there is no history yet and provide Start practice. |
| Empty resumes | Explain resume is optional and provide upload action. |
| Permission denied | Explain microphone access and provide typed-answer fallback. |
| Upload error | Identify unsupported type, size, or extraction issue without technical jargon. |
| Network/AI error | State that the answer/setup was not lost where true; offer retry and clear next action. |
| Session expired | Explain the user must sign in again; preserve local draft only if safely implemented. |

## Responsive Design

- Desktop: two-column dashboard/feedback layouts may be used when content benefits from comparison.
- Tablet: retain readable cards and use a single-column session answer area.
- Mobile: prioritize the question, text area, and submit button; stack score cards and collapse navigation.
- Keep touch targets at least approximately 44 × 44 CSS pixels.
- Avoid horizontal scrolling for tables; transform session history into stacked cards on small screens.
- Test voice controls, dialogs, and keyboard visibility on mobile browsers.

## Accessibility Requirements

- Use semantic landmarks, heading order, native form labels, and buttons rather than clickable generic containers.
- Support full keyboard navigation, including visible focus, modal focus containment, and logical tab order.
- Announce async status changes/errors through appropriate live regions without excessive interruptions.
- Pair color with text/icon/shape for scores, selected state, and errors.
- Provide text alternatives for meaningful visualisations; charts need accessible summaries or data tables.
- Respect reduced-motion preferences; animations should be subtle and never required to understand state.
- Verify contrast and usable zoom at 200% before the final demo.

## V1 Scope Guardrails

- Do not introduce a live animated AI avatar, video interviewer, complex chat persona, social feed, leaderboard, payment flows, or elaborate gamification.
- Do not imply the app can diagnose emotion, guarantee placement, or make hiring decisions.
- Do not make voice, resume upload, or charts prerequisites for completing a basic text interview.
- Prefer a small number of polished, accessible screens over a large collection of incomplete features.

## Acceptance Check

A successful UI lets a first-time user sign up, start a DSA/HR/System Design session, answer by text, understand feedback, and locate the saved result on the dashboard without asking for help. The interface must remain usable when resume upload, microphone permission, transcription, or AI calls fail by presenting a clear recovery path.
