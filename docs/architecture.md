# Momentia Architecture

This document describes the overall architecture of Momentia and how different parts of the application interact.

---

# 1. High Level Architecture

```
                +----------------------+
                |      Browser         |
                +----------+-----------+
                           |
                           |
                    Next.js Frontend
                           |
        +------------------+------------------+
        |                  |                  |
        |                  |                  |
   Authentication      Database          AI Services
      (Supabase)      (Supabase)          (Claude)
        |                  |                  |
        +------------------+------------------+
                           |
                    File Storage
                  (Supabase Storage)
```

---

# 2. Technology Stack

## Frontend

- Next.js
- React
- Tailwind CSS

## Backend

- Supabase

## Database

- PostgreSQL

## Authentication

- Google OAuth
- Microsoft OAuth
- Apple OAuth (Planned)

## AI

- Claude API

## Hosting

- Vercel

---

# 3. Folder Structure

```
src/
│
├── app/
│
├── components/
│
├── lib/
│
├── hooks/
│
├── services/
│
├── utils/
│
└── styles/
```

This structure will evolve as development progresses.

---

# 4. Database Architecture

Current tables:

- profiles
- subjects
- units
- topics
- topic_dependencies
- materials

Relationships

profiles
    │
    │
subjects
    │
    │
units
    │
    │
topics
    │
topic_dependencies

subjects
    │
materials

---

# 5. Authentication Flow

User

↓

Select Google / Microsoft Login

↓

Supabase Authentication

↓

OAuth Provider

↓

User Authenticated

↓

Create Profile (if first login)

↓

Dashboard

---

# 6. Subject Learning Flow

Dashboard

↓

Select Subject

↓

Roadmap

↓

Unit

↓

Topic

↓

Study Page

↓

Complete Topic

↓

Update Progress

↓

Regenerate Timetable

---

# 7. AI Pipeline

User uploads

↓

Study Materials

↓

Claude API

↓

Generate Roadmap

↓

Store in Database

↓

Generate Timetable

↓

Dashboard

---

# 8. Planned Features

Dashboard

Subject Management

Roadmap Viewer

Study Page

Dynamic Timetable

AI Chatbot

Friends

Notifications

Analytics

---

# 9. Security

- Row Level Security (RLS)
- OAuth Authentication
- Environment Variables
- Protected Routes
- Secure API Keys

---

# 10. Deployment

Frontend

↓

Vercel

Backend

↓

Supabase

AI

↓

Claude API

Storage

↓

Supabase Storage

---

Last Updated:
June 2026