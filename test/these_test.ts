import * as fc from "fast-check";
import { assert } from "chai";
import { arbNum, arbStr, mkStr, pair, pairNamed } from "./common.js";
import { eq } from "../src/eq.js";
import { cmp, greater, less } from "../src/ord.js";
import {
  both,
  doAsyncThese,
  doThese,
  first,
  here,
  liftNamedThese,
  liftNewThese,
  liftThese,
  paired,
  reduceThese,
  second,
  there,
  type These,
  traverseThese,
  tupledThese,
  zipThese,
} from "../src/these.js";
import { combine } from "../src/semigroup.js";

function mk<A, B>(t: "F" | "S" | "B", x: A, y: B): These<A, B> {
  return t === "F" ? first(x) : t === "S" ? second(y) : both(x, y);
}

function mkA<A, B>(t: "F" | "S" | "B", x: A, y: B): Promise<These<A, B>> {
  return Promise.resolve(
    t === "F" ? first(x) : t === "S" ? second(y) : both(x, y),
  );
}

const _1 = 1 as const;
const _2 = 2 as const;
const _3 = 3 as const;
const _4 = 4 as const;

const sa = mkStr("a");
const sc = mkStr("c");

describe("These", () => {
  specify("[Eq.eq]", () => {
    fc.assert(
      fc.property(arbNum(), arbNum(), arbNum(), arbNum(), (a, x, b, y) => {
        const t0 = eq(first(a), first(b));
        assert.strictEqual(t0, eq(a, b));

        const t1 = eq(first(a), second(y));
        assert.strictEqual(t1, false);

        const t2 = eq(first(a), both(b, y));
        assert.strictEqual(t2, false);

        const t3 = eq(second(x), first(b));
        assert.strictEqual(t3, false);

        const t4 = eq(second(x), second(y));
        assert.strictEqual(t4, eq(x, y));

        const t5 = eq(second(x), both(b, y));
        assert.strictEqual(t5, false);

        const t6 = eq(both(a, x), first(b));
        assert.strictEqual(t6, false);

        const t7 = eq(both(a, x), second(y));
        assert.strictEqual(t7, false);

        const t8 = eq(both(a, x), both(b, y));
        assert.strictEqual(t8, eq(a, b) && eq(x, y));
      }),
    );
  });

  specify("[Ord.cmp]", () => {
    fc.assert(
      fc.property(arbNum(), arbNum(), arbNum(), arbNum(), (a, x, b, y) => {
        const t0 = cmp(first(a), first(b));
        assert.strictEqual(t0, cmp(a, b));

        const t1 = cmp(first(a), second(y));
        assert.strictEqual(t1, less);

        const t2 = cmp(first(a), both(b, y));
        assert.strictEqual(t2, less);

        const t3 = cmp(second(x), first(b));
        assert.strictEqual(t3, greater);

        const t4 = cmp(second(x), second(y));
        assert.strictEqual(t4, cmp(x, y));

        const t5 = cmp(second(x), both(b, y));
        assert.strictEqual(t5, less);

        const t6 = cmp(both(a, x), first(b));
        assert.strictEqual(t6, greater);

        const t7 = cmp(both(a, x), second(y));
        assert.strictEqual(t7, greater);

        const t8 = cmp(both(a, x), both(b, y));
        assert.strictEqual(t8, combine(cmp(a, b), cmp(x, y)));
      }),
    );
  });

  specify("[Semigroup.combine]", () => {
    fc.assert(
      fc.property(arbStr(), arbStr(), arbStr(), arbStr(), (a, x, b, y) => {
        const t0 = combine(first(a), first(b));
        assert.deepEqual(t0, first(combine(a, b)));

        const t1 = combine(first(a), second(y));
        assert.deepEqual(t1, both(a, y));

        const t2 = combine(first(a), both(b, y));
        assert.deepEqual(t2, both(combine(a, b), y));

        const t3 = combine(second(x), first(b));
        assert.deepEqual(t3, both(b, x));

        const t4 = combine(second(x), second(y));
        assert.deepEqual(t4, second(combine(x, y)));

        const t5 = combine(second(x), both(b, y));
        assert.deepEqual(t5, both(b, combine(x, y)));

        const t6 = combine(both(a, x), first(b));
        assert.deepEqual(t6, both(combine(a, b), x));

        const t7 = combine(both(a, x), second(y));
        assert.deepEqual(t7, both(a, combine(x, y)));

        const t8 = combine(both(a, x), both(b, y));
        assert.deepEqual(t8, both(combine(a, b), combine(x, y)));
      }),
    );
  });

  specify("fold", () => {
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

  specify("flatMap", () => {
    const t0 = mk("F", sa, _2).flatMap((x) => mk("F", sc, pair(x, _4)));
    assert.deepEqual(t0, first(sa));

    const t1 = mk("F", sa, _2).flatMap((x) => mk("S", sc, pair(x, _4)));
    assert.deepEqual(t1, first(sa));

    const t2 = mk("F", sa, _2).flatMap((x) => mk("B", sc, pair(x, _4)));
    assert.deepEqual(t2, first(sa));

    const t3 = mk("S", sa, _2).flatMap((x) => mk("F", sc, pair(x, _4)));
    assert.deepEqual(t3, first(sc));

    const t4 = mk("S", sa, _2).flatMap((x) => mk("S", sc, pair(x, _4)));
    assert.deepEqual(t4, second([_2, _4] as const));

    const t5 = mk("S", sa, _2).flatMap((x) => mk("B", sc, pair(x, _4)));
    assert.deepEqual(t5, both(sc, [_2, _4] as const));

    const t6 = mk("B", sa, _2).flatMap((x) => mk("F", sc, pair(x, _4)));
    assert.deepEqual(t6, first(combine(sa, sc)));

    const t7 = mk("B", sa, _2).flatMap((x) => mk("S", sc, pair(x, _4)));
    assert.deepEqual(t7, both(sa, [_2, _4] as const));

    const t8 = mk("B", sa, _2).flatMap((x) => mk("B", sc, pair(x, _4)));
    assert.deepEqual(t8, both(combine(sa, sc), [_2, _4] as const));
  });

  specify("flat", () => {
    const t0 = mk("B", sa, mk("B", sc, _2)).flat();
    assert.deepEqual(t0, both(combine(sa, sc), _2));
  });

  specify("zipWith", () => {
    const t0 = mk("B", sa, _2).zipWith(mk("B", sc, _4), pair);
    assert.deepEqual(t0, both(combine(sa, sc), [_2, _4] as const));
  });

  specify("zipFst", () => {
    const t0 = mk("B", sa, _2).zipFst(mk("B", sc, _4));
    assert.deepEqual(t0, both(combine(sa, sc), _2));
  });

  specify("zipSnd", () => {
    const t0 = mk("B", sa, _2).zipSnd(mk("B", sc, _4));
    assert.deepEqual(t0, both(combine(sa, sc), _4));
  });

  specify("map", () => {
    const t0 = mk("F", _1, _2).map((x) => pair(x, _4));
    assert.deepEqual(t0, first(_1));

    const t1 = mk("S", _1, _2).map((x) => pair(x, _4));
    assert.deepEqual(t1, second([_2, _4] as const));

    const t2 = mk("B", _1, _2).map((x) => pair(x, _4));
    assert.deepEqual(t2, both(_1, [_2, _4] as const));
  });

  specify("mapTo", () => {
    const t0 = mk("B", _1, _2).mapTo(_4);
    assert.deepEqual(t0, both(_1, _4));
  });

  specify("mapFirst", () => {
    const t0 = mk("F", _1, _2).mapFirst((x) => pair(x, _3));
    assert.deepEqual(t0, first([_1, _3] as const));

    const t1 = mk("S", _1, _2).mapFirst((x) => pair(x, _3));
    assert.deepEqual(t1, second(_2));

    const t2 = mk("B", _1, _2).mapFirst((x) => pair(x, _3));
    assert.deepEqual(t2, both([_1, _3] as const, _2));
  });

  specify("bimap", () => {
    const t0 = mk("F", _1, _2).bimap(
      (x) => pair(x, _3),
      (x) => pair(x, _4),
    );
    assert.deepEqual(t0, first([_1, _3] as const));

    const t1 = mk("S", _1, _2).bimap(
      (x) => pair(x, _3),
      (x) => pair(x, _4),
    );
    assert.deepEqual(t1, second([_2, _4] as const));

    const t2 = mk("B", _1, _2).bimap(
      (x) => pair(x, _3),
      (x) => pair(x, _4),
    );
    assert.deepEqual(t2, both([_1, _3] as const, [_2, _4] as const));
  });

  specify("here", () => {
    const t0 = here(mk("F", _1, _2));
    assert.strictEqual(t0, true);

    const t1 = here(mk("S", _1, _2));
    assert.strictEqual(t1, false);

    const t2 = here(mk("B", _1, _2));
    assert.strictEqual(t2, false);
  });

  specify("there", () => {
    const t0 = there(mk("F", _1, _2));
    assert.strictEqual(t0, false);

    const t1 = there(mk("S", _1, _2));
    assert.strictEqual(t1, true);

    const t2 = there(mk("B", _1, _2));
    assert.strictEqual(t2, false);
  });

  specify("paired", () => {
    const t0 = paired(mk("F", _1, _2));
    assert.strictEqual(t0, false);

    const t1 = paired(mk("S", _1, _2));
    assert.strictEqual(t1, false);

    const t2 = paired(mk("B", _1, _2));
    assert.strictEqual(t2, true);
  });

  specify("doThese", () => {
    const t0 = doThese(function* () {
      const x = yield* mk("F", sa, _2);
      const [y, z] = yield* mk("F", sc, pair(x, _4));
      return [x, y, z] as const;
    });
    assert.deepEqual(t0, first(sa));

    const t1 = doThese(function* () {
      const x = yield* mk("F", sa, _2);
      const [y, z] = yield* mk("S", sc, pair(x, _4));
      return [x, y, z] as const;
    });
    assert.deepEqual(t1, first(sa));

    const t2 = doThese(function* () {
      const x = yield* mk("F", sa, _2);
      const [y, z] = yield* mk("B", sc, pair(x, _4));
      return [x, y, z] as const;
    });
    assert.deepEqual(t2, first(sa));

    const t3 = doThese(function* () {
      const x = yield* mk("S", sa, _2);
      const [y, z] = yield* mk("F", sc, pair(x, _4));
      return [x, y, z] as const;
    });
    assert.deepEqual(t3, first(sc));

    const t4 = doThese(function* () {
      const x = yield* mk("S", sa, _2);
      const [y, z] = yield* mk("S", sc, pair(x, _4));
      return [x, y, z] as const;
    });
    assert.deepEqual(t4, second([_2, _2, _4] as const));

    const t5 = doThese(function* () {
      const x = yield* mk("S", sa, _2);
      const [y, z] = yield* mk("B", sc, pair(x, _4));
      return [x, y, z] as const;
    });
    assert.deepEqual(t5, both(sc, [_2, _2, _4] as const));

    const t6 = doThese(function* () {
      const x = yield* mk("B", sa, _2);
      const [y, z] = yield* mk("F", sc, pair(x, _4));
      return [x, y, z] as const;
    });
    assert.deepEqual(t6, first(combine(sa, sc)));

    const t7 = doThese(function* () {
      const x = yield* mk("B", sa, _2);
      const [y, z] = yield* mk("S", sc, pair(x, _4));
      return [x, y, z] as const;
    });
    assert.deepEqual(t7, both(sa, [_2, _2, _4] as const));

    const t8 = doThese(function* () {
      const x = yield* mk("B", sa, _2);
      const [y, z] = yield* mk("B", sc, pair(x, _4));
      return [x, y, z] as const;
    });
    assert.deepEqual(t8, both(combine(sa, sc), [_2, _2, _4] as const));
  });

  specify("reduceThese", () => {
    const t0 = reduceThese(["x", "y"], (xs, x) => mk("B", sa, xs + x), "");
    assert.deepEqual(t0, both(combine(sa, sa), "xy"));
  });

  specify("traverseThese", () => {
    const t0 = traverseThese(["x", "y"], (x) => mk("B", sa, x.toUpperCase()));
    assert.deepEqual(t0, both(combine(sa, sa), ["X", "Y"]));
  });

  specify("zipThese", () => {
    const t0 = zipThese([mk("B", sa, _2), mk("B", sc, _4)] as const);
    assert.deepEqual(t0, both(combine(sa, sc), [_2, _4] as const));
  });

  specify("tupledThese", () => {
    const t0 = tupledThese(mk("B", sa, _2), mk("B", sc, _4));
    assert.deepEqual(t0, both(combine(sa, sc), [_2, _4] as const));
  });

  specify("liftThese", () => {
    const f = liftThese(pair<2, 4>);
    const t0 = f(mk("B", sa, _2), mk("B", sc, _4));
    assert.deepEqual(t0, both(combine(sa, sc), [_2, _4] as const));
  });

  specify("liftNamedThese", () => {
    const f = liftNamedThese(pairNamed<2, 4>);
    const t0 = f({ x: mk("B", sa, _2), y: mk("B", sc, _4) });
    assert.deepEqual(t0, both(combine(sa, sc), [_2, _4] as const));
  });

  specify("liftNewThese", () => {
    const f = liftNewThese(Array<2 | 4>);
    const t0 = f(mk("B", sa, _2), mk("B", sc, _4));
    assert.deepEqual(t0, both(combine(sa, sc), [_2, _4]));
  });

  specify("doAsyncThese", async () => {
    const t0 = await doAsyncThese(async function* () {
      const x = yield* await mkA("F", sa, _2);
      const [y, z] = yield* await mkA("F", sc, pair(x, _4));
      return [x, y, z] as const;
    });
    assert.deepEqual(t0, first(sa));

    const t1 = await doAsyncThese(async function* () {
      const x = yield* await mkA("F", sa, _2);
      const [y, z] = yield* await mkA("S", sc, pair(x, _4));
      return [x, y, z] as const;
    });
    assert.deepEqual(t1, first(sa));

    const t2 = await doAsyncThese(async function* () {
      const x = yield* await mkA("F", sa, _2);
      const [y, z] = yield* await mkA("B", sc, pair(x, _4));
      return [x, y, z] as const;
    });
    assert.deepEqual(t2, first(sa));

    const t3 = await doAsyncThese(async function* () {
      const x = yield* await mkA("S", sa, _2);
      const [y, z] = yield* await mkA("F", sc, pair(x, _4));
      return [x, y, z] as const;
    });
    assert.deepEqual(t3, first(sc));

    const t4 = await doAsyncThese(async function* () {
      const x = yield* await mkA("S", sa, _2);
      const [y, z] = yield* await mkA("S", sc, pair(x, _4));
      return [x, y, z] as const;
    });
    assert.deepEqual(t4, second([_2, _2, _4] as const));

    const t5 = await doAsyncThese(async function* () {
      const x = yield* await mkA("S", sa, _2);
      const [y, z] = yield* await mkA("B", sc, pair(x, _4));
      return [x, y, z] as const;
    });
    assert.deepEqual(t5, both(sc, [_2, _2, _4] as const));

    const t6 = await doAsyncThese(async function* () {
      const x = yield* await mkA("B", sa, _2);
      const [y, z] = yield* await mkA("F", sc, pair(x, _4));
      return [x, y, z] as const;
    });
    assert.deepEqual(t6, first(combine(sa, sc)));

    const t7 = await doAsyncThese(async function* () {
      const x = yield* await mkA("B", sa, _2);
      const [y, z] = yield* await mkA("S", sc, pair(x, _4));
      return [x, y, z] as const;
    });
    assert.deepEqual(t7, both(sa, [_2, _2, _4] as const));

    const t8 = await doAsyncThese(async function* () {
      const x = yield* await mkA("B", sa, _2);
      const [y, z] = yield* await mkA("B", sc, pair(x, _4));
      return [x, y, z] as const;
    });
    assert.deepEqual(t8, both(combine(sa, sc), [_2, _2, _4] as const));

    it("unwraps nested promise-like values on bind and return", async () => {
      const t9 = await doAsyncThese(async function* () {
        const x = yield* await mkA("B", sa, Promise.resolve(_2));
        const [y, z] = yield* await mkA("B", sc, Promise.resolve(pair(x, _4)));
        return Promise.resolve([x, y, z] as const);
      });
      assert.deepEqual(t9, both(combine(sa, sc), [_2, _2, _4] as const));
    });
  });
});
