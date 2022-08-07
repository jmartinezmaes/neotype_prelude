import * as fc from "fast-check";
import { assert } from "chai";
import { arbNum, arbStr, pair } from "./common.js";
import { cmb } from "../src/cmb.js";
import { cmp, eq, equal, greater, less } from "../src/cmp.js";
import {
    collectMaybe,
    doMaybeAsync,
    doMaybe,
    gatherMaybe,
    guardMaybe,
    just,
    type Maybe,
    maybe,
    nothing,
    reduceMaybe,
    tupledMaybe,
} from "../src/maybe.js";

function mk<A>(t: "N" | "J", x: A): Maybe<A> {
    return t === "N" ? nothing : just(x);
}

function mkA<A>(t: "N" | "J", x: A): Promise<Maybe<A>> {
    return Promise.resolve(t === "N" ? nothing : just(x));
}

const _1 = 1 as const;
const _2 = 2 as const;

describe("Maybe", () => {
    specify("[Eq.eq]", () => {
        fc.assert(
            fc.property(arbNum(), arbNum(), (x, y) => {
                const t0 = eq(nothing, nothing);
                assert.strictEqual(t0, true);

                const t1 = eq(nothing, just(y));
                assert.strictEqual(t1, false);

                const t2 = eq(just(x), nothing);
                assert.strictEqual(t2, false);

                const t3 = eq(just(x), just(y));
                assert.strictEqual(t3, eq(x, y));
            }),
        );
    });

    specify("[Ord.cmp]", () => {
        fc.assert(
            fc.property(arbNum(), arbNum(), (x, y) => {
                const t0 = cmp(nothing, nothing);
                assert.strictEqual(t0, equal);

                const t1 = cmp(nothing, just(y));
                assert.strictEqual(t1, less);

                const t2 = cmp(just(x), nothing);
                assert.strictEqual(t2, greater);

                const t3 = cmp(just(x), just(y));
                assert.strictEqual(t3, cmp(x, y));
            }),
        );
    });

    specify("[Semigroup.cmb]", () => {
        fc.assert(
            fc.property(arbStr(), arbStr(), (x, y) => {
                const t0 = cmb(nothing, nothing);
                assert.deepEqual(t0, nothing);

                const t1 = cmb(nothing, just(y));
                assert.deepEqual(t1, just(y));

                const t2 = cmb(just(x), nothing);
                assert.deepEqual(t2, just(x));

                const t3 = cmb(just(x), just(y));
                assert.deepEqual(t3, just(cmb(x, y)));
            }),
        );
    });

    specify("fold", () => {
        const t0 = mk("N", _1).fold(
            () => _2,
            (x) => pair(x, _2),
        );
        assert.strictEqual(t0, _2);

        const t1 = mk("J", _1).fold(
            () => _2,
            (x) => pair(x, _2),
        );
        assert.deepEqual(t1, [_1, _2]);
    });

    specify("orElse", () => {
        const t0 = mk("N", _1).orElse(mk("N", _2));
        assert.deepEqual(t0, nothing);

        const t1 = mk("N", _1).orElse(mk("J", _2));
        assert.deepEqual(t1, just(_2));

        const t2 = mk("J", _1).orElse(mk("N", _2));
        assert.deepEqual(t2, just(_1));

        const t3 = mk("J", _1).orElse(mk("J", _2));
        assert.deepEqual(t3, just(_1));
    });

    specify("flatMap", () => {
        const t0 = mk("N", _1).flatMap((x) => mk("N", pair(x, _2)));
        assert.deepEqual(t0, nothing);

        const t1 = mk("N", _1).flatMap((x) => mk("J", pair(x, _2)));
        assert.deepEqual(t1, nothing);

        const t2 = mk("J", _1).flatMap((x) => mk("N", pair(x, _2)));
        assert.deepEqual(t2, nothing);

        const t3 = mk("J", _1).flatMap((x) => mk("J", pair(x, _2)));
        assert.deepEqual(t3, just([_1, _2] as const));
    });

    specify("flat", () => {
        const t0 = mk("J", mk("J", _1)).flat();
        assert.deepEqual(t0, just(_1));
    });

    specify("zipWith", () => {
        const t0 = mk("J", _1).zipWith(mk("J", _2), pair);
        assert.deepEqual(t0, just([_1, _2] as const));
    });

    specify("zipFst", () => {
        const t0 = mk("J", _1).zipFst(mk("J", _2));
        assert.deepEqual(t0, just(_1));
    });

    specify("zipSnd", () => {
        const t0 = mk("J", _1).zipSnd(mk("J", _2));
        assert.deepEqual(t0, just(_2));
    });

    specify("map", () => {
        const t1 = mk("J", _1).map((x) => pair(x, _2));
        assert.deepEqual(t1, just([_1, _2] as const));
    });

    specify("mapTo", () => {
        const t0 = mk("J", _1).mapTo(_2);
        assert.deepEqual(t0, just(_2));
    });

    specify("getOrFold", () => {
        const t0 = mk("J", _1).getOrFold(() => _2);
        assert.strictEqual(t0, _1);
    });

    specify("getOrElse", () => {
        const t0 = mk("J", _1).getOrElse(_2);
        assert.strictEqual(t0, _1);
    });

    specify("isNothing", () => {
        const t0 = mk("N", _1).isNothing();
        assert.strictEqual(t0, true);

        const t1 = mk("J", _1).isNothing();
        assert.strictEqual(t1, false);
    });

    specify("isJust", () => {
        const t0 = mk("N", _1).isJust();
        assert.strictEqual(t0, false);

        const t1 = mk("J", _1).isJust();
        assert.strictEqual(t1, true);
    });

    specify("maybe", () => {
        const t0 = maybe<1>(undefined);
        assert.deepEqual(t0, nothing);

        const t1 = maybe<1>(null);
        assert.deepEqual(t1, nothing);

        const t2 = maybe(_1);
        assert.deepEqual(t2, just(_1));
    });

    specify("guardMaybe", () => {
        const f = (x: 1 | 2): x is 1 => x === _1;

        const t0 = guardMaybe(_1 as 1 | 2, f);
        assert.deepEqual(t0, just(_1));

        const t1 = guardMaybe(_2 as 1 | 2, f);
        assert.deepEqual(t1, nothing);
    });

    specify("doMaybe", () => {
        const t0 = doMaybe(function* () {
            const x = yield* mk("N", _1);
            const [y, z] = yield* mk("N", pair(x, _2));
            return [x, y, z] as const;
        });
        assert.deepEqual(t0, nothing);

        const t1 = doMaybe(function* () {
            const x = yield* mk("N", _1);
            const [y, z] = yield* mk("J", pair(x, _2));
            return [x, y, z] as const;
        });
        assert.deepEqual(t1, nothing);

        const t2 = doMaybe(function* () {
            const x = yield* mk("J", _1);
            const [y, z] = yield* mk("N", pair(x, _2));
            return [x, y, z] as const;
        });
        assert.deepEqual(t2, nothing);

        const t3 = doMaybe(function* () {
            const x = yield* mk("J", _1);
            const [y, z] = yield* mk("J", pair(x, _2));
            return [x, y, z] as const;
        });
        assert.deepEqual(t3, just([1, 1, 2] as const));
    });

    specify("collectMaybe", () => {
        const t1 = collectMaybe([mk("J", _1), mk("J", _2)] as const);
        assert.deepEqual(t1, just([_1, _2] as const));
    });

    specify("reduceMaybe", () => {
        const t0 = reduceMaybe(["x", "y"], (xs, x) => mk("J", xs + x), "");
        assert.deepEqual(t0, just("xy"));
    });

    specify("tupledMaybe", () => {
        const t1 = tupledMaybe(mk("J", _1), mk("J", _2));
        assert.deepEqual(t1, just([_1, _2] as const));
    });

    specify("gatherMaybe", () => {
        const t1 = gatherMaybe({ x: mk("J", _1), y: mk("J", _2) });
        assert.deepEqual(t1, just({ x: _1, y: _2 }));
    });

    specify("doMaybeAsync", async () => {
        const t0 = await doMaybeAsync(async function* () {
            const x = yield* await mkA("N", _1);
            const [y, z] = yield* await mkA("N", pair(x, _2));
            return [x, y, z] as const;
        });
        assert.deepEqual(t0, nothing);

        const t1 = await doMaybeAsync(async function* () {
            const x = yield* await mkA("N", _1);
            const [y, z] = yield* await mkA("J", pair(x, _2));
            return [x, y, z] as const;
        });
        assert.deepEqual(t1, nothing);

        const t2 = await doMaybeAsync(async function* () {
            const x = yield* await mkA("J", _1);
            const [y, z] = yield* await mkA("N", pair(x, _2));
            return [x, y, z] as const;
        });
        assert.deepEqual(t2, nothing);

        const t3 = await doMaybeAsync(async function* () {
            const x = yield* await mkA("J", _1);
            const [y, z] = yield* await mkA("J", pair(x, _2));
            return [x, y, z] as const;
        });
        assert.deepEqual(t3, just([_1, _1, _2] as const));

        it("unwraps nested promise-like values on bind and return", async () => {
            const t4 = await doMaybeAsync(async function* () {
                const x = yield* await mkA("J", Promise.resolve(_1));
                const [y, z] = yield* await mkA(
                    "J",
                    Promise.resolve(pair(x, _2)),
                );
                return Promise.resolve([x, y, z] as const);
            });
            assert.deepEqual(t4, just([_1, _1, _2] as const));
        });
    });
});
