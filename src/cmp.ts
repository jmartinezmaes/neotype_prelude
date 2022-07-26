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
 * Functionality for ordering and comparison.
 *
 * @module
 */

import { combine, Semigroup } from "./semigroup.js";

/**
 * The `Eq<A>` interface provides evidence that two values of type `A` have
 * equality and inequality.
 *
 * ### Minimal implementation
 *
 * - {@link Eq[Eq.eq]}
 *
 * ### Properties
 *
 * Instances of Eq are encouraged to satisfy the following properties:
 *
 * __Reflexivity__
 *
 * `eq (x, x) === true`
 *
 * __Symmetry__
 *
 * `eq (x, y) === eq (y, x)`
 *
 * __Transitivity__
 *
 * If `eq (x, y) && eq (y, z) === true` then `eq (x, z) === true`
 *
 * __Extensionality__
 *
 * If `eq (x, y) === true` and `f` is a function whose return type is an
 * instance of `Eq`, then `eq (f (x), f (y)) === true`
 */
export interface Eq<in A> {
  [Eq.eq](this: A, that: A): boolean;
}

export namespace Eq {
  /**
   * A method that determines the equality or inequality of two Eq values.
   */
  export const eq = Symbol("@neotype/prelude/Eq/eq");
}

/**
 * Test whether two values are equal using Eq comparison.
 *
 * ```ts
 * eq (x, y) ≡ x[Eq.eq](y)
 * ```
 */
export function eq<A extends Eq<A>>(x: A, y: A): boolean {
  return x[Eq.eq](y);
}

/**
 * Test whether two values are inequal using Eq comparison.
 *
 * ```ts
 * ne (x, y) ≡ !x[Eq.eq](y)
 * ```
 */
export function ne<A extends Eq<A>>(x: A, y: A): boolean {
  return !x[Eq.eq](y);
}

/**
 * Test whether two iterables are equal using Eq comparison.
 *
 * ```ts
 * ieq ([a   ], [    ]) ≡ false
 * ieq ([    ], [b   ]) ≡ false
 * ieq ([a, x], [b   ]) ≡ false
 * ieq ([a,  ], [b, y]) ≡ false
 * ieq ([a, x], [b, y]) ≡ eq (a, b) && eq (x, y)
 * ```
 */
export function ieq<A extends Eq<A>>(
  xs: Iterable<A>,
  ys: Iterable<A>,
): boolean {
  const nxs = xs[Symbol.iterator]();
  const nys = ys[Symbol.iterator]();
  let nx = nxs.next();
  let ny = nys.next();

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (!nx.done) {
      if (!ny.done) {
        if (ne(nx.value, ny.value)) {
          return false;
        }
        nx = nxs.next();
        ny = nys.next();
      } else {
        return false;
      }
    } else {
      return !!ny.done;
    }
  }
}

/**
 * Test whether two iterables are inequal using Eq comparison.
 */
export function ine<A extends Eq<A>>(
  xs: Iterable<A>,
  ys: Iterable<A>,
): boolean {
  return !ieq(xs, ys);
}

/**
 * The `Ord<A>` interface provides evidence that two values of type `A` have a
 * total ordering.
 *
 * ### Minimal implementation
 *
 * - {@link Eq[Eq.eq]}
 * - {@link Ord[Ord.cmp]}
 *
 * ### Properties
 *
 * Instances of Ord __must__ satisfy the following properties:
 *
 * __Comparability__
 *
 * `le (x, y) || le (y, x) === true`
 *
 * __Transitivity__
 *
 * If `le (x, y) && le (y, z) === true` then `le (x, z) === true`
 *
 * __Reflexivity__
 *
 * `le (x, x) === true`
 *
 * __Antisymmetry__
 *
 * If `le (x, y) && le (y, x) === true` then `eq (x, y) === true`
 */
export interface Ord<in A> extends Eq<A> {
  [Ord.cmp](this: A, that: A): Ordering;
}

export namespace Ord {
  /**
   * A method that determines the total ordering of two Ord values.
   */
  export const cmp = Symbol("@neotype/prelude/Ord/compare");
}

/**
 * Compare `x` to `y` using Ord comparison.
 *
 * ```ts
 * cmp (x, y) ≡ x[Ord.cmp](y)
 * ```
 */
export function cmp<A extends Ord<A>>(x: A, y: A): Ordering {
  return x[Ord.cmp](y);
}

/**
 * Compare two iterables using Ord comparison.
 *
 * ```ts
 * icmp ([a   ], [    ]) ≡ greater
 * icmp ([    ], [b   ]) ≡ less
 * icmp ([a, x], [b   ]) ≡ combine (cmp (a, b), greater   )
 * icmp ([a,  ], [b, y]) ≡ combine (cmp (a, b), less      )
 * icmp ([a, x], [b, y]) ≡ combine (cmp (a, b), cmp (x, y))
 * ```
 */
