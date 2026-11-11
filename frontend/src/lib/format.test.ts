import { describe, expect, it } from "vitest";

import { calculateEqualSplit, formatSatangThaiBaht, formatThaiBaht } from "./format";

describe("Chowpa formatting utilities", () => {
  it("formats positive and negative amounts with the baht mark", () => {
    expect(formatThaiBaht("1000.00")).toBe("1,000.00 ฿");
    expect(formatThaiBaht("-33.33")).toBe("-33.33 ฿");
    expect(formatSatangThaiBaht(3334)).toBe("33.34 ฿");
  });

  it("allocates 100.00 across three equal members exactly", () => {
    expect(calculateEqualSplit("100.00", ["alice", "bob", "carol"])).toEqual({
      alice: "33.34",
      bob: "33.33",
      carol: "33.33",
    });
  });

  it("returns no allocation for invalid amounts or empty member lists", () => {
    expect(calculateEqualSplit("10.005", ["alice", "bob"])).toEqual({});
    expect(calculateEqualSplit("100.00", [])).toEqual({});
  });
});
