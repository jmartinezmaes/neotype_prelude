/*
 * Copyright 2022-2023 Josh Martinez
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
 * Pairs of values.
 *
 * @remarks
 *
 * `Pair<A, B>` is a type that represents a pair of values `A` and `B`. These
 * are referred to as the *first* value and *second* value, respectively. `Pair`
 * also provides an equivalence relation, a total order, and a semigroup.
 *
 * ## Importing from this module
 *
 * This module exports `Pair` as a class. The class can be imported as named:
 *
 * ```ts
 * import { Pair } from "@neotype/prelude/pair.js";
 * ```
 *
 * Or, the type and class can be imported and alised separately:
 *
 * ```ts
 * import { type Pair, Pair as P } from "@neotype/prelude/pair.js";
 * ```
 *
 * ## Constructing `Pair`
 *
 * -   Instances of `Pair` can be constructed with the `new` keyword.
 * -   The `fromTuple` static method constructs a `Pair` from a 2-tuple of
 *     values.
 *
 * ## Extracting values
 *
 * The first value and second value of a `Pair` can be accessed via the `fst`
 * property and `snd` property, respectively. A 2-tuple of the values can be
 * accessed via the `val` property.
 *
 * The `unwrap` method unwraps a `Pair` by applying a function to its first
 * value and second value.
 *
 * ## Comparing `Pair`
 *
 * `Pair` has the following behavior an an equivalance relation:
 *
 * -   A `Pair<A, B>` implements `Eq` when both `A` and `B` implement `Eq`.
 * -   Two `Pair` values are equal if their first values and second values are
 *     respectively equal.
 *
 * `Pair` has the following behavior an a total order:
 *
 * -   A `Pair<A, B>` implements `Ord` when both `A` and `B` implement `Ord`.
 * -   When ordered, the first values and second values are compared
 *     lexicographically.
 *
 * ## `Pair` as a semigroup
 *
 * `Pair` has the following behavior an a semigroup:
 *
 * -   A `Pair<A, B>` implements `Semigroup` when both `A` and `B` implement
 *     `Semigroup`.
 * -   When combined, first and second values are combined pairwise.
 *
 * ## Transforming values
 *
 * These methods transform the first or the second value within a `Pair`:
 *
 * -   `lmap` applies a function to the first value.
 * -   `map` applies a function to the second value.
 *
 * @module
 */

import { cmb, Semigroup } from "./cmb.js";
import { cmp, Eq, eq, Ord, type Ordering } from "./cmp.js";

/**
 * A pair of values.
 */
export class Pair<out A, out B> {
    /**
     * Construct a `Pair` from a 2-tuple of values.
     */
    static fromTuple<A, B>(tuple: readonly [A, B]): Pair<A, B> {
        return new Pair(tuple[0], tuple[1]);
    }

    readonly fst: A;

    readonly snd: B;

    get val(): [A, B] {
        return [this.fst, this.snd];
    }

    constructor(fst: A, snd: B) {
        this.fst = fst;
        this.snd = snd;
    }

    [Eq.eq]<A extends Eq<A>, B extends Eq<B>>(
        this: Pair<A, B>,
        that: Pair<A, B>,
    ): boolean {
        return eq(this.fst, that.fst) && eq(this.snd, that.snd);
    }

    [Ord.cmp]<A extends Ord<A>, B extends Ord<B>>(
        this: Pair<A, B>,
        that: Pair<A, B>,
    ): Ordering {
        return cmb(cmp(this.fst, that.fst), cmp(this.snd, that.snd));
    }

    [Semigroup.cmb]<A extends Semigroup<A>, B extends Semigroup<B>>(
        this: Pair<A, B>,
        that: Pair<A, B>,
    ): Pair<A, B> {
        return new Pair(cmb(this.fst, that.fst), cmb(this.snd, that.snd));
    }

    /**
     * Apply a function to the first value and second value of this `Pair` and
     * return the result.
     */
    unwrap<C>(f: (fst: A, snd: B) => C): C {
        return f(this.fst, this.snd);
    }

    /**
     * Apply a function to the first value of this `Pair`, and return a new
     * `Pair` of the result and the existing second value.
     */
    lmap<C>(f: (val: A) => C): Pair<C, B> {
        return new Pair(f(this.fst), this.snd);
    }

    /**
     * Apply a function to the second value of this `Pair`, and return a new
     * `Pair` of the existing first value and the result.
     */
    map<D>(f: (val: B) => D): Pair<A, D> {
        return new Pair(this.fst, f(this.snd));
    }
}
