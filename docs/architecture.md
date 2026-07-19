# Momentia Architecture

## Overview
Next.js app with Supabase for all backend concerns and Gemini for AI.
No separate backend server — API routes in Next.js handle server-side logic.

## Folder Structure
src/
  app/
    page.js                          ← Dashboard (homepage, protected)
    layout.js                        ← Root layout (Sidebar, Chatbot)
    login/page.js                    ← Google OAuth sign-in
    auth/callback/page.js            ← OAuth callback handler
    subject/[id]/page.js             ← Subject roadmap page with topic search
    subject/[id]/topic/[topicId]/
      page.js                        ← Topic study page with timer
    timetable/page.js                ← Full timetable view
    friends/page.js                  ← Friends, requests, real-time chat
    profile/page.js                  ← User profile (avatar, username, calendar)
    settings/page.js                 ← App settings
    api/
      generate-roadmap/route.js      ← Gemini roadmap generation
      generate-content/route.js      ← Gemini topic content generation
      generate-timetable/route.js    ← Timetable scheduler
      chat/route.js                  ← Gemini AI assistant
  components/
    Sidebar.js                       ← Collapsible left sidebar (all pages)
    Chatbot.js                       ← Floating AI assistant (all pages)
  lib/
    supabase.js                      ← Shared Supabase client
supabase/
  schema.sql                         ← Complete re-runnable DB schema
docs/
  decisions.md                       ← Architecture decisions log
  architecture.md                    ← System architecture overview
  project-roadmap.md                 ← Feature roadmap with checkboxes

## Database Tables (all with RLS)
- profiles        id, full_name, avatar_url, username, current_streak,
                  last_study_date, daily_study_minutes
- subjects        id, user_id, name, category, exam_date, accent
- units           id, subject_id, name, order_index
- topics          id, unit_id, name, minutes, difficulty, status,
                  time_spent_seconds, source, order_index, content
- topic_dependencies  topic_id, depends_on_topic_id
- materials       id, subject_id, file_name, storage_path, file_type
- schedule        id, user_id, topic_id, subject_id, scheduled_date
- friend_requests id, sender_id, receiver_id, status
- messages        id, sender_id, receiver_id, content, is_read

## AI Pipeline
1. User uploads materials to Supabase Storage (materials bucket)
2. Frontend sends subject name + material filenames to
   /api/generate-roadmap
3. Gemini generates units/topics via tool-use with strict JSON schema
4. Units and topics saved to Supabase
5. On first topic visit, /api/generate-content generates study notes
   and saves them permanently to topics.content (never regenerated)
6. /api/generate-timetable runs the earliest-deadline-first scheduling
   algorithm and stores results in the schedule table

## Auth Flow
1. User clicks "Continue with Google" on /login
2. supabase.auth.signInWithOAuth({ provider: 'google' })
3. Google redirects back to /auth/callback
4. Supabase exchanges the code for a session
5. handle_new_user() trigger auto-creates a profiles row
6. User redirected to dashboard (/)

## Real-time
- messages table has REPLICA IDENTITY FULL for reliable UPDATE events
- Sidebar subscribes to message INSERT events to show unread dot
- Friends page subscribes to message INSERT for live incoming messages
- messages table added to supabase_realtime publication

## Key Patterns
- 'use client' on any component with event handlers or hooks
- API routes handle all Gemini calls (keys never exposed to browser)
- RLS policies enforce data ownership at DB level using auth.uid()
- Tables without direct user_id use nested EXISTS subqueries for RLS
- schema.sql is the single source of truth for the database
- Supabase anon key is safe client-side when RLS is properly enforced
- Service role key used only in API routes (server-side only)