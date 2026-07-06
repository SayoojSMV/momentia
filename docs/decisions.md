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

## AI Chatbot
- Floating button (bottom-right) added via layout.js so it appears on every page
- Uses Gemini API (gemini-2.5-flash) with full subject/unit/topic context per user
- Conversation built as a single prompt string rather than startChat history
  (Gemini's strict history validation — must start with user role — made startChat unreliable)
- File upload supported via paperclip button (sends filename as context)
- No DB storage for chat history — resets on page refresh (intentional for now)

## Friends & Chat
- Users searchable by full_name via ilike query on profiles table
- Required adding "Users can view all profiles for search" RLS policy on profiles
  (original policy only allowed viewing own profile, blocking search entirely)
- Friend requests: sender/receiver stored in friend_requests table with status field
- Real-time chat uses Supabase postgres_changes subscription
- Optimistic updates for sender (message added to state immediately on send)
- Receiver gets message via real-time subscription filtered by sender_id
- messages table indexed on sender_id and receiver_id for real-time filter support

## Timetable Scheduler
- Earliest-deadline-first scheduling — topics sorted by subject exam date
- Scheduling logic is deterministic code, not AI (avoids LLM arithmetic errors)
- schedule table stores one row per topic per day
- Regenerates fully on each run (delete + reinsert)
- Today panel on dashboard fetches schedule rows for current date only
- Side quests excluded from scheduling (dashboard-only, no deadline pressure)