import { assert } from "chai";
import * as fc from "fast-check";
import { cmb } from "../src/cmb.js";
import { cmp, eq, Ordering } from "../src/cmp.js";
import { Either } from "../src/either.js";
import { Validation } from "../src/validation.js";
import { arbNum, arbStr, Str, tuple } from "./common.js";

function mk<A, B>(t: "Err" | "Ok", x: A, y: B): Validation<A, B> {
    return t === "Err" ? Validation.err(x) : Validation.ok(y);
}

const _1 = 1 as const;
const _2 = 2 as const;
const _3 = 3 as const;
const _4 = 4 as const;

const sa = new Str("a");
const sc = new Str("c");

describe("Validation", () => {
    specify("Validation.fromEither", () => {
        const t0 = Validation.fromEither(Either.left<1, 2>(_1));
        assert.deepEqual(t0, Validation.err(_1));

        const t1 = Validation.fromEither(Either.right<2, 1>(_2));
        assert.deepEqual(t1, Validation.ok(_2));
    });

    specify("Validation.collect", () => {
        const t0 = Validation.collect([
            mk("Err", sa, _2),
            mk("Err", sc, _4),
        ] as const);
        assert.deepEqual(t0, Validation.err(cmb(sa, sc)));

        const t1 = Validation.collect([
            mk("Err", sa, _2),
            mk("Ok", sc, _4),
        ] as const);
        assert.deepEqual(t1, Validation.err(sa));

        const t2 = Validation.collect([
            mk("Ok", sa, _2),
            mk("Err", sc, _4),
        ] as const);
        assert.deepEqual(t2, Validation.err(sc));

        const t3 = Validation.collect([
            mk("Ok", sa, _2),
            mk("Ok", sc, _4),
        ] as const);
        assert.deepEqual(t3, Validation.ok([_2, _4] as const));
    });

    specify("Validation.gather", () => {
        const t0 = Validation.gather({
            x: mk("Err", sa, _2),
            y: mk("Err", sc, _4),
        });
        assert.deepEqual(t0, Validation.err(cmb(sa, sc)));

        const t1 = Validation.gather({
            x: mk("Err", sa, _2),
            y: mk("Ok", sc, _4),
        });
        assert.deepEqual(t1, Validation.err(sa));

        const t2 = Validation.gather({
            x: mk("Ok", sa, _2),
            y: mk("Err", sc, _4),
        });
        assert.deepEqual(t2, Validation.err(sc));

        const t3 = Validation.gather({
            x: mk("Ok", sa, _2),
            y: mk("Ok", sc, _4),
        });
        assert.deepEqual(t3, Validation.ok({ x: _2, y: _4 }));
    });

    specify("#[Eq.eq]", () => {
        fc.assert(
            fc.property(arbNum(), arbNum(), (x, y) => {
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
            fc.property(arbNum(), arbNum(), (x, y) => {
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
            fc.property(arbStr(), arbStr(), (x, y) => {
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
        const t0 = mk("Err", _1, _2).isErr();
        assert.strictEqual(t0, true);

        const t1 = mk("Ok", _1, _2).isErr();
        assert.strictEqual(t1, false);
    });

    specify("#isOk", () => {
        const t0 = mk("Err", _1, _2).isOk();
        assert.strictEqual(t0, false);

        const t1 = mk("Ok", _1, _2).isOk();
        assert.strictEqual(t1, true);
    });

    specify("#fold", () => {
        const t0 = mk("Err", _1, _2).fold(
            (x) => tuple(x, _3),
            (x) => tuple(x, _4),
        );
        assert.deepEqual(t0, [_1, _3]);

        const t1 = mk("Ok", _1, _2).fold(
            (x) => tuple(x, _3),
            (x) => tuple(x, _4),
        );
        assert.deepEqual(t1, [_2, _4]);
    });

    specify("#errOrFold", () => {
        const t0 = mk("Err", _1, _2).errOrFold((x) => tuple(x, _4));
        assert.strictEqual(t0, _1);

        const t1 = mk("Ok", _1, _2).errOrFold((x) => tuple(x, _4));
        assert.deepEqual(t1, [_2, _4]);
    });

    specify("#okOrFold", () => {
        const t0 = mk("Err", _1, _2).okOrFold((x) => tuple(x, _3));
        assert.deepEqual(t0, [_1, _3]);

        const t1 = mk("Ok", _1, _2).okOrFold((x) => tuple(x, _3));
        assert.strictEqual(t1, _2);
    });

    specify("#zipWith", () => {
        const t0 = mk("Err", sa, _2).zipWith(mk("Err", sc, _4), tuple);
        assert.deepEqual(t0, Validation.err(cmb(sa, sc)));

        const t1 = mk("Err", sa, _2).zipWith(mk("Ok", sc, _4), tuple);
        assert.deepEqual(t1, Validation.err(sa));

        const t2 = mk("Ok", sa, _2).zipWith(mk("Err", sc, _4), tuple);
        assert.deepEqual(t2, Validation.err(sc));

        const t3 = mk("Ok", sa, _2).zipWith(mk("Ok", sc, _4), tuple);
        assert.deepEqual(t3, Validation.ok([_2, _4] as const));
    });

    specify("#zipFst", () => {
        const t0 = mk("Ok", sa, _2).zipFst(mk("Ok", sc, _4));
        assert.deepEqual(t0, Validation.ok(_2));
    });

    specify("#zipSnd", () => {
        const t0 = mk("Ok", sa, _2).zipSnd(mk("Ok", sc, _4));
        assert.deepEqual(t0, Validation.ok(_4));
    });

    specify("#map", () => {
        const t0 = mk("Err", _1, _2).map((x) => tuple(x, _4));
        assert.deepEqual(t0, Validation.err(_1));

        const t1 = mk("Ok", _1, _2).map((x) => tuple(x, _4));
        assert.deepEqual(t1, Validation.ok([_2, _4] as const));
    });

    specify("#lmap", () => {
        const t0 = mk("Err", _1, _2).lmap((x) => tuple(x, _3));
        assert.deepEqual(t0, Validation.err([_1, _3] as const));

        const t1 = mk("Ok", _1, _2).lmap((x) => tuple(x, _3));
        assert.deepEqual(t1, Validation.ok(_2));
    });

    specify("#bimap", () => {
        const t0 = mk("Err", _1, _2).bimap(
            (x) => tuple(x, _3),
            (x) => tuple(x, _4),
        );
        assert.deepEqual(t0, Validation.err([_1, _3] as const));

        const t1 = mk("Ok", _1, _2).bimap(
            (x) => tuple(x, _3),
            (x) => tuple(x, _4),
        );
        assert.deepEqual(t1, Validation.ok([_2, _4] as const));
    });
});
