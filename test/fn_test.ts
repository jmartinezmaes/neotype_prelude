import { assert } from "chai";
import * as fc from "fast-check";
import { id, negatePred, wrapCtor } from "../src/fn.js";

describe("fn.js", () => {
    specify("id", () => {
        fc.assert(
            fc.property(
                fc.anything().filter((x) => !Number.isNaN(x)),
                (x) => assert.strictEqual(id(x), x),
            ),
        );
    });

    specify("negatePred", () => {
        function f(x: 1 | 2): x is 2 {
            return x === 2;
        }
        const g = negatePred(f);

        assert.strictEqual(f(1), false);
        assert.strictEqual(f(2), true);
        assert.strictEqual(g(1), true);
        assert.strictEqual(g(2), false);
    });

    specify("wrapCtor", () => {
        class Box<A> {
            constructor(readonly val: A) {}
        }
        const fn = wrapCtor(Box);
        const t0 = fn(1);
        assert.deepEqual(t0, new Box(1));
    });
});
