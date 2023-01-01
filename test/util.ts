import { expect } from "chai";
import * as fc from "fast-check";
import { cmb, Semigroup } from "../src/cmb.js";
import { cmp, Eq, eq, le, Ord, Ordering } from "../src/cmp.js";

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

export function expectLawfulEq<A extends Eq<A>>(arb: fc.Arbitrary<A>): void {
    fc.assert(
        fc.property(arb, (x) => {
            expect(eq(x, x), "reflexivity").to.be.true;
        }),
    );

    fc.assert(
        fc.property(arb, arb, (x, y) => {
            expect(eq(x, y), "symmetry").to.equal(eq(y, x));
        }),
    );

    fc.assert(
        fc.property(arb, (x) => {
            const y = x,
                z = x;
            expect(eq(x, y) && eq(y, z) && eq(x, z), "transitivity").to.be.true;
        }),
    );
}

export function expectLawfulOrd<A extends Ord<A>>(arb: fc.Arbitrary<A>): void {
    fc.assert(
        fc.property(arb, (x) => {
            expect(le(x, x), "reflexivity").to.be.true;
        }),
    );

    fc.assert(
        fc.property(arb, arb, (x, y) => {
            expect(le(x, y) && le(y, x), "antisymmetry").to.equal(eq(x, y));
        }),
    );

    fc.assert(
        fc.property(arb, arb, arb, (x, y, z) => {
            const [x1, y1, z1] = [x, y, z].sort((a, b) =>
                cmp(a, b).toNumber(),
            ) as [A, A, A];
            expect(le(x1, y1) && le(y1, z1) && le(x1, z1)).to.be.true;
        }),
    );

    fc.assert(
        fc.property(arb, arb, (x, y) => {
            expect(le(x, y) || le(y, x), "comparability").to.be.true;
        }),
    );
}

export function expectLawfulSemigroup<A extends Semigroup<A>>(
    arb: fc.Arbitrary<A>,
): void {
    fc.assert(
        fc.property(arb, arb, arb, (x, y, z) => {
            expect(cmb(x, cmb(y, z)), "associativity").to.deep.equal(
                cmb(cmb(x, y), z),
            );
        }),
    );
}
