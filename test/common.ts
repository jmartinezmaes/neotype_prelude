import * as fc from "fast-check";
import { Eq, equal, greater, less, Ord, type Ordering } from "../src/cmp.js";
import { Semigroup } from "../src/semigroup.js";

export class Num implements Ord<Num> {
  constructor(readonly x: number) {}

  [Eq.eq](that: Num): boolean {
    return this.x === that.x;
  }

  [Ord.cmp](that: Num): Ordering {
    return this.x < that.x ? less : this.x > that.x ? greater : equal;
  }
}

export function mkNum(x: number): Num {
  return new Num(x);
}

export function unNum(num: Num): number {
  return num.x;
}

export function arbNum(): fc.Arbitrary<Num> {
  return fc.integer({ min: 0, max: 10 }).map(mkNum);
}

export class Str implements Semigroup<Str> {
  constructor(readonly x: string) {}

  [Semigroup.combine](that: Str): Str {
    return new Str(this.x + that.x);
  }
}

export function mkStr(x: string): Str {
  return new Str(x);
}

export function unStr(str: Str): string {
  return str.x;
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
