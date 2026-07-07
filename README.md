# Momentia

A study-management web app for students — organize subjects, materials,
and deadlines, and get AI-generated roadmaps and a dynamic timetable.

## Live App
https://momentia-jooyas.vercel.app

## Status
✅ Core feature set complete and deployed. Improvements in progress.

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
- Live study timer with completion tracking
- AI timetable scheduler (earliest-deadline-first)
- Today panel on dashboard
- Friends system with real-time chat
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

3. Create .env.local with your keys
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   GEMINI_API_KEY=your-gemini-key

4. Run the database schema
   Copy supabase/schema.sql into the Supabase SQL Editor and run it

5. Start the dev server
   npm run dev

## Database Schema
See supabase/schema.sql — a complete, re-runnable file that recreates
all tables, RLS policies, and triggers from scratch.

## Contributors
- Sayooj Simon (@SayoojSMV)