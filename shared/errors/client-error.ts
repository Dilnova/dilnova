/**
 * Client-safe error parser. Contains ZERO server-only or logger imports.
 * Safe to import inside Client Components ("use client").
 *
 * Robustly extracts a human-readable error message from:
 * 1. Standard ActionResponse ({ success: false, error: "..." } or { error: "..." })
 * 2. Next-safe-action errors (serverError, validationErrors)
 * 3. Wrapped safe-action payloads ({ data: { error: "..." } } or { data: { success: false, error: "..." } })
 * 4. Thrown JavaScript Error instances or caught error objects with .message
 */
export function extractActionErrorMessage(result: unknown): string {
  if (result == null) {
    return "An unexpected error occurred. Please try again.";
  }

  // 1. If result is an instance of Error (e.g. from try/catch)
  if (result instanceof Error) {
    if (result.message && result.message.trim().length > 0) {
      return result.message;
    }
  }

  // 2. If result is a primitive string
  if (typeof result === "string" && result.trim().length > 0) {
    return result;
  }

  if (typeof result !== "object") {
    return "An unexpected error occurred. Please try again.";
  }

  const res = result as {
    success?: boolean;
    error?: unknown;
    data?: unknown;
    serverError?: unknown;
    validationErrors?: unknown;
    message?: unknown;
  };

  // 3. Top-level action failure: { success: false, error: string } or { error: string }
  if ("error" in res && typeof res.error === "string" && res.error.trim().length > 0) {
    return res.error;
  }
  if (
    "error" in res &&
    res.error &&
    typeof res.error === "object" &&
    "message" in res.error &&
    typeof (res.error as { message: unknown }).message === "string"
  ) {
    const msg = (res.error as { message: string }).message.trim();
    if (msg.length > 0) return msg;
  }

  // 4. Nested safe-action data payload: { data: { error: "..." } } or { data: { success: false, error: "..." } }
  if (res.data && typeof res.data === "object") {
    const dataObj = res.data as { error?: unknown; message?: unknown };
    if (
      "error" in dataObj &&
      typeof dataObj.error === "string" &&
      dataObj.error.trim().length > 0
    ) {
      return dataObj.error;
    }
    if (
      "message" in dataObj &&
      typeof dataObj.message === "string" &&
      dataObj.message.trim().length > 0
    ) {
      return dataObj.message;
    }
  }

  // 5. Next-safe-action serverError: { serverError: string } or { serverError: { message: string } }
  if (typeof res.serverError === "string" && res.serverError.trim().length > 0) {
    return res.serverError;
  }
  if (
    res.serverError &&
    typeof res.serverError === "object" &&
    "message" in res.serverError &&
    typeof (res.serverError as { message: unknown }).message === "string"
  ) {
    const msg = (res.serverError as { message: string }).message.trim();
    if (msg.length > 0) return msg;
  }

  // 6. Next-safe-action validationErrors (Zod field or form errors)
  if (res.validationErrors && typeof res.validationErrors === "object") {
    const valErrs = res.validationErrors as Record<string, unknown>;
    const messages: string[] = [];

    // Check root _errors or formErrors
    if (Array.isArray(valErrs._errors) && valErrs._errors.length > 0) {
      messages.push(...valErrs._errors.filter((e): e is string => typeof e === "string"));
    }
    if (Array.isArray(valErrs.formErrors) && valErrs.formErrors.length > 0) {
      messages.push(...valErrs.formErrors.filter((e): e is string => typeof e === "string"));
    }

    // Check fieldErrors if structured as { fieldErrors: { [field]: [...] } }
    const fieldSource =
      valErrs.fieldErrors && typeof valErrs.fieldErrors === "object"
        ? (valErrs.fieldErrors as Record<string, unknown>)
        : valErrs;

    for (const key of Object.keys(fieldSource)) {
      if (key === "_errors" || key === "formErrors" || key === "fieldErrors") continue;
      const field = fieldSource[key];

      // Format 1: field is { _errors: string[] }
      if (
        field &&
        typeof field === "object" &&
        "_errors" in field &&
        Array.isArray((field as { _errors?: unknown[] })._errors)
      ) {
        const errs = (field as { _errors: string[] })._errors.filter((e) => typeof e === "string");
        if (errs.length > 0) {
          const fieldName = key
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (str) => str.toUpperCase());
          messages.push(`${fieldName}: ${errs.join(", ")}`);
        }
      }
      // Format 2: field is string[]
      else if (Array.isArray(field) && field.length > 0) {
        const errs = field.filter((e): e is string => typeof e === "string");
        if (errs.length > 0) {
          const fieldName = key
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (str) => str.toUpperCase());
          messages.push(`${fieldName}: ${errs.join(", ")}`);
        }
      }
      // Format 3: field is string
      else if (typeof field === "string" && field.trim().length > 0) {
        const fieldName = key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase());
        messages.push(`${fieldName}: ${field}`);
      }
    }

    if (messages.length > 0) {
      return messages.join(" | ");
    }
  }

  // 7. Generic message property: { message: string }
  if ("message" in res && typeof res.message === "string" && res.message.trim().length > 0) {
    return res.message;
  }

  return "An unexpected error occurred. Please try again.";
}
