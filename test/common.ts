import { assert } from "chai";
import * as fc from "fast-check";
import { cmb, Semigroup } from "../src/cmb.js";
import { cmp, Eq, eq, Ord, Ordering } from "../src/cmp.js";

export class Num implements Ord<Num> {
    constructor(readonly val: number) {}

    [Eq.eq](that: Num): boolean {
        return this.val === that.val;
    }

    [Ord.cmp](that: Num): Ordering {
        if (this.val < that.val) {
            return Ordering.less;
        }
        if (this.val > that.val) {
            return Ordering.greater;
        }
        return Ordering.equal;
    }
}

export function arbNum(): fc.Arbitrary<Num> {
    return fc.float({ noNaN: true }).map((x) => new Num(x));
}

export class Str implements Semigroup<Str> {
    constructor(readonly val: string) {}

    [Semigroup.cmb](that: Str): Str {
        return new Str(this.val + that.val);
    }
}

export function arbStr(): fc.Arbitrary<Str> {
    return fc.string().map((x) => new Str(x));
}

export function tuple<A, B>(x: A, y: B): readonly [A, B] {
    return [x, y] as const;
}

describe("common.js", () => {
    describe("Num", () => {
        specify("#[Eq.eq]", () => {
            fc.assert(
                fc.property(arbNum(), arbNum(), (x, y) =>
                    assert.strictEqual(eq(x, y), x.val === y.val),
                ),
            );
        });

        specify("#[Ord.cmp]", () => {
            fc.assert(
                fc.property(arbNum(), arbNum(), (x, y) =>
                    assert.strictEqual(
                        cmp(x, y),
                        x.val < y.val
                            ? Ordering.less
                            : x.val > y.val
                            ? Ordering.greater
                            : Ordering.equal,
                    ),
                ),
            );
        });
    });

    describe("Str", () => {
        specify("#[Semigroup.cmb]", () => {
            fc.assert(
                fc.property(arbStr(), arbStr(), (x, y) =>
                    assert.deepEqual(cmb(x, y), new Str(x.val + y.val)),
                ),
            );
        });
    });
});
