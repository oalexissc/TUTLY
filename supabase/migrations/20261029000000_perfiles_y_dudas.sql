create table if not exists public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null check (length(trim(nombre)) between 1 and 80),
  colegio text not null check (length(trim(colegio)) between 1 and 120),
  curso text not null check (curso in ('1ro BGU', '2do BGU', '3ro BGU')),
  role text not null default 'student' check (role in ('student', 'tutor')),
  materias text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.dudas (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.perfiles (id) on delete cascade,
  student_name text not null,
  grade text not null check (grade in ('1ro BGU', '2do BGU', '3ro BGU')),
  subject text not null check (subject in ('Matemáticas', 'Física', 'Química')),
  title text not null check (length(trim(title)) between 1 and 76),
  question text not null check (length(trim(question)) between 1 and 1200),
  reason text not null check (length(trim(reason)) between 1 and 80),
  detail text not null default '' check (length(detail) <= 600),
  stuck_time text not null check (stuck_time in ('Menos de 15 min', '15 a 45 min', 'Más de 45 min')),
  voice_note text check (voice_note is null or length(voice_note) <= 1500000),
  status text not null default 'pending' check (status in ('pending', 'answered')),
  answer text,
  answered_by uuid references public.perfiles (id),
  answered_by_name text,
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  constraint dudas_answer_state check (
    (status = 'pending' and answer is null and answered_by is null and answered_by_name is null and answered_at is null)
    or
    (status = 'answered' and answer is not null and length(trim(answer)) > 0 and answered_by is not null and answered_by_name is not null and answered_at is not null)
  )
);

create index if not exists dudas_student_created_idx on public.dudas (student_id, created_at desc);
create index if not exists dudas_status_created_idx on public.dudas (status, created_at desc);

create or replace function public.create_student_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_name text;
  profile_school text;
  profile_grade text;
begin
  profile_name := left(trim(coalesce(new.raw_user_meta_data ->> 'nombre', 'Estudiante')), 80);
  profile_school := left(trim(coalesce(new.raw_user_meta_data ->> 'colegio', 'Otro colegio')), 120);
  profile_grade := new.raw_user_meta_data ->> 'curso';

  if profile_name = '' then profile_name := 'Estudiante'; end if;
  if profile_school = '' then profile_school := 'Otro colegio'; end if;
  if profile_grade not in ('1ro BGU', '2do BGU', '3ro BGU') then profile_grade := '1ro BGU'; end if;

  insert into public.perfiles (id, nombre, colegio, curso, role)
  values (new.id, profile_name, profile_school, profile_grade, 'student');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.create_student_profile();
revoke all on function public.create_student_profile() from public, anon, authenticated;

create or replace function public.set_duda_student_snapshot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select p.nombre, p.curso
    into new.student_name, new.grade
    from public.perfiles p
    where p.id = new.student_id and p.role = 'student';

  if not found then
    raise exception 'A student profile is required to create a question';
  end if;

  return new;
end;
$$;

drop trigger if exists set_duda_student_snapshot on public.dudas;
create trigger set_duda_student_snapshot
  before insert on public.dudas
  for each row execute function public.set_duda_student_snapshot();
revoke all on function public.set_duda_student_snapshot() from public, anon, authenticated;

create or replace function public.set_duda_answer_metadata()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'answered' then
    select p.nombre
      into new.answered_by_name
      from public.perfiles p
      where p.id = new.answered_by and p.role = 'tutor';

    if not found then
      raise exception 'A tutor profile is required to answer a question';
    end if;

    new.answered_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists set_duda_answer_metadata on public.dudas;
create trigger set_duda_answer_metadata
  before update on public.dudas
  for each row execute function public.set_duda_answer_metadata();
revoke all on function public.set_duda_answer_metadata() from public, anon, authenticated;

alter table public.perfiles enable row level security;
alter table public.dudas enable row level security;

revoke all on public.perfiles from anon, authenticated;
revoke all on public.dudas from anon, authenticated;
grant select on public.perfiles to authenticated;
grant update (nombre, colegio, curso) on public.perfiles to authenticated;
grant select on public.dudas to authenticated;
grant insert (student_id, student_name, grade, subject, title, question, reason, detail, stuck_time, voice_note) on public.dudas to authenticated;
grant update (answer, answered_by, status) on public.dudas to authenticated;

drop policy if exists "Students and tutors read own profile" on public.perfiles;
create policy "Users read own profile"
  on public.perfiles for select to authenticated
  using (id = (select auth.uid()));

drop policy if exists "Students update own profile" on public.perfiles;
create policy "Students update own profile"
  on public.perfiles for update to authenticated
  using (id = (select auth.uid()) and role = 'student')
  with check (id = (select auth.uid()) and role = 'student');

drop policy if exists "Students and tutors read allowed questions" on public.dudas;
create policy "Students and tutors read allowed questions"
  on public.dudas for select to authenticated
  using (
    student_id = (select auth.uid())
    or exists (
      select 1 from public.perfiles p
      where p.id = (select auth.uid()) and p.role = 'tutor'
    )
  );

drop policy if exists "Students create own questions" on public.dudas;
create policy "Students create own questions"
  on public.dudas for insert to authenticated
  with check (
    student_id = (select auth.uid())
    and status = 'pending'
    and exists (
      select 1 from public.perfiles p
      where p.id = (select auth.uid()) and p.role = 'student'
    )
  );

drop policy if exists "Tutors answer pending questions" on public.dudas;
create policy "Tutors answer pending questions"
  on public.dudas for update to authenticated
  using (
    status = 'pending'
    and exists (
      select 1 from public.perfiles p
      where p.id = (select auth.uid()) and p.role = 'tutor'
    )
  )
  with check (
    status = 'answered'
    and answered_by = (select auth.uid())
    and exists (
      select 1 from public.perfiles p
      where p.id = (select auth.uid()) and p.role = 'tutor'
    )
  );

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'dudas'
  ) then
    alter publication supabase_realtime add table public.dudas;
  end if;
end;
$$;
