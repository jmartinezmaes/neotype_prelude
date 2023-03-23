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
 * Functionality for ordering and comparison.
 *
 * @remarks
 *
 * This module provides utilities for implementing equivalance relations and
 * total orders, as well as ordering and comparing values.
 *
 * ## Importing from this module
 *
 * It is recommended to import items from this module individually:
 *
 * ```ts
 * import { clamp, cmp, Eq, eq, ge, gt, icmp, icmpBy ieq, ieqBy, le, lt, max,
 *          min, ne, Ord, Ordering, Reverse } from "@neotype/prelude/cmp.js";
 * ```
 *
 * ## Implementing equivalence relations and total orders
 *
 * -   The `Eq` and `Ord` interfaces provide contracts for implementing
 *     [equivalence relations] and [total orders], respectively. See their
 *     respective documentation for implementation patterns.
 * -   The `Eq` and `Ord` companion namespaces provide the unique symbols
 *     required to implement their associated interfaces.
 *
 * ## Comparing values
 *
 * These functions compare two `Eq` values:
 *
 * -   `eq` tests for equality.
 * -   `ne` tests for inequality.
 
 * In addition to the functions above, these functions compare two `Ord` values:
 *
 * -   `cmp` determines their ordering.
 * -   `lt` tests for a "less than" ordering.
 * -   `gt` tests for a "greater than" ordering.
 * -   `le` tests for a "less than or equal" ordering.
 * -   `ge` tests for a "greater than or equal" ordering.
 *
 * These functions compare `Ord` values to determine extrema:
 *
 * -   `min` returns the minimum of two values.
 * -   `max` returns the maximum of two values.
 * -   `clamp` restricts a value to an inclusive interval.
 *
 * ## Comparing iterables
 *
 * These functions compare two iterables of `Eq` and `Ord` values:
 *
 * -   `ieq` tests for equality.
 * -   `icmp` determines their ordering.
 *
 * These functions compare two iterables of arbitrary values:
 *
 * -   `ieqBy` tests for equality using a provided testing function.
 * -   `icmpBy` determines their ordering using a provided comparer function.
 *
 * The `*By` methods are particularly useful for comparing iterables without
 * requiring that their values implement `Eq` and `Ord`, or performing
 * additional transformations beforehand. Examples include comparing instances
 * of `Int8Array`, or comparing iterables returned from `Map.prototype.entries`.
 *
 * ### Lexicographical comparison
 *
 * Iterables are compared [lexicographically], which means:
 *
 * -   Two iterables are compared element by element.
 * -   Two empty iterables are lexicographically equal.
 * -   If two iterables have equivalent elements and are the same size, the
 *     iterables are lexicographically equal.
 * -   An empty iterable is lexicographically less than any non-empty iterable.
 * -   If one iterable is a prefix of another, the shorter iterable is
 *     lexicographically less than the other.
 * -   The first mismatching element defines which iterable is lexicographically
 *     less or greater than the other.
 *
 * ## The `Ordering` type
 *
 * The `Ordering` type represents a comparison between two values and is used to
 * implement `Ord`. An `Ordering` has three variants:
 *
 * -   `Less`, indicating a "less than" comparison;
 * -   `Equal`, indicating an "equal" comparison; and
 * -   `Greater`, indicating a "greater than" comparison.
 *
 * The `Ordering` companion namespace provides utilities for working with
 * `Ordering` values, including:
 *
 * -   The `Less`, `Equal`, and `Greater` variant classes
 * -   The abstract `Syntax` class that provides the fluent API for `Ordering`
 * -   The `Kind` enumeration that discriminates `Ordering`
 * -   The `less`, `equal`, and `greater` constants, which each represent their
 *     equivalent variant
 * -   The `fromNumber` function that constructs an `Ordering` from a `number`
 *     or a `bigint`
 *
 * ### Comparing `Ordering`
 *
 * `Ordering` implements `Eq` and `Ord`.
 *
 * -   Two `Ordering` values are equal if they are the same variant.
 * -   When ordered, the `Less` variant compares as less than the `Equal`
 *     variant, and the `Equal` variant compares as less than the `Greater`
 *     variant.
 *
 * ### `Ordering` as a semigroup
 *
 * `Ordering` implements `Semigroup`. When combined, the first variant that is
 * not `Equal` takes precedence over any other variant and determines the
 * overall ordering.
 *
 * ### Transforming `Ordering`
 *
 * These methods transform an `Ordering`:
 *
 * -   `reverse` converts `Less` to `Greater` and `Greater` to `Less`, and
 *     leaves `Equal` as is.
 * -   `toNumber` converts an `Ordering` to a `number`.
 *
 * ## Reversing order
 *
 * The `Reverse` class provides an implementation for `Ord` that reverses the 
 * order of an underlying implementor of `Ord`.
 *
 * ## Working with generic equivalence relations and total orders
 *
 * Sometimes it is necessary to work with arbitrary equivalence relations and
 * total orders. To require that a generic type `T` implements `Eq` or `Ord`, we
 * write `T extends Eq<T>` or `T extends Ord<T>`, respectively.
 *
 * [equivalence relations]:
 *     https://mathworld.wolfram.com/EquivalenceRelation.html
 * [total orders]: https://mathworld.wolfram.com/TotalOrder.html
 * [lexicographically]: https://mathworld.wolfram.com/LexicographicOrder.html
 *
 * @example Working with generic equivalence relations
 *
 * Consider a program that finds all `Eq` values in an array that occur only
 * once:
 *
 * ```ts
 * import { Eq, eq } from "@neotype/prelude/cmp.js";
 *
 * function singles<T extends Eq<T>>(vals: T[]): T[] {
 *     return vals.filter((val0, idx0) =>
 *         !vals.some((val1, idx1) => eq(val0, val1) && idx0 !== idx1),
 *     );
 * }
 * ```
 *
 * @example Working with generic total orders
 *
 * Consider a program that finds all `Ord` values in an array that are less than
 * a given value:
 *
 * ```ts
 * import { lt, Ord } from "@neotype/prelude/cmp.js";
 *
 * function filterLt<T extends Ord<T>>(vals: T[], input: T): T[] {
 *     return vals.filter((val) => lt(val, input));
 * }
 * ```
 *
 * @module
 */

