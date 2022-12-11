import { expect } from "chai";
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

export class Str implements Semigroup<Str> {
    constructor(readonly val: string) {}

    [Semigroup.cmb](that: Str): Str {
        return new Str(this.val + that.val);
    }
}

export function arbNum(): fc.Arbitrary<Num> {
    return fc.float({ noNaN: true }).map((x) => new Num(x));
}

export function arbStr(): fc.Arbitrary<Str> {
    return fc.string().map((x) => new Str(x));
}

export function tuple<T extends unknown[]>(...xs: T): T {
    return xs;
}

describe("common.js", () => {
    describe("Num", () => {
        specify("#[Eq.eq]", () => {
            fc.assert(
                fc.property(arbNum(), arbNum(), (x, y) => {
                    expect(eq(x, y)).to.equal(x.val === y.val);
                }),
            );
        });

        specify("#[Ord.cmp]", () => {
            fc.assert(
                fc.property(arbNum(), arbNum(), (x, y) => {
                    expect(cmp(x, y)).to.equal(
                        x.val < y.val
                            ? Ordering.less
                            : x.val > y.val
                            ? Ordering.greater
                            : Ordering.equal,
                    );
                }),
            );
        });
    });

    describe("Str", () => {
        specify("#[Semigroup.cmb]", () => {
            fc.assert(
                fc.property(arbStr(), arbStr(), (x, y) => {
                    expect(cmb(x, y)).to.deep.equal(new Str(x.val + y.val));
                }),
            );
        });
    });
});
