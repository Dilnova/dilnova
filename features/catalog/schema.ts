import { z } from "zod/v3";
import { uuidField } from "@/shared/validation/primitives";
import {
  optionalCloudinaryUrlSchema,
  productMediaItemSchema,
} from "@/shared/media/validate-cloudinary-media";

export const toggleWishlistSchema = z.object({
  productId: uuidField,
});

export const submitReviewSchema = z.object({
  productId: uuidField,
  rating: z
    .number()
    .int("Rating must be a whole number.")
    .min(1, "Rating must be at least 1.")
    .max(5, "Rating cannot exceed 5."),
  comment: z.string().max(1000, "Comment cannot exceed 1000 characters.").trim(),
});

export const submitQuestionSchema = z.object({
  productId: uuidField,
  content: z
    .string()
    .min(1, "Question cannot be empty.")
    .max(500, "Question cannot exceed 500 characters.")
    .trim(),
});

export const submitAnswerSchema = z.object({
  questionId: uuidField,
  answer: z
    .string()
    .min(1, "Answer cannot be empty.")
    .max(1000, "Answer cannot exceed 1000 characters.")
    .trim(),
});

export const createCategorySchema = z.object({
  name: z
    .string()
    .min(1, "Name cannot be empty.")
    .max(100, "Name cannot exceed 100 characters.")
    .trim(),
  slug: z
    .string()
    .min(1, "Slug cannot be empty.")
    .max(100, "Slug cannot exceed 100 characters.")
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens only."),
  parentId: z.string().uuid("Invalid parent category ID.").nullable().optional(),
});

export const updateCategorySchema = createCategorySchema.extend({
  id: uuidField,
});

export const deleteCategorySchema = z.object({
  id: uuidField,
});

export const updateProductSchema = z.object({
  id: uuidField,
  updates: z.object({
    name: z.string().min(1, "Product name cannot be empty.").max(200).trim().optional(),
    price: z.number().int().min(0, "Price cannot be negative.").optional(),
    categoryId: z.string().uuid().nullable().optional(),
    description: z.string().max(5000).nullable().optional(),
    type: z.enum(["product", "service"]).optional(),
    imageUrl: optionalCloudinaryUrlSchema.optional(),
    media: z.array(productMediaItemSchema).optional(),
  }),
});

export const deleteProductSchema = z.object({
  id: uuidField,
});

export const addProductSchema = z.object({
  name: z
    .string()
    .min(1, "Product name is required.")
    .max(100, "Product name cannot exceed 100 characters.")
    .trim(),
  type: z.enum(["product", "service"]),
  description: z
    .string()
    .max(1000, "Description cannot exceed 1000 characters.")
    .trim()
    .default(""),
  priceInDollars: z.number().positive("Price must be a positive number."),
  imageUrl: optionalCloudinaryUrlSchema,
  media: z.array(productMediaItemSchema).default([]),
  categoryId: z.string().uuid("Invalid category ID.").or(z.literal("")).default(""),
  quantity: z
    .number()
    .int("Quantity must be a whole number.")
    .nonnegative("Quantity cannot be negative.")
    .optional()
    .default(0),
  branchId: z.string().uuid("Invalid branch ID.").or(z.literal("")).optional().default(""),
  stockAvailability: z.string().min(1).max(50).optional().default("in_stock"),
});

export const vendorDeleteProductSchema = z.object({
  productId: z.string().uuid("Invalid product ID."),
});

export const incrementViewsSchema = z.object({
  productId: uuidField,
});
