create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.tutor_allowlist (
  email text primary key check (email = lower(trim(email))),
  nombre text not null check (length(trim(nombre)) between 1 and 80),
  materias text[] not null default '{}'
);

alter table private.tutor_allowlist enable row level security;
revoke all on private.tutor_allowlist from public, anon, authenticated;

insert into private.tutor_allowlist (email, nombre)
values ('alexis1724@hotmail.es', 'Profesor')
on conflict (email) do update set nombre = excluded.nombre;

create or replace function public.create_student_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_name text;
  tutor_name text;
  profile_school text;
  profile_grade text;
  profile_role text := 'student';
  profile_subjects text[] := '{}';
begin
  profile_name := left(trim(coalesce(new.raw_user_meta_data ->> 'nombre', 'Estudiante')), 80);
  profile_school := left(trim(coalesce(new.raw_user_meta_data ->> 'colegio', 'Otro colegio')), 120);
  profile_grade := new.raw_user_meta_data ->> 'curso';

  if profile_name = '' then profile_name := 'Estudiante'; end if;
  if profile_school = '' then profile_school := 'Otro colegio'; end if;
  if profile_grade is null or profile_grade not in ('1ro BGU', '2do BGU', '3ro BGU') then
    profile_grade := '1ro BGU';
  end if;

  select allowlist.nombre, allowlist.materias
    into tutor_name, profile_subjects
    from private.tutor_allowlist allowlist
    where allowlist.email = lower(trim(new.email));

  if found then
    profile_role := 'tutor';
    profile_name := tutor_name;
  else
    profile_subjects := '{}';
  end if;

  insert into public.perfiles (id, nombre, colegio, curso, role, materias)
  values (new.id, profile_name, profile_school, profile_grade, profile_role, profile_subjects);
  return new;
end;
$$;

revoke all on function public.create_student_profile() from public, anon, authenticated;
