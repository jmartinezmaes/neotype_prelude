import { assert } from "chai";
import * as fc from "fast-check";
import { cmb } from "../src/cmb.js";
import { cmp, eq, Ordering } from "../src/cmp.js";
import { Either } from "../src/either.js";
import { Validation } from "../src/validation.js";
import { arb, tuple } from "./common.js";

namespace t {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    export function left<A, B>(x: A, _: B): Either<A, B> {
        return Either.left(x);
    }

    export function right<A, B>(_: A, y: B): Either<A, B> {
        return Either.right(y);
    }
}

namespace t.async {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    export function left<A, B>(x: A, _: B): Promise<Either<A, B>> {
        return Promise.resolve(Either.left(x));
    }

    export function right<A, B>(_: A, y: B): Promise<Either<A, B>> {
        return Promise.resolve(Either.right(y));
    }
}

const _1 = 1 as const;
const _2 = 2 as const;
const _3 = 3 as const;
const _4 = 4 as const;

describe("either.js", () => {
    describe("Either", () => {
        specify("fromValidation", () => {
            const t0 = Either.fromValidation(Validation.err<1, 2>(_1));
            assert.deepEqual(t0, Either.left(_1));

            const t1 = Either.fromValidation(Validation.ok<2, 1>(_2));
            assert.deepEqual(t1, Either.right(_2));
        });

        specify("go", () => {
            const t0 = Either.go(function* () {
                const x = yield* t.left(_1, _2);
                const [y, z] = yield* t.left(_3, tuple(x, _4));
                return [x, y, z] as const;
            });
            assert.deepEqual(t0, Either.left(_1));

            const t1 = Either.go(function* () {
                const x = yield* t.left(_1, _2);
                const [y, z] = yield* t.right(_3, tuple(x, _4));
                return [x, y, z] as const;
            });
            assert.deepEqual(t1, Either.left(_1));

            const t2 = Either.go(function* () {
                const x = yield* t.right(_1, _2);
                const [y, z] = yield* t.left(_3, tuple(x, _4));
                return [x, y, z] as const;
            });
            assert.deepEqual(t2, Either.left(_3));

            const t3 = Either.go(function* () {
                const x = yield* t.right(_1, _2);
                const [y, z] = yield* t.right(_3, tuple(x, _4));
                return [x, y, z] as const;
            });
            assert.deepEqual(t3, Either.right([_2, _2, _4] as const));
        });

        specify("reduce", () => {
            const t0 = Either.reduce(
                ["x", "y"],
                (xs, x) => t.right(_1, xs + x),
                "",
            );
            assert.deepEqual(t0, Either.right("xy"));
        });

        specify("collect", () => {
            const t0 = Either.collect([
                t.right(_1, _2),
                t.right(_3, _4),
            ] as const);
            assert.deepEqual(t0, Either.right([_2, _4] as const));
        });

        specify("gather", () => {
            const t0 = Either.gather({
                x: t.right(_1, _2),
                y: t.right(_3, _4),
            });
            assert.deepEqual(t0, Either.right({ x: _2, y: _4 }));
        });

        specify("lift", () => {
            const t0 = Either.lift(tuple<2, 4>)(
                t.right(_1, _2),
                t.right(_3, _4),
            );
            assert.deepEqual(t0, Either.right([_2, _4] as const));
        });

        specify("goAsync", async () => {
            const t0 = await Either.goAsync(async function* () {
                const x = yield* await t.async.left(_1, _2);
                const [y, z] = yield* await t.async.left(_3, tuple(x, _4));
                return [x, y, z] as const;
            });
            assert.deepEqual(t0, Either.left(_1));

            const t1 = await Either.goAsync(async function* () {
                const x = yield* await t.async.left(_1, _2);
                const [y, z] = yield* await t.async.right(_3, tuple(x, _4));
                return [x, y, z] as const;
            });
            assert.deepEqual(t1, Either.left(_1));

            const t2 = await Either.goAsync(async function* () {
                const x = yield* await t.async.right(_1, _2);
                const [y, z] = yield* await t.async.left(_3, tuple(x, _4));
                return [x, y, z] as const;
            });
            assert.deepEqual(t2, Either.left(_3));

            const t3 = await Either.goAsync(async function* () {
                const x = yield* await t.async.right(_1, _2);
                const [y, z] = yield* await t.async.right(_3, tuple(x, _4));
                return [x, y, z] as const;
            });
            assert.deepEqual(t3, Either.right([_2, _2, _4] as const));

            const t4 = await Either.goAsync(async function* () {
                const x = yield* await t.async.right(_1, Promise.resolve(_2));
                const [y, z] = yield* await t.async.right(
                    _3,
                    Promise.resolve(tuple(x, _4)),
                );
                return Promise.resolve([x, y, z] as const);
            });
            assert.deepEqual(t4, Either.right([_2, _2, _4] as const));
        });

        specify("#[Eq.eq]", () => {
            fc.assert(
                fc.property(arb.num(), arb.num(), (x, y) => {
                    const t0 = eq(Either.left(x), Either.left(y));
                    assert.strictEqual(t0, eq(x, y));

                    const t1 = eq(Either.left(x), Either.right(y));
                    assert.strictEqual(t1, false);

                    const t2 = eq(Either.right(x), Either.left(y));
                    assert.strictEqual(t2, false);

                    const t3 = eq(Either.right(x), Either.right(y));
                    assert.strictEqual(t3, eq(x, y));
                }),
            );
        });

        specify("#[Ord.cmp]", () => {
            fc.assert(
                fc.property(arb.num(), arb.num(), (x, y) => {
                    const t0 = cmp(Either.left(x), Either.left(y));
                    assert.strictEqual(t0, cmp(x, y));

                    const t1 = cmp(Either.left(x), Either.right(y));
                    assert.strictEqual(t1, Ordering.less);

                    const t2 = cmp(Either.right(x), Either.left(y));
                    assert.strictEqual(t2, Ordering.greater);

                    const t3 = cmp(Either.right(x), Either.right(y));
                    assert.strictEqual(t3, cmp(x, y));
                }),
            );
        });

        specify("#[Semigroup.cmb]", () => {
            fc.assert(
                fc.property(arb.str(), arb.str(), (x, y) => {
                    const t0 = cmb(Either.left(x), Either.left(y));
                    assert.deepEqual(t0, Either.left(x));

                    const t1 = cmb(Either.left(x), Either.right(y));
                    assert.deepEqual(t1, Either.left(x));

                    const t2 = cmb(Either.right(x), Either.left(y));
                    assert.deepEqual(t2, Either.left(y));

                    const t3 = cmb(Either.right(x), Either.right(y));
                    assert.deepEqual(t3, Either.right(cmb(x, y)));
                }),
            );
        });

        specify("#isLeft", () => {
            const t0 = t.left(_1, _2).isLeft();
            assert.strictEqual(t0, true);

            const t1 = t.right(_1, _2).isLeft();
            assert.strictEqual(t1, false);
        });

        specify("#isRight", () => {
            const t0 = t.left(_1, _2).isRight();
            assert.strictEqual(t0, false);

            const t1 = t.right(_1, _2).isRight();
            assert.strictEqual(t1, true);
        });

        specify("#unwrap", () => {
            const t0 = t.left(_1, _2).unwrap(
                (x) => tuple(x, _3),
                (x) => tuple(x, _4),
            );
            assert.deepEqual(t0, [_1, _3]);

            const t1 = t.right(_1, _2).unwrap(
                (x) => tuple(x, _3),
                (x) => tuple(x, _4),
            );
            assert.deepEqual(t1, [_2, _4]);
        });

        specify("#recover", () => {
            const t0 = t.left(_1, _2).recover((x) => t.left(tuple(x, _3), _4));
            assert.deepEqual(t0, Either.left([_1, _3] as const));

            const t1 = t.left(_1, _2).recover((x) => t.right(tuple(x, _3), _4));
            assert.deepEqual(t1, Either.right(_4));

            const t2 = t.right(_1, _2).recover((x) => t.left(tuple(x, _3), _4));
            assert.deepEqual(t2, Either.right(_2));

            const t3 = t
                .right(_1, _2)
                .recover((x) => t.right(tuple(x, _3), _4));
            assert.deepEqual(t3, Either.right(_2));
        });

        specify("#orElse", () => {
            const t0 = t.left(_1, _2).orElse(t.left(_3, _4));
            assert.deepEqual(t0, Either.left(_3));
        });

        specify("#flatMap", () => {
            const t0 = t.left(_1, _2).flatMap((x) => t.left(_3, tuple(x, _4)));
            assert.deepEqual(t0, Either.left(_1));

            const t1 = t.left(_1, _2).flatMap((x) => t.right(_3, tuple(x, _4)));
            assert.deepEqual(t1, Either.left(_1));

            const t2 = t.right(_1, _2).flatMap((x) => t.left(_3, tuple(x, _4)));
            assert.deepEqual(t2, Either.left(_3));

            const t3 = t
                .right(_1, _2)
                .flatMap((x) => t.right(_3, tuple(x, _4)));
            assert.deepEqual(t3, Either.right([_2, _4] as const));
        });

        specify("#zipWith", () => {
            const t0 = t.right(_1, _2).zipWith(t.right(_3, _4), tuple);
            assert.deepEqual(t0, Either.right([_2, _4] as const));
        });

        specify("#zipFst", () => {
            const t0 = t.right(_1, _2).zipFst(t.right(_3, _4));
            assert.deepEqual(t0, Either.right(_2));
        });

        specify("#zipSnd", () => {
            const t0 = t.right(_1, _2).zipSnd(t.right(_3, _4));
            assert.deepEqual(t0, Either.right(_4));
        });

        specify("#map", () => {
            const t0 = t.right(_1, _2).map((x) => tuple(x, _4));
            assert.deepEqual(t0, Either.right([_2, _4] as const));
        });

        specify("#lmap", () => {
            const t0 = t.left(_1, _2).lmap((x) => tuple(x, _3));
            assert.deepEqual(t0, Either.left([_1, _3] as const));
        });

        specify("#bimap", () => {
            const t1 = t.left(_1, _2).bimap(
                (x) => tuple(x, _3),
                (x) => tuple(x, _4),
            );
            assert.deepEqual(t1, Either.left([_1, _3] as const));

            const t0 = t.right(_1, _2).bimap(
                (x) => tuple(x, _3),
                (x) => tuple(x, _4),
            );
            assert.deepEqual(t0, Either.right([_2, _4] as const));
        });
    });
});