import { Semigroup } from "./cmb.js";

/**
 * An interface that provides evidence of an [equivalence relation].
 *
 * [equivalence relation]:
 *     https://mathworld.wolfram.com/EquivalenceRelation.html
 *
 * @remarks
 *
 * ## Properties
 *
 * Implementors of `Eq` must implement an equality comparison that is:
 *
 * -   reflexive: `eq(x, x)`;
 * -   symmetric: `eq(x, y)` implies `eq(y, x)`; and
 * -   transitive: `eq(x, y)` and `eq(y, z)` implies `eq(x, z)`
 *
 * for all values `x`, `y`, and `z`.
 *
 * ## Implementing `Eq`
 *
 * `Eq` requires an implementation for `[Eq.eq]`.
 *
 * The most common implementation strategies are writing classes and patching
 * existing prototypes. Implementation is implicit and does not require an
 * `implements` clause. TypeScript uses [structural subtyping] to determine
 * whether a value implements `Eq`.
 *
 * ### Conditional implementation
 *
 * Working with generic types requires additional consideration: in some cases,
 * a generic type implements `Eq` **only** when one or more of its generic
 * parameters implement `Eq`; in these cases, we must require an `Eq`
 * implementation from the parameter(s). In other cases, there are no such
 * requirements.
 *
 * ### Writing classes
 *
 * Classes and objects can implement `Eq`. This strategy works best for types
 * that:
 *
 * -   are already modeled using classes or objects.
 * -   provide direct access to their implementation.
 * -   have a single, specific behavior as an equivalence relation.
 *
 * Additionally, classes can easily wrap existing types to provide a variety of
 * `Eq` implementations. These "helper" classes are useful for types that:
 *
 * -   have more than one behavior as an equivalence relation, or already have a
 *     default implementation for `Eq` but can have alternative implementations.
 * -   do not provide access to their implementation, and where patching the
 *     implementation is undesireable.
 *
 * ### Patching existing prototypes
 *
 * Existing types can be patched to implement `Eq`. This strategy works well for
 * types that:
 *
 * -   are built-in or imported from external modules.
 * -   do not provide access to their implementation.
 * -   have a single, specific behavior as an equivalence relation, or where the
 *     programmer wishes to implement a default behavior.
 *
 * Patching a type in TypeScript requires two steps:
 *
 * 1.  an [augmentation] for a module or the global scope that patches the
 *     type-level representation; and
 * 2.  a concrete implementation for `[Eq.eq]`.
 *
 * The concrete implementation logic is similar to writing a method body for a
 * class or object, and the same practices apply for requiring generic
 * parameters to implement `Eq`.
 *
 * [structural subtyping]:
 *     https://www.typescriptlang.org/docs/handbook/type-compatibility.html#site-content
 * [augmentation]:
 *     https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
 *
 * @example Non-generic implementation
 *
 * Consider a `Book` type that determines equality by comparing ISBNs:
 *
 * ```ts
 * import { Eq } from "@neotype/prelude/cmp.js";
 *
 * enum BookFormat { HARD_BACK, PAPER_BACK, DIGITAL }
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
 * If desired, we can also require the same `BookFormat` for two `Book` values
 * to be considered equal:
 *
 * ```ts
 * import { Eq } from "@neotype/prelude/cmp.js";
 *
 * enum BookFormat { HARD_BACK, PAPER_BACK, DIGITAL }
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
 * @example Generic implementation with no `Eq` requirements
 *
 * Consider a type that determines equality by comparing the lengths of arrays:
 *
 * ```ts
 * import { Eq } from "@neotype/prelude/cmp.js";
 *
 * class Len<out T> {
 *     constructor(readonly val: T[]) {}
 *
 *     [Eq.eq](that: Len<T>): boolean {
 *         return this.val.length === that.val.length;
 *     }
 * }
 * ```
 *
 * Notice how `Len` is generic, but there are no special requirements for
 * implementing `[Eq.eq]`.
 *
 * @example Generic implementation with an `Eq` requirement
 *
 * Consider a type that determines equality for arrays by comparing their
 * elements lexicographically, which requires that the elements implement `Eq`:
 *
 * ```ts
 * import { Eq, ieq } from "@neotype/prelude/cmp.js";
 *
 * class Arr<out T> {
 *     constructor(readonly val: T[]) {}
 *
 *     [Eq.eq]<T extends Eq<T>>(this: Arr<T>, that: Arr<T>): boolean {
 *         return ieq(this.val, that.val);
 *     }
 * }
 * ```
 *
 * Notice the extra syntax when implementing `[Eq.eq]`. We introduce a
 * *method-scoped* generic parameter `T` and require that it has an `Eq`
 * implementation by writing `T extends Eq<T>` (the name `T` is arbitrary).
 *
 * Then, we require that `this` and `that` are `Arr<T>` where `T extends Eq<T>`.
 * This allows us to use `ieq` to implement our desired behavior.
 *
 * @example Generic implementation with multiple `Eq` requirements
 *
 * Consider a type that determines equality for two distinct values, which
 * requires that each value has a distinct implementation for `Eq`:
 *
 * ```ts
 * import { Eq, eq } from "@neotype/prelude/cmp.js";
 *
 * class Pair<out A, out B> {
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
 * two method-scoped generic parameters that are each required to implement
 * `Eq`.
 *
 * @example Non-generic augmentation
 *
 * Consider a module augmentation for an externally defined `Book` type:
 *
 * ```ts
 * import { Eq } from "@neotype/prelude/cmp.js";
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
 * @example Generic augmentation
 *
 * Consider a global augmentation for the `Array` prototype:
 *
 * ```ts
 * import { Eq, ieq } from "@neotype/prelude/cmp.js";
 *
 * declare global {
 *     interface Array<T> {
 *         [Eq.eq]<T extends Eq<T>>(this: T[], that: T[]): boolean
 *     }
 * }
 *
 * Array.prototype[Eq.eq] = function <T extends Eq<T>>(
 *     this: T[],
 *     that: T[],
 * ): boolean {
 *     return ieq(this, that);
 * };
 * ```
 */
export interface Eq<in T> {
	/**
	 * Test whether this and that `Eq` value are equal.
	 */
	[Eq.eq](that: T): boolean;
}

/**
 * The companion namespace for the `Eq` interface.
 */
export namespace Eq {
	/**
	 * The unique symbol used by implementors of `Eq`.
	 */
	export const eq = Symbol();
}

/**
 * Test whether two `Eq` values are equal.
 *
 * @remarks
 *
 * `eq(lhs, rhs)` is equivalent to `lhs[Eq.eq](rhs)`.
 */
export function eq<T extends Eq<T>>(lhs: T, rhs: T): boolean {
	return lhs[Eq.eq](rhs);
}

/**
 * Test whether two `Eq` values are inequal.
 *
 * @remarks
 *
 * `ne(lhs, rhs)` is equivalent to `!lhs[Eq.eq](rhs)`.
 */
export function ne<T extends Eq<T>>(lhs: T, rhs: T): boolean {
	return !lhs[Eq.eq](rhs);
}

/**
 * Test whether two iterables of arbitrary values are lexicographically equal.
 *
 * @remarks
 *
 * If the iterables are the same length and their respective elements are
 * determined to be equal by a provided function, the iterables are
 * lexicographically equal.
 */
export function ieqBy<T>(
	lhs: Iterable<T>,
	rhs: Iterable<T>,
	eqBy: (lhs: T, rhs: T) => boolean,
): boolean {
	const lhsIter = lhs[Symbol.iterator]();
	const rhsIter = rhs[Symbol.iterator]();

	for (
		let lhsNxt = lhsIter.next(), rhsNxt = rhsIter.next();
		;
		lhsNxt = lhsIter.next(), rhsNxt = rhsIter.next()
	) {
		if (lhsNxt.done) {
			return !!rhsNxt.done;
		}
		if (rhsNxt.done) {
			return false;
		}
		if (!eqBy(lhsNxt.value, rhsNxt.value)) {
			return false;
		}
	}
}

