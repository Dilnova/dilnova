# Orders

Simulated order lifecycle: status, vendor actions, customer payment slips, stock transitions, and order emails.

**Public API:** `@/features/orders`

| Module | Role |
|--------|------|
| `status.ts` | Order statuses and labels |
| `payment.rules.ts` | COD / bank transfer eligibility rules |
| `vendor-scope.ts` | Multi-vendor order guards |
| `stock.ts` | Online order stock reserve / restore |
| `transitions.ts` | Fulfill, cancel, verify, reject slip |
| `customer.actions.ts` | Payment slip upload |
| `vendor.actions.ts` | Verify, reject, cancel orders |
| `email/` | Confirmation & payment slip notifications |
| `components/` | Payment slip UI panels |
