import { z } from 'zod/v3';

/** Reusable UUID v4 string validator for server action boundaries. */
export const uuidField = z.string().uuid('Invalid ID format.');

/** Reusable strict phone number validator (allows optional +, digits, spaces, hyphens, parentheses). */
export const phoneField = z.string().regex(/^\+?[0-9\s\-\(\)]{7,20}$/, 'Invalid phone number format.');

/** Reusable postal code validator (allows alphanumeric, space, hyphens). */
export const postalCodeField = z.string().regex(/^[A-Za-z0-9\s\-]{3,15}$/, 'Invalid postal code format.');

/** Reusable strict alphanumeric string validator for bank details. */
export const bankAccountField = z.string().regex(/^[A-Za-z0-9\-]+$/, 'Must contain only alphanumeric characters and hyphens.');
