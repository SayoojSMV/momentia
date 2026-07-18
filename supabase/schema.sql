-- Momentia database schema
-- Run this in the Supabase SQL Editor on a fresh project to recreate everything

create extension if not exists pgcrypto;

-- ============ TABLES ============

create table profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  avatar_url text,
  current_streak integer default 0,
  last_study_date date,
  created_at timestamp with time zone default now()
);

create table subjects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  category text not null check (category in ('academics', 'side_quest', 'test_prep')),
  exam_date date,
  accent text default 'info',
  created_at timestamp with time zone default now()
);

create table units (
  id uuid default gen_random_uuid() primary key,
  subject_id uuid references subjects on delete cascade not null,
  name text not null,
  order_index integer default 0
);

create table topics (
  id uuid default gen_random_uuid() primary key,
  unit_id uuid references units on delete cascade not null,
  name text not null,
  minutes integer not null default 25,
  difficulty text default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  status text default 'not_started' check (status in ('not_started', 'in_progress', 'completed')),
  time_spent_seconds integer default 0,
  source text default 'from_materials' check (source in ('from_materials', 'inferred')),
  order_index integer default 0,
  created_at timestamp with time zone default now()
);

create table topic_dependencies (
  topic_id uuid references topics on delete cascade not null,
  depends_on_topic_id uuid references topics on delete cascade not null,
  primary key (topic_id, depends_on_topic_id)
);

create table materials (
  id uuid default gen_random_uuid() primary key,
  subject_id uuid references subjects on delete cascade not null,
  file_name text not null,
  storage_path text not null,
  file_type text,
  uploaded_at timestamp with time zone default now()
);

-- ============ ENABLE RLS ============

alter table profiles enable row level security;
alter table subjects enable row level security;
alter table units enable row level security;
alter table topics enable row level security;
alter table topic_dependencies enable row level security;
alter table materials enable row level security;

-- ============ POLICIES ============

-- profiles
create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles
  for insert with check (auth.uid() = id);

-- subjects
create policy "Users can view own subjects" on subjects
  for select using (auth.uid() = user_id);
create policy "Users can insert own subjects" on subjects
  for insert with check (auth.uid() = user_id);
create policy "Users can update own subjects" on subjects
  for update using (auth.uid() = user_id);
create policy "Users can delete own subjects" on subjects
  for delete using (auth.uid() = user_id);

-- units
create policy "Users can view own units" on units
  for select using (
    exists (select 1 from subjects where subjects.id = units.subject_id and subjects.user_id = auth.uid())
  );
create policy "Users can insert own units" on units
  for insert with check (
    exists (select 1 from subjects where subjects.id = units.subject_id and subjects.user_id = auth.uid())
  );
create policy "Users can update own units" on units
  for update using (
    exists (select 1 from subjects where subjects.id = units.subject_id and subjects.user_id = auth.uid())
  );
create policy "Users can delete own units" on units
  for delete using (
    exists (select 1 from subjects where subjects.id = units.subject_id and subjects.user_id = auth.uid())
  );

-- topics
create policy "Users can view own topics" on topics
  for select using (
    exists (
      select 1 from units join subjects on subjects.id = units.subject_id
      where units.id = topics.unit_id and subjects.user_id = auth.uid()
    )
  );
create policy "Users can insert own topics" on topics
  for insert with check (
    exists (
      select 1 from units join subjects on subjects.id = units.subject_id
      where units.id = topics.unit_id and subjects.user_id = auth.uid()
    )
  );
create policy "Users can update own topics" on topics
  for update using (
    exists (
      select 1 from units join subjects on subjects.id = units.subject_id
      where units.id = topics.unit_id and subjects.user_id = auth.uid()
    )
  );
create policy "Users can delete own topics" on topics
  for delete using (
    exists (
      select 1 from units join subjects on subjects.id = units.subject_id
      where units.id = topics.unit_id and subjects.user_id = auth.uid()
    )
  );

