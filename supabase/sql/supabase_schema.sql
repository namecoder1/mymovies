-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Drop existing tables if they exist (clean slate as requested)
drop table if exists user_media;
drop table if exists profiles;

-- Create profiles table
create table profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  short text,
  avatar_url text, -- Store as URL or reference to storage path
  age text, -- Birthdate in DD/MM/YYYY format for age-based content filtering
  created_at timestamptz default now()
);

-- Create user_media table (formerly watchList)
create table user_media (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references profiles(id) on delete cascade not null,
  tmdb_id integer not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  title text not null,
  release_date text,
  poster_path text,
  status text not null check (status in ('watching', 'completed', 'dropped', 'plan_to_watch')),
  is_favorite boolean default false,
  progress integer default 0, -- minutes or episode count
  total_duration integer default 0, -- runtime or total episodes
  rating real, -- 1-10
  vote text check (vote in ('like', 'dislike')), -- User explicitly liked/disliked
  genres jsonb, -- Stored as JSONB for better querying flexibility if needed
  last_season integer,
  last_episode integer,
  updated_at timestamptz default now(),
  created_at timestamptz default now(),
  unique(profile_id, tmdb_id, media_type)
);

-- Enable Row Level Security
alter table profiles enable row level security;
alter table user_media enable row level security;

-- Policies for profiles
create policy "Users can view their own profiles"
  on profiles for select
  using (auth.uid() = user_id);

create policy "Users can insert their own profiles"
  on profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own profiles"
  on profiles for update
  using (auth.uid() = user_id);

create policy "Users can delete their own profiles"
  on profiles for delete
  using (auth.uid() = user_id);

-- Policies for user_media
-- Since user_media is linked to profiles, we check if the profile belongs to the user
create policy "Users can view media for their profiles"
  on user_media for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = user_media.profile_id
      and profiles.user_id = auth.uid()
    )
  );

create policy "Users can insert media for their profiles"
  on user_media for insert
  with check (
    exists (
      select 1 from profiles
      where profiles.id = user_media.profile_id
      and profiles.user_id = auth.uid()
    )
  );

create policy "Users can update media for their profiles"
  on user_media for update
  using (
    exists (
      select 1 from profiles
      where profiles.id = user_media.profile_id
      and profiles.user_id = auth.uid()
    )
  );

create policy "Users can delete media for their profiles"
  on user_media for delete
  using (
    exists (
      select 1 from profiles
      where profiles.id = user_media.profile_id
      and profiles.user_id = auth.uid()
    )
  );

-- Function to handle updated_at
create or replace function handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_media_updated
  before update on user_media
  for each row
  execute procedure handle_updated_at();


-- Create episode_progress table
create table episode_progress (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references profiles(id) on delete cascade not null,
  tmdb_id integer not null,
  season_number integer not null,
  episode_number integer not null,
  progress integer default 0, -- accumulated seconds/minutes watched (depending on implementation, usually seconds)
  duration integer default 0, -- total duration in same unit
  updated_at timestamptz default now(),
  unique(profile_id, tmdb_id, season_number, episode_number)
);

-- Enable RLS for episode_progress
alter table episode_progress enable row level security;

-- Policies for episode_progress
create policy "Users can view episode progress for their profiles"
  on episode_progress for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = episode_progress.profile_id
      and profiles.user_id = auth.uid()
    )
  );

create policy "Users can insert episode progress for their profiles"
  on episode_progress for insert
  with check (
    exists (
      select 1 from profiles
      where profiles.id = episode_progress.profile_id
      and profiles.user_id = auth.uid()
    )
  );

create policy "Users can update episode progress for their profiles"
  on episode_progress for update
  using (
    exists (
      select 1 from profiles
      where profiles.id = episode_progress.profile_id
      and profiles.user_id = auth.uid()
    )
  );

create policy "Users can delete episode progress for their profiles"
  on episode_progress for delete
  using (
    exists (
      select 1 from profiles
      where profiles.id = episode_progress.profile_id
      and profiles.user_id = auth.uid()
    )
  );

create trigger on_episode_progress_updated
  before update on episode_progress
  for each row
  execute procedure handle_updated_at();


-- SEED DATA
-- IMPORTANT: Replace 'YOUR_USER_UUID_HERE' with the actual UUID of your user from auth.users
-- You can find this in the Supabase Dashboard -> Authentication -> Users

do $$
declare
  -- Replace this with your actual user ID if you know it, otherwise you'll need to manually run the insert with the correct ID
  -- For the script to be runnable without editing (if running as the user in SQL editor sometimes auth.uid() works if called via API, but valid SQL editor session might be different)
  -- We will rely on the user replacing the placeholder or running a query to get it.
  -- HOWEVER, since the user is copying this, let's provide a comment block to insert the profiles using the currently logged in user context (if supported) or manually.
  
  -- defaulting to a placeholder variable
  target_user_id uuid; 
begin
  -- Attempt to get the current user ID if running in a context where it's available, otherwise you MUST manually set it.
  -- In Supabase SQL Editor, auth.uid() returns null usually.
  -- So we will create a placeholder.
  
  -- UNCOMMENT AND SET YOUR USER ID HERE
  -- target_user_id := 'YOUR-UUID-GOES-HERE'; 
  
  -- If you don't know the ID, run: select id from auth.users limit 1;
  -- Assuming there is only one user as per requirements:
  select id into target_user_id from auth.users limit 1;

  if target_user_id is not null then
    insert into profiles (user_id, name, avatar_url) values
    (target_user_id, 'tobi', null),
    (target_user_id, 'milo', null),
    (target_user_id, 'nina', null),
    (target_user_id, 'alma', null),
    (target_user_id, 'parenti', null)
    on conflict do nothing; -- Prevent dupes if re-run
  end if;
end $$;

-- Triggers or other logic if needed
-- Create movie_progress table
create table if not exists movie_progress (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references profiles(id) on delete cascade not null,
  tmdb_id integer not null,
  progress integer default 0, -- accumulated seconds watched
  duration integer default 0, -- total duration in seconds
  updated_at timestamptz default now(),
  unique(profile_id, tmdb_id)
);

-- Enable RLS for movie_progress
alter table movie_progress enable row level security;

-- Policies for movie_progress
create policy "Users can view movie progress for their profiles"
  on movie_progress for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = movie_progress.profile_id
      and profiles.user_id = auth.uid()
    )
  );

create policy "Users can insert movie progress for their profiles"
  on movie_progress for insert
  with check (
    exists (
      select 1 from profiles
      where profiles.id = movie_progress.profile_id
      and profiles.user_id = auth.uid()
    )
  );

create policy "Users can update movie progress for their profiles"
  on movie_progress for update
  using (
    exists (
      select 1 from profiles
      where profiles.id = movie_progress.profile_id
      and profiles.user_id = auth.uid()
    )
  );

create policy "Users can delete movie progress for their profiles"
  on movie_progress for delete
  using (
    exists (
      select 1 from profiles
      where profiles.id = movie_progress.profile_id
      and profiles.user_id = auth.uid()
    )
  );

create trigger on_movie_progress_updated
  before update on movie_progress
  for each row
  execute procedure handle_updated_at();
