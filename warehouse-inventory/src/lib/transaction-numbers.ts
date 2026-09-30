/**
 * Generates unique transaction numbers in the format:
 * PREFIX-YYYYMMDD-NNNN
 * e.g. ISS-20260930-0001
 */

const prefixMap = {
  RECEIVE: "REC",
  ISSUE: "ISS",
  RETURN: "RET",
  CONSUME: "CON",
  INSTALL: "INS",
  PULLOUT: "PUL",
  TRANSFER: "TRF",
  ADJUST: "ADJ",
  SCRAP: "SCR",
  INSPECT: "INP",
} as const;

export type TransactionType = keyof typeof prefixMap;

export function generateTransactionNumber(
  type: TransactionType,
  sequence: number,
  date: Date = new Date()
): string {
  const prefix = prefixMap[type];
  const dateStr = date
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");
  const seq = String(sequence).padStart(4, "0");
  return `${prefix}-${dateStr}-${seq}`;
}

export function getDatePrefix(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}
