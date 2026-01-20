# Speed Reading Platform

Adaptive speed reading web platform with eye-tracking technology.

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Supabase

## Getting Started

Have an .env file in the root directory with the following variables:

|               Variable                |                   Description                    |
|:-------------------------------------:|:------------------------------------------------:|
|           VITE_SUPABASE_URL           |            Your Supabase project URL             |
| VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY | Your Supabase project's anonymous/public API key |
|            GROQ_API_KEY               |                Your groq API key                 |


```bash
npm install
npm run dev
```

## Project Structure

```
frontend/     # React application
backend/      # Supabase configuration
docs/         # Project documentation
```
