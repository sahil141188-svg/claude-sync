-- ============================================================================
-- Health Care Companion — Supabase schema (DEPLOYED VERSION)
-- Applied to the shared `robotek-finos` project as migration
-- `health_companion_init`. Adapted to coexist with the Robotek FinOS ERP:
--   * app_settings  -> hc_app_settings  (ERP already has app_settings)
--   * user_role     -> hc_user_role     (ERP already has user_role)
--   * no auth.users trigger (the ERP owns handle_new_user/on_auth_user_created);
--     the two health profiles rows are inserted manually — see README
--   * all health tables readable ONLY by users present in public.profiles,
--     so ERP users authenticated against the same project get no access
-- ============================================================================

create extension if not exists "uuid-ossp";

-- ── Enums ───────────────────────────────────────────────────────────────────
create type hc_user_role as enum ('caregiver', 'patient');
create type medicine_slot as enum ('morning', 'afternoon', 'night', 'custom');
create type food_relation as enum ('before_food', 'after_food', 'any');
create type sugar_type as enum ('fasting', 'pp', 'random');
create type exercise_type as enum ('walking', 'yoga', 'cycling', 'meditation', 'other');
create type report_status as enum ('improving', 'needs_attention', 'critical');

-- ── Profiles (linked to auth.users; only Papa + caregiver get a row) ────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role hc_user_role not null default 'caregiver',
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
  target_role hc_user_role,
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

create table public.hc_app_settings (
  id int primary key default 1 check (id = 1),
  dark_mode boolean not null default false,
  notifications_enabled boolean not null default true,
  whatsapp_enabled boolean not null default true,
  language text not null default 'hi', -- 'hi' | 'en'
  font_scale text not null default 'large', -- 'normal' | 'large' | 'xl'
  water_goal_glasses int not null default 8,
  updated_at timestamptz not null default now()
);
insert into public.hc_app_settings (id) values (1) on conflict do nothing;

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
alter table public.hc_app_settings enable row level security;
alter table public.doctor_visits enable row level security;

-- Only users with a health profile (Papa + caregiver) may touch health data.
create or replace function public.hc_is_health_user()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid());
$$;

create or replace function public.is_caregiver()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'caregiver'
  );
$$;

-- Read: health users only
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','medicines','medicine_logs','sugar_readings','bp_readings',
    'weight_readings','water_logs','exercise_logs','prescription_files',
    'extracted_medicines','notifications','whatsapp_logs','health_tips',
    'ai_reports','emergency_contacts','hc_app_settings','doctor_visits'
  ] loop
    execute format(
      'create policy "hc_read_%s" on public.%I for select to authenticated using (public.hc_is_health_user());',
      t, t
    );
  end loop;
end $$;

-- Caregiver: full write access
do $$
declare t text;
begin
  foreach t in array array[
    'medicines','medicine_logs','sugar_readings','bp_readings',
    'weight_readings','water_logs','exercise_logs','prescription_files',
    'extracted_medicines','notifications','health_tips','ai_reports',
    'emergency_contacts','hc_app_settings','doctor_visits'
  ] loop
    execute format(
      'create policy "hc_caregiver_write_%s" on public.%I for all to authenticated using (public.is_caregiver()) with check (public.is_caregiver());',
      t, t
    );
  end loop;
end $$;

-- Patient: may mark medicines taken, log water, mark notifications read
create policy "hc_patient_update_medicine_logs" on public.medicine_logs
  for update to authenticated using (public.hc_is_health_user()) with check (public.hc_is_health_user());
create policy "hc_patient_write_water" on public.water_logs
  for all to authenticated using (public.hc_is_health_user()) with check (public.hc_is_health_user());
create policy "hc_patient_mark_notifications_read" on public.notifications
  for update to authenticated using (public.hc_is_health_user()) with check (public.hc_is_health_user());

create policy "hc_own_profile_update" on public.profiles
  for update to authenticated using (id = auth.uid());

-- ── Storage bucket for prescriptions & reading photos ───────────────────────
insert into storage.buckets (id, name, public)
values ('prescriptions', 'prescriptions', false)
on conflict do nothing;

create policy "hc_read_prescription_files" on storage.objects
  for select to authenticated using (bucket_id = 'prescriptions' and public.hc_is_health_user());
create policy "hc_upload_prescription_files" on storage.objects
  for insert to authenticated with check (bucket_id = 'prescriptions' and public.hc_is_health_user());
create policy "hc_delete_prescription_files" on storage.objects
  for delete to authenticated using (bucket_id = 'prescriptions' and public.is_caregiver());

-- ── Manual step after creating the two auth users in the dashboard ──────────
-- (replace the UUIDs/emails; run once)
-- insert into public.profiles (id, full_name, role, phone) values
--   ('<caregiver-auth-user-uuid>', 'Sahil', 'caregiver', '91XXXXXXXXXX'),
--   ('<papa-auth-user-uuid>',     'Papa',  'patient',   '91XXXXXXXXXX');

-- ============================================================================
-- Migration: health_family_role_enum + health_appointments_reports_family
-- (already applied to the live project)
-- ============================================================================

-- Family role: can view everything, cannot edit medical records
alter type public.hc_user_role add value if not exists 'family';

-- Appointments: doctor_visits gains a time column
alter table public.doctor_visits add column if not exists visit_time time;

-- Family members (WhatsApp alert recipients; optional linked login)
create table public.family_members (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  phone text not null,
  email text,
  auth_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Uploaded medical reports (lab reports, scans, discharge summaries…)
create table public.medical_reports (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  file_path text not null,
  file_type text not null,
  report_date date not null default current_date,
  notes text,
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.family_members enable row level security;
alter table public.medical_reports enable row level security;

create policy "hc_read_family_members" on public.family_members
  for select to authenticated using (public.hc_is_health_user());
create policy "hc_caregiver_write_family_members" on public.family_members
  for all to authenticated using (public.is_caregiver()) with check (public.is_caregiver());

create policy "hc_read_medical_reports" on public.medical_reports
  for select to authenticated using (public.hc_is_health_user());
create policy "hc_caregiver_write_medical_reports" on public.medical_reports
  for all to authenticated using (public.is_caregiver()) with check (public.is_caregiver());

insert into storage.buckets (id, name, public)
values ('medical-reports', 'medical-reports', false)
on conflict do nothing;

create policy "hc_read_medical_report_files" on storage.objects
  for select to authenticated using (bucket_id = 'medical-reports' and public.hc_is_health_user());
create policy "hc_upload_medical_report_files" on storage.objects
  for insert to authenticated with check (bucket_id = 'medical-reports' and public.is_caregiver());
create policy "hc_delete_medical_report_files" on storage.objects
  for delete to authenticated using (bucket_id = 'medical-reports' and public.is_caregiver());
