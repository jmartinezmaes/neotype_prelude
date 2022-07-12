import * as fc from "fast-check";
import { assert } from "chai";
import { arbStr } from "./common";
import { combine, combineAll, Semigroup } from "../src";

describe("Semigroup", () => {
  specify("combine", () => {
    fc.assert(
      fc.property(arbStr(), arbStr(), (x, y) => {
        assert.deepEqual(combine(x, y), x[Semigroup.combine](y));
      }),
    );
  });

  specify("combineAll", () => {
    fc.assert(
      fc.property(arbStr(), arbStr(), arbStr(), (x, y, z) => {
        assert.deepEqual(combineAll(x, y, z), [x, y, z].reduce(combine));
      }),
    );
  });
});
