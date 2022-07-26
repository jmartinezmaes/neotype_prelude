import * as fc from "fast-check";
import { assert } from "chai";
import { arbNum, arbStr } from "./common.js";
import { eq } from "../src/Eq.js";
import { cmp } from "../src/Ord.js";
import { combine } from "../src/Semigroup.js";
import { mkTuple } from "../src/Tuple.js";

const mk = mkTuple;

describe("Tuple", () => {
  specify("[Eq.eq]", () => {
    fc.assert(
      fc.property(arbNum(), arbNum(), arbNum(), arbNum(), (a, x, b, y) => {
        const t0 = eq(mk([a, x]), mk([b, y]));
        assert.strictEqual(t0, eq(a, b) && eq(x, y));
      }),
    );
  });

  specify("[Ord.cmp]", () => {
    fc.assert(
      fc.property(arbNum(), arbNum(), arbNum(), arbNum(), (a, x, b, y) => {
        const t0 = cmp(mk([a, x]), mk([b, y]));
        assert.strictEqual(t0, combine(cmp(a, b), cmp(x, y)));
      }),
    );
  });

  specify("[Semigroup.combine]", () => {
    fc.assert(
      fc.property(arbStr(), arbStr(), arbStr(), arbStr(), (a, x, b, y) => {
        const t0 = combine(mk([a, x]), mk([b, y]));
        assert.deepEqual(t0, mk([combine(a, b), combine(x, y)]));
      }),
    );
  });
});
