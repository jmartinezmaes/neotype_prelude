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
 * Functional unions and railway-oriented programming.
 *
 * @remarks
 *
 * `Either<A, B>` is a type that represents one of two values. It is represented
 * by two variants: `Left<A>` and `Right<B>`.
 *
 * -   The `Left<A>` variant represents a *left-sided* `Either` and contains a
 *     value of type `A`.
 * -   The `Right<B>` variant represents a *right-sided* `Either` and contains a
 *     value of type `B`.
 *
 * ### Handling failure with `Either`
 *
 * `Either` is also used to represent a value which is either a success or a
 * failure. In this context, the type is written as `Either<E, T>` and its two
 * variants are `Left<E>` and `Right<T>`.
 *
 * -   The `Left<E>` variant represents a *failed* `Either` and contains a
 *     *failure* of type `E`.
 * -   The `Right<T>` variant represents a *successful* `Either` and contains a
 *     *success* of type `T`.
 *
 * Some combinators for `Either` are specialized for this failure-handling
 * use case, and provide a right-biased behavior that "short-circuits" a
 * computation on the first failed `Either`. This behavior allows functions
 * that return `Either` to be composed in a way that propogates failures while
 * applying logic to successes -- a useful feature for railway-oriented
 * programming.
 *
 * ## Importing from this module
 *
 * This module exports `Either` as both a type and a namespace. The `Either`
 * type is an alias for a discriminated union, and the `Either` namespace
 * provides:
 *
 * -   The `Left` and `Right` variant classes
 * -   The abstract `Syntax` class that provides the fluent API for `Either`
 * -   The `Kind` enumeration that discriminates `Either`
 * -   Functions for constructing, chaining, collecting into, and lifting into
 *     `Either`
 *
 * The type and namespace can be imported under the same alias:
 *
 * ```ts
 * import { Either } from "@neotype/prelude/either.js";
 * ```
 *
 * Or, the type and namespace can be imported and aliased separately:
 *
 * ```ts
 * import { type Either, Either as E } from "@neotype/prelude/either.js";
 * ```
 *
 * ## Constructing `Either`
 *
 * These functions construct an Either:
 *
 * -   `left` constructs a left-sided `Either`.
 * -   `right` constructs a right-sided `Either`.
 * -   `fromValidation` constructs an `Either` from a `Validation`.
 *
 * ## Querying and narrowing the variant
 *
 * The `isLeft` and `isRight` methods return `true` if an `Either` is left-sided
 * or right-sided, respectively. These methods also narrow the type of an
 * `Either` to the queried variant.
 *
 * The variant can also be queried and narrowed via the `kind` property, which
 * returns a member of the `Kind` enumeration.
 *
 * ## Extracting values
 *
 * The value within an `Either` can be accessed via the `val` property. The type
 * of the property can be narrowed by first querying the variant.
 *
 * The `unwrap` method unwraps an `Either` by applying one of two functions to
 * its value, depending on the variant.
 *
 * ## Comparing `Either`
 *
 * `Either` has the following behavior as an equivalence relation:
 *
 * -   An `Either<A, B>` implements `Eq` when both `A` and `B` implement `Eq`.
 * -   Two `Either` values are equal if they are the same variant and their
 *     values are equal.
 *
 * `Either` has the following behavior as a total order:
 *
 * -   An `Either<A, B>` implements `Ord` when both `A` and `B` implement `Ord`.
 * -   When ordered, a left-sided `Either` always compares as less than any
 *     right-sided `Either`. If the variants are the same, their values are
 *     compared to determine the ordering.
 *
 * ## `Either` as a semigroup
 *
 * `Either` has the following behavior as a semigroup:
 *
 * -   An `Either<E, T>` implements `Semigroup` when `T` implements `Semigroup`.
 * -   When combined, any left-sided `Either` short-circuits the combination and
 *     is returned instead. If both are right-sided, their values are combined
 *     and returned in a `Right`.
 *
 * ## Transforming values
 *
 * These methods transform the value within an `Either`:
 *
 * -   `lmap` applies a function to the value in a left-sided `Either`.
 * -   `map` applies a function to the value in a right-sided `Either`.
 *
 * ## Recovering from `Left` variants
 *
 * These methods act on a failed `Either` to produce a fallback `Either`:
 *
 * -   `orElse` applies a function to the failure to return a fallback `Either`.
 * -   `or` ignores the failure and returns a fallback `Either`.
 *
 * ## Chaining `Either`
 *
 * These methods act on a successful `Either` to produce another `Either`:
 *
 * -   `andThen` applies a function to the success to return another `Either`.
 * -   `andThenGo` applies a synchronous generator comprehension function to the
 *     success and evaluates the generator to return another `Either`.
 * -   `and` ignores the success and returns another `Either`.
 * -   `zipWith` evaluates another `Either`, and if successful, applies a
 *     function to both successes.
 *
 * ## Generator comprehenshions
 *
 * Generator comprehensions provide an imperative syntax for chaining together
 * synchronous or asynchronous computations that return or resolve with `Either`
 * values.
 *
 * ### Writing comprehensions
 *
 * Synchronus and asynchronous comprehensions are written using `function*` and
 * `async function*` declarations, respectively.
 *
 * Synchronous generator functions should use the `Either.Go` type alias as
 * their return type. A generator function that returns an `Either.Go<E, T>` may
 * `yield*` zero or more `Either<E, any>` values and must return a result of
 * type `T`. Synchronous comprehensions may also `yield*` other `Either.Go`
 * generators directly.
 *
 * Async generator functions should use the `Either.GoAsync` type alias as their
 * return type. An async generator function that returns an `Either.GoAsync<E,
 * T>` may `yield*` zero or more `Either<E, any>` values and must return a
 * result of type `T`. `PromiseLike` values that resolve with `Either` should
 * be awaited before yielding. Async comprehensions may also `yield*` other
 * `Either.Go` and `Either.GoAsync` generators directly.
 *
 * Each `yield*` expression may bind a variable of the success value type of the
 * yielded `Either`. Comprehensions should always use `yield*` instead of
 * `yield`. Using `yield*` allows TypeScript to accurately infer the success
 * value type of the yielded `Either` when binding the value of each `yield*`
 * expression.
 *
 * ### Evaluating comprehensions
 *
 * `Either.Go` and `Either.GoAsync` generators must be evaluated before
 * accessing their results.
 *
 * The `go` function evaluates an `Either.Go<E, T>` generator to return an
 * `Either<E, T>`. If any yielded `Either` fails, the generator halts and `go`
 * returns the failed `Either`; otherwise, when the generator returns, `go`
 * returns the result as a success.
 *
 * The `goAsync` function evaluates an `Either.GoAsync<E, T>` async generator to
 * return a `Promise<Either<E, T>>`. If any yielded `Either` fails, the
 * generator halts and `goAsync` resolves with the failed `Either`; otherwise,
 * when the generator returns, `goAsync` resolves with the result as a success.
 * Thrown errors are captured as rejections.
 *
 * ## Collecting into `Either`
 *
 * These functions map the elements in an iterable to `Either` values, evaluate
 * the values, and act on the successes:
 *
 * -   `reduce` traverses an iterable of elements and accumulates the successes.
 * -   `traverseInto` traverses an iterable of elements and collects the
 *     successes into a `Builder`.
 * -   `traverseEntriesInto` traverses an iterable of key-element pairs and
 *     collects the key-success pairs into a `Builder`.
 * -   `traverse` traverses an iterable of elements and collects the successes
 *     in an array.
 * -   `traverseEntries` traverses an iterable of key-element pairs and collects
 *     the key-success pairs in an object.
 * -   `forEach` traverses an iterable of elements and ignores the successes.
 *
 * These functions evaluate the `Either` elements in a structure and collect the
 * successes:
 *
 * -   `allInto` traverses an iterable of elements and collects the
 *     successes into a `Builder`.
 * -   `allEntriesInto` traverses an iterable of key-element pairs and
 *     collects the key-success pairs into a `Builder`.
 * -   `all` traverses an iterable and collects the successes in an array or a
 *     tuple literal.
 * -   `allEntries` traverses an iterable of key-element pairs and collects the
 *     key-success pairs in an object.
 * -   `allProps` traverses a string-keyed record or object literal and collects
 *     the successes in an equivalent structure.
 *
 * ### Collecting concurrently
 *
 * These functions map the elements in an iterable to promise-like `Either`
 * values, concurrently evaluate the values, and act on the successes:
 *
 * -   `traverseIntoPar` traverses an iterable of elements and collects the
 *     successes into a `Builder`.
 * -   `traverseEntriesIntoPar`
 * -   `traversePar` collects the successes in an array.
 * -   `traverseEntriesPar`
 * -   `forEachPar` ignores the successes.
 *
 * These functions concurrently evaluate the promise-like `Either` elements in a
 * structure and collect the successes:
 *
 * -   `allIntoPar` traverses an iterable and collects the successes into a
 *     `Builder`.
 * -   `allEntriesIntoPar`
 * -   `allPar` traverses an iterable and collects the successes in an array or
 *     a tuple literal.
 * -   `allEntriesPar`
 * -   `allPropsPar` traverses a string-keyed record or object literal and
 *     collects the successes in an equivalent structure.
 *
 * ## Lifting functions into the context of `Either`
 *
 * These functions adapt a function to work with `Either` values:
 *
 * -   `lift` adapts a synchronous function to accept `Either` values as
 *     arguments and return an `Either`.
 * -   `liftPar` adapts a synchronous or an asynchronous function to accept
 *     promise-like `Either` values as arguments and return a `Promise` that
 *     resolves with an `Either`.
 *
 * @example Basic matching and unwrapping
 *
 * ```ts
 * import { Either } from "@neotype/prelude/either.js";
 *
 * const strOrNum: Either<string, number> = Either.right(1);
 *
 * // Querying and narrowing using methods
 * if (strOrNum.isLeft()) {
 *     console.log(`Queried Left: ${strOrNum.val}`);
 * } else {
 *     console.log(`Queried Right: ${strOrNum.val}`);
 * }
 *
 * // Querying and narrowing using the `kind` property
 * switch (strOrNum.kind) {
 *     case Either.Kind.LEFT:
 *         console.log(`Matched Left: ${strOrNum.val}`);
 *         break;
 *     case Either.Kind.RIGHT:
 *         console.log(`Matched Right: ${strOrNum.val}`);
 * }
 *
 * // Case analysis using `unwrap`
 * strOrNum.unwrap(
 *     (str) => console.log(`Unwrapped Left: ${str}`),
 *     (num) => console.log(`Unwrapped Right: ${num}`),
 * );
 * ```
 *
 * @example Parsing with `Either`
 *
 * First, the necessary imports:
 *
 * ```ts
 * import { Either } from "@neotype/prelude/either.js";
 * ```
 *
 * Now, consider a program that uses `Either` to parse an even integer:
 *
 * ```ts
 * function parseInt(input: string): Either<string, number> {
 *     const n = Number.parseInt(input);
 *     return Number.isNaN(n)
 *         ? Either.left(`cannot parse '${input}' as int`)
 *         : Either.right(n);
 * }
 *
 * function guardEven(n: number): Either<string, number> {
 *     return n % 2 === 0
 *         ? Either.right(n)
 *         : Either.left(`${n} is not even`);
 * }
 *
 * function parseEvenInt(input: string): Either<string, number> {
 *     return parseInt(input).andThen(guardEven);
 * }
 *
 * ["a", "1", "2", "-4", "+42", "0x2A"].forEach((input) => {
 *     const result = JSON.stringify(parseEvenInt(input).val);
 *     console.log(`input "${input}": ${result}`);
 * });
 *
 * // input "a": "cannot parse 'a' as int"
 * // input "1": "1 is not even"
 * // input "2": 2
 * // input "-4": -4
 * // input "+42": 42
 * // input "0x2A": 42
 * ```
 *
 * Suppose we want to parse an array of inputs and collect the successful
 * results, or fail on the first parse error. We may write the following:
 *
 * ```ts
 * function parseEvenInts(inputs: string[]): Either<string, number[]> {
 *     return Either.all(inputs.map(parseEvenInt));
 * }
 *
 * [
 *     ["a", "-4"],
 *     ["2", "-7"],
 *     ["+42", "0x2A"],
 * ].forEach((inputs) => {
 *     const result = JSON.stringify(parseEvenInts(inputs).val);
 *     console.log(`inputs ${JSON.stringify(inputs)}: ${result}`);
 * });
 *
 * // inputs ["a","-4"]: "cannot parse 'a' as int"
 * // inputs ["2","-7"]: "-7 is not even"
 * // inputs ["+42","0x2A"]: [42,42]
 * ```
 *
 * Perhaps we want to associate the original input strings with our successful
 * parses:
 *
 * ```ts
 * function parseEvenIntsKeyed(
 *     inputs: string[],
 * ): Either<string, Record<string, number>> {
 *     return Either.allProps(
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
 *     console.log(`inputs ${JSON.stringify(inputs)}: ${result}`);
 * });
 *
 * // inputs ["a","-4"]: "cannot parse 'a' as int"
 * // inputs ["2","-7"]: "-7 is not even"
 * // inputs ["+42","0x2A"]: {"+42":42,"0x2A":42}
 * ```
 *
 * Or, perhaps we want to sum our successful parses and return a total:
 *
 * ```ts
 * function parseEvenIntsAndSum(inputs: string[]): Either<string, number> {
 *     return Either.reduce(
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
 *     const result = JSON.strigify(parseEvenIntsAndSum(inputs).val);
 *     console.log(`inputs ${JSON.stringify(inputs)}: ${result}`);
 * });
 *
 * // inputs ["a","-4"]: "cannot parse 'a' as int"
 * // inputs ["2","-7"]: "-7 is not even"
 * // inputs ["+42","0x2A"]: 84
 * ```
 *
 * @module
 */

