# ❤️ Health Care Companion (Papa Health)

A mobile-first **Progressive Web App** that works as a personal health assistant for an elderly parent — medicines, sugar, blood pressure, weight, water, exercise, prescriptions, AI analysis, WhatsApp reminders and doctor-ready reports. Built for two users: the **caregiver** (full control) and the **patient** (large, simple, mostly read-only UI in Hindi).

## Tech stack

- **Next.js 15** (App Router, React 19, TypeScript, server actions)
- **Tailwind CSS** with shadcn-style UI primitives (large fonts, rounded cards, glassmorphism, dark mode)
- **Supabase** — Postgres + Auth + Storage + Row Level Security
- **Recharts** — line / bar / pie charts
- **Gemini or OpenAI** — prescription OCR (vision) + nightly health analysis
- **Meta WhatsApp Cloud API** — reminders, greetings, daily & weekly reports
- **Vercel** — hosting + cron jobs
- **PWA** — manifest, service worker (offline shell + cached pages), installable on Android

## Features

| Area | What it does |
| --- | --- |
| Greeting popup | Time-based "Good Morning/Afternoon/Night Papa ❤️" + daily rotating motivational quote |
| Dashboard | Date/time, health score ring, medicine progress, today's sugar/BP/weight/water/exercise, upcoming medicines, daily tip, SOS button |
| Medicines | Name, morning/afternoon/night/custom time, before/after food, quantity, dates, notes, color tag, doctor, stock + low-stock badge, expiry, archive. Big green **✅ Taken** button stores a timestamp |
| Reminders | Cron every 15 min: WhatsApp reminder at +15 min, again at +45 min, caregiver alert at +90 min |
| Sugar | Fasting/PP/Random readings, daily/weekly/monthly/yearly graphs, trend detection (increasing/decreasing/stable) + suggestions |
| BP | Systolic/diastolic/pulse, graphs, trend + suggestions, high-BP flags |
| Weight | Weight, auto-BMI, weekly & monthly change, 6-month graph |
| Water | Glass counter with goal + completion %, 7-day history |
| Exercise | Walking/yoga/cycling/meditation, duration, auto-calories |
| Prescriptions | Camera/file/PDF upload → Supabase Storage → AI OCR extracts medicines (name, 1-0-1 schedule, dose, duration, doctor) → "Replace existing medicines?" YES/NO flow with auto-archive |
| Health tips | Daily Hindi tip across diabetes/BP/food/sleep/stress topics, history from DB |
| Food guide | Foods to eat/avoid, breakfast/lunch/dinner/snack ideas (Hindi) |
| Analytics | Sugar/BP/weight trends, medicine-compliance bars, water bars, exercise pie, health score, AI recommendations |
| AI nightly analysis | Cron summarises 7 days → Gemini/OpenAI → improving / needs attention / critical + recommendations, stored in `ai_reports`, WhatsApped to caregiver (weekly report to patient on Sundays) |
| Reports | Printable 30-day report (medicines, sugar, BP, weight, doctor visits, AI summary) → browser print-to-PDF |
| Emergency | One-tap call cards for doctor/hospital/caregiver |
| Settings | Dark mode, notifications toggle, WhatsApp toggle, Hindi/English, font size (up to XL), water goal |
| Roles | Caregiver edits everything; patient can only mark medicines taken and log water (enforced by RLS) |

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run `supabase/schema.sql` (tables, enums, RLS, storage bucket, signup trigger).
3. In **Authentication → Users**, create two users (email + password):
   - Caregiver: add user metadata `{ "full_name": "Your Name", "role": "caregiver" }`
   - Patient: `{ "full_name": "Papa", "role": "patient" }`
   (The trigger creates matching `profiles` rows; roles default to caregiver if omitted.)

### 2. Environment variables

```bash
cp .env.example .env.local
```

Fill in Supabase URL/keys, `CRON_SECRET`, WhatsApp Cloud API credentials, and a Gemini **or** OpenAI key. See `.env.example` for every variable.

### 3. WhatsApp Cloud API (optional but recommended)

1. Create a Meta app → add the **WhatsApp** product.
2. Get the **Phone Number ID** and a permanent access token.
3. Add the patient's and caregiver's numbers as recipients (or complete business verification for production).
4. Note: outside a 24-hour session window Meta requires template messages — for family use, have Papa send one message to the business number, or register the texts as templates.

If WhatsApp env vars are missing or the toggle is off in Settings, sends are skipped and logged in `whatsapp_logs`.

### 4. Run locally

```bash
npm install
npm run dev
```

### 5. Deploy on Vercel

1. Import the repo, set **Root Directory** to `health-companion`.
2. Add all environment variables (including `CRON_SECRET` — Vercel sends it automatically as the bearer token for cron requests).
3. Deploy.
4. Schedule the cron endpoints. Vercel's Hobby plan only allows daily crons, so scheduling
   runs from Supabase instead (`pg_cron` + `pg_net` calling the deployed endpoints with the
   `CRON_SECRET` bearer header):
   - `/api/cron/reminders` — every 15 min (medicine escalation)
   - `/api/cron/daily-summary?slot=morning|afternoon|night` — 7 AM / 1 PM / 9 PM IST
   - `/api/cron/nightly-analysis` — 10:30 PM IST (AI report)

### 6. Install on the phones

Open the deployed URL in Chrome on Android → menu → **Add to Home screen**. The app runs standalone with an offline-capable shell.

## Project structure

```
health-companion/
├─ supabase/schema.sql        # full DB schema + RLS + storage + triggers
├─ vercel.json                # cron schedules
├─ scripts/generate-icons.mjs # dependency-free PWA icon generator
├─ public/sw.js               # service worker (offline shell)
├─ middleware.ts              # Supabase session refresh + auth guard
└─ src/
   ├─ app/
   │  ├─ login/               # email+password login
   │  ├─ (app)/               # authed shell: greeting popup + bottom nav
   │  │  ├─ dashboard/ medicines/ sugar/ bp/ weight/ water/ exercise/
   │  │  ├─ prescriptions/ analytics/ tips/ food/ reports/ emergency/
   │  │  └─ settings/ more/
   │  └─ api/
   │     ├─ prescriptions/extract/   # AI OCR endpoint
   │     └─ cron/{reminders,daily-summary,nightly-analysis}/
   ├─ components/             # UI primitives + charts + shared widgets
   └─ lib/                    # supabase clients, ai, whatsapp, score, trends…
```

## Notes & roadmap

- **PDF export** uses the browser's print-to-PDF (works offline, zero dependencies). A server-side PDF can be added later.
- Voice reminders (Hindi TTS), calendar view, Excel export, QR sharing and photo-proof attachments are natural next steps — the schema already has `photo_url` columns and a `doctor_visits` table ready.
- This app is a family care tool, **not** a medical device; always follow the doctor's advice.
