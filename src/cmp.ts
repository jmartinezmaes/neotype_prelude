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
 * **Reflexivity**
 *
 * `eq(x, x) === true`
 *
 * **Symmetry**
 *
 * `eq(x, y) === eq(y, x)`
 *
 * **Transitivity**
 *
 * If `eq(x, y) && eq(y, z) === true` then `eq(x, z) === true`
 *
 * **Extensionality**
 *
 * If `eq(x, y) === true` and `f` is a function whose return type is an
 * instance of Eq, then `eq(f(x), f(y)) === true`
 */
export interface Eq<in A> {
    /**
     * Test whether this and that value are considered equal.
     */
    [Eq.eq](that: A): boolean;
}

export namespace Eq {
    export const eq = Symbol();
}

/**
 * Test two values for equality.
 *
 * ```ts
 * eq(x, y) ≡ x[Eq.eq](y)
 * ```
 */
export function eq<A extends Eq<A>>(x: A, y: A): boolean {
    return x[Eq.eq](y);
}

/**
 * Test two values for inequality.
 *
 * ```ts
 * ne(x, y) ≡ !x[Eq.eq](y)
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
 * Instances of Ord **must** satisfy the following properties:
 *
 * **Comparability**
 *
 * `le(x, y) || le(y, x) === true`
 *
 * **Transitivity**
 *
 * If `le(x, y) && le(y, z) === true` then `le(x, z) === true`
 *
 * **Reflexivity**
 *
 * `le(x, x) === true`
 *
 * **Antisymmetry**
 *
 * If `le(x, y) && le(y, x) === true` then `eq(x, y) === true`
 */
export interface Ord<in A> extends Eq<A> {
    /**
     * Compare this and that value to determine an Ordering.
     */
    [Ord.cmp](that: A): Ordering;
}

export namespace Ord {
    export const cmp = Symbol();
}

/**
 * Compare two values to determine an Ordering.
 *
 * ```ts
 * cmp(x, y) ≡ x[Ord.cmp](y)
 * ```
 */
export function cmp<A extends Ord<A>>(x: A, y: A): Ordering {
    return x[Ord.cmp](y);
}

/**
 * Compare two iterables to determine an Ordering.
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
                if (ord.isNe()) {
                    return ord;
                }
                nx = nxs.next();
                ny = nys.next();
            } else {
                return Ordering.greater;
            }
        } else {
            return ny.done ? Ordering.equal : Ordering.less;
        }
    }
}

/**
 * Test whether `x` is less than `y`.
 */
export function lt<A extends Ord<A>>(x: A, y: A): boolean {
    return cmp(x, y).isLt();
}

/**
 * Test whether `x` is greater than `y`.
 */
export function gt<A extends Ord<A>>(x: A, y: A): boolean {
    return cmp(x, y).isGt();
}

/**
 * Test whether `x` is less than or equal to `y`.
 */
export function le<A extends Ord<A>>(x: A, y: A): boolean {
    return cmp(x, y).isLe();
}

/**
 * Test whether `x` is greater than or equal to `y`.
 */
export function ge<A extends Ord<A>>(x: A, y: A): boolean {
    return cmp(x, y).isGe();
}

/**
 * Return the lesser of two values.
 *
 * If the values are equal, return the first value.
 */
export function min<A extends Ord<A>>(x: A, y: A): A {
    return le(x, y) ? x : y;
}

/**
 * Return the greater of two values.
 *
 * If the values are equal, return the first value.
 */
export function max<A extends Ord<A>>(x: A, y: A): A {
    return ge(x, y) ? x : y;
}

/**
 * Restrict a value to an inclusive interval.
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
     * An enumeration that discriminates Ordering.
     */
    export enum Typ {
        Less = 0,
        Equal = 1,
        Greater = 2,
    }

    /**
     * The fluent syntax for Ordering.
     */
    export abstract class Syntax {
        [Eq.eq](this: Ordering, that: Ordering): boolean {
            return this.typ === that.typ;
        }

        [Ord.cmp](this: Ordering, that: Ordering): Ordering {
            if (this.isLt()) {
                return that.isLt() ? equal : less;
            }
            if (this.isGt()) {
                return that.isGt() ? equal : greater;
            }
            return that.isEq() ? equal : that.isLt() ? greater : less;
        }

        [Semigroup.cmb](this: Ordering, that: Ordering): Ordering {
            return this.isEq() ? that : this;
        }

        /**
         * Test whether this Ordering is `Equal`.
         */
        isEq(this: Ordering): this is Equal {
            return this.typ === Typ.Equal;
        }

        /**
         * Test whether this Ordering is not `Equal`.
         */
        isNe(this: Ordering): this is Less | Greater {
            return !this.isEq();
        }

        /**
         * Test whether this Ordering is `Less`.
         */
        isLt(this: Ordering): this is Less {
            return this.typ === Typ.Less;
        }

        /**
         * Test whether this Ordering is `Greater`.
         */
        isGt(this: Ordering): this is Greater {
            return this.typ === Typ.Greater;
        }

        /**
         * Test whether this Ordering is `Less` or `Equal`.
         */
        isLe(this: Ordering): this is Less | Equal {
            return !this.isGt();
        }

        /**
         * Test whether this Ordering is `Greater` or `Equal`.
         */
        isGe(this: Ordering): this is Greater | Equal {
            return !this.isLt();
        }

        /**
         * Reverse this Ordering.
         *
         * -   `Less` becomes `Greater`.
         * -   `Greater` becomes `Less`.
         * -   `Equal` remains `Equal`.
         */
        reverse(this: Ordering): Ordering {
            if (this.isLt()) {
                return greater;
            }
            if (this.isGt()) {
                return less;
            }
            return this;
        }
    }

    /**
     * An Ordering that models a "less than" comparison result.
     */
    export class Less extends Syntax {
        /**
         * The property that discriminates Ordering.
         */
        readonly typ = Typ.Less;

        static readonly singleton = new Less();

        private constructor() {
            super();
        }
    }

    /**
     * An Ordering that models an "equal" comparison result.
     */
    export class Equal extends Syntax {
        /**
         * The property that discriminates Ordering.
         */
        readonly typ = Typ.Equal;

        static readonly singleton = new Equal();

        private constructor() {
            super();
        }
    }

    /**
     * An Ordering that models a "greater than" comparison result.
     */
    export class Greater extends Syntax {
        /**
         * The property that discriminates Ordering.
         */
        readonly typ = Typ.Greater;

        static readonly singleton = new Greater();

        private constructor() {
            super();
        }
    }

    /**
     * The Ordering that models a "less than" comparison result.
     */
    export const less = Ordering.Less.singleton as Ordering;

    /**
     * The Ordering that models an "equal" comparison result.
     */
    export const equal = Ordering.Equal.singleton as Ordering;

    /**
     * The Ordering that models a "greater than" comparison result.
     */
    export const greater = Ordering.Greater.singleton as Ordering;
}

/**
 * A helper type for reverse ordering.
 */
export class Reverse<A> {
    readonly val: A;

    constructor(val: A) {
        this.val = val;
    }

    [Eq.eq]<A extends Eq<A>>(this: Reverse<A>, that: Reverse<A>): boolean {
        return eq(this.val, that.val);
    }

    [Ord.cmp]<A extends Ord<A>>(this: Reverse<A>, that: Reverse<A>): Ordering {
        return cmp(this.val, that.val).reverse();
    }

    [Semigroup.cmb]<A extends Semigroup<A>>(
        this: Reverse<A>,
        that: Reverse<A>,
    ): Reverse<A> {
        return new Reverse(cmb(this.val, that.val));
    }
}
