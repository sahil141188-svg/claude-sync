-- Robotek Shopify Order Messages
-- Tables: orders_shadow, message_log, webhook_events, opt_ins, settings, dashboard_admins
-- The webhook/cron endpoints use the service role key (bypasses RLS).
-- The dashboard reads with the signed-in user's session, limited by RLS to emails in dashboard_admins.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type payment_method as enum ('cod', 'prepaid');
exception when duplicate_object then null; end $$;

do $$ begin
  -- queued     waiting to be sent (now or at scheduled_for)
  -- sent       accepted by WhatsApp (or logged in test mode)
  -- delivered  delivered to handset
  -- read       read by customer
  -- failed     failed after the retry
  -- cancelled  never sent because the order was cancelled / condition no longer true
  -- skipped    not sent: no opt-in, template switched off, or no phone number
  create type message_status as enum ('queued', 'sent', 'delivered', 'read', 'failed', 'cancelled', 'skipped');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- orders_shadow: a lightweight copy of each Shopify order
-- ---------------------------------------------------------------------------
create table if not exists public.orders_shadow (
  shopify_order_id  bigint primary key,
  order_no          text not null,
  customer_name     text,
  phone             text,                 -- E.164, e.g. +919812345678
  email             text,
  total             numeric(12, 2),
  currency          text default 'INR',
  payment_method    payment_method not null default 'prepaid',
  -- pending_payment | awaiting_cod_confirmation | confirmed | shipped
  -- | out_for_delivery | delivered | cancelled | refunded
  status            text not null default 'confirmed',
  item_summary      text,                 -- "Robotek 20W Charger + 1 more"
  first_item        text,                 -- first line item title, used in review_request
  tracking_url      text,
  order_status_url  text,                 -- Shopify order status page, used when a courier link is missing
  delivered_at      timestamptz,
  cod_confirmed_at  timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create unique index if not exists orders_shadow_order_no_idx on public.orders_shadow (order_no);
create index if not exists orders_shadow_phone_idx on public.orders_shadow (phone);
create index if not exists orders_shadow_status_idx on public.orders_shadow (status);

-- ---------------------------------------------------------------------------
-- message_log: every message, doubling as the send queue
-- ---------------------------------------------------------------------------
create table if not exists public.message_log (
  id                uuid primary key default gen_random_uuid(),
  shopify_order_id  bigint references public.orders_shadow (shopify_order_id) on delete set null,
  order_no          text,
  phone             text,
  template_key      text not null,
  vars              jsonb not null default '[]'::jsonb,   -- ordered template variables
  status            message_status not null default 'queued',
  wa_message_id     text,
  error             text,
  retries           int not null default 0,
  test_mode         boolean not null default false,       -- true = logged, not sent (WA_LIVE != true)
  purpose           text,                                 -- e.g. 'cod_reminder', 'resend'
  dedupe_key        text,                                 -- stops the same message being queued twice
  scheduled_for     timestamptz not null default now(),
  locked_until      timestamptz,                          -- short lock so cron and webhook never send the same row twice
  sent_at           timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create unique index if not exists message_log_dedupe_idx on public.message_log (dedupe_key) where dedupe_key is not null;
create index if not exists message_log_queue_idx on public.message_log (status, scheduled_for);
create index if not exists message_log_order_no_idx on public.message_log (order_no);
create index if not exists message_log_phone_idx on public.message_log (phone);
create index if not exists message_log_wa_id_idx on public.message_log (wa_message_id);
create index if not exists message_log_created_idx on public.message_log (created_at desc);

-- ---------------------------------------------------------------------------
-- webhook_events: idempotency for Shopify deliveries
-- ---------------------------------------------------------------------------
create table if not exists public.webhook_events (
  id                bigserial primary key,
  shopify_event_id  text not null unique,  -- "<topic>:<X-Shopify-Event-Id or X-Shopify-Webhook-Id>"
  topic             text not null,
  received_at       timestamptz not null default now(),
  processed         boolean not null default false,
  error             text
);

-- ---------------------------------------------------------------------------
-- opt_ins: WhatsApp consent per phone
-- ---------------------------------------------------------------------------
create table if not exists public.opt_ins (
  phone       text primary key,            -- E.164
  opted_in    boolean not null default true,
  source      text,                        -- shopify_checkout | whatsapp_reply | manual
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- settings: dashboard toggles (single JSON value per key)
-- ---------------------------------------------------------------------------
create table if not exists public.settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

insert into public.settings (key, value) values
  ('require_opt_in', 'true'::jsonb),
  ('enabled_templates', '{
    "order_confirmed": true,
    "order_processing": true,
    "order_shipped": true,
    "out_for_delivery": true,
    "order_delivered": true,
    "review_request": true,
    "order_cancelled": true,
    "refund_processed": true,
    "cod_confirmation": true
  }'::jsonb)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- dashboard_admins: who may read the dashboard
-- ---------------------------------------------------------------------------
create table if not exists public.dashboard_admins (
  email       text primary key,
  created_at  timestamptz not null default now()
);

create or replace function public.is_dashboard_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.dashboard_admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists orders_shadow_touch on public.orders_shadow;
create trigger orders_shadow_touch before update on public.orders_shadow
  for each row execute function public.touch_updated_at();

drop trigger if exists message_log_touch on public.message_log;
create trigger message_log_touch before update on public.message_log
  for each row execute function public.touch_updated_at();

drop trigger if exists opt_ins_touch on public.opt_ins;
create trigger opt_ins_touch before update on public.opt_ins
  for each row execute function public.touch_updated_at();

drop trigger if exists settings_touch on public.settings;
create trigger settings_touch before update on public.settings
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Service role bypasses RLS. Anonymous users get nothing.
-- Signed-in users listed in dashboard_admins can read everything and edit settings.
-- ---------------------------------------------------------------------------
alter table public.orders_shadow    enable row level security;
alter table public.message_log      enable row level security;
alter table public.webhook_events   enable row level security;
alter table public.opt_ins          enable row level security;
alter table public.settings         enable row level security;
alter table public.dashboard_admins enable row level security;

drop policy if exists "admins read orders" on public.orders_shadow;
create policy "admins read orders" on public.orders_shadow
  for select to authenticated using (public.is_dashboard_admin());

drop policy if exists "admins read messages" on public.message_log;
create policy "admins read messages" on public.message_log
  for select to authenticated using (public.is_dashboard_admin());

drop policy if exists "admins read webhook events" on public.webhook_events;
create policy "admins read webhook events" on public.webhook_events
  for select to authenticated using (public.is_dashboard_admin());

drop policy if exists "admins read opt ins" on public.opt_ins;
create policy "admins read opt ins" on public.opt_ins
  for select to authenticated using (public.is_dashboard_admin());

drop policy if exists "admins read settings" on public.settings;
create policy "admins read settings" on public.settings
  for select to authenticated using (public.is_dashboard_admin());

drop policy if exists "admins update settings" on public.settings;
create policy "admins update settings" on public.settings
  for update to authenticated using (public.is_dashboard_admin()) with check (public.is_dashboard_admin());

drop policy if exists "admins see themselves" on public.dashboard_admins;
create policy "admins see themselves" on public.dashboard_admins
  for select to authenticated using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- ---------------------------------------------------------------------------
-- After running this file, add your dashboard login email:
--   insert into public.dashboard_admins (email) values ('you@robotekindia.com');
-- ---------------------------------------------------------------------------
