import { describe, expectTypeOf, it } from "vitest";
import { GumClient } from "../src";

describe("public API", () => {
  it("does not expose userActions.query", () => {
    const client = new GumClient({
      apiKey: "test-key",
      fetch: async () => new Response("{}"),
    });

    expectTypeOf(client.userActions).not.toHaveProperty("query");
  });

  it("exposes Session APIs through sessions", () => {
    const client = new GumClient({
      apiKey: "test-key",
      fetch: async () => new Response("{}"),
    });

    expectTypeOf(client).toHaveProperty("sessions");
    expectTypeOf(client).not.toHaveProperty("threads");
  });
});