/**
 * Test whether two iterables of `Eq` values are lexicographically equal.
 *
 * @remarks
 *
 * If the iterables are the same length and their respective elements are equal,
 * then the iterables are lexicographically equal.
 */
export function ieq<T extends Eq<T>>(
	lhs: Iterable<T>,
	rhs: Iterable<T>,
): boolean {
	return ieqBy(lhs, rhs, eq);
}

/**
 * An interface that provides evidence of a [total order].
 *
 * [total order]: https://mathworld.wolfram.com/TotalOrder.html
 *
 * @remarks
 *
 * ## Properties
 *
 * In addition to being equivalence relations, implementors of `Ord` must define
 * a method of comparison such that an implementation is also:
 *
 * -   reflexive: `le(x, x)`;
 * -   antisymmetric: `le(x, y)` and `le(y, x)` implies `eq(x, y)`;
 * -   transitive: `le(x, y)` and `le(y, z)` implies `le(x, z)`; and
 * -   comparable: `le(x, y)` or `le(y, x)`
 *
 * for all values `x`, `y`, and `z`.
 *
 * ## Implementing `Ord`
 *
 * `Ord` extends `Eq`, and therefore requires an implementation for both
 * `[Eq.eq]` and `[Ord.cmp]`.
 *
 * The most common implementation strategies are writing classes and patching
 * existing prototypes. Implementation is implicit and does not require an
 * `implements` clause. TypeScript uses [structural subtyping] to determine
 * whether a value implements `Ord`.
 *
 * ### Conditional implementation
 *
 * Working with generic types requires additional consideration: in some cases,
 * a generic type implements `Ord` **only** when one or more of its generic
 * parameters implement `Ord`; in these cases, we must require an `Ord`
 * implementation from the parameter(s). In other cases, there are no such
 * requirements.
 *
 * ### Deriving `[Eq.eq]` from `[Ord.cmp]`
 *
 * Implementing `[Eq.eq]` for a type that has already implemented `[Ord.cmp]` is
 * trivial: simply check whether the result of comparing two instances is the
 * `Equal` variant of `Ordering`. Sometimes, determining equality can be done in
 * a more efficient manner without relying on `[Ord.cmp]`.
 *
 * ### Writing classes
 *
 * Classes and objects can implement `Ord`. This strategy works best for types
 * that:
 *
 * -   are already modeled using classes or objects.
 * -   provide direct access to their implementation.
 * -   have a single, specific behavior as a total order.
 *
 * Additionally, classes can easily wrap existing types to provide a variety of
 * `Ord` implementations. These "helper" classes are useful for types that:
 *
 * -   have more than one behavior as a total order, or already have a default
 *     implementation for `Ord` but can have alternative implementations.
 * -   do not provide access to their implementation, and where patching the
 *     implementation is undesireable.
 *
 * ### Patching existing prototypes
 *
 * Existing types can be patched to implement `Ord`. This strategy works well
 * for types that:
 *
 * -   are built-in or imported from external modules.
 * -   do not provide access to their implementation.
 * -   have a single, specific behavior as a total order, or where the
 *     programmer wishes to implement a default behavior.
 *
 * Patching a type in TypeScript requires two steps:
 *
 * 1.  an [augmentation] for a module or the global scope that patches the
 *     type-level representation; and
 * 2.  a concrete implementation for `[Ord.cmp]` and `[Eq.eq]`.
 *
 * The concrete implementation logic is similar to writing a method body for a
 * class or object, and the same practices apply for requiring generic
 * parameters to implement `Ord`.
 *
 * [structural subtyping]:
 *     https://www.typescriptlang.org/docs/handbook/type-compatibility.html#site-content
 * [augmentation]:
 *     https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
 *
 * @example Non-generic implementation
 *
 * Consider a `Book` type that determines ordering by comparing ISBNs:
 *
 * ```ts
 * import { Eq, Ord, Ordering } from "@neotype/prelude/cmp.js";
 *
 * enum BookFormat { HARD_BACK, PAPER_BACK, DIGITAL }
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
 * If desired, we can also consider the `BookFormat` property when ordering two
 * `Book` values:
 *
 * ```ts
 * import { Eq, Ord, Ordering } from "@neotype/prelude/cmp.js";
 *
 * enum BookFormat { HARD_BACK, PAPER_BACK, DIGITAL }
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
 * In this example, `Book` values are ordered first by their ISBN, and then by
 * their format. Notice how the semigroup behavior of `Ordering` along with the
 * `cmb` function is used here to combine two `Ordering` values.
 *
 * @example Generic implementation with no `Ord` requirements
 *
 * Consider a type that orders arrays by comparing their lengths:
 *
 * ```ts
 * import { Eq, Ord, Ordering } from "@neotype/prelude/cmp.js";
 *
 * class Len<out T> {
 *     constructor(readonly val: T[]) {}
 *
 *     [Eq.eq](that: Len<T>): boolean {
 *         // An exercise for the reader...
 *     }
 *
 *     [Ord.cmp](that: Len<T>): Ordering {
 *         return Ordering.fromNumber(this.val.length - that.val.length);
 *     }
 * }
 * ```
 *
 * Notice how `Len` is generic, but there are no special requirements for
 * implementing `[Ord.cmp]`.
 *
 * @example Generic implementation with an `Ord` requirement
 *
 * Consider a type that orders arrays by comparing their elements
 * lexicographically, which requires that the elements implement `Ord`:
 *
 * ```ts
 * import { Eq, icmp, Ord, Ordering } from "@neotype/prelude/cmp.js";
 *
 * class Arr<out T> {
 *     constructor(readonly val: T[]) {}
 *
 *     [Eq.eq]<T extends Eq<T>>(this: Arr<T>, that: Arr<T>): boolean {
 *         // An exercise for the reader...
 *     }
 *
 *     [Ord.cmp]<T extends Ord<T>>(this: Arr<T>, that: Arr<T>): Ordering {
 *         return icmp(this.val, that.val);
 *     }
 * }
 * ```
 *
 * Notice the extra syntax when implementing `[Ord.cmp]`. We introduce a
 * *method-scoped* generic parameter `T` and require that it has an `Ord`
 * implementation by writing `T extends Ord<T>` (the name `T` is arbitrary).
 *
 * Then, we require that `this` and `that` are `Arr<T>` where `T extends
 * Ord<T>`. This allows us to use `icmp` to implement our desired behavior.
 *
 * @example Generic implementation with multiple `Ord` requirements
 *
 * Consider a type that orders two distinct values lexicographically, which
 * requires that each value has a distinct implementation for `Ord`:
 *
 * ```ts
 * import { cmb } from "@neotype/prelude/cmb.js";
 * import { Eq, cmp, Ord, Ordering } from "@neotype/prelude/cmp.js";
 *
 * class Pair<out A, out B> {
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
 * two method-scoped generic parameters that are each required to implement
 * `Ord`.
 *
 * @example Non-generic augmentation
 *
 * Consider a module augmentation for an externally defined `Book` type:
 *
 * ```ts
 * import { Eq, Ord, Ordering } from "@neotype/prelude/cmp.js";
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
 * @example Generic augmentation
 *
 * Consider a global augmentation for the `Array` prototype:
 *
 * ```ts
 * import { Eq, icmp, Ord, Ordering } from "@neotype/prelude/cmp.js";
 *
 * declare global {
 *     interface Array<T> {
 *         [Eq.eq]<T extends Eq<T>>(this: T[], that: T[]): boolean
 *         [Ord.cmp]<T extends Ord<T>>(this: T[], that: T[]): Ordering
 *     }
 * }
 *
 * Array.prototype[Eq.eq] = function <T extends Eq<T>>(
 *     this: T[],
 *     that: T[],
 * ): boolean {
 *     // An exercise for the reader...
 * }
 *
 * Array.prototype[Ord.cmp] = function <T extends Ord<T>>(
 *     this: T[],
 *     that: T[],
 * ): boolean {
 *     return icmp(this, that);
 * };
 * ```
 */
