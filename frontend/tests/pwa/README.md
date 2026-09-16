# Production PWA regression tests

Run `npm run test:e2e:pwa --prefix frontend` from the repository root after installing dependencies and the Playwright Chromium browser.

The suite builds the real production bundle, serves it on `127.0.0.1:5184`, and uses a local mock Supabase API on `127.0.0.1:54323`. Both ports must be free. No production services, real accounts, or camera access are used.

Coverage includes real service worker installation, offline reload and navigation, cached reading content and JavaScript chunks, model runtime caching, private REST cache exclusion, deferred updates, queue ownership, concurrent tab replay, logout cleanup, and private browser-history state after account changes. The update test adds a version message handler to the server response only. Model caching uses fixture bytes, not inference or camera capture.

This complements the existing development-server browser suite. Chromium is used because [Playwright service worker inspection and routing support is Chromium-only](https://playwright.dev/docs/service-workers).
