import * as fc from "fast-check";
import { assert } from "chai";
import { arbNum, arbStr, mkNum, type Num, type Str } from "./common";
import {
  clamp,
  cmp,
  combine,
  type Down,
  eq,
  equal,
  ge,
  greater,
  gt,
  icmp,
  le,
  less,
  lt,
  max,
  min,
  mkDown,
  Ord,
  ordEq,
  ordGe,
  ordGt,
  ordLe,
  ordLt,
  reverseOrdering,
} from "../src";

function arbDownNum(): fc.Arbitrary<Down<Num>> {
  return arbNum().map(mkDown);
}

function arbDownStr(): fc.Arbitrary<Down<Str>> {
  return arbStr().map(mkDown);
}

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
      fc.property(arbNum(), arbNum(), arbNum(), arbNum(), (a, x, b, y) => {
        assert.strictEqual(icmp([a], []), greater);
        assert.strictEqual(icmp([], [b]), less);
        assert.strictEqual(icmp([a, x], [b]), combine(cmp(a, b), greater));
        assert.strictEqual(icmp([a], [b, y]), combine(cmp(a, b), less));
        assert.strictEqual(icmp([a, x], [b, y]), combine(cmp(a, b), cmp(x, y)));
      }),
    );
  });

  specify("lt", () => {
    fc.assert(
      fc.property(arbNum(), arbNum(), (x, y) => {
        assert.strictEqual(lt(x, y), ordLt(cmp(x, y)));
      }),
    );
  });

  specify("gt", () => {
    fc.assert(
      fc.property(arbNum(), arbNum(), (x, y) => {
        assert.strictEqual(gt(x, y), ordGt(cmp(x, y)));
      }),
    );
  });

  specify("le", () => {
    fc.assert(
      fc.property(arbNum(), arbNum(), (x, y) => {
        assert.strictEqual(le(x, y), ordLe(cmp(x, y)));
      }),
    );
  });

  specify("ge", () => {
    fc.assert(
      fc.property(arbNum(), arbNum(), (x, y) => {
        assert.strictEqual(ge(x, y), ordGe(cmp(x, y)));
      }),
    );
  });

  specify("min", () => {
    fc.assert(
      fc.property(arbNum(), arbNum(), (x, y) => {
        assert.deepEqual(min(x, y), mkNum(Math.min(x.x, y.x)));
      }),
    );
  });

  specify("max", () => {
    fc.assert(
      fc.property(arbNum(), arbNum(), (x, y) => {
        assert.deepEqual(max(x, y), mkNum(Math.max(x.x, y.x)));
      }),
    );
  });

  specify("clamp", () => {
    fc.assert(
      fc.property(arbNum(), arbNum(), arbNum(), (x, y, z) => {
        assert.deepEqual(clamp(x, y, z), min(z, max(y, x)));
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

  specify("[Semigroup.combine]", () => {
    const t0 = combine(less, less);
    assert.strictEqual(t0, less);

    const t1 = combine(less, equal);
    assert.strictEqual(t1, less);

    const t2 = combine(less, greater);
    assert.strictEqual(t2, less);

    const t3 = combine(equal, less);
    assert.strictEqual(t3, less);

    const t4 = combine(equal, equal);
    assert.strictEqual(t4, equal);

    const t5 = combine(equal, greater);
    assert.strictEqual(t5, greater);

    const t6 = combine(greater, less);
    assert.strictEqual(t6, greater);

    const t7 = combine(greater, equal);
    assert.strictEqual(t7, greater);

    const t8 = combine(greater, greater);
    assert.strictEqual(t8, greater);
  });

  specify("ordLt", () => {
    const t0 = ordLt(less);
    assert.strictEqual(t0, true);

    const t1 = ordLt(equal);
    assert.strictEqual(t1, false);

    const t2 = ordLt(greater);
    assert.strictEqual(t2, false);
  });

  specify("ordLe", () => {
    const t0 = ordLe(less);
    assert.strictEqual(t0, true);

    const t1 = ordLe(equal);
    assert.strictEqual(t1, true);

    const t2 = ordLe(greater);
    assert.strictEqual(t2, false);
  });

  specify("ordEq", () => {
    const t0 = ordEq(less);
    assert.strictEqual(t0, false);

    const t1 = ordEq(equal);
    assert.strictEqual(t1, true);

    const t2 = ordEq(greater);
    assert.strictEqual(t2, false);
  });

  specify("ordGe", () => {
    const t0 = ordGe(less);
    assert.strictEqual(t0, false);

    const t1 = ordGe(equal);
    assert.strictEqual(t1, true);

    const t2 = ordGe(greater);
    assert.strictEqual(t2, true);
  });

  specify("ordGt", () => {
    const t0 = ordGt(less);
    assert.strictEqual(t0, false);

    const t1 = ordGt(equal);
    assert.strictEqual(t1, false);

    const t2 = ordGt(greater);
    assert.strictEqual(t2, true);
  });

  specify("reverseOrdering", () => {
    const t0 = reverseOrdering(less);
    assert.strictEqual(t0, greater);

    const t1 = reverseOrdering(equal);
    assert.strictEqual(t1, equal);

    const t2 = reverseOrdering(greater);
    assert.strictEqual(t2, less);
  });
});

describe("Down", () => {
  specify("[Eq.eq]", () => {
    fc.assert(
      fc.property(arbDownNum(), arbDownNum(), (x, y) => {
        assert.strictEqual(eq(x, y), eq(x.value, y.value));
      }),
    );
  });

  specify("[Ord.cmp]", () => {
    fc.assert(
      fc.property(arbDownNum(), arbDownNum(), (x, y) => {
        assert.strictEqual(cmp(x, y), reverseOrdering(cmp(x.value, y.value)));
      }),
    );
  });

  specify("[Semigroup.combine]", () => {
    fc.assert(
      fc.property(arbDownStr(), arbDownStr(), (x, y) => {
        assert.deepEqual(combine(x, y), mkDown(combine(x.value, y.value)));
      }),
    );
  });
});
