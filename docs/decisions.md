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

