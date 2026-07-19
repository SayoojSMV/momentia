# Momentia

A study-management web app for students — organize subjects, materials,
and deadlines, get AI-generated roadmaps and timetables, and study with
friends.

## Live App
https://momentia-jooyas.vercel.app

## Status
✅ v0.2.0 — All planned features complete and deployed.

## Tech Stack
- **Frontend**: Next.js 16 (JavaScript) + Tailwind CSS
- **Backend/Auth/DB/Storage**: Supabase
- **AI**: Google Gemini API (gemini-2.5-flash)
- **Hosting**: Vercel

## Features
- Google OAuth sign-in
- Add subjects under Academics, Side Quests, or Test Prep
- Upload study materials (PDF, PPTX, DOCX, images)
- AI-generated roadmap per subject (units → topics)
- AI-generated study content per topic (saved permanently)
- Live study timer with pause, resume, and persistence across sessions
- Toggle mark-complete (undoable)
- AI timetable scheduler (earliest-deadline-first)
- Today panel on dashboard
- Collapsible sidebar navigation with subjects list
- User profile with avatar, username, and activity calendar
- Friends system with requests and real-time chat
- Unread message notification dot
- Topic search within each subject
- Persistent AI study assistant (context-aware, on every page)

## Getting Started (Local Development)

### Prerequisites
- Node.js 18.18+
- A Supabase project
- A Google Cloud project with OAuth credentials
- A Gemini API key

### Setup

1. Clone the repo

       git clone https://github.com/SayoojSMV/momentia.git
       cd momentia

2. Install dependencies

       npm install

3. Create `.env.local` with your keys

       NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
       NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
       SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
       GEMINI_API_KEY=your-gemini-key

4. Run the database schema

   Copy `supabase/schema.sql` into the Supabase SQL Editor and run it.
   Also create two storage buckets manually in the Supabase dashboard:
   - `materials` (private)
   - `avatars` (public)

5. Set up Google OAuth

   - Create a project in Google Cloud Console
   - Enable OAuth and add the Supabase callback URL as a redirect URI
   - Add Client ID and Secret to Supabase: Authentication → Providers → Google

6. Start the dev server

       npm run dev

## Database Schema
See `supabase/schema.sql` — a complete, re-runnable file that recreates
all 9 tables, RLS policies, triggers, indexes, and storage policies.

## Docs
- `docs/architecture.md` — system overview and folder structure
- `docs/decisions.md` — why things were built the way they were
- `docs/project-roadmap.md` — feature checklist by phase

## Contributors
- Sayooj Simon (@SayoojSMV)