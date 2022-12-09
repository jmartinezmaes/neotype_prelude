import { assert } from "chai";
import * as fc from "fast-check";
import { cmb } from "../src/cmb.js";
import { cmp, eq, Ordering } from "../src/cmp.js";
import { Maybe } from "../src/maybe.js";
import { arb, tuple } from "./common.js";

namespace t {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    export function nothing<A>(_: A): Maybe<A> {
        return Maybe.nothing;
    }

    export function just<A>(x: A): Maybe<A> {
        return Maybe.just(x);
    }
}

namespace t.async {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    export function nothing<A>(_: A): Promise<Maybe<A>> {
        return Promise.resolve(Maybe.nothing);
    }

    export function just<A>(x: A): Promise<Maybe<A>> {
        return Promise.resolve(Maybe.just(x));
    }
}

const _1 = 1 as const;
const _2 = 2 as const;

describe("maybe.js", () => {
    describe("Maybe", () => {
        specify("fromMissing", () => {
            const t0 = Maybe.fromMissing<1>(undefined);
            assert.deepEqual(t0, Maybe.nothing);

            const t1 = Maybe.fromMissing<1>(null);
            assert.deepEqual(t1, Maybe.nothing);

            const t2 = Maybe.fromMissing(_1);
            assert.deepEqual(t2, Maybe.just(_1));
        });

        specify("wrapFn", () => {
            const t0 = Maybe.wrapFn<[1], 1>(() => undefined)(_1);
            assert.deepEqual(t0, Maybe.nothing);

            const t1 = Maybe.wrapFn<[1], 1>(() => null)(_1);
            assert.deepEqual(t1, Maybe.nothing);

            const t2 = Maybe.wrapFn<[1], 1>((x) => x)(_1);
            assert.deepEqual(t2, Maybe.just(_1));
        });

        specify("wrapPred", () => {
            const f = (x: 1 | 2): x is 1 => x === _1;

            const t0 = Maybe.wrapPred(f)(_1 as 1 | 2);
            assert.deepEqual(t0, Maybe.just(_1));

            const t1 = Maybe.wrapPred(f)(_2 as 1 | 2);
            assert.deepEqual(t1, Maybe.nothing);
        });

        specify("go", () => {
            const t0 = Maybe.go(function* () {
                const x = yield* t.nothing(_1);
                const [y, z] = yield* t.nothing(tuple(x, _2));
                return [x, y, z] as const;
            });
            assert.deepEqual(t0, Maybe.nothing);

            const t1 = Maybe.go(function* () {
                const x = yield* t.nothing(_1);
                const [y, z] = yield* t.just(tuple(x, _2));
                return [x, y, z] as const;
            });
            assert.deepEqual(t1, Maybe.nothing);

            const t2 = Maybe.go(function* () {
                const x = yield* t.just(_1);
                const [y, z] = yield* t.nothing(tuple(x, _2));
                return [x, y, z] as const;
            });
            assert.deepEqual(t2, Maybe.nothing);

            const t3 = Maybe.go(function* () {
                const x = yield* t.just(_1);
                const [y, z] = yield* t.just(tuple(x, _2));
                return [x, y, z] as const;
            });
            assert.deepEqual(t3, Maybe.just([1, 1, 2] as const));
        });

        specify("reduce", () => {
            const t0 = Maybe.reduce(["x", "y"], (xs, x) => t.just(xs + x), "");
            assert.deepEqual(t0, Maybe.just("xy"));
        });

        specify("collect", () => {
            const t0 = Maybe.collect([t.just(_1), t.just(_2)] as const);
            assert.deepEqual(t0, Maybe.just([_1, _2] as const));
        });

        specify("gather", () => {
            const t0 = Maybe.gather({ x: t.just(_1), y: t.just(_2) });
            assert.deepEqual(t0, Maybe.just({ x: _1, y: _2 }));
        });

        specify("lift", () => {
            const t0 = Maybe.lift(tuple)(t.just(_1), t.just(_2));
            assert.deepEqual(t0, Maybe.just([_1, _2] as const));
        });

        specify("goAsync", async () => {
            const t0 = await Maybe.goAsync(async function* () {
                const x = yield* await t.async.nothing(_1);
                const [y, z] = yield* await t.async.nothing(tuple(x, _2));
                return [x, y, z] as const;
            });
            assert.deepEqual(t0, Maybe.nothing);

            const t1 = await Maybe.goAsync(async function* () {
                const x = yield* await t.async.nothing(_1);
                const [y, z] = yield* await t.async.just(tuple(x, _2));
                return [x, y, z] as const;
            });
            assert.deepEqual(t1, Maybe.nothing);

            const t2 = await Maybe.goAsync(async function* () {
                const x = yield* await t.async.just(_1);
                const [y, z] = yield* await t.async.nothing(tuple(x, _2));
                return [x, y, z] as const;
            });
            assert.deepEqual(t2, Maybe.nothing);

            const t3 = await Maybe.goAsync(async function* () {
                const x = yield* await t.async.just(_1);
                const [y, z] = yield* await t.async.just(tuple(x, _2));
                return [x, y, z] as const;
            });
            assert.deepEqual(t3, Maybe.just([_1, _1, _2] as const));

            const t4 = await Maybe.goAsync(async function* () {
                const x = yield* await t.async.just(Promise.resolve(_1));
                const [y, z] = yield* await t.async.just(
                    Promise.resolve(tuple(x, _2)),
                );
                return Promise.resolve([x, y, z] as const);
            });
            assert.deepEqual(t4, Maybe.just([_1, _1, _2] as const));
        });

        specify("#[Eq.eq]", () => {
            fc.assert(
                fc.property(arb.num(), arb.num(), (x, y) => {
                    const t0 = eq(Maybe.nothing, Maybe.nothing);
                    assert.strictEqual(t0, true);

                    const t1 = eq(Maybe.nothing, Maybe.just(y));
                    assert.strictEqual(t1, false);

                    const t2 = eq(Maybe.just(x), Maybe.nothing);
                    assert.strictEqual(t2, false);

                    const t3 = eq(Maybe.just(x), Maybe.just(y));
                    assert.strictEqual(t3, eq(x, y));
                }),
            );
        });

        specify("#[Ord.cmp]", () => {
            fc.assert(
                fc.property(arb.num(), arb.num(), (x, y) => {
                    const t0 = cmp(Maybe.nothing, Maybe.nothing);
                    assert.strictEqual(t0, Ordering.equal);

                    const t1 = cmp(Maybe.nothing, Maybe.just(y));
                    assert.strictEqual(t1, Ordering.less);

                    const t2 = cmp(Maybe.just(x), Maybe.nothing);
                    assert.strictEqual(t2, Ordering.greater);

                    const t3 = cmp(Maybe.just(x), Maybe.just(y));
                    assert.strictEqual(t3, cmp(x, y));
                }),
            );
        });

        specify("#[Semigroup.cmb]", () => {
            fc.assert(
                fc.property(arb.str(), arb.str(), (x, y) => {
                    const t0 = cmb(Maybe.nothing, Maybe.nothing);
                    assert.deepEqual(t0, Maybe.nothing);

                    const t1 = cmb(Maybe.nothing, Maybe.just(y));
                    assert.deepEqual(t1, Maybe.just(y));

                    const t2 = cmb(Maybe.just(x), Maybe.nothing);
                    assert.deepEqual(t2, Maybe.just(x));

                    const t3 = cmb(Maybe.just(x), Maybe.just(y));
                    assert.deepEqual(t3, Maybe.just(cmb(x, y)));
                }),
            );
        });

        specify("#isNothing", () => {
            const t0 = t.nothing(_1).isNothing();
            assert.strictEqual(t0, true);

            const t1 = t.just(_1).isNothing();
            assert.strictEqual(t1, false);
        });

        specify("#isJust", () => {
            const t0 = t.nothing(_1).isJust();
            assert.strictEqual(t0, false);

            const t1 = t.just(_1).isJust();
            assert.strictEqual(t1, true);
        });

        specify("#unwrap", () => {
            const t0 = t.nothing(_1).unwrap(
                () => _2,
                (x) => tuple(x, _2),
            );
            assert.strictEqual(t0, _2);

            const t1 = t.just(_1).unwrap(
                () => _2,
                (x) => tuple(x, _2),
            );
            assert.deepEqual(t1, [_1, _2]);
        });

        specify("#getOr", () => {
            const t0 = t.just(_1).getOr(_2);
            assert.strictEqual(t0, _1);
        });

        specify("#orElse", () => {
            const t0 = t.nothing(_1).orElse(t.nothing(_2));
            assert.deepEqual(t0, Maybe.nothing);

            const t1 = t.nothing(_1).orElse(t.just(_2));
            assert.deepEqual(t1, Maybe.just(_2));

            const t2 = t.just(_1).orElse(t.nothing(_2));
            assert.deepEqual(t2, Maybe.just(_1));

            const t3 = t.just(_1).orElse(t.just(_2));
            assert.deepEqual(t3, Maybe.just(_1));
        });

        specify("#flatMap", () => {
            const t0 = t.nothing(_1).flatMap((x) => t.nothing(tuple(x, _2)));
            assert.deepEqual(t0, Maybe.nothing);

            const t1 = t.nothing(_1).flatMap((x) => t.just(tuple(x, _2)));
            assert.deepEqual(t1, Maybe.nothing);

            const t2 = t.just(_1).flatMap((x) => t.nothing(tuple(x, _2)));
            assert.deepEqual(t2, Maybe.nothing);

            const t3 = t.just(_1).flatMap((x) => t.just(tuple(x, _2)));
            assert.deepEqual(t3, Maybe.just([_1, _2] as const));
        });

        specify("#zipWith", () => {
            const t0 = t.just(_1).zipWith(t.just(_2), tuple);
            assert.deepEqual(t0, Maybe.just([_1, _2] as const));
        });

        specify("#zipFst", () => {
            const t0 = t.just(_1).zipFst(t.just(_2));
            assert.deepEqual(t0, Maybe.just(_1));
        });

        specify("#zipSnd", () => {
            const t0 = t.just(_1).zipSnd(t.just(_2));
            assert.deepEqual(t0, Maybe.just(_2));
        });

        specify("#map", () => {
            const t1 = t.just(_1).map((x) => tuple(x, _2));
            assert.deepEqual(t1, Maybe.just([_1, _2] as const));
        });
    });
});
