import { assert } from "chai";
import * as fc from "fast-check";
import { cmb } from "../src/cmb.js";
import {
    clamp,
    cmp,
    Eq,
    eq,
    ge,
    gt,
    icmp,
    icmpBy,
    ieq,
    ieqBy,
    le,
    lt,
    max,
    min,
    ne,
    Ord,
    Ordering,
    Reverse,
} from "../src/cmp.js";
import { arbNum, Num } from "./common.js";

function arbRevNum(): fc.Arbitrary<Reverse<Num>> {
    return arbNum().map((x) => new Reverse(x));
}

describe("Eq", () => {
    specify("eq", () => {
        fc.assert(
            fc.property(arbNum(), arbNum(), (x, y) =>
                assert.strictEqual(eq(x, y), x[Eq.eq](y)),
            ),
        );
    });

    specify("ne", () => {
        fc.assert(
            fc.property(arbNum(), arbNum(), (x, y) =>
                assert.strictEqual(ne(x, y), !x[Eq.eq](y)),
            ),
        );
    });

    specify("ieqBy", () => {
        function comparer(x: number, y: number): boolean {
            return x === y;
        }
        fc.assert(
            fc.property(
                fc.float({ noNaN: true }),
                fc.float({ noNaN: true }),
                fc.float({ noNaN: true }),
                fc.float({ noNaN: true }),
                (a, x, b, y) => {
                    assert.strictEqual(ieqBy([a], [], comparer), false);
                    assert.strictEqual(ieqBy([], [b], comparer), false);
                    assert.strictEqual(ieqBy([a, x], [b], comparer), false);
                    assert.strictEqual(ieqBy([a], [b, y], comparer), false);
                    assert.strictEqual(
                        ieqBy([a, x], [b, y], comparer),
                        comparer(a, b) && comparer(x, y),
                    );
                },
            ),
        );
    });

    specify("ieq", () => {
        fc.assert(
            fc.property(
                arbNum(),
                arbNum(),
                arbNum(),
                arbNum(),
                (a, x, b, y) => {
                    assert.strictEqual(ieq([a], []), false);
                    assert.strictEqual(ieq([], [b]), false);
                    assert.strictEqual(ieq([a, x], [b]), false);
                    assert.strictEqual(ieq([a], [b, y]), false);
                    assert.strictEqual(
                        ieq([a, x], [b, y]),
                        eq(a, b) && eq(x, y),
                    );
                },
            ),
        );
    });
});

describe("Ord", () => {
    specify("cmp", () => {
        fc.assert(
            fc.property(arbNum(), arbNum(), (x, y) =>
                assert.strictEqual(cmp(x, y), x[Ord.cmp](y)),
            ),
        );
    });

    specify("icmpBy", () => {
        function comparer(x: number, y: number): Ordering {
            return Ordering.fromNumber(x - y);
        }
        fc.assert(
            fc.property(
                fc.float({ noNaN: true }),
                fc.float({ noNaN: true }),
                fc.float({ noNaN: true }),
                fc.float({ noNaN: true }),
                (a, x, b, y) => {
                    assert.strictEqual(
                        icmpBy([a], [], comparer),
                        Ordering.greater,
                    );
                    assert.strictEqual(
                        icmpBy([], [b], comparer),
                        Ordering.less,
                    );
                    assert.strictEqual(
                        icmpBy([a, x], [b], comparer),
                        cmb(comparer(a, b), Ordering.greater),
                    );
                    assert.strictEqual(
                        icmpBy([a], [b, y], comparer),
                        cmb(comparer(a, b), Ordering.less),
                    );
                    assert.strictEqual(
                        icmpBy([a, x], [b, y], comparer),
                        cmb(comparer(a, b), comparer(x, y)),
                    );
                },
            ),
        );
    });

    specify("icmp", () => {
        fc.assert(
            fc.property(
                arbNum(),
                arbNum(),
                arbNum(),
                arbNum(),
                (a, x, b, y) => {
                    assert.strictEqual(icmp([a], []), Ordering.greater);
                    assert.strictEqual(icmp([], [b]), Ordering.less);
                    assert.strictEqual(
                        icmp([a, x], [b]),
                        cmb(cmp(a, b), Ordering.greater),
                    );
                    assert.strictEqual(
                        icmp([a], [b, y]),
                        cmb(cmp(a, b), Ordering.less),
                    );
                    assert.strictEqual(
                        icmp([a, x], [b, y]),
                        cmb(cmp(a, b), cmp(x, y)),
                    );
                },
            ),
        );
    });

    specify("lt", () => {
        fc.assert(
            fc.property(arbNum(), arbNum(), (x, y) =>
                assert.strictEqual(lt(x, y), cmp(x, y).isLt()),
            ),
        );
    });

    specify("gt", () => {
        fc.assert(
            fc.property(arbNum(), arbNum(), (x, y) =>
                assert.strictEqual(gt(x, y), cmp(x, y).isGt()),
            ),
        );
    });

    specify("le", () => {
        fc.assert(
            fc.property(arbNum(), arbNum(), (x, y) =>
                assert.strictEqual(le(x, y), cmp(x, y).isLe()),
            ),
        );
    });

    specify("ge", () => {
        fc.assert(
            fc.property(arbNum(), arbNum(), (x, y) =>
                assert.strictEqual(ge(x, y), cmp(x, y).isGe()),
            ),
        );
    });

    specify("min", () => {
        fc.assert(
            fc.property(arbNum(), arbNum(), (x, y) =>
                assert.deepEqual(min(x, y), new Num(Math.min(x.val, y.val))),
            ),
        );
    });

    specify("max", () => {
        fc.assert(
            fc.property(arbNum(), arbNum(), (x, y) =>
                assert.deepEqual(max(x, y), new Num(Math.max(x.val, y.val))),
            ),
        );
    });

    specify("clamp", () => {
        fc.assert(
            fc.property(arbNum(), arbNum(), arbNum(), (x, y, z) => {
                assert.deepEqual(clamp(x, y, z), min(max(x, y), z));
            }),
        );
    });
});