export function icmp<A extends Ord<A>>(
  xs: Iterable<A>,
  ys: Iterable<A>,
): Ordering {
  const nxs = xs[Symbol.iterator]();
  const nys = ys[Symbol.iterator]();
  let nx = nxs.next();
  let ny = nys.next();

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (!nx.done) {
      if (!ny.done) {
        const ord = cmp(nx.value, ny.value);
        if (ordNe(ord)) {
          return ord;
        }
        nx = nxs.next();
        ny = nys.next();
      } else {
        return greater;
      }
    } else {
      return ny.done ? equal : less;
    }
  }
}

/**
 * Test whether `x` is less than `y` using Ord comparison.
 */
export function lt<A extends Ord<A>>(x: A, y: A): boolean {
  return ordLt(cmp(x, y));
}

/**
 * Test whether `x` is greater than `y` using Ord comparison.
 */
export function gt<A extends Ord<A>>(x: A, y: A): boolean {
  return ordGt(cmp(x, y));
}

/**
 * Test whether `x` is less than or equal to `y` using Ord comparison.
 */
export function le<A extends Ord<A>>(x: A, y: A): boolean {
  return ordLe(cmp(x, y));
}

/**
 * Test whether `x` is greater than or equal to `y` using Ord comparison.
 */
export function ge<A extends Ord<A>>(x: A, y: A): boolean {
  return ordGe(cmp(x, y));
}

/**
 * Find the minimum of a non-empty series of values using Ord comparison.
 */
export function min<A extends Ord<A>>(...xs: [A, ...A[]]): A {
  return xs.reduce((acc, x) => (lt(acc, x) ? acc : x));
}

/**
 * Find the maximum of a non-empty series of values using Ord comparison.
 */
export function max<A extends Ord<A>>(...xs: [A, ...A[]]): A {
  return xs.reduce((acc, x) => (gt(acc, x) ? acc : x));
}

/**
 * Restrict a value to an inclusive bounds using Ord comparison.
 */
export function clamp<A extends Ord<A>>(x: A, lo: A, hi: A) {
  return min(hi, max(lo, x));
}

/**
 * An `Ordering` determines the arrangement of two values in relation to each
 * other, usually according to a particular sequence or pattern.
 *
 * An Ordering can be one of three nullary constructors: `Less`, `Equal`, or
 * `Greater`.
 */
export type Ordering = Ordering.Less | Ordering.Equal | Ordering.Greater;

export namespace Ordering {
  /**
   * The unique identifier for Ordering.
   */
  export const uid = Symbol("@neotype/prelude/Ordering/uid");

  /**
   * The unique identifier for Ordering.
   */
  export type Uid = typeof uid;

  /**
   * The unified syntax for Ordering.
   */
  export abstract class Syntax {
    /**
     * Test whether this and that Ordering are equal using Eq comparison.
     */
    [Eq.eq](this: Ordering, that: Ordering): boolean {
      return this.value === that.value;
    }

    /**
     * Compare this and that Ordering using Ord comparison, where
     * `Less < Equal < Greater`.
     */
    [Ord.cmp](this: Ordering, that: Ordering): Ordering {
      if (ordLt(this)) {
        return ordLt(that) ? equal : less;
      }
      if (ordGt(this)) {
        return ordGt(that) ? equal : greater;
      }
      return ordEq(that) ? equal : ordLt(that) ? greater : less;
    }

    /**
     * Combine this and that Ordering.
     *
     * ```ts
     * combine (less   , y) ≡ less
     * combine (equal  , y) ≡ y
     * combine (greater, y) ≡ greater
     * ```
     */
    [Semigroup.combine](this: Ordering, that: Ordering): Ordering {
      return ordEq(this) ? that : this;
    }
  }

  /**
   * An Ordering that models a "less than" relationship between two values.
   */
  export class Less extends Syntax {
    /**
     * The numerical representation of this Ordering.
     */
    readonly value = -1;

    /**
     * The singleton instance of the Less Ordering.
     */
    static readonly singleton = new Less();

    /**
     * `Less` is not constructable; use the {@link less} constant instead.
     */
    private constructor() {
      super();
    }
  }

  /**
   * An Ordering that models an "equal" relationship between two values.
   */
  export class Equal extends Syntax {
    /**
     * The numerical representation of this Ordering.
     */
    readonly value = 0;

    /**
     * The singleton instance of the Equal Ordering.
     */
    static readonly singleton = new Equal();

    /**
     * `Equal` is not constructable; use the {@link equal} constant instead.
     */
    private constructor() {
      super();
    }
  }

  /**
   * An Ordering that models a "greater than" relationship between two values.
   */
  export class Greater extends Syntax {
    /**
     * The numerical representation of this Ordering.
     */
    readonly value = 1;

    /**
     * The singleton instance of the Greater Ordering.
     */
    static readonly singleton = new Greater();

    /**
     * `Greater` is not constructable; use the {@link greater} constant instead.
     */
    private constructor() {
      super();
    }
  }
}

/**
 * The Ordering that models a "less than" relationship between two values.
 */
export const less = Ordering.Less.singleton as Ordering;

/**
 * The Ordering that models an "equal" relationship between two values.
 */
export const equal = Ordering.Equal.singleton as Ordering;

/**
 * The Ordering that models a "greater than" relationship between two values.
 */
export const greater = Ordering.Greater.singleton as Ordering;

/**
 * Test whether an Ordering is Less.
 */
export function ordLt(ordering: Ordering): ordering is Ordering.Less {
  return ordering.value === -1;
}

/**
 * Test whether an Ordering is Less or Equal.
 */
export function ordLe(
  ordering: Ordering,
): ordering is Ordering.Less | Ordering.Equal {
  return !ordGt(ordering);
}

/**
 * Test whether an Ordering is Equal.
 */
export function ordEq(ordering: Ordering): ordering is Ordering.Equal {
  return ordering.value === 0;
}

/**
 * Test whether an Ordering is not Equal.
 */
export function ordNe(
  ordering: Ordering,
): ordering is Ordering.Less | Ordering.Greater {
  return !ordEq(ordering);
}

/**
 * Test whether an Ordering is Greater or Equal.
 */
export function ordGe(
  ordering: Ordering,
): ordering is Ordering.Greater | Ordering.Equal {
  return !ordLt(ordering);
}

/**
 * Test whether an Ordering is Greater.
 */
export function ordGt(ordering: Ordering): ordering is Ordering.Greater {
  return ordering.value === 1;
}

/**
 * Reverse an ordering relationship.
 *
 * ```ts
 * reverseOrdering (less   ) ≡ greater
 * reverseOrdering (greater) ≡ less
 * reverseOrdering (equal  ) ≡ equal
 * ```
 */
export function reverseOrdering(ordering: Ordering): Ordering {
  if (ordLt(ordering)) {
    return greater;
  }
  if (ordGt(ordering)) {
    return less;
  }
  return ordering;
}

/**
 * A helper type for reverse ordering.
 *
 * @example
 *
 * ```ts
 * class Num implements Ord<Num> {
 *   constructor(readonly x: number) { }
 *
 *   [Eq.eq](that: Num): boolean {
 *     return this.x === that.x;
 *   }
 *
 *   [Ord.cmp](that: Num): Ordering {
 *     return this.x < that.x ? less : this.x < that.x ? greater : equal;
 *   }
 * }
 *
 * const x = new Num(1);
 * const y = new Num(2);
 *
 * const ordXY = cmp(x, y);
 * console.log(ordXY); // Less
 *
 * const dx = mkReverse(x);
 * const dy = mkReverse(y);
 *
 * const ordDXY = cmp(dx, dy);
 * console.log(ordDXY); // Greater
 * ```
 */
export class Reverse<A> {
  /**
   * Construct an instance of Reverse.
   */
  constructor(readonly value: A) {}

  /**
   * Test whether this and that Reverse are equal according to their values'
   * behavior as an Eq.
   *
   * ```ts
   * eq (mkReverse (x), mkReverse (y)) ≡ eq (x, y)
   * ```
   */
  [Eq.eq]<A extends Eq<A>>(this: Reverse<A>, that: Reverse<A>): boolean {
    return eq(this.value, that.value);
  }

  /**
   * Compare this and that Reverse using Ord comparison, reversing the Ordering
   * of the underlying Ord values.
   *
   * ```ts
   * cmp (mkReverse (x), mkReverse (y)) ≡ reverseOrdering (cmp (x, y))
   * ```
   */
  [Ord.cmp]<A extends Ord<A>>(this: Reverse<A>, that: Reverse<A>): Ordering {
    return reverseOrdering(cmp(this.value, that.value));
  }

  /**
   * Combine this and that Reverse according to their values' behavior as a
   * Semigroup.
   *
   * ```ts
   * combine (mkReverse (x), mkReverse (y)) ≡ mkReverse (combine (x, y))
   * ```
   */
  [Semigroup.combine]<A extends Semigroup<A>>(
    this: Reverse<A>,
    that: Reverse<A>,
  ): Reverse<A> {
    return new Reverse(combine(this.value, that.value));
  }
}

/**
 * Construct a Reverse.
 */
export function mkReverse<A>(x: A): Reverse<A> {
  return new Reverse(x);
}

/**
 * Destruct a Reverse.
 */
export function unReverse<A>(reverse: Reverse<A>): A {
  return reverse.value;
}
