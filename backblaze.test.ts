import { dumpFile } from "./backblaze.ts";

import { assertEquals } from "https://deno.land/std@0.147.0/testing/asserts.ts";
import { describe, it } from "https://deno.land/std@0.147.0/testing/bdd.ts";

describe("the uploaded file", () => {
  it("has correct name, type and contents", () => {
    const config = {
      backblaze: {
        keyId: "",
        key: "",
      },
      postgres: {
        host: "",
        user: "",
        database: "example",
        password: "",
      },
    };
    const exampleContents = "hello\nworld\n";
    const now = new Date("2022-01-02T03:45:56.123Z");

    const result = dumpFile(config, now, exampleContents);

    assertEquals(result.content, exampleContents);
    assertEquals(result.type, "text/plain");
    assertEquals(result.name, "example-2022-01-02T03-45-56-123Z.sql");
  });
});
