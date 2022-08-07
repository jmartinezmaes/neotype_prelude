import * as fc from "fast-check";
import { assert } from "chai";
import { arbNum, arbStr, pair, Str } from "./common.js";
import { cmb } from "../src/cmb.js";
import { cmp, eq, Ordering } from "../src/cmp.js";
import { These } from "../src/these.js";

function mk<A, B>(t: "F" | "S" | "B", x: A, y: B): These<A, B> {
    return t === "F"
        ? These.first(x)
        : t === "S"
        ? These.second(y)
        : These.both(x, y);
}

function mkA<A, B>(t: "F" | "S" | "B", x: A, y: B): Promise<These<A, B>> {
    return Promise.resolve(
        t === "F"
            ? These.first(x)
            : t === "S"
            ? These.second(y)
            : These.both(x, y),
    );
}

const _1 = 1 as const;
const _2 = 2 as const;
const _3 = 3 as const;
const _4 = 4 as const;

const sa = new Str("a");
const sc = new Str("c");

describe("These", () => {
    specify("These.go", () => {
        const t0 = These.go(function* () {
            const x = yield* mk("F", sa, _2);
            const [y, z] = yield* mk("F", sc, pair(x, _4));
            return [x, y, z] as const;
        });
        assert.deepEqual(t0, These.first(sa));

        const t1 = These.go(function* () {
            const x = yield* mk("F", sa, _2);
            const [y, z] = yield* mk("S", sc, pair(x, _4));
            return [x, y, z] as const;
        });
        assert.deepEqual(t1, These.first(sa));

        const t2 = These.go(function* () {
            const x = yield* mk("F", sa, _2);
            const [y, z] = yield* mk("B", sc, pair(x, _4));
            return [x, y, z] as const;
        });
        assert.deepEqual(t2, These.first(sa));

        const t3 = These.go(function* () {
            const x = yield* mk("S", sa, _2);
            const [y, z] = yield* mk("F", sc, pair(x, _4));
            return [x, y, z] as const;
        });
        assert.deepEqual(t3, These.first(sc));

        const t4 = These.go(function* () {
            const x = yield* mk("S", sa, _2);
            const [y, z] = yield* mk("S", sc, pair(x, _4));
            return [x, y, z] as const;
        });
        assert.deepEqual(t4, These.second([_2, _2, _4] as const));

        const t5 = These.go(function* () {
            const x = yield* mk("S", sa, _2);
            const [y, z] = yield* mk("B", sc, pair(x, _4));
            return [x, y, z] as const;
        });
        assert.deepEqual(t5, These.both(sc, [_2, _2, _4] as const));

        const t6 = These.go(function* () {
            const x = yield* mk("B", sa, _2);
            const [y, z] = yield* mk("F", sc, pair(x, _4));
            return [x, y, z] as const;
        });
        assert.deepEqual(t6, These.first(cmb(sa, sc)));

        const t7 = These.go(function* () {
            const x = yield* mk("B", sa, _2);
            const [y, z] = yield* mk("S", sc, pair(x, _4));
            return [x, y, z] as const;
        });
        assert.deepEqual(t7, These.both(sa, [_2, _2, _4] as const));

        const t8 = These.go(function* () {
            const x = yield* mk("B", sa, _2);
            const [y, z] = yield* mk("B", sc, pair(x, _4));
            return [x, y, z] as const;
        });
        assert.deepEqual(t8, These.both(cmb(sa, sc), [_2, _2, _4] as const));
    });

    specify("These.reduce", () => {
        const t0 = These.reduce(["x", "y"], (xs, x) => mk("B", sa, xs + x), "");
        assert.deepEqual(t0, These.both(cmb(sa, sa), "xy"));
    });

    specify("These.collect", () => {
        const t0 = These.collect([mk("B", sa, _2), mk("B", sc, _4)] as const);
        assert.deepEqual(t0, These.both(cmb(sa, sc), [_2, _4] as const));
    });

    specify("These.tupled", () => {
        const t0 = These.tupled(mk("B", sa, _2), mk("B", sc, _4));
        assert.deepEqual(t0, These.both(cmb(sa, sc), [_2, _4] as const));
    });

    specify("These.goAsync", async () => {
        const t0 = await These.goAsync(async function* () {
            const x = yield* await mkA("F", sa, _2);
            const [y, z] = yield* await mkA("F", sc, pair(x, _4));
            return [x, y, z] as const;
        });
        assert.deepEqual(t0, These.first(sa));

        const t1 = await These.goAsync(async function* () {
            const x = yield* await mkA("F", sa, _2);
            const [y, z] = yield* await mkA("S", sc, pair(x, _4));
            return [x, y, z] as const;
        });
        assert.deepEqual(t1, These.first(sa));

        const t2 = await These.goAsync(async function* () {
            const x = yield* await mkA("F", sa, _2);
            const [y, z] = yield* await mkA("B", sc, pair(x, _4));
            return [x, y, z] as const;
        });
        assert.deepEqual(t2, These.first(sa));

        const t3 = await These.goAsync(async function* () {
            const x = yield* await mkA("S", sa, _2);
            const [y, z] = yield* await mkA("F", sc, pair(x, _4));
            return [x, y, z] as const;
        });
        assert.deepEqual(t3, These.first(sc));

        const t4 = await These.goAsync(async function* () {
            const x = yield* await mkA("S", sa, _2);
            const [y, z] = yield* await mkA("S", sc, pair(x, _4));
            return [x, y, z] as const;
        });
        assert.deepEqual(t4, These.second([_2, _2, _4] as const));

        const t5 = await These.goAsync(async function* () {
            const x = yield* await mkA("S", sa, _2);
            const [y, z] = yield* await mkA("B", sc, pair(x, _4));
            return [x, y, z] as const;
        });
        assert.deepEqual(t5, These.both(sc, [_2, _2, _4] as const));

        const t6 = await These.goAsync(async function* () {
            const x = yield* await mkA("B", sa, _2);
            const [y, z] = yield* await mkA("F", sc, pair(x, _4));
            return [x, y, z] as const;
        });
        assert.deepEqual(t6, These.first(cmb(sa, sc)));

        const t7 = await These.goAsync(async function* () {
            const x = yield* await mkA("B", sa, _2);
            const [y, z] = yield* await mkA("S", sc, pair(x, _4));
            return [x, y, z] as const;
        });
        assert.deepEqual(t7, These.both(sa, [_2, _2, _4] as const));

        const t8 = await These.goAsync(async function* () {
            const x = yield* await mkA("B", sa, _2);
            const [y, z] = yield* await mkA("B", sc, pair(x, _4));
            return [x, y, z] as const;
        });
        assert.deepEqual(t8, These.both(cmb(sa, sc), [_2, _2, _4] as const));

        it("unwraps nested promise-like values on bind and return", async () => {
            const t9 = await These.goAsync(async function* () {
                const x = yield* await mkA("B", sa, Promise.resolve(_2));
                const [y, z] = yield* await mkA(
                    "B",
                    sc,
                    Promise.resolve(pair(x, _4)),
                );
                return Promise.resolve([x, y, z] as const);
            });
            assert.deepEqual(
                t9,
                These.both(cmb(sa, sc), [_2, _2, _4] as const),
            );
        });
    });

    specify("#[Eq.eq]", () => {
        fc.assert(
            fc.property(
                arbNum(),
                arbNum(),
                arbNum(),
                arbNum(),
                (a, x, b, y) => {
                    const t0 = eq(These.first(a), These.first(b));
                    assert.strictEqual(t0, eq(a, b));

                    const t1 = eq(These.first(a), These.second(y));
                    assert.strictEqual(t1, false);

                    const t2 = eq(These.first(a), These.both(b, y));
                    assert.strictEqual(t2, false);

                    const t3 = eq(These.second(x), These.first(b));
                    assert.strictEqual(t3, false);

                    const t4 = eq(These.second(x), These.second(y));
                    assert.strictEqual(t4, eq(x, y));

                    const t5 = eq(These.second(x), These.both(b, y));
                    assert.strictEqual(t5, false);

                    const t6 = eq(These.both(a, x), These.first(b));
                    assert.strictEqual(t6, false);

                    const t7 = eq(These.both(a, x), These.second(y));
                    assert.strictEqual(t7, false);

                    const t8 = eq(These.both(a, x), These.both(b, y));
                    assert.strictEqual(t8, eq(a, b) && eq(x, y));
                },
            ),
        );
    });

    specify("#[Ord.cmp]", () => {
        fc.assert(
            fc.property(
                arbNum(),
                arbNum(),
                arbNum(),
                arbNum(),
                (a, x, b, y) => {
                    const t0 = cmp(These.first(a), These.first(b));
                    assert.strictEqual(t0, cmp(a, b));

                    const t1 = cmp(These.first(a), These.second(y));
                    assert.strictEqual(t1, Ordering.less);

                    const t2 = cmp(These.first(a), These.both(b, y));
                    assert.strictEqual(t2, Ordering.less);

                    const t3 = cmp(These.second(x), These.first(b));
                    assert.strictEqual(t3, Ordering.greater);

                    const t4 = cmp(These.second(x), These.second(y));
                    assert.strictEqual(t4, cmp(x, y));

                    const t5 = cmp(These.second(x), These.both(b, y));
                    assert.strictEqual(t5, Ordering.less);

                    const t6 = cmp(These.both(a, x), These.first(b));
                    assert.strictEqual(t6, Ordering.greater);

                    const t7 = cmp(These.both(a, x), These.second(y));
                    assert.strictEqual(t7, Ordering.greater);

                    const t8 = cmp(These.both(a, x), These.both(b, y));
                    assert.strictEqual(t8, cmb(cmp(a, b), cmp(x, y)));
                },
            ),
        );
    });

    specify("#[Semigroup.cmb]", () => {
        fc.assert(
            fc.property(
                arbStr(),
                arbStr(),
                arbStr(),
                arbStr(),
                (a, x, b, y) => {
                    const t0 = cmb(These.first(a), These.first(b));
                    assert.deepEqual(t0, These.first(cmb(a, b)));

                    const t1 = cmb(These.first(a), These.second(y));
                    assert.deepEqual(t1, These.both(a, y));

                    const t2 = cmb(These.first(a), These.both(b, y));
                    assert.deepEqual(t2, These.both(cmb(a, b), y));

                    const t3 = cmb(These.second(x), These.first(b));
                    assert.deepEqual(t3, These.both(b, x));

                    const t4 = cmb(These.second(x), These.second(y));
                    assert.deepEqual(t4, These.second(cmb(x, y)));

                    const t5 = cmb(These.second(x), These.both(b, y));
                    assert.deepEqual(t5, These.both(b, cmb(x, y)));

                    const t6 = cmb(These.both(a, x), These.first(b));
                    assert.deepEqual(t6, These.both(cmb(a, b), x));

                    const t7 = cmb(These.both(a, x), These.second(y));
                    assert.deepEqual(t7, These.both(a, cmb(x, y)));

                    const t8 = cmb(These.both(a, x), These.both(b, y));
                    assert.deepEqual(t8, These.both(cmb(a, b), cmb(x, y)));
                },
            ),
        );
    });

    specify("#fold", () => {
        const t0 = mk("F", _1, _2).fold(
            (x) => pair(x, _3),
            (x) => pair(x, _4),
            pair,
        );
        assert.deepEqual(t0, [_1, _3]);

        const t1 = mk("S", _1, _2).fold(
            (x) => pair(x, _3),
            (x) => pair(x, _4),
            pair,
        );
        assert.deepEqual(t1, [_2, _4]);

        const t2 = mk("B", _1, _2).fold(
            (x) => pair(x, _3),
            (x) => pair(x, _4),
            pair,
        );
        assert.deepEqual(t2, [_1, _2]);
    });

    specify("#isFirst", () => {
        const t0 = mk("F", _1, _2).isFirst();
        assert.strictEqual(t0, true);

        const t1 = mk("S", _1, _2).isFirst();
        assert.strictEqual(t1, false);

        const t2 = mk("B", _1, _2).isFirst();
        assert.strictEqual(t2, false);
    });

    specify("#isSecond", () => {
        const t0 = mk("F", _1, _2).isSecond();
        assert.strictEqual(t0, false);

        const t1 = mk("S", _1, _2).isSecond();
        assert.strictEqual(t1, true);

        const t2 = mk("B", _1, _2).isSecond();
        assert.strictEqual(t2, false);
    });

    specify("#isBoth", () => {
        const t0 = mk("F", _1, _2).isBoth();
        assert.strictEqual(t0, false);

        const t1 = mk("S", _1, _2).isBoth();
        assert.strictEqual(t1, false);

        const t2 = mk("B", _1, _2).isBoth();
        assert.strictEqual(t2, true);
    });

    specify("#flatMap", () => {
        const t0 = mk("F", sa, _2).flatMap((x) => mk("F", sc, pair(x, _4)));
        assert.deepEqual(t0, These.first(sa));

        const t1 = mk("F", sa, _2).flatMap((x) => mk("S", sc, pair(x, _4)));
        assert.deepEqual(t1, These.first(sa));

        const t2 = mk("F", sa, _2).flatMap((x) => mk("B", sc, pair(x, _4)));
        assert.deepEqual(t2, These.first(sa));

        const t3 = mk("S", sa, _2).flatMap((x) => mk("F", sc, pair(x, _4)));
        assert.deepEqual(t3, These.first(sc));

        const t4 = mk("S", sa, _2).flatMap((x) => mk("S", sc, pair(x, _4)));
        assert.deepEqual(t4, These.second([_2, _4] as const));

        const t5 = mk("S", sa, _2).flatMap((x) => mk("B", sc, pair(x, _4)));
        assert.deepEqual(t5, These.both(sc, [_2, _4] as const));

        const t6 = mk("B", sa, _2).flatMap((x) => mk("F", sc, pair(x, _4)));
        assert.deepEqual(t6, These.first(cmb(sa, sc)));

        const t7 = mk("B", sa, _2).flatMap((x) => mk("S", sc, pair(x, _4)));
        assert.deepEqual(t7, These.both(sa, [_2, _4] as const));

        const t8 = mk("B", sa, _2).flatMap((x) => mk("B", sc, pair(x, _4)));
        assert.deepEqual(t8, These.both(cmb(sa, sc), [_2, _4] as const));
    });

    specify("#flat", () => {
        const t0 = mk("B", sa, mk("B", sc, _2)).flat();
        assert.deepEqual(t0, These.both(cmb(sa, sc), _2));
    });

    specify("#zipWith", () => {
        const t0 = mk("B", sa, _2).zipWith(mk("B", sc, _4), pair);
        assert.deepEqual(t0, These.both(cmb(sa, sc), [_2, _4] as const));
    });

    specify("#zipFst", () => {
        const t0 = mk("B", sa, _2).zipFst(mk("B", sc, _4));
        assert.deepEqual(t0, These.both(cmb(sa, sc), _2));
    });

    specify("#zipSnd", () => {
        const t0 = mk("B", sa, _2).zipSnd(mk("B", sc, _4));
        assert.deepEqual(t0, These.both(cmb(sa, sc), _4));
    });

    specify("#map", () => {
        const t0 = mk("F", _1, _2).map((x) => pair(x, _4));
        assert.deepEqual(t0, These.first(_1));

        const t1 = mk("S", _1, _2).map((x) => pair(x, _4));
        assert.deepEqual(t1, These.second([_2, _4] as const));

        const t2 = mk("B", _1, _2).map((x) => pair(x, _4));
        assert.deepEqual(t2, These.both(_1, [_2, _4] as const));
    });

    specify("#mapTo", () => {
        const t0 = mk("B", _1, _2).mapTo(_4);
        assert.deepEqual(t0, These.both(_1, _4));
    });

    specify("#mapFirst", () => {
        const t0 = mk("F", _1, _2).mapFirst((x) => pair(x, _3));
        assert.deepEqual(t0, These.first([_1, _3] as const));

        const t1 = mk("S", _1, _2).mapFirst((x) => pair(x, _3));
        assert.deepEqual(t1, These.second(_2));

        const t2 = mk("B", _1, _2).mapFirst((x) => pair(x, _3));
        assert.deepEqual(t2, These.both([_1, _3] as const, _2));
    });

    specify("#bimap", () => {
        const t0 = mk("F", _1, _2).bimap(
            (x) => pair(x, _3),
            (x) => pair(x, _4),
        );
        assert.deepEqual(t0, These.first([_1, _3] as const));

        const t1 = mk("S", _1, _2).bimap(
            (x) => pair(x, _3),
            (x) => pair(x, _4),
        );
        assert.deepEqual(t1, These.second([_2, _4] as const));

        const t2 = mk("B", _1, _2).bimap(
            (x) => pair(x, _3),
            (x) => pair(x, _4),
        );
        assert.deepEqual(t2, These.both([_1, _3] as const, [_2, _4] as const));
    });
});
