/** Infrastructure layer — see docs/architecture/folder-conventions.md */

export * from '@/shared/db/client';
export * from '@/shared/auth/superadmin-guard';
export * from '@/shared/auth/clerk-cache';
export * from '@/shared/audit/logger';
export * from '@/shared/security/rate-limit';
export * from '@/shared/security/async-context';
export * from '@/shared/validation/primitives';
