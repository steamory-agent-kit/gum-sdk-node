import { describe, expect, it } from "vitest";
import { buildQuery } from "../src/utils/query";
import { serializeBody } from "../src/utils/serialize";

describe("utils", () => {
  it("builds query strings and skips nullish values", () => {
    expect(
      buildQuery({
        start_time: new Date("2026-04-22T01:02:03.000Z"),
        empty: undefined,
        none: null,
        enabled: false,
        limit: 100,
      }),
    ).toBe("?start_time=2026-04-22T01%3A02%3A03.000Z&enabled=false&limit=100");
  });

  it("returns an empty string for empty query params", () => {
    expect(buildQuery({ empty: undefined, none: null })).toBe("");
  });

  it("serializes nested dates and strips undefined values", () => {
    expect(
      serializeBody({
        timestamp: new Date("2026-04-22T01:02:03.000Z"),
        optional: undefined,
        messages: [
          {
            created_at: new Date("2026-04-22T02:03:04.000Z"),
            ignored: undefined,
          },
        ],
      }),
    ).toEqual({
      timestamp: "2026-04-22T01:02:03.000Z",
      messages: [{ created_at: "2026-04-22T02:03:04.000Z" }],
    });
  });
});
