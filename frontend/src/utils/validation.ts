import { InstrumentType } from "../dtos/market";

export function isValidNumber(value: unknown): value is number {
  return typeof value === "number" && !Number.isNaN(value);
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isValidInstrumentType(value: unknown): value is InstrumentType {
  if (!isNonEmptyString(value)) return false;
  return value === "index" || value === "stock";
}
