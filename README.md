# Sync

A scheduling app for friends and family to find overlapping availability, plan
around it, and invite each other to actual dates.

## Getting started

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Project structure

- `app/` — Next.js routes (App Router). `app/page.jsx` renders the app.
- `components/SyncApp.jsx` — the entire application UI and logic.
- `tailwind.config.js` / `postcss.config.js` — styling setup.

## Status

This is currently a front-end prototype. All data (people, groups,
availability, plans, messages) lives in React state and resets on refresh —
there is no backend yet. Next steps for a real beta:

1. Add a database + auth (Supabase or Firebase are the fastest path).
2. Replace the in-memory state in `SyncApp.jsx` with real reads/writes.
3. Wire up real SMS delivery and calendar sync (currently simulated in the UI).

## Working together

- Create a branch per feature: `git checkout -b feature/whatever-youre-doing`
- Open a Pull Request into `main` when it's ready for review.
- Don't push directly to `main`.
