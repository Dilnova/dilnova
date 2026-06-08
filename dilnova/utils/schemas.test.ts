import { describe, it, expect } from 'vitest';
import {
  createCategorySchema,
  submitReviewSchema,
  updateMemberRoleSchema,
  addProductSchema,
} from './schemas';

describe('Zod Input Schemas Validation', () => {
  describe('createCategorySchema', () => {
    it('should validate categories with proper slugs and names', () => {
      const valid = createCategorySchema.safeParse({
        name: 'Tools & Machining',
        slug: 'tools-machining',
      });
      expect(valid.success).toBe(true);
    });

    it('should reject categories with uppercase characters or underscores in slugs', () => {
      const invalid = createCategorySchema.safeParse({
        name: 'Tools & Machining',
        slug: 'tools_machining', // hyphens only, not underscores
      });
      expect(invalid.success).toBe(false);
      if (!invalid.success) {
        expect(invalid.error.issues[0].message).toContain('Slug must be lowercase alphanumeric with hyphens only');
      }
    });

    it('should reject categories with empty names', () => {
      const invalid = createCategorySchema.safeParse({
        name: '',
        slug: 'valid-slug',
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe('submitReviewSchema', () => {
    it('should validate correct review parameters', () => {
      const valid = submitReviewSchema.safeParse({
        productId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        rating: 4,
        comment: 'Excellent product quality!',
      });
      expect(valid.success).toBe(true);
    });

    it('should reject out of range ratings (e.g. 6)', () => {
      const invalid = submitReviewSchema.safeParse({
        productId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        rating: 6,
        comment: 'Perfect',
      });
      expect(invalid.success).toBe(false);
    });

    it('should reject non-integer ratings', () => {
      const invalid = submitReviewSchema.safeParse({
        productId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        rating: 4.5,
        comment: 'Nice',
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe('updateMemberRoleSchema', () => {
    it('should validate allowed Clerk organization roles', () => {
      const valid1 = updateMemberRoleSchema.safeParse({
        organizationId: 'org_123',
        userId: 'user_123',
        newRole: 'org:admin',
      });
      const valid2 = updateMemberRoleSchema.safeParse({
        organizationId: 'org_123',
        userId: 'user_123',
        newRole: 'org:member',
      });
      expect(valid1.success).toBe(true);
      expect(valid2.success).toBe(true);
    });

    it('should reject unsupported organization roles', () => {
      const invalid = updateMemberRoleSchema.safeParse({
        organizationId: 'org_123',
        userId: 'user_123',
        newRole: 'superadmin',
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe('addProductSchema', () => {
    it('should validate correct product details', () => {
      const valid = addProductSchema.safeParse({
        name: 'Circular Saw 15A',
        type: 'product',
        description: 'High power motor circular saw',
        priceInDollars: 99.99,
        imageUrl: 'https://example.com/saw.jpg',
        media: [],
        categoryId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        quantity: 10,
      });
      expect(valid.success).toBe(true);
    });

    it('should reject negative price values', () => {
      const invalid = addProductSchema.safeParse({
        name: 'Circular Saw 15A',
        type: 'product',
        description: 'High power motor circular saw',
        priceInDollars: -10,
        imageUrl: '',
        media: [],
        categoryId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      });
      expect(invalid.success).toBe(false);
    });

    it('should validate non-negative integer quantity and reject negative/float quantity values', () => {
      const validZero = addProductSchema.safeParse({
        name: 'Circular Saw 15A',
        type: 'product',
        priceInDollars: 99.99,
        quantity: 0,
      });
      expect(validZero.success).toBe(true);

      const invalidNegative = addProductSchema.safeParse({
        name: 'Circular Saw 15A',
        type: 'product',
        priceInDollars: 99.99,
        quantity: -5,
      });
      expect(invalidNegative.success).toBe(false);

      const invalidFloat = addProductSchema.safeParse({
        name: 'Circular Saw 15A',
        type: 'product',
        priceInDollars: 99.99,
        quantity: 5.5,
      });
      expect(invalidFloat.success).toBe(false);
    });
  });
});
