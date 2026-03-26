# TerrainForge — Business Management

## Business Model
SaaS subscription, priced per organization (not per seat in Phase 1 — simpler to sell).

### Pricing Tiers
| Tier | Price | Target | Limits |
|---|---|---|---|
| **Starter** | $49/mo | Solo operators, 1-3 crew | 5 active projects, 1 user |
| **Pro** | $99/mo | Small companies, 4-15 crew | 25 active projects, 5 users |
| **Business** | $199/mo | Established contractors, 15-25 crew | Unlimited projects, 15 users |

Annual pricing: 2 months free (e.g., $490/yr Starter). Push annual from day one — better cash flow.

### Revenue Model
- MRR (monthly recurring revenue) is the primary metric
- Target: $5K MRR before starting Phase 2 development (~50 Pro customers)
- Secondary: one-time onboarding fee ($99–$299) for Business tier — covers setup call

## Unit Economics
- Customer acquisition cost (CAC) target: <$200 (low-touch, inbound/referral)
- Lifetime value (LTV) target: >$1,200 (12+ month retention at Pro)
- LTV:CAC ratio target: >6:1
- Churn target: <5% monthly (landscaping is a seasonal business — watch for annual churn patterns)

## Key Business Metrics to Track
Track these monthly in a simple spreadsheet:
- MRR (new + expansion - churn)
- Net new customers (new signups - cancellations)
- Churn rate (% of customers who cancel in a given month)
- Average revenue per customer (MRR ÷ total customers)
- Free trial conversion rate (trials started vs. trials converted)
- Feature adoption rate (% of customers using manifest engine, AI price research, etc.)

## Stripe Integration Plan
Use Stripe Billing with Products and Prices (not Payment Intents — subscriptions need the Billing API):
- Three Products: Starter, Pro, Business
- Each product has monthly and annual Price objects
- Webhook events to handle: `customer.subscription.created`, `customer.subscription.deleted`, `invoice.payment_failed`
- Store `stripe_customer_id` and `subscription_status` on the `organizations` table

## Free Trial Strategy
- 14-day free trial, no credit card required (remove friction for first signup)
- Day 7: in-app prompt to enter billing before trial ends
- Day 13: email reminder
- Day 14: downgrade to read-only (don't delete data — makes it easy to reactivate)
- Track trial-to-paid conversion as a leading indicator of product-market fit

## Operations Checklist (for each new customer)
- [ ] Organization created in Supabase, org_id assigned
- [ ] Admin user invited
- [ ] Stripe subscription active
- [ ] Welcome email sent (manual for now, automated in Phase 3)
- [ ] Optional: 20-min onboarding call for Business tier

## Financial Basics
- Business entity: register as LLC before first paying customer
- Accounting: use Wave (free) or QuickBooks Simple Start ($15/mo) from day one
- Track: Stripe payouts, Anthropic API costs, Supabase costs, domain/tools costs
- Tax: set aside 25-30% of revenue for self-employment taxes (quarterly payments)
- Invoice Stripe: Stripe handles customer invoicing automatically via email receipts

## Legal Minimums Before Launch
- [ ] Terms of Service (use a template, customize for SaaS)
- [ ] Privacy Policy (required by Stripe, Supabase, and most app stores)
- [ ] Cookie/data consent banner (required for GDPR if any EU customers)
- [ ] Data processing agreement for any EU B2B customers

## When to Hire
- First contractor: when you're spending >10hrs/week on customer support → hire part-time support
- First employee: when MRR > $15K consistently for 3 months
- Don't hire before that — keep costs minimal, use tools to automate
