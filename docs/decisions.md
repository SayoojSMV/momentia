# Design Decisions Log

## Naming & Categories
- Project name: Momentia (coined word, not a dictionary word)
- Subject categories:
  - Academics — feeds the AI timetable scheduler
  - Side Quests — dashboard-only, no scheduling or deadlines
  - Test Prep — standalone category for competitive exams

## Tech Stack
- Frontend: Next.js (JavaScript, not TypeScript) + Tailwind CSS
- Backend/Auth/DB/Storage: Supabase
- AI: Google Gemini API (gemini-2.5-flash)
  - Originally planned with Anthropic Claude API
  - Switched to Gemini due to budget constraints
  - The prompt and schema design is provider-agnostic
- Hosting: Vercel (auto-deploys from main branch)

## Database Architecture
Nine tables: profiles, subjects, units, topics, topic_dependencies,
materials, schedule, friend_requests, messages.
Row Level Security using auth.uid() ownership checks on all tables.
Nested EXISTS subqueries for tables without a direct user_id column.
supabase/schema.sql maintained as a complete, re-runnable source of truth.

## Profile Auto-Creation
handle_new_user() Postgres function with security definer
auto-creates a profile row on signup via a database trigger.
security definer bypasses the chicken-and-egg RLS problem
(user has no session at the moment of creation).

## AI Roadmap Generation
- Uses Gemini tool-use with a strict JSON schema (not free-text JSON)
- Schema: subject → units → topics (name, difficulty, minutes, source)
- source field distinguishes "from_materials" vs "inferred"
- Regeneration preserves completed and in-progress topics by name match
- Roadmap can be generated without materials using subject name as context

## Topic Content Generation
- Generated once per topic on first visit via Gemini API
- Saved to topics.content column permanently
- Never regenerated after first save (content is stable)
- Content length scaled by difficulty level
- Server-side guard: only saves if content is currently null

## Timetable Scheduling
- Earliest-deadline-first packing algorithm (deterministic code, not AI)
- Gemini handles only priority judgment, not the scheduling math
- Side Quests excluded from scheduling entirely
- Schedule stored in schedule table, recomputes on demand

## Dashboard
- Dashboard is the homepage (no separate welcome screen for logged-in users)
- Four stat tiles: Status, Current streak, Overall completion, Time spent
- Today panel shows current day's scheduled topics
- Subject cards show real topic completion percentages
- Public landing page (logged-out) is a future addition

## Topic Study Timer
- Timer starts from saved time_spent_seconds on page load (resumes)
- Saves to Supabase every 10 seconds via setInterval
- Also saves on tab visibility change (visibilitychange event)
- Also saves on browser close (beforeunload event)
- Compact timer in page header with pause/resume on click
- Mark complete toggleable — can be undone (reverts to in_progress)

## Chatbot
- Floating button (bottom-right) in layout.js — appears on every page
- Conversation built as a single concatenated prompt string
  Reason: Gemini's startChat requires strict user/model alternation
  which caused reliability issues in testing
- No DB storage for chat history — resets on page refresh (intentional)
- File upload supported (filename sent as context)
- Full subject/unit/topic progress injected as context per request

## Friends & Chat
- Users searchable by full_name via ilike query on profiles table
- Broader "view all profiles" RLS policy required for search
  (original "view own profile only" policy blocked search entirely)
- Real-time messaging via Supabase postgres_changes subscription
- Optimistic updates for sent messages (added to state immediately)
- Incoming messages marked as read when conversation is opened
  via bulk UPDATE on messages table
- messages table requires UPDATE RLS policy for mark-as-read to work
  (missing policy causes silent failure — update returns no error
  but writes 0 rows)
- messages table indexed on sender_id and receiver_id
- REPLICA IDENTITY FULL required on messages for UPDATE realtime events
- Sidebar notification dot re-checks on pathname change with 1.5s delay
  when arriving at /friends (allows mark-as-read to complete first)

## Sidebar Navigation
- Replaced top horizontal navbar with a collapsible left icon sidebar
- Collapsed state: 56px wide, icons only
- Expanded state: 224px wide, icons + labels, triggered by hamburger
- Collapses on outside click or nav link click via overlay div
- Subjects section lists all user subjects with direct links
- Hidden on /login and /auth/* pages via pathname check

## Profile Page
- Avatar stored in Supabase Storage 'avatars' bucket (public bucket)
- Avatar path: {user_id}/avatar_{timestamp}.{ext}
- Username stored in profiles.username (unique constraint)
- Real-time availability check on every keystroke using .limit(1)
- Save button disabled while username status is 'checking' or 'taken'
- Activity calendar shows last 15 weeks, colored by time_spent_seconds

## Topic Search
- Search bar on subject roadmap page queries all topics across all units
- Uses ilike for case-insensitive partial matching
- Results show topic name, unit name, difficulty, and status dot
- Clicking a result navigates directly to the topic study page

## Authentication
- Google sign-in: fully implemented and working (#7)
- Microsoft sign-in: blocked (#17)
  Persistent AADSTS50020/AADSTS16000 errors across all account types
  and browsers. Suspected Windows-level Web Account Manager cache issue.
  Deferred as post-deployment optional goal.
  Note: Supabase refers to Microsoft provider as 'azure' not 'microsoft'
- Apple sign-in: not yet attempted, requires Apple Developer account ($99/yr)

## Deployment
- Hosted on Vercel (auto-deploys from main branch)
- Live URL: https://momentia-jooyas.vercel.app
- Vercel Authentication disabled (was causing double login on first visit)
- Supabase redirect URLs whitelisted:
    http://localhost:3000/**
    https://momentia-jooyas.vercel.app/**
- Supabase Site URL set to production URL