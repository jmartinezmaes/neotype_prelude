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
 * ## Importing from this module
 *
 * This module exports utilities for ordering and comparing values. It is
 * recommended to import them as they are named:
 *
 * ```ts
 * import { clamp, cmp, Eq, eq, ge, gt, icmp, icmpBy ieq, ieqBy, le, lt, max,
 *          min, ne, Ord, Ordering, Reverse } from "@neotype/prelude/cmp.js";
 * ```
 *
 * ## Implementing equivalence relations and total orders
 *
 * - The `Eq` and `Ord` interfaces provide contracts for implementing
 *   [equivalence relations][1] and [total orders][2], respectively. See their
 *   respective documentation for implementation patterns.
 * - The `Eq` and `Ord` companion namespaces provide the unique symbols required
 *   to implement their associated interfaces.
 *
 * ## Comparing values
 *
 * These functions compare two instances of `Eq`:
 *
 * - `eq` tests for equality.
 * - `ne` tests for inequality.
 *
 * In addition to the functions above, these functions compare two instances of
 * `Ord`:
 *
 * - `cmp` determines their ordering.
 * - `lt` tests for a "less than" ordering.
 * - `gt` tests for a "greater than" ordering.
 * - `le` tests for a "less than or equal" ordering.
 * - `ge` tests for a "greater than or equal" ordering.
 *
 * These functions compare instances of `Ord` to determine extrema:
 *
 * - `min` returns the minimum of two values.
 * - `max` returns the maximum of two values.
 * - `clamp` restricts a value to an inclusive interval.
 *
 * ## Comparing Iterables
 *
 * These functions compare two Iterables of `Eq` and `Ord` values:
 *
 * - `ieq` tests for equality.
 * - `icmp` determines their ordering.
 *
 * These functions compare two Iterables of arbitrary values:
 *
 * - `ieqBy` tests for equality using a provided testing function.
 * - `icmpBy` determines their ordering using a provided comparer function.
 *
 * The `-By` methods are particularly useful for comparing Iterables without
 * requiring that their values implement `Eq` and `Ord`, or performing
 * additional transformations beforehand. Examples include comparing instances
 * of `Int8Array`, or comparing Iterables returned from `Map.prototype.entries`.
 *
 * ### Lexicographical comparison
 *
 * Iterables are compared [lexicographically][3], which means:
 *
 * - Two Iterables are compared element by element.
 * - Two empty Iterables are lexicographically equal.
 * - If two Iterables have equivalent elements and are of the same length, then
 *   the Iterables are lexicographically equal.
 * - An empty Iterable is lexicographically less than any non-empty Iterable.
 * - If one Iterable is a prefix of another, the shorter Iterable is
 *   lexicographically less than the other.
 * - The first mismatching element defines which Iterable is lexicographically
 *   less or greater than the other.
 *
 * ## Orderings
 *
 * The `Ordering` type represents a comparison between two values and is used to
 * implement `Ord`. An `Ordering` can be one of:
 *
 * - `Less`, indicating a "less than" comparison;
 * - `Equal`, indicating an "equal" comparison; or
 * - `Greater`, indicating a "greater than" comparison.
 *
 * The companion `Ordering` namespace provides utilities for working with
 * Orderings, including:
 *
 * - The `Less`, `Equal`, and `Greater` variant classes
 * - The abstract `Syntax` class that provides the fluent API for `Ordering`
 * - The `Typ` enumeration that discriminates `Ordering`
 * - The `less`, `equal`, and `greater` constants, which each represent their
 *   equivalent variant
 * - The `fromNumber` function that constructs an Ordering from a number
 *
 * ### Comparing `Ordering`
 *
 * `Ordering` implements `Eq` and `Ord`.
 *
 * - Two Orderings are equal if they are the same variant.
 * - When ordered, `Less` is less than `Equal`, and `Equal` is less than
 *   `Greater`.
 *
 * ### `Ordering` as a semigroup
 *
 * `Ordering` implements `Semigroup`. When combined, the first non-`Equal`
 * Ordering determines the overall ordering. This behavior is useful for
 * implementing lexicographical ordering.
 *
 * ### Transforming Orderings
 *
 * These methods transform an Ordering:
 *
 * - `reverse` converts `Less` to `Greater` and `Greater` to `Less`, and leaves
 *   `Equal` unaffected.
 * - `toNumber` converts an Ordering to a number.
 *
 * ## Reversing orderings
 *
 * The `Reverse` class reverses the ordering of an underlying `Ord` value, and
 * provides pass-through implementations for `Eq` and `Semigroup`.
 *
 * ## Working with equivalence relations and total orders
 *
 * Often, code must be written to accept arbitrary equivalence relations and
 * total orders. To require that a generic type `A` implements `Eq` or `Ord`, we
 * write `A extends Eq<A>` or `A extends Ord<A>`, respectively.
 *
 * Consider a function that finds the minimum value in a series of `Ord` values:
 *
 * ```ts
 * function minOf<A extends Ord<A>>(...values: [A, ...A[]]): A {
 *     return values.reduce(min);
 * }
 * ```
 *
 * [1]: https://mathworld.wolfram.com/EquivalenceRelation.html
 * [2]: https://mathworld.wolfram.com/TotalOrder.html
 * [3]: https://mathworld.wolfram.com/LexicographicOrder.html
 *
 * @module
 */

