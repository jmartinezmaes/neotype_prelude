import * as fc from "fast-check";
import { assert } from "chai";
import { arbNum, arbStr, mkNum, type Num, type Str } from "./common.js";
import { cmb } from "../src/cmb.js";
import {
    clamp,
    cmp,
    Eq,
    eq,
    equal,
    ge,
    greater,
    gt,
    icmp,
    ieq,
    le,
    less,
    lt,
    max,
    min,
    mkReverse,
    ne,
    Ord,
    type Reverse,
} from "../src/cmp.js";

function arbRevNum(): fc.Arbitrary<Reverse<Num>> {
    return arbNum().map(mkReverse);
}

function arbRevStr(): fc.Arbitrary<Reverse<Str>> {
    return arbStr().map(mkReverse);
}

describe("Eq", () => {
    specify("eq", () => {
        fc.assert(
            fc.property(arbNum(), arbNum(), (x, y) => {
                assert.strictEqual(eq(x, y), x[Eq.eq](y));
            }),
        );
    });

    specify("ne", () => {
        fc.assert(
            fc.property(arbNum(), arbNum(), (x, y) => {
                assert.strictEqual(ne(x, y), !x[Eq.eq](y));
            }),
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
            fc.property(arbNum(), arbNum(), (x, y) => {
                assert.strictEqual(cmp(x, y), x[Ord.cmp](y));
            }),
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
                    assert.strictEqual(icmp([a], []), greater);
                    assert.strictEqual(icmp([], [b]), less);
                    assert.strictEqual(
                        icmp([a, x], [b]),
                        cmb(cmp(a, b), greater),
                    );
                    assert.strictEqual(icmp([a], [b, y]), cmb(cmp(a, b), less));
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
            fc.property(arbNum(), arbNum(), (x, y) => {
                assert.strictEqual(lt(x, y), cmp(x, y).isLt());
            }),
        );
    });

    specify("gt", () => {
        fc.assert(
            fc.property(arbNum(), arbNum(), (x, y) => {
                assert.strictEqual(gt(x, y), cmp(x, y).isGt());
            }),
        );
    });

    specify("le", () => {
        fc.assert(
            fc.property(arbNum(), arbNum(), (x, y) => {
                assert.strictEqual(le(x, y), cmp(x, y).isLe());
            }),
        );
    });

    specify("ge", () => {
        fc.assert(
            fc.property(arbNum(), arbNum(), (x, y) => {
                assert.strictEqual(ge(x, y), cmp(x, y).isGe());
            }),
        );
    });

    specify("min", () => {
        fc.assert(
            fc.property(arbNum(), arbNum(), (x, y) => {
                assert.deepEqual(min(x, y), mkNum(Math.min(x.val, y.val)));
            }),
        );
    });

    specify("max", () => {
        fc.assert(
            fc.property(arbNum(), arbNum(), (x, y) => {
                assert.deepEqual(max(x, y), mkNum(Math.max(x.val, y.val)));
            }),
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
    specify("[Eq.eq]", () => {
        const t0 = eq(less, less);
        assert.strictEqual(t0, true);

        const t1 = eq(less, equal);
        assert.strictEqual(t1, false);

        const t2 = eq(less, greater);
        assert.strictEqual(t2, false);

        const t3 = eq(equal, less);
        assert.strictEqual(t3, false);

        const t4 = eq(equal, equal);
        assert.strictEqual(t4, true);

        const t5 = eq(equal, greater);
        assert.strictEqual(t5, false);

        const t6 = eq(greater, less);
        assert.strictEqual(t6, false);

        const t7 = eq(greater, equal);
        assert.strictEqual(t7, false);

        const t8 = eq(greater, greater);
        assert.strictEqual(t8, true);
    });

    specify("[Ord.cmp]", () => {
        const t0 = cmp(less, less);
        assert.strictEqual(t0, equal);

        const t1 = cmp(less, equal);
        assert.strictEqual(t1, less);

        const t2 = cmp(less, greater);
        assert.strictEqual(t2, less);

        const t3 = cmp(equal, less);
        assert.strictEqual(t3, greater);

        const t4 = cmp(equal, equal);
        assert.strictEqual(t4, equal);

        const t5 = cmp(equal, greater);
        assert.strictEqual(t5, less);

        const t6 = cmp(greater, less);
        assert.strictEqual(t6, greater);

        const t7 = cmp(greater, equal);
        assert.strictEqual(t7, greater);

        const t8 = cmp(greater, greater);
        assert.strictEqual(t8, equal);
    });

    specify("[Semigroup.cmb]", () => {
        const t0 = cmb(less, less);
        assert.strictEqual(t0, less);

        const t1 = cmb(less, equal);
        assert.strictEqual(t1, less);

        const t2 = cmb(less, greater);
        assert.strictEqual(t2, less);

        const t3 = cmb(equal, less);
        assert.strictEqual(t3, less);

        const t4 = cmb(equal, equal);
        assert.strictEqual(t4, equal);

        const t5 = cmb(equal, greater);
        assert.strictEqual(t5, greater);

        const t6 = cmb(greater, less);
        assert.strictEqual(t6, greater);

        const t7 = cmb(greater, equal);
        assert.strictEqual(t7, greater);

        const t8 = cmb(greater, greater);
        assert.strictEqual(t8, greater);
    });

    specify("isEq", () => {
        const t0 = less.isEq();
        assert.strictEqual(t0, false);

        const t1 = equal.isEq();
        assert.strictEqual(t1, true);

        const t2 = greater.isEq();
        assert.strictEqual(t2, false);
    });

    specify("isNe", () => {
        const t0 = less.isNe();
        assert.strictEqual(t0, true);

        const t1 = equal.isNe();
        assert.strictEqual(t1, false);

        const t2 = greater.isNe();
        assert.strictEqual(t2, true);
    });

    specify("isLt", () => {
        const t0 = less.isLt();
        assert.strictEqual(t0, true);

        const t1 = equal.isLt();
        assert.strictEqual(t1, false);

        const t2 = greater.isLt();
        assert.strictEqual(t2, false);
    });

    specify("isGt", () => {
        const t0 = less.isGt();
        assert.strictEqual(t0, false);

        const t1 = equal.isGt();
        assert.strictEqual(t1, false);

        const t2 = greater.isGt();
        assert.strictEqual(t2, true);
    });

    specify("isLe", () => {
        const t0 = less.isLe();
        assert.strictEqual(t0, true);

        const t1 = equal.isLe();
        assert.strictEqual(t1, true);

        const t2 = greater.isLe();
        assert.strictEqual(t2, false);
    });

    specify("isGe", () => {
        const t0 = less.isGe();
        assert.strictEqual(t0, false);

        const t1 = equal.isGe();
        assert.strictEqual(t1, true);

        const t2 = greater.isGe();
        assert.strictEqual(t2, true);
    });

    specify("reverse", () => {
        const t0 = less.reverse();
        assert.strictEqual(t0, greater);

        const t1 = equal.reverse();
        assert.strictEqual(t1, equal);

        const t2 = greater.reverse();
        assert.strictEqual(t2, less);
    });
});

describe("Reverse", () => {
    specify("[Eq.eq]", () => {
        fc.assert(
            fc.property(arbRevNum(), arbRevNum(), (x, y) => {
                assert.strictEqual(eq(x, y), eq(x.val, y.val));
            }),
        );
    });

    specify("[Ord.cmp]", () => {
        fc.assert(
            fc.property(arbRevNum(), arbRevNum(), (x, y) => {
                assert.strictEqual(cmp(x, y), cmp(x.val, y.val).reverse());
            }),
        );
    });

    specify("[Semigroup.cmb]", () => {
        fc.assert(
            fc.property(arbRevStr(), arbRevStr(), (x, y) => {
                assert.deepEqual(cmb(x, y), mkReverse(cmb(x.val, y.val)));
            }),
        );
    });
});
