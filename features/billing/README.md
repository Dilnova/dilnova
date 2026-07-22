# Billing

Vendor POS register: in-store checkout, receipt creation, branch-scoped stock depletion.

**Public API:** `@/features/billing`

| Module                            | Role                                   |
| --------------------------------- | -------------------------------------- |
| `types.ts`                        | `VendorBillingRegisterData` for POS UI |
| `schema.ts`                       | `processBillingCheckoutSchema`         |
| `register.actions.ts`             | Load register catalog + branches       |
| `checkout.actions.ts`             | Process POS sale + receipt             |
| `components/POSBillingClient.tsx` | POS register UI                        |

Depends on `@/features/inventory` for stock reservation and vendor auth (`vendor-data.ts`).
