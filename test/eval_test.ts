import { assert } from "chai";
import * as fc from "fast-check";
import { cmb } from "../src/cmb.js";
import { Eval } from "../src/eval.js";
import { arbStr, tuple } from "./common.js";

const mk = Eval.now;

const _1 = 1 as const;
const _2 = 2 as const;

describe("Eval", () => {
    specify("Eval.once", () => {
        function f() {
            f.counter++;
            return _1;
        }
        f.counter = 0;

        const t0 = Eval.once(f);
        const t1 = t0.flatMap((x) => t0.map((y) => tuple(x, y)));

        assert.deepEqual(t1.run(), [_1, _1]);
        assert.strictEqual(f.counter, 1);
    });

    specify("Eval.always", () => {
        function f() {
            f.counter++;
            return _1;
        }
        f.counter = 0;

        const t0 = Eval.always(f);
        const t1 = t0.flatMap((x) => t0.map((y) => tuple(x, y)));

        assert.deepEqual(t1.run(), [_1, _1]);
        assert.strictEqual(f.counter, 2);
    });

    specify("Eval.go", () => {
        const t0 = Eval.go(function* () {
            const x = yield* mk(_1);
            const [y, z] = yield* mk(tuple(x, _2));
            return [x, y, z] as const;
        });
        assert.deepEqual(t0.run(), [_1, _1, _2]);
    });

    specify("Eval.reduce", () => {
        const t0 = Eval.reduce(["x", "y"], (xs, x) => mk(xs + x), "");
        assert.deepEqual(t0.run(), "xy");
    });

    specify("Eval.collect", () => {
        const t0 = Eval.collect([mk(_1), mk(_2)] as const);
        assert.deepEqual(t0.run(), [_1, _2]);
    });

    specify("Eval.gather", () => {
        const t0 = Eval.gather({ x: mk(_1), y: mk(_2) });
        assert.deepEqual(t0.run(), { x: _1, y: _2 });
    });

    specify("#[Semigroup.cmb]", () => {
        fc.assert(
            fc.property(arbStr(), arbStr(), (x, y) => {
                const t0 = cmb(mk(x), mk(y));
                assert.deepEqual(t0.run(), cmb(x, y));
            }),
        );
    });

    specify("#flatMap", () => {
        const t0 = mk(_1).flatMap((x) => mk(tuple(x, _2)));
        assert.deepEqual(t0.run(), [_1, _2]);
    });

    specify("#flat", () => {
        const t0 = mk(mk(_1)).flat();
        assert.strictEqual(t0.run(), _1);
    });

    specify("#zipWith", () => {
        const t0 = mk(_1).zipWith(mk(_2), tuple);
        assert.deepEqual(t0.run(), [_1, _2]);
    });

    specify("#zipFst", () => {
        const t0 = mk(_1).zipFst(mk(_2));
        assert.strictEqual(t0.run(), _1);
    });

    specify("#zipSnd", () => {
        const t0 = mk(_1).zipSnd(mk(_2));
        assert.strictEqual(t0.run(), _2);
    });

    specify("#map", () => {
        const t0 = mk(_1).map((x) => tuple(x, _2));
        assert.deepEqual(t0.run(), [_1, _2]);
    });
});
