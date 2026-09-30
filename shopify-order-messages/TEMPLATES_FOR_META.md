# WhatsApp templates for Meta approval

Submit each template in **Meta Business Manager > WhatsApp Manager > Message templates > Create template**.

For every template:

- **Name:** copy it exactly as written below. The app sends this name, so a typo stops the message.
- **Language:** English (`en`). If you choose English (US) instead, set `WA_TEMPLATE_LANG=en_US`.
- **Category:** as listed. Only `review_request` is Marketing; the rest are Utility.
- **Type:** Default (text only). No header, no footer, no buttons.
- **Body:** paste the body text. Meta turns `{{1}}`, `{{2}}` into variables. Fill in the sample values shown so the reviewer can see a real example.

The source of truth is `src/lib/templates.ts`. If you edit a template's wording in Meta, update the `body` there too, so the dashboard preview matches what customers get.

---

## 1. order_confirmed

| | |
|---|---|
| Category | Utility |
| Sent when | A prepaid order is placed, or a COD customer replies YES |

**Body**

```
Hi {{1}}, thank you for choosing Robotek. Your order #{{2}} ({{3}}, Rs {{4}}) is confirmed. We'll update you as soon as it ships.
```

| Variable | Meaning | Sample |
|---|---|---|
| {{1}} | Customer first name | Ravi |
| {{2}} | Order number | 1042 |
| {{3}} | Items | Robotek 20W Fast Charger + 1 more |
| {{4}} | Order total | 899 |

---

## 2. cod_confirmation

| | |
|---|---|
| Category | Utility |
| Sent when | A Cash on Delivery order is placed. Sent once more after 4 hours if there is no reply. |

**Body**

```
Hi {{1}}, we received your Cash on Delivery order #{{2}} (Rs {{3}}). Reply YES to confirm and we'll dispatch it right away.
```

| Variable | Meaning | Sample |
|---|---|---|
| {{1}} | Customer first name | Ravi |
| {{2}} | Order number | 1043 |
| {{3}} | Order total | 599 |

---

## 3. order_processing

| | |
|---|---|
| Category | Utility |
| Sent when | 2 hours after confirmation, only if the order has not shipped |

**Body**

```
Hi {{1}}, your order #{{2}} is being checked and packed by our team. Every Robotek product is tested before it leaves our factory.
```

| Variable | Meaning | Sample |
|---|---|---|
| {{1}} | Customer first name | Ravi |
| {{2}} | Order number | 1042 |

---

## 4. order_shipped

| | |
|---|---|
| Category | Utility |
| Sent when | A fulfillment is created in Shopify |

**Body**

```
Hi {{1}}, your order #{{2}} has been shipped. Track it here: {{3}}. Expected delivery by {{4}}.
```

| Variable | Meaning | Sample |
|---|---|---|
| {{1}} | Customer first name | Ravi |
| {{2}} | Order number | 1042 |
| {{3}} | Tracking link | https://www.delhivery.com/track/package/1234567890 |
| {{4}} | Expected delivery date | 5 Oct 2026 |

---

## 5. out_for_delivery

| | |
|---|---|
| Category | Utility |
| Sent when | The courier marks the shipment "out for delivery" |

**Body**

```
Hi {{1}}, your Robotek order #{{2}} is out for delivery today. Please keep your phone handy.
```

| Variable | Meaning | Sample |
|---|---|---|
| {{1}} | Customer first name | Ravi |
| {{2}} | Order number | 1042 |

---

## 6. order_delivered

| | |
|---|---|
| Category | Utility |
| Sent when | The courier marks the shipment "delivered" |

**Body**

```
Hi {{1}}, your order #{{2}} has been delivered. We hope you enjoy your Robotek product. If anything isn't right, reply here and we'll sort it out.
```

| Variable | Meaning | Sample |
|---|---|---|
| {{1}} | Customer first name | Ravi |
| {{2}} | Order number | 1042 |

---

## 7. review_request

| | |
|---|---|
| Category | **Marketing** |
| Sent when | 3 days after delivery. Only to customers who have opted in. |

**Body**

```
Hi {{1}}, how is your Robotek {{2}} working for you? Your feedback helps us keep improving: {{3}} Thank you.
```

| Variable | Meaning | Sample |
|---|---|---|
| {{1}} | Customer first name | Ravi |
| {{2}} | Product name | 20W Fast Charger |
| {{3}} | Review link | https://robotekindia.com/pages/reviews?order=1042 |

> **Change from the brief:** Meta rejects a template whose body ends with a variable. The original text ended with `{{3}}`, so " Thank you." was added after the link. If you prefer other closing words, change them here and in `src/lib/templates.ts`.

---

## 8. order_cancelled

| | |
|---|---|
| Category | Utility |
| Sent when | The order is cancelled in Shopify |

**Body**

```
Hi {{1}}, your order #{{2}} has been cancelled as requested. If you paid online, your refund will reach you in 5-7 working days. We hope to serve you again.
```

| Variable | Meaning | Sample |
|---|---|---|
| {{1}} | Customer first name | Ravi |
| {{2}} | Order number | 1042 |

---

## 9. refund_processed

| | |
|---|---|
| Category | Utility |
| Sent when | A refund with money is created in Shopify |

**Body**

```
Hi {{1}}, the refund of Rs {{2}} for order #{{3}} has been processed. It may take 5-7 working days to show in your account.
```

| Variable | Meaning | Sample |
|---|---|---|
| {{1}} | Customer first name | Ravi |
| {{2}} | Refund amount | 899 |
| {{3}} | Order number | 1042 |

---

## Tips so templates pass review first time

- Keep the names exactly lowercase_snake_case as above.
- Always fill every sample value. Missing samples are the most common rejection reason.
- Don't pick Utility for `review_request`. Meta re-categorises it as Marketing anyway, and a mismatch can pause the template.
- Approval usually takes from a few minutes to 24 hours. Messages using an unapproved template fail with error 132001; they will show on the dashboard's Failed tab, and you can resend them once approved.
