# Momentia Architecture

## Overview
Next.js app with Supabase for all backend concerns and Gemini for AI.
No separate backend server — API routes in Next.js handle server-side logic.

## Folder Structure
src/
  app/
    page.js                        ← Dashboard (homepage)
    layout.js                      ← Root layout (Navbar, Chatbot)
    login/page.js                  ← Google OAuth sign-in
    auth/callback/page.js          ← OAuth callback handler
    subject/[id]/page.js           ← Subject roadmap page
    subject/[id]/topic/[topicId]/  ← Topic study page with timer
    timetable/page.js              ← Full timetable view
    friends/page.js                ← Friends and real-time chat
    api/
      generate-roadmap/route.js    ← Gemini roadmap generation
      generate-content/route.js    ← Gemini topic content generation
      chat/route.js                ← Gemini AI assistant
      generate-schedule/route.js   ← Timetable scheduler
  components/
    Navbar.js                      ← Top navigation
    Chatbot.js                     ← Floating AI assistant
  lib/
    supabase.js                    ← Shared Supabase client
supabase/
  schema.sql                       ← Complete database schema

## Database Tables
- profiles       — user data, streak, daily_study_minutes
- subjects       — name, category, exam_date, user_id
- units          — belong to subjects, ordered
- topics         — belong to units, status, timer, content
- topic_dependencies — prerequisite relationships between topics
- materials      — file metadata for uploaded study materials

## AI Pipeline
1. User uploads materials to Supabase Storage
2. Frontend sends subject name + material filenames to
   /api/generate-roadmap
3. Gemini generates units/topics via tool-use with strict schema
4. Units and topics saved to Supabase
5. On first topic visit, /api/generate-content generates study notes
   and saves them permanently to topics.content
6. /api/generate-schedule runs the timetable algorithm and stores
   results in the schedule table

## Auth Flow
1. User clicks "Continue with Google" on /login
2. Supabase redirects to Google OAuth
3. Google redirects back to /auth/callback
4. Supabase exchanges the code for a session
5. handle_new_user() trigger auto-creates a profiles row
6. User redirected to dashboard

## Key Patterns
- 'use client' on any component with event handlers or hooks
- API routes for all AI calls (keys never exposed to browser)
- RLS policies enforce data ownership at the database level
- schema.sql is the single source of truth for the database