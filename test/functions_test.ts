import * as fc from "fast-check";
import { assert } from "chai";
import { flow, fst, id, negate, pipe, snd } from "../src";

describe("Functions", () => {
  specify("id", () => {
    fc.assert(
      fc.property(fc.anything(), (x) => {
        assert.strictEqual(id(x), x);
      }),
    );
  });

  specify("fst", () => {
    fc.assert(
      fc.property(fc.anything(), fc.anything(), (x, y) => {
        assert.strictEqual(fst([x, y]), x);
      }),
    );
  });

  specify("snd", () => {
    fc.assert(
      fc.property(fc.anything(), fc.anything(), (x, y) => {
        assert.strictEqual(snd([x, y]), y);
      }),
    );
  });

  specify("negate", () => {
    function f(x: 1 | 2): x is 2 {
      return x === 2;
    }
    const g = negate(f);

    assert.strictEqual(f(1), false);
    assert.strictEqual(f(2), true);
    assert.strictEqual(g(1), true);
    assert.strictEqual(g(2), false);
  });

  specify("pipe", () => {
    function f<B extends string>(y: B): <A extends string>(x: A) => `${A}${B}` {
      return (x) => `${x}${y}`;
    }

    const t0 = pipe("a" as const, f("b"));
    assert.strictEqual(t0, "ab");

    const t1 = pipe("a" as const, f("b"), f("c"));
    assert.strictEqual(t1, "abc");

    const t2 = pipe("a" as const, f("b"), f("c"), f("d"));
    assert.strictEqual(t2, "abcd");

    const t3 = pipe("a" as const, f("b"), f("c"), f("d"), f("e"));
    assert.strictEqual(t3, "abcde");

    const t4 = pipe("a" as const, f("b"), f("c"), f("d"), f("e"), f("f"));
    assert.strictEqual(t4, "abcdef");

    // prettier-ignore
    const t5 = pipe("a" as const, f("b"), f("c"), f("d"), f("e"), f("f"), f("g"));
    assert.strictEqual(t5, "abcdefg");

    // prettier-ignore
    const t6 = pipe("a" as const, f("b"), f("c"), f("d"), f("e"), f("f"), f("g"), f("h"));
    assert.strictEqual(t6, "abcdefgh");

    // prettier-ignore
    const t7 = pipe("a" as const, f("b"), f("c"), f("d"), f("e"), f("f"), f("g"), f("h"), f("i"));
    assert.strictEqual(t7, "abcdefghi");

    // prettier-ignore
    const t8 = pipe("a" as const, f("b"), f("c"), f("d"), f("e"), f("f"), f("g"), f("h"), f("i"), f("j"));
    assert.strictEqual(t8, "abcdefghij");

    // prettier-ignore
    const t9 = pipe("a" as const, f("b"), f("c"), f("d"), f("e"), f("f"), f("g"), f("h"), f("i"), f("j"), f("k"));
    assert.strictEqual(t9, "abcdefghijk");

    function inc(n: number): (acc: number) => number {
      return (acc) => acc + n;
    }
    const incs = new Array<(n: number) => number>(100).fill(inc(1));

    const t10 = pipe(0, ...incs);
    assert.strictEqual(t10, 100);
  });

  specify("flow", () => {
    function f<B extends string>(y: B): <A extends string>(x: A) => `${A}${B}` {
      return (x) => `${x}${y}`;
    }

    function g<B extends string>(
      z: B,
    ): <A0 extends string, A1 extends string>(
      x: A0,
      y: A1,
    ) => `${A0}${A1}${B}` {
      return (x, y) => `${x}${y}${z}`;
    }

    const f0 = flow(g("b"), f("c"));
    const t0 = f0("*", "a");
    assert.strictEqual(t0, "*abc");

    const f1 = flow(g("b"), f("c"), f("d"));
    const t1 = f1("*", "a");
    assert.strictEqual(t1, "*abcd");

    const f2 = flow(g("b"), f("c"), f("d"), f("e"));
    const t2 = f2("*", "a");
    assert.strictEqual(t2, "*abcde");

    const f3 = flow(g("b"), f("c"), f("d"), f("e"), f("f"));
    const t3 = f3("*", "a");
    assert.strictEqual(t3, "*abcdef");

    const f4 = flow(g("b"), f("c"), f("d"), f("e"), f("f"), f("g"));
    const t4 = f4("*", "a");
    assert.strictEqual(t4, "*abcdefg");

    const f5 = flow(g("b"), f("c"), f("d"), f("e"), f("f"), f("g"), f("h"));
    const t5 = f5("*", "a");
    assert.strictEqual(t5, "*abcdefgh");

    // prettier-ignore
    const f6 = flow(g("b"), f("c"), f("d"), f("e"), f("f"), f("g"), f("h"), f("i"));
    const t6 = f6("*", "a");
    assert.strictEqual(t6, "*abcdefghi");

    // prettier-ignore
    const f7 = flow(g("b"), f("c"), f("d"), f("e"), f("f"), f("g"), f("h"), f("i"), f("j"));
    const t7 = f7("*", "a");
    assert.strictEqual(t7, "*abcdefghij");

    // prettier-ignore
    const f8 = flow(g("b"), f("c"), f("d"), f("e"), f("f"), f("g"), f("h"), f("i"), f("j"), f("k"));
    const t8 = f8("*", "a");
    assert.strictEqual(t8, "*abcdefghijk");

    function inc(n: number): (acc: number) => number {
      return (acc) => acc + n;
    }
    const incs = new Array<(n: number) => number>(100).fill(inc(1));

    const f9 = flow(...incs);
    const t9 = f9(0);
    assert.strictEqual(t9, 100);
  });
});
