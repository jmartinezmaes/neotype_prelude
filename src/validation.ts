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
 * These methods combine the successes of two successful `Validation` values, or
 * begin accumulating failures on any failed `Validation`:
 *
 * -   `zipWith` applies a function to their successes.
 * -   `zipFst` keeps only the first success, and discards the second.
 * -   `zipSnd` keeps only the second success, and discards the first.
 *
 * ## Collecting into `Validation`
 *
 * These methods turn a container of `Validation` elements "inside out". If the
 * elements all succeed, their successes are collected into an equivalent
 * container and returned as a success. If any element fails, the collection
 * halts and failures begin accumulating instead.
 *
 * -   `collect` turns an array or a tuple literal of `Validation` elements
 *     inside out. For example:
 *     -   `Validation<E, T>[]` becomes `Validation<E, T[]>`
 *     -   `[Validation<E, T1>, Validation<E, T2>]` becomes `Validation<E, [T1,
 *         T2]>`
 * -   `gather` turns a record or an object literal of `Validation` elements
 *     inside out. For example:
 *     -   `Record<string, Validation<E, T>>` becomes `Validation<E,
 *         Record<string, T>>`
 *     -   `{ x: Validation<E, T1>, y: Validation<E, T2> }` becomes
 *         `Validation<E, { x: T1, y: T2 }>`
 *
 * ## Lifting functions to work with `Validation`
 *
 * The `lift` function receives a function that accepts arbitrary arguments, and
 * returns an adapted function that accepts `Validation` values as arguments
 * instead. The arguments are evaluated from left to right, and if they all
 * succeed, the original function is applied to their successes and the result
 * is returned as a success. If any `Validation` fails, failures begin
 * accumulating instead.
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
 *         .zipFst(requireAtSign(input))
 *         .zipFst(requirePeriod(input));
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
 *     return Validation.gather({
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
 *     return Validation.collect(inputs.map(requireLowercase));
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
	 *
	 * @remarks
	 *
	 * If the `Either` is a `Left`, return its value in an `Err`; otherwise,
	 * return its value in an `Ok`.
	 */
	export function fromEither<A, B>(either: Either<A, B>): Validation<A, B> {
		return either.unwrap(err, ok);
	}

	/**
	 * Turn an array or a tuple literal of `Validation` elements "inside out".
	 *
	 * @remarks
	 *
	 * Evaluate the `Validation` elements in an array or a tuple literal from
	 * left to right. If they all succeed, collect their successes in an array
	 * or a tuple literal, respectively, and succeed with the result; otherwise,
	 * begin accumulating failures on the first failed `Validation`.
	 *
	 * For example:
	 *
	 * -   `Validation<E, T>[]` becomes `Validation<E, T[]>`
	 * -   `[Validation<E, T1>, Validation<E, T2>]` becomes `Validation<E, [T1,
	 *     T2]>`
	 */
	export function collect<
		TVdns extends readonly Validation<Semigroup<any>, any>[] | [],
	>(
		vdns: TVdns,
	): Validation<
		ErrT<TVdns[number]>,
		{ -readonly [K in keyof TVdns]: OkT<TVdns[K]> }
	> {
		let acc = ok<any, any>(new Array(vdns.length));
		for (const [idx, vdn] of vdns.entries()) {
			acc = acc.zipWith(vdn, (results, val) => {
				results[idx] = val;
				return results;
			});
		}
		return acc;
	}

	/**
	 * Turn a record or an object literal of `Validation` elements "inside out".
	 *
	 * @remarks
	 *
	 * Evaluate the `Validation` elements in a record or an object literal. If
	 * they all succeed, collect their successes in a record or an object
	 * literal, respectively, and succeed with the result; otherwise, begin
	 * accumulating failures on the first failed `Validation`.
	 *
	 * For example:
	 *
	 * -   `Record<string, Validation<E, T>>` becomes `Validation<E,
	 *     Record<string, T>>`
	 * -   `{ x: Validation<E, T1>, y: Validation<E, T2> }` becomes
	 *     `Validation<E, { x: T1, y: T2 }>`
	 */
	export function gather<
		TVdns extends Record<string, Validation<Semigroup<any>, any>>,
	>(
		vdns: TVdns,
	): Validation<
		ErrT<TVdns[keyof TVdns]>,
		{ -readonly [K in keyof TVdns]: OkT<TVdns[K]> }
	> {
		let acc = ok<any, any>({});
		for (const [key, vdn] of Object.entries(vdns)) {
			acc = acc.zipWith(vdn, (results, val) => {
				results[key] = val;
				return results;
			});
		}
		return acc;
	}

	/**
	 * Lift a function into the context of `Validation`.
	 *
	 * @remarks
	 *
	 * Given a function that accepts arbitrary arguments, return an adapted
	 * function that accepts `Validation` values as arguments. When applied,
	 * evaluate the arguments from left to right. If they all succeed, apply the
	 * original function to their successes and succeed with the result;
	 * otherwise, begin accumulating failures on the first failed `Validation`.
	 */
	export function lift<TArgs extends unknown[], T>(
		f: (...args: TArgs) => T,
	): <E extends Semigroup<E>>(
		...vdns: { [K in keyof TArgs]: Validation<E, TArgs[K]> }
	) => Validation<E, T> {
		return (...vdns) =>
			collect(vdns).map((args) => f(...(args as TArgs))) as Validation<
				any,
				T
			>;
	}

	/**
	 * The fluent syntax for `Validation`.
	 */
	export abstract class Syntax {
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
		 * If this and that `Validation` both succeed, succeed with only the
		 * first success and discard the second; otherwise, begin accumulating
		 * failures on the first failed `Validation`.
		 */
		zipFst<E extends Semigroup<E>, T>(
			this: Validation<E, T>,
			that: Validation<E, any>,
		): Validation<E, T> {
			return this.zipWith(that, id);
		}

		/**
		 * If this and that `Validation` both succeed, succeed with only the
		 * second success and discard the first; otherwise, begin accumulating
		 * failures on the first failed `Validation`.
		 */
		zipSnd<E extends Semigroup<E>, T1>(
			this: Validation<E, any>,
			that: Validation<E, T1>,
		): Validation<E, T1> {
			return this.zipWith(that, (_, rhs) => rhs);
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
	 * An enumeration that discriminates `Validation`.
	 */
	export enum Kind {
		ERR,
		OK,
	}

	/**
	 * A failed `Validation`.
	 */
	export class Err<out E> extends Syntax {
		/**
		 * The property that discriminates `Validation`.
		 */
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
		/**
		 * The property that discriminates `Validation`.
		 */
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
