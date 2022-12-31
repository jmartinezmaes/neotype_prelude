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
        return Ordering.fromNumber(this.val - that.val);
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
        describe("#[Eq.eq]", () => {
            it("compares the values using strict equality", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), (x, y) => {
                        expect(eq(x, y)).to.equal(x.val === y.val);
                    }),
                );
            });
        });

        describe("#[Ord.cmp]", () => {
            it("compares the values as ordered from least to greatest", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), (x, y) => {
                        expect(cmp(x, y)).to.equal(
                            Ordering.fromNumber(x.val - y.val),
                        );
                    }),
                );
            });
        });
    });

    describe("Str", () => {
        describe("#[Semigroup.cmb]", () => {
            it("combines the values using concatenation", () => {
                fc.assert(
                    fc.property(arbStr(), arbStr(), (x, y) => {
                        expect(cmb(x, y)).to.deep.equal(new Str(x.val + y.val));
                    }),
                );
            });
        });
    });
});