-- topic_dependencies
create policy "Users can view own topic dependencies" on topic_dependencies
  for select using (
    exists (
      select 1 from topics join units on units.id = topics.unit_id
      join subjects on subjects.id = units.subject_id
      where topics.id = topic_dependencies.topic_id and subjects.user_id = auth.uid()
    )
  );
create policy "Users can manage own topic dependencies" on topic_dependencies
  for all using (
    exists (
      select 1 from topics join units on units.id = topics.unit_id
      join subjects on subjects.id = units.subject_id
      where topics.id = topic_dependencies.topic_id and subjects.user_id = auth.uid()
    )
  );

-- materials
create policy "Users can view own materials" on materials
  for select using (
    exists (select 1 from subjects where subjects.id = materials.subject_id and subjects.user_id = auth.uid())
  );
create policy "Users can manage own materials" on materials
  for all using (
    exists (select 1 from subjects where subjects.id = materials.subject_id and subjects.user_id = auth.uid())
  );

-- Create the trigger function
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Prepopulate the profiles table with existing users
insert into public.profiles (id, full_name, avatar_url)
select id, raw_user_meta_data->>'full_name', raw_user_meta_data->>'avatar_url'
from auth.users
on conflict (id) do nothing;

-- ============ STORAGE POLICIES ============
-- (materials bucket must be created manually in Supabase dashboard)
create policy "Users can upload own materials"
on storage.objects for insert
with check (
  bucket_id = 'materials' and
  auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can read own materials"
on storage.objects for select
using (
  bucket_id = 'materials' and
  auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can delete own materials"
on storage.objects for delete
using (
  bucket_id = 'materials' and
  auth.uid()::text = (storage.foldername(name))[1]
);

--- ============ SCHEDULE TABLE ============
create table schedule (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  topic_id uuid references topics on delete cascade not null,
  subject_id uuid references subjects on delete cascade not null,
  scheduled_date date not null,
  created_at timestamp with time zone default now()
);

alter table schedule enable row level security;

create policy "Users can view own schedule"
on schedule for select
using (auth.uid() = user_id);

create policy "Users can insert own schedule"
on schedule for insert
with check (auth.uid() = user_id);

create policy "Users can delete own schedule"
on schedule for delete
using (auth.uid() = user_id);

--- ============ FRIEND REQUESTS AND MESSAGES TABLES ============
create table friend_requests (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references auth.users on delete cascade not null,
  receiver_id uuid references auth.users on delete cascade not null,
  status text default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamp with time zone default now(),
  unique(sender_id, receiver_id)
);

create table messages (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references auth.users on delete cascade not null,
  receiver_id uuid references auth.users on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default now()
  is_read boolean default false,
);

alter table friend_requests enable row level security;
alter table messages enable row level security;

create policy "Users can view own friend requests"
on friend_requests for select
using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "Users can send friend requests"
on friend_requests for insert
with check (auth.uid() = sender_id);

create policy "Users can update received requests"
on friend_requests for update
using (auth.uid() = receiver_id);

create policy "Users can view own messages"
on messages for select
using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "Users can send messages"
on messages for insert
with check (auth.uid() = sender_id);

--user search policy
create policy "Users can view all profiles for search"
on profiles for select
using (auth.uid() is not null);

--- ============ REALTIME PUBLICATION ============
alter publication supabase_realtime add table messages;

--- ============ INDEXES ============
create index if not exists messages_sender_id_idx on messages(sender_id);
create index if not exists messages_receiver_id_idx on messages(receiver_id);

--- ============ MIGRATIONS ============
alter table topics add column content text;

--- Add username column to profiles table
alter table profiles add column username text unique;

--- ============ AVATAR STORAGE POLICIES ============
create policy "Users can upload own avatar"
on storage.objects for insert
with check (
  bucket_id = 'avatars' and
  auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can update own avatar"
on storage.objects for update
using (
  bucket_id = 'avatars' and
  auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Anyone can view avatars"
on storage.objects for select
using (bucket_id = 'avatars');

create policy "Users can delete own avatar"
on storage.objects for delete
using (
  bucket_id = 'avatars' and
  auth.uid()::text = (storage.foldername(name))[1]
);


