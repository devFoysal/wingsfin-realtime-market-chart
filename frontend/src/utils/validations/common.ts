/**
 * Common application-wide validation utilities.
 * Usually replaced or paired with Zod/Yup later.
 */

export function isValidNumber(value: unknown): value is number {
  return typeof value === "number" && !Number.isNaN(value);
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
