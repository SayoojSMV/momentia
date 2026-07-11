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
- Hosting: Vercel

## Database Architecture
Six core tables: profiles, subjects, units, topics,
topic_dependencies, materials.
Row Level Security using auth.uid() ownership checks.
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

## Timetable Scheduling
- Earliest-deadline-first packing algorithm (deterministic code, not AI)
- Gemini handles only priority judgment, not the scheduling math
- Side Quests excluded from scheduling entirely
- Schedule recomputes on topic completion or deadline change

## Dashboard
- Dashboard is the homepage (no separate welcome screen for logged-in users)
- Public landing page (logged-out) is a future addition
- Four stat tiles: Status, Current streak, Overall completion, Time spent
- Today panel shows current day's scheduled topics

## Chatbot
- Floating button (bottom-right) in layout.js — appears on every page
- Conversation built as a single prompt string (not startChat history)
  Reason: Gemini's startChat requires strict user/model alternation
  which caused reliability issues
- No DB storage for chat history — resets on page refresh (intentional)
- File upload supported (filename sent as context)

## Friends & Chat
- Users searchable by full_name via ilike query on profiles table
- Required a "view all profiles" RLS policy addition for search to work
- Real-time messaging via Supabase postgres_changes subscription
- Optimistic updates for sent messages (added to state immediately)
- messages table indexed on sender_id and receiver_id

## Authentication
- Google sign-in: fully implemented and working (#7)
- Microsoft sign-in: blocked (#17)
  Persistent AADSTS50020/AADSTS16000 errors across all account types
  and browsers. Suspected Windows-level Web Account Manager cache issue.
  Deferred as post-deployment optional goal.
- Apple sign-in: not yet attempted, requires Apple Developer account ($99/yr)

## Deployment
- Hosted on Vercel (auto-deploys from main branch)
- Live URL: https://momentia-jooyas.vercel.app
- Supabase URL Configuration updated with production URL
- Vercel Authentication disabled (was causing double login)
- Redirect URLs whitelisted: localhost:3000/** and
  momentia-jooyas.vercel.app/**

## Sidebar Navigation
- Replaced top horizontal navbar with a collapsible left icon sidebar
- Collapsed state: 56px wide, icons only
- Expanded state: 224px wide, icons + labels, triggered by hamburger click
- Collapses on outside click or nav link click via invisible overlay div
- Subjects section lists all user subjects with direct links
- Hidden on login and auth callback pages via pathname check
- Renamed Navbar.js to Sidebar.js

## Profile Page
- Avatar stored in Supabase Storage 'avatars' bucket (public bucket)
- Avatar path: {user_id}/avatar_{timestamp}.{ext}
- Username stored in profiles.username (unique constraint)
- Real-time availability check on every keystroke using .limit(1) query
- Save button disabled while status is 'checking' or 'taken'
- Activity calendar shows last 15 weeks, colored by time_spent_seconds per day
- Stats calculated live from subjects/units/topics tables