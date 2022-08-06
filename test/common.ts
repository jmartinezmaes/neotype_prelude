import * as fc from "fast-check";
import { Eq, equal, greater, less, Ord, type Ordering } from "../src/cmp.js";
import { Semigroup } from "../src/cmb.js";

export class Num implements Ord<Num> {
    constructor(readonly val: number) {}

    [Eq.eq](that: Num): boolean {
        return this.val === that.val;
    }

    [Ord.cmp](that: Num): Ordering {
        if (this.val < that.val) {
            return less;
        }
        if (this.val > that.val) {
            return greater;
        }
        return equal;
    }
}

export function mkNum(x: number): Num {
    return new Num(x);
}

export function unNum(num: Num): number {
    return num.val;
}

export function arbNum(): fc.Arbitrary<Num> {
    return fc.integer({ min: 0, max: 10 }).map(mkNum);
}

export class Str implements Semigroup<Str> {
    constructor(readonly val: string) {}

    [Semigroup.cmb](that: Str): Str {
        return new Str(this.val + that.val);
    }
}

export function mkStr(x: string): Str {
    return new Str(x);
}

export function unStr(str: Str): string {
    return str.val;
}

export function arbStr(): fc.Arbitrary<Str> {
    return fc.string({ maxLength: 1 }).map(mkStr);
}

export function pair<A, B>(x: A, y: B): readonly [A, B] {
    return [x, y] as const;
}

export function pairNamed<A, B>({ x, y }: { x: A; y: B }): readonly [A, B] {
    return [x, y] as const;
}
