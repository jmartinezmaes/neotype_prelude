/*
 * Copyright 2022 Josh Martinez
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Functionality for comparing and combining tuple literals.
 *
 * @module
 */

import { cmb, Semigroup } from "./cmb.js";
import { Eq, icmp, ieq, Ord, type Ordering } from "./cmp.js";

/**
 * A helper type for tuple literals of arity 2 through 10.
 */
export class Tuple<out T extends readonly [any, any, ...any[]]> {
  /**
   * Construct an instance of Tuple from a tuple literal of arity 2 through 10.
   */
  constructor(readonly value: T) {}

  /**
   * Test whether this and that Tuple are equal pairwise using their elements'
   * behavior as Eqs.
   */
  [Eq.eq]<A0 extends Eq<A0>, A1 extends Eq<A1>>(
    this: Tuple<readonly [A0, A1]>,
    that: Tuple<readonly [A0, A1]>,
  ): boolean;

  [Eq.eq]<A0 extends Eq<A0>, A1 extends Eq<A1>, A2 extends Eq<A2>>(
    this: Tuple<readonly [A0, A1, A2]>,
    that: Tuple<readonly [A0, A1, A2]>,
  ): boolean;

  // prettier-ignore
  [Eq.eq]<A0 extends Eq<A0>, A1 extends Eq<A1>, A2 extends Eq<A2>, A3 extends Eq<A3>>(
    this: Tuple<readonly [A0, A1, A2, A3]>,
    that: Tuple<readonly [A0, A1, A2, A3]>,
  ): boolean;

  // prettier-ignore
  [Eq.eq]<A0 extends Eq<A0>, A1 extends Eq<A1>, A2 extends Eq<A2>, A3 extends Eq<A3>, A4 extends Eq<A4>>(
    this: Tuple<readonly [A0, A1, A2, A3, A4]>,
    that: Tuple<readonly [A0, A1, A2, A3, A4]>,
  ): boolean;

  // prettier-ignore
  [Eq.eq]<A0 extends Eq<A0>, A1 extends Eq<A1>, A2 extends Eq<A2>, A3 extends Eq<A3>, A4 extends Eq<A4>, A5 extends Eq<A5>>(
    this: Tuple<readonly [A0, A1, A2, A3, A4, A5]>,
    that: Tuple<readonly [A0, A1, A2, A3, A4, A5]>,
  ): boolean;

  // prettier-ignore
  [Eq.eq]<A0 extends Eq<A0>, A1 extends Eq<A1>, A2 extends Eq<A2>, A3 extends Eq<A3>, A4 extends Eq<A4>, A5 extends Eq<A5>, A6 extends Eq<A6>>(
    this: Tuple<readonly [A0, A1, A2, A3, A4, A5, A6]>,
    that: Tuple<readonly [A0, A1, A2, A3, A4, A5, A6]>,
  ): boolean;

  // prettier-ignore
  [Eq.eq]<A0 extends Eq<A0>, A1 extends Eq<A1>, A2 extends Eq<A2>, A3 extends Eq<A3>, A4 extends Eq<A4>, A5 extends Eq<A5>, A6 extends Eq<A6>, A7 extends Eq<A7>>(
    this: Tuple<readonly [A0, A1, A2, A3, A4, A5, A6, A7]>,
    that: Tuple<readonly [A0, A1, A2, A3, A4, A5, A6, A7]>,
  ): boolean;

  // prettier-ignore
  [Eq.eq]<A0 extends Eq<A0>, A1 extends Eq<A1>, A2 extends Eq<A2>, A3 extends Eq<A3>, A4 extends Eq<A4>, A5 extends Eq<A5>, A6 extends Eq<A6>, A7 extends Eq<A7>, A8 extends Eq<A8>>(
    this: Tuple<readonly [A0, A1, A2, A3, A4, A5, A6, A7, A8]>,
    that: Tuple<readonly [A0, A1, A2, A3, A4, A5, A6, A7, A8]>,
  ): boolean;

  // prettier-ignore
  [Eq.eq]<A0 extends Eq<A0>, A1 extends Eq<A1>, A2 extends Eq<A2>, A3 extends Eq<A3>, A4 extends Eq<A4>, A5 extends Eq<A5>, A6 extends Eq<A6>, A7 extends Eq<A7>, A8 extends Eq<A8>, A9 extends Eq<A9>>(
    this: Tuple<readonly [A0, A1, A2, A3, A4, A5, A6, A7, A8, A9]>,
    that: Tuple<readonly [A0, A1, A2, A3, A4, A5, A6, A7, A8, A9]>,
  ): boolean;

  [Eq.eq]<A extends Eq<A>>(
    this: Tuple<readonly [A, A, ...A[]]>,
    that: Tuple<readonly [A, A, ...A[]]>,
  ): boolean {
    return ieq(this.value, that.value);
  }

  /**
   * Compare this and that Tuple pairwise using their elements' behavior as Ords.
   */
  [Ord.cmp]<A0 extends Ord<A0>, A1 extends Ord<A1>>(
    this: Tuple<readonly [A0, A1]>,
    that: Tuple<readonly [A0, A1]>,
  ): Ordering;

  [Ord.cmp]<A0 extends Ord<A0>, A1 extends Ord<A1>, A2 extends Ord<A2>>(
    this: Tuple<readonly [A0, A1, A2]>,
    that: Tuple<readonly [A0, A1, A2]>,
  ): Ordering;

  // prettier-ignore
  [Ord.cmp]<A0 extends Ord<A0>, A1 extends Ord<A1>, A2 extends Ord<A2>, A3 extends Ord<A3>>(
    this: Tuple<readonly [A0, A1, A2, A3]>,
    that: Tuple<readonly [A0, A1, A2, A3]>,
  ): Ordering;

  // prettier-ignore
  [Ord.cmp]<A0 extends Ord<A0>, A1 extends Ord<A1>, A2 extends Ord<A2>, A3 extends Ord<A3>, A4 extends Ord<A4>>(
    this: Tuple<readonly [A0, A1, A2, A3, A4]>,
    that: Tuple<readonly [A0, A1, A2, A3, A4]>,
  ): Ordering;

  // prettier-ignore
  [Ord.cmp]<A0 extends Ord<A0>, A1 extends Ord<A1>, A2 extends Ord<A2>, A3 extends Ord<A3>, A4 extends Ord<A4>, A5 extends Ord<A5>>(
    this: Tuple<readonly [A0, A1, A2, A3, A4, A5]>,
    that: Tuple<readonly [A0, A1, A2, A3, A4, A5]>,
  ): Ordering;

  // prettier-ignore
  [Ord.cmp]<A0 extends Ord<A0>, A1 extends Ord<A1>, A2 extends Ord<A2>, A3 extends Ord<A3>, A4 extends Ord<A4>, A5 extends Ord<A5>, A6 extends Ord<A6>>(
    this: Tuple<readonly [A0, A1, A2, A3, A4, A5, A6]>,
    that: Tuple<readonly [A0, A1, A2, A3, A4, A5, A6]>,
  ): Ordering;

  // prettier-ignore
  [Ord.cmp]<A0 extends Ord<A0>, A1 extends Ord<A1>, A2 extends Ord<A2>, A3 extends Ord<A3>, A4 extends Ord<A4>, A5 extends Ord<A5>, A6 extends Ord<A6>, A7 extends Ord<A7>>(
    this: Tuple<readonly [A0, A1, A2, A3, A4, A5, A6, A7]>,
    that: Tuple<readonly [A0, A1, A2, A3, A4, A5, A6, A7]>,
  ): Ordering;

  // prettier-ignore
  [Ord.cmp]<A0 extends Ord<A0>, A1 extends Ord<A1>, A2 extends Ord<A2>, A3 extends Ord<A3>, A4 extends Ord<A4>, A5 extends Ord<A5>, A6 extends Ord<A6>, A7 extends Ord<A7>, A8 extends Ord<A8>>(
    this: Tuple<readonly [A0, A1, A2, A3, A4, A5, A6, A7, A8]>,
    that: Tuple<readonly [A0, A1, A2, A3, A4, A5, A6, A7, A8]>,
  ): Ordering;

  // prettier-ignore
  [Ord.cmp]<A0 extends Ord<A0>, A1 extends Ord<A1>, A2 extends Ord<A2>, A3 extends Ord<A3>, A4 extends Ord<A4>, A5 extends Ord<A5>, A6 extends Ord<A6>, A7 extends Ord<A7>, A8 extends Ord<A8>, A9 extends Ord<A9>>(
    this: Tuple<readonly [A0, A1, A2, A3, A4, A5, A6, A7, A8, A9]>,
    that: Tuple<readonly [A0, A1, A2, A3, A4, A5, A6, A7, A8, A9]>,
  ): Ordering;

  [Ord.cmp]<A extends Ord<A>>(
    this: Tuple<readonly [A, A, ...A[]]>,
    that: Tuple<readonly [A, A, ...A[]]>,
  ): Ordering {
    return icmp(this.value, that.value);
  }

  /**
   * Combine this and that Tuple's elements pairwise using their elements'
   * behavior as Semigroups.
   */
  [Semigroup.cmb]<A0 extends Semigroup<A0>, A1 extends Semigroup<A1>>(
    this: Tuple<readonly [A0, A1]>,
    that: Tuple<readonly [A0, A1]>,
  ): Tuple<readonly [A0, A1]>;

  // prettier-ignore
  [Semigroup.cmb]<A0 extends Semigroup<A0>, A1 extends Semigroup<A1>, A2 extends Semigroup<A2>>(
    this: Tuple<readonly [A0, A1, A2]>,
    that: Tuple<readonly [A0, A1, A2]>,
  ): Tuple<readonly [A0, A1, A2]>;

  // prettier-ignore
  [Semigroup.cmb]<A0 extends Semigroup<A0>, A1 extends Semigroup<A1>, A2 extends Semigroup<A2>, A3 extends Semigroup<A3>>(
    this: Tuple<readonly [A0, A1, A2, A3]>,
    that: Tuple<readonly [A0, A1, A2, A3]>,
  ): Tuple<readonly [A0, A1, A2, A3]>;

  // prettier-ignore
  [Semigroup.cmb]<A0 extends Semigroup<A0>, A1 extends Semigroup<A1>, A2 extends Semigroup<A2>, A3 extends Semigroup<A3>, A4 extends Semigroup<A4>>(
    this: Tuple<readonly [A0, A1, A2, A3, A4]>,
    that: Tuple<readonly [A0, A1, A2, A3, A4]>,
  ): Tuple<readonly [A0, A1, A2, A3, A4]>;

  // prettier-ignore
  [Semigroup.cmb]<A0 extends Semigroup<A0>, A1 extends Semigroup<A1>, A2 extends Semigroup<A2>, A3 extends Semigroup<A3>, A4 extends Semigroup<A4>, A5 extends Semigroup<A5>>(
    this: Tuple<readonly [A0, A1, A2, A3, A4, A5]>,
    that: Tuple<readonly [A0, A1, A2, A3, A4, A5]>,
  ): Tuple<readonly [A0, A1, A2, A3, A4, A5]>;

  // prettier-ignore
  [Semigroup.cmb]<A0 extends Semigroup<A0>, A1 extends Semigroup<A1>, A2 extends Semigroup<A2>, A3 extends Semigroup<A3>, A4 extends Semigroup<A4>, A5 extends Semigroup<A5>, A6 extends Semigroup<A6>>(
    this: Tuple<readonly [A0, A1, A2, A3, A4, A5, A6]>,
    that: Tuple<readonly [A0, A1, A2, A3, A4, A5, A6]>,
  ): Tuple<readonly [A0, A1, A2, A3, A4, A5, A6]>;

  // prettier-ignore
  [Semigroup.cmb]<A0 extends Semigroup<A0>, A1 extends Semigroup<A1>, A2 extends Semigroup<A2>, A3 extends Semigroup<A3>, A4 extends Semigroup<A4>, A5 extends Semigroup<A5>, A6 extends Semigroup<A6>, A7 extends Semigroup<A7>>(
    this: Tuple<readonly [A0, A1, A2, A3, A4, A5, A6, A7]>,
    that: Tuple<readonly [A0, A1, A2, A3, A4, A5, A6, A7]>,
  ): Tuple<readonly [A0, A1, A2, A3, A4, A5, A6, A7]>;

  // prettier-ignore
  [Semigroup.cmb]<A0 extends Semigroup<A0>, A1 extends Semigroup<A1>, A2 extends Semigroup<A2>, A3 extends Semigroup<A3>, A4 extends Semigroup<A4>, A5 extends Semigroup<A5>, A6 extends Semigroup<A6>, A7 extends Semigroup<A7>, A8 extends Semigroup<A8>>(
    this: Tuple<readonly [A0, A1, A2, A3, A4, A5, A6, A7, A8]>,
    that: Tuple<readonly [A0, A1, A2, A3, A4, A5, A6, A7, A8]>,
  ): Tuple<readonly [A0, A1, A2, A3, A4, A5, A6, A7, A8]>;

  // prettier-ignore
  [Semigroup.cmb]<A0 extends Semigroup<A0>, A1 extends Semigroup<A1>, A2 extends Semigroup<A2>, A3 extends Semigroup<A3>, A4 extends Semigroup<A4>, A5 extends Semigroup<A5>, A6 extends Semigroup<A6>, A7 extends Semigroup<A7>, A8 extends Semigroup<A8>, A9 extends Semigroup<A9>>(
    this: Tuple<readonly [A0, A1, A2, A3, A4, A5, A6, A7, A8, A9]>,
    that: Tuple<readonly [A0, A1, A2, A3, A4, A5, A6, A7, A8, A9]>,
  ): Tuple<readonly [A0, A1, A2, A3, A4, A5, A6, A7, A8, A9]>;

  [Semigroup.cmb]<A extends Semigroup<A>>(
    this: Tuple<readonly [A, A, ...A[]]>,
    that: Tuple<readonly [A, A, ...A[]]>,
  ): Tuple<readonly [A, A, ...A[]]> {
    return new Tuple(
      this.value.map((x, ix) => cmb(x, that.value[ix])) as [A, A, ...A[]],
    );
  }
}

/**
 * Construct a Tuple from a tuple literal of arity 2 through 10.
 */
export function mkTuple<A0, A1>(
  xs: readonly [A0, A1],
): Tuple<readonly [A0, A1]>;

export function mkTuple<A0, A1, A2>(
  xs: readonly [A0, A1, A2],
): Tuple<readonly [A0, A1, A2]>;

export function mkTuple<A0, A1, A2, A3>(
  xs: readonly [A0, A1, A2, A3],
): Tuple<readonly [A0, A1, A2, A3]>;

export function mkTuple<A0, A1, A2, A3, A4>(
  xs: readonly [A0, A1, A2, A3, A4],
): Tuple<readonly [A0, A1, A2, A3, A4]>;

export function mkTuple<A0, A1, A2, A3, A4>(
  xs: readonly [A0, A1, A2, A3, A4],
): Tuple<readonly [A0, A1, A2, A3, A4]>;

export function mkTuple<A0, A1, A2, A3, A4, A5>(
  xs: readonly [A0, A1, A2, A3, A4, A5],
): Tuple<readonly [A0, A1, A2, A3, A4, A5]>;

export function mkTuple<A0, A1, A2, A3, A4, A5, A6>(
  xs: readonly [A0, A1, A2, A3, A4, A5, A6],
): Tuple<readonly [A0, A1, A2, A3, A4, A5, A6]>;

export function mkTuple<A0, A1, A2, A3, A4, A5, A6, A7>(
  xs: readonly [A0, A1, A2, A3, A4, A5, A6, A7],
): Tuple<readonly [A0, A1, A2, A3, A4, A5, A6, A7]>;

export function mkTuple<A0, A1, A2, A3, A4, A5, A6, A7, A8>(
  xs: readonly [A0, A1, A2, A3, A4, A5, A6, A7, A8],
): Tuple<readonly [A0, A1, A2, A3, A4, A5, A6, A7, A8]>;

export function mkTuple<A0, A1, A2, A3, A4, A5, A6, A7, A8, A9>(
  xs: readonly [A0, A1, A2, A3, A4, A5, A6, A7, A8, A9],
): Tuple<readonly [A0, A1, A2, A3, A4, A5, A6, A7, A8, A9]>;

export function mkTuple<A>(
  xs: readonly [A, A, ...A[]],
): Tuple<readonly [A, A, ...A[]]> {
  return new Tuple(xs);
}

/**
 * Destruct a Tuple.
 */
export function unTuple<T extends readonly [any, any, ...any[]]>(
  tuple: Tuple<T>,
): T {
  return tuple.value;
}
