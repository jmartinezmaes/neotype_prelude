import { assert } from "chai";
import * as fc from "fast-check";
import { cmb } from "../src/cmb.js";
import { cmp, eq, Ordering } from "../src/cmp.js";
import { Either } from "../src/either.js";
import { Validation } from "../src/validation.js";
import { arb, Str, tuple } from "./common.js";

namespace t {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    export function err<E, A>(x: E, _: A): Validation<E, A> {
        return Validation.err(x);
    }

    export function ok<E, A>(_: E, y: A): Validation<E, A> {
        return Validation.ok(y);
    }
}

const _1 = 1 as const;
const _2 = 2 as const;
const _3 = 3 as const;
const _4 = 4 as const;

const str_a = new Str("a");
const str_c = new Str("c");

describe("validation.js", () => {
    describe("Validation", () => {
        specify("fromEither", () => {
            const t0 = Validation.fromEither(Either.left<1, 2>(_1));
            assert.deepEqual(t0, Validation.err(_1));

            const t1 = Validation.fromEither(Either.right<2, 1>(_2));
            assert.deepEqual(t1, Validation.ok(_2));
        });

        specify("collect", () => {
            const t0 = Validation.collect([
                t.err(str_a, _2),
                t.err(str_c, _4),
            ] as const);
            assert.deepEqual(t0, Validation.err(cmb(str_a, str_c)));

            const t1 = Validation.collect([
                t.err(str_a, _2),
                t.ok(str_c, _4),
            ] as const);
            assert.deepEqual(t1, Validation.err(str_a));

            const t2 = Validation.collect([
                t.ok(str_a, _2),
                t.err(str_c, _4),
            ] as const);
            assert.deepEqual(t2, Validation.err(str_c));

            const t3 = Validation.collect([
                t.ok(str_a, _2),
                t.ok(str_c, _4),
            ] as const);
            assert.deepEqual(t3, Validation.ok([_2, _4] as const));
        });

        specify("gather", () => {
            const t0 = Validation.gather({
                x: t.err(str_a, _2),
                y: t.err(str_c, _4),
            });
            assert.deepEqual(t0, Validation.err(cmb(str_a, str_c)));

            const t1 = Validation.gather({
                x: t.err(str_a, _2),
                y: t.ok(str_c, _4),
            });
            assert.deepEqual(t1, Validation.err(str_a));

            const t2 = Validation.gather({
                x: t.ok(str_a, _2),
                y: t.err(str_c, _4),
            });
            assert.deepEqual(t2, Validation.err(str_c));

            const t3 = Validation.gather({
                x: t.ok(str_a, _2),
                y: t.ok(str_c, _4),
            });
            assert.deepEqual(t3, Validation.ok({ x: _2, y: _4 }));
        });

        specify("lift", () => {
            const t0 = Validation.lift(tuple<2, 4>)(
                t.ok(str_a, _2),
                t.ok(str_c, _4),
            );
            assert.deepEqual(t0, Validation.ok([_2, _4] as const));
        });

        specify("#[Eq.eq]", () => {
            fc.assert(
                fc.property(arb.num(), arb.num(), (x, y) => {
                    const t0 = eq(Validation.err(x), Validation.err(y));
                    assert.strictEqual(t0, eq(x, y));

                    const t1 = eq(Validation.err(x), Validation.ok(y));
                    assert.strictEqual(t1, false);

                    const t2 = eq(Validation.ok(x), Validation.err(y));
                    assert.strictEqual(t2, false);

                    const t3 = eq(Validation.ok(x), Validation.ok(y));
                    assert.strictEqual(t3, eq(x, y));
                }),
            );
        });

        specify("#[Ord.cmp]", () => {
            fc.assert(
                fc.property(arb.num(), arb.num(), (x, y) => {
                    const t0 = cmp(Validation.err(x), Validation.err(y));
                    assert.strictEqual(t0, cmp(x, y));

                    const t1 = cmp(Validation.err(x), Validation.ok(y));
                    assert.strictEqual(t1, Ordering.less);

                    const t2 = cmp(Validation.ok(x), Validation.err(y));
                    assert.strictEqual(t2, Ordering.greater);

                    const t3 = cmp(Validation.ok(x), Validation.ok(y));
                    assert.strictEqual(t3, cmp(x, y));
                }),
            );
        });

        specify("#[Semigroup.cmb]", () => {
            fc.assert(
                fc.property(arb.str(), arb.str(), (x, y) => {
                    const t0 = cmb(Validation.err(x), Validation.err(y));
                    assert.deepEqual(t0, Validation.err(cmb(x, y)));

                    const t1 = cmb(Validation.err(x), Validation.ok(y));
                    assert.deepEqual(t1, Validation.err(x));

                    const t2 = cmb(Validation.ok(x), Validation.err(y));
                    assert.deepEqual(t2, Validation.err(y));

                    const t3 = cmb(Validation.ok(x), Validation.ok(y));
                    assert.deepEqual(t3, Validation.ok(cmb(x, y)));
                }),
            );
        });

        specify("#isErr", () => {
            const t0 = t.err(_1, _2).isErr();
            assert.strictEqual(t0, true);

            const t1 = t.ok(_1, _2).isErr();
            assert.strictEqual(t1, false);
        });

        specify("#isOk", () => {
            const t0 = t.err(_1, _2).isOk();
            assert.strictEqual(t0, false);

            const t1 = t.ok(_1, _2).isOk();
            assert.strictEqual(t1, true);
        });

        specify("#unwrap", () => {
            const t0 = t.err(_1, _2).unwrap(
                (x) => tuple(x, _3),
                (x) => tuple(x, _4),
            );
            assert.deepEqual(t0, [_1, _3]);

            const t1 = t.ok(_1, _2).unwrap(
                (x) => tuple(x, _3),
                (x) => tuple(x, _4),
            );
            assert.deepEqual(t1, [_2, _4]);
        });

        specify("#zipWith", () => {
            const t0 = t.err(str_a, _2).zipWith(t.err(str_c, _4), tuple);
            assert.deepEqual(t0, Validation.err(cmb(str_a, str_c)));

            const t1 = t.err(str_a, _2).zipWith(t.ok(str_c, _4), tuple);
            assert.deepEqual(t1, Validation.err(str_a));

            const t2 = t.ok(str_a, _2).zipWith(t.err(str_c, _4), tuple);
            assert.deepEqual(t2, Validation.err(str_c));

            const t3 = t.ok(str_a, _2).zipWith(t.ok(str_c, _4), tuple);
            assert.deepEqual(t3, Validation.ok([_2, _4] as const));
        });

        specify("#zipFst", () => {
            const t0 = t.ok(str_a, _2).zipFst(t.ok(str_c, _4));
            assert.deepEqual(t0, Validation.ok(_2));
        });

        specify("#zipSnd", () => {
            const t0 = t.ok(str_a, _2).zipSnd(t.ok(str_c, _4));
            assert.deepEqual(t0, Validation.ok(_4));
        });

        specify("#map", () => {
            const t0 = t.err(_1, _2).map((x) => tuple(x, _4));
            assert.deepEqual(t0, Validation.err(_1));

            const t1 = t.ok(_1, _2).map((x) => tuple(x, _4));
            assert.deepEqual(t1, Validation.ok([_2, _4] as const));
        });

        specify("#lmap", () => {
            const t0 = t.err(_1, _2).lmap((x) => tuple(x, _3));
            assert.deepEqual(t0, Validation.err([_1, _3] as const));

            const t1 = t.ok(_1, _2).lmap((x) => tuple(x, _3));
            assert.deepEqual(t1, Validation.ok(_2));
        });

        specify("#bimap", () => {
            const t0 = t.err(_1, _2).bimap(
                (x) => tuple(x, _3),
                (x) => tuple(x, _4),
            );
            assert.deepEqual(t0, Validation.err([_1, _3] as const));

            const t1 = t.ok(_1, _2).bimap(
                (x) => tuple(x, _3),
                (x) => tuple(x, _4),
            );
            assert.deepEqual(t1, Validation.ok([_2, _4] as const));
        });
    });
});
