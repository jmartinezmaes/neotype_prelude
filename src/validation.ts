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
 * Validation with accumulating failures.
 *
 * @remarks
 *
 * `Validation<E, T>` is a type that represents a state of accumulated failure
 * or success. It is represented by two variants: `Err<E>` and `Ok<T>`.
 *
 * -   The `Err<E>` variant represents a *failed* `Validation` and contains a
 *     *failure* of type `E`.
 * -   The `Ok<T>` variant represents a *successful* `Validation` and contains a
 *     *success* of type `T`.
 *
 * `Validation` is useful for collecting information about **all** failures in a
 * program, rather than halting evaluation on the first failure. This behavior
 * makes `Validation` a suitable type for validating data from inputs, forms,
 * and other arbitrary information sources.
 *
 * Most combinators for `Validation` begin accumulating failures on the first
 * failed `Validation`. Combinators with this behavior require a `Semigroup`
 * implementation from the accumulating failures.
 *
 * ## Importing from this module
 *
 * This module exports `Validation` as both a type and a namespace. The
 * `Validation` type is an alias for a discriminated union, and the `Validation`
 * namespace provides:
 *
 * -   The `Err` and `Ok` variant classes
 * -   The abstract `Syntax` class that provides the fluent API for `Validation`
 * -   The `Kind` enumeration that discriminates `Validation`
 * -   Functions for constructing, collecting into, and lifting into
 *     `Validation`
 *
 * The type and namespace can be imported under the same alias:
 *
 * ```ts
 * import { Validation } from "@neotype/prelude/validation.js";
 * ```
 *
 * Or, the type and namespace can be imported and aliased separately:
 *
 * ```ts
 * import {
 *     type Validation,
 *     Validation as V
 * } from "@neotype/prelude/validation.js";
 * ```
 *
 * ## Constructing `Validation`
 *
 * These functions construct a `Validation`:
 *
 * -   `err` constructs a failed `Validation`
 * -   `ok` constructs a successful `Validation`.
 * -   `fromEither` constructs a `Validation` from an `Either`.
 *
 * ## Querying and narrowing the variant
 *
 * The `isErr` and `isOk` methods return `true` if a `Validation` fails or
 * succeeds, respectively. These methods also narrow the type of a `Validation`
 * to the queried variant.
 *
 * The variant can also be queried and narrowed via the `kind` property, which
 * returns a member of the `Kind` enumeration.
 *
 * ## Extracting values
 *
 * The failure or the success within a `Validation` can be accessed via the
 * `val` property. The type of the property can be narrowed by first querying
 * variant.
 *
 * The `unwrap` method unwraps a `Validation` by applying one of two functions
 * to its failure or success, depending on the variant.
 *
 * ## Comparing `Validation`
 *
 * `Validation` has the following behavior as an equivalence relation:
 *
 * -   A `Validation<E, T>` implements `Eq` when both `E` and `T` implement
 *     `Eq`.
 * -   Two `Validation` values are equal if they are the same variant and their
 *     failures or successes are equal.
 *
 * `Validation` has the following behavior as a total order:
 *
 * -   A `Validation<E, T>` implements `Ord` when both `E` and `T` implement
 *     `Ord`.
 * -   When ordered, a failed `Validation` always compares as less than any
 *     successful `Validation`. If the variants are the same, their failures or
 *     successes are compared to determine the ordering.
 *
 * ## `Validation` as a semigroup
 *
 * `Validation` has the following behavior as a semigroup:
 *
 * -   A `Validation<E, T>` implements `Semigroup` when both `E` and `T`
 *     implement `Semigroup`.
 * -   When combined, a failed `Validation` ignores the combination and begins
 *     accumulating failures instead. If both succeed, their successes are
 *     combined and returned as a success.
 *
 * ## Transforming values
 *
 * These methods transform the failure or the success within a `Validation`:
 *
 * -   `lmap` applies a function to the failure.
 * -   `map` applies a function to the success.
 *
 * ## Chaining `Validation`
 *
 * These methods act on a successful `Validation` to produce another
 * `Validation`:
 *
 * -   `and` ignores the success and returns another `Validation`.
 * -   `zipWith` evaluates another `Validation`, and if successful, applies a
 *     function to both successes.
 *
 * ## Collecting into `Validation`
 *
 * These functions map the elements in an iterable to `Validation` values,
 * evaluate the values, and act on the successes:
 *
 * -   `traverseInto` collects the successes into a `Builder`.
 * -   `traverse` collects the successes in an array.
 * -   `forEach` ignores the successes.
 *
 * These functions evaluate the `Validation` elements in a structure and collect
 * the successes:
 *
 * -   `collectInto` traverses an iterable and collects the successes into a
 *     `Builder`.
 * -   `all` traverses an iterable and collects the successes in an array or a
 *     tuple literal.
 * -   `allProps` traverses a string-keyed record or object literal and collects
 *     the successes in an equivalent structure.
 *
 * ### Collecting concurrently
 *
 * These functions map the elements in an iterable to promise-like `Validation`
 * values, concurrently evaluate the values, and act on the successes:
 *
 * -   `traverseIntoPar` collects the successes into a `Builder`.
 * -   `traversePar` collects the successes in an array.
 * -   `forEachPar` ignores the successes.
 *
 * These functions concurrently evaluate the promise-like `Validation` elements
 * in a structure and collect the successes:
 *
 * -   `collectIntoPar` traverses an iterable and collects the successes into a
 *     `Builder`.
 * -   `allPar` traverses an iterable and collects the successes in an array or
 *     a tuple literal.
 * -   `allPropsPar` traverses a string-keyed record or object literal and
 *     collects the successes in an equivalent structure.
 *
 * ## Lifting functions into the context of `Validation`
 *
 * These functions adapt a function to work with `Validation` values:
 *
 * -   `lift` adapts a synchronous function to accept `Validation` values as
 *     arguments and return a `Validation`.
 * -   `liftAsync` adapts a synchronous or an asynchronous function to accept
 *     promise-like `Validation` values as arguments and return a `Promise` that
 *     resolves with a `Validation`.
 *
 * @example Validating a single property
 *
 * First, the necessary imports:
 *
 * ```ts
 * import { Semigroup } from "@neotype/prelude/cmb.js";
 * import { Validation } from "@neotype/prelude/validation.js";
 * ```
 *
 * Let's also define a helper semigroup type:
 *
 * ```ts
 * // A semigroup that wraps arrays
 * class List<out T> {
 *     readonly val: T[]
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
 * ```
 *
 * Now, consider a program that performs a trivial email validation:
 *
 * ```ts
 * function requireNonEmpty(input: string): Validation<List<string>, string> {
 *     return input.length > 0
 *         ? Validation.ok(input)
 *         : Validation.err(new List("empty input"));
 * }
 *
 * function requireAtSign(input: string): Validation<List<string>, string> {
 *     return input.includes("@")
 *         ? Validation.ok(input)
 *         : Validation.err(new List("missing @"));
 * }
 *
 * function requirePeriod(input: string): Validation<List<string>, string> {
 *     return input.includes(".")
 *         ? Validation.ok(input)
 *         : Validation.err(new List("missing period"));
 * }
 *
 * function validateEmail(input: string): Validation<List<string>, string> {
 *     return requireNonEmpty(input)
 *         .and(requireAtSign(input))
 *         .and(requirePeriod(input));
 * }
 *
 * ["", "neo", "neogmail.com", "neo@gmailcom", "neo@gmail.com"].forEach(
 *     (input) => {
 *         const result = JSON.stringify(validateEmail(input).val);
 *         console.log(`input "${input}": ${result}`);
 *     }
 * );
 *
 * // input "": ["empty input","missing @","missing period"]
 * // input "neo": ["missing @","missing period"]
 * // input "neogmail.com": ["missing @"]
 * // input "neo@gmailcom": ["missing period"]
 * // input "neo@gmail.com": "neo@gmail.com"
 * ```
 *
 * @example Validating multiple properties
 *
 * First, the necessary imports:
 *
 * ```ts
 * import { Semigroup } from "@neotype/prelude/cmb.js";
 * import { Validation } from "@neotype/prelude/validation.js";
 * ```
 *
 * Let's also define a helper semigroup type:
 *
 * ```ts
 * // A semigroup that wraps arrays
 * class List<out T> {
 *     readonly val: T[]
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
 * ```
 *
 * Now, consider a program that validates a `Person` object with a `name` and an
 * `age`:
 *
 * ```ts
 * interface Person {
 *     name: string;
 *     age: number;
 * }
 *
 * function validateName(input: string): Validation<List<string>, string> {
 *     return input.length
 *         ? Validation.ok(input)
 *         : Validation.err(new List("empty name"));
 * }
 *
 * function validateAge(input: number): Validation<List<string>, number> {
 *     return input >= 0 && input <= 100
 *         ? Validation.ok(input)
 *         : Validation.err(new List("age not in range"));
 * }
 *
 * function validatePerson(
 *     rawName: string,
 *     rawAge: number,
 * ): Validation<List<string>, Person> {
 *     return Validation.allProps({
 *         name: validateName(rawName),
 *         age: validateAge(rawAge),
 *     });
 * }
 *
 * [
 *     ["", 182] as const,
 *     ["", 30] as const,
 *     ["Neo", 150] as const,
 *     ["Neo", 45] as const,
 * ].forEach((inputs) => {
 *     const [rawName, rawAge] = inputs;
 *     const result = JSON.stringify(validatePerson(rawName, rawAge).val);
 *     console.log(`inputs ${JSON.stringify(inputs)}: ${result}`);
 * });
 *
 * // inputs ["",182]: ["empty name","age not in range"]
 * // inputs ["",30]: ["empty name"]
 * // inputs ["Neo",150]: ["age not in range"]
 * // inputs ["Neo",45]: {"name":"Neo","age":45}
 * ```
 *
 * @example Validating arbitrary properties
 *
 * First, the necessary imports:
 *
 * ```ts
 * import { Semigroup } from "@neotype/prelude/cmb.js";
 * import { Validation } from "@neotype/prelude/validation.js";
 * ```
 *
 * Let's also define a helper semigroup type:
 *
 * ```ts
 * // A semigroup that wraps arrays
 * class List<out T> {
 *     readonly val: T[]
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
 * ```
 *
 * Now, consider a program that validates an arbitrary-length array of strings:
 *
 * ```ts
 * function requireLowercase(input: string): Validation<List<string>, string> {
 *     return input === input.toLowerCase()
 *         ? Validation.ok(input)
 *         : Validation.err(new List(input));
 * }
 *
 * function requireLowercaseElems(
 *     inputs: string[]
 * ): Validation<List<string>, string[]> {
 *     return Validation.all(inputs.map(requireLowercase));
 * }
 *
 * [
 *     ["New York", "Oregon"],
 *     ["foo", "Bar", "baz"],
 *     ["banana", "apple", "orange"],
 * ].forEach((inputs) => {
 *     const result = JSON.stringify(
 *         requireLowercaseElems(inputs).unwrap(
 *             (invalidInputs) => ({ invalid: invalidInputs }),
 *             (validInputs) => ({ valid: validInputs }),
 *         ),
 *     );
 *     console.log(`inputs ${JSON.stringify(inputs)}: ${result}`);
 * });
 *
 * // inputs ["New York","Oregon"]: {"invalid":["New York","Oregon"]}
 * // inputs ["Code","of","Conduct"]: {"invalid":["Code","Conduct"]}
 * // inputs ["banana","apple","orange"]: {"valid":["banana","apple","orange"]}
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
import type { Either } from "./either.js";
import { id } from "./fn.js";

/**
 * A type that represents either accumulating failure (`Err`) or success (`Ok`).
 */
export type Validation<E, T> = Validation.Err<E> | Validation.Ok<T>;

/**
 * The companion namespace for the `Validation` type.
 */
export namespace Validation {
	/**
	 * Construct a failed `Validation` from a value.
	 */
	export function err<E, T = never>(val: E): Validation<E, T> {
		return new Err(val);
	}

	/**
	 * Construct a successful `Validation` from a value.
	 */
	export function ok<T, E = never>(val: T): Validation<E, T> {
		return new Ok(val);
	}

	/**
	 * Construct a `Validation` from an `Either`.
	 */
	export function fromEither<A, B>(either: Either<A, B>): Validation<A, B> {
		return either.unwrap(err, ok);
	}

	/**
	 * Map the elements in an iterable to `Validation` values, evaluate the
	 * values from left to right, and collect the successes into a `Builder`.
	 *
	 * @remarks
	 *
	 * If any `Validation` fails, the state of the provided `Builder` is
	 * undefined.
	 */
	export function traverseInto<T, E extends Semigroup<E>, T1, TFinish>(
		elems: Iterable<T>,
		f: (elem: T, idx: number) => Validation<E, T1>,
		builder: Builder<T1, TFinish>,
	): Validation<E, TFinish> {
		let acc = ok<Builder<T1, TFinish>, E>(builder);
		let idx = 0;
		for (const elem of elems) {
			const that = f(elem, idx);
			acc = acc.zipWith(that, (bldr, val) => {
				bldr.add(val);
				return bldr;
			});
			idx++;
		}
		return acc.map((bldr) => bldr.finish());
	}

	/**
	 * Map the elements in an iterable to `Validation` values, evaluate the
	 * values from left to right, and collect the successes in an array.
	 */
	export function traverse<T, E extends Semigroup<E>, T1>(
		elems: Iterable<T>,
		f: (elem: T, idx: number) => Validation<E, T1>,
	): Validation<E, T1[]> {
		return traverseInto(elems, f, new ArrayPushBuilder());
	}

	/**
	 * Map the elements in an iterable to `Validation` values, evaluate the
	 * values from left to right, and ignore the successes.
	 */
	export function forEach<T, E extends Semigroup<E>>(
		elems: Iterable<T>,
		f: (elem: T, idx: number) => Validation<E, any>,
	): Validation<E, void> {
		return traverseInto(elems, f, new NoOpBuilder());
	}

	/**
	 * Evaluate the `Validation` elements in an iterable from left to right and
	 * collect the successes into a `Builder`.
	 *
	 * @remarks
	 *
	 * If any `Validation` fails, the state of the provided `Builder` is
	 * undefined.
	 */
	export function collectInto<E extends Semigroup<E>, T, TFinish>(
		vdns: Iterable<Validation<E, T>>,
		builder: Builder<T, TFinish>,
	): Validation<E, TFinish> {
		return traverseInto(vdns, id, builder);
	}

	/**
	 * Evaluate the `Validation` elements in an array or a tuple literal from
	 * left to right and collect the successes in an equivalent structure.
	 *
	 * @remarks
	 *
	 * This function essentially turns an array or a tuple literal of
	 * `Validation` elements "inside out". For example:
	 *
	 * -   `Validation<E, T>[]` becomes `Validation<E, T[]>`
	 * -   `[Validation<E, T1>, Validation<E, T2>]` becomes `Validation<E, [T1,
	 *     T2]>`
	 */
	export function all<
		TVdns extends readonly Validation<Semigroup<any>, any>[] | [],
	>(
		vdns: TVdns,
	): Validation<
		ErrT<TVdns[number]>,
		{ -readonly [K in keyof TVdns]: OkT<TVdns[K]> }
	>;

	/**
	 * Evaluate the `Validation` elements in an iterable from left to right and
	 * collect the successes in an array.
	 *
	 * @remarks
	 *
	 * This function essentially turns an iterable of `Validation` elements
	 * "inside out". For example, `Iterable<Validation<E, T>>` becomes
	 * `Validation<E, T[]>`.
	 */
	export function all<E extends Semigroup<E>, T>(
		vdns: Iterable<Validation<E, T>>,
	): Validation<E, T[]>;

	export function all<E extends Semigroup<E>, T>(
		vdns: Iterable<Validation<E, T>>,
	): Validation<E, T[]> {
		return collectInto(vdns, new ArrayPushBuilder());
	}

	/**
	 * Evaluate the `Validation` elements in a string-keyed record or object
	 * literal and collect the successes in an equivalent structure.
	 *
	 * @remarks
	 *
	 * This function essentially turns a string-keyed record or object literal
	 * of `Validation` elements "inside out". For example:
	 *
	 * -   `Record<string, Validation<E, T>>` becomes `Validation<E,
	 *     Record<string, T>>`
	 * -   `{ x: Validation<E, T1>, y: Validation<E, T2> }` becomes
	 *     `Validation<E, { x: T1, y: T2 }>`
	 */
	export function allProps<
		TVdns extends Record<string, Validation<Semigroup<any>, any>>,
	>(
		vdns: TVdns,
	): Validation<
		ErrT<TVdns[keyof TVdns]>,
		{ -readonly [K in keyof TVdns]: OkT<TVdns[K]> }
	>;

	export function allProps<E extends Semigroup<E>, T>(
		vdns: Record<string, Validation<E, T>>,
	): Validation<E, Record<string, T>> {
		return traverseInto(
			Object.entries(vdns),
			([key, vdn]) => vdn.map((val): [string, T] => [key, val]),
			new RecordEntryBuilder(),
		);
	}

	/**
	 * Adapt a synchronous function to accept `Validation` values as arguments
	 * and return a `Validation`.
	 */
	export function lift<TArgs extends unknown[], T>(
		f: (...args: TArgs) => T,
	): <E extends Semigroup<E>>(
		...vdns: { [K in keyof TArgs]: Validation<E, TArgs[K]> }
	) => Validation<E, T> {
		return (...vdns) =>
			all(vdns).map((args) => f(...(args as TArgs))) as Validation<
				any,
				T
			>;
	}

	/**
	 * Map the elements in an iterable to promise-like `Validation` values,
	 * concurrently evaluate the values, and collect the successes into a
	 * `Builder`.
	 *
	 * @remarks
	 *
	 * If any `Validation` fails, the state of the provided `Builder` is
	 * undefined.
	 */
	export function traverseIntoPar<T, E extends Semigroup<E>, T1, TFinish>(
		elems: Iterable<T>,
		f: (
			elem: T,
			idx: number,
		) => Validation<E, T1> | PromiseLike<Validation<E, T1>>,
		builder: Builder<T1, TFinish>,
	): Promise<Validation<E, TFinish>> {
		return new Promise((resolve, reject) => {
			let remaining = 0;
			let acc: E | undefined;

			for (const elem of elems) {
				const idx = remaining;
				remaining++;
				Promise.resolve(f(elem, idx)).then((vdn) => {
					if (vdn.isErr()) {
						if (acc === undefined) {
							acc = vdn.val;
						} else {
							acc = cmb(acc, vdn.val);
						}
					} else if (acc === undefined) {
						builder.add(vdn.val);
					}

					remaining--;
					if (remaining === 0) {
						if (acc === undefined) {
							resolve(ok(builder.finish()));
						} else {
							resolve(err(acc));
						}
						return;
					}
				}, reject);
			}
		});
	}

	/**
	 * Map the elements in an iterable to promise-like `Validation` values,
	 * concurrently evaluate the values, and collect the successes in an array.
	 */
	export function traversePar<T, E extends Semigroup<E>, T1>(
		elems: Iterable<T>,
		f: (
			elem: T,
			idx: number,
		) => Validation<E, T1> | PromiseLike<Validation<E, T1>>,
	): Promise<Validation<E, T1[]>> {
		return traverseIntoPar(
			elems,
			async (elem, idx) =>
				(await f(elem, idx)).map((val): [number, T1] => [idx, val]),
			new ArrayEntryBuilder(),
		);
	}

	/**
	 * Map the elements in an iterable to promise-like `Validation` values,
	 * concurrently evaluate the values, and ignore the successes.
	 */
	export function forEachPar<T, E extends Semigroup<E>>(
		elems: Iterable<T>,
		f: (
			elem: T,
			idx: number,
		) => Validation<E, any> | PromiseLike<Validation<E, any>>,
	): Promise<Validation<E, void>> {
		return traverseIntoPar(elems, f, new NoOpBuilder());
	}

	/**
	 * Concurrently evaluate the promise-like `Validation` elements in an
	 * iterable and collect the successes into a `Builder`.
	 *
	 * @remarks
	 *
	 * If any `Validation` fails, the state of the provided `Builder` is
	 * undefined.
	 */
	export function collectIntoPar<E extends Semigroup<E>, T, TFinish>(
		vdns: Iterable<Validation<E, T> | PromiseLike<Validation<E, T>>>,
		builder: Builder<T, TFinish>,
	): Promise<Validation<E, TFinish>> {
		return traverseIntoPar(vdns, id, builder);
	}

	/**
	 * Concurrently evaluate the promise-like `Validation` elements in an array
	 * or a tuple literal and collect the successes in an equivalent structure.
	 *
	 * @remarks
	 *
	 * This function essentially turns an array or a tuple literal of
	 * promise-like `Validation` elements "inside out". For example:
	 *
	 * -   `Promise<Validation<E, T>>[]` becomes `Promise<Validation<E, T[]>>`
	 * -   `[Promise<Validation<E, T1>>, Promise<Validation<E, T2>>]` becomes
	 *     `Promise<Validation<E, [T1, T2]>>`
	 */
	export function allPar<
		TElems extends
			| readonly (
					| Validation<Semigroup<any>, any>
					| PromiseLike<Validation<Semigroup<any>, any>>
			  )[]
			| [],
	>(
		elems: TElems,
	): Promise<
		Validation<
			ErrT<{ [K in keyof TElems]: Awaited<TElems[K]> }[number]>,
			{ [K in keyof TElems]: OkT<Awaited<TElems[K]>> }
		>
	>;

	/**
	 * Concurrently evaluate the promise-like `Validation` elements in an
	 * iterable and collect the successes in an array.
	 *
	 * @remarks
	 *
	 * This function essentially turns an iterable of promise-like `Validation`
	 * elements "inside out". For example, `Iterable<Promise<Validation<E, T>>>`
	 * becomes `Promise<Validation<E, T[]>>`.
	 */
	export function allPar<E extends Semigroup<E>, T>(
		elems: Iterable<Validation<E, T> | PromiseLike<Validation<E, T>>>,
	): Promise<Validation<E, T[]>>;

	export function allPar<E extends Semigroup<E>, T>(
		elems: Iterable<Validation<E, T> | PromiseLike<Validation<E, T>>>,
	): Promise<Validation<E, T[]>> {
		return traverseIntoPar(
			elems,
			async (elem, idx) =>
				(await elem).map((val): [number, T] => [idx, val]),
			new ArrayEntryBuilder(),
		);
	}

	/**
	 * Concurrently evaluate the promise-like `Validation` elements in a
	 * string-keyed record or object literal and collect the successes in an
	 * equivalent structure.
	 *
	 * @remarks
	 *
	 * This function essentially turns a string-keyed record or object literal
	 * of promise-like `Validation` elements "inside out". For example:
	 *
	 * -   `Record<string, Promise<Validation<E, T>>>` becomes
	 *     `Promise<Validation<E, Record<string, T>>>`
	 * -   `{ x: Promise<Validation<E, T1>>, y: Promise<Validation<E, T2>> }`
	 *     becomes `Promise<Validation<E, { x: T1, y: T2 }>>`
	 */
	export function allPropsPar<
		TElems extends Record<
			string,
			| Validation<Semigroup<any>, any>
			| PromiseLike<Validation<Semigroup<any>, any>>
		>,
	>(
		elems: TElems,
	): Promise<
		Validation<
			ErrT<{ [K in keyof TElems]: Awaited<TElems[K]> }[keyof TElems]>,
			{ [K in keyof TElems]: OkT<Awaited<TElems[K]>> }
		>
	>;

	export function allPropsPar<E extends Semigroup<E>, T>(
		elems: Record<string, Validation<E, T> | PromiseLike<Validation<E, T>>>,
	): Promise<Validation<E, Record<string, T>>> {
		return traverseIntoPar(
			Object.entries(elems),
			async ([key, elem]) =>
				(await elem).map((val): [string, T] => [key, val]),
			new RecordEntryBuilder(),
		);
	}

	/**
	 * Adapt a synchronous or an asynchronous function to accept promise-like
	 * `Validation` values as arguments and return a `Promise` that resolves
	 * with a `Validation`.
	 *
	 * @remarks
	 *
	 * The lifted function's arguments are evaluated concurrently.
	 */
	export function liftPar<TArgs extends unknown[], T>(
		f: (...args: TArgs) => T | PromiseLike<T>,
	): <E extends Semigroup<E>>(
		...elems: {
			[K in keyof TArgs]:
				| Validation<E, TArgs[K]>
				| PromiseLike<Validation<E, TArgs[K]>>;
		}
	) => Promise<Validation<E, T>> {
		return async (...elems) => {
			const result = (await allPar(elems)).map((args) =>
				f(...(args as TArgs)),
			);
			if (result.isErr()) {
				return result;
			}
			return ok(await result.val) as Validation<any, any>;
		};
	}

	/**
	 * An enumeration that discriminates `Validation`.
	 */
	export enum Kind {
		ERR,
		OK,
	}

	/**
	 * The fluent syntax for `Validation`.
	 */
	export abstract class Syntax {
		/**
		 * The property that discriminates `Validation`.
		 */
		abstract readonly kind: Kind;

		/**
		 * If this and that `Validation` are the same variant and their values
		 * are equal, return `true`; otherwise, return `false`.
		 */
		[Eq.eq]<E extends Eq<E>, T extends Eq<T>>(
			this: Validation<E, T>,
			that: Validation<E, T>,
		): boolean {
			if (this.isErr()) {
				return that.isErr() && eq(this.val, that.val);
			}
			return that.isOk() && eq(this.val, that.val);
		}

		/**
		 * Compare this and that `Validation` to determine their ordering.
		 *
		 * @remarks
		 *
		 * When ordered, a failed `Validation` always compares as less than any
		 * successful `Validation`. If the variants are the same, their failures
		 * or successes are compared to determine the ordering.
		 */
		[Ord.cmp]<E extends Ord<E>, T extends Ord<T>>(
			this: Validation<E, T>,
			that: Validation<E, T>,
		): Ordering {
			if (this.isErr()) {
				return that.isErr() ? cmp(this.val, that.val) : Ordering.less;
			}
			return that.isOk() ? cmp(this.val, that.val) : Ordering.greater;
		}

		/**
		 * If this and that `Validation` both succeed, combine their successes
		 * and succeed with the result; otherwise, begin accumulating failures
		 * on the first failed `Validation`.
		 */
		[Semigroup.cmb]<E extends Semigroup<E>, T extends Semigroup<T>>(
			this: Validation<E, T>,
			that: Validation<E, T>,
		): Validation<E, T> {
			return this.zipWith(that, cmb);
		}

		/**
		 * Test whether this `Validation` has failed.
		 */
		isErr<E>(this: Validation<E, any>): this is Err<E> {
			return this.kind === Kind.ERR;
		}

		/**
		 * Test whether this `Validation` has succeeded.
		 */
		isOk<T>(this: Validation<any, T>): this is Ok<T> {
			return this.kind === Kind.OK;
		}

		/**
		 * Case analysis for `Validation`.
		 */
		unwrap<E, T, T1, T2>(
			this: Validation<E, T>,
			unwrapErr: (val: E) => T1,
			unwrapOk: (val: T) => T2,
		): T1 | T2 {
			return this.isErr() ? unwrapErr(this.val) : unwrapOk(this.val);
		}

		/**
		 * If this `Validation` succeeds, return that `Validation`; otherwise,
		 * begin accumulating failures on this `Validation`.
		 */
		and<E extends Semigroup<E>, T1>(
			this: Validation<E, any>,
			that: Validation<E, T1>,
		): Validation<E, T1> {
			return this.zipWith(that, (_, rhs) => rhs);
		}

		/**
		 * If this and that `Validation` both succeed, apply a function to their
		 * successes and succeed with the result; otherwise, begin accumulating
		 * failures on the first failed `Validation`.
		 */
		zipWith<E extends Semigroup<E>, T, T1, T2>(
			this: Validation<E, T>,
			that: Validation<E, T1>,
			f: (lhs: T, rhs: T1) => T2,
		): Validation<E, T2> {
			if (this.isErr()) {
				return that.isErr() ? err(cmb(this.val, that.val)) : this;
			}
			return that.isErr() ? that : ok(f(this.val, that.val));
		}

		/**
		 * If this `Validation` fails, apply a function to its failure and fail
		 * with the result; otherwise, return this `Validation` as is.
		 */
		lmap<E, T, E1>(
			this: Validation<E, T>,
			f: (val: E) => E1,
		): Validation<E1, T> {
			return this.isErr() ? err(f(this.val)) : this;
		}

		/**
		 * If this `Validation` succeeds, apply a function to its success and
		 * succeed with the result; otherwise, return this `Validation` as is.
		 */
		map<E, T, T1>(
			this: Validation<E, T>,
			f: (val: T) => T1,
		): Validation<E, T1> {
			return this.isErr() ? this : ok(f(this.val));
		}
	}

	/**
	 * A failed `Validation`.
	 */
	export class Err<out E> extends Syntax {
		readonly kind = Kind.ERR;

		/**
		 * The value of this `Validation`.
		 */
		readonly val: E;

		constructor(val: E) {
			super();
			this.val = val;
		}
	}

	/**
	 * A successful `Validation`.
	 */
	export class Ok<out T> extends Syntax {
		readonly kind = Kind.OK;

		/**
		 * The value of this `Validation`.
		 */
		readonly val: T;

		constructor(val: T) {
			super();
			this.val = val;
		}
	}

	/**
	 * Extract the failure type `E` from the type `Validation<E, T>`.
	 */
	export type ErrT<TVdn extends Validation<any, any>> = [TVdn] extends [
		Validation<infer E, any>,
	]
		? E
		: never;

	/**
	 * Extract the success type `T` from the type `Validation<E, T>`.
	 */
	export type OkT<TVdn extends Validation<any, any>> = [TVdn] extends [
		Validation<any, infer T>,
	]
		? T
		: never;
}