import { cmb, Semigroup } from "./cmb.js";

/**
 * An interface that provides evidence of an [equivalence relation][1].
 *
 * ## Properties
 *
 * Instances of `Eq` must implement an equality comparison that is:
 *
 * - reflexive: `eq(x, x)`;
 * - symmetric: `eq(x, y)` implies `eq(y, x)`; and
 * - transitive: `eq(x, y)` and `eq(y, z)` implies `eq(x, z)`
 *
 * for all `x`, `y`, and `z`.
 *
 * ## Implementing `Eq`
 *
 * `Eq` requires an implementation for `[Eq.eq]`.
 *
 * The most common implementation strategies are writing classes and patching
 * existing prototypes.
 *
 * Implementation is implicit and does not require an `implements` clause.
 * TypeScript uses [structural subtyping][2] to determine whether a value
 * implements `Eq`.
 *
 * ### Conditional implementation
 *
 * Working with generic types requires additional consideration: in some cases,
 * a generic type implements `Eq` **only** when one or more of its type
 * parameters implement `Eq`; in these cases, we must require an `Eq`
 * implementation for the parameter(s). In other cases, there are no such
 * requirements.
 *
 * ### Writing classes
 *
 * Classes and objects can implement `Eq`. This strategy works best for types
 * that:
 *
 * - are already modeled using classes or objects.
 * - provide direct access to their implementation.
 * - have a single, specific behavior as an equivalence relation.
 *
 * Additionally, classes can easily wrap existing types to provide a variety of
 * `Eq` implementations. These "helper" classes are useful for types that:
 *
 * - have more than one behavior as an equivalence relation, or already have a
 *   default implementation for `Eq` but can have alternative implementations.
 * - do not provide access to their implementation, and where patching the
 *   implementation is undesireable.
 *
 * #### Example: non-generic type
 *
 * Consider a `Book` type that determines equality by comparing ISBNs:
 *
 * ```ts
 * enum BookFormat { Hardback, Paperback, Digital }
 *
 * class Book {
 *     constructor(readonly isbn: number, readonly fmt: BookFormat) {}
 *
 *     [Eq.eq](that: Book): boolean {
 *         return this.isbn === that.isbn;
 *     }
 * }
 * ```
 *
 * If desired, we can also require the same `BookFormat` for two Books to be
 * considered equal:
 *
 * ```ts
 * enum BookFormat { Hardback, Paperback, Digital }
 *
 * class Book {
 *     constructor(readonly isbn: number, readonly fmt: BookFormat) {}
 *
 *     [Eq.eq](that: Book): boolean {
 *         return this.isbn === that.isbn && this.fmt === that.fmt;
 *     }
 * }
 * ```
 *
 * #### Example: generic type with no `Eq` requirements
 *
 * Consider a type that determines equality by comparing the lengths of Arrays:
 *
 * ```ts
 * class Len<A> {
 *     constructor(readonly val: A[]) {}
 *
 *     [Eq.eq](that: Len<A>): boolean {
 *         return this.val.length === that.val.length;
 *     }
 * }
 * ```
 *
 * Notice how `Len` is generic, but there are no special requirements for
 * implementing `[Eq.eq]`.
 *
 * #### Example: generic type with an `Eq` requirement
 *
 * Consider a type that determines equality by comparing the elements of Arrays
 * by index:
 *
 * ```ts
 * class Arr<A> {
 *     constructor(readonly val: A[]) {}
 *
 *     [Eq.eq]<A extends Eq<A>>(this: Arr<A>, that: Arr<A>): boolean {
 *         return ieq(this.val, that.val);
 *     }
 * }
 * ```
 *
 * Notice the extra syntax when implementing `[Eq.eq]`. We introduce a
 * *method-scoped* type parameter `A` and require that it has an `Eq`
 * implementation by writing `A extends Eq<A>` (the name `A` is arbitrary).
 *
 * Then, we require that `this` and `that` are `Arr<A>` where `A extends Eq<A>`.
 * This allows us to use `ieq` to implement our desired behavior.
 *
 * #### Example: generic type with multiple `Eq` requirements
 *
 * Consider a type that determines equality by comparing values pairwise, which
 * requires that each value in the pair implement `Eq`:
 *
 * ```ts
 * class Pair<A, B> {
 *     constructor(readonly fst: A, readonly snd: B) {}
 *
 *     [Eq.eq]<A extends Eq<A>, B extends Eq<B>>(
 *         this: Pair<A, B>,
 *         that: Pair<A, B>,
 *     ): boolean {
 *         return eq(this.fst, that.fst) && eq(this.snd, that.snd);
 *     }
 * }
 * ```
 *
 * The syntax is similar to the `Arr` implementation above. Notice there are now
 * two method-scoped type parameters that are each required to implement `Eq`.
 *
 * ### Patching existing prototypes
 *
 * Existing types can be patched to implement `Eq`. This strategy works well for
 * types that:
 *
 * - are built-in or imported from external modules.
 * - do not provide access to their implementation.
 * - have a single, specific behavior as an equivalence relation, or where the
 *   programmer wishes to implement a default behavior.
 *
 * Patching a type in TypeScript requires two steps:
 *
 * 1. an [augmentation][3] for a module or the global scope that patches the
 *    type-level representation; and
 * 1. a concrete implementation for `[Eq.eq]`.
 *
 * The concrete implementation logic is similar to writing a method body for a
 * class or object, and the same practices apply for requiring generic
 * parameters to implement `Eq`.
 *
 * #### Examples
 *
 * Consider a module augmentation for an externally defined `Book` type:
 *
 * ```ts
 * import { Book } from "path_to/book.js";
 *
 * declare module "path_to/book.js" {
 *     interface Book {
 *         [Eq.eq](that: Book): boolean
 *     }
 * }
 *
 * Book.prototype[Eq.eq] = function (that: Book): boolean {
 *     return this.isbn === that.isbn;
 * };
 * ```
 *
 * Consider a global augmentation for the `Array` prototype:
 *
 * ```ts
 * declare global {
 *     interface Array<T> {
 *         [Eq.eq]<A extends Eq<A>>(this: A[], that: A[]): boolean
 *     }
 * }
 *
 * Array.prototype[Eq.eq] = function <A extends Eq<A>>(
 *     this: A[],
 *     that: A[],
 * ): boolean {
 *     return ieq(this, that);
 * };
 * ```
 *
 * [1]: https://mathworld.wolfram.com/EquivalenceRelation.html
 * [2]: https://www.typescriptlang.org/docs/handbook/type-compatibility.html#site-content
 * [3]: https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
 */
