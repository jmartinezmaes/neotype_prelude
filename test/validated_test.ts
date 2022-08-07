import * as fc from "fast-check";
import { assert } from "chai";
import { arbNum, arbStr, pair, Str } from "./common.js";
import { Either } from "../src/either.js";
import { cmb } from "../src/cmb.js";
import { cmp, eq, Ordering } from "../src/cmp.js";
import { Validated } from "../src/validated.js";

function mk<A, B>(t: "D" | "A", x: A, y: B): Validated<A, B> {
    return t === "D" ? Validated.dispute(x) : Validated.accept(y);
}

const _1 = 1 as const;
const _2 = 2 as const;
const _3 = 3 as const;
const _4 = 4 as const;

const sa = new Str("a");
const sc = new Str("c");

describe("Validated", () => {
    specify("Validated.fromEither", () => {
        const t0 = Validated.fromEither(Either.left<1, 2>(_1));
        assert.deepEqual(t0, Validated.dispute(_1));

        const t1 = Validated.fromEither(Either.right<2, 1>(_2));
        assert.deepEqual(t1, Validated.accept(_2));
    });

    specify("Validated.collect", () => {
        const t0 = Validated.collect([mk("D", sa, _2), mk("D", sc, _4)]);
        assert.deepEqual(t0, Validated.dispute(cmb(sa, sc)));

        const t1 = Validated.collect([mk("D", sa, _2), mk("A", sc, _4)]);
        assert.deepEqual(t1, Validated.dispute(sa));

        const t2 = Validated.collect([mk("A", sa, _2), mk("D", sc, _4)]);
        assert.deepEqual(t2, Validated.dispute(sc));

        const t3 = Validated.collect([mk("A", sa, _2), mk("A", sc, _4)]);
        assert.deepEqual(t3, Validated.accept([_2, _4] as const));
    });

    specify("Validated.tupled", () => {
        const t4 = Validated.tupled(mk("A", sa, _2), mk("A", sc, _4));
        assert.deepEqual(t4, Validated.accept([_2, _4] as const));
    });

    specify("#[Eq.eq]", () => {
        fc.assert(
            fc.property(arbNum(), arbNum(), (x, y) => {
                const t0 = eq(Validated.dispute(x), Validated.dispute(y));
                assert.strictEqual(t0, eq(x, y));

                const t1 = eq(Validated.dispute(x), Validated.accept(y));
                assert.strictEqual(t1, false);

                const t2 = eq(Validated.accept(x), Validated.dispute(y));
                assert.strictEqual(t2, false);

                const t3 = eq(Validated.accept(x), Validated.accept(y));
                assert.strictEqual(t3, eq(x, y));
            }),
        );
    });

    specify("#[Ord.cmp]", () => {
        fc.assert(
            fc.property(arbNum(), arbNum(), (x, y) => {
                const t0 = cmp(Validated.dispute(x), Validated.dispute(y));
                assert.strictEqual(t0, cmp(x, y));

                const t1 = cmp(Validated.dispute(x), Validated.accept(y));
                assert.strictEqual(t1, Ordering.less);

                const t2 = cmp(Validated.accept(x), Validated.dispute(y));
                assert.strictEqual(t2, Ordering.greater);

                const t3 = cmp(Validated.accept(x), Validated.accept(y));
                assert.strictEqual(t3, cmp(x, y));
            }),
        );
    });

    specify("#[Semigroup.cmb]", () => {
        fc.assert(
            fc.property(arbStr(), arbStr(), (x, y) => {
                const t0 = cmb(Validated.dispute(x), Validated.dispute(y));
                assert.deepEqual(t0, Validated.dispute(cmb(x, y)));

                const t1 = cmb(Validated.dispute(x), Validated.accept(y));
                assert.deepEqual(t1, Validated.dispute(x));

                const t2 = cmb(Validated.accept(x), Validated.dispute(y));
                assert.deepEqual(t2, Validated.dispute(y));

                const t3 = cmb(Validated.accept(x), Validated.accept(y));
                assert.deepEqual(t3, Validated.accept(cmb(x, y)));
            }),
        );
    });

    specify("#isDisputed", () => {
        const t0 = mk("D", _1, _2).isDisputed();
        assert.strictEqual(t0, true);

        const t1 = mk("A", _1, _2).isDisputed();
        assert.strictEqual(t1, false);
    });

    specify("#isAccepted", () => {
        const t0 = mk("D", _1, _2).isAccepted();
        assert.strictEqual(t0, false);

        const t1 = mk("A", _1, _2).isAccepted();
        assert.strictEqual(t1, true);
    });

    specify("#fold", () => {
        const t0 = mk("D", _1, _2).fold(
            (x) => pair(x, _3),
            (x) => pair(x, _4),
        );
        assert.deepEqual(t0, [_1, _3]);

        const t1 = mk("A", _1, _2).fold(
            (x) => pair(x, _3),
            (x) => pair(x, _4),
        );
        assert.deepEqual(t1, [_2, _4]);
    });

    specify("#disputedOrFold", () => {
        const t0 = mk("D", _1, _2).disputedOrFold((x) => pair(x, _4));
        assert.strictEqual(t0, _1);

        const t1 = mk("A", _1, _2).disputedOrFold((x) => pair(x, _4));
        assert.deepEqual(t1, [_2, _4]);
    });

    specify("#acceptedOrFold", () => {
        const t0 = mk("D", _1, _2).acceptedOrFold((x) => pair(x, _3));
        assert.deepEqual(t0, [_1, _3]);

        const t1 = mk("A", _1, _2).acceptedOrFold((x) => pair(x, _3));
        assert.strictEqual(t1, _2);
    });

    specify("#bindAccepted", () => {
        const t0 = mk("D", _1, _2).bindAccepted((x) =>
            mk("D", _3, pair(x, _4)),
        );
        assert.deepEqual(t0, Validated.dispute(_1));

        const t1 = mk("D", _1, _2).bindAccepted((x) =>
            mk("A", _3, pair(x, _4)),
        );
        assert.deepEqual(t1, Validated.dispute(_1));

        const t2 = mk("A", _1, _2).bindAccepted((x) =>
            mk("D", _3, pair(x, _4)),
        );
        assert.deepEqual(t2, Validated.dispute(_3));

        const t3 = mk("A", _1, _2).bindAccepted((x) =>
            mk("A", _3, pair(x, _4)),
        );
        assert.deepEqual(t3, Validated.accept([_2, _4] as const));
    });

    specify("#zipWith", () => {
        const t0 = mk("D", sa, _2).zipWith(mk("D", sc, _4), pair);
        assert.deepEqual(t0, Validated.dispute(cmb(sa, sc)));

        const t1 = mk("D", sa, _2).zipWith(mk("A", sc, _4), pair);
        assert.deepEqual(t1, Validated.dispute(sa));

        const t2 = mk("A", sa, _2).zipWith(mk("D", sc, _4), pair);
        assert.deepEqual(t2, Validated.dispute(sc));

        const t3 = mk("A", sa, _2).zipWith(mk("A", sc, _4), pair);
        assert.deepEqual(t3, Validated.accept([_2, _4] as const));
    });

    specify("#zipFst", () => {
        const t0 = mk("A", sa, _2).zipFst(mk("A", sc, _4));
        assert.deepEqual(t0, Validated.accept(_2));
    });

    specify("#zipSnd", () => {
        const t0 = mk("A", sa, _2).zipSnd(mk("A", sc, _4));
        assert.deepEqual(t0, Validated.accept(_4));
    });

    specify("#map", () => {
        const t0 = mk("D", _1, _2).map((x) => pair(x, _4));
        assert.deepEqual(t0, Validated.dispute(_1));

        const t1 = mk("A", _1, _2).map((x) => pair(x, _4));
        assert.deepEqual(t1, Validated.accept([_2, _4] as const));
    });

    specify("#mapTo", () => {
        const t0 = mk("D", _1, _2).mapTo(_4);
        assert.deepEqual(t0, Validated.dispute(_1));

        const t1 = mk("A", _1, _2).mapTo(_4);
        assert.deepEqual(t1, Validated.accept(_4));
    });

    specify("#mapDisputed", () => {
        const t0 = mk("D", _1, _2).mapDisputed((x) => pair(x, _3));
        assert.deepEqual(t0, Validated.dispute([_1, _3] as const));

        const t1 = mk("A", _1, _2).mapDisputed((x) => pair(x, _3));
        assert.deepEqual(t1, Validated.accept(_2));
    });

    specify("#bimap", () => {
        const t0 = mk("D", _1, _2).bimap(
            (x) => pair(x, _3),
            (x) => pair(x, _4),
        );
        assert.deepEqual(t0, Validated.dispute([_1, _3] as const));

        const t1 = mk("A", _1, _2).bimap(
            (x) => pair(x, _3),
            (x) => pair(x, _4),
        );
        assert.deepEqual(t1, Validated.accept([_2, _4] as const));
    });
});
