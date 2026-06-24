import { z } from 'zod/v3';

export const cartLineSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  imageUrl: z.string().nullable(),
  quantity: z.number().int().positive(),
  vendorName: z.string(),
  type: z.string(),
});

export const sendCartEmailSchema = z.object({
  emailAddress: z.string().email('Invalid email address format.'),
  cartItems: z.array(cartLineSchema),
  cartTotal: z.number().nonnegative(),
});

export const checkoutItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  quantity: z.number().int().positive(),
  vendorName: z.string(),
  type: z.string(),
  vendorOrgId: z.string().optional(),
});

export const checkoutSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required.'),
  customerEmail: z.string().email('Invalid email address.'),
  items: z.array(checkoutItemSchema).min(1, 'Cart must contain at least one item.'),
  totalAmount: z.number().nonnegative(),
  fulfillmentMethod: z.string().min(1),
  paymentMethod: z.string().min(1),
  pickupBranchId: z.string().uuid().nullable().optional(),
  shippingAddress: z.string().max(500).trim().optional().nullable(),
  shippingPhone: z.string().max(50).trim().optional().nullable(),
  checkoutVendorOrgId: z.string().nullable().optional(),
});

export const syncedCartItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number().int().nonnegative(),
  imageUrl: z.string().nullable(),
  quantity: z.number().int().positive(),
  vendorName: z.string(),
  type: z.string(),
});

export const syncedCartSchema = z.array(syncedCartItemSchema).max(100);

export type CartLineInput = z.infer<typeof cartLineSchema>;
export type CheckoutItemInput = z.infer<typeof checkoutItemSchema>;
export type SyncedCartItem = z.infer<typeof syncedCartItemSchema>;
