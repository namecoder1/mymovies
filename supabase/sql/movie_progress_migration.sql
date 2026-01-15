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
