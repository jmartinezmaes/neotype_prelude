import * as fc from "fast-check";
import { Eq, Ord, Ordering } from "../src/cmp.js";
import { Semigroup } from "../src/cmb.js";

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
    return fc.integer({ min: 0, max: 10 }).map((x) => new Num(x));
}

export class Str implements Semigroup<Str> {
    constructor(readonly val: string) {}

    [Semigroup.cmb](that: Str): Str {
        return new Str(this.val + that.val);
    }
}

export function arbStr(): fc.Arbitrary<Str> {
    return fc.string({ maxLength: 1 }).map((x) => new Str(x));
}

export function pair<A, B>(x: A, y: B): readonly [A, B] {
    return [x, y] as const;
}
