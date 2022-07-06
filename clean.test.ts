import { removed } from "./clean.ts";

import { assertEquals } from "https://deno.land/std@0.147.0/testing/asserts.ts";
import { describe, it } from "https://deno.land/std@0.147.0/testing/bdd.ts";

describe("removing backups", () => {
  describe("when there is only one backup", () => {
    it("nothing is removed", () => {
      assertEquals(removed([]), []);
    });
  });

  describe("when there are multiple backups each day two days in a row", () => {
    const example = [
      "test/postgres-2022-07-01T01:01-250Z.sql",
      "test/postgres-2022-07-01T05:30-550Z.sql",
      "test/postgres-2022-07-01T18:50-100Z.sql",
      "test/postgres-2022-07-02T03:02-100Z.sql",
      "test/postgres-2022-07-01T08:20-800Z.sql",
    ];

    it("only one from yesterday is kept", () => {
      assertEquals(removed(example), [example[1], example[2]]);
    });
  });

  describe("if a file does not have a valid format", () => {
    const example = [
      "test/postgres-2022-07-01T01:01-250Z.sql",
      "test/postgres-2022-01T05:30-550Z.sql", // Invalid name
      "test/postgres-2022-07-01T18:50-100Z.sql",
      "hello", // Invalid name
      "test/postgres-2022-07-01T08:20-800Z.sql",
    ];

    it("it isn't removed", () => {
      assertEquals(removed(example), [example[2]]);
    });
  });

  describe("the order in which arguments are passed doesn't matter", () => {
    const example = [
      "test/postgres-2022-07-01T05:30-550Z.sql",
      "test/postgres-2022-07-01T01:01-250Z.sql",
      "test/postgres-2022-07-02T03:02-100Z.sql",
      "test/postgres-2022-07-01T08:20-800Z.sql",
      "test/postgres-2022-07-01T18:50-100Z.sql",
    ];

    it("gives same result with different order", () => {
      assertEquals(removed(example), [example[0], example[3], example[4]]);
    });
  });
});
