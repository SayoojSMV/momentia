# Changelog

## v0.6.0 — Public Landing Page
### Added
- Built a responsive public landing page component (`LandingPage.js`) rendered for unauthenticated users
- Hero banner with punchy value proposition and Google OAuth sign-in CTA buttons
- Core feature showcase grid highlighting AI Roadmaps, Smart Timetable, Interactive Study, and Social & Chat
- Header bar with blurred backdrop styling and direct OAuth trigger
- Offset top layout padding (`-mt-16 md:-mt-14`) to ensure header sits flush at top of screen

---

## v0.5.2 — Grouped Notification Threads & Stacked Previews
### Added
- Notification thread aggregation inside `NotificationBell` grouping multiple chat messages from the same sender into a single interactive card
- Stacked preview bubbles displaying up to 5 recent messages per conversation thread with unread state indicators
- Grouped mark-as-read interaction updating all notifications within a selected thread in a single batch query

### Fixed
- Fixed Supabase query method chain order in `NotificationBell` where `.in()` was incorrectly invoked before `.update()`

---

## v0.5.1 — Fix Chat Notifications & Schema Column Alignments
### Fixed
- Resolved Postgres error `42703` (`record "new" has no field "recipient_id"`) in `handle_new_chat_message` database trigger by correcting target column reference to `receiver_id`
- Cleaned up redundant database functions to maintain schema consistency across real-time message notification triggers

---

## v0.5.0 — Realtime Notifications & Chat UI Overhaul
### Added
- Real-time notification system with custom Supabase Postgres trigger (`handle_new_chat_message`) displaying the sender's actual display name
- Clickable notification cards with direct navigation routing to the specific sender's chat (`/friends?chat=[sender_id]`)
- WhatsApp-style inline timestamps positioned at the bottom-right of message bubbles

### Changed
- Refactored `NotificationBell` real-time channel setup to use dynamic channel names (`notifications_${userId}_${Date.now()}`) to prevent duplicate channel subscription runtime errors on page refreshes
- Removed standalone `"View details →"` link in notification cards in favor of full card tap/click interactions

---

## v0.4.0 — Unified Topbar & Layout Refactor
### Added
- Standardized dark mode styling across form elements, inputs, card backgrounds, and navigation containers (`dark:border-gray-800`, `dark:bg-gray-900`) (#84)

### Changed
- Refactored global layout architecture (`RootLayout`) to replace the persistent desktop sidebar with a unified, responsive top bar navigation across all breakpoints (#84)
- Sub-page containers (`Dashboard`, `SubjectPage`, `TopicPage`) refactored to inherit layout padding and maximum width cleanly (`w-full space-y-6`), removing redundant `<main>` wrapper tags (#84)
- Polished topic search dropdown overlay behavior and unit accordion component interactions (#84)
- Updated study timer styling, difficulty badge indicators, and Markdown typography formatting in study pages (#84)

---

## v0.3.0 — Polish and Responsiveness
### Added
- Responsive sidebar — hidden on mobile, replaced by fixed top bar
  with hamburger button that opens a full-width drawer overlay (#72)
- Markdown rendering in topic study pages — headers, code blocks,
  tables, lists all render properly instead of raw symbols
- Markdown rendering in AI chatbot — same formatting support with
  tighter spacing for the narrow chat bubble width
- react-markdown + remark-gfm for GitHub Flavored Markdown support
- @tailwindcss/typography for prose styling

### Fixed
- Global mobile layout alignment — applied global top padding (`pt-16 md:pt-0`) in RootLayout (`src/app/layout.js`) to prevent top navigation bar from obscuring page content on mobile screens

---

## v0.2.0 — Improvements ✅
### Added
- Real data on dashboard stat tiles and subject card completion (#28)
- Timer persistence — saves every 10s, on tab switch, on browser close (#29)
- Compact timer with pause/resume in topic page header (#30)
- Toggle mark-complete — can undo completion, reverts to in-progress (#31)
- Collapsible sidebar replacing top navbar (#32)
- User profile page — avatar, username, activity calendar, stats (#33)
- Message timestamps in chat (#34)
- Unread message notification dot on sidebar Friends icon (#35)
- Live friend name suggestions as user types in search (#36)
- Friend suggestions for users with no friends yet (#37)
- Topic search within subject roadmap page (#38)
- Settings page — Account details: designation, institution,
  year of study, prior subjects (#61)
- Settings page — Study preferences: daily goal, session length,
  rest day, exam reminder lead time (#62)
- Settings page — Appearance: dark mode toggle + sidebar default (#63)
- Dark mode — full styling pass across all pages and components,
  toggle in sidebar footer available on every page (#65)
- Add responsive sidebar — hidden on mobile with hamburger drawer (#72)
- Settings page — Danger zone: delete account, reset data (#64)

### Planned

### Fixed
- Notification dot not clearing after reading messages
  Root cause: missing UPDATE RLS policy on messages table causing
  mark-as-read to silently fail (write 0 rows with no error)
- Schema.sql syntax error in messages table definition
- Conflicting duplicate SELECT policies on profiles table
- Dark mode variants not applying — fixed by adding
  @custom-variant dark directive in globals.css (Tailwind v4 requirement)

---

## v0.1.0 — Core Feature Set (Deployed)
### Added
- AI chatbot (Gemini API, floating on every page, subject-aware)
- Friends page with search, friend requests, and real-time chat
- Real-time chat with optimistic updates and indexed queries
- Timetable scheduler (earliest-deadline-first algorithm)
- Today panel on dashboard showing current day's sessions
- Timetable page at /timetable grouped by date
- Topic content generation via Gemini (saved permanently)
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