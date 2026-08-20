/**
 * Client-safe error parser. Contains ZERO server-only or logger imports.
 * Safe to import inside Client Components ("use client").
 */
export function extractActionErrorMessage(result: unknown): string {
  if (!result || typeof result !== "object") {
    return "An unexpected error occurred. Please try again.";
  }

  const res = result as {
    data?: { error?: unknown };
    serverError?: unknown;
    validationErrors?: Record<string, { _errors?: string[] }>;
  };

  // 1. Check custom action error payload
  if (res.data && typeof res.data === "object" && "error" in res.data) {
    if (typeof res.data.error === "string" && res.data.error.trim().length > 0) {
      return res.data.error;
    }
  }

  // 2. Check next-safe-action serverError
  if (typeof res.serverError === "string" && res.serverError.trim().length > 0) {
    return res.serverError;
  }

  // 3. Check next-safe-action validationErrors (Zod field errors)
  if (res.validationErrors && typeof res.validationErrors === "object") {
    const valErrs = res.validationErrors;
    const messages: string[] = [];
    for (const key of Object.keys(valErrs)) {
      const field = valErrs[key];
      if (field?._errors && Array.isArray(field._errors) && field._errors.length > 0) {
        const fieldName = key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase());
        messages.push(`${fieldName}: ${field._errors.join(", ")}`);
      }
    }
    if (messages.length > 0) {
      return messages.join(" | ");
    }
  }

  return "An unexpected error occurred. Please try again.";
}
