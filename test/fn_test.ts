import * as fc from "fast-check";
import { assert } from "chai";
import { fst, id, negate, snd } from "../src/fn.js";

describe("Functions", () => {
    specify("id", () => {
        fc.assert(
            fc.property(fc.anything(), (x) => {
                assert.strictEqual(id(x), x);
            }),
        );
    });

    specify("fst", () => {
        fc.assert(
            fc.property(fc.anything(), fc.anything(), (x, y) => {
                assert.strictEqual(fst([x, y]), x);
            }),
        );
    });

    specify("snd", () => {
        fc.assert(
            fc.property(fc.anything(), fc.anything(), (x, y) => {
                assert.strictEqual(snd([x, y]), y);
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
