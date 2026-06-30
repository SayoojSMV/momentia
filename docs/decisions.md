# Design decisions log

## Naming & categories
- Project name: Momentia
- Subject categories: Academics (feeds AI timetable), Side Quests 
  (dashboard-only, no scheduling), Test Prep (own category, no fixed deadlines)

## Roadmap structure
- Subject → Units → Topics
- Topic fields: name, minutes, difficulty, depends_on, source (from_materials/inferred)
- AI roadmap generation uses Claude tool-use with a strict schema, not free-text JSON

## Timetable
- Scheduling math (earliest-deadline-first) is deterministic code, not the AI
- AI handles: priority judgment, natural-language session labels, chat-based adjustments
- Recomputed on: topic completion, start of each day, deadline/subject changes

# Development Progress

## 2026-06-27

### Completed

- Initialized Next.js project
- Configured Tailwind CSS
- Configured ESLint
- Connected Supabase
- Added environment configuration
- Created shared Supabase client

### Database

Created tables:

- profiles
- subjects
- units
- topics
- topic_dependencies
- materials

### Security

Enabled Row Level Security (RLS)

Created policies for:

- Profiles
- Subjects
- Units
- Topics
- Topic Dependencies
- Materials

### Authentication

Started Microsoft OAuth setup.

Current blocker:

University Microsoft account belongs to an Azure tenant where App Registration permissions are disabled.

Decision:

Use a personal Microsoft account for Azure App Registration.

## 2026-06-30

## Authentication
- Google sign-in: fully implemented and working (issue #7)
- Microsoft sign-in: blocked (issue #17) - persistent Azure tenant 
  misrouting error (AADSTS50020/AADSTS16000), appears to be a 
  Windows-level cached auth token issue, not fixable via account/browser 
  changes alone. Deferred; not a blocker for the rest of the app.