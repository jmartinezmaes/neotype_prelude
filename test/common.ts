import * as fc from "fast-check";
import { Eq } from "../src";

export class Num implements Eq<Num> {
  constructor(readonly x: number) {}

  [Eq.eq](that: Num): boolean {
    return this.x === that.x;
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
