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
 * Pairs of values.
 *
 * `Pair<A, B>` is a type that represents a pair of values `A` and `B`. Pairs
 * provide equivalence relations, total orders, and semigroups for two or more
 * values.
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
 * Pairs can be instantiated using the `new` keyword. These static methods also
 * construct a Pair:
 *
 * - `new` constructs a Pair from two values. This method mirrors the
 *   constructor signature.
 * - `fromTuple` constructs a Pair from a 2-tuple of values.
 *
 * ## Extracting values
 *
 * The first and second values of a Pair can be accessed via the `fst` and `snd`
 * properties, respectively. A 2-tuple of the values can be accessed via the
 * `val` property.
 *
 * Additionally, the `fold` method will unwrap a Pair by applying a function to
 * its first and second values.
 *
 * ## Comparing `Pair`
 *
 * `Pair` implements `Eq` and `Ord` when both its first and second generic types
 * implement `Eq` and `Ord`, respectively.
 *
 * - Two pairs are equal if their first and second values are respectively
 *   equal.
 * - `Pair` compares its first and second values lexicographically.
 *
 * ## `Pair` as a semigroup
 *
 * `Pair` implements `Semigroup` when both its first and second generic types
 * implement `Semigroup`. First and second values are combined pairwise.
 *
 * ## Transforming values
 *
 * These methods transform a Pair's value(s):
 *
 * - `bimap` applies two functions to the first and second values, respectively.
 * - `lmap` applies a function to the first value, and leaves the second value
 *   unaffected.
 * - `map` applies a function to the second value, and leaves the first value
 *   unaffected.
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
     * Construct a Pair from two values.
     */
    static new<A, B>(x: A, y: B): Pair<A, B> {
        return new Pair(x, y);
    }

    /**
     * Construct a Pair from a 2-tuple of values.
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
     * Fold out of this Pair by applying a function to its values.
     */
    fold<C>(f: (x: A, y: B) => C): C {
        return f(this.fst, this.snd);
    }

    /**
     * Apply two functions to this Pair's first and second values, respectively.
     */
    bimap<C, D>(lmap: (x: A) => C, rmap: (x: B) => D): Pair<C, D> {
        return new Pair(lmap(this.fst), rmap(this.snd));
    }

    /**
     * Apply a function to this Pair's first value.
     */
    lmap<C>(f: (x: A) => C): Pair<C, B> {
        return new Pair(f(this.fst), this.snd);
    }

    /**
     * Apply a function to this Pair's second value.
     */
    map<D>(f: (x: B) => D): Pair<A, D> {
        return new Pair(this.fst, f(this.snd));
    }
}
