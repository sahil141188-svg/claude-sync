-- ============================================================================
-- Health Care Companion — Supabase schema
-- Run this in the Supabase SQL editor (or `supabase db push`).
-- ============================================================================

create extension if not exists "uuid-ossp";

-- ── Enums ───────────────────────────────────────────────────────────────────
create type user_role as enum ('caregiver', 'patient');
create type medicine_slot as enum ('morning', 'afternoon', 'night', 'custom');
create type food_relation as enum ('before_food', 'after_food', 'any');
create type sugar_type as enum ('fasting', 'pp', 'random');
create type exercise_type as enum ('walking', 'yoga', 'cycling', 'meditation', 'other');
create type report_status as enum ('improving', 'needs_attention', 'critical');

-- ── Profiles (linked to auth.users) ─────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role user_role not null default 'caregiver',
  phone text,
  created_at timestamptz not null default now()
);

-- ── Medicines ───────────────────────────────────────────────────────────────
create table public.medicines (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slots medicine_slot[] not null default '{}',
  custom_time time,
  food_relation food_relation not null default 'any',
  quantity text not null default '1 tablet',
  start_date date not null default current_date,
  end_date date,
  notes text,
  color_tag text not null default '#2563eb',
  doctor_name text,
  stock_count int,
  low_stock_threshold int not null default 5,
  expiry_date date,
  archived boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- ── Medicine logs (one row per medicine per slot per day) ───────────────────
create table public.medicine_logs (
  id uuid primary key default uuid_generate_v4(),
  medicine_id uuid not null references public.medicines(id) on delete cascade,
  log_date date not null,
  slot medicine_slot not null,
  scheduled_at timestamptz not null,
  taken boolean not null default false,
  taken_at timestamptz,
  reminder_15_sent boolean not null default false,
  reminder_45_sent boolean not null default false,
  caregiver_alert_sent boolean not null default false,
  created_at timestamptz not null default now(),
  unique (medicine_id, log_date, slot)
);

-- ── Readings ────────────────────────────────────────────────────────────────
create table public.sugar_readings (
  id uuid primary key default uuid_generate_v4(),
  value numeric(5,1) not null,
  reading_type sugar_type not null,
  measured_at timestamptz not null default now(),
  notes text,
  photo_url text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.bp_readings (
  id uuid primary key default uuid_generate_v4(),
  systolic int not null,
  diastolic int not null,
  pulse int,
  measured_at timestamptz not null default now(),
  notes text,
  photo_url text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.weight_readings (
  id uuid primary key default uuid_generate_v4(),
  weight_kg numeric(5,2) not null,
  height_cm numeric(5,1),
  bmi numeric(4,1),
  measured_at timestamptz not null default now(),
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.water_logs (
  id uuid primary key default uuid_generate_v4(),
  log_date date not null default current_date,
  glasses int not null default 0,
  goal_glasses int not null default 8,
  updated_at timestamptz not null default now(),
  unique (log_date)
);

create table public.exercise_logs (
  id uuid primary key default uuid_generate_v4(),
  exercise_type exercise_type not null,
  duration_min int not null,
  calories int,
  log_date date not null default current_date,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- ── Prescriptions & OCR extraction ──────────────────────────────────────────
create table public.prescription_files (
  id uuid primary key default uuid_generate_v4(),
  file_path text not null,
  file_type text not null,
  doctor_name text,
  prescribed_on date,
  ocr_done boolean not null default false,
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.extracted_medicines (
  id uuid primary key default uuid_generate_v4(),
  prescription_id uuid not null references public.prescription_files(id) on delete cascade,
  name text not null,
  morning boolean not null default false,
  afternoon boolean not null default false,
  night boolean not null default false,
  dose text,
  duration_days int,
  applied boolean not null default false,
  created_at timestamptz not null default now()
);

-- ── Notifications & WhatsApp ────────────────────────────────────────────────
create table public.notifications (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  body text not null,
  category text not null default 'general',
  read boolean not null default false,
  target_role user_role,
  created_at timestamptz not null default now()
);

create table public.whatsapp_logs (
  id uuid primary key default uuid_generate_v4(),
  to_number text not null,
  message text not null,
  category text not null default 'general',
  success boolean not null default false,
  provider_response jsonb,
  created_at timestamptz not null default now()
);

-- ── Tips, AI reports, emergency, settings ───────────────────────────────────
create table public.health_tips (
  id uuid primary key default uuid_generate_v4(),
  tip_date date not null unique,
  topic text not null,
  tip_hi text not null,
  tip_en text not null,
  created_at timestamptz not null default now()
);

create table public.ai_reports (
  id uuid primary key default uuid_generate_v4(),
  report_date date not null unique,
  status report_status not null,
  health_score int not null,
  summary text not null,
  recommendations jsonb not null default '[]',
  raw jsonb,
  created_at timestamptz not null default now()
);

create table public.emergency_contacts (
  id uuid primary key default uuid_generate_v4(),
  label text not null,
  name text not null,
  phone text not null,
  kind text not null default 'other', -- doctor | hospital | caregiver | other
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.app_settings (
  id int primary key default 1 check (id = 1),
  dark_mode boolean not null default false,
  notifications_enabled boolean not null default true,
  whatsapp_enabled boolean not null default true,
  language text not null default 'hi', -- 'hi' | 'en'
  font_scale text not null default 'large', -- 'normal' | 'large' | 'xl'
  water_goal_glasses int not null default 8,
  updated_at timestamptz not null default now()
);
insert into public.app_settings (id) values (1) on conflict do nothing;

-- ── Doctor visits ───────────────────────────────────────────────────────────
create table public.doctor_visits (
  id uuid primary key default uuid_generate_v4(),
  doctor_name text not null,
  visit_date date not null,
  notes text,
  next_visit_date date,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- ── Indexes ─────────────────────────────────────────────────────────────────
create index idx_medicine_logs_date on public.medicine_logs (log_date);
create index idx_sugar_measured on public.sugar_readings (measured_at desc);
create index idx_bp_measured on public.bp_readings (measured_at desc);
create index idx_weight_measured on public.weight_readings (measured_at desc);
create index idx_exercise_date on public.exercise_logs (log_date desc);

-- ── Row Level Security ──────────────────────────────────────────────────────
-- This is a private family app: every authenticated user (caregiver + patient)
-- can read everything. Writes are restricted by role — the patient may only
-- update medicine_logs (mark taken) and water_logs.

alter table public.profiles enable row level security;
alter table public.medicines enable row level security;
alter table public.medicine_logs enable row level security;
alter table public.sugar_readings enable row level security;
alter table public.bp_readings enable row level security;
alter table public.weight_readings enable row level security;
alter table public.water_logs enable row level security;
alter table public.exercise_logs enable row level security;
alter table public.prescription_files enable row level security;
alter table public.extracted_medicines enable row level security;
alter table public.notifications enable row level security;
alter table public.whatsapp_logs enable row level security;
alter table public.health_tips enable row level security;
alter table public.ai_reports enable row level security;
alter table public.emergency_contacts enable row level security;
alter table public.app_settings enable row level security;
alter table public.doctor_visits enable row level security;

create or replace function public.is_caregiver()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'caregiver'
  );
$$;

-- Read for all authenticated users
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','medicines','medicine_logs','sugar_readings','bp_readings',
    'weight_readings','water_logs','exercise_logs','prescription_files',
    'extracted_medicines','notifications','whatsapp_logs','health_tips',
    'ai_reports','emergency_contacts','app_settings','doctor_visits'
  ] loop
    execute format(
      'create policy "read_all_%s" on public.%I for select to authenticated using (true);',
      t, t
    );
  end loop;
end $$;

-- Caregiver: full write access everywhere
do $$
declare t text;
begin
  foreach t in array array[
    'medicines','medicine_logs','sugar_readings','bp_readings',
    'weight_readings','water_logs','exercise_logs','prescription_files',
    'extracted_medicines','notifications','health_tips','ai_reports',
    'emergency_contacts','app_settings','doctor_visits'
  ] loop
    execute format(
      'create policy "caregiver_write_%s" on public.%I for all to authenticated using (public.is_caregiver()) with check (public.is_caregiver());',
      t, t
    );
  end loop;
end $$;

-- Patient: may mark medicines taken and log water
create policy "patient_update_medicine_logs" on public.medicine_logs
  for update to authenticated using (true) with check (true);
create policy "patient_write_water" on public.water_logs
  for all to authenticated using (true) with check (true);
create policy "patient_mark_notifications_read" on public.notifications
  for update to authenticated using (true) with check (true);

-- Users manage their own profile row
create policy "own_profile_upsert" on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy "own_profile_update" on public.profiles
  for update to authenticated using (id = auth.uid());

-- ── Storage bucket for prescriptions & reading photos ───────────────────────
insert into storage.buckets (id, name, public)
values ('prescriptions', 'prescriptions', false)
on conflict do nothing;

create policy "authenticated_read_prescriptions" on storage.objects
  for select to authenticated using (bucket_id = 'prescriptions');
create policy "authenticated_upload_prescriptions" on storage.objects
  for insert to authenticated with check (bucket_id = 'prescriptions');
create policy "caregiver_delete_prescriptions" on storage.objects
  for delete to authenticated using (bucket_id = 'prescriptions' and public.is_caregiver());

-- ── Auto-create profile on signup ───────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'caregiver')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
