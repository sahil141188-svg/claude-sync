# WhatsApp message templates

These are the 9 messages the app sends. The source of truth is `src/lib/templates.ts`.

- **Using Maytapi** (current setup): nothing to submit. The app sends this exact text, filled in for each order.
- **Using the Meta WhatsApp Cloud API** (`WA_PROVIDER=meta`): create each one in **WhatsApp Manager > Message templates > Create template**, with the exact name, the category shown, language English (`en`), type Default (text only, no header, footer or buttons). Paste the body, keeping the blank lines, and fill in every sample value.

If you change any wording, change it in `src/lib/templates.ts` too (and in Meta, if you use it).

---

## 1. order_confirmed

| | |
|---|---|
| Category | Utility |
| Sent when | Prepaid order placed (orders/create or orders/paid), or a COD customer replies YES |

**Body**

```
Thank you {{1}} for ordering with ROBOTEK.

Order ID: #{{2}}
Item: {{3}}
Order value: Rs {{4}}

Your order is confirmed. We'll share tracking details as soon as it ships.
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
| Sent when | Cash on Delivery order placed; sent again as a reminder after 4 hours with no reply |

**Body**

```
Thank you {{1}} for ordering with ROBOTEK.

Order ID: #{{2}}
Item: {{3}}
Amount to pay on delivery: Rs {{4}}

Please reply YES to confirm your Cash on Delivery order. We will dispatch it as soon as you confirm.
```

| Variable | Meaning | Sample |
|---|---|---|
| {{1}} | Customer first name | Ravi |
| {{2}} | Order number | 1043 |
| {{3}} | Items | 7-Color Super Soft Silicone Cable |
| {{4}} | Amount to pay | 199 |

---

## 3. order_processing

| | |
|---|---|
| Category | Utility |
| Sent when | 2 hours after the order is confirmed, if it has not shipped yet |

**Body**

```
Hi {{1}}, your ROBOTEK order is being checked and packed.

Order ID: #{{2}}

Every ROBOTEK product is tested before it leaves our factory.
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
| Sent when | Fulfillment created (fulfillments/create) |

**Body**

```
Hi {{1}}, your ROBOTEK order has been shipped.

Order ID: #{{2}}
Track your order: {{3}}
Expected delivery: {{4}}

Thank you for choosing ROBOTEK.
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
| Sent when | Fulfillment update with shipment status "out_for_delivery" |

**Body**

```
Hi {{1}}, your ROBOTEK order is out for delivery today.

Order ID: #{{2}}

Please keep your phone handy so our delivery partner can reach you.
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
| Sent when | Fulfillment update with shipment status "delivered" |

**Body**

```
Hi {{1}}, your ROBOTEK order has been delivered.

Order ID: #{{2}}

We hope you enjoy your product. If anything isn't right, reply here and we'll sort it out.
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
| Sent when | 3 days after delivery (always needs opt-in, it is a marketing message) |

**Body**

```
Hi {{1}}, how is your ROBOTEK {{2}} working for you?

Your feedback helps us keep improving: {{3}}

Thank you.
```

| Variable | Meaning | Sample |
|---|---|---|
| {{1}} | Customer first name | Ravi |
| {{2}} | Product name | 20W Fast Charger |
| {{3}} | Review link | https://robotekindia.com/pages/reviews?order=1042 |

---

## 8. order_cancelled

| | |
|---|---|
| Category | Utility |
| Sent when | Order cancelled (orders/cancelled) |

**Body**

```
Hi {{1}}, your ROBOTEK order has been cancelled as requested.

Order ID: #{{2}}

If you paid online, your refund will reach you in 5-7 working days. We hope to serve you again.
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
| Sent when | Refund created (refunds/create) with a refunded amount above zero |

**Body**

```
Hi {{1}}, your ROBOTEK refund has been processed.

Order ID: #{{2}}
Refund amount: Rs {{3}}

It may take 5-7 working days to show in your account.
```

| Variable | Meaning | Sample |
|---|---|---|
| {{1}} | Customer first name | Ravi |
| {{2}} | Order number | 1042 |
| {{3}} | Refund amount | 899 |

---

## Tips for Meta approval

- Keep the names exactly lowercase_snake_case as above.
- Fill every sample value; missing samples are the most common rejection reason.
- A body can't start or end with a variable, which is why some messages end with a short closing line.
- Messages using a template that isn't approved fail with error 132001 and appear on the dashboard's Failed tab; resend them once approved.
