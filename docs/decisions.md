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

## AI Roadmap Generation
- Provider: Google Gemini API (gemini-2.5-flash model)
- Switched from Anthropic Claude due to cost — Gemini has a free tier
- Uses Gemini function calling (tool use) to guarantee structured JSON output
- Roadmap schema: subject → units → topics (name, difficulty, minutes, order_index)
- Files stored in Supabase Storage under materials bucket at path {user_id}/{subject_id}/{filename}
- Storage policies: users can only read/upload/delete their own files
- On regeneration: existing units and topics are deleted and replaced cleanly
- API route: /api/generate-roadmap (server-side only, API key never exposed to browser)

## File Upload
- Accepted types: pdf, pptx, docx, txt, png, jpg, jpeg
- Metadata saved to materials table (file_name, storage_path, file_type)
- Actual files stored in Supabase Storage (materials bucket)

## Topic Study Page
- Live stopwatch timer starts on page load, stops on mark complete
- Time saved to topics.time_spent_seconds on completion
- Next topic link shown after completion (same unit, next order_index)
- Content placeholder ready for future AI-generated study content