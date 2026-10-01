"use client";

import type { CartLineInput } from "./schema";

/**
 * Standard cart line item interface inferred directly from cartLineSchema.
 * Centralizing on the Zod schema prevents contract drift across client and server.
 */
export type CartItem = CartLineInput;
