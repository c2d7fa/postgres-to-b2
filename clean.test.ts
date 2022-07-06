import { removed } from "./clean.ts";

import { assertEquals } from "https://deno.land/std@0.147.0/testing/asserts.ts";
import { describe, it } from "https://deno.land/std@0.147.0/testing/bdd.ts";

describe("removing backups", () => {
  describe("when there is only one backup", () => {
    it("nothing is removed", () => {
      assertEquals(removed([]), []);
    });
  });
});
