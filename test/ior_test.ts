import { assert } from "chai";
import * as fc from "fast-check";
import { cmb } from "../src/cmb.js";
import { cmp, eq, Ordering } from "../src/cmp.js";
import { Ior } from "../src/ior.js";
import { arbNum, arbStr, pair, Str } from "./common.js";

function mk<A, B>(t: "L" | "R" | "B", x: A, y: B): Ior<A, B> {
    return t === "L" ? Ior.left(x) : t === "R" ? Ior.right(y) : Ior.both(x, y);
}

function mkA<A, B>(t: "L" | "R" | "B", x: A, y: B): Promise<Ior<A, B>> {
    return Promise.resolve(
        t === "L" ? Ior.left(x) : t === "R" ? Ior.right(y) : Ior.both(x, y),
    );
}

const _1 = 1 as const;
const _2 = 2 as const;
const _3 = 3 as const;
const _4 = 4 as const;

const sa = new Str("a");
const sc = new Str("c");

describe("Ior", () => {
    specify("Ior.go", () => {
        const t0 = Ior.go(function* () {
            const x = yield* mk("L", sa, _2);
            const [y, z] = yield* mk("L", sc, pair(x, _4));
            return [x, y, z] as const;
        });
        assert.deepEqual(t0, Ior.left(sa));

        const t1 = Ior.go(function* () {
            const x = yield* mk("L", sa, _2);
            const [y, z] = yield* mk("R", sc, pair(x, _4));
            return [x, y, z] as const;
        });
        assert.deepEqual(t1, Ior.left(sa));

        const t2 = Ior.go(function* () {
            const x = yield* mk("L", sa, _2);
            const [y, z] = yield* mk("B", sc, pair(x, _4));
            return [x, y, z] as const;
        });
        assert.deepEqual(t2, Ior.left(sa));

        const t3 = Ior.go(function* () {
            const x = yield* mk("R", sa, _2);
            const [y, z] = yield* mk("L", sc, pair(x, _4));
            return [x, y, z] as const;
        });
        assert.deepEqual(t3, Ior.left(sc));

        const t4 = Ior.go(function* () {
            const x = yield* mk("R", sa, _2);
            const [y, z] = yield* mk("R", sc, pair(x, _4));
            return [x, y, z] as const;
        });
        assert.deepEqual(t4, Ior.right([_2, _2, _4] as const));

        const t5 = Ior.go(function* () {
            const x = yield* mk("R", sa, _2);
            const [y, z] = yield* mk("B", sc, pair(x, _4));
            return [x, y, z] as const;
        });
        assert.deepEqual(t5, Ior.both(sc, [_2, _2, _4] as const));

        const t6 = Ior.go(function* () {
            const x = yield* mk("B", sa, _2);
            const [y, z] = yield* mk("L", sc, pair(x, _4));
            return [x, y, z] as const;
        });
        assert.deepEqual(t6, Ior.left(cmb(sa, sc)));

        const t7 = Ior.go(function* () {
            const x = yield* mk("B", sa, _2);
            const [y, z] = yield* mk("R", sc, pair(x, _4));
            return [x, y, z] as const;
        });
        assert.deepEqual(t7, Ior.both(sa, [_2, _2, _4] as const));

        const t8 = Ior.go(function* () {
            const x = yield* mk("B", sa, _2);
            const [y, z] = yield* mk("B", sc, pair(x, _4));
            return [x, y, z] as const;
        });
        assert.deepEqual(t8, Ior.both(cmb(sa, sc), [_2, _2, _4] as const));
    });

    specify("Ior.reduce", () => {
        const t0 = Ior.reduce(["x", "y"], (xs, x) => mk("B", sa, xs + x), "");
        assert.deepEqual(t0, Ior.both(cmb(sa, sa), "xy"));
    });

    specify("Ior.collect", () => {
        const t0 = Ior.collect([mk("B", sa, _2), mk("B", sc, _4)] as const);
        assert.deepEqual(t0, Ior.both(cmb(sa, sc), [_2, _4] as const));
    });

    specify("Ior.goAsync", async () => {
        const t0 = await Ior.goAsync(async function* () {
            const x = yield* await mkA("L", sa, _2);
            const [y, z] = yield* await mkA("L", sc, pair(x, _4));
            return [x, y, z] as const;
        });
        assert.deepEqual(t0, Ior.left(sa));

        const t1 = await Ior.goAsync(async function* () {
            const x = yield* await mkA("L", sa, _2);
            const [y, z] = yield* await mkA("R", sc, pair(x, _4));
            return [x, y, z] as const;
        });
        assert.deepEqual(t1, Ior.left(sa));

        const t2 = await Ior.goAsync(async function* () {
            const x = yield* await mkA("L", sa, _2);
            const [y, z] = yield* await mkA("B", sc, pair(x, _4));
            return [x, y, z] as const;
        });
        assert.deepEqual(t2, Ior.left(sa));

        const t3 = await Ior.goAsync(async function* () {
            const x = yield* await mkA("R", sa, _2);
            const [y, z] = yield* await mkA("L", sc, pair(x, _4));
            return [x, y, z] as const;
        });
        assert.deepEqual(t3, Ior.left(sc));

        const t4 = await Ior.goAsync(async function* () {
            const x = yield* await mkA("R", sa, _2);
            const [y, z] = yield* await mkA("R", sc, pair(x, _4));
            return [x, y, z] as const;
        });
        assert.deepEqual(t4, Ior.right([_2, _2, _4] as const));

        const t5 = await Ior.goAsync(async function* () {
            const x = yield* await mkA("R", sa, _2);
            const [y, z] = yield* await mkA("B", sc, pair(x, _4));
            return [x, y, z] as const;
        });
        assert.deepEqual(t5, Ior.both(sc, [_2, _2, _4] as const));

        const t6 = await Ior.goAsync(async function* () {
            const x = yield* await mkA("B", sa, _2);
            const [y, z] = yield* await mkA("L", sc, pair(x, _4));
            return [x, y, z] as const;
        });
        assert.deepEqual(t6, Ior.left(cmb(sa, sc)));

        const t7 = await Ior.goAsync(async function* () {
            const x = yield* await mkA("B", sa, _2);
            const [y, z] = yield* await mkA("R", sc, pair(x, _4));
            return [x, y, z] as const;
        });
        assert.deepEqual(t7, Ior.both(sa, [_2, _2, _4] as const));

        const t8 = await Ior.goAsync(async function* () {
            const x = yield* await mkA("B", sa, _2);
            const [y, z] = yield* await mkA("B", sc, pair(x, _4));
            return [x, y, z] as const;
        });
        assert.deepEqual(t8, Ior.both(cmb(sa, sc), [_2, _2, _4] as const));

        it("unwraps nested promise-like values on bind and return", async () => {
            const t9 = await Ior.goAsync(async function* () {
                const x = yield* await mkA("B", sa, Promise.resolve(_2));
                const [y, z] = yield* await mkA(
                    "B",
                    sc,
                    Promise.resolve(pair(x, _4)),
                );
                return Promise.resolve([x, y, z] as const);
            });
            assert.deepEqual(t9, Ior.both(cmb(sa, sc), [_2, _2, _4] as const));
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
                    const t0 = eq(Ior.left(a), Ior.left(b));
                    assert.strictEqual(t0, eq(a, b));

                    const t1 = eq(Ior.left(a), Ior.right(y));
                    assert.strictEqual(t1, false);

                    const t2 = eq(Ior.left(a), Ior.both(b, y));
                    assert.strictEqual(t2, false);

                    const t3 = eq(Ior.right(x), Ior.left(b));
                    assert.strictEqual(t3, false);

                    const t4 = eq(Ior.right(x), Ior.right(y));
                    assert.strictEqual(t4, eq(x, y));

                    const t5 = eq(Ior.right(x), Ior.both(b, y));
                    assert.strictEqual(t5, false);

                    const t6 = eq(Ior.both(a, x), Ior.left(b));
                    assert.strictEqual(t6, false);

                    const t7 = eq(Ior.both(a, x), Ior.right(y));
                    assert.strictEqual(t7, false);

                    const t8 = eq(Ior.both(a, x), Ior.both(b, y));
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
                    const t0 = cmp(Ior.left(a), Ior.left(b));
                    assert.strictEqual(t0, cmp(a, b));

                    const t1 = cmp(Ior.left(a), Ior.right(y));
                    assert.strictEqual(t1, Ordering.less);

                    const t2 = cmp(Ior.left(a), Ior.both(b, y));
                    assert.strictEqual(t2, Ordering.less);

                    const t3 = cmp(Ior.right(x), Ior.left(b));
                    assert.strictEqual(t3, Ordering.greater);

                    const t4 = cmp(Ior.right(x), Ior.right(y));
                    assert.strictEqual(t4, cmp(x, y));

                    const t5 = cmp(Ior.right(x), Ior.both(b, y));
                    assert.strictEqual(t5, Ordering.less);

                    const t6 = cmp(Ior.both(a, x), Ior.left(b));
                    assert.strictEqual(t6, Ordering.greater);

                    const t7 = cmp(Ior.both(a, x), Ior.right(y));
                    assert.strictEqual(t7, Ordering.greater);

                    const t8 = cmp(Ior.both(a, x), Ior.both(b, y));
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
                    const t0 = cmb(Ior.left(a), Ior.left(b));
                    assert.deepEqual(t0, Ior.left(cmb(a, b)));

                    const t1 = cmb(Ior.left(a), Ior.right(y));
                    assert.deepEqual(t1, Ior.both(a, y));

                    const t2 = cmb(Ior.left(a), Ior.both(b, y));
                    assert.deepEqual(t2, Ior.both(cmb(a, b), y));

                    const t3 = cmb(Ior.right(x), Ior.left(b));
                    assert.deepEqual(t3, Ior.both(b, x));

                    const t4 = cmb(Ior.right(x), Ior.right(y));
                    assert.deepEqual(t4, Ior.right(cmb(x, y)));

                    const t5 = cmb(Ior.right(x), Ior.both(b, y));
                    assert.deepEqual(t5, Ior.both(b, cmb(x, y)));

                    const t6 = cmb(Ior.both(a, x), Ior.left(b));
                    assert.deepEqual(t6, Ior.both(cmb(a, b), x));

                    const t7 = cmb(Ior.both(a, x), Ior.right(y));
                    assert.deepEqual(t7, Ior.both(a, cmb(x, y)));

                    const t8 = cmb(Ior.both(a, x), Ior.both(b, y));
                    assert.deepEqual(t8, Ior.both(cmb(a, b), cmb(x, y)));
                },
            ),
        );
    });

    specify("#fold", () => {
        const t0 = mk("L", _1, _2).fold(
            (x) => pair(x, _3),
            (x) => pair(x, _4),
            pair,
        );
        assert.deepEqual(t0, [_1, _3]);

        const t1 = mk("R", _1, _2).fold(
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

    specify("#isLeft", () => {
        const t0 = mk("L", _1, _2).isLeft();
        assert.strictEqual(t0, true);

        const t1 = mk("R", _1, _2).isLeft();
        assert.strictEqual(t1, false);

        const t2 = mk("B", _1, _2).isLeft();
        assert.strictEqual(t2, false);
    });

    specify("#isRight", () => {
        const t0 = mk("L", _1, _2).isRight();
        assert.strictEqual(t0, false);

        const t1 = mk("R", _1, _2).isRight();
        assert.strictEqual(t1, true);

        const t2 = mk("B", _1, _2).isRight();
        assert.strictEqual(t2, false);
    });

    specify("#isBoth", () => {
        const t0 = mk("L", _1, _2).isBoth();
        assert.strictEqual(t0, false);

        const t1 = mk("R", _1, _2).isBoth();
        assert.strictEqual(t1, false);

        const t2 = mk("B", _1, _2).isBoth();
        assert.strictEqual(t2, true);
    });

    specify("#flatMap", () => {
        const t0 = mk("L", sa, _2).flatMap((x) => mk("L", sc, pair(x, _4)));
        assert.deepEqual(t0, Ior.left(sa));

        const t1 = mk("L", sa, _2).flatMap((x) => mk("R", sc, pair(x, _4)));
        assert.deepEqual(t1, Ior.left(sa));

        const t2 = mk("L", sa, _2).flatMap((x) => mk("B", sc, pair(x, _4)));
        assert.deepEqual(t2, Ior.left(sa));

        const t3 = mk("R", sa, _2).flatMap((x) => mk("L", sc, pair(x, _4)));
        assert.deepEqual(t3, Ior.left(sc));

        const t4 = mk("R", sa, _2).flatMap((x) => mk("R", sc, pair(x, _4)));
        assert.deepEqual(t4, Ior.right([_2, _4] as const));

        const t5 = mk("R", sa, _2).flatMap((x) => mk("B", sc, pair(x, _4)));
        assert.deepEqual(t5, Ior.both(sc, [_2, _4] as const));

        const t6 = mk("B", sa, _2).flatMap((x) => mk("L", sc, pair(x, _4)));
        assert.deepEqual(t6, Ior.left(cmb(sa, sc)));

        const t7 = mk("B", sa, _2).flatMap((x) => mk("R", sc, pair(x, _4)));
        assert.deepEqual(t7, Ior.both(sa, [_2, _4] as const));

        const t8 = mk("B", sa, _2).flatMap((x) => mk("B", sc, pair(x, _4)));
        assert.deepEqual(t8, Ior.both(cmb(sa, sc), [_2, _4] as const));
    });

    specify("#flat", () => {
        const t0 = mk("B", sa, mk("B", sc, _2)).flat();
        assert.deepEqual(t0, Ior.both(cmb(sa, sc), _2));
    });

    specify("#zipWith", () => {
        const t0 = mk("B", sa, _2).zipWith(mk("B", sc, _4), pair);
        assert.deepEqual(t0, Ior.both(cmb(sa, sc), [_2, _4] as const));
    });

    specify("#zipFst", () => {
        const t0 = mk("B", sa, _2).zipFst(mk("B", sc, _4));
        assert.deepEqual(t0, Ior.both(cmb(sa, sc), _2));
    });

    specify("#zipSnd", () => {
        const t0 = mk("B", sa, _2).zipSnd(mk("B", sc, _4));
        assert.deepEqual(t0, Ior.both(cmb(sa, sc), _4));
    });

    specify("#map", () => {
        const t0 = mk("L", _1, _2).map((x) => pair(x, _4));
        assert.deepEqual(t0, Ior.left(_1));

        const t1 = mk("R", _1, _2).map((x) => pair(x, _4));
        assert.deepEqual(t1, Ior.right([_2, _4] as const));

        const t2 = mk("B", _1, _2).map((x) => pair(x, _4));
        assert.deepEqual(t2, Ior.both(_1, [_2, _4] as const));
    });

    specify("#mapTo", () => {
        const t0 = mk("B", _1, _2).mapTo(_4);
        assert.deepEqual(t0, Ior.both(_1, _4));
    });

    specify("#mapLeft", () => {
        const t0 = mk("L", _1, _2).mapLeft((x) => pair(x, _3));
        assert.deepEqual(t0, Ior.left([_1, _3] as const));

        const t1 = mk("R", _1, _2).mapLeft((x) => pair(x, _3));
        assert.deepEqual(t1, Ior.right(_2));

        const t2 = mk("B", _1, _2).mapLeft((x) => pair(x, _3));
        assert.deepEqual(t2, Ior.both([_1, _3] as const, _2));
    });

    specify("#bimap", () => {
        const t0 = mk("L", _1, _2).bimap(
            (x) => pair(x, _3),
            (x) => pair(x, _4),
        );
        assert.deepEqual(t0, Ior.left([_1, _3] as const));

        const t1 = mk("R", _1, _2).bimap(
            (x) => pair(x, _3),
            (x) => pair(x, _4),
        );
        assert.deepEqual(t1, Ior.right([_2, _4] as const));

        const t2 = mk("B", _1, _2).bimap(
            (x) => pair(x, _3),
            (x) => pair(x, _4),
        );
        assert.deepEqual(t2, Ior.both([_1, _3] as const, [_2, _4] as const));
    });
});