export interface Eq<in A> {
    /**
     * Test whether this and that instance of `Eq` are considered equivalent.
     */
    [Eq.eq](that: A): boolean;
}

/**
 * The companion namespace for the `Eq` interface.
 */
export namespace Eq {
    export const eq = Symbol();
}

/**
 * Test whether two values are equal.
 *
 * `eq(x, y)` is equivalent to `x[Eq.eq](y)`.
 */
export function eq<A extends Eq<A>>(x: A, y: A): boolean {
    return x[Eq.eq](y);
}

/**
 * Test whether two values are inequal.
 *
 * `ne(x, y)` is equivalent to `!x[Eq.eq](y)`.
 */
export function ne<A extends Eq<A>>(x: A, y: A): boolean {
    return !x[Eq.eq](y);
}

/**
 * Test whether two Iterables of arbitrary values are lexicographically equal.
 *
 * If two Iterables are the same length and their respective elements are
 * determined to be equal by a provided function, then the Iterables are
 * lexicographically equal.
 */
export function ieqBy<A>(
    xs: Iterable<A>,
    ys: Iterable<A>,
    f: (x: A, y: A) => boolean,
): boolean {
    const nxs = xs[Symbol.iterator]();
    const nys = ys[Symbol.iterator]();
    let nx = nxs.next();
    let ny = nys.next();

    // eslint-disable-next-line no-constant-condition
    while (true) {
        if (!nx.done) {
            if (!ny.done) {
                if (!f(nx.value, ny.value)) {
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
 * Test whether two Iterables are lexicographically equal.
 *
 * If two Iterables are the same length and their respective elements are equal,
 * then the Iterables are lexicographically equal.
 */
export function ieq<A extends Eq<A>>(
    xs: Iterable<A>,
    ys: Iterable<A>,
): boolean {
    return ieqBy(xs, ys, eq);
}

/**
 * An interface that provides evidence of a [total order][1].
 *
 * ## Properties
 *
 * In addition to being equivalence relations, instances of `Ord` must define a
 * method of comparison such that an instance is also:
 *
 * - reflexive: `le(x, x)`;
 * - antisymmetric: `le(x, y)` and `le(y, x)` implies `eq(x, y)`;
 * - transitive: `le(x, y)` and `le(y, z)` implies `le(x, z)`; and
 * - comparable: either `le(x, y)` or `le(y, x)`
 *
 * for all `x`, `y`, and `z`.
 *
 * ## Implementing `Ord`
 *
 * `Ord` extends `Eq`, and therefore requires an implementation for both
 * `[Eq.eq]` and `[Ord.cmp]`.
 *
 * The most common implementation strategies are writing classes and patching
 * existing prototypes.
 *
 * Implementation is implicit and does not require an `implements` clause.
 * TypeScript uses [structural subtyping][2] to determine whether a value
 * implements `Ord`.
 *
 * ### Conditional implementation
 *
 * Working with generic types requires additional consideration: in some cases,
 * a generic type implements `Ord` **only** when one or more of its type
 * parameters implement `Ord`; in these cases, we must require an `Ord`
 * implementation for the parameter(s). In other cases, there are no such
 * requirements.
 *
 * ### Deriving `[Eq.eq]` from `[Ord.cmp]`
 *
 * Implementing `[Eq.eq]` for a type that has already implemented `[Ord.cmp]` is
 * trivial: simply check whether the result of comparing two instances is the
 * `Equal` Ordering. Sometimes, checking for equality can be done in a more
 * efficient manner without relying on `[Ord.cmp]`.
 *
 * ### Writing classes
 *
 * Classes and objects can implement `Ord`. This strategy works best for types
 * that:
 *
 * - are already modeled using classes or objects.
 * - provide direct access to their implementation.
 * - have a single, specific behavior as a total order.
 *
 * Additionally, classes can easily wrap existing types to provide a variety of
 * `Ord` implementations. These "helper" classes are useful for types that:
 *
 * - have more than one behavior as a total order, or already have a default
 *   implementation for `Ord` but can have alternative implementations.
 * - do not provide access to their implementation, and where patching the
 *   implementation is undesireable.
 *
 * #### Example: non-generic type
 *
 * Consider a Book type that determines ordering by comparing ISBNs:
 *
 * ```ts
 * enum BookFormat { Hardback, Paperback, Digital }
 *
 * class Book {
 *     constructor(readonly isbn: number, readonly fmt: BookFormat) {}
 *
 *     [Eq.eq](that: Book): boolean {
 *         // An exercise for the reader...
 *     }
 *
 *     [Ord.cmp](that: Book): Ordering {
 *         return Ordering.fromNumber(this.isbn - that.isbn);
 *     }
 * }
 * ```
 *
 * If desired, we can also consider a Book's `BookFormat` property that helps
 * determine ordering:
 *
 * ```ts
 * enum BookFormat { Hardback, Paperback, Digital }
 *
 * class Book {
 *     constructor(readonly isbn: number, readonly fmt: BookFormat) {}
 *
 *     [Eq.eq](that: Book): boolean {
 *         // An exercise for the reader...
 *     }
 *
 *     [Ord.cmp](that: Book): Ordering {
 *         return cmb(
 *             Ordering.fromNumber(this.isbn - that.isbn),
 *             Ordering.fromNumber(this.fmt - that.fmt),
 *         );
 *     }
 * }
 * ```
 *
 * In this example, Books are ordered first by their ISBN, then by their format.
 * Notice how the semigroup behavior of `Ordering` along with `cmb` is used here
 * to combine two Orderings.
 *
 * #### Example: generic type with no `Ord` requirements
 *
 * Consider a type that determines ordering by comparing the length of Arrays:
 *
 * ```ts
 * class Len<A> {
 *     constructor(readonly val: A[]) {}
 *
 *     [Eq.eq](that: Len<A>): boolean {
 *         // An exercise for the reader...
 *     }
 *
 *     [Ord.cmp](that: Len<A>): Ordering {
 *         return Ordering.fromNumber(this.val.length - that.val.length);
 *     }
 * }
 * ```
 *
 * Notice how `Len` is generic, but there are no special requirements for
 * implementing `[Ord.cmp]`.
 *
 * #### Example: generic type with an `Ord` requirement
 *
 * Consider a type that determines ordering by comparing Arrays
 * lexicographically, which requires that the Array's elements implement `Ord`:
 *
 * ```ts
 * class Arr<A> {
 *     constructor(readonly val: A[]) {}
 *
 *     [Eq.eq]<A extends Eq<A>>(this: Arr<A>, that: Arr<A>): boolean {
 *         // An exercise for the reader...
 *     }
 *
 *     [Ord.cmp]<A extends Ord<A>>(this: Arr<A>): Ordering {
 *         return icmp(this.val, that.val);
 *     }
 * }
 * ```
 *
 * Notice the extra syntax when implementing `[Ord.cmp]`. We introduce a
 * *method-scoped* type parameter `A` and require that it has a `Ord`
 * implementation by writing `A extends Ord<A>` (the name `A` is arbitrary).
 *
 * Then, we require that `this` and `that` are `Arr<A>` where
 * `A extends Ord<A>`. This allows us to use `cmp` to implement our desired
 * behavior.
 *
 * #### Example: generic type with multiple `Ord` requirements
 *
 * Consider a type that determines ordering by comparing a first then second
 * value, which requires that each value implement `Ord`:
 *
 * ```ts
 * class Pair<A, B> {
 *     constructor(readonly fst: A, readonly snd: B) {}
 *
 *     [Eq.eq]<A extends Eq<A>, B extends Eq<B>>(
 *         this: Pair<A, B>,
 *         that: Pair<A, B>,
 *     ): boolean {
 *         // An exercise for the reader...
 *     }
 *
 *     [Ord.cmp]<A exends Ord<A>, B extends Ord<B>>(
 *         this: Pair<A, B>,
 *         that: Pair<A, B>,
 *     ): Ordering {
 *         return cmb(cmp(this.fst, that.fst), cmp(this.snd, that.snd));
 *     }
 * }
 * ```
 *
 * The syntax is similar to the `Arr` implementation above. Notice there are now
 * two method-scoped type parameters that are each required to implement `Ord`.
 *
 * ### Patching existing prototypes
 *
 * Existing types can be patched to implement `Ord`. This strategy works well
 * for types that:
 *
 * - are built-in or imported from external modules.
 * - do not provide access to their implementation.
 * - have a single, specific behavior as a total order, or where the programmer
 *   wishes to implement a default behavior.
 *
 * Patching a type in TypeScript requires two steps:
 *
 * 1. an [augmentation][3] for a module or the global scope that patches the
 *    type-level representation; and
 * 1. a concrete implementation for `[Ord.cmp]` and `[Eq.eq]`.
 *
 * The concrete implementation logic is similar to writing a method body for a
 * class or object, and the same practices apply for requiring generic
 * parameters to implement `Ord`.
 *
 * #### Examples
 *
 * Consider a module augmentation for an externally defined `Book` type:
 *
 * ```ts
 * import { Book } from "path_to/book.js";
 *
 * declare module "path_to/book.js" {
 *     interface Book {
 *         [Eq.eq](that: Book): boolean
 *         [Ord.cmp](that: Book): Ordering
 *     }
 * }
 *
 * Book.prototype[Eq.eq] = function (that: Book): boolean {
 *     // An exercise for the reader...
 * };
 *
 * Book.prototype[Ord.cmp] = function (that: Book): Ordering {
 *     return Ordering.fromNumber(this.isbn - that.isbn);
 * };
 * ```
 *
 * Consider a global augmentation for the `Array` prototype:
 *
 * ```ts
 * declare global {
 *     interface Array<T> {
 *         [Eq.eq]<A extends Eq<A>>(this: A[], that: A[]): boolean
 *         [Ord.cmp]<A extends Ord<A>>(this: A[], that: A[]): Ordering
 *     }
 * }
 *
 * Array.prototype[Eq.eq] = function <A extends Eq<A>>(
 *     this: A[],
 *     that: A[],
 * ): boolean {
 *     // An exercise for the reader...
 * }
 *
 * Array.prototype[Ord.cmp] = function <A extends Ord<A>>(
 *     this: A[],
 *     that: A[],
 * ): boolean {
 *     return icmp(this, that);
 * };
 * ```
 *
 * [1]: https://mathworld.wolfram.com/TotalOrder.html
 * [2]: https://www.typescriptlang.org/docs/handbook/type-compatibility.html#site-content
 * [3]: https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
 */
export interface Ord<in A> extends Eq<A> {
    /**
     * Compare this and that instance of `Ord` to determine their ordering.
     */
    [Ord.cmp](that: A): Ordering;
}

/**
 * The companion namespace for the `Ord` interface.
 */
export namespace Ord {
    export const cmp = Symbol();
}

/**
 * Compare two values to determine their ordering.
 *
 * `cmp(x, y)` is equivalent to `x[Ord.cmp](y)`
 */
export function cmp<A extends Ord<A>>(x: A, y: A): Ordering {
    return x[Ord.cmp](y);
}

/**
 * Compare two Iterables of arbitrary values to determing their lexicographical
 * ordering.
 */
export function icmpBy<A>(
    xs: Iterable<A>,
    ys: Iterable<A>,
    f: (x: A, y: A) => Ordering,
): Ordering {
    const nxs = xs[Symbol.iterator]();
    const nys = ys[Symbol.iterator]();
    let nx = nxs.next();
    let ny = nys.next();

    // eslint-disable-next-line no-constant-condition
    while (true) {
        if (!nx.done) {
            if (!ny.done) {
                const ordering = f(nx.value, ny.value);
                if (ordering.isNe()) {
                    return ordering;
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
 * Compare two Iterables to determine their lexicographical ordering.
 */
export function icmp<A extends Ord<A>>(
    xs: Iterable<A>,
    ys: Iterable<A>,
): Ordering {
    return icmpBy(xs, ys, cmp);
}

/**
 * Test for a "less than" ordering between two values.
 *
 * Return `true` if `x` is less than `y`.
 */
export function lt<A extends Ord<A>>(x: A, y: A): boolean {
    return cmp(x, y).isLt();
}

/**
 * Test for a "greater than" ordering between two values.
 *
 * Return `true` if `x` is greater than `y`.
 */
export function gt<A extends Ord<A>>(x: A, y: A): boolean {
    return cmp(x, y).isGt();
}

/**
 * Test for a "less than or equal" ordering between two values.
 *
 * Return `true` if `x` is less than or equal to `y`.
 */
export function le<A extends Ord<A>>(x: A, y: A): boolean {
    return cmp(x, y).isLe();
}

/**
 * Test for a "greater than or equal" ordering between two values.
 *
 * Return `true` if `x` is greater than or equal to `y`.
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
 *
 * `clamp(x, lo, hi)` is equivalent to `min(max(x, lo, hi))`.
 */
export function clamp<A extends Ord<A>>(x: A, lo: A, hi: A) {
    return min(max(x, lo), hi);
}

/**
 * The result of a comparison between two values.
 */
export type Ordering = Ordering.Less | Ordering.Equal | Ordering.Greater;

/**
 * The companion namespace for the `Ordering` type.
 */
export namespace Ordering {
    /**
     * An enumeration that discriminates `Ordering`.
     */
    export enum Typ {
        Less,
        Equal,
        Greater,
    }

    /**
     * Construct an Ordering from a number.
     *
     * - If `n < 0`, return `Less`.
     * - If `n > 0`, return `Greater`.
     * - If `n === 0`, return `Equal`.
     *
     * This function assumes all arguments are never `NaN`. Passing `NaN` as an
     * argument to this function will result in undefined behavior.
     */
    export function fromNumber(n: number): Ordering {
        if (n < 0) {
            return less;
        }
        if (n > 0) {
            return greater;
        }
        return equal;
    }

    /**
     * The fluent syntax for `Ordering`.
     */
    export abstract class Syntax {
        [Eq.eq](this: Ordering, that: Ordering): boolean {
            return this.typ === that.typ;
        }

        [Ord.cmp](this: Ordering, that: Ordering): Ordering {
            return fromNumber(this.typ - that.typ);
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
         * - `Less` becomes `Greater`.
         * - `Greater` becomes `Less`.
         * - `Equal` remains `Equal`.
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

        /**
         * Convert this Ordering to a number.
         *
         * - If this is `Less`, return -1.
         * - If this is `Greater`, return 1.
         * - If this is `Equal`, return 0.
         */
        toNumber(this: Ordering): -1 | 0 | 1 {
            if (this.isLt()) {
                return -1;
            }
            if (this.isGt()) {
                return 1;
            }
            return 0;
        }
    }

    /**
     * An Ordering that models a "less than" comparison result.
     */
    export class Less extends Syntax {
        static readonly singleton = new Less();

        /**
         * The property that discriminates `Ordering`.
         */
        readonly typ = Typ.Less;

        private constructor() {
            super();
        }
    }

    /**
     * An Ordering that models an "equal" comparison result.
     */
    export class Equal extends Syntax {
        static readonly singleton = new Equal();

        /**
         * The property that discriminates `Ordering`.
         */
        readonly typ = Typ.Equal;

        private constructor() {
            super();
        }
    }

    /**
     * An Ordering that models a "greater than" comparison result.
     */
    export class Greater extends Syntax {
        static readonly singleton = new Greater();

        /**
         * The property that discriminates `Ordering`.
         */
        readonly typ = Typ.Greater;

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