export interface Ord<in T> extends Eq<T> {
	/**
	 * Compare this and that `Ord` value to determine their ordering.
	 */
	[Ord.cmp](that: T): Ordering;
}

/**
 * The companion namespace for the `Ord` interface.
 */
export namespace Ord {
	/**
	 * The unique symbol used by implementors of `Ord`.
	 */
	export const cmp = Symbol();
}

/**
 * Compare two `Ord` values to determine their ordering.
 *
 * @remarks
 *
 * `cmp(lhs, rhs)` is equivalent to `lhs[Ord.cmp](rhs)`.
 */
export function cmp<T extends Ord<T>>(lhs: T, rhs: T): Ordering {
	return lhs[Ord.cmp](rhs);
}

/**
 * Compare two iterables of arbitrary values to determine their lexicographical
 * ordering.
 */
export function icmpBy<T>(
	lhs: Iterable<T>,
	rhs: Iterable<T>,
	cmpBy: (lhs: T, rhs: T) => Ordering,
): Ordering {
	const lhsIter = lhs[Symbol.iterator]();
	const rhsIter = rhs[Symbol.iterator]();

	for (
		let lhsNxt = lhsIter.next(), rhsNxt = rhsIter.next();
		;
		lhsNxt = lhsIter.next(), rhsNxt = rhsIter.next()
	) {
		if (lhsNxt.done) {
			return rhsNxt.done ? Ordering.equal : Ordering.less;
		}
		if (rhsNxt.done) {
			return Ordering.greater;
		}
		const ordering = cmpBy(lhsNxt.value, rhsNxt.value);
		if (ordering.isNe()) {
			return ordering;
		}
	}
}

