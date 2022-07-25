import * as fc from "fast-check";
import { assert } from "chai";
import { arbNum, arbStr, mkStr, pair, pairNamed } from "./common.js";
import {
  accept,
  accepted,
  cmp,
  combine,
  dispute,
  disputed,
  eq,
  greater,
  left,
  less,
  liftNamedValidated,
  liftNewValidated,
  liftValidated,
  right,
  traverseValidated,
  tupledValidated,
  unvalidated,
  type Validated,
  validated,
  zipValidated,
} from "../src/index.js";

function mk<A, B>(t: "D" | "A", x: A, y: B): Validated<A, B> {
  return t === "D" ? dispute(x) : accept(y);
}

const _1 = 1 as const;
const _2 = 2 as const;
const _3 = 3 as const;
const _4 = 4 as const;

const sa = mkStr("a");
const sc = mkStr("c");

describe("Validated", () => {
  specify("[Eq.eq]", () => {
    fc.assert(
      fc.property(arbNum(), arbNum(), (x, y) => {
        const t0 = eq(dispute(x), dispute(y));
        assert.strictEqual(t0, eq(x, y));

        const t1 = eq(dispute(x), accept(y));
        assert.strictEqual(t1, false);

        const t2 = eq(accept(x), dispute(y));
        assert.strictEqual(t2, false);

        const t3 = eq(accept(x), accept(y));
        assert.strictEqual(t3, eq(x, y));
      }),
    );
  });

  specify("[Ord.cmp]", () => {
    fc.assert(
      fc.property(arbNum(), arbNum(), (x, y) => {
        const t0 = cmp(dispute(x), dispute(y));
        assert.strictEqual(t0, cmp(x, y));

        const t1 = cmp(dispute(x), accept(y));
        assert.strictEqual(t1, less);

        const t2 = cmp(accept(x), dispute(y));
        assert.strictEqual(t2, greater);

        const t3 = cmp(accept(x), accept(y));
        assert.strictEqual(t3, cmp(x, y));
      }),
    );
  });

  specify("[Semigroup.combine]", () => {
    fc.assert(
      fc.property(arbStr(), arbStr(), (x, y) => {
        const t0 = combine(dispute(x), dispute(y));
        assert.deepEqual(t0, dispute(combine(x, y)));

        const t1 = combine(dispute(x), accept(y));
        assert.deepEqual(t1, dispute(x));

        const t2 = combine(accept(x), dispute(y));
        assert.deepEqual(t2, dispute(y));

        const t3 = combine(accept(x), accept(y));
        assert.deepEqual(t3, accept(combine(x, y)));
      }),
    );
  });

  specify("fold", () => {
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

  specify("bindAccepted", () => {
    const t0 = mk("D", _1, _2).bindAccepted((x) => mk("D", _3, pair(x, _4)));
    assert.deepEqual(t0, dispute(_1));

    const t1 = mk("D", _1, _2).bindAccepted((x) => mk("A", _3, pair(x, _4)));
    assert.deepEqual(t1, dispute(_1));

    const t2 = mk("A", _1, _2).bindAccepted((x) => mk("D", _3, pair(x, _4)));
    assert.deepEqual(t2, dispute(_3));

    const t3 = mk("A", _1, _2).bindAccepted((x) => mk("A", _3, pair(x, _4)));
    assert.deepEqual(t3, accept([_2, _4] as const));
  });

  specify("zipWith", () => {
    const t0 = mk("D", sa, _2).zipWith(mk("D", sc, _4), pair);
    assert.deepEqual(t0, dispute(combine(sa, sc)));

    const t1 = mk("D", sa, _2).zipWith(mk("A", sc, _4), pair);
    assert.deepEqual(t1, dispute(sa));

    const t2 = mk("A", sa, _2).zipWith(mk("D", sc, _4), pair);
    assert.deepEqual(t2, dispute(sc));

    const t3 = mk("A", sa, _2).zipWith(mk("A", sc, _4), pair);
    assert.deepEqual(t3, accept([_2, _4] as const));
  });

  specify("zipFst", () => {
    const t0 = mk("A", sa, _2).zipFst(mk("A", sc, _4));
    assert.deepEqual(t0, accept(_2));
  });

  specify("zipSnd", () => {
    const t0 = mk("A", sa, _2).zipSnd(mk("A", sc, _4));
    assert.deepEqual(t0, accept(_4));
  });

  specify("map", () => {
    const t0 = mk("D", _1, _2).map((x) => pair(x, _4));
    assert.deepEqual(t0, dispute(_1));

    const t1 = mk("A", _1, _2).map((x) => pair(x, _4));
    assert.deepEqual(t1, accept([_2, _4] as const));
  });

  specify("mapTo", () => {
    const t0 = mk("D", _1, _2).mapTo(_4);
    assert.deepEqual(t0, dispute(_1));

    const t1 = mk("A", _1, _2).mapTo(_4);
    assert.deepEqual(t1, accept(_4));
  });

  specify("mapDisputed", () => {
    const t0 = mk("D", _1, _2).mapDisputed((x) => pair(x, _3));
    assert.deepEqual(t0, dispute([_1, _3] as const));

    const t1 = mk("A", _1, _2).mapDisputed((x) => pair(x, _3));
    assert.deepEqual(t1, accept(_2));
  });

  specify("bimap", () => {
    const t0 = mk("D", _1, _2).bimap(
      (x) => pair(x, _3),
      (x) => pair(x, _4),
    );
    assert.deepEqual(t0, dispute([_1, _3] as const));

    const t1 = mk("A", _1, _2).bimap(
      (x) => pair(x, _3),
      (x) => pair(x, _4),
    );
    assert.deepEqual(t1, accept([_2, _4] as const));
  });

  specify("disputedOrFold", () => {
    const t0 = mk("D", _1, _2).disputedOrFold((x) => pair(x, _4));
    assert.strictEqual(t0, _1);

    const t1 = mk("A", _1, _2).disputedOrFold((x) => pair(x, _4));
    assert.deepEqual(t1, [_2, _4]);
  });

  specify("acceptedOrFold", () => {
    const t0 = mk("D", _1, _2).acceptedOrFold((x) => pair(x, _3));
    assert.deepEqual(t0, [_1, _3]);

    const t1 = mk("A", _1, _2).acceptedOrFold((x) => pair(x, _3));
    assert.strictEqual(t1, _2);
  });

  specify("disputed", () => {
    const t0 = disputed(mk("D", _1, _2));
    assert.strictEqual(t0, true);

    const t1 = disputed(mk("A", _1, _2));
    assert.strictEqual(t1, false);
  });

  specify("accepted", () => {
    const t0 = accepted(mk("D", _1, _2));
    assert.strictEqual(t0, false);

    const t1 = accepted(mk("A", _1, _2));
    assert.strictEqual(t1, true);
  });

  specify("validated", () => {
    const t0 = validated(left<1, 2>(_1));
    assert.deepEqual(t0, dispute(_1));

    const t1 = validated(right<2, 1>(_2));
    assert.deepEqual(t1, accept(_2));
  });

  specify("unvalidated", () => {
    const t0 = unvalidated(dispute<1, 2>(_1));
    assert.deepEqual(t0, left(_1));

    const t1 = unvalidated(accept<2, 1>(_2));
    assert.deepEqual(t1, right(_2));
  });

  specify("traverseValidated", () => {
    const t0 = traverseValidated(["x", "y"], (x) =>
      mk("D", sa, x.toUpperCase()),
    );
    assert.deepEqual(t0, dispute(combine(sa, sa)));

    const t1 = traverseValidated(["x", "y"], (x) =>
      mk("A", sa, x.toUpperCase()),
    );
    assert.deepEqual(t1, accept(["X", "Y"]));
  });

  specify("zipValidated", () => {
    const t0 = zipValidated([mk("D", sa, _2), mk("D", sc, _4)]);
    assert.deepEqual(t0, dispute(combine(sa, sc)));

    const t1 = zipValidated([mk("D", sa, _2), mk("A", sc, _4)]);
    assert.deepEqual(t1, dispute(sa));

    const t2 = zipValidated([mk("A", sa, _2), mk("D", sc, _4)]);
    assert.deepEqual(t2, dispute(sc));

    const t3 = zipValidated([mk("A", sa, _2), mk("A", sc, _4)]);
    assert.deepEqual(t3, accept([_2, _4] as const));
  });

  specify("tupledValidated", () => {
    const t4 = tupledValidated(mk("A", sa, _2), mk("A", sc, _4));
    assert.deepEqual(t4, accept([_2, _4] as const));
  });

  specify("liftValidated", () => {
    const f = liftValidated(pair<2, 4>);
    const t0 = f(mk("A", sa, _2), mk("A", sc, _4));
    assert.deepEqual(t0, accept([_2, _4] as const));
  });

  specify("liftNamedValidated", () => {
    const f = liftNamedValidated(pairNamed<2, 4>);
    const t0 = f({ x: mk("A", sa, _2), y: mk("A", sc, _4) });
    assert.deepEqual(t0, accept([_2, _4] as const));
  });

  specify("liftNewValidated", () => {
    const f = liftNewValidated(Array<2 | 4>);
    const t0 = f(mk("A", sa, _2), mk("A", sc, _4));
    assert.deepEqual(t0, accept([_2, _4]));
  });
});