describe("Ordering", () => {
    specify("Ordering.fromNumber", () => {
        fc.assert(
            fc.property(fc.float({ noNaN: true }), (x) => {
                const t0 = Ordering.fromNumber(x);
                if (x < 0) {
                    assert.strictEqual(t0, Ordering.less);
                } else if (x > 0) {
                    assert.strictEqual(t0, Ordering.greater);
                } else {
                    assert.strictEqual(t0, Ordering.equal);
                }
            }),
        );
    });

    specify("#[Eq.eq]", () => {
        const t0 = eq(Ordering.less, Ordering.less);
        assert.strictEqual(t0, true);

        const t1 = eq(Ordering.less, Ordering.equal);
        assert.strictEqual(t1, false);

        const t2 = eq(Ordering.less, Ordering.greater);
        assert.strictEqual(t2, false);

        const t3 = eq(Ordering.equal, Ordering.less);
        assert.strictEqual(t3, false);

        const t4 = eq(Ordering.equal, Ordering.equal);
        assert.strictEqual(t4, true);

        const t5 = eq(Ordering.equal, Ordering.greater);
        assert.strictEqual(t5, false);

        const t6 = eq(Ordering.greater, Ordering.less);
        assert.strictEqual(t6, false);

        const t7 = eq(Ordering.greater, Ordering.equal);
        assert.strictEqual(t7, false);

        const t8 = eq(Ordering.greater, Ordering.greater);
        assert.strictEqual(t8, true);
    });

    specify("#[Ord.cmp]", () => {
        const t0 = cmp(Ordering.less, Ordering.less);
        assert.strictEqual(t0, Ordering.equal);

        const t1 = cmp(Ordering.less, Ordering.equal);
        assert.strictEqual(t1, Ordering.less);

        const t2 = cmp(Ordering.less, Ordering.greater);
        assert.strictEqual(t2, Ordering.less);

        const t3 = cmp(Ordering.equal, Ordering.less);
        assert.strictEqual(t3, Ordering.greater);

        const t4 = cmp(Ordering.equal, Ordering.equal);
        assert.strictEqual(t4, Ordering.equal);

        const t5 = cmp(Ordering.equal, Ordering.greater);
        assert.strictEqual(t5, Ordering.less);

        const t6 = cmp(Ordering.greater, Ordering.less);
        assert.strictEqual(t6, Ordering.greater);

        const t7 = cmp(Ordering.greater, Ordering.equal);
        assert.strictEqual(t7, Ordering.greater);

        const t8 = cmp(Ordering.greater, Ordering.greater);
        assert.strictEqual(t8, Ordering.equal);
    });

    specify("#[Semigroup.cmb]", () => {
        const t0 = cmb(Ordering.less, Ordering.less);
        assert.strictEqual(t0, Ordering.less);

        const t1 = cmb(Ordering.less, Ordering.equal);
        assert.strictEqual(t1, Ordering.less);

        const t2 = cmb(Ordering.less, Ordering.greater);
        assert.strictEqual(t2, Ordering.less);

        const t3 = cmb(Ordering.equal, Ordering.less);
        assert.strictEqual(t3, Ordering.less);

        const t4 = cmb(Ordering.equal, Ordering.equal);
        assert.strictEqual(t4, Ordering.equal);

        const t5 = cmb(Ordering.equal, Ordering.greater);
        assert.strictEqual(t5, Ordering.greater);

        const t6 = cmb(Ordering.greater, Ordering.less);
        assert.strictEqual(t6, Ordering.greater);

        const t7 = cmb(Ordering.greater, Ordering.equal);
        assert.strictEqual(t7, Ordering.greater);

        const t8 = cmb(Ordering.greater, Ordering.greater);
        assert.strictEqual(t8, Ordering.greater);
    });

    specify("#isEq", () => {
        const t0 = Ordering.less.isEq();
        assert.strictEqual(t0, false);

        const t1 = Ordering.equal.isEq();
        assert.strictEqual(t1, true);

        const t2 = Ordering.greater.isEq();
        assert.strictEqual(t2, false);
    });

    specify("#isNe", () => {
        const t0 = Ordering.less.isNe();
        assert.strictEqual(t0, true);

        const t1 = Ordering.equal.isNe();
        assert.strictEqual(t1, false);

        const t2 = Ordering.greater.isNe();
        assert.strictEqual(t2, true);
    });

    specify("#isLt", () => {
        const t0 = Ordering.less.isLt();
        assert.strictEqual(t0, true);

        const t1 = Ordering.equal.isLt();
        assert.strictEqual(t1, false);

        const t2 = Ordering.greater.isLt();
        assert.strictEqual(t2, false);
    });

    specify("#isGt", () => {
        const t0 = Ordering.less.isGt();
        assert.strictEqual(t0, false);

        const t1 = Ordering.equal.isGt();
        assert.strictEqual(t1, false);

        const t2 = Ordering.greater.isGt();
        assert.strictEqual(t2, true);
    });

    specify("#isLe", () => {
        const t0 = Ordering.less.isLe();
        assert.strictEqual(t0, true);

        const t1 = Ordering.equal.isLe();
        assert.strictEqual(t1, true);

        const t2 = Ordering.greater.isLe();
        assert.strictEqual(t2, false);
    });

    specify("#isGe", () => {
        const t0 = Ordering.less.isGe();
        assert.strictEqual(t0, false);

        const t1 = Ordering.equal.isGe();
        assert.strictEqual(t1, true);

        const t2 = Ordering.greater.isGe();
        assert.strictEqual(t2, true);
    });

    specify("#reverse", () => {
        const t0 = Ordering.less.reverse();
        assert.strictEqual(t0, Ordering.greater);

        const t1 = Ordering.equal.reverse();
        assert.strictEqual(t1, Ordering.equal);

        const t2 = Ordering.greater.reverse();
        assert.strictEqual(t2, Ordering.less);
    });

    specify("#toNumber", () => {
        const t0 = Ordering.less.toNumber();
        assert.strictEqual(t0, -1);

        const t1 = Ordering.equal.toNumber();
        assert.strictEqual(t1, 0);

        const t2 = Ordering.greater.toNumber();
        assert.strictEqual(t2, 1);
    });
});

describe("Reverse", () => {
    specify("#[Eq.eq]", () => {
        fc.assert(
            fc.property(arbRevNum(), arbRevNum(), (x, y) =>
                assert.strictEqual(eq(x, y), eq(x.val, y.val)),
            ),
        );
    });

    specify("#[Ord.cmp]", () => {
        fc.assert(
            fc.property(arbRevNum(), arbRevNum(), (x, y) =>
                assert.strictEqual(cmp(x, y), cmp(x.val, y.val).reverse()),
            ),
        );
    });
});
