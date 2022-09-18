import { assert } from "chai";
import * as fc from "fast-check";
import { id, negate } from "../src/fn.js";

describe("Functions", () => {
    specify("id", () => {
        fc.assert(
            fc.property(fc.anything(), (x) => {
                assert.strictEqual(id(x), x);
            }),
        );
    });

    specify("negate", () => {
        function f(x: 1 | 2): x is 2 {
            return x === 2;
        }
        const g = negate(f);

        assert.strictEqual(f(1), false);
        assert.strictEqual(f(2), true);
        assert.strictEqual(g(1), true);
        assert.strictEqual(g(2), false);
    });
});
