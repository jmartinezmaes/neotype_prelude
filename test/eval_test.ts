import { assert } from "chai";
import * as fc from "fast-check";
import { cmb } from "../src/cmb.js";
import { Eval } from "../src/eval.js";
import { arb, tuple } from "./common.js";

const _1 = 1 as const;
const _2 = 2 as const;

describe("eval.js", () => {
    describe("Eval", () => {
        specify("once", () => {
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

        specify("always", () => {
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

        specify("go", () => {
            const t0 = Eval.go(function* () {
                const x = yield* Eval.now(_1);
                const [y, z] = yield* Eval.now(tuple(x, _2));
                return [x, y, z] as const;
            });
            assert.deepEqual(t0.run(), [_1, _1, _2]);
        });

        specify("reduce", () => {
            const t0 = Eval.reduce(["x", "y"], (xs, x) => Eval.now(xs + x), "");
            assert.deepEqual(t0.run(), "xy");
        });

        specify("collect", () => {
            const t0 = Eval.collect([Eval.now(_1), Eval.now(_2)] as const);
            assert.deepEqual(t0.run(), [_1, _2]);
        });

        specify("gather", () => {
            const t0 = Eval.gather({ x: Eval.now(_1), y: Eval.now(_2) });
            assert.deepEqual(t0.run(), { x: _1, y: _2 });
        });

        specify("lift", () => {
            const t0 = Eval.lift(tuple)(Eval.now(_1), Eval.now(_2));
            assert.deepEqual(t0.run(), [_1, _2]);
        });

        specify("#[Semigroup.cmb]", () => {
            fc.assert(
                fc.property(arb.str(), arb.str(), (x, y) => {
                    const t0 = cmb(Eval.now(x), Eval.now(y));
                    assert.deepEqual(t0.run(), cmb(x, y));
                }),
            );
        });

        specify("#flatMap", () => {
            const t0 = Eval.now(_1).flatMap((x) => Eval.now(tuple(x, _2)));
            assert.deepEqual(t0.run(), [_1, _2]);
        });

        specify("#zipWith", () => {
            const t0 = Eval.now(_1).zipWith(Eval.now(_2), tuple);
            assert.deepEqual(t0.run(), [_1, _2]);
        });

        specify("#zipFst", () => {
            const t0 = Eval.now(_1).zipFst(Eval.now(_2));
            assert.strictEqual(t0.run(), _1);
        });

        specify("#zipSnd", () => {
            const t0 = Eval.now(_1).zipSnd(Eval.now(_2));
            assert.strictEqual(t0.run(), _2);
        });

        specify("#map", () => {
            const t0 = Eval.now(_1).map((x) => tuple(x, _2));
            assert.deepEqual(t0.run(), [_1, _2]);
        });
    });
});
