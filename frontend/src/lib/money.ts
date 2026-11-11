/**
 * Integer-satang money helpers.
 *
 * Every calculation uses whole satang (1 THB = 100 satang). JavaScript
 * `number` is only used for integer values bounded by NUMERIC(12,2), well below
 * Number.MAX_SAFE_INTEGER (9,007,199,254,740,991). Floating point is never used
 * to add, subtract, or round money.
 */

export const SATANG_PER_BAHT = 100;
export const MAX_AMOUNT_SATANG = 999_999_999_999;
const MAX_INTEGER_DIGITS = 10;

const MONEY_PATTERN = /^(\d+)(?:\.(\d*))?$/;

export interface Share {
  username: string;
  amountSatang: number;
}

export interface ParsedMoney {
  satang: number;
  error: string | null;
}

/**
 * Parse a user-entered THB string into satang.
 * Returns `null` when invalid. Accepts the transient "10." while typing.
 */
export function parseSatang(
  raw: string,
  options: { allowZero?: boolean } = {},
): number | null {
  const value = raw.trim();
  if (!value) return null;

  const match = MONEY_PATTERN.exec(value);
  if (!match) return null;

  const whole = match[1];
  const fraction = match[2] ?? "";
  if (fraction.length > 2) return null;
  if (whole.length > MAX_INTEGER_DIGITS) return null;

  const satang =
    Number(whole) * SATANG_PER_BAHT + Number(fraction.padEnd(2, "0") || "0");
  if (!Number.isSafeInteger(satang) || satang > MAX_AMOUNT_SATANG) return null;
  if (satang === 0 && !options.allowZero) return null;
  return satang;
}

/** Parse an input and keep a human-readable validation message for the form. */
export function inspectAmount(
  raw: string,
  options: { allowZero?: boolean; label?: string } = {},
): ParsedMoney {
  const label = options.label ?? "Amount";
  const value = raw.trim();
  if (!value) return { satang: 0, error: `${label} is required.` };
  if (!MONEY_PATTERN.test(value)) {
    return {
      satang: 0,
      error: `${label} must be a number such as 1000.00 (no commas or letters).`,
    };
  }
  const fraction = value.split(".")[1] ?? "";
  if (fraction.length > 2) {
    return {
      satang: 0,
      error: `${label} is limited to 2 decimal places (satang).`,
    };
  }
  const satang = parseSatang(value, { allowZero: options.allowZero });
  if (satang === null) {
    const digitsOnly = value.replace(/[^0-9]/g, "");
    const isZero = digitsOnly.length > 0 && /^0+$/.test(digitsOnly);
    return {
      satang: 0,
      error: isZero
        ? `${label} must be greater than 0.00 THB.`
        : `${label} is outside the supported range.`,
    };
  }
  return { satang, error: null };
}

/** Format satang as grouped THB, e.g. 100000 -> "1,000.00". */
export function formatSatang(satang: number): string {
  const sign = satang < 0 ? "-" : "";
  const absolute = Math.abs(Math.trunc(satang));
  const whole = Math.floor(absolute / SATANG_PER_BAHT);
  const fraction = absolute % SATANG_PER_BAHT;
  return `${sign}${groupThousands(whole)}.${String(fraction).padStart(2, "0")}`;
}

/** Format satang without grouping, suitable for API payloads. */
export function satangToWire(satang: number): string {
  const sign = satang < 0 ? "-" : "";
  const absolute = Math.abs(Math.trunc(satang));
  const whole = Math.floor(absolute / SATANG_PER_BAHT);
  const fraction = absolute % SATANG_PER_BAHT;
  return `${sign}${whole}.${String(fraction).padStart(2, "0")}`;
}

/** Format an API amount string ("1000.00") for display ("1,000.00"). */
export function formatMoneyAmount(amount: string): string {
  const value = amount.trim();
  const negative = value.startsWith("-");
  const satang = parseSatang(negative ? value.slice(1) : value, { allowZero: true });
  if (satang === null) return amount;
  return `${negative ? "-" : ""}${formatSatang(satang)}`;
}

/** Parse API amount strings, including negative balances, without float conversion. */
export function amountToSatang(amount: string): number {
  const value = amount.trim();
  const negative = value.startsWith("-");
  const satang = parseSatang(negative ? value.slice(1) : value, { allowZero: true });
  if (satang === null) {
    throw new Error(`Invalid money amount received from API: ${amount}`);
  }
  return negative ? -satang : satang;
}

/**
 * Mirror the backend's equal-split algorithm exactly: floor division, then one
 * extra satang to the first `remainder` members in the supplied order.
 */
export function allocateEqual(totalSatang: number, members: readonly string[]): Share[] {
  if (members.length === 0 || totalSatang < 0) return [];
  const base = Math.floor(totalSatang / members.length);
  const remainder = totalSatang % members.length;
  return members.map((username, index) => ({
    username,
    amountSatang: base + (index < remainder ? 1 : 0),
  }));
}

export interface ExactAllocation {
  shares: Share[];
  allocatedSatang: number;
  remainingSatang: number;
}

/**
 * Parse exact-share inputs. Empty fields count as zero while editing, but only
 * non-empty values are sent to the API.
 */
export function allocateExact(
  totalSatang: number,
  members: readonly string[],
  inputs: Readonly<Record<string, string>>,
): ExactAllocation {
  const shares: Share[] = [];
  let allocatedSatang = 0;

  for (const username of members) {
    const raw = inputs[username] ?? "";
    if (!raw.trim()) continue;
    const satang = parseSatang(raw, { allowZero: true });
    if (satang === null) continue;
    shares.push({ username, amountSatang: satang });
    allocatedSatang += satang;
  }

  return {
    shares,
    allocatedSatang,
    remainingSatang: totalSatang - allocatedSatang,
  };
}

/** Format a timestamp in Thailand time for the expense table. */
export function formatThaiDateTime(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return isoTimestamp;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
    timeZoneName: "short",
  }).format(date);
}

function groupThousands(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