import {
	ArrayEntryBuilder,
	ArrayPushBuilder,
	NoOpBuilder,
	RecordEntryBuilder,
	type Builder,
} from "./builder.js";
import { Semigroup, cmb } from "./cmb.js";
import { Eq, Ord, Ordering, cmp, eq } from "./cmp.js";
import { id } from "./fn.js";
import type { Validation } from "./validation.js";

/**
 * A type that represents one of two values (`Left` or `Right`).
 */
export type Either<A, B> = Either.Left<A> | Either.Right<B>;

/**
 * The companion namespace for the `Either` type.
 */
export namespace Either {
	/**
	 * Construct a left-sided `Either` from a value.
	 */
	export function left<A, B = never>(val: A): Either<A, B> {
		return new Left(val);
	}

	/**
	 * Construct a right-sided `Either` from a value.
	 */
	export function right<B, A = never>(val: B): Either<A, B> {
		return new Right(val);
	}

	/**
	 * Construct an `Either` from a `Validation`.
	 */
	export function fromValidation<E, T>(vdn: Validation<E, T>): Either<E, T> {
		return vdn.unwrap(left, right);
	}

	/**
	 * Evaluate an `Either.Go` generator to return an `Either`.
	 */
	export function go<E, TReturn>(gen: Go<E, TReturn>): Either<E, TReturn> {
		let nxt = gen.next();
		let err: any;
		let isHalted = false;
		while (!nxt.done) {
			const either = nxt.value;
			if (either.isRight()) {
				nxt = gen.next(either.val);
			} else {
				isHalted = true;
				err = either.val;
				nxt = gen.return(undefined as any);
			}
		}
		return isHalted ? left(err) : right(nxt.value);
	}

