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
 * -   `fromTuple` constructs an `Ior` from a 2-tuple of values.
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
 * ## Chaining `Ior`
 *
 * These methods act on an `Ior` with a right-hand value to produce another
 * `Ior`:
 *
 * -   `andThen` applies a function to the right-hand value to return another
 *     `Ior`.
 * -   `andThenGo` applies a synchronous generator comprehension function to the
 *     right-hand value and evaluates the generator to return another `Ior`.
 * -   `and` ignores the right-hand value and returns another `Ior`.
 * -   `zipWith` evaluates another `Ior`, and if it has a right-hand value,
 *     applies a function to both right-hand values.
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
 * Synchronous generator functions should use the `Ior.Go` type alias as their
 * return type. A generator function that returns an `Ior.Go<A, T>` may `yield*`
 * zero or more `Ior<A, any>` values and must return a result of type `T`.
 * Synchronous comprehensions may also `yield*` other `Ior.Go` generators
 * directly.
 *
 * Async generator functions should use the `Ior.GoAsync` type alias as their
 * return type. An async generator function that returns an `Ior.GoAsync<A, T>`
 * may `yield*` zero or more `Ior<A, any>` values and must return a result of
 * type `T`. `PromiseLike` values that resolve with `Ior` should be awaited
 * before yielding. Async comprehensions may also `yield*` other `Ior.Go` and
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
 * The `go` function evaluates an `Ior.Go<A, T>` generator to return an `Ior<A,
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
 * These functions turn a container of `Ior` elements "inside out".
 *
 * -   `all` turns an iterable or a tuple literal of `Ior` elements inside out.
 * -   `allProps` turns a string-keyed record or object literal of `Ior`
 *     elements inside out.
 *
 * These functions concurrently turn a container of promise-like `Ior` elements
 * "inside out":
 *
 * -   `allAsync` turns an iterable or a tuple literal of promise-like `Ior`
 *     elements inside out.
 * -   `allPropsAsync` turns a string-keyed record or object literal of
 *     promise-like `Ior` elements inside out.
 *
 * The `reduce` function reduces a finite iterable from left to right in the
 * context of `Ior`.
 *
 * ## Lifting functions into the context of `Ior`
 *
 * These functions adapt a function to accept and return `Ior` values:
 *
 * -   `lift` adapts a synchronous function to accept `Ior` values as arguments
 *     and return an `Ior`.
 * -   `liftAsync` adapts a synchronous or an asynchronous function to accept
 *     promise-like `Ior` values as arguments and return a `Promise` that
 *     resolves with an `Ior`.
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
 *     return parseInt(input).andThen(guardEven);
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
 *     return Ior.all(inputs.map(parseEvenInt));
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
 *     return Ior.allProps(
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

import {
	ArrayIdxBuilder,
	ArrayPushBuilder,
	NoOpBuilder,
	RecordBuilder,
} from "./_utils.js";
import type { Builder } from "./builder.js";
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
	 * Construct an `Ior` from a 2-tuple of values.
	 *
	 * @remarks
	 *
	 * This will always construct a `Both` variant from the first value and
	 * second value of the tuple.
	 */
	export function fromTuple<A, B>(tuple: readonly [A, B]): Ior<A, B> {
		return both(tuple[0], tuple[1]);
	}

	/**
	 * Evaluate an `Ior.Go` generator to return an `Ior`.
	 *
	 * @remarks
	 *
	 * If any yielded `Ior` is a `Left`, combine the left-hand value with any
	 * existing left-hand value and return the result in a `Left`; otherwise,
	 * when the generator returns, return the result as a right-hand value.
	 * Accumulate the left-hand values of yielded `Both` variants using their
	 * behavior as a semigroup.
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
				isHalted = true;
				if (acc === undefined) {
					acc = ior.val;
				} else {
					acc = cmb(acc, ior.val);
				}
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
	 */
	export function reduce<T, TAcc, A extends Semigroup<A>>(
		elems: Iterable<T>,
		accum: (acc: TAcc, val: T) => Ior<A, TAcc>,
		initial: TAcc,
	): Ior<A, TAcc> {
		return go(
			(function* () {
				let acc = initial;
				for (const elem of elems) {
					acc = yield* accum(acc, elem);
				}
				return acc;
			})(),
		);
	}

	/**
	 *
	 */
	export function traverseInto<T, A extends Semigroup<A>, B, TFinish>(
		elems: Iterable<T>,
		f: (elem: T, idx: number) => Ior<A, B>,
		builder: Builder<B, TFinish>,
	): Ior<A, TFinish> {
		return go(
			(function* () {
				let idx = 0;
				for (const elem of elems) {
					builder.add(yield* f(elem, idx));
					idx++;
				}
				return builder.finish();
			})(),
		);
	}

	/**
	 *
	 */
	export function traverse<T, A extends Semigroup<A>, B>(
		elems: Iterable<T>,
		f: (elem: T, idx: number) => Ior<A, B>,
	): Ior<A, B[]> {
		return traverseInto(elems, f, new ArrayPushBuilder());
	}

	/**
	 *
	 */
	export function forEach<T, A extends Semigroup<A>>(
		elems: Iterable<T>,
		f: (elem: T, idx: number) => Ior<A, any>,
	): Ior<A, void> {
		return traverseInto(elems, f, new NoOpBuilder());
	}

	/**
	 *
	 */
	export function collectInto<A extends Semigroup<A>, B, TFinish>(
		iors: Iterable<Ior<A, B>>,
		builder: Builder<B, TFinish>,
	): Ior<A, TFinish> {
		return traverseInto(iors, id, builder);
	}

	/**
	 * Turn an array or a tuple literal of `Ior` elements "inside out".
	 *
	 * @remarks
	 *
	 * For example:
	 *
	 * -   `Ior<A, B>[]` becomes `Ior<A, B[]>`
	 * -   `[Ior<A, B1>, Ior<A, B2>]` becomes `Ior<A, [B1, B2]>`
	 */
	export function all<TIors extends readonly Ior<Semigroup<any>, any>[] | []>(
		iors: TIors,
	): Ior<
		LeftT<TIors[number]>,
		{ -readonly [K in keyof TIors]: RightT<TIors[K]> }
	>;

	/**
	 * Turn an iterable of `Ior` elements "inside out" using an array.
	 *
	 * @remarks
	 *
	 * For example, `Iterable<Ior<A, B>>` becomes `Ior<A, B[]>`.
	 */
	export function all<A extends Semigroup<A>, B>(
		iors: Iterable<Ior<A, B>>,
	): Ior<A, B[]>;

	export function all<A extends Semigroup<A>, B>(
		iors: Iterable<Ior<A, B>>,
	): Ior<A, B[]> {
		return collectInto(iors, new ArrayPushBuilder());
	}

	/**
	 * Turn a string-keyed record or object literal of `Ior` elements "inside
	 * out".
	 *
	 * @remarks
	 *
	 * This function enumerates only the object's own enumerable, string-keyed
	 * property key-value pairs.
	 *
	 * For example:
	 *
	 * -   `Record<string, Ior<A, B>>` becomes `Ior<A, Record<string, B>>`
	 * -   `{ x: Ior<A, B1>, y: Ior<A, B2> }` becomes `Ior<A, { x: B1, y: B2 }>`
	 */
	export function allProps<
		TIors extends Record<string, Ior<Semigroup<any>, any>>,
	>(
		iors: TIors,
	): Ior<
		LeftT<TIors[keyof TIors]>,
		{ -readonly [K in keyof TIors]: RightT<TIors[K]> }
	>;

	export function allProps<A extends Semigroup<A>, B>(
		iors: Record<string, Ior<A, B>>,
	): Ior<A, Record<string, B>> {
		return traverseInto(
			Object.entries(iors),
			([key, ior]) => ior.map((val): [string, B] => [key, val]),
			new RecordBuilder(),
		);
	}

	/**
	 * Adapt a synchronous function to accept `Ior` values as arguments and
	 * return an `Ior`.
	 */
	export function lift<TArgs extends unknown[], T>(
		f: (...args: TArgs) => T,
	): <A extends Semigroup<A>>(
		...iors: { [K in keyof TArgs]: Ior<A, TArgs[K]> }
	) => Ior<A, T> {
		return (...iors) =>
			all(iors).map((args) => f(...(args as TArgs))) as Ior<any, T>;
	}

	/**
	 * Evaluate an `Ior.GoAsync` async generator to return a `Promise` that
	 * resolves with an `Ior`.
	 *
	 * @remarks
	 *
	 * If any yielded `Ior` is a `Left`, combine the left-hand value with any
	 * existing left-hand value and resolve with the result in a `Left`;
	 * otherwise, when the generator returns, resolve with the result as a
	 * right-hand value. Accumulate the left-hand values of yielded `Both`
	 * variants using their behavior as a semigroup. If an error is thrown,
	 * reject with the error.
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
				isHalted = true;
				if (acc === undefined) {
					acc = ior.val;
				} else {
					acc = cmb(acc, ior.val);
				}
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
	 *
	 */
	export function traverseIntoAsync<T, A extends Semigroup<A>, B, TFinish>(
		elems: Iterable<T>,
		f: (elem: T, idx: number) => Ior<A, B> | PromiseLike<Ior<A, B>>,
		builder: Builder<B, TFinish>,
	): Promise<Ior<A, TFinish>> {
		return new Promise((resolve, reject) => {
			let remaining = 0;
			let acc: A | undefined;

			for (const elem of elems) {
				const idx = remaining;
				remaining++;
				Promise.resolve(f(elem, idx)).then((ior) => {
					if (ior.isLeft()) {
						if (acc === undefined) {
							resolve(ior);
						} else {
							resolve(left(cmb(acc, ior.val)));
						}
						return;
					}

					if (ior.isRight()) {
						builder.add(ior.val);
					} else {
						if (acc === undefined) {
							acc = ior.fst;
						} else {
							acc = cmb(acc, ior.fst);
						}
						builder.add(ior.snd);
					}

					remaining--;
					if (remaining === 0) {
						if (acc === undefined) {
							resolve(right(builder.finish()));
						} else {
							resolve(both(acc, builder.finish()));
						}
						return;
					}
				}, reject);
			}
		});
	}

	/**
	 *
	 */
	export function traverseAsync<T, A extends Semigroup<A>, B>(
		elems: Iterable<T>,
		f: (elem: T, idx: number) => Ior<A, B> | PromiseLike<Ior<A, B>>,
	): Promise<Ior<A, B[]>> {
		return traverseIntoAsync(
			elems,
			(elem, idx) =>
				Promise.resolve(f(elem, idx)).then((ior) =>
					ior.map((val): [number, B] => [idx, val]),
				),
			new ArrayIdxBuilder(),
		);
	}

	/**
	 *
	 */
	export function forEachAsync<T, A extends Semigroup<A>>(
		elems: Iterable<T>,
		f: (elem: T, idx: number) => Ior<A, any> | PromiseLike<Ior<A, any>>,
	): Promise<Ior<A, void>> {
		return traverseIntoAsync(elems, f, new NoOpBuilder());
	}

	/**
	 *
	 */
	export function collectIntoAsync<A extends Semigroup<A>, B, TFinish>(
		elems: Iterable<Ior<A, B> | PromiseLike<Ior<A, B>>>,
		builder: Builder<B, TFinish>,
	): Promise<Ior<A, TFinish>> {
		return traverseIntoAsync(elems, id, builder);
	}

	/**
	 * Concurrently turn an array or a tuple literal of promise-like `Ior`
	 * elements "inside out".
	 *
	 * @remarks
	 *
	 * For example:
	 *
	 * -   `Promise<Ior<A, B>>[]` becomes `Promise<Ior<A, B[]>>`
	 * -   `[Promise<Ior<A, B1>>, Promise<Ior<A, B2>>]` becomes `Promise<Ior<A,
	 *     [B1, B2]>>`
	 *
	 * Left-hand values are combined in the order the promise-like elements
	 * resolve.
	 */
	export function allAsync<
		TElems extends
			| readonly (
					| Ior<Semigroup<any>, any>
					| PromiseLike<Ior<Semigroup<any>, any>>
			  )[]
			| [],
	>(
		elems: TElems,
	): Promise<
		Ior<
			LeftT<{ [K in keyof TElems]: Awaited<TElems[K]> }[number]>,
			{ [K in keyof TElems]: RightT<Awaited<TElems[K]>> }
		>
	>;

	/**
	 * Concurrently turn an iterable of promise-like `Ior` elements "inside
	 * out" using an array.
	 *
	 * @remarks
	 *
	 * For example, `Iterable<Promise<Ior<A, B>>>` becomes `Promise<Ior<A,
	 * B[]>>`.
	 *
	 * Left-hand values are combined in the order the promise-like elements
	 * resolve.
	 */
	export function allAsync<A extends Semigroup<A>, B>(
		elems: Iterable<Ior<A, B> | PromiseLike<Ior<A, B>>>,
	): Promise<Ior<A, B[]>>;

	export function allAsync<A extends Semigroup<A>, B>(
		elems: Iterable<Ior<A, B> | PromiseLike<Ior<A, B>>>,
	): Promise<Ior<A, B[]>> {
		return traverseIntoAsync(
			elems,
			(elem, idx) =>
				Promise.resolve(elem).then((ior) =>
					ior.map((val): [number, B] => [idx, val]),
				),
			new ArrayIdxBuilder(),
		);
	}

	/**
	 * Concurrently turn a string-keyed record or object literal of promise-like
	 * `Ior` elements "inside out".
	 *
	 * @remarks
	 *
	 * This function enumerates only the object's own enumerable, string-keyed
	 * property key-value pairs.
	 *
	 * For example:
	 *
	 * -   `Record<string, Promise<Ior<A, B>>>` becomes `Promise<Ior<A,
	 *     Record<string, B>>>`
	 * -   `{ x: Promise<Ior<A, B1>>, y: Promise<Ior<A, B2>> }` becomes
	 *     `Promise<Ior<A, { x: B1, y: B2 }>>`
	 *
	 * Left-hand values are combined in the order the promise-like elements
	 * resolve.
	 */
	export function allPropsAsync<
		TElems extends Record<
			string,
			Ior<Semigroup<any>, any> | PromiseLike<Ior<Semigroup<any>, any>>
		>,
	>(
		elems: TElems,
	): Promise<
		Ior<
			LeftT<{ [K in keyof TElems]: Awaited<TElems[K]> }[keyof TElems]>,
			{ [K in keyof TElems]: RightT<Awaited<TElems[K]>> }
		>
	>;

	export function allPropsAsync<A extends Semigroup<A>, B>(
		elems: Record<string, Ior<A, B> | PromiseLike<Ior<A, B>>>,
	): Promise<Ior<A, Record<string, B>>> {
		return traverseIntoAsync(
			Object.entries(elems),
			([key, elem]) =>
				Promise.resolve(elem).then((ior) =>
					ior.map((val): [string, B] => [key, val]),
				),
			new RecordBuilder(),
		);
	}

	/**
	 * Adapt a synchronous or an asynchronous function to accept promise-like
	 * `Ior` values as arguments and return a `Promise` that resolves with an
	 * `Ior`.
	 *
	 * @remarks
	 *
	 * The lifted function's arguments are evaluated concurrently. Left-hand
	 * values are combined in the order the arguments resolve.
	 */
	export function liftAsync<TArgs extends unknown[], T>(
		f: (...args: TArgs) => T | PromiseLike<T>,
	): <A extends Semigroup<A>>(
		...elems: {
			[K in keyof TArgs]:
				| Ior<A, TArgs[K]>
				| PromiseLike<Ior<A, TArgs[K]>>;
		}
	) => Promise<Ior<A, T>> {
		return (...elems) =>
			goAsync(
				(async function* (): Ior.GoAsync<any, T> {
					return f(
						...((yield* await allAsync(elems)) as TArgs),
					) as Awaited<T>;
				})(),
			);
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
	 * The fluent syntax for `Ior`.
	 */
	export abstract class Syntax {
		/**
		 * The property that discriminates `Ior`.
		 */
		abstract readonly kind: Kind;

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
		andThen<A extends Semigroup<A>, B, B1>(
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
		 * function to the value and evaluate the `Ior.Go` generator to return
		 * another `Ior`. Accumulate the left-hand values of `Both` variants
		 * using their behavior as a semigroup. If either `Ior` is a `Left`,
		 * combine the left-hand value with any existing left-hand value and
		 * return the result in a `Left`.
		 */
		andThenGo<A extends Semigroup<A>, B, B1>(
			this: Ior<A, B>,
			f: (val: B) => Go<A, B1>,
		): Ior<A, B1> {
			return this.andThen((val) => go(f(val)));
		}

		/**
		 * If this and that `Ior` have a right-hand value, return that `Ior`.
		 * Accumulate the left-hand values of `Both` variants using their
		 * behavior as a semigroup. If either `Ior` is a `Left`, combine the
		 * left-hand value with any existing left-hand value and return the
		 * result in a `Left`.
		 */
		and<A extends Semigroup<A>, B1>(
			this: Ior<A, any>,
			that: Ior<A, B1>,
		): Ior<A, B1> {
			return this.andThen(() => that);
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
			return this.andThen((lhs) => that.map((rhs) => f(lhs, rhs)));
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
	 * An `Ior` with a left-hand value.
	 */
	export class Left<out A> extends Syntax {
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
	 * A generator that yields `Ior` values and returns a result.
	 *
	 * @remarks
	 *
	 * Synchronous `Ior` generator comprehensions should use this type alias as
	 * their return type. A generator function that returns an `Ior.Go<A, T>`
	 * may `yield*` zero or more `Ior<A, any>` values and must return a result
	 * of type `T`. Synchronous comprehensions may also `yield*` other `Ior.Go`
	 * generators directly.
	 *
	 * Comprehensions require that the left-hand values of all yielded `Ior`
	 * values are implementors of the same `Semigroup` so the values may
	 * accumulate as the generator yields.
	 */
	export type Go<A extends Semigroup<A>, TReturn> = Generator<
		Ior<A, unknown>,
		TReturn,
		unknown
	>;

	/**
	 * An async generator that yields `Ior` values and returns a result.
	 *
	 * @remarks
	 *
	 * Async `Ior` generator comprehensions should use this type alias as their
	 * return type. An async generator function that returns an `Ior.GoAsync<A,
	 * T>` may `yield*` zero or more `Ior<A, any>` values and must return a
	 * result of type `T`. `PromiseLike` values that resolve with `Ior` should
	 * be awaited before yielding. Async comprehensions may also `yield*` other
	 * `Ior.Go` and `Ior.GoAsync` generators directly.
	 *
	 * Comprehensions require that the left-hand values of all yielded `Ior`
	 * values are implementors of the same `Semigroup` so the values may
	 * accumulate as the generator yields.
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
