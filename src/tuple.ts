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
 * This module provides the `Tuple` type, a wrapper class that provides evidence
 * of an equivalence relation, a total ordering, and a semigroup for between 2
 * and 10 elements.
 *
 * Using a Tuple as an `Eq`, an `Ord`, and a `Semigroup` requires the respective
 * implementations from all elements of the Tuple. This documentation will use
 * the following elements in all examples:
 *
 * ## Importing from this module
 *
 * This module exposes `Tuple` as a class. It is recommended to import the type
 * as named:
 *
 * ```ts
 * import { Tuple } from "@neotype/prelude/tuple.js";
 *
 * const example = new Tuple(["a", 1] as const);
 * ```
 *
 * ## Constructing `Tuple`
 *
 * `Tuple` can be constructed as a class using the `new` keyword. It receives a
 * tuple literal as its single argument.
 *
 * ## Comparing `Tuple`
 *
 * `Tuple` implements `Eq` and `Ord` when its elements each implement `Eq` and
 * `Ord`, respectively. Tuples are compared lexicographically.
 *
 * -   Two Tuples are equal when they are the same length and their respective
 *     elements are equal.
 * -   When compared, the first mismatching element defines which Tuple is
 *     lexicographically less or greater than the other.
 *
 * ## `Tuple` as a semigroup
 *
 * `Tuple` implements `Semigroup` when its elements each implement `Semigroup`.
 * Two Tuples combine their elements pairwise to return a new Tuples of the same
 * length.
 *
 * @module
 */

import { cmb, Semigroup } from "./cmb.js";
import { Eq, icmp, ieq, Ord, type Ordering } from "./cmp.js";

/**
 * A helper type for tuple literals of arity 2 through 10.
 */
export class Tuple<out T extends readonly [any, any, ...any[]]> {
    readonly val: T;

    constructor(val: T) {
        this.val = val;
    }

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
        return ieq(this.val, that.val);
    }

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
        return icmp(this.val, that.val);
    }

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
            this.val.map((x, ix) => cmb(x, that.val[ix])) as [A, A, ...A[]],
        );
    }
}