/**
 * Compare two iterables of `Ord` values to determine their lexicographical
 * ordering.
 */
export function icmp<T extends Ord<T>>(
	lhs: Iterable<T>,
	rhs: Iterable<T>,
): Ordering {
	return icmpBy(lhs, rhs, cmp);
}

/**
 * Test for a "less than" ordering between two `Ord` values.
 *
 * @remarks
 *
 * Return `true` if `lhs` is less than `rhs`.
 */
export function lt<T extends Ord<T>>(lhs: T, rhs: T): boolean {
	return cmp(lhs, rhs).isLt();
}

/**
 * Test for a "greater than" ordering between two `Ord` values.
 *
 * @remarks
 *
 * Return `true` if `lhs` is greater than `rhs`.
 */
export function gt<T extends Ord<T>>(lhs: T, rhs: T): boolean {
	return cmp(lhs, rhs).isGt();
}

/**
 * Test for a "less than or equal" ordering between two `Ord` values.
 *
 * @remarks
 *
 * Return `true` if `lhs` is less than or equal to `rhs`.
 */
export function le<T extends Ord<T>>(lhs: T, rhs: T): boolean {
	return cmp(lhs, rhs).isLe();
}

/**
 * Test for a "greater than or equal" ordering between two `Ord` values.
 *
 * @remarks
 *
 * Return `true` if `lhs` is greater than or equal to `rhs`.
 */