	/**
	 * Accumulate the elements in an iterable using a reducer function that
	 * returns an `Either`.
	 */
	export function reduce<T, TAcc, E>(
		elems: Iterable<T>,
		accum: (acc: TAcc, val: T) => Either<E, TAcc>,
		initial: TAcc,
	): Either<E, TAcc> {
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
	 * Map the elements in an iterable to `Either` values, evaluate the values
	 * from left to right, and collect the successes into a `Builder`.
	 *
	 * @remarks
	 *
	 * If any `Either` fails, the state of the provided `Builder` is undefined.
	 */
	export function traverseInto<T, E, T1, TFinish>(
		elems: Iterable<T>,
		f: (elem: T, idx: number) => Either<E, T1>,
		builder: Builder<T1, TFinish>,
	): Either<E, TFinish> {
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
	 * Map the elements in an iterable of key-element pairs to `Either` values,
	 * evaluate the values from left to right, and collect the key-success pairs
	 * into a `Builder`.
	 *
	 * @remarks
	 *
	 * If any `Either` fails, the state of the provided `Builder` is undefined.
	 */
	export function traverseEntriesInto<K, V, E, V1, TFinish>(
		entries: Iterable<readonly [K, V]>,
		f: (elem: V, key: K, idx: number) => Either<E, V1>,
		builder: Builder<readonly [K, V1], TFinish>,
	): Either<E, TFinish> {
		return traverseInto(
			entries,
			([key, elem], idx) =>
				f(elem, key, idx).map((val): [K, V1] => [key, val]),
			builder,
		);
	}

	/**
	 * Map the elements in an iterable to `Either` values, evaluate the values
	 * from left to right, and collect the successes in an array.
	 */
	export function traverse<T, E, T1>(
		elems: Iterable<T>,
		f: (elem: T, idx: number) => Either<E, T1>,
	): Either<E, T1[]> {
		return traverseInto(elems, f, new ArrayPushBuilder());
	}

	/**
	 * Map the elements in an iterable of key-element pairs to `Either` values,
	 * evaluate the values from left to right, and collect the key-success pairs
	 * in an object.
	 */
	export function traverseEntries<
		K extends number | string | symbol,
		V,
		E,
		V1,
	>(
		elems: Iterable<readonly [K, V]>,
		f: (elem: V, key: K, idx: number) => Either<E, V1>,
	): Either<E, Record<K, V1>> {
		return traverseEntriesInto(elems, f, new RecordEntryBuilder());
	}

	/**
	 * Evaluate the `Either` elements in an iterable from left to right and
	 * collect the successes into a `Builder`.
	 *
	 * @remarks
	 *
	 * If any `Either` fails, the state of the provided `Builder` is undefined.
	 */
	export function allInto<E, T, TFinish>(
		eithers: Iterable<Either<E, T>>,
		builder: Builder<T, TFinish>,
	): Either<E, TFinish> {
		return traverseInto(eithers, id, builder);
	}

	/**
	 * Evaluate the `Either` elements in an iterable of key-`Either` pairs from
	 * left to right and collect the key-success pairs into a `Builder`.
	 *
	 * @remarks
	 *
	 * If any `Either` fails, the state of the provided `Builder` is undefined.
	 */
	export function allEntriesInto<K, E, V, TFinish>(
		entries: Iterable<readonly [K, Either<E, V>]>,
		builder: Builder<readonly [K, V], TFinish>,
	): Either<E, TFinish> {
		return traverseEntriesInto(entries, id, builder);
	}

	/**
	 * Evaluate the `Either` elements in an array or a tuple literal from left
	 * to right and collect the successes in an equivalent structure.
	 *
	 * @remarks
	 *
	 * This function essentially turns an array or a tuple literal of `Either`
	 * elements "inside out". For example:
	 *
	 * -   `Either<E, T>[]` becomes `Either<E, T[]>`
	 * -   `[Either<E, T1>, Either<E, T2>]` becomes `Either<E, [T1, T2]>`
	 */
	export function all<TEithers extends readonly Either<any, any>[] | []>(
		eithers: TEithers,
	): Either<
		LeftT<TEithers[number]>,
		{ -readonly [K in keyof TEithers]: RightT<TEithers[K]> }
	>;

	/**
	 * Evaluate the `Either` elements in an iterable from left to right and
	 * collect the successes in an array.
	 *
	 * @remarks
	 *
	 * This function essentially turns an iterable of `Either` elements "inside
	 * out". For example, `Iterable<Either<E, T>>` becomes `Either<E, T[]>`.
	 */
	export function all<E, T>(eithers: Iterable<Either<E, T>>): Either<E, T[]>;

	export function all<E, T>(eithers: Iterable<Either<E, T>>): Either<E, T[]> {
		return traverse(eithers, id);
	}

	/**
	 * Evaluate the `Either` elements in an iterable of key-`Either` pairs from
	 * left to right and collect the key-success pairs in an object.
	 */
	export function allEntries<K extends number | string | symbol, E, V>(
		entries: Iterable<readonly [K, Either<E, V>]>,
	): Either<E, Record<K, V>> {
		return traverseEntries(entries, id);
	}

	/**
	 * Evaluate the `Either` elements in a string-keyed record or object literal
	 * and collect the successes in an equivalent structure.
	 *
	 * @remarks
	 *
	 * This function essentially turns a string-keyed record or object literal
	 * of `Either` elements "inside out". For example:
	 *
	 * -   `Record<string, Either<E, T>>` becomes `Either<E, Record<string, T>>`
	 * -   `{ x: Either<E, T1>, y: Either<E, T2> }` becomes `Either<E, { x: T1,
	 *     y: T2 }>`
	 */
	export function allProps<TProps extends Record<string, Either<any, any>>>(
		props: TProps,
	): Either<
		LeftT<TProps[keyof TProps]>,
		{ -readonly [K in keyof TProps]: RightT<TProps[K]> }
	>;

	export function allProps<E, T>(
		props: Record<string, Either<E, T>>,
	): Either<E, Record<string, T>> {
		return traverseEntries(Object.entries(props), id);
	}

	/**
	 * Map the elements in an iterable to `Either` values, evaluate the values
	 * from left to right, and ignore the successes.
	 */
	export function forEach<T, E>(
		elems: Iterable<T>,
		f: (elem: T, idx: number) => Either<E, any>,
	): Either<E, void> {
		return traverseInto(elems, f, new NoOpBuilder());
	}

	/**
	 * Adapt a synchronous function to accept `Either` values as arguments and
	 * return an `Either`.
	 */
	export function lift<TArgs extends unknown[], T>(
		f: (...args: TArgs) => T,
	): <TEithers extends { [K in keyof TArgs]: Either<any, TArgs[K]> }>(
		...eithers: TEithers
	) => Either<LeftT<TEithers[number]>, T> {
		return (...eithers) =>
			all(eithers).map((args) => f(...(args as TArgs)));
	}

	/**
	 * Evaluate an `Either.GoAsync` async generator to return a `Promise` that
	 * resolves with an `Either`.
	 */
	export async function goAsync<E, TReturn>(
		gen: GoAsync<E, TReturn>,
	): Promise<Either<E, TReturn>> {
		let nxt = await gen.next();
		let err: any;
		let isHalted = false;
		while (!nxt.done) {
			const either = nxt.value;
			if (either.isRight()) {
				nxt = await gen.next(either.val);
			} else {
				isHalted = true;
				err = either.val;
				nxt = await gen.return(undefined as any);
			}
		}
		return isHalted ? left(err) : right(nxt.value);
	}

	/**
	 * Map the elements in an iterable to promise-like `Either` values,
	 * concurrently evaluate the values, and collect the successes into a
	 * `Builder`.
	 *
	 * @remarks
	 *
	 * If any `Either` fails, the state of the provided `Builder` is undefined.
	 */
	export function traverseIntoPar<T, E, T1, TFinish>(
		elems: Iterable<T>,
		f: (elem: T, idx: number) => Either<E, T1> | PromiseLike<Either<E, T1>>,
		builder: Builder<T1, TFinish>,
	): Promise<Either<E, TFinish>> {
		return new Promise((resolve, reject) => {
			let remaining = 0;
			for (const elem of elems) {
				const idx = remaining;
				remaining++;
				Promise.resolve(f(elem, idx)).then((either) => {
					if (either.isLeft()) {
						resolve(either);
						return;
					}
					builder.add(either.val);
					remaining--;
					if (remaining === 0) {
						resolve(right(builder.finish()));
						return;
					}
				}, reject);
			}
		});
	}

	/**
	 * Map the elements in an iterable of key-element pairs to promise-like
	 * `Either` values, concurrently evaluate the values, and collect the
	 * key-success pairs into a `Builder`.
	 *
	 * @remarks
	 *
	 * If any `Either` fails, the state of the provided `Builder` is undefined.
	 */
	export function traverseEntriesIntoPar<K, V, E, V1, TFinish>(
		entries: Iterable<readonly [K, V]>,
		f: (
			elem: V,
			key: K,
			idx: number,
		) => Either<E, V1> | PromiseLike<Either<E, V1>>,
		builder: Builder<readonly [K, V1], TFinish>,
	): Promise<Either<E, TFinish>> {
		return traverseIntoPar(
			entries,
			async ([key, elem], idx) =>
				(await f(elem, key, idx)).map((val): [K, V1] => [key, val]),
			builder,
		);
	}

	/**
	 * Map the elements in an iterable to promise-like `Either` values,
	 * concurrently evaluate the values, and collect the successes in an array.
	 */
	export function traversePar<T, E, T1>(
		elems: Iterable<T>,
		f: (elem: T, idx: number) => Either<E, T1> | PromiseLike<Either<E, T1>>,
	): Promise<Either<E, T1[]>> {
		return traverseIntoPar(
			elems,
			async (elem, idx) =>
				(await f(elem, idx)).map((val): [number, T1] => [idx, val]),
			new ArrayEntryBuilder(),
		);
	}

	/**
	 * Map the elements in an iterable of key-element pairs to promise-like
	 * `Either` values, concurrently evaluate the values, and collect the
	 * key-success pairs in an object.
	 */
	export function traverseEntriesPar<
		K extends number | string | symbol,
		V,
		E,
		V1,
	>(
		entries: Iterable<readonly [K, V]>,
		f: (
			elem: V,
			key: K,
			idx: number,
		) => Either<E, V1> | PromiseLike<Either<E, V1>>,
	): Promise<Either<E, Record<K, V1>>> {
		return traverseEntriesIntoPar(entries, f, new RecordEntryBuilder());
	}

	/**
	 * Concurrently evaluate the promise-like `Either` elements in an iterable
	 * and collect the successes into a `Builder`.
	 *
	 * @remarks
	 *
	 * If any `Either` fails, the state of the provided `Builder` is undefined.
	 */
	export function allIntoPar<E, T, TFinish>(
		elems: Iterable<Either<E, T> | PromiseLike<Either<E, T>>>,
		builder: Builder<T, TFinish>,
	): Promise<Either<E, TFinish>> {
		return traverseIntoPar(elems, id, builder);
	}

	/**
	 * Concurrently evaluate the promise-like `Either` elements in an iterable
	 * of key-element pairs and collect the key-success pairs into a `Builder`.
	 *
	 * @remarks
	 *
	 * If any `Either` fails, the state of the provided `Builder` is undefined.
	 */
	export function allEntriesIntoPar<K, E, V, TFinish>(
		entries: Iterable<
			readonly [K, Either<E, V> | PromiseLike<Either<E, V>>]
		>,
		builder: Builder<readonly [K, V], TFinish>,
	): Promise<Either<E, TFinish>> {
		return traverseEntriesIntoPar(entries, id, builder);
	}

	/**
	 * Concurrently evaluate the promise-like `Either` elements in an array or a
	 * tuple literal and collect the successes in an equivalent structure.
	 *
	 * @remarks
	 *
	 * This function essentially turns an array or a tuple literal of
	 * promise-like `Either` elements "inside out". For example:
	 *
	 * -   `Promise<Either<E, T>>[]` becomes `Promise<Either<E, T[]>>`
	 * -   `[Promise<Either<E, T1>>, Promise<Either<E, T2>>]` becomes
	 *     `Promise<Either<E, [T1, T2]>>`
	 */
	export function allPar<
		TElems extends
			| readonly (Either<any, any> | PromiseLike<Either<any, any>>)[]
			| [],
	>(
		elems: TElems,
	): Promise<
		Either<
			LeftT<{ [K in keyof TElems]: Awaited<TElems[K]> }[number]>,
			{ [K in keyof TElems]: RightT<Awaited<TElems[K]>> }
		>
	>;

	/**
	 * Concurrently evaluate the promise-like `Either` elements in an iterable
	 * and collect the successes in an array.
	 *
	 * @remarks
	 *
	 * This function essentially turns an iterable of promise-like `Either`
	 * elements "inside out". For example, `Iterable<Promise<Either<E, T>>>`
	 * becomes `Promise<Either<E, T[]>>`.
	 */
	export function allPar<E, T>(
		elems: Iterable<Either<E, T> | PromiseLike<Either<E, T>>>,
	): Promise<Either<E, T[]>>;

	export function allPar<E, T>(
		elems: Iterable<Either<E, T> | PromiseLike<Either<E, T>>>,
	): Promise<Either<E, T[]>> {
		return traversePar(elems, id);
	}

	/**
	 * Concurrently evaluate the promise-like `Either` elements in an iterable
	 * of key-element pairs and collect the key-success pairs in an object.
	 */
	export function allEntriesPar<K extends number | string | symbol, E, V>(
		entries: Iterable<
			readonly [K, Either<E, V> | PromiseLike<Either<E, V>>]
		>,
	): Promise<Either<E, Record<K, V>>> {
		return traverseEntriesPar(entries, id);
	}

	/**
	 * Concurrently evaluate the promise-like `Either` elements in a
	 * string-keyed record or object literal and collect the successes in an
	 * equivalent structure.
	 *
	 * @remarks
	 *
	 * This function essentially turns a string-keyed record or object literal
	 * of promise-like `Either` elements "inside out". For example:
	 *
	 * -   `Record<string, Promise<Either<E, T>>>` becomes `Promise<Either<E,
	 *     Record<string, T>>>`
	 * -   `{ x: Promise<Either<E, T1>>, y: Promise<Either<E, T2>> }` becomes
	 *     `Promise<Either<E, { x: T1, y: T2 }>>`
	 */
	export function allPropsPar<
		TProps extends Record<
			string,
			Either<any, any> | PromiseLike<Either<any, any>>
		>,
	>(
		props: TProps,
	): Promise<
		Either<
			LeftT<{ [K in keyof TProps]: Awaited<TProps[K]> }[keyof TProps]>,
			{ [K in keyof TProps]: RightT<Awaited<TProps[K]>> }
		>
	>;

	export function allPropsPar<E, T>(
		props: Record<string, Either<E, T> | PromiseLike<Either<E, T>>>,
	): Promise<Either<E, Record<string, T>>> {
		return traverseEntriesPar(Object.entries(props), id);
	}

	/**
	 * Map the elements in an iterable to promise-like `Either` values,
	 * concurrently evaluate the values, and ignore the successes.
	 */
	export function forEachPar<T, E>(
		elems: Iterable<T>,
		f: (
			elem: T,
			idx: number,
		) => Either<E, any> | PromiseLike<Either<E, any>>,
	): Promise<Either<E, void>> {
		return traverseIntoPar(elems, f, new NoOpBuilder());
	}

	/**
	 * Adapt a synchronous or an asynchronous function to accept promise-like
	 * `Either` values as arguments and return a `Promise` that resolves with an
	 * `Either`.
	 *
	 * @remarks
	 *
	 * The lifted function's arguments are evaluated concurrently.
	 */
	export function liftPar<TArgs extends unknown[], T>(
		f: (...args: TArgs) => T | PromiseLike<T>,
	): <
		TElems extends {
			[K in keyof TArgs]:
				| Either<any, TArgs[K]>
				| PromiseLike<Either<any, TArgs[K]>>;
		},
	>(
		...elems: TElems
	) => Promise<
		Either<LeftT<{ [K in keyof TElems]: Awaited<TElems[K]> }[number]>, T>
	> {
		return (...elems) =>
			goAsync(
				(async function* () {
					return f(...((yield* await allPar(elems)) as TArgs));
				})(),
			);
	}

	/**
	 * An enumeration that discriminates `Either`.
	 */
	export enum Kind {
		LEFT,
		RIGHT,
	}

	/**
	 * The fluent syntax for `Either`.
	 */
	export abstract class Syntax {
		/**
		 * The property that discriminates `Either`.
		 */
		abstract readonly kind: Kind;

		/**
		 * If this and that `Either` are the same variant and their values are
		 * equal, return `true`; otherwise, return `false`.
		 */
		[Eq.eq]<A extends Eq<A>, B extends Eq<B>>(
			this: Either<A, B>,
			that: Either<A, B>,
		): boolean {
			if (this.isLeft()) {
				return that.isLeft() && eq(this.val, that.val);
			}
			return that.isRight() && eq(this.val, that.val);
		}

		/**
		 * Compare this and that `Either` to determine their ordering.
		 *
		 * @remarks
		 *
		 * When ordered, a left-sided `Either` always compares as less than any
		 * right-sided `Either`. If the variants are the same, their values are
		 * compared to determine the ordering.
		 */
		[Ord.cmp]<A extends Ord<A>, B extends Ord<B>>(
			this: Either<A, B>,
			that: Either<A, B>,
		): Ordering {
			if (this.isLeft()) {
				return that.isLeft() ? cmp(this.val, that.val) : Ordering.less;
			}
			return that.isRight() ? cmp(this.val, that.val) : Ordering.greater;
		}

		/**
		 * If this and that `Either` both succeed, combine their successes and
		 * succeed with the result; otherwise, return the first failed `Either`.
		 */
		[Semigroup.cmb]<E, T extends Semigroup<T>>(
			this: Either<E, T>,
			that: Either<E, T>,
		): Either<E, T> {
			return this.zipWith(that, cmb);
		}

		/**
		 * Test whether this `Either` is left-sided.
		 */
		isLeft<A>(this: Either<A, any>): this is Left<A> {
			return this.kind === Kind.LEFT;
		}

		/**
		 * Test whether this `Either` is right-sided.
		 */
		isRight<B>(this: Either<any, B>): this is Right<B> {
			return this.kind === Kind.RIGHT;
		}

		/**
		 * Apply one of two functions to the value of this `Either` depending
		 * on its variant, and return the result.
		 */
		unwrap<A, B, T1, T2>(
			this: Either<A, B>,
			unwrapLeft: (val: A) => T1,
			unwrapRight: (val: B) => T2,
		): T1 | T2 {
			return this.isLeft() ? unwrapLeft(this.val) : unwrapRight(this.val);
		}

		/**
		 * If this `Either` fails, apply a function to its failure to return
		 * another `Either`; otherwise, return this `Either` as is.
		 */
		orElse<E, T, E1, T1>(
			this: Either<E, T>,
			f: (val: E) => Either<E1, T1>,
		): Either<E1, T | T1> {
			return this.isLeft() ? f(this.val) : this;
		}

		/**
		 * If this `Either` fails, ignore the failure and return that `Either`;
		 * otherwise, return this `Either` as is.
		 */
		or<T, E1, T1>(
			this: Either<any, T>,
			that: Either<E1, T1>,
		): Either<E1, T | T1> {
			return this.orElse(() => that);
		}

		/**
		 * If this `Either` succeeds, apply a function to its success to return
		 * another `Either`; otherwise, return this `Either` as is.
		 */
		andThen<E, T, E1, T1>(
			this: Either<E, T>,
			f: (val: T) => Either<E1, T1>,
		): Either<E | E1, T1> {
			return this.isLeft() ? this : f(this.val);
		}

		/**
		 * If this `Either` succeeds, apply a generator comprehension function
		 * to its success and evaluate the `Either.Go` generator to return
		 * another `Either`; otherwise, return this `Either` as is.
		 */
		andThenGo<E, T, E1, T1>(
			this: Either<E, T>,
			f: (val: T) => Go<E1, T1>,
		): Either<E | E1, T1> {
			return this.andThen((val) => go(f(val)));
		}

		/**
		 * If this `Either` succeeds, ignore the success and return that
		 * `Either`; otherwise, return this `Either` as is.
		 */
		and<E, E1, T1>(
			this: Either<E, any>,
			that: Either<E1, T1>,
		): Either<E | E1, T1> {
			return this.andThen(() => that);
		}

		/**
		 * If this and that `Either` both succeed, apply a function to their
		 * successes and succeed with the result; otherwise, return the first
		 * failed `Either`.
		 */
		zipWith<E, T, E1, T1, T2>(
			this: Either<E, T>,
			that: Either<E1, T1>,
			f: (lhs: T, rhs: T1) => T2,
		): Either<E | E1, T2> {
			return this.andThen((lhs) => that.map((rhs) => f(lhs, rhs)));
		}

		/**
		 * If this `Either` is left-sided, apply a function to its value and
		 * return the result in a `Left`; otherwise, return this `Either` as is.
		 */
		lmap<A, B, A1>(this: Either<A, B>, f: (val: A) => A1): Either<A1, B> {
			return this.orElse((val) => left(f(val)));
		}

		/**
		 * If this `Either` is right-sided, apply a function to its value and
		 * return the result in a `Right`; otherwise, return this `Either` as
		 * is.
		 */
		map<A, B, B1>(this: Either<A, B>, f: (val: B) => B1): Either<A, B1> {
			return this.andThen((val) => right(f(val)));
		}
	}

	/**
	 * A left-sided Either.
	 */
	export class Left<out A> extends Syntax {
		readonly kind = Kind.LEFT;

		/**
		 * The value of this `Either`.
		 */
		readonly val: A;

		constructor(val: A) {
			super();
			this.val = val;
		}

		/**
		 * Return an `Either.Go` generator that yields this `Either` and returns
		 * its right-hand value if one is present. This allows `Either` values
		 * to be yielded directly in `Either` generator comprehensions using
		 * `yield*`.
		 */
		*[Symbol.iterator](): Generator<Either<A, never>, never, unknown> {
			return (yield this) as never;
		}
	}

	/**
	 * A right-sided Either.
	 */
	export class Right<out B> extends Syntax {
		readonly kind = Kind.RIGHT;

		/**
		 * The value of this `Either`.
		 */
		readonly val: B;

		constructor(val: B) {
			super();
			this.val = val;
		}

		/**
		 * Return an `Either.Go` generator that yields this `Either` and returns
		 * its right-hand value if one is present. This allows `Either` values
		 * to be yielded directly in `Either` generator comprehensions using
		 * `yield*`.
		 */
		*[Symbol.iterator](): Generator<Either<never, B>, B, unknown> {
			return (yield this) as B;
		}
	}

	/**
	 * A generator that yields `Either` values and returns a result.
	 *
	 * @remarks
	 *
	 * Synchronous `Either` generator comprehensions should use this type alias
	 * as their return type. A generator function that returns an `Either.Go<E,
	 * T>` may `yield*` zero or more `Either<E, any>` values and must return a
	 * result of type `T`. Synchronous comprehensions may also `yield*` other
	 * `Either.Go` generators directly.
	 */
	export type Go<E, TReturn> = Generator<
		Either<E, unknown>,
		TReturn,
		unknown
	>;

	/**
	 * An async generator that yields `Either` values and returns a result.
	 *
	 * @remarks
	 *
	 * Async `Either` generator comprehensions should use this type alias as
	 * their return type. An async generator function that returns an
	 * `Either.GoAsync<E, T>` may `yield*` zero or more `Either<E, any>` values
	 * and must return a result of type `T`. `PromiseLike` values that resolve
	 * with `Either` should be awaited before yielding. Async comprehensions may
	 * also `yield*` other `Either.Go` and `Either.GoAsync` generators directly.
	 */
	export type GoAsync<E, TReturn> = AsyncGenerator<
		Either<E, any>,
		TReturn,
		unknown
	>;

	/**
	 * Extract the left-sided value type `A` from the type `Either<A, B>`.
	 */
	export type LeftT<TEither extends Either<any, any>> = [TEither] extends [
		Either<infer A, any>,
	]
		? A
		: never;

	/**
	 * Extract the right-sided value type `B` from the type `Either<A, B>`.
	 */
	export type RightT<TEither extends Either<any, any>> = [TEither] extends [
		Either<any, infer B>,
	]
		? B
		: never;
}
