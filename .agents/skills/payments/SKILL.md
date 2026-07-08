---
name: payments
description: Payment processing patterns for Stripe and Razorpay integration, webhook handling, idempotency, and refund flows
---

# Payments

Payment processing patterns for this project's Stripe and Razorpay integration.

## Providers

### Stripe
- Use Stripe SDK with idempotency keys for all mutation requests
- Webhook endpoint validates signatures via `stripe.webhooks.constructEvent`
- Handle `payment_intent.succeeded`, `payment_intent.payment_failed`
- Store `stripePaymentIntentId` on payment entity

### Razorpay
- Razorpay orders created server-side; client completes payment
- Webhook validates signatures via HMAC SHA256
- Handle `payment.captured`, `payment.failed`

## Webhook Rules
- All webhook handlers are **idempotent** — check `event.processed` before processing
- Use BullMQ queues for webhook processing (don't handle in request handler)
- Return 200 quickly, process async
- Log all webhook events for audit

## Refund Flow
- Full refunds update booking status to `cancelled`
- Partial refunds update amounts, keep booking active
- Always record refund reason and reference ID

## Testing
- Use provider test mode keys (never real keys in test env)
- Mock provider SDKs in unit tests
- E2E tests use provider's test cards
