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

import { cmb, Semigroup } from "./cmb.js";

/**
 * An interface that provides evidence of an equivalance relation.
 *
 * ## Properties
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
 * instance of Eq, then `eq (f (x), f (y)) === true`
 */
export interface Eq<in A> {
    [Eq.eq](that: A): boolean;
}

export namespace Eq {
    /**
     * A unique symbol for a method that tests two values for equality.
     */
    export const eq = Symbol("@neotype/prelude/Eq/eq");
}

/**
 * Test two values for equality.
 *
 * ```ts
 * eq (x, y) ≡ x[Eq.eq](y)
 * ```
 */
export function eq<A extends Eq<A>>(x: A, y: A): boolean {
    return x[Eq.eq](y);
}

/**
 * Test two values for inequality.
 *
 * ```ts
 * ne (x, y) ≡ !x[Eq.eq](y)
 * ```
 */
export function ne<A extends Eq<A>>(x: A, y: A): boolean {
    return !x[Eq.eq](y);
}

/**
 * Test two iterables for equality.
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
 * An interface that provides evidence of a total order.
 *
 * ## Properties
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
    [Ord.cmp](that: A): Ordering;
}

export namespace Ord {
    /**
     * A unique symbol for a method that determines the ordering of two values.
     */
    export const cmp = Symbol("@neotype/prelude/Ord/compare");
}

/**
 * Determine the ordering of two values.
 *
 * ```ts
 * cmp (x, y) ≡ x[Ord.cmp](y)
 * ```
 */
export function cmp<A extends Ord<A>>(x: A, y: A): Ordering {
    return x[Ord.cmp](y);
}

/**
 * Determine the ordering of two iterables.
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
 * Test whether `x` is less than `y`.
 */
export function lt<A extends Ord<A>>(x: A, y: A): boolean {
    return ordLt(cmp(x, y));
}

/**
 * Test whether `x` is greater than `y`.
 */
export function gt<A extends Ord<A>>(x: A, y: A): boolean {
    return ordGt(cmp(x, y));
}

/**
 * Test whether `x` is less than or equal to `y`.
 */
export function le<A extends Ord<A>>(x: A, y: A): boolean {
    return ordLe(cmp(x, y));
}

/**
 * Test whether `x` is greater than or equal to `y`.
 */
export function ge<A extends Ord<A>>(x: A, y: A): boolean {
    return ordGe(cmp(x, y));
}

/**
 * Find the minimum of two values.
 */
export function min<A extends Ord<A>>(x: A, y: A): A {
    return le(x, y) ? x : y;
}

/**
 * Find the maximum of two values.
 */
export function max<A extends Ord<A>>(x: A, y: A): A {
    return ge(x, y) ? x : y;
}

/**
 * Restrict a value to an inclusive bounds.
 */
export function clamp<A extends Ord<A>>(x: A, lo: A, hi: A) {
    return min(max(x, lo), hi);
}

/**
 * The result of a comparison between two values.
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
     * The fluent syntax for Ordering.
     */
    export abstract class Syntax {
        /**
         * Test this and that Ordering for equality.
         */
        [Eq.eq](this: Ordering, that: Ordering): boolean {
            return this.val === that.val;
        }

        /**
         * Determine the ordering of this and that Ordering, where
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
         * If this Ordering is Equal, return this; otherwise, return the other
         * Ordering.
         */
        [Semigroup.cmb](this: Ordering, that: Ordering): Ordering {
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
        readonly val = -1;

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
        readonly val = 0;

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
        readonly val = 1;

        /**
         * The singleton instance of the Greater Ordering.
         */
        static readonly singleton = new Greater();

        /**
         * `Greater` is not constructable; use the {@link greater} constant
         * instead.
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
    return ordering.val === -1;
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
    return ordering.val === 0;
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
    return ordering.val === 1;
}

/**
 * Reverse an ordering.
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
 */
export class Reverse<A> {
    /**
     * Construct an instance of Reverse.
     */
    constructor(readonly val: A) {}

    /**
     * Test this and that Reverse for equality using thier values' behavior as
     * instances of Eq.
     */
    [Eq.eq]<A extends Eq<A>>(this: Reverse<A>, that: Reverse<A>): boolean {
        return eq(this.val, that.val);
    }

    /**
     * Determine the ordering of this and that Reverse, reversing the ordering
     * of their underlying Ord values.
     */
    [Ord.cmp]<A extends Ord<A>>(this: Reverse<A>, that: Reverse<A>): Ordering {
        return reverseOrdering(cmp(this.val, that.val));
    }

    /**
     * Combine this and that Reverse using their values' behavior as instances
     * of Semigroup.
     */
    [Semigroup.cmb]<A extends Semigroup<A>>(
        this: Reverse<A>,
        that: Reverse<A>,
    ): Reverse<A> {
        return new Reverse(cmb(this.val, that.val));
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
    return reverse.val;
}
