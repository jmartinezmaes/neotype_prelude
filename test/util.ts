import * as fc from "fast-check";
import { Semigroup } from "../src/cmb.js";
import { Eq, Ord, Ordering } from "../src/cmp.js";

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
