import { assert } from "chai";
import * as fc from "fast-check";
import { cmb } from "../src/cmb.js";
import { cmp, eq, Ordering } from "../src/cmp.js";
import { Either } from "../src/either.js";
import { Validated } from "../src/validated.js";
import { arbNum, arbStr, pair } from "./common.js";

function mk<A, B>(t: "L" | "R", x: A, y: B): Either<A, B> {
    return t === "L" ? Either.left(x) : Either.right(y);
}

function mkA<A, B>(t: "L" | "R", x: A, y: B): Promise<Either<A, B>> {
    return Promise.resolve(t === "L" ? Either.left(x) : Either.right(y));
}

const _1 = 1 as const;
const _2 = 2 as const;
const _3 = 3 as const;
const _4 = 4 as const;

describe("Either", () => {
    specify("Either.guard", () => {
        const f = (x: 2 | 4): x is 2 => x === _2;

        const t0 = Either.guard(_2 as 2 | 4, f);
        assert.deepEqual(t0, Either.right(_2));

        const t1 = Either.guard(_4 as 2 | 4, f);
        assert.deepEqual(t1, Either.left(_4));
    });

    specify("Either.fromValidated", () => {
        const t0 = Either.fromValidated(Validated.dispute<1, 2>(_1));
        assert.deepEqual(t0, Either.left(_1));

        const t1 = Either.fromValidated(Validated.accept<2, 1>(_2));
        assert.deepEqual(t1, Either.right(_2));
    });

    specify("Either.go", () => {
        const t0 = Either.go(function* () {
            const x = yield* mk("L", _1, _2);
            const [y, z] = yield* mk("L", _3, pair(x, _4));
            return [x, y, z] as const;
        });
        assert.deepEqual(t0, Either.left(_1));

        const t1 = Either.go(function* () {
            const x = yield* mk("L", _1, _2);
            const [y, z] = yield* mk("R", _3, pair(x, _4));
            return [x, y, z] as const;
        });
        assert.deepEqual(t1, Either.left(_1));

        const t2 = Either.go(function* () {
            const x = yield* mk("R", _1, _2);
            const [y, z] = yield* mk("L", _3, pair(x, _4));
            return [x, y, z] as const;
        });
        assert.deepEqual(t2, Either.left(_3));

        const t3 = Either.go(function* () {
            const x = yield* mk("R", _1, _2);
            const [y, z] = yield* mk("R", _3, pair(x, _4));
            return [x, y, z] as const;
        });
        assert.deepEqual(t3, Either.right([_2, _2, _4] as const));
    });

    specify("Either.reduce", () => {
        const t0 = Either.reduce(
            ["x", "y"],
            (xs, x) => mk("R", _1, xs + x),
            "",
        );
        assert.deepEqual(t0, Either.right("xy"));
    });

    specify("Either.collect", () => {
        const t0 = Either.collect([mk("R", _1, _2), mk("R", _3, _4)] as const);
        assert.deepEqual(t0, Either.right([_2, _4] as const));
    });

    specify("Either.tupled", () => {
        const t0 = Either.tupled(mk("R", _1, _2), mk("R", _3, _4));
        assert.deepEqual(t0, Either.right([_2, _4] as const));
    });

    specify("Either.gather", () => {
        const t0 = Either.gather({ x: mk("R", _1, _2), y: mk("R", _3, _4) });
        assert.deepEqual(t0, Either.right({ x: _2, y: _4 }));
    });

    specify("Either.goAsync", async () => {
        const t0 = await Either.goAsync(async function* () {
            const x = yield* await mkA("L", _1, _2);
            const [y, z] = yield* await mkA("L", _3, pair(x, _4));
            return [x, y, z] as const;
        });
        assert.deepEqual(t0, Either.left(_1));

        const t1 = await Either.goAsync(async function* () {
            const x = yield* await mkA("L", _1, _2);
            const [y, z] = yield* await mkA("R", _3, pair(x, _4));
            return [x, y, z] as const;
        });
        assert.deepEqual(t1, Either.left(_1));

        const t2 = await Either.goAsync(async function* () {
            const x = yield* await mkA("R", _1, _2);
            const [y, z] = yield* await mkA("L", _3, pair(x, _4));
            return [x, y, z] as const;
        });
        assert.deepEqual(t2, Either.left(_3));

        const t3 = await Either.goAsync(async function* () {
            const x = yield* await mkA("R", _1, _2);
            const [y, z] = yield* await mkA("R", _3, pair(x, _4));
            return [x, y, z] as const;
        });
        assert.deepEqual(t3, Either.right([_2, _2, _4] as const));

        it("unwraps nested promise-like values on bind and return", async () => {
            const t4 = await Either.goAsync(async function* () {
                const x = yield* await mkA("R", _1, Promise.resolve(_2));
                const [y, z] = yield* await mkA(
                    "R",
                    _3,
                    Promise.resolve(pair(x, _4)),
                );
                return Promise.resolve([x, y, z] as const);
            });
            assert.deepEqual(t4, Either.right([_2, _2, _4] as const));
        });
    });

    specify("#[Eq.eq]", () => {
        fc.assert(
            fc.property(arbNum(), arbNum(), (x, y) => {
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
            fc.property(arbNum(), arbNum(), (x, y) => {
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
            fc.property(arbStr(), arbStr(), (x, y) => {
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
        const t0 = mk("L", _1, _2).isLeft();
        assert.strictEqual(t0, true);

        const t1 = mk("R", _1, _2).isLeft();
        assert.strictEqual(t1, false);
    });

    specify("#isRight", () => {
        const t0 = mk("L", _1, _2).isRight();
        assert.strictEqual(t0, false);

        const t1 = mk("R", _1, _2).isRight();
        assert.strictEqual(t1, true);
    });

    specify("#fold", () => {
        const t0 = mk("L", _1, _2).fold(
            (x) => pair(x, _3),
            (x) => pair(x, _4),
        );
        assert.deepEqual(t0, [_1, _3]);

        const t1 = mk("R", _1, _2).fold(
            (x) => pair(x, _3),
            (x) => pair(x, _4),
        );
        assert.deepEqual(t1, [_2, _4]);
    });

    specify("#leftOrFold", () => {
        const t0 = mk("L", _1, _2).leftOrFold((x) => pair(x, _4));
        assert.strictEqual(t0, _1);

        const t1 = mk("R", _1, _2).leftOrFold((x) => pair(x, _4));
        assert.deepEqual(t1, [_2, _4]);
    });

    specify("#rightOrFold", () => {
        const t0 = mk("L", _1, _2).rightOrFold((x) => pair(x, _3));
        assert.deepEqual(t0, [_1, _3]);

        const t1 = mk("R", _1, _2).rightOrFold((x) => pair(x, _3));
        assert.strictEqual(t1, _2);
    });

    specify("#bindLeft", () => {
        const t0 = mk("L", _1, _2).recover((x) => mk("L", pair(x, _3), _4));
        assert.deepEqual(t0, Either.left([_1, _3] as const));

        const t1 = mk("L", _1, _2).recover((x) => mk("R", pair(x, _3), _4));
        assert.deepEqual(t1, Either.right(_4));

        const t2 = mk("R", _1, _2).recover((x) => mk("L", pair(x, _3), _4));
        assert.deepEqual(t2, Either.right(_2));

        const t3 = mk("R", _1, _2).recover((x) => mk("R", pair(x, _3), _4));
        assert.deepEqual(t3, Either.right(_2));
    });

    specify("#orElse", () => {
        const t0 = mk("L", _1, _2).orElse(mk("L", _3, _4));
        assert.deepEqual(t0, Either.left(_3));
    });

    specify("#flatMap", () => {
        const t0 = mk("L", _1, _2).flatMap((x) => mk("L", _3, pair(x, _4)));
        assert.deepEqual(t0, Either.left(_1));

        const t1 = mk("L", _1, _2).flatMap((x) => mk("R", _3, pair(x, _4)));
        assert.deepEqual(t1, Either.left(_1));

        const t2 = mk("R", _1, _2).flatMap((x) => mk("L", _3, pair(x, _4)));
        assert.deepEqual(t2, Either.left(_3));

        const t3 = mk("R", _1, _2).flatMap((x) => mk("R", _3, pair(x, _4)));
        assert.deepEqual(t3, Either.right([_2, _4] as const));
    });

    specify("#flat", () => {
        const t0 = mk("R", _1, mk("R", _3, _4)).flat();
        assert.deepEqual(t0, Either.right(_4));
    });

    specify("#zipWith", () => {
        const t0 = mk("R", _1, _2).zipWith(mk("R", _3, _4), pair);
        assert.deepEqual(t0, Either.right([_2, _4] as const));
    });

    specify("#zipFst", () => {
        const t0 = mk("R", _1, _2).zipFst(mk("R", _3, _4));
        assert.deepEqual(t0, Either.right(_2));
    });

    specify("#zipSnd", () => {
        const t0 = mk("R", _1, _2).zipSnd(mk("R", _3, _4));
        assert.deepEqual(t0, Either.right(_4));
    });

    specify("#map", () => {
        const t0 = mk("R", _1, _2).map((x) => pair(x, _4));
        assert.deepEqual(t0, Either.right([_2, _4] as const));
    });

    specify("#mapTo", () => {
        const t0 = mk("R", _1, _2).mapTo(_4);
        assert.deepEqual(t0, Either.right(_4));
    });

    specify("#mapLeft", () => {
        const t0 = mk("L", _1, _2).mapLeft((x) => pair(x, _3));
        assert.deepEqual(t0, Either.left([_1, _3] as const));
    });

    specify("#bimap", () => {
        const t1 = mk("L", _1, _2).bimap(
            (x) => pair(x, _3),
            (x) => pair(x, _4),
        );
        assert.deepEqual(t1, Either.left([_1, _3] as const));

        const t0 = mk("R", _1, _2).bimap(
            (x) => pair(x, _3),
            (x) => pair(x, _4),
        );
        assert.deepEqual(t0, Either.right([_2, _4] as const));
    });
});
