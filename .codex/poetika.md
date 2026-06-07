# PoetiKa Working Notes

This file is the internal source of truth for development decisions.
Keep it updated when the implementation changes.

## Public / internal split

- `README.md` is public-facing and should describe the product for users, clients, and deployment.
- This file is internal and should describe implementation decisions, constraints, and follow-up work.

## Current product rules

- The daily challenge always uses 3 words from 3 different categories.
- Challenge words are stored in Supabase so they can be added, edited, disabled, or deleted later.
- The selected challenge is persisted per day in `daily_challenges`.
- The date boundary used for the daily challenge is `Europe/Madrid`.

## Current architecture

- Astro is the web framework.
- Supabase stores categories, words, and the daily challenge selection.
- The public UI reads the current challenge with a client-side fetch.
- Fallback challenge data exists so the site still renders before the database is configured.
- The editable local word bank lives in `src/data/challengeWords.ts` and powers the fallback challenge while Supabase is unavailable.

## Database tables

- `challenge_categories`: category catalog.
- `challenge_words`: editable word bank per category.
- `daily_challenges`: one persisted challenge per day.

## Change rules

- When changing public-facing content, update `README.md`.
- When changing product rules or implementation decisions, update this file.
- Keep the public README free of internal notes, task history, or coding instructions.

## Next likely tasks

- Add a small admin UI for category and word CRUD.
- Add an admin guard before exposing any write surface in the app.
- Replace fallback data with seeded Supabase data in the deployed environment.
- Sync `src/data/challengeWords.ts` with Supabase seed data when the project is ready again.
