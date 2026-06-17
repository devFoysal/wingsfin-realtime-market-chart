import { InstrumentType } from "../types/market";
import { isNonEmptyString } from "../../../utils/validations/common";

/**
 * Basic domain-specific validation logic for market data.
 */
export function isValidInstrumentType(value: unknown): value is InstrumentType {
  if (!isNonEmptyString(value)) return false;
  return value === "index" || value === "stock";
}
