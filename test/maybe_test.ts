import { assert } from "chai";
import * as fc from "fast-check";
import { cmb } from "../src/cmb.js";
import { cmp, eq, Ordering } from "../src/cmp.js";
import { Maybe } from "../src/maybe.js";
import { arbNum, arbStr, tuple } from "./common.js";

function mk<A>(t: "N" | "J", x: A): Maybe<A> {
    return t === "N" ? Maybe.nothing : Maybe.just(x);
}

function mkA<A>(t: "N" | "J", x: A): Promise<Maybe<A>> {
    return Promise.resolve(undefined).then(() => {
        return t === "N" ? Maybe.nothing : Maybe.just(x);
    });
}

const _1 = 1 as const;
const _2 = 2 as const;

describe("Maybe", () => {
    specify("Maybe.fromMissing", () => {
        const t0 = Maybe.fromMissing<1>(undefined);
        assert.deepEqual(t0, Maybe.nothing);

        const t1 = Maybe.fromMissing<1>(null);
        assert.deepEqual(t1, Maybe.nothing);

        const t2 = Maybe.fromMissing(_1);
        assert.deepEqual(t2, Maybe.just(_1));
    });

    specify("Maybe.guard", () => {
        const f = (x: 1 | 2): x is 1 => x === _1;

        const t0 = Maybe.guard(_1 as 1 | 2, f);
        assert.deepEqual(t0, Maybe.just(_1));

        const t1 = Maybe.guard(_2 as 1 | 2, f);
        assert.deepEqual(t1, Maybe.nothing);
    });

    specify("Maybe.go", () => {
        const t0 = Maybe.go(function* () {
            const x = yield* mk("N", _1);
            const [y, z] = yield* mk("N", tuple(x, _2));
            return [x, y, z] as const;
        });
        assert.deepEqual(t0, Maybe.nothing);

        const t1 = Maybe.go(function* () {
            const x = yield* mk("N", _1);
            const [y, z] = yield* mk("J", tuple(x, _2));
            return [x, y, z] as const;
        });
        assert.deepEqual(t1, Maybe.nothing);

        const t2 = Maybe.go(function* () {
            const x = yield* mk("J", _1);
            const [y, z] = yield* mk("N", tuple(x, _2));
            return [x, y, z] as const;
        });
        assert.deepEqual(t2, Maybe.nothing);

        const t3 = Maybe.go(function* () {
            const x = yield* mk("J", _1);
            const [y, z] = yield* mk("J", tuple(x, _2));
            return [x, y, z] as const;
        });
        assert.deepEqual(t3, Maybe.just([1, 1, 2] as const));
    });

    specify("Maybe.reduce", () => {
        const t0 = Maybe.reduce(["x", "y"], (xs, x) => mk("J", xs + x), "");
        assert.deepEqual(t0, Maybe.just("xy"));
    });

    specify("Maybe.collect", () => {
        const t1 = Maybe.collect([mk("J", _1), mk("J", _2)] as const);
        assert.deepEqual(t1, Maybe.just([_1, _2] as const));
    });

    specify("Maybe.gather", () => {
        const t1 = Maybe.gather({ x: mk("J", _1), y: mk("J", _2) });
        assert.deepEqual(t1, Maybe.just({ x: _1, y: _2 }));
    });

    specify("Maybe.goAsync", async () => {
        const t0 = await Maybe.goAsync(async function* () {
            const x = yield* await mkA("N", _1);
            const [y, z] = yield* await mkA("N", tuple(x, _2));
            return [x, y, z] as const;
        });
        assert.deepEqual(t0, Maybe.nothing);

        const t1 = await Maybe.goAsync(async function* () {
            const x = yield* await mkA("N", _1);
            const [y, z] = yield* await mkA("J", tuple(x, _2));
            return [x, y, z] as const;
        });
        assert.deepEqual(t1, Maybe.nothing);

        const t2 = await Maybe.goAsync(async function* () {
            const x = yield* await mkA("J", _1);
            const [y, z] = yield* await mkA("N", tuple(x, _2));
            return [x, y, z] as const;
        });
        assert.deepEqual(t2, Maybe.nothing);

        const t3 = await Maybe.goAsync(async function* () {
            const x = yield* await mkA("J", _1);
            const [y, z] = yield* await mkA("J", tuple(x, _2));
            return [x, y, z] as const;
        });
        assert.deepEqual(t3, Maybe.just([_1, _1, _2] as const));

        it("unwraps nested promise-like values on bind and return", async () => {
            const t4 = await Maybe.goAsync(async function* () {
                const x = yield* await mkA("J", Promise.resolve(_1));
                const [y, z] = yield* await mkA(
                    "J",
                    Promise.resolve(tuple(x, _2)),
                );
                return Promise.resolve([x, y, z] as const);
            });
            assert.deepEqual(t4, Maybe.just([_1, _1, _2] as const));
        });
    });

    specify("#[Eq.eq]", () => {
        fc.assert(
            fc.property(arbNum(), arbNum(), (x, y) => {
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
            fc.property(arbNum(), arbNum(), (x, y) => {
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
            fc.property(arbStr(), arbStr(), (x, y) => {
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
        const t0 = mk("N", _1).isNothing();
        assert.strictEqual(t0, true);

        const t1 = mk("J", _1).isNothing();
        assert.strictEqual(t1, false);
    });

    specify("#isJust", () => {
        const t0 = mk("N", _1).isJust();
        assert.strictEqual(t0, false);

        const t1 = mk("J", _1).isJust();
        assert.strictEqual(t1, true);
    });

    specify("#unwrap", () => {
        const t0 = mk("N", _1).unwrap(
            () => _2,
            (x) => tuple(x, _2),
        );
        assert.strictEqual(t0, _2);

        const t1 = mk("J", _1).unwrap(
            () => _2,
            (x) => tuple(x, _2),
        );
        assert.deepEqual(t1, [_1, _2]);
    });

    specify("#getOrFallback", () => {
        const t0 = mk("J", _1).getOrFallback(_2);
        assert.strictEqual(t0, _1);
    });

    specify("#orElse", () => {
        const t0 = mk("N", _1).orElse(mk("N", _2));
        assert.deepEqual(t0, Maybe.nothing);

        const t1 = mk("N", _1).orElse(mk("J", _2));
        assert.deepEqual(t1, Maybe.just(_2));

        const t2 = mk("J", _1).orElse(mk("N", _2));
        assert.deepEqual(t2, Maybe.just(_1));

        const t3 = mk("J", _1).orElse(mk("J", _2));
        assert.deepEqual(t3, Maybe.just(_1));
    });

    specify("#flatMap", () => {
        const t0 = mk("N", _1).flatMap((x) => mk("N", tuple(x, _2)));
        assert.deepEqual(t0, Maybe.nothing);

        const t1 = mk("N", _1).flatMap((x) => mk("J", tuple(x, _2)));
        assert.deepEqual(t1, Maybe.nothing);

        const t2 = mk("J", _1).flatMap((x) => mk("N", tuple(x, _2)));
        assert.deepEqual(t2, Maybe.nothing);

        const t3 = mk("J", _1).flatMap((x) => mk("J", tuple(x, _2)));
        assert.deepEqual(t3, Maybe.just([_1, _2] as const));
    });

    specify("#flat", () => {
        const t0 = mk("J", mk("J", _1)).flat();
        assert.deepEqual(t0, Maybe.just(_1));
    });

    specify("#zipWith", () => {
        const t0 = mk("J", _1).zipWith(mk("J", _2), tuple);
        assert.deepEqual(t0, Maybe.just([_1, _2] as const));
    });

    specify("#zipFst", () => {
        const t0 = mk("J", _1).zipFst(mk("J", _2));
        assert.deepEqual(t0, Maybe.just(_1));
    });

    specify("#zipSnd", () => {
        const t0 = mk("J", _1).zipSnd(mk("J", _2));
        assert.deepEqual(t0, Maybe.just(_2));
    });

    specify("#map", () => {
        const t1 = mk("J", _1).map((x) => tuple(x, _2));
        assert.deepEqual(t1, Maybe.just([_1, _2] as const));
    });
});
