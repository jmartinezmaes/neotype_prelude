import * as fc from "fast-check";
import { assert } from "chai";
import { arbNum, arbStr, pair, pairNamed } from "./common.js";
import { cmb } from "../src/cmb.js";
import { cmp, eq, greater, less } from "../src/cmp.js";
import {
  doEitherAsync,
  doEither,
  type Either,
  gatherEither,
  guardEither,
  left,
  leftsided,
  liftEither,
  liftNamedEither,
  liftNewEither,
  reduceEither,
  right,
  rightsided,
  traverseEither,
  tupledEither,
  viewEither,
  sequenceEither,
} from "../src/either.js";
import { accept, dispute } from "../src/validated.js";

function mk<A, B>(t: "L" | "R", x: A, y: B): Either<A, B> {
  return t === "L" ? left(x) : right(y);
}

function mkA<A, B>(t: "L" | "R", x: A, y: B): Promise<Either<A, B>> {
  return Promise.resolve(t === "L" ? left(x) : right(y));
}

const _1 = 1 as const;
const _2 = 2 as const;
const _3 = 3 as const;
const _4 = 4 as const;

describe("Either", () => {
  specify("[Eq.eq]", () => {
    fc.assert(
      fc.property(arbNum(), arbNum(), (x, y) => {
        const t0 = eq(left(x), left(y));
        assert.strictEqual(t0, eq(x, y));

        const t1 = eq(left(x), right(y));
        assert.strictEqual(t1, false);

        const t2 = eq(right(x), left(y));
        assert.strictEqual(t2, false);

        const t3 = eq(right(x), right(y));
        assert.strictEqual(t3, eq(x, y));
      }),
    );
  });

  specify("[Ord.cmp]", () => {
    fc.assert(
      fc.property(arbNum(), arbNum(), (x, y) => {
        const t0 = cmp(left(x), left(y));
        assert.strictEqual(t0, cmp(x, y));

        const t1 = cmp(left(x), right(y));
        assert.strictEqual(t1, less);

        const t2 = cmp(right(x), left(y));
        assert.strictEqual(t2, greater);

        const t3 = cmp(right(x), right(y));
        assert.strictEqual(t3, cmp(x, y));
      }),
    );
  });

  specify("[Semigroup.cmb]", () => {
    fc.assert(
      fc.property(arbStr(), arbStr(), (x, y) => {
        const t0 = cmb(left(x), left(y));
        assert.deepEqual(t0, left(x));

        const t1 = cmb(left(x), right(y));
        assert.deepEqual(t1, left(x));

        const t2 = cmb(right(x), left(y));
        assert.deepEqual(t2, left(y));

        const t3 = cmb(right(x), right(y));
        assert.deepEqual(t3, right(cmb(x, y)));
      }),
    );
  });

  specify("fold", () => {
    const t0 = mk("L", _1, _2).fold(
      (x) => pair(x, _3),
      (x) => pair(x, _4),
    );
    assert.deepEqual(t0, [_1, _3]);

    const t1 = mk("R", _1, _2).fold(
      (x) => pair(x, _3),
      (x) => pair(x, _4),
    );
    assert.deepEqual(t1, [_2, _4]);
  });

  specify("bindLeft", () => {
    const t0 = mk("L", _1, _2).bindLeft((x) => mk("L", pair(x, _3), _4));
    assert.deepEqual(t0, left([_1, _3] as const));

    const t1 = mk("L", _1, _2).bindLeft((x) => mk("R", pair(x, _3), _4));
    assert.deepEqual(t1, right(_4));

    const t2 = mk("R", _1, _2).bindLeft((x) => mk("L", pair(x, _3), _4));
    assert.deepEqual(t2, right(_2));

    const t3 = mk("R", _1, _2).bindLeft((x) => mk("R", pair(x, _3), _4));
    assert.deepEqual(t3, right(_2));
  });

  specify("orElse", () => {
    const t0 = mk("L", _1, _2).orElse(mk("L", _3, _4));
    assert.deepEqual(t0, left(_3));
  });

  specify("flatMap", () => {
    const t0 = mk("L", _1, _2).flatMap((x) => mk("L", _3, pair(x, _4)));
    assert.deepEqual(t0, left(_1));

    const t1 = mk("L", _1, _2).flatMap((x) => mk("R", _3, pair(x, _4)));
    assert.deepEqual(t1, left(_1));

    const t2 = mk("R", _1, _2).flatMap((x) => mk("L", _3, pair(x, _4)));
    assert.deepEqual(t2, left(_3));

    const t3 = mk("R", _1, _2).flatMap((x) => mk("R", _3, pair(x, _4)));
    assert.deepEqual(t3, right([_2, _4] as const));
  });

  specify("flat", () => {
    const t0 = mk("R", _1, mk("R", _3, _4)).flat();
    assert.deepEqual(t0, right(_4));
  });

  specify("zipWith", () => {
    const t0 = mk("R", _1, _2).zipWith(mk("R", _3, _4), pair);
    assert.deepEqual(t0, right([_2, _4] as const));
  });

  specify("zipFst", () => {
    const t0 = mk("R", _1, _2).zipFst(mk("R", _3, _4));
    assert.deepEqual(t0, right(_2));
  });

  specify("zipSnd", () => {
    const t0 = mk("R", _1, _2).zipSnd(mk("R", _3, _4));
    assert.deepEqual(t0, right(_4));
  });

  specify("map", () => {
    const t0 = mk("R", _1, _2).map((x) => pair(x, _4));
    assert.deepEqual(t0, right([_2, _4] as const));
  });

  specify("mapTo", () => {
    const t0 = mk("R", _1, _2).mapTo(_4);
    assert.deepEqual(t0, right(_4));
  });

  specify("mapLeft", () => {
    const t0 = mk("L", _1, _2).mapLeft((x) => pair(x, _3));
    assert.deepEqual(t0, left([_1, _3] as const));
  });

  specify("bimap", () => {
    const t1 = mk("L", _1, _2).bimap(
      (x) => pair(x, _3),
      (x) => pair(x, _4),
    );
    assert.deepEqual(t1, left([_1, _3] as const));

    const t0 = mk("R", _1, _2).bimap(
      (x) => pair(x, _3),
      (x) => pair(x, _4),
    );
    assert.deepEqual(t0, right([_2, _4] as const));
  });

  specify("leftOrFold", () => {
    const t0 = mk("L", _1, _2).leftOrFold((x) => pair(x, _4));
    assert.strictEqual(t0, _1);

    const t1 = mk("R", _1, _2).leftOrFold((x) => pair(x, _4));
    assert.deepEqual(t1, [_2, _4]);
  });

  specify("rightOrFold", () => {
    const t0 = mk("L", _1, _2).rightOrFold((x) => pair(x, _3));
    assert.deepEqual(t0, [_1, _3]);

    const t1 = mk("R", _1, _2).rightOrFold((x) => pair(x, _3));
    assert.strictEqual(t1, _2);
  });

  specify("guardEither", () => {
    const f = (x: 2 | 4): x is 2 => x === _2;

    const t0 = guardEither(_2 as 2 | 4, f);
    assert.deepEqual(t0, right(_2));

    const t1 = guardEither(_4 as 2 | 4, f);
    assert.deepEqual(t1, left(_4));
  });

  specify("leftsided", () => {
    const t0 = leftsided(mk("L", _1, _2));
    assert.strictEqual(t0, true);

    const t1 = leftsided(mk("R", _1, _2));
    assert.strictEqual(t1, false);
  });

  specify("rightsided", () => {
    const t0 = rightsided(mk("L", _1, _2));
    assert.strictEqual(t0, false);

    const t1 = rightsided(mk("R", _1, _2));
    assert.strictEqual(t1, true);
  });

  specify("viewEither", () => {
    const t0 = viewEither(dispute<1, 2>(_1));
    assert.deepEqual(t0, left(_1));

    const t1 = viewEither(accept<2, 1>(_2));
    assert.deepEqual(t1, right(_2));
  });

  specify("doEither", () => {
    const t0 = doEither(function* () {
      const x = yield* mk("L", _1, _2);
      const [y, z] = yield* mk("L", _3, pair(x, _4));
      return [x, y, z] as const;
    });
    assert.deepEqual(t0, left(_1));

    const t1 = doEither(function* () {
      const x = yield* mk("L", _1, _2);
      const [y, z] = yield* mk("R", _3, pair(x, _4));
      return [x, y, z] as const;
    });
    assert.deepEqual(t1, left(_1));

    const t2 = doEither(function* () {
      const x = yield* mk("R", _1, _2);
      const [y, z] = yield* mk("L", _3, pair(x, _4));
      return [x, y, z] as const;
    });
    assert.deepEqual(t2, left(_3));

    const t3 = doEither(function* () {
      const x = yield* mk("R", _1, _2);
      const [y, z] = yield* mk("R", _3, pair(x, _4));
      return [x, y, z] as const;
    });
    assert.deepEqual(t3, right([_2, _2, _4] as const));
  });

  specify("reduceEither", () => {
    const t0 = reduceEither(["x", "y"], (xs, x) => mk("R", _1, xs + x), "");
    assert.deepEqual(t0, right("xy"));
  });

  specify("traverseEither", () => {
    const t0 = traverseEither(["x", "y"], (x) => mk("R", _1, x.toUpperCase()));
    assert.deepEqual(t0, right(["X", "Y"]));
  });

  specify("sequenceEither", () => {
    const t0 = sequenceEither([mk("R", _1, _2), mk("R", _3, _4)] as const);
    assert.deepEqual(t0, right([_2, _4] as const));
  });

  specify("tupledEither", () => {
    const t0 = tupledEither(mk("R", _1, _2), mk("R", _3, _4));
    assert.deepEqual(t0, right([_2, _4] as const));
  });

  specify("gatherEither", () => {
    const t0 = gatherEither({ x: mk("R", _1, _2), y: mk("R", _3, _4) });
    assert.deepEqual(t0, right({ x: _2, y: _4 }));
  });

  specify("liftEither", () => {
    const f = liftEither(pair<2, 4>);
    const t0 = f(mk("R", _1, _2), mk("R", _3, _4));
    assert.deepEqual(t0, right([_2, _4] as const));
  });

  specify("liftNamedEither", () => {
    const f = liftNamedEither(pairNamed<2, 4>);
    const t0 = f({ x: mk("R", _1, _2), y: mk("R", _3, _4) });
    assert.deepEqual(t0, right([_2, _4] as const));
  });

  specify("liftNewEither", () => {
    const f = liftNewEither(Array<2 | 4>);
    const t0 = f(mk("R", _1, _2), mk("R", _3, _4));
    assert.deepEqual(t0, right([_2, _4]));
  });

  specify("doEitherAsync", async () => {
    const t0 = await doEitherAsync(async function* () {
      const x = yield* await mkA("L", _1, _2);
      const [y, z] = yield* await mkA("L", _3, pair(x, _4));
      return [x, y, z] as const;
    });
    assert.deepEqual(t0, left(_1));

    const t1 = await doEitherAsync(async function* () {
      const x = yield* await mkA("L", _1, _2);
      const [y, z] = yield* await mkA("R", _3, pair(x, _4));
      return [x, y, z] as const;
    });
    assert.deepEqual(t1, left(_1));

    const t2 = await doEitherAsync(async function* () {
      const x = yield* await mkA("R", _1, _2);
      const [y, z] = yield* await mkA("L", _3, pair(x, _4));
      return [x, y, z] as const;
    });
    assert.deepEqual(t2, left(_3));

    const t3 = await doEitherAsync(async function* () {
      const x = yield* await mkA("R", _1, _2);
      const [y, z] = yield* await mkA("R", _3, pair(x, _4));
      return [x, y, z] as const;
    });
    assert.deepEqual(t3, right([_2, _2, _4] as const));

    it("unwraps nested promise-like values on bind and return", async () => {
      const t4 = await doEitherAsync(async function* () {
        const x = yield* await mkA("R", _1, Promise.resolve(_2));
        const [y, z] = yield* await mkA("R", _3, Promise.resolve(pair(x, _4)));
        return Promise.resolve([x, y, z] as const);
      });
      assert.deepEqual(t4, right([_2, _2, _4] as const));
    });
  });
});
