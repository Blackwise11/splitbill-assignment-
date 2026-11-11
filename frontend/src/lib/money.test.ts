import { describe, expect, it } from "vitest";

import {
  allocateEqual,
  allocateExact,
  amountToSatang,
  formatMoneyAmount,
  formatSatang,
  inspectAmount,
  parseSatang,
  satangToWire,
} from "./money";

describe("integer satang math", () => {
  it("adds 0.1 + 0.2 without floating-point drift", () => {
    expect(parseSatang("0.1")).toBe(10);
    expect(parseSatang("0.2")).toBe(20);
    expect(formatSatang((parseSatang("0.1") ?? 0) + (parseSatang("0.2") ?? 0))).toBe("0.30");
  });

  it("allocates 100.00 three ways as 33.34 / 33.33 / 33.33", () => {
    const shares = allocateEqual(10_000, ["alice", "bob", "carol"]);
    expect(shares).toEqual([
      { username: "alice", amountSatang: 3334 },
      { username: "bob", amountSatang: 3333 },
      { username: "carol", amountSatang: 3333 },
    ]);
    expect(shares.reduce((sum, share) => sum + share.amountSatang, 0)).toBe(10_000);
  });

  it("gives the remainder to the first members in the given order", () => {
    expect(allocateEqual(10_000, ["carol", "bob", "alice"]).map((s) => s.amountSatang)).toEqual([
      3334, 3333, 3333,
    ]);
  });

  it("formats with thousands separators", () => {
    expect(formatSatang(100_000)).toBe("1,000.00");
    expect(formatSatang(999_999_999_999)).toBe("9,999,999,999.99");
    expect(formatMoneyAmount("1000.00")).toBe("1,000.00");
  });

  it("rejects more than two decimals and non-positive totals", () => {
    expect(parseSatang("10.005")).toBeNull();
    expect(parseSatang("0.00")).toBeNull();
    expect(parseSatang("-1.00")).toBeNull();
    expect(parseSatang("1,000.00")).toBeNull();
    expect(parseSatang("0.00", { allowZero: true })).toBe(0);
  });

  it("returns descriptive validation messages", () => {
    expect(inspectAmount("10.005").error).toContain("2 decimal places");
    expect(inspectAmount("0.00").error).toContain("greater than 0.00");
  });

  it("computes exact-split remainder without floats", () => {
    const result = allocateExact(10_000, ["alice", "bob", "carol"], {
      alice: "50.00",
      bob: "30.00",
      carol: "10.00",
    });
    expect(result.allocatedSatang).toBe(9_000);
    expect(result.remainingSatang).toBe(1_000);
    expect(formatSatang(result.remainingSatang)).toBe("10.00");
  });

  it("handles negative balance strings without throwing", () => {
    expect(amountToSatang("-33.33")).toBe(-3333);
    expect(formatMoneyAmount("-33.33")).toBe("-33.33");
    expect(formatMoneyAmount("-1000.00")).toBe("-1,000.00");
  });

  it("normalizes values for API transmission", () => {
    expect(amountToSatang("33.34")).toBe(3334);
    expect(satangToWire(3334)).toBe("33.34");
    expect(satangToWire(100_000)).toBe("1000.00");
  });
});
