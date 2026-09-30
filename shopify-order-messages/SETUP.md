# Setup guide

Follow these steps in order. Allow about an hour, plus Meta's review time for templates and your business.

Throughout, `<your-domain>` means your Vercel address, for example `robotek-order-messages.vercel.app` or a custom domain such as `messages.robotekindia.com`.

---

## Step 1. Supabase

1. Create a project at [supabase.com](https://supabase.com). Choose the **Mumbai (ap-south-1)** region, closest to your customers.
2. Open **SQL Editor → New query**, paste the whole of `supabase/migrations/20260930000000_order_messages.sql` and click **Run**.
   (If you use the Supabase CLI instead: `supabase link` then `supabase db push`.)
3. Add yourself as a dashboard admin. In the SQL Editor run:
   ```sql
   insert into public.dashboard_admins (email) values ('you@robotekindia.com');
   ```
   Add one line per person who should see the dashboard.
4. **Authentication → Users → Add user → Create new user**. Use the same email, set a strong password, and tick "Auto confirm user".
5. **Authentication → Sign In / Providers → Email**: switch off **Allow new users to sign up**, so nobody else can create an account.
6. **Project Settings → API**: copy the Project URL, the `anon` key and the `service_role` key. You'll paste these into Vercel in step 2.

---

## Step 2. Deploy to Vercel

1. In [vercel.com](https://vercel.com), **Add New → Project** and import the `claude-sync` GitHub repo.
2. Set **Root Directory** to `shopify-order-messages`. The framework is detected as Next.js.
3. Under **Environment Variables**, add everything from `.env.example`. For now:
   - Supabase values from step 1
   - `CRON_SECRET` and `WA_VERIFY_TOKEN`: any long random strings (for example from a password manager)
   - `WA_LIVE=false`
   - leave the Shopify and WhatsApp values empty. You'll fill them in the next steps.
4. Click **Deploy**.
5. `vercel.json` runs the scheduler once a day so it deploys on any plan. Before going live, make it run every minute. On **Pro**, change the schedule in `vercel.json` to `"* * * * *"`. On **Hobby**, keep it and create a free job at [cron-job.org](https://cron-job.org):
   - URL: `https://<your-domain>/api/cron/dispatch`
   - Schedule: every minute
   - Request header: `Authorization: Bearer <your CRON_SECRET>`
6. Open `https://<your-domain>/dashboard` and sign in with the user from step 1. You should see empty cards and a yellow **Test mode** badge.

After adding or changing any environment variable in Vercel, **redeploy** (Deployments → ⋯ → Redeploy) so it takes effect.

---

## Step 3. Shopify webhooks

There are two ways to create the webhooks. **Option A is simplest.** Use option B only if you already manage the store through a custom app.

### Option A: Settings → Notifications → Webhooks

1. In Shopify admin (robotek1), go to **Settings → Notifications**, scroll down and open **Webhooks**.
2. Click **Create webhook** six times, once for each event below. For each one:
   - **Event:** see the list
   - **Format:** JSON
   - **URL:** `https://<your-domain>/api/shopify/webhook`
   - **Webhook API version:** the latest stable version, e.g. `2025-07`

   | Event in the dropdown | Topic |
   |---|---|
   | Order creation | `orders/create` |
   | Order payment | `orders/paid` |
   | Order cancellation | `orders/cancelled` |
   | Fulfillment creation | `fulfillments/create` |
   | Fulfillment update | `fulfillments/update` |
   | Refund create | `refunds/create` |

3. Below the list, Shopify shows **"Your webhooks will be signed with …"** followed by a long key. Copy it into Vercel as `SHOPIFY_WEBHOOK_SECRET` and redeploy.
4. Click **Send test notification** next to "Order creation". On the dashboard, the Order Timeline tab should show a test order within a few seconds. (Shopify's test payload has fake details, so its message may be skipped for having no opt-in. That still proves the connection works.)

### Option B: webhooks from a custom app

If you create the webhooks through an app (Admin API `webhookSubscriptionCreate`, or `shopify.app.toml`), the signing secret is the app's **API secret key / Client secret**, not the key from option A. Put that in `SHOPIFY_WEBHOOK_SECRET`. The app also needs **Protected customer data** access (name, email, phone, address), or Shopify sends orders with those fields blank and no messages can go out.

### Admin API token (for the `cod-confirmed` tag)

This is needed whichever option you used for webhooks.

1. **Settings → Apps and sales channels → Develop apps → Create an app**, and name it "Order Messages".
   If your admin doesn't offer "Develop apps", create the app in the Shopify **Dev Dashboard** (dev.shopify.com) and install it on robotek1.
2. **Configuration → Admin API integration**: tick `read_orders` and `write_orders` (plus `read_fulfillments` if you use option B for webhooks). Save.
3. **Install app**, then reveal the **Admin API access token** (it starts with `shpat_`). Copy it into Vercel as `SHOPIFY_ADMIN_ACCESS_TOKEN`. Set `SHOPIFY_STORE_DOMAIN=robotek1.myshopify.com`. Redeploy.

### Getting WhatsApp opt-in at checkout

With **Require opt-in** on (the default), a customer is only messaged once they have opted in. Shopify gives this app three signals:

- **Recommended:** a checkbox on the cart page that saves a cart attribute. In your theme's cart form (Online Store → Themes → Edit code → e.g. `main-cart-footer.liquid`), add:
  ```html
  <label>
    <input type="checkbox" name="attributes[whatsapp_opt_in]" value="yes">
    Send me order updates on WhatsApp
  </label>
  ```
  Leave it unticked by default, because a pre-ticked box is not valid consent under Meta's rules.
- SMS marketing consent at checkout (Settings → Checkout → Marketing options → SMS).
- The email marketing checkbox at checkout.

Customers who message you on WhatsApp, or reply YES or START, are also opted in. STOP opts them out.

---

## Step 4. WhatsApp Cloud API credentials

1. Go to [developers.facebook.com](https://developers.facebook.com) → **My Apps → Create app** → choose **Other**, then **Business**. Link it to Robotek's Meta Business portfolio.
2. On the app dashboard, **Add product → WhatsApp → Set up**. This creates a WhatsApp Business Account (WABA) and a free test number.
3. **WhatsApp → API Setup**:
   - Copy the **Phone number ID** into Vercel as `WA_PHONE_NUMBER_ID`.
   - To use Robotek's real number: **Add phone number**, verify it by SMS or call, then use that number's Phone number ID. The number must not be active on the regular WhatsApp or WhatsApp Business app.
4. **Create a permanent access token.** The token on the API Setup page expires in 24 hours, so don't use it in production.
   1. Go to [business.facebook.com](https://business.facebook.com) → **Settings → Users → System users → Add**. Create an Admin system user.
   2. **Assign assets**: add the app (full control) and the WhatsApp account (full control).
   3. **Generate new token**: pick the app, set expiry to **Never**, and tick `whatsapp_business_messaging` and `whatsapp_business_management`.
   4. Copy the token into Vercel as `WA_ACCESS_TOKEN`.
5. **App secret:** App → **Settings → Basic → App secret → Show**. Copy it into Vercel as `WA_APP_SECRET`.
6. **Webhook:**
   1. Go to **WhatsApp → Configuration → Webhook → Edit**.
   2. Set **Callback URL** to `https://<your-domain>/api/whatsapp/webhook`.
   3. Set **Verify token** to exactly the value of `WA_VERIFY_TOKEN` in Vercel.
   4. Click **Verify and save**. If it fails, check the token matches and that you redeployed after setting it.
   5. Under **Webhook fields**, **Subscribe** to `messages`. This one field carries both delivery statuses and customer replies.
7. **Business verification** (Business Settings → Security Centre) and a display name approval are needed before you can message customers at volume. Start these early, because they can take a few days.
8. Switch the app to **Live** mode (top of the app dashboard). In development mode, Meta only delivers webhooks for test numbers.

Redeploy after adding the variables.

---

## Step 5. Submit the templates

1. Go to [business.facebook.com](https://business.facebook.com) → **WhatsApp Manager → Account tools → Message templates → Create template**.
2. Create all nine templates from **TEMPLATES_FOR_META.md**, using the exact names, category and language (English), and filling in every sample value.
3. Wait for each one to show **Active – Quality pending** or **Approved**. This usually takes from a few minutes to 24 hours.
4. If Meta rejects one, the reason is shown next to it. Edit the wording, and make the same change to `body` in `src/lib/templates.ts` so the dashboard preview stays accurate.

---

## Step 6. Test, then go live

1. With `WA_LIVE=false`, send fake orders from your computer:
   ```bash
   cd shopify-order-messages
   SHOPIFY_WEBHOOK_SECRET=<same as Vercel> node scripts/send-test-webhooks.mjs https://<your-domain> --scenario=delivered
   SHOPIFY_WEBHOOK_SECRET=<same as Vercel> node scripts/send-test-webhooks.mjs https://<your-domain> --scenario=cancel
   ```
   Open the printed dashboard link. You should see each message logged with a **Test** badge, and in the cancel scenario, no Shipped message.
2. Place one real test order on robotekindia.com with your own phone number, ticking the WhatsApp checkbox. Check it appears in the Order Timeline.
3. When all nine templates are approved, set `WA_LIVE=true` in Vercel and redeploy. The yellow **Test mode** badge disappears.
4. Place one more real order with your own number. You should receive "Hi …, thank you for choosing Robotek…" on WhatsApp, and within a minute the dashboard should show it as Delivered, then Read.
5. Keep an eye on the **Failed** tab for the first few days. Common errors:

| Error | Meaning | Fix |
|---|---|---|
| `132001` | Template doesn't exist or isn't approved in this language | Check the name, approval status, and `WA_TEMPLATE_LANG` (`en` vs `en_US`) |
| `131026` | Message undeliverable (number not on WhatsApp, or it blocked you) | Nothing to fix. Customer can't receive WhatsApp messages. |
| `131047` | More than 24 h since the customer last replied (only for non-template messages) | Shouldn't happen, because all sends here are templates |
| `190` / `OAuthException` | Access token invalid or expired | Generate a new System User token (step 4.4) |
| `131056` | Too many messages to the same number too quickly | Resend later |
| `Customer has not opted in` (skipped, not failed) | Opt-in rule is on and there's no consent | Add the cart checkbox, or turn the rule off in Settings for utility messages |
