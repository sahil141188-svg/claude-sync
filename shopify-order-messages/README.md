# Robotek Order Messages

Shopify order events in, English WhatsApp updates out. Everything is logged in Supabase, and a small dashboard shows what went out, what failed and why.

```
Shopify ──webhook──▶ /api/shopify/webhook ──▶ orders_shadow + message_log (queue)
                                                   │
                        /api/cron/dispatch ◀───────┤  (every minute: scheduled sends + retries)
                                                   ▼
                                        lib/whatsapp.ts ──▶ WhatsApp Cloud API
                                                   ▲
Meta ──statuses / replies──▶ /api/whatsapp/webhook ┘  (delivered/read, YES, STOP)

/dashboard  ── Supabase Auth, read through RLS
```

**Nothing is sent to WhatsApp until `WA_LIVE=true`.** Until then every message is written to the log and printed to the server console, and it shows on the dashboard with a "Test" badge.

For step-by-step account setup (Shopify webhooks, Meta credentials, template submission), see **[SETUP.md](SETUP.md)**. Template wording for Meta is in **[TEMPLATES_FOR_META.md](TEMPLATES_FOR_META.md)**.

## Live deployment

| | |
|---|---|
| Dashboard | https://claude-sync-vj7u.vercel.app/dashboard |
| Shopify webhook URL | https://claude-sync-vj7u.vercel.app/api/shopify/webhook |
| WhatsApp webhook URL | https://claude-sync-vj7u.vercel.app/api/whatsapp/webhook |
| Scheduler | https://claude-sync-vj7u.vercel.app/api/cron/dispatch (needs `Authorization: Bearer <CRON_SECRET>`) |

