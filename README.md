# [sp(eye)](https://speye.pages.dev/)

**Live at <https://speye.pages.dev/>**

Adaptive speed reading web platform with eye-tracking technology, featuring PvP competitive mode with Elo matchmaking, multiple reading modes (normal, adaptive, RSVP), admin text management, and user analytics.

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4
- **Backend**: Supabase
- **LLM**: Groq
- **Caching**: Upstash Redis

## Getting Started

### Prerequisites

- Node.js (v24 recommended)
- npm

### Environment Variables

Create an `.env` file in the **root** directory (Vite reads it via `envDir: '../'`):

| Variable | Description |
| :--- | :--- |
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Your Supabase project's anonymous/public API key |
| `GROQ_API_KEY` | Your Groq API key |
| `VITE_UPSTASH_REDIS_REST_URL` | Your Upstash Redis REST API URL |
| `VITE_UPSTASH_REDIS_REST_READ_TOKEN` | Your Upstash Redis REST API read-only token |

### Installation

```bash
npm install
npm install --prefix frontend
npm install --prefix backend
```

### Development Server

```bash
npm run dev
```

This starts the Vite dev server at `http://localhost:5173`.

## Commands

All commands can be run from the **root** directory unless otherwise noted.

### Build

```bash
npm run build            # Build frontend for production
```

### Formatting

```bash
npm run format           # Auto-format all files with Prettier
npm run format:check     # Check formatting without modifying files
```

### Linting

```bash
npm run lint             # Lint both frontend and backend with ESLint
```

### Unit Tests

Unit tests use [Vitest](https://vitest.dev/).

```bash
# Frontend (run from frontend/)
cd frontend
npm test                 # Watch mode
npm run test:run         # Single run
npm run test:ui          # Browser UI

# Run a single test file
npx vitest run src/tests/path/to/file.test.tsx

# Backend (run from backend/)
cd backend
npm test                 # Watch mode
npm run test:run         # Single run
```

### End-to-End Tests

E2E tests use [Playwright](https://playwright.dev/) (Chromium, Firefox, WebKit). The dev server starts automatically.

```bash
npm run test:e2e         # Headless (all browsers)
npm run test:e2e:headed  # Headed (visible browser)
npm run test:e2e:ui      # Interactive Playwright UI
```

CI provides mock Supabase env vars so E2E tests run without a real `.env`.