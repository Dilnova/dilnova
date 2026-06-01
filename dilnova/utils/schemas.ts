import { z } from 'zod/v3';

// ═══════════════════════════════════════════════════════════
// SHARED ZOD SCHEMAS — Enterprise Input Validation
// ═══════════════════════════════════════════════════════════
// All server action inputs are validated at the boundary using
// these schemas before any database or API calls are made.

/** Reusable UUID v4 string validator */
const uuidField = z.string().uuid('Invalid ID format.');

// ── Product Actions ──────────────────────────────────────

export const toggleWishlistSchema = z.object({
  productId: uuidField,
});

export const submitReviewSchema = z.object({
  productId: uuidField,
  rating: z.number().int('Rating must be a whole number.').min(1, 'Rating must be at least 1.').max(5, 'Rating cannot exceed 5.'),
  comment: z.string().max(1000, 'Comment cannot exceed 1000 characters.').trim(),
});

export const submitQuestionSchema = z.object({
  productId: uuidField,
  content: z.string().min(1, 'Question cannot be empty.').max(500, 'Question cannot exceed 500 characters.').trim(),
});

export const submitAnswerSchema = z.object({
  questionId: uuidField,
  answer: z.string().min(1, 'Answer cannot be empty.').max(1000, 'Answer cannot exceed 1000 characters.').trim(),
});

// ── Superadmin: Category CRUD ────────────────────────────

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Name cannot be empty.').max(100, 'Name cannot exceed 100 characters.').trim(),
  slug: z.string().min(1, 'Slug cannot be empty.').max(100, 'Slug cannot exceed 100 characters.').trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens only.'),
  parentId: z.string().uuid('Invalid parent category ID.').nullable().optional(),
});

export const updateCategorySchema = createCategorySchema.extend({
  id: uuidField,
});

export const deleteCategorySchema = z.object({
  id: uuidField,
});

// ── Superadmin: Product Moderation ───────────────────────

export const updateProductSchema = z.object({
  id: uuidField,
  updates: z.object({
    name: z.string().min(1, 'Product name cannot be empty.').max(200).trim().optional(),
    price: z.number().int().min(0, 'Price cannot be negative.').optional(),
    categoryId: z.string().uuid().nullable().optional(),
    description: z.string().max(5000).nullable().optional(),
    type: z.enum(['product', 'service']).optional(),
    imageUrl: z.string().trim().optional(),
    media: z.array(
      z.object({
        url: z.string().url('Invalid media URL.'),
        type: z.enum(['image', 'video']),
      })
    ).optional(),
  }),
});

export const deleteProductSchema = z.object({
  id: uuidField,
});

// ── Superadmin: System Settings ──────────────────────────

export const updateSystemSettingSchema = z.object({
  key: z.string().min(1, 'Setting key cannot be empty.').max(100).trim(),
  value: z.string().max(1000, 'Setting value is too long.').trim(),
});

// ── Admin: Organization Member Role ──────────────────────

const ALLOWED_ORG_ROLES = ['org:member', 'org:admin', 'org:vendor', 'org:customer'] as const;

export const updateMemberRoleSchema = z.object({
  organizationId: z.string().min(1, 'Organization ID is required.'),
  userId: z.string().min(1, 'User ID is required.'),
  newRole: z.enum(ALLOWED_ORG_ROLES, {
    errorMap: () => ({ message: 'Invalid role specified.' }),
  }),
});

// ── Vendor: Profile Metadata ─────────────────────────────

export const vendorMetadataSchema = z.object({
  organizationId: z.string().min(1, 'Organization ID is required.'),
  data: z.object({
    description: z.string().max(1000, 'Description cannot exceed 1000 characters.').trim().default(''),
    address: z.string().max(250, 'Address cannot exceed 250 characters.').trim().default(''),
    phone: z.string().max(50, 'Phone cannot exceed 50 characters.').trim().default(''),
    bannerUrl: z.string().trim().default('')
      .refine(
        (val) => val === '' || val.startsWith('https://'),
        { message: 'Banner URL must use HTTPS.' }
      ),
  }),
});

// ── Vendor: Product CRUD ─────────────────────────────────

export const addProductSchema = z.object({
  name: z.string().min(1, 'Product name is required.').max(100, 'Product name cannot exceed 100 characters.').trim(),
  type: z.enum(['product', 'service']),
  description: z.string().max(1000, 'Description cannot exceed 1000 characters.').trim().default(''),
  priceInDollars: z.number().positive('Price must be a positive number.'),
  imageUrl: z.string().trim().default(''),
  media: z.array(
    z.object({
      url: z.string().url('Invalid media URL.'),
      type: z.enum(['image', 'video']),
    })
  ).default([]),
  categoryId: z.string().uuid('Invalid category ID.').or(z.literal('')).default(''),
});

export const vendorDeleteProductSchema = z.object({
  productId: z.string().uuid('Invalid product ID.'),
});

export const incrementViewsSchema = z.object({
  productId: uuidField,
});

