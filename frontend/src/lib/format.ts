import { allocateEqual, formatSatang, parseSatang, satangToWire } from "./money";

/**
 * Chowpa's display formatter, implemented without `parseFloat`.
 * The amount is a validated decimal string; formatting always goes through
 * integer satang first.
 */
export function formatThaiBaht(amount: string): string {
  const value = amount.trim();
  const negative = value.startsWith("-");
  const satang = parseSatang(negative ? value.slice(1) : value, { allowZero: true });
  if (satang === null) return amount;
  return `${negative ? "-" : ""}${formatSatang(satang)} ฿`;
}

export function formatSatangThaiBaht(satang: number): string {
  return `${formatSatang(satang)} ฿`;
}

/**
 * The requested utility name, backed by integer satang allocation.
 * Never uses float arithmetic.
 */
export function calculateEqualSplit(
  amountStr: string,
  members: readonly string[],
): Record<string, string> {
  const total = parseSatang(amountStr);
  if (total === null || members.length === 0) return {};
  return Object.fromEntries(
    allocateEqual(total, members).map((share) => [
      share.username,
      satangToWire(share.amountSatang),
    ]),
  );
}
