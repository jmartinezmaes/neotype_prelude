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
 * Functionality for "inclusive-or" relationships.
 *
 * @remarks
 *
 * `Ior<A, B>` is a type that represents one or both of two values. It is
 * represented by three variants: `Left<A>`, `Right<B>`, and `Both<A, B>`.
 *
 * -   A `Left<A>` contains a *left-hand* value of type `A`.
 * -   A `Right<B>` contains a *right-hand* value of type `B`.
 * -   A `Both<A, B>` contains a left-hand value of type `A` and a right-hand
 *     value of type `B`.
 *
 * `Ior` is often used to represent states of failure or success similar to
 * `Either` and `Validation`. However, `Ior` is capable of also representing a
 * unique state using the `Both` variant. `Both` can represent a success that
 * contains additional information, or a state of "partial failure".
 *
 * When composed, the behavior of `Ior` is a combination of the short-circuiting
 * behavior of `Either` and the failure-accumulating behavior of `Validation`:
 *
 * -   A `Left` short-circuits a computation completely and combines its
 *     left-hand value with any existing left-hand value.
 * -   A `Right` supplies its right-hand value to the next computation.
 * -   A `Both` supplies its right-hand value to the next computation, and
 *     combines its left-hand value with any existing left-hand value.
 *
 * Combinators with this behavior require a `Semigroup` implementation from the
 * accumulating left-hand value.
 *
 * ## Importing from this module
 *
 * This module exports `Ior` as both a type and a namespace. The `Ior` type is
 * an alias for a discriminated union, and the `Ior` namespace provides:
 *
 * -   The `Left`, `Right`, and `Both` variant classes
 * -   The abstract `Syntax` class that provides the fluent API for `Ior`
 * -   The `Kind` enumeration that discriminates `Ior`
 * -   Functions for constructing, chaining, collecting into, and lifting into
 *     `Ior`
 *
 * The type and namespace can be imported under the same alias:
 *
 * ```ts
 * import { Ior } from "@neotype/prelude/ior.js";
 * ```
 *
 * Or, the type and namespace can be imported and aliased separately:
 *
 * ```ts
 * import { type Ior, Ior as I } from "@neotype/prelude/ior.js";
 * ```
 *
 * ## Constructing `Ior`
 *
 * These methods construct an `Ior`:
 *
 * -   `left` constructs a `Left` variant.
 * -   `right` constructs a `Right` variant.
 * -   `both` constructs a `Both` variant.
 * -   `fromEither` constructs an `Ior` from an `Either`.
 * -   `fromValidation` constructs an `Ior` from a `Validation`.
 *
 * ## Querying and narrowing the variant
 *
 * The `isLeft`, `isRight`, and `isBoth` methods return `true` if an `Ior` is
 * a `Left`, a `Right`, or a `Both`, respectively. These methods also narrow the
 * type of an `Ior` to the queried variant.
 *
 * The variant can also be queried and narrowed via the `kind` property, which
 * returns a member of the `Kind` enumeration.
 *
 * ## Extracting values
 *
 * The value(s) within an `Ior` can be accessed via the `val` property. If an
 * `Ior` is a `Left` or a `Right`, the `val` property accesses the left-hand
 * value or right-hand value, respectively. If an `Ior` is a `Both`, the `val`
 * property accesses a 2-tuple of the left-hand value and right-hand value. The
 * type of the property can be narrowed by first querying the variant.
 *
 * The left-hand value and right-hand value of a `Both` variant can be accessed
 * individually via the `fst` property and `snd` property, respectively.
 *
 * The `unwrap` method unwraps an `Ior` by applying one of three functions to
 * its left-hand and/or right-hand value(s).
 *
 * ## Comparing `Ior`
 *
 * `Ior` has the following behavior as an equivalence relation:
 *
 * -   An `Ior<A, B>` implements `Eq` when both `A` and `B` implement `Eq`.
 * -   Two `Ior` values are equal if they are the same variant and their
 *     left-hand and/or right-hand value(s) are equal.
 *
 * `Ior` has the following behavior as a total order:
 *
 * -   An `Ior<A, B>` implements `Ord` when both `A` and `B` implement `Ord`.
 * -   When ordered, a `Left` always compares as less than any `Right`, and a
 *     `Right` always compares as less than any `Both`. If the variants are the
 *     same, their left-hand and/or right-hand values are compared to determine
 *     the ordering. `Both` variants compare their left-hand values and
 *     right-hand values lexicographically.
 *
 * ## `Ior` as a semigroup
 *
 * `Ior` has the following behavior as a semigroup:
 *
 * -   An `Ior<A, B>` implements `Semigroup` when both `A` and `B` implement
 *     `Semigroup`.
 * -   When combined, left-hand values and right-hand values are combined
 *     pairwise. Combination is lossless and merges values into `Both` variants
 *     when there is no existing value to combine with.
 *
 * ## Transforming values
 *
 * These methods transform the value(s) within an `Ior`:
 *
 * -   `lmap` applies a function to the left-hand value.
 * -   `map` applies a function to the right-hand value.
 *
 * These methods combine the right-hand values of two `Right` and/or `Both`
 * variants, or short-circuit on the first `Left`:
 *
 * -   `zipWith` applies a function to their right-hand values.
 * -   `zipFst` keeps only the first right-hand value, and discards the second.
 * -   `zipSnd` keeps only the second right-hand value, and discards the first.
 *
 * ## Chaining `Ior`
 *
 * The `flatMap` method chains together computations that return `Ior`. If an
 * `Ior` has a right-hand value, a function is applied the value to return
 * another `Ior`. The left-hand values of `Both` variants accumulate using their
 * behavior as a semigroup. If an `Ior` is a `Left`, the computation halts and
 * the left-hand value is combined with any existing left-hand value, and the
 * result is returned in a `Left`.
 *
 * ## Generator comprehenshions
 *
 * Generator comprehensions provide an imperative syntax for chaining together
 * synchronous or asynchronous computations that return or resolve with `Ior`
 * values.
 *
 * ### Writing comprehensions
 *
 * Synchronus and asynchronous comprehensions are written using `function*` and
 * `async function*` declarations, respectively.
 *
 * Synchronous generator functions should use the `Ior.Go` type alias as a
 * return type. A generator function that returns an `Ior.Go<A, T>` may `yield*`
 * zero or more `Ior<A, any>` values and must return a result of type `T`.
 * Synchronous comprehensions may also `yield*` other `Ior.Go` generators
 * directly.
 *
 * Async generator functions should use the `Ior.GoAsync` type alias as a return
 * type. An async generator function that returns an `Ior.GoAsync<A, T>` may
 * `yield*` zero or more `Ior<A, any>` values and must return a result of type
 * `T`. `PromiseLike` values that resolve with `Ior` should be awaited before
 * yielding. Async comprehensions may also `yield*` other `Ior.Go` and
 * `Ior.GoAsync` generators directly.
 *
 * Each `yield*` expression may bind a variable of the right-hand value type of
 * the yielded `Ior`. Comprehensions should always use `yield*` instead of
 * `yield`. Using `yield*` allows TypeScript to accurately infer the right-hand
 * value type of the yielded `Ior` when binding the value of each `yield*`
 * expression.
 *
 * Comprehensions require that the left-hand values of all yielded `Ior` values
 * are implementors of the same `Semigroup` so the values may accumulate as the
 * generator yields.
 *
 * ### Evaluating comprehensions
 *
 * `Ior.Go` and `Ior.GoAsync` generators must be evaluated before accessing
 * their results.
 *
 * The `go` function evaluates an `Ior.Go<A, T> generator to return an `Ior<A,
 * T>`. If any yielded `Ior` is a `Left`, the generator halts and the left-hand
 * value is combined with any existing left-hand value, and `go` returns the
 * result in a `Left`; otherwise, when the generator returns, `go` returns the
 * result as a right-hand value.
 *
 * The `goAsync` function evaluates an `Ior.GoAsync<A, T>` async generator to
 * return a `Promise<Ior<A, T>>`. If any yielded `Ior` is a `Left`, the
 * generator halts and the left-hand value is combined with any existing
 * left-hand value, and `goAsync` resolves with the result in a `Left`;
 * otherwise, when the generator returns, `goAsync` resolves with the result as
 * a right-hand value. Thrown errors are captured as rejections.
 *
 * In both synchronous and asynchronous comprehensions, the left-hand values of
 * yielded `Both` variants accumulate using their behavior as a semigroup.
 *
 * ## Collecting into `Ior`
 *
 * These methods turn a container of `Ior` elements "inside out". If all
 * elements have right-hand values, the values are collected into an equivalent
 * container and returned as a right-hand value. The left-hand values of `Both`
 * variants accumulate using their behavior as a semigroup. If any element is a
 * `Left`, the collection halts and the left-hand value is combined with any
 * existing left-hand value, and the result is returned in a `Left`.
 *
 * -   `collect` turns an array or a tuple literal of `Ior` elements inside out.
 *     For example:
 *     -   `Ior<A, B>[]` becomes `Ior<A, B[]>`
 *     -   `[Ior<A, B1>, Ior<A, B2>]` becomes `Ior<A, [B1, B2]>`
 * -   `gather` turns a record or an object literal of `Ior` elements inside
 *     out. For example:
 *     -   `Record<string, Ior<A, B>>` becomes `Ior<A, Record<string, B>>`
 *     -   `{ x: Ior<A, B1>, y: Ior<A, B2> }` becomes `Ior<A, { x: B1, y: B2 }>`
 *
 * The `reduce` function reduces a finite iterable from left to right in the
 * context of `Ior`. This is useful for mapping, filtering, and accumulating
 * values using `Ior`.
 *
 * ## Lifting functions to work with `Ior`
 *
 * The `lift` function receives a function that accepts arbitrary arguments,
 * and returns an adapted function that accepts `Ior` values as arguments
 * instead. The arguments are evaluated from left to right, and if they all
 * have right-hand values, the original function is applied to the values and
 * the result is returned as a right-hand value. The left-hand values of `Both`
 * variants accumulate using their behavior as a semigroup. If any argument is a
 * `Left`, the operation halts and the left-hand value is combined with any
 * existing left-hand value, and the result is returned in a `Left`.
 *
 * @example Basic matching and unwrapping
 *
 * ```ts
 * import { Ior } from "@neotype/prelude/ior.js"
 *
 * const strIorNum: Ior<string, number> = Ior.both("a", 1);
 *
 * // Querying and narrowing using methods
 * if (strIorNum.isLeft()) {
 *     console.log(`Queried Left: ${strIorNum.val}`);
 * } else if (strIorNum.isRight()) {
 *     console.log(`Queried Right: ${strIorNum.val}`);
 * } else {
 *     console.log(`Queried Both: ${strIorNum.fst} and ${strIorNum.snd}`);
 * }
 *
 * // Querying and narrowing using the `kind` property
 * switch (strIorNum.kind) {
 *     case Ior.Kind.LEFT:
 *         console.log(`Matched Left: ${strIorNum.val}`);
 *         break;
 *     case Ior.Kind.RIGHT:
 *         console.log(`Matched Right: ${strIorNum.val}`);
 *         break;
 *     case Ior.Kind.BOTH:
 *         console.log(`Matched Both: ${strIorNum.fst} and ${strIorNum.snd}`);
 * }
 *
 * // Case analysis using `unwrap`
 * strIorNum.unwrap(
 *     (str) => console.log(`Unwrapped Left: ${str}`),
 *     (num) => console.log(`Unwrapped Right: ${num}`),
 *     (str, num) => console.log(`Unwrapped Both: ${str} and ${num}`),
 * );
 * ```
 *
 * @example Parsing with `Ior`
 *
 * First, the necessary imports:
 *
 * ```ts
 * import { Semigroup } from "@neotype/prelude/cmb.js";
 * import { Ior } from "@neotype/prelude/ior.js";
 * ```
 *
 * For our example, let's also define a helper semigroup type and some other
 * utilities:
 *
 * ```ts
 * // A semigroup that wraps arrays.
 * class List<out T> {
 *     readonly val: T[];
 *
 *     constructor(...vals: T[]) {
 *         this.val = vals;
 *     }
 *
 *     [Semigroup.cmb](that: List<T>): List<T> {
 *         return new List(...this.val, ...that.val);
 *     }
 *
 *     toJSON(): T[] {
 *         return this.val;
 *     }
 * }
 *
 * // A `Log` represents a List of entries relevant to our program. Log entries
 * // have a log level of "info" or "err".
 * type Log = List<string>;
 *
 * function info(msg: string): Log {
 *     return new List(`info: ${msg}`);
 * }
 *
 * function err(msg: string): Log {
 *     return new List(`err: ${msg}`);
 * }
 * ```
 *
 * Now, consider a program that uses `Ior` to parse an even integer.
 *
 * ```ts
 * function parseInt(input: string): Ior<Log, number> {
 *     const n = Number.parseInt(input);
 *     return Number.isNaN(n)
 *         ? Ior.left(err(`cannot parse '${input}' as int`))
 *         : Ior.both(info(`parse '${input}' ok`), n);
 * }
 *
 * function guardEven(n: number): Ior<Log, number> {
 *     return n % 2 === 0 ? Ior.right(n) : Ior.left(err(`${n} is not even`));
 * }
 *
 * function parseEvenInt(input: string): Ior<Log, number> {
 *     return parseInt(input).flatMap(guardEven);
 * }
 *
 * ["a", "1", "2", "-4", "+42", "0x2A"].forEach((input) => {
 *     const result = JSON.stringify(parseEvenInt(input).val);
 *     console.log(`input "${input}": ${result}`);
 * });
 *
 * // input "a": ["err: cannot parse 'a' as int]
 * // input "1": ["err: 1 is not even"]
 * // input "2": [["info: parse '2' ok"],2]
 * // input "-4": [["info: parse '-4' ok"],-4]
 * // input "+42": [["info: parse '+42' ok"],42]
 * // input "0x2A: [["info: parse '0x2A' ok"],42]
 * ```
 *
 * Suppose we want to parse an array of inputs and collect the successful
 * results, or fail on the first parse error. We may write the following:
 *
 * ```ts
 * function parseEvenInts(inputs: string[]): Ior<Log, number[]> {
 *     return Ior.collect(inputs.map(parseEvenInt));
 * }
 *
 * [
 *     ["a", "-4"],
 *     ["2", "-7"],
 *     ["+42", "0x2A"],
 * ].forEach((inputs) => {
 *     const result = JSON.stringify(parseEvenInts(inputs).val);
 *     console.log(`inputs ${JSON.stringify(inputs)}:\n  ${result}`);
 * });
 *
 * // inputs ["a","-4"]:
 * //   ["err: cannot parse 'a' as int"]
 * // inputs ["2","-7"]:
 * //   ["info: parse '2' ok","info: parse '-7' ok","err: -7 is not even"]
 * // inputs ["+42" "0x2A"]:
 * //   [["info: parse '+42' ok","info: parse '0x2A' ok"],[42,42]]
 * ```
 *
 * Perhaps we want to associate the original input strings with our successful
 * parses:
 *
 * ```ts
 * function parseEvenIntsKeyed(
 *     inputs: string[],
 * ): Ior<Log, Record<string, number>> {
 *     return Ior.gather(
 *         Object.fromEntries(
 *             inputs.map((input) => [input, parseEvenInt(input)] as const),
 *         ),
 *     );
 * }
 *
 * [
 *     ["a", "-4"],
 *     ["2", "-7"],
 *     ["+42", "0x2A"],
 * ].forEach((inputs) => {
 *     const result = JSON.stringify(parseEvenIntsKeyed(inputs).val);
 *     console.log(`inputs ${JSON.stringify(inputs)}:\n  ${result}`);
 * });
 *
 * // inputs ["a","-4"]:
 * //   ["err: cannot parse 'a' as int"]
 * // inputs ["2","-7"]:
 * //   ["info: parse '2' ok","info: parse '-7' ok","err: -7 is not even"]
 * // inputs ["+42" "0x2A"]:
 * //   [["info: parse '+42' ok","info: parse '0x2A' ok"],{"+42":42,"0x2A":42}]
 * ```
 *
 * Or, perhaps we want to sum our successful parses and return a total:
 *
 * ```ts
 * function parseEvenIntsAndSum(inputs: string[]): Ior<Log, number> {
 *     return Ior.reduce(
 *         inputs,
 *         (total, input) => parseEvenInt(input).map((even) => total + even),
 *         0,
 *     );
 * }
 *
 * [
 *     ["a", "-4"],
 *     ["2", "-7"],
 *     ["+42", "0x2A"],
 * ].forEach((inputs) => {
 *     const result = JSON.stringify(parseEvenIntsAndSum(inputs).val);
 *     console.log(`inputs ${JSON.stringify(inputs)}:\n  ${result}`);
 * });
 *
 * // inputs ["a","-4"]:
 * //   ["err: cannot parse 'a' as int"]
 * // inputs ["2","-7"]:
 * //   ["info: parse '2' ok","info: parse '-7' ok","err: -7 is not even"]
 * // inputs ["+42" "0x2A"]:
 * //   [["info: parse '+42' ok","info: parse '0x2A' ok"],84]
 * ```
 *
 * @module
 */

import { Semigroup, cmb } from "./cmb.js";
import { Eq, Ord, Ordering, cmp, eq } from "./cmp.js";
import type { Either } from "./either.js";
import { id } from "./fn.js";
import type { Validation } from "./validation.js";

/**
 * A type that represents one or both of two values (`Left`, `Right`, or
 * `Both`).
 */
export type Ior<A, B> = Ior.Left<A> | Ior.Right<B> | Ior.Both<A, B>;

/**
 * The companion namespace for the `Ior` type.
 */
export namespace Ior {
	/**
	 * Construct a `Left` variant of `Ior` from a value.
	 */
	export function left<A, B = never>(val: A): Ior<A, B> {
		return new Left(val);
	}

	/**
	 * Construct a `Right` variant of `Ior` from a value.
	 */
	export function right<B, A = never>(val: B): Ior<A, B> {
		return new Right(val);
	}

	/**
	 * Construct a `Both` variant of `Ior` from two values.
	 */
	export function both<A, B>(fst: A, snd: B): Ior<A, B> {
		return new Both(fst, snd);
	}

	/**
	 * Construct an `Ior` from an `Either`.
	 *
	 * @remarks
	 *
	 * If the `Either` is a `Left`, return its value in a `Left` variant of
	 * `Ior`; otherwise return its value in a `Right` variant of `Ior`.
	 */
	export function fromEither<A, B>(either: Either<A, B>): Ior<A, B> {
		return either.unwrap(left, right);
	}

	/**
	 * Construct an `Ior` from a `Validation`.
	 *
	 * @remarks
	 *
	 * If the `Validation` is an `Err`, return its failure in a `Left`;
	 * otherwise, return its success in a `Right`.
	 */
	export function fromValidation<E, T>(vdn: Validation<E, T>): Ior<E, T> {
		return vdn.unwrap(left, right);
	}

	/**
	 * Interpret an `Ior.Go` generator to return an `Ior`.
	 */
	export function go<A extends Semigroup<A>, TReturn>(
		gen: Go<A, TReturn>,
	): Ior<A, TReturn> {
		let nxt = gen.next();
		let acc: A | undefined;
		let isHalted = false;

		while (!nxt.done) {
			const ior = nxt.value;
			if (ior.isRight()) {
				nxt = gen.next(ior.val);
			} else if (ior.isBoth()) {
				if (acc === undefined) {
					acc = ior.fst;
				} else {
					acc = cmb(acc, ior.fst);
				}
				nxt = gen.next(ior.snd);
			} else {
				if (acc === undefined) {
					acc = ior.val;
				} else {
					acc = cmb(acc, ior.val);
				}
				isHalted = true;
				nxt = gen.return(undefined as any);
			}
		}

		if (isHalted) {
			return left(acc as A);
		}
		if (acc === undefined) {
			return right(nxt.value);
		}
		return both(acc, nxt.value);
	}

	/**
	 * Reduce a finite iterable from left to right in the context of `Ior`.
	 *
	 * @remarks
	 *
	 * Start with an initial accumulator and reduce the elements of an iterable
	 * using a reducer function that returns an `Ior`. While the function
	 * returns an `Ior` that has a right-hand value, continue the reduction
	 * using the value as the new accumulator until there are no elements
	 * remaining, and then return final accumulator as a right-hand value.
	 * Accumulate the left-hand values of `Both` variants using their behavior
	 * as a semigroup. If any `Ior` is a `Left`, halt the reduction and combine
	 * the left-hand value with any existing left-hand value, and return the
	 * result in a `Left`.
	 */
	export function reduce<T, TAcc, A extends Semigroup<A>>(
		vals: Iterable<T>,
		accum: (acc: TAcc, val: T) => Ior<A, TAcc>,
		initial: TAcc,
	): Ior<A, TAcc> {
		return go(
			(function* () {
				let acc = initial;
				for (const val of vals) {
					acc = yield* accum(acc, val);
				}
				return acc;
			})(),
		);
	}

	/**
	 * Turn an array or a tuple literal of `Ior` elements "inside out".
	 *
	 * @remarks
	 *
	 * Evaluate the `Ior` elements in an array or a tuple literal from left to
	 * right. If they all have right-hand values, collect the values in an array
	 * or a tuple literal, respectively, and return the result as a right-hand
	 * value. Accumulate the left-hand values of `Both` variants using their
	 * behavior as a semigroup. If any element is a `Left`, halt the collection
	 * and combine the left-hand value with any existing left-hand value, and
	 * return the result in a `Left`.
	 *
	 * For example:
	 *
	 * -   `Ior<A, B>[]` becomes `Ior<A, B[]>`
	 * -   `[Ior<A, B1>, Ior<A, B2>]` becomes `Ior<A, [B1, B2]>`
	 */
	export function collect<
		TIors extends readonly Ior<Semigroup<any>, any>[] | [],
	>(
		iors: TIors,
	): Ior<
		LeftT<TIors[number]>,
		{ -readonly [K in keyof TIors]: RightT<TIors[K]> }
	> {
		return go(
			(function* (): Ior.Go<any, any> {
				const results = new Array(iors.length);
				for (const [idx, ior] of iors.entries()) {
					results[idx] = yield* ior;
				}
				return results;
			})(),
		);
	}

	/**
	 * Turn a record or an object literal of `Ior` elements "inside out".
	 *
	 * @remarks
	 *
	 * Evaluate the `Ior` elements in a record or an object literal. If they all
	 * have right-hand values, collect the values in a record or an object
	 * literal, tuple literal, respectively, and return the result as a
	 * right-hand value. Accumulate the left-hand values of `Both` variants
	 * using their behavior as a semigroup. If any element is a `Left`, halt the
	 * collection and combine the left-hand value with any existing left-hand
	 * value, and return the result in a `Left`.
	 *
	 * For example:
	 *
	 * -   `Record<string, Ior<A, B>>` becomes `Ior<A, Record<string, B>>`
	 * -   `{ x: Ior<A, B1>, y: Ior<A, B2> }` becomes `Ior<A, { x: B1, y: B2 }>`
	 */
	export function gather<TIors extends Record<any, Ior<Semigroup<any>, any>>>(
		iors: TIors,
	): Ior<
		LeftT<TIors[keyof TIors]>,
		{ -readonly [K in keyof TIors]: RightT<TIors[K]> }
	> {
		return Ior.go(
			(function* (): Ior.Go<any, any> {
				const results: Record<any, any> = {};
				for (const [key, ior] of Object.entries(iors)) {
					results[key] = yield* ior;
				}
				return results;
			})(),
		);
	}

	/**
	 * Lift a function into the context of `Ior`.
	 *
	 * @remarks
	 *
	 * Given a function that accepts arbitrary arguments, return an adapted
	 * function that accepts `Ior` values as arguments. When applied, evaluate
	 * evaluate the arguments from left to right. If they all have right-hand
	 * values, apply the original function to the values and return the result
	 * as a right-hand value. Accumulate the left-hand values of `Both` variants
	 * using their behavior as a semigroup. If any argument is a `Left`, halt
	 * the operation and combine the left-hand value with any existing left-hand
	 * value, and return the result in a `Left`.
	 */
	export function lift<TArgs extends unknown[], T>(
		f: (...args: TArgs) => T,
	): <A extends Semigroup<A>>(
		...iors: { [K in keyof TArgs]: Ior<A, TArgs[K]> }
	) => Ior<A, T> {
		return (...iors) =>
			collect(iors).map((args) => f(...(args as TArgs))) as Ior<any, T>;
	}

	/**
	 * Interpret an `Ior.GoAsync` async generator to return a `Promise` that
	 * resolves with an `Ior`.
	 */
	export async function goAsync<A extends Semigroup<A>, TReturn>(
		gen: GoAsync<A, TReturn>,
	): Promise<Ior<A, TReturn>> {
		let nxt = await gen.next();
		let acc: A | undefined;
		let isHalted = false;

		while (!nxt.done) {
			const ior = nxt.value;
			if (ior.isRight()) {
				nxt = await gen.next(ior.val);
			} else if (ior.isBoth()) {
				if (acc === undefined) {
					acc = ior.fst;
				} else {
					acc = cmb(acc, ior.fst);
				}
				nxt = await gen.next(ior.snd);
			} else {
				if (acc === undefined) {
					acc = ior.val;
				} else {
					acc = cmb(acc, ior.val);
				}
				isHalted = true;
				nxt = await gen.return(undefined as any);
			}
		}

		if (isHalted) {
			return left(acc as A);
		}
		if (acc === undefined) {
			return right(nxt.value);
		}
		return both(acc, nxt.value);
	}

	/**
	 * The fluent syntax for `Ior`.
	 */
	export abstract class Syntax {
		/**
		 * If this and that `Ior` are the same variant and their values are
		 * equal, return `true`; otherwise, return `false`.
		 */
		[Eq.eq]<A extends Eq<A>, B extends Eq<B>>(
			this: Ior<A, B>,
			that: Ior<A, B>,
		): boolean {
			if (this.isLeft()) {
				return that.isLeft() && eq(this.val, that.val);
			}
			if (this.isRight()) {
				return that.isRight() && eq(this.val, that.val);
			}
			return (
				that.isBoth() &&
				eq(this.fst, that.fst) &&
				eq(this.snd, that.snd)
			);
		}

		/**
		 * Compare this and that `Ior` to determine their ordering.
		 *
		 * @remarks
		 *
		 * When ordered, a `Left` always compares as less than any `Right`, and
		 * a `Right` always compares as less than any `Both`. If the variants
		 * are the same, their left-hand and/or right-hand values are compared
		 * to determine the ordering. `Both` variants compare their left-hand
		 * values and right-hand values lexicographically.
		 */
		[Ord.cmp]<A extends Ord<A>, B extends Ord<B>>(
			this: Ior<A, B>,
			that: Ior<A, B>,
		): Ordering {
			if (this.isLeft()) {
				return that.isLeft() ? cmp(this.val, that.val) : Ordering.less;
			}
			if (this.isRight()) {
				if (that.isRight()) {
					return cmp(this.val, that.val);
				}
				return that.isLeft() ? Ordering.greater : Ordering.less;
			}
			if (that.isBoth()) {
				return cmb(cmp(this.fst, that.fst), cmp(this.snd, that.snd));
			}
			return Ordering.greater;
		}

		/**
		 * Combine the values of this and that `Ior` into a new `Ior`.
		 *
		 * @remarks
		 *
		 * When combined, left-hand values and right-hand values are combined
		 * pairwise. Combination is lossless and merges values into `Both`
		 * variants when there is no existing value to combine with.
		 */
		[Semigroup.cmb]<A extends Semigroup<A>, B extends Semigroup<B>>(
			this: Ior<A, B>,
			that: Ior<A, B>,
		): Ior<A, B> {
			if (this.isLeft()) {
				if (that.isLeft()) {
					return left(cmb(this.val, that.val));
				}
				if (that.isRight()) {
					return both(this.val, that.val);
				}
				return both(cmb(this.val, that.fst), that.snd);
			}

			if (this.isRight()) {
				if (that.isLeft()) {
					return both(that.val, this.val);
				}
				if (that.isRight()) {
					return right(cmb(this.val, that.val));
				}
				return both(that.fst, cmb(this.val, that.snd));
			}

			if (that.isLeft()) {
				return both(cmb(this.fst, that.val), this.snd);
			}
			if (that.isRight()) {
				return both(this.fst, cmb(this.snd, that.val));
			}
			return both(cmb(this.fst, that.fst), cmb(this.snd, that.snd));
		}

		/**
		 * Test whether this `Ior` is the `Left` variant.
		 */
		isLeft<A>(this: Ior<A, any>): this is Left<A> {
			return this.kind === Kind.LEFT;
		}

		/**
		 * Test whether this `Ior` is the `Right` variant.
		 */
		isRight<B>(this: Ior<any, B>): this is Right<B> {
			return this.kind === Kind.RIGHT;
		}

		/**
		 * Test whether this `Ior` is the `Both` variant.
		 */
		isBoth<A, B>(this: Ior<A, B>): this is Both<A, B> {
			return this.kind === Kind.BOTH;
		}

		/**
		 * Apply one of three functions to the left-hand value and/or the
		 * right-hand value of this `Ior` depending on the variant, and return
		 * the result.
		 */
		unwrap<A, B, T1, T2, T3>(
			this: Ior<A, B>,
			unwrapLeft: (val: A) => T1,
			unwrapRight: (val: B) => T2,
			unwrapBoth: (fst: A, snd: B) => T3,
		): T1 | T2 | T3 {
			if (this.isLeft()) {
				return unwrapLeft(this.val);
			}
			if (this.isRight()) {
				return unwrapRight(this.val);
			}
			return unwrapBoth(this.fst, this.snd);
		}

		/**
		 * If this `Ior` has a right-hand value, apply a function to the value
		 * to return another `Ior`. Accumulate the left-hand values of `Both`
		 * variants using their behavior as a semigroup. If either `Ior` is a
		 * `Left`, combine the left-hand value with any existing left-hand value
		 * and return the result in a `Left`.
		 */
		flatMap<A extends Semigroup<A>, B, B1>(
			this: Ior<A, B>,
			f: (val: B) => Ior<A, B1>,
		): Ior<A, B1> {
			if (this.isLeft()) {
				return this;
			}
			if (this.isRight()) {
				return f(this.val);
			}
			const that = f(this.snd);
			if (that.isLeft()) {
				return left(cmb(this.fst, that.val));
			}
			if (that.isRight()) {
				return both(this.fst, that.val);
			}
			return both(cmb(this.fst, that.fst), that.snd);
		}

		/**
		 * If this `Ior` has a right-hand value, apply a generator comprehension
		 * function to the value and interpret the `Ior.Go` generator to return
		 * another `Ior`. Accumulate the left-hand values of `Both` variants
		 * using their behavior as a semigroup. If either `Ior` is a `Left`,
		 * combine the left-hand value with any existing left-hand value and
		 * return the result in a `Left`.
		 */
		goMap<A extends Semigroup<A>, B, B1>(
			this: Ior<A, B>,
			f: (val: B) => Go<A, B1>,
		): Ior<A, B1> {
			return this.flatMap((val) => go(f(val)));
		}

		/**
		 * If this and that `Ior` have a right-hand value, apply a function to
		 * the values and return the result as a right-hand value. Accumulate
		 * the left-hand values of `Both` variants using their behavior as a
		 * semigroup. If either `Ior` is a `Left`, combine the left-hand value
		 * with any existing left-hand value and return the result in a `Left`.
		 */
		zipWith<A extends Semigroup<A>, B, B1, B2>(
			this: Ior<A, B>,
			that: Ior<A, B1>,
			f: (lhs: B, rhs: B1) => B2,
		): Ior<A, B2> {
			return this.flatMap((lhs) => that.map((rhs) => f(lhs, rhs)));
		}

		/**
		 * If this and that `Ior` have a right-hand value, keep only the first
		 * value as a right-hand value and discard the second. Accumulate the
		 * left-hand values of `Both` variants using their behavior as a
		 * semigroup. If either `Ior` is a `Left`, combine the left-hand value
		 * with any existing left-hand value and return the result in a `Left`.
		 */
		zipFst<A extends Semigroup<A>, B>(
			this: Ior<A, B>,
			that: Ior<A, any>,
		): Ior<A, B> {
			return this.zipWith(that, id);
		}

		/**
		 * If this and that `Ior` have a right-hand value, keep only the second
		 * value as a right-hand value and discard the first. Accumulate the
		 * left-hand values of `Both` variants using their behavior as a
		 * semigroup. If either `Ior` is a `Left`, combine the left-hand value
		 * with any existing left-hand value and return the result in a `Left`.
		 */
		zipSnd<A extends Semigroup<A>, B1>(
			this: Ior<A, any>,
			that: Ior<A, B1>,
		): Ior<A, B1> {
			return this.flatMap(() => that);
		}

		/**
		 * If this `Ior` has a left-hand value, apply a function to the value
		 * and return the result as a left-hand value; otherwise, return this
		 * `Ior` as is.
		 */
		lmap<A, B, A1>(this: Ior<A, B>, f: (val: A) => A1): Ior<A1, B> {
			if (this.isLeft()) {
				return left(f(this.val));
			}
			if (this.isRight()) {
				return this;
			}
			return both(f(this.fst), this.snd);
		}

		/**
		 * If this `Ior` has a right-hand value, apply a function to the value
		 * and return the result as a right-hand value; otherwise, return this
		 * `Ior` as is.
		 */
		map<A, B, B1>(this: Ior<A, B>, f: (val: B) => B1): Ior<A, B1> {
			if (this.isLeft()) {
				return this;
			}
			if (this.isRight()) {
				return right(f(this.val));
			}
			return both(this.fst, f(this.snd));
		}
	}

	/**
	 * An enumeration that discriminates `Ior`.
	 */
	export enum Kind {
		LEFT,
		RIGHT,
		BOTH,
	}

	/**
	 * An `Ior` with a left-hand value.
	 */
	export class Left<out A> extends Syntax {
		/**
		 * The property that discriminates `Ior`.
		 */
		readonly kind = Kind.LEFT;

		/**
		 * The value of this `Ior`.
		 */
		readonly val: A;

		constructor(val: A) {
			super();
			this.val = val;
		}

		/**
		 * Return an `Ior.Go` generator that yields this `Ior` and returns its
		 * right-hand value if one is present. This allows `Ior` values to be
		 * yielded directly in `Ior` generator comprehensions using `yield*`.
		 */
		*[Symbol.iterator](): Generator<Ior<A, never>, never, unknown> {
			return (yield this) as never;
		}
	}

	/**
	 * An `Ior` with a right-hand value.
	 */
	export class Right<out B> extends Syntax {
		/**
		 * The property that discriminates `Ior`.
		 */
		readonly kind = Kind.RIGHT;

		/**
		 * The value of this `Ior`.
		 */
		readonly val: B;

		constructor(val: B) {
			super();
			this.val = val;
		}

		/**
		 * Return an `Ior.Go` generator that yields this `Ior` and returns its
		 * right-hand value if one is present. This allows `Ior` values to be
		 * yielded directly in `Ior` generator comprehensions using `yield*`.
		 */
		*[Symbol.iterator](): Generator<Ior<never, B>, B, unknown> {
			return (yield this) as B;
		}
	}

	/**
	 * An `Ior` with a left-hand and a right-hand value.
	 */
	export class Both<out A, out B> extends Syntax {
		/**
		 * The property that discriminates `Ior`.
		 */
		readonly kind = Kind.BOTH;

		/**
		 * The first value of this `Ior`.
		 */
		readonly fst: A;

		/**
		 * The second value of this `Ior`.
		 */
		readonly snd: B;

		/**
		 * A 2-tuple of the first value and second value of this `Ior`.
		 */
		get val(): [A, B] {
			return [this.fst, this.snd];
		}

		constructor(fst: A, snd: B) {
			super();
			this.fst = fst;
			this.snd = snd;
		}

		/**
		 * Return an `Ior.Go` generator that yields this `Ior` and returns its
		 * right-hand value if one is present. This allows `Ior` values to be
		 * yielded directly in `Ior` generator comprehensions using `yield*`.
		 */
		*[Symbol.iterator](): Generator<Ior<A, B>, B, unknown> {
			return (yield this) as B;
		}
	}

	/**
	 * A generator that yields `Ior` values and may return a result.
	 */
	export type Go<A extends Semigroup<A>, TReturn> = Generator<
		Ior<A, unknown>,
		TReturn,
		unknown
	>;

	/**
	 * An async generator that yields `Ior` values and may return a result.
	 */
	export type GoAsync<A extends Semigroup<A>, TReturn> = AsyncGenerator<
		Ior<A, unknown>,
		TReturn,
		unknown
	>;

	/**
	 * Extract the left-hand value type `A` from the type `Ior<A, B>`.
	 */
	export type LeftT<TIor extends Ior<any, any>> = [TIor] extends [
		Ior<infer A, any>,
	]
		? A
		: never;

	/**
	 * Extract the right-hand value type `B` from the type `Ior<A, B>`.
	 */
	export type RightT<TIor extends Ior<any, any>> = [TIor] extends [
		Ior<any, infer B>,
	]
		? B
		: never;
}