- Vercel project: `robotek-order-messages` (team sahil141188-8237's projects, Hobby plan), root directory `shopify-order-messages`, deploys from `main`.
- Database: the Mumbai Supabase project shared with the Robotek ERP. This app's tables and helpers are separate from the ERP's (`om_`-prefixed types and trigger function).
- Mode: test (`WA_LIVE=false`). Nothing is sent to customers until that is set to `true`.

---

## What happens to an order

| Shopify event | Message | Notes |
|---|---|---|
| `orders/create`, prepaid and paid | `order_confirmed` now, `order_processing` in 2 h | |
| `orders/create`, prepaid, payment pending | nothing yet | waits for `orders/paid` |
| `orders/paid` | `order_confirmed` + `order_processing` if not already queued | ignored for COD orders |
| `orders/create`, COD | `cod_confirmation` now, reminder (same template) in 4 h | |
| Customer replies **YES** | order tagged `cod-confirmed` in Shopify, reminder cancelled, `order_confirmed` now, `order_processing` in 2 h | |
| `fulfillments/create` | `order_shipped` | pending Processing is cancelled |
| `fulfillments/update` → `out_for_delivery` | `out_for_delivery` | |
| `fulfillments/update` → `delivered` | `order_delivered` now, `review_request` in 3 days | |
| `refunds/create` with money | `refund_processed` | restock-only refunds are ignored |
| `orders/cancelled` | `order_cancelled` | **every queued message for the order is cancelled**; Processing / Shipped / reminders / reviews are never sent afterwards |
| Customer replies **STOP** | opted out; all their queued messages are skipped | **START** opts back in |

Just before sending, every message is checked again. It is skipped or cancelled if:

- its type is switched off in Settings
- there is no valid phone number
- the customer opted out, or has not opted in (when "Require opt-in" is on; `review_request` always needs an opt-in because it is a marketing message)
- the order was cancelled
- the order has moved on (e.g. Processing after it already shipped, a COD reminder after YES)

### Delivery and retries

- Each send that fails is retried **once, 60 seconds later**. If it fails again it is marked `failed` and appears on the dashboard's Failed tab with the error and a Resend button.
- A failure Meta reports later through the status webhook (for example, "undeliverable") also marks the message `failed`.
- Statuses only move forward: queued → sent → delivered → read.

---

## Project layout

```
supabase/migrations/…_order_messages.sql   tables, RLS, claim_message()
src/lib/templates.ts        the 9 templates, variables, samples
src/lib/whatsapp.ts         provider interface + Meta Cloud API + test mode
src/lib/messages.ts         queue, eligibility checks, send + retry, resend
src/lib/order-events.ts     what each Shopify event and customer reply does
src/lib/shopify.ts          HMAC check, payload mapping, Admin API (tagging)
src/lib/phone.ts            E.164 normalisation (+91 by default)
src/app/api/shopify/webhook/route.ts
src/app/api/whatsapp/webhook/route.ts
src/app/api/cron/dispatch/route.ts
src/app/dashboard/…         Overview, Order Timeline, Failed, Templates, Settings
scripts/send-test-webhooks.mjs   signed fake Shopify webhooks for testing
tests/lib.test.ts           unit tests (npm test)
```

### Sending through Maytapi instead of Meta

Set `WA_PROVIDER=maytapi` to send through a Maytapi-linked number instead of the WhatsApp Cloud API. With Maytapi there are no Meta templates to approve: the full text from `src/lib/templates.ts` is sent as a normal WhatsApp message.

| Variable | What it is |
|---|---|
| `WA_PROVIDER` | `maytapi` |
| `MAYTAPI_PRODUCT_ID` | Maytapi → Developers → Product ID & Token |
| `MAYTAPI_API_TOKEN` | same page, the API token |
| `MAYTAPI_PHONE_ID` | Maytapi → Phones (e.g. `34178`) |
| `MAYTAPI_WEBHOOK_SECRET` | any long random string |
| `MAYTAPI_FORWARD_URL` | optional: the webhook URL Maytapi used before, so that integration keeps receiving every event |

In Maytapi → Developers → Webhooks, set the phone's webhook to `https://<your-domain>/api/maytapi/webhook?key=<MAYTAPI_WEBHOOK_SECRET>`. It handles YES / STOP / START replies and delivery/read receipts, and forwards everything to `MAYTAPI_FORWARD_URL`.

Maytapi is an unofficial WhatsApp API that drives a number linked by QR code. WhatsApp can restrict numbers that send many automated messages, so keep the opt-in rule on and use Maytapi's anti-ban settings.

### Swapping WhatsApp provider

All sending goes through `sendTemplate(phone, templateKey, vars)` in `src/lib/whatsapp.ts`. To move to Gupshup, AiSensy, Interakt etc., add a class implementing `WhatsAppProvider`, return it from `getProvider()` when `WA_PROVIDER=<name>`, and adapt the incoming webhook parser (`parseMetaWebhook`) to that provider's status/reply format. Nothing else changes.

---

## Environment variables

Copy `.env.example` to `.env.local` for local work; add the same keys in Vercel → Project → Settings → Environment Variables.

| Variable | Required | What it is |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Same page, `anon` / publishable key. Used by the dashboard login. |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Same page, `service_role` / secret key. **Server only**, never expose it. |
| `SHOPIFY_WEBHOOK_SECRET` | yes | The signing secret shown under Settings → Notifications → Webhooks, or the custom app's API secret key if you create webhooks from an app. |
| `SHOPIFY_STORE_DOMAIN` | for COD tagging | `robotek1.myshopify.com` |
| `SHOPIFY_ADMIN_ACCESS_TOKEN` | for COD tagging | Custom app Admin API token with `read_orders` and `write_orders`. Without it, YES replies still confirm the order in this system but the Shopify tag is not added (logged). Also used to fetch orders that were placed before this system went live. |
| `SHOPIFY_API_VERSION` | no | Default `2025-07` |
| `WA_PHONE_NUMBER_ID` | to send | Meta → WhatsApp → API Setup → Phone number ID |
| `WA_ACCESS_TOKEN` | to send | Permanent System User token with `whatsapp_business_messaging` |
| `WA_VERIFY_TOKEN` | yes | Any long random string. Enter the same value in Meta's webhook setup. |
| `WA_APP_SECRET` | recommended | Meta App → Settings → Basic → App secret. When set, incoming WhatsApp webhooks must carry a valid `X-Hub-Signature-256`. |
| `WA_TEMPLATE_LANG` | no | Default `en`. Use `en_US` if you submitted templates as English (US). |
| `WA_GRAPH_VERSION` | no | Default `v21.0` |
| `WA_PROVIDER` | no | Default `meta` |
| `WA_LIVE` | no | **Only `true` sends real messages.** Anything else = test mode (log only). |
| `REVIEW_URL` | no | Link used in `review_request`. `{order_no}` is replaced. Default `https://robotekindia.com/pages/reviews?order={order_no}` |
| `DEFAULT_DELIVERY_DAYS` | no | Used for "Expected delivery by" when the courier gives no estimate. Default `5`. |
| `CRON_SECRET` | yes | Any long random string. Vercel Cron sends it automatically as a Bearer token. |

---

## Local development

```bash
cd shopify-order-messages
npm install
cp .env.example .env.local        # fill in Supabase + SHOPIFY_WEBHOOK_SECRET at least
npm run dev

# in another terminal: send signed fake webhooks (test mode, nothing is really sent)
npm run test:webhooks                                  # full prepaid journey, ending in a cancellation
node scripts/send-test-webhooks.mjs --scenario=delivered
node scripts/send-test-webhooks.mjs --scenario=cancel # proves nothing goes out after a cancel
node scripts/send-test-webhooks.mjs --cod-yes         # COD order + customer replies YES
node scripts/send-test-webhooks.mjs --no-opt-in       # shows the opt-in rule skipping messages
node scripts/send-test-webhooks.mjs --duplicate --bad-hmac
node scripts/send-test-webhooks.mjs https://your-app.vercel.app   # against a deployment

# run the scheduler once by hand (Processing, reminders, reviews, retries)
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/dispatch

npm test          # unit tests
npm run typecheck
```

---

## Deploying on Vercel

1. Import this GitHub repo in Vercel and set **Root Directory** to `shopify-order-messages` (this repo holds several apps).
2. Add the environment variables above.
3. Deploy. Your URLs:
   - Shopify webhook: `https://<your-domain>/api/shopify/webhook`
   - WhatsApp webhook: `https://<your-domain>/api/whatsapp/webhook`
   - Dashboard: `https://<your-domain>/dashboard`

### Scheduler (important)

`/api/cron/dispatch` should run **every minute**. That one job sends Processing (+2 h), COD reminders (+4 h), review requests (+3 days) and the 60-second retry.

`vercel.json` ships with a **once-a-day** schedule (`0 3 * * *`), because Vercel Hobby rejects anything more frequent at deploy time. Before going live, pick one:

- **Vercel Pro:** change the schedule in `vercel.json` to `* * * * *`.
- **Vercel Hobby:** keep the daily schedule and add a free external scheduler such as cron-job.org that calls `GET https://<your-domain>/api/cron/dispatch` every minute with the header `Authorization: Bearer <CRON_SECRET>`.

Messages due immediately (confirmations, shipped, delivered, cancelled, refund) are sent inside the webhook request and do not depend on the scheduler.

---

## Decisions I made (change them if you disagree)

- **One queue, one cron.** `message_log` is both the log and the queue (`status = queued`, `scheduled_for`). A single dispatcher covers all three scheduled jobs and the retry, instead of three separate crons. A Postgres function (`claim_message`) locks each row so the cron and a webhook can never send the same message twice.
- **Fast 200s.** The webhook verifies, dedupes, answers 200 and then processes in the same invocation using Next.js `after()`. Processing errors are stored in `webhook_events.error` and never cause a non-200. An invalid HMAC gets a 401, as Shopify expects.
- **Idempotency key.** `webhook_events.shopify_event_id` stores `<topic>:<X-Shopify-Event-Id>` (falling back to `X-Shopify-Webhook-Id`), because the same event id can fire several topics. Each message also has a `dedupe_key` so e.g. `orders/create` and `orders/paid` can't both queue a confirmation.
- **COD flow.** COD orders get `cod_confirmation` instead of `order_confirmed`. The 4-hour reminder reuses the `cod_confirmation` template (no tenth template to approve). On YES they get `order_confirmed` and, 2 hours later, Processing. Accepted replies: `YES`, `Y`, `CONFIRM`, including a quick-reply button with that text.
- **Opt-in sources.** A phone counts as opted in when the Shopify order has a cart/note attribute `whatsapp_opt_in` = `true`/`yes`, SMS marketing consent, or accepts-marketing ticked at checkout, or when the customer messages us / replies YES / START. STOP always wins. "Require opt-in" is **on** by default; switching it off lets utility messages go to everyone with a phone number, but `review_request` (marketing) still requires an opt-in.
- **Template 6 wording.** Meta rejects bodies that end with a variable, so `review_request` ends with "… {{3}} Thank you." (see TEMPLATES_FOR_META.md). A leading "Robotek" is removed from the product title so it doesn't read "your Robotek Robotek …".
- **`{{3}}` in order_confirmed** is an item summary: first product title, plus "+ N more" when there are several line items.
- **Shipped message** goes once per order (the first fulfillment), using the courier's tracking link, or the Shopify order status page if there is none. "Expected delivery" uses the courier estimate when Shopify has one, otherwise the fulfillment date + `DEFAULT_DELIVERY_DAYS`.
- **Order status never moves backwards**, because webhooks can arrive out of order.
- **Dashboard access.** Supabase Auth email + password. Only emails in `dashboard_admins` can read anything (enforced by RLS, not just the UI). Turn off public sign-ups in Supabase. Resend and Settings changes run on the server after checking the admin.
- **Delivered % / Read %** on the Overview are over messages sent in the last 14 days. Test-mode messages never get delivery receipts, so these read low until you go live.
- **Unknown orders.** If a fulfillment or refund arrives for an order this system has never seen (placed before go-live), it is fetched from the Admin API when a token is configured.

## Verified locally

Against Postgres 16 + PostgREST with this migration: HMAC rejection (401), duplicate event ignored, full prepaid journey, cancel-before-ship (no Shipped sent), COD + YES (reminder cancelled, confirmation + Processing sent), no-opt-in skip, STOP opt-out, delivered/read status ordering, retry after 60 s then failed, Resend from the dashboard, Settings toggle saved through RLS, and RLS denying non-admin and anonymous users. Dashboard screens checked at 390 px and 1280 px wide.

Not verified here: real calls to Meta and Shopify (no credentials in this environment), and Supabase Auth login (a local stand-in was used for the session).
