/**
 * Client-side logging utilities.
 * Re-exports safe client loggers from @/shared/errors/client-error.
 * Contains ZERO server-only dependencies; safe for "use client" components.
 */
export { logClientError, logClientWarning } from "@/shared/errors/client-error";
