import * as fc from "fast-check";
import { assert } from "chai";
import { arbStr, pair, pairNamed } from "./common.js";
import {
  combine,
  doEval,
  evalAlways,
  evalNow,
  evalOnce,
  gatherEval,
  liftEval,
  liftNamedEval,
  liftNewEval,
  reduceEval,
  runEval,
  traverseEval,
  tupledEval,
  zipEval,
} from "../src/index.js";

const mk = evalNow;

const _1 = 1 as const;
const _2 = 2 as const;

describe("Eval", () => {
  specify("[Semigroup.combine]", () => {
    fc.assert(
      fc.property(arbStr(), arbStr(), (x, y) => {
        const t0 = combine(mk(x), mk(y));
        assert.deepEqual(runEval(t0), combine(x, y));
      }),
    );
  });

  specify("flatMap", () => {
    const t0 = mk(_1).flatMap((x) => mk(pair(x, _2)));
    assert.deepEqual(runEval(t0), [_1, _2]);
  });

  specify("flat", () => {
    const t0 = mk(mk(_1)).flat();
    assert.strictEqual(runEval(t0), _1);
  });

  specify("zipWith", () => {
    const t0 = mk(_1).zipWith(mk(_2), pair);
    assert.deepEqual(runEval(t0), [_1, _2]);
  });

  specify("zipFst", () => {
    const t0 = mk(_1).zipFst(mk(_2));
    assert.strictEqual(runEval(t0), _1);
  });

  specify("zipSnd", () => {
    const t0 = mk(_1).zipSnd(mk(_2));
    assert.strictEqual(runEval(t0), _2);
  });

  specify("map", () => {
    const t0 = mk(_1).map((x) => pair(x, _2));
    assert.deepEqual(runEval(t0), [_1, _2]);
  });

  specify("mapTo", () => {
    const t0 = mk(_1).mapTo(_2);
    assert.strictEqual(runEval(t0), _2);
  });

  specify("evalAlways", () => {
    function f() {
      f.counter++;
      return _1;
    }
    f.counter = 0;

    const t0 = evalAlways(f);
    const t1 = t0.flatMap((x) => t0.map((y) => pair(x, y)));

    assert.deepEqual(runEval(t1), [_1, _1]);
    assert.strictEqual(f.counter, 2);
  });

  specify("evalOnce", () => {
    function f() {
      f.counter++;
      return _1;
    }
    f.counter = 0;

    const t0 = evalOnce(f);
    const t1 = t0.flatMap((x) => t0.map((y) => pair(x, y)));

    assert.deepEqual(runEval(t1), [_1, _1]);
    assert.strictEqual(f.counter, 1);
  });

  specify("doEval", () => {
    const t0 = doEval(function* () {
      const x = yield* mk(_1);
      const [y, z] = yield* mk(pair(x, _2));
      return [x, y, z] as const;
    });
    assert.deepEqual(runEval(t0), [_1, _1, _2]);
  });

  specify("reduceEval", () => {
    const t0 = reduceEval(["x", "y"], (xs, x) => mk(xs + x), "");
    assert.deepEqual(runEval(t0), "xy");
  });

  specify("traverseEval", () => {
    const t0 = traverseEval(["x", "y"], (x) => mk(x.toUpperCase()));
    assert.deepEqual(runEval(t0), ["X", "Y"]);
  });

  specify("zipEval", () => {
    const t0 = zipEval([mk(_1), mk(_2)] as const);
    assert.deepEqual(runEval(t0), [_1, _2]);
  });

  specify("tupledEval", () => {
    const t0 = tupledEval(mk(_1), mk(_2));
    assert.deepEqual(runEval(t0), [_1, _2]);
  });

  specify("gatherEval", () => {
    const t0 = gatherEval({ x: mk(_1), y: mk(_2) });
    assert.deepEqual(runEval(t0), { x: _1, y: _2 });
  });

  specify("liftEval", () => {
    const f = liftEval(pair);
    const t0 = f(mk(_1), mk(_2));
    assert.deepEqual(runEval(t0), [_1, _2]);
  });

  specify("liftNamedEval", () => {
    const f = liftNamedEval(pairNamed);
    const t0 = f({ x: mk(_1), y: mk(_2) });
    assert.deepEqual(runEval(t0), [_1, _2]);
  });

  specify("liftNewEval", () => {
    const f = liftNewEval(Array<1 | 2>);
    const t0 = f(mk(_1), mk(_2));
    assert.deepEqual(runEval(t0), [_1, _2]);
  });
});
