# Vocab Builder

Personal vocabulary builder with spaced repetition. Add words, get AI-generated flashcards, and study them with an FSRS-5 scheduling algorithm.

## Features

- **Add words** — single or bulk, with optional source and notes
- **Preview before saving** — see generated cards before committing
- **AI-generated cards** — definition, pronunciation, fill-in-the-blank, and etymology via Claude
- **Spaced repetition** — FSRS-5 algorithm schedules reviews based on performance
- **Study** — swipe or keyboard shortcuts to rate cards (Again / Hard / Good / Easy)
- **Undo** — 5-second window to revert a rating after submitting
- **Words list** — search, filter by source, view/edit individual cards
- **Stats** — streak, daily reviews, due count, 7-day activity dots
- **PWA** — installable on mobile, works standalone
- **PIN auth** — simple PIN gate, no accounts

## Stack

- **Next.js** (App Router) + TypeScript
- **Tailwind CSS v4** with CSS custom properties (dark mode only)
- **Supabase** (Postgres, `vocab` schema)
- **Anthropic Claude** (Haiku) for card generation
- **Netlify** for deployment

## Setup

1. Clone and install:
   ```bash
   npm install
   ```

2. Create a `.env.local` with:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ANTHROPIC_API_KEY=...
   NEXT_PUBLIC_APP_PIN=...
   NEXT_PUBLIC_DAILY_WORD_LIMIT=20
   ```

3. Run locally:
   ```bash
   npm run dev
   ```

## Database

The app uses a `vocab` schema in Supabase with tables: `words`, `cards`, `reviews`. See `lib/supabase/` for types and the client setup.
