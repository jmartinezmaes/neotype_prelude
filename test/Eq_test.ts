import * as fc from "fast-check";
import { assert } from "chai";
import { arbNum } from "./common.js";
import { Eq, eq, ieq, ine, ne } from "../src/index.js";

describe("Eq", () => {
  specify("eq", () => {
    fc.assert(
      fc.property(arbNum(), arbNum(), (x, y) => {
        assert.strictEqual(eq(x, y), x[Eq.eq](y));
      }),
    );
  });

  specify("ne", () => {
    fc.assert(
      fc.property(arbNum(), arbNum(), (x, y) => {
        assert.strictEqual(ne(x, y), !x[Eq.eq](y));
      }),
    );
  });

  specify("ieq", () => {
    fc.assert(
      fc.property(arbNum(), arbNum(), arbNum(), arbNum(), (a, x, b, y) => {
        assert.strictEqual(ieq([a], []), false);
        assert.strictEqual(ieq([], [b]), false);
        assert.strictEqual(ieq([a, x], [b]), false);
        assert.strictEqual(ieq([a], [b, y]), false);
        assert.strictEqual(ieq([a, x], [b, y]), eq(a, b) && eq(x, y));
      }),
    );
  });

  specify("ine", () => {
    fc.assert(
      fc.property(arbNum(), arbNum(), arbNum(), arbNum(), (a, x, b, y) => {
        assert.strictEqual(ine([a], []), true);
        assert.strictEqual(ine([], [b]), true);
        assert.strictEqual(ine([a, x], [b]), true);
        assert.strictEqual(ine([a], [b, y]), true);
        assert.strictEqual(ine([a, x], [b, y]), ne(a, b) || ne(x, y));
      }),
    );
  });
});
