-- =============================================
-- 현장학습 일지 앱 Supabase 설정 SQL
-- Supabase > SQL Editor에서 실행
-- =============================================

-- 1. profiles 테이블
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  nickname text unique not null,
  name text,
  is_admin boolean default false,
  created_at timestamptz default now()
);

-- 2. journal_entries 테이블
create table if not exists public.journal_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  day_number integer not null check (day_number between 0 and 5),
  content jsonb not null default '{}',
  updated_at timestamptz default now(),
  unique(user_id, day_number)
);

-- 3. updated_at 자동 갱신 트리거
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger journal_entries_updated_at
  before update on journal_entries
  for each row execute function update_updated_at();

-- 4. RLS (Row Level Security) 활성화
alter table public.profiles enable row level security;
alter table public.journal_entries enable row level security;

-- 5. profiles RLS 정책
create policy "누구나 자신의 프로필 조회 가능"
  on profiles for select using (auth.uid() = id);

create policy "누구나 자신의 프로필 생성 가능"
  on profiles for insert with check (auth.uid() = id);

create policy "누구나 자신의 프로필 수정 가능"
  on profiles for update using (auth.uid() = id);

create policy "관리자는 모든 프로필 조회 가능"
  on profiles for select
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- 6. journal_entries RLS 정책
create policy "학생은 자신의 일지만 조회"
  on journal_entries for select using (auth.uid() = user_id);

create policy "학생은 자신의 일지만 작성"
  on journal_entries for insert with check (auth.uid() = user_id);

create policy "학생은 자신의 일지만 수정"
  on journal_entries for update using (auth.uid() = user_id);

create policy "관리자는 모든 일지 조회 가능"
  on journal_entries for select
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- 7. 관리자 계정 사전 등록 (auth는 앱에서 가입, 여기선 profiles만)
-- 실제 가입 후 아래 쿼리로 관리자 권한 수동 부여 가능:
-- update profiles set is_admin = true where nickname = 'admin';
