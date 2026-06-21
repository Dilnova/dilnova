import { z } from 'zod/v3';

/** Reusable UUID v4 string validator for server action boundaries. */
export const uuidField = z.string().uuid('Invalid ID format.');