export function ge<T extends Ord<T>>(lhs: T, rhs: T): boolean {
	return cmp(lhs, rhs).isGe();
}

/**
 * Return the lesser of two `Ord` values.
 *
 * @remarks
 *
 * If the values are equal, return the first value.
 */
export function min<T extends Ord<T>>(lhs: T, rhs: T): T {
	return le(lhs, rhs) ? lhs : rhs;
}

/**
 * Return the greater of two `Ord` values.
 *
 * @remarks
 *
 * If the values are equal, return the first value.
 */
export function max<T extends Ord<T>>(lhs: T, rhs: T): T {
	return ge(lhs, rhs) ? lhs : rhs;
}

/**
 * Restrict an `Ord` value to an inclusive interval.
 *
 * @remarks
 *
 * `clamp(val, lo, hi)` is equivalent to `min(max(val, lo), hi)`.
 */
export function clamp<T extends Ord<T>>(val: T, lo: T, hi: T) {
	return min(max(val, lo), hi);
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
	 * Construct an `Ordering` from a `number` or a `bigint`.
	 *
	 * @remarks
	 *
	 * -   If `n < 0`, return `Less`.
	 * -   If `n > 0`, return `Greater`.
	 * -   If `n === 0`, return `Equal`.
	 *
	 * An argument must never be `NaN`. This is the caller's responsibility to
	 * enforce!
	 */
	export function fromNumber(num: number | bigint): Ordering {
		if (num < 0) {
			return less;
		}
		if (num > 0) {
			return greater;
		}
		return equal;
	}

	/**
	 * The fluent syntax for `Ordering`.
	 */
	export abstract class Syntax {
		/**
		 * If this and that `Ordering` are the same variant, return `true`;
		 * otherwise, return `false`.
		 */
		[Eq.eq](this: Ordering, that: Ordering): boolean {
			return this.kind === that.kind;
		}

		/**
		 * Compare this and that `Ordering` to determine their ordering.
		 *
		 * @remarks
		 *
		 * When ordered, the `Less` variant compares as less than the `Equal`
		 * variant, and the `Equal` variant compares as less than the `Greater`
		 * variant.
		 */
		[Ord.cmp](this: Ordering, that: Ordering): Ordering {
			return fromNumber(this.kind - that.kind);
		}

		/**
		 * If this `Ordering` is `Less` or `Greater`, return this `Ordering`;
		 * otherwise, return that `Ordering`.
		 */
		[Semigroup.cmb](this: Ordering, that: Ordering): Ordering {
			return this.isEq() ? that : this;
		}

		/**
		 * Test whether this `Ordering` is `Equal`.
		 */
		isEq(this: Ordering): this is Equal {
			return this.kind === Kind.EQUAL;
		}

		/**
		 * Test whether this `Ordering` is not `Equal`.
		 */
		isNe(this: Ordering): this is Less | Greater {
			return !this.isEq();
		}

		/**
		 * Test whether this `Ordering` is `Less`.
		 */
		isLt(this: Ordering): this is Less {
			return this.kind === Kind.LESS;
		}

		/**
		 * Test whether this `Ordering` is `Greater`.
		 */
		isGt(this: Ordering): this is Greater {
			return this.kind === Kind.GREATER;
		}

		/**
		 * Test whether this `Ordering` is `Less` or `Equal`.
		 */
		isLe(this: Ordering): this is Less | Equal {
			return !this.isGt();
		}

		/**
		 * Test whether this `Ordering` is `Greater` or `Equal`.
		 */
		isGe(this: Ordering): this is Greater | Equal {
			return !this.isLt();
		}

		/**
		 * Reverse this `Ordering`.
		 *
		 * @remarks
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

		/**
		 * Convert this `Ordering` to a `number`.
		 *
		 * @remarks
		 *
		 * -   If this is `Less`, return -1.
		 * -   If this is `Greater`, return 1.
		 * -   If this is `Equal`, return 0.
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
	 * An enumeration that discriminates `Ordering`.
	 */
	export enum Kind {
		LESS,
		EQUAL,
		GREATER,
	}

	/**
	 * An `Ordering` that indicates a "less than" comparison result.
	 */
	export class Less extends Syntax {
		/**
		 * The singleton instance of the `Less` variant of `Ordering`.
		 *
		 * @remarks
		 *
		 * The `less` constant is a more accessible alias for this object.
		 */
		static readonly singleton = new Less();

		/**
		 * The property that discriminates `Ordering`.
		 */
		readonly kind = Kind.LESS;

		private constructor() {
			super();
		}
	}

	/**
	 * An `Ordering` that indicates an "equal" comparison result.
	 */
	export class Equal extends Syntax {
		/**
		 * The singleton instance of the `Equal` variant of `Ordering`.
		 *
		 * @remarks
		 *
		 * The `equal` constant is a more accessible alias for this object.
		 */
		static readonly singleton = new Equal();

		/**
		 * The property that discriminates `Ordering`.
		 */
		readonly kind = Kind.EQUAL;

		private constructor() {
			super();
		}
	}

	/**
	 * An `Ordering` that indicates a "greater than" comparison result.
	 */
	export class Greater extends Syntax {
		/**
		 * The singleton instance of the `Greater` variant of `Ordering`.
		 *
		 * @remarks
		 *
		 * The `greater` constant is a more accessible alias for this object.
		 */
		static readonly singleton = new Greater();

		/**
		 * The property that discriminates `Ordering`.
		 */
		readonly kind = Kind.GREATER;

		private constructor() {
			super();
		}
	}

	/**
	 * The `Ordering` that indicates a "less than" comparison result.
	 */
	export const less = Ordering.Less.singleton as Ordering;

	/**
	 * The `Ordering` that indicates an "equal" comparison result.
	 */
	export const equal = Ordering.Equal.singleton as Ordering;

	/**
	 * The `Ordering` that indicates a "greater than" comparison result.
	 */
	export const greater = Ordering.Greater.singleton as Ordering;
}

/**
 * A helper type for reversing order.
 */
export class Reverse<out T> {
	/**
	 * The value of this `Reverse`.
	 */
	readonly val: T;

	constructor(val: T) {
		this.val = val;
	}

	/**
	 * If the values of this and that `Reverse` are equal, return `true`;
	 * otherwise, return `false`.
	 */
	[Eq.eq]<T extends Eq<T>>(this: Reverse<T>, that: Reverse<T>): boolean {
		return eq(this.val, that.val);
	}

	/**
	 * Compare the value of this `Reverse` to the value of that `Reverse` and
	 * reverse the result of the comparison.
	 */
	[Ord.cmp]<T extends Ord<T>>(this: Reverse<T>, that: Reverse<T>): Ordering {
		return cmp(this.val, that.val).reverse();
	}
}
