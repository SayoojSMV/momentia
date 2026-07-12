# Changelog

## v0.2.0 — Improvements (In Progress)
### Completed
- Real data on dashboard stat tiles and subject card completion (#28)
- Persist and resume topic timer — saves every 10s, on tab switch, on browser close (#29)
- Compact timer with pause/resume button in topic header, fixed double content generation bug (#30)
- Toggle mark-complete (#31)
- Collapsible sidebar navigation (#32)
- User profile page (#33)
- Message timestamps in chat (#34)

### Planned
- Unread message notification dot (#35)
- Live friend name suggestions (#36)
- Friend suggestions for new users (#37)
- Topic search within subject (#38)

---

## v0.1.0 — Core Feature Set (Deployed)
### Added
- AI chatbot (Gemini API, floating on every page, subject-aware)
- Friends page with search, friend requests, and real-time chat
- Real-time chat with optimistic updates and indexed queries
- Timetable scheduler (earliest-deadline-first algorithm)
- Today panel on dashboard showing current day's sessions
- Timetable page at /timetable grouped by date
- Topic content generation via Gemini (saved permanently, never regenerated)
- Roadmap generation without materials (uses subject name as context)
- Roadmap regeneration preserves completed and in-progress topics
- Delete subject with confirmation dialog
- Remove friend with confirmation dialog
- Fixed chat scroll (message list scrolls independently)

---

## v0.0.5 — Study Flow
### Added
- AI roadmap generation using Gemini API
- File upload to Supabase Storage
- Topic study page with live stopwatch timer
- Mark complete with time tracking

---

## v0.0.4 — Subject Pages
### Added
- Subject roadmap page with expandable units and topics
- Manual unit and topic creation
- Subject cards link to roadmap page
- Topic cards link to topic study page

---

## v0.0.3 — Auth and Dashboard
### Added
- Google OAuth sign-in via Supabase
- Auto profile creation via database trigger
- Dashboard with stat tiles and subject cards
- Add Subject modal (name, category, exam date)
- Shared Navbar component with sign out

---

## v0.0.2 — Database
### Added
- Supabase project integration
- Full database schema (6 tables)
- Row Level Security policies
- Shared Supabase client at src/lib/supabase.js

---

## v0.0.1 — Scaffold
### Added
- Next.js 16 project with App Router
- Tailwind CSS
- ESLint
- Project documentation (README, decisions, architecture, roadmap)
