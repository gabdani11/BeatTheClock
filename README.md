# ⏱️ Beat the Clock

### Think Faster. Code Smarter.

Beat the Clock is a coding interview practice app that acts as a real-time coach. Instead of just counting down, it nudges you through each stage of solving a problem — reading, planning, brute-forcing, optimizing, coding, testing, and reviewing — without ever handing you the answer.

The goal isn't to finish fast. It's to build a repeatable, interview-ready problem-solving process.

---

## Features

- **Difficulty-based timers** — Easy (20 min), Medium (40 min), or Hard (60 min), with customizable durations.
- **Real-time coaching** — Timed prompts that encourage independent thinking ("Have you considered edge cases?") instead of giving away solutions ("Use a HashMap").
- **Timer controls** — Start, Pause, Resume, and Complete a challenge at any point.
- **Session summaries** — Time taken, solved status, hints used, pause count, and a breakdown of thinking / coding / review time.
- **Statistics dashboard** — Problems solved by difficulty, streaks, average solve time, and weekly progress.
- **Focus mode** — Hides everything except the timer, coaching message, and controls during a challenge.

See [`step.md`](./step.md) for the full product spec, including the exact coaching message schedule for each difficulty.

---

## Project Structure

This is an npm workspaces monorepo:

```text
BeatTheClock/
├── apps/
│   └── web/              # React + TypeScript + Vite frontend
│       └── src/
│           ├── App.tsx
│           └── main.tsx
├── packages/
│   └── core/              # Framework-agnostic timer & analytics logic
│       └── src/
│           ├── timer.ts       # Timer state machine
│           ├── coaching.ts    # Coaching message schedules
│           ├── analytics.ts   # Session stats & streaks
│           └── types.ts       # Shared types
├── package.json            # Workspace root
└── step.md                 # Full product spec
```

- **`@leetcode-timer/core`** — Pure TypeScript library with no UI dependencies. Exports timer logic, coaching message triggers, session/streak types, and analytics helpers.
- **`@leetcode-timer/web`** — The React app that consumes `core` and renders the actual UI.

---

## Tech Stack

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/) for dev server and bundling
- [oxlint](https://oxc.rs/) for linting
- npm workspaces for the monorepo setup

---

## Getting Started

### Prerequisites

- Node.js (LTS recommended)
- npm

### Install

```bash
git clone https://github.com/gabdani11/BeatTheClock.git
cd BeatTheClock
npm install
```

### Run the app

```bash
npm run dev
```

This runs `dev` across all workspaces (starts the Vite dev server for `apps/web`).

### Build

```bash
npm run build
```

Builds `@leetcode-timer/core` and the web app across all workspaces.

### Lint

```bash
cd apps/web
npm run lint
```

---

## How It Works

1. **Pick a difficulty** — Easy, Medium, or Hard, each with a recommended time limit.
2. **Start the challenge** — the timer begins counting down.
3. **Get coached** — at set intervals, a message nudges you toward the next phase of problem-solving (understand → brute-force → optimize → implement → test → review).
4. **Pause / Resume** as needed.
5. **Complete** the challenge when you've solved it, or let the timer expire and mark whether you solved it.
6. **Review your session** — see your time breakdown and how it feeds into your long-term stats.

---

## Roadmap

Planned/future features (see `step.md` for details):

- AI interview coach & AI review of solutions
- Voice coaching
- Blind 75 mode, daily challenges, contest mode
- Company-specific interview sets
- Friend challenges / team competitions
- Progress graphs and calendar view

---

## License

No license specified yet.
