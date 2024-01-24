/*
 * Copyright 2022-2024 Joshua Martinez-Maes
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
 * {@link Validation:type | `Validation<E, T>`} is a type that represents a
 * state of accumulated failure or success. It is represented by two variants:
 * {@link Validation.Err | `Err<E>`} and {@link Validation.Ok | `Ok<T>`}.
 *
 * -   An `Err<E>` is a failed `Validation` and contains a failure of type `E`.
 * -   An `Ok<T>` is a successful `Validation` and contains a success of type
 *     `T`.
 *
 * The {@link Validation:namespace | `Validation`} companion namespace provides
 * utilities for working with the `Validation<E, T>` type.
 *
 * `Validation` is useful for collecting information about all failures in a
 * program rather than halting evaluation on the first failure. This behavior
 * makes `Validation` a suitable type for validating data from inputs, forms,
 * and other sources.
 *
 * Most combinators for `Validation` begin accumulating failures on the first
 * failed `Validation`. Combinators with this behavior require a `Semigroup`
 * implementation from the accumulating failures.
 *
 * ## Using `Validation` with promises
 *
 * {@link AsyncValidation:type | `AsyncValidation<E, T>`} is an alias for
 * `Promise<Validation<E, T>>`. The
 * {@link AsyncValidation:namespace | `AsyncValidation`} companion namespace
 * provides utilities for working with the `AsyncValidation<E, T>` type.
 *
 * To accommodate promise-like values, this module also provides the
 * {@link AsyncValidationLike | `AsyncValidationLike<E, T>`} type as an alias
 * for `PromiseLike<Validation<E, T>>`.
 *
 * ## Importing from this module
 *
 * The types and namespaces from this module can be imported under the same
 * aliases:
 *
 * ```ts
 * import { AsyncValidation, Validation } from "@neotype/prelude/validation.js";
 * ```
 *
 * Or, the types and namespaces can be imported and aliased separately:
 *
 * ```ts
 * import {
 *     type AsyncValidation,
 *     type Validation,
 *     AsyncValidation as AV,
 *     Validation as V
 * } from "@neotype/prelude/validation.js";
 * ```
 *
 * @module
 */

import {
	ArrayAssignBuilder,
	ArrayPushBuilder,
	NoOpBuilder,
	ObjectAssignBuilder,
	type Builder,
} from "./builder.js";
import { Semigroup, cmb } from "./cmb.js";
import { Eq, Ord, Ordering, cmp, eq } from "./cmp.js";
import { id } from "./fn.js";
import type { Either } from "./either.js";

/**
 * A type that represents either accumulating failure
 * ({@linkcode Validation.Err}) or success ({@linkcode Validation.Ok}).
 */
export type Validation<E, T> = Validation.Err<E> | Validation.Ok<T>;

/**
 * The companion namespace for the {@link Validation:type | `Validation<E, T>`}
 * type.
 *
 * @remarks
 *
 * This namespace provides:
 *
 * -   Functions for constructing and collecting into `Validation`
 * -   A base class with the fluent API for `Validation`
 * -   Variant classes
 * -   Utility types
 */
export namespace Validation {
	/** Construct a failed `Validation`. */
	export function err<E, T = never>(val: E): Validation<E, T> {
		return new Err(val);
	}

	/** Construct a successful `Validation`. */
	export function ok<T, E = never>(val: T): Validation<E, T> {
		return new Ok(val);
	}

	/** Construct a successful `Validation` with a `void` value. */
	export function unit<E = never>(): Validation<E, void> {
		return ok(undefined);
	}

	/** Construct a `Validation` from an `Either`. */
	export function fromEither<A, B>(either: Either<A, B>): Validation<A, B> {
		return either.match(err, ok);
	}

	/**
	 * Map the elements in an iterable to `Validation` and collect the successes
	 * into a `Builder`.
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
	 * Map the elements in an iterable to `Validation` and collect the successes
	 * in an array.
	 */
	export function traverse<T, E extends Semigroup<E>, T1>(
		elems: Iterable<T>,
		f: (elem: T, idx: number) => Validation<E, T1>,
	): Validation<E, T1[]> {
		return traverseInto(elems, f, new ArrayPushBuilder());
	}

	/**
	 * Evaluate the `Validation` in an iterable and collect the successes into a
	 * `Builder`.
	 *
	 * @remarks
	 *
	 * If any `Validation` fails, the state of the provided `Builder` is
	 * undefined.
	 */
	export function allInto<E extends Semigroup<E>, T, TFinish>(
		vdns: Iterable<Validation<E, T>>,
		builder: Builder<T, TFinish>,
	): Validation<E, TFinish> {
		return traverseInto(vdns, id, builder);
	}

	/**
	 * Evaluate the `Validation` in an array or a tuple literal and collect the
	 * successes in an equivalent structure.
	 *
	 * @remarks
	 *
	 * This function turns an array or a tuple literal of `Validation` "inside
	 * out". For example:
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
	 * Evaluate the `Validation` in an iterable and collect the successes in an
	 * array.
	 *
	 * @remarks
	 *
	 * This function turns an iterable of `Validation` "inside out". For
	 * example, `Iterable<Validation<E, T>>` becomes `Validation<E, T[]>`.
	 */
	export function all<E extends Semigroup<E>, T>(
		vdns: Iterable<Validation<E, T>>,
	): Validation<E, T[]>;

	export function all<E extends Semigroup<E>, T>(
		vdns: Iterable<Validation<E, T>>,
	): Validation<E, T[]> {
		return traverse(vdns, id);
	}

	/**
	 * Evaluate the `Validation` in a string-keyed record or object literal and
	 * collect the successes in an equivalent structure.
	 *
	 * @remarks
	 *
	 * This function turns a string-keyed record or object literal of
	 * `Validation` inside out". For example:
	 *
	 * -   `Record<string, Validation<E, T>>` becomes `Validation<E,
	 *     Record<string, T>>`
	 * -   `{ x: Validation<E, T1>, y: Validation<E, T2> }` becomes
	 *     `Validation<E, { x: T1, y: T2 }>`
	 */
	export function allProps<
		TVdns extends Record<string, Validation<Semigroup<any>, any>>,
	>(
		props: TVdns,
	): Validation<
		ErrT<TVdns[keyof TVdns]>,
		{ -readonly [K in keyof TVdns]: OkT<TVdns[K]> }
	>;

	export function allProps<E extends Semigroup<E>, T>(
		props: Record<string, Validation<E, T>>,
	): Validation<E, Record<string, T>> {
		return traverseInto(
			Object.entries(props),
			([key, elem]) => elem.map((val) => [key, val] as const),
			new ObjectAssignBuilder(),
		);
	}

	/**
	 * Apply an action that returns `Validation` to the elements in an iterable
	 * and ignore the successes.
	 */
	export function forEach<T, E extends Semigroup<E>>(
		elems: Iterable<T>,
		f: (elem: T, idx: number) => Validation<E, any>,
	): Validation<E, void> {
		return traverseInto(elems, f, new NoOpBuilder());
	}

	/**
	 * Adapt a synchronous function to be applied in the context of
	 * `Validation`.
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

	/** An enumeration that discriminates `Validation`. */
	export enum Kind {
		ERR,
		OK,
	}

	/** The fluent syntax for `Validation`. */
	export abstract class Syntax {
		/** The property that discriminates `Validation`. */
		abstract readonly kind: Kind;

		/**
		 * Compare this and that `Validation` to determine their equality.
		 *
		 * @remarks
		 *
		 * Two `Validation` are equal if they are the same variant and their
		 * failures or successes are equal.
		 */
		[Eq.eq]<E extends Eq<E>, T extends Eq<T>>(
			this: Validation<E, T>,
			that: Validation<E, T>,
		): boolean {
			return this.isErr()
				? that.isErr() && eq(this.val, that.val)
				: that.isOk() && eq(this.val, that.val);
		}

		/**
		 * Compare this and that `Validation` to determine their ordering.
		 *
		 * @remarks
		 *
		 * When ordered, `Err` always compares as less than `Ok`. If the
		 * variants are the same, their failures or successes are compared to
		 * determine the ordering.
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
		 * If this and that `Validation` both succeed, combine their successes.
		 */
		[Semigroup.cmb]<E extends Semigroup<E>, T extends Semigroup<T>>(
			this: Validation<E, T>,
			that: Validation<E, T>,
		): Validation<E, T> {
			return this.zipWith(that, cmb);
		}

		/** Test whether this `Validation` has failed. */
		isErr<E>(this: Validation<E, any>): this is Err<E> {
			return this.kind === Kind.ERR;
		}

		/** Test whether this `Validation` has succeeded. */
		isOk<T>(this: Validation<any, T>): this is Ok<T> {
			return this.kind === Kind.OK;
		}

		/**
		 * Apply one of two functions to extract the failure or success out of
		 * this `Validation`, depending on the variant.
		 */
		match<E, T, T1, T2>(
			this: Validation<E, T>,
			ifErr: (val: E) => T1,
			ifOk: (val: T) => T2,
		): T1 | T2 {
			return this.isErr() ? ifErr(this.val) : ifOk(this.val);
		}

		/**
		 * If this `Validation` fails, extract its value; otherwise, apply a
		 * function to its value.
		 */
		unwrapErrOrElse<E, T, T1>(
			this: Validation<E, T>,
			ifOk: (val: T) => T1,
		): E | T1 {
			return this.match(id, ifOk);
		}

		/**
		 * If this `Validation` succeeds, extract its value; otherwise, apply a
		 * function to its value.
		 */
		unwrapOkOrElse<E, T, T1>(
			this: Validation<E, T>,
			ifErr: (val: E) => T1,
		): T | T1 {
			return this.match(ifErr, id);
		}

		/**
		 * If this `Validation` fails, apply a function to its failure to return
		 * another `Validation`.
		 *
		 * @remarks
		 *
		 * If both `Validation` fail, combine their failures.
		 */
		orElse<E extends Semigroup<E>, T, T1>(
			this: Validation<E, T>,
			f: (val: E) => Validation<E, T1>,
		): Validation<E, T | T1> {
			if (this.isErr()) {
				const that = f(this.val);
				return that.isErr() ? err(cmb(this.val, that.val)) : that;
			}
			return this;
		}

		/**
		 * If this `Validation` fails, evaluate a fallback `Validation`.
		 *
		 * @remarks
		 *
		 * If both `Validation` fail, combine their failures.
		 */
		or<E extends Semigroup<E>, T, T1>(
			this: Validation<E, T>,
			that: Validation<E, T1>,
		): Validation<E, T | T1> {
			return this.orElse(() => that);
		}

		/**
		 * If this `Validation` succeeds, apply a function to its success to
		 * return another `Validation`.
		 */
		andThen<E, T, E1, T1>(
			this: Validation<E, T>,
			f: (val: T) => Validation<E1, T1>,
		): Validation<E | E1, T1> {
			return this.isErr() ? this : f(this.val);
		}

		/** Remove one level of nesting from this `Validation`. */
		flatten<E, E1, T>(
			this: Validation<E, Validation<E1, T>>,
		): Validation<E | E1, T> {
			return this.andThen(id);
		}

		/**
		 * If this `Validation` succeeds, ignore the success and return that
		 * `Validation`.
		 */
		and<E extends Semigroup<E>, T1>(
			this: Validation<E, any>,
			that: Validation<E, T1>,
		): Validation<E, T1> {
			return this.zipWith(that, (_, rhs) => rhs);
		}

		/**
		 * If this and that `Validation` succeed, apply a function to combine
		 * their successes.
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

		/** If this `Validation` fails, apply a function to map its failure. */
		mapErr<E, T, E1>(
			this: Validation<E, T>,
			f: (val: E) => E1,
		): Validation<E1, T> {
			return this.isErr() ? err(f(this.val)) : this;
		}

		/**
		 * If this `Validation` succeeds, apply a function to map its success.
		 */
		map<E, T, T1>(
			this: Validation<E, T>,
			f: (val: T) => T1,
		): Validation<E, T1> {
			return this.isErr() ? this : ok(f(this.val));
		}
	}

	/** A failed `Validation`. */
	export class Err<out E> extends Syntax {
		readonly kind = Kind.ERR;

		/** The failure of this `Validation`. */
		readonly val: E;

		constructor(val: E) {
			super();
			this.val = val;
		}
	}

	/** A successful `Validation`. */
	export class Ok<out T> extends Syntax {
		readonly kind = Kind.OK;

		/** The success of this `Validation`. */
		readonly val: T;

		constructor(val: T) {
			super();
			this.val = val;
		}
	}

	/** Extract the failure type `E` from the type `Validation<E, T>`. */
	export type ErrT<TVdn extends Validation<any, any>> = [TVdn] extends [
		Validation<infer E, any>,
	]
		? E
		: never;

	/** Extract the success type `T` from the type `Validation<E, T>`. */
	export type OkT<TVdn extends Validation<any, any>> = [TVdn] extends [
		Validation<any, infer T>,
	]
		? T
		: never;
}

/** A promise-like object that fulfills with `Validation`. */
export type AsyncValidationLike<E, T> = PromiseLike<Validation<E, T>>;

/** A promise that fulfills with `Validation`. */
export type AsyncValidation<E, T> = Promise<Validation<E, T>>;

/**
 * The companion namespace for the
 * {@link AsyncValidation:type | `AsyncValidation<E, T>`} type.
 *
 * @remarks
 *
 * This namespace provides functions for collecting into `AsyncValidation`.
 */
export namespace AsyncValidation {
	/**
	 * Map the elements in an async iterable to `Validation` or
	 * `AsyncValidationLike` and collect the successes into a `Builder`.
	 *
	 * @remarks
	 *
	 * If any `Validation` fails, the state of the provided `Builder` is
	 * undefined.
	 */
	export async function traverseInto<T, E extends Semigroup<E>, T1, TFinish>(
		elems: AsyncIterable<T>,
		f: (
			elem: T,
			idx: number,
		) => Validation<E, T1> | AsyncValidationLike<E, T1>,
		builder: Builder<T1, TFinish>,
	): AsyncValidation<E, TFinish> {
		let acc = Validation.ok<Builder<T1, TFinish>, E>(builder);
		let idx = 0;
		for await (const elem of elems) {
			const that = await f(elem, idx);
			acc = acc.zipWith(that, (bldr, val) => {
				bldr.add(val);
				return bldr;
			});
			idx++;
		}
		return acc.map((bldr) => bldr.finish());
	}

	/**
	 * Map the elements in an async iterable to `Validation` or
	 * `AsyncValidationLike` and collect the successes in an array.
	 */
	export function traverse<T, E extends Semigroup<E>, T1>(
		elems: AsyncIterable<T>,
		f: (
			elem: T,
			idx: number,
		) => Validation<E, T1> | AsyncValidationLike<E, T1>,
	): AsyncValidation<E, T1[]> {
		return traverseInto(elems, f, new ArrayPushBuilder());
	}

	/**
	 * Evaluate the `Validation` in an async iterable and collect the successes
	 * into a `Builder`.
	 *
	 * @remarks
	 *
	 * If any `Validation` fails, the state of the provided `Builder` is
	 * undefined.
	 */
	export function allInto<E extends Semigroup<E>, T, TFinish>(
		elems: AsyncIterable<Validation<E, T>>,
		builder: Builder<T, TFinish>,
	): AsyncValidation<E, TFinish> {
		return traverseInto(elems, id, builder);
	}

	/**
	 * Evaluate the `Validation` in an async iterable and collect the successes
	 * in an array.
	 *
	 * @remarks
	 *
	 * This function turns an iterable of `Validation` "inside out". For
	 * example, `AsyncIterable<Validation<E, T>>` becomes `AsyncValidation<E,
	 * T[]>`.
	 */
	export function all<E extends Semigroup<E>, T>(
		elems: AsyncIterable<Validation<E, T>>,
	): AsyncValidation<E, T[]> {
		return traverse(elems, id);
	}

	/**
	 * Apply an action that returns `Validation` or `AsyncValidationLike` to the
	 * elements in an async iterable and ignore the successes.
	 */
	export function forEach<T, E extends Semigroup<E>>(
		elems: AsyncIterable<T>,
		f: (
			elem: T,
			idx: number,
		) => Validation<E, any> | AsyncValidationLike<E, any>,
	): AsyncValidation<E, void> {
		return traverseInto(elems, f, new NoOpBuilder());
	}

	/**
	 * Concurrently map the elements in an iterable to `Validation` or
	 * `AsyncValidationLike` and collect the successes into a `Builder`.
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
		) => Validation<E, T1> | AsyncValidationLike<E, T1>,
		builder: Builder<T1, TFinish>,
	): AsyncValidation<E, TFinish> {
		return new Promise((resolve, reject) => {
			let remaining = 0;
			let errs: E | undefined;

			for (const elem of elems) {
				const idx = remaining;
				remaining++;
				Promise.resolve(f(elem, idx)).then((vdn) => {
					if (vdn.isErr()) {
						errs =
							errs === undefined ? vdn.val : cmb(errs, vdn.val);
					} else if (errs === undefined) {
						builder.add(vdn.val);
					}

					remaining--;
					if (remaining === 0) {
						resolve(
							errs === undefined
								? Validation.ok(builder.finish())
								: Validation.err(errs),
						);
						return;
					}
				}, reject);
			}
		});
	}

	/**
	 * Concurrently map the elements in an iterable to `Validation` or
	 * `AsyncValidationLike` and collect the successes in an array.
	 */
	export function traversePar<T, E extends Semigroup<E>, T1>(
		elems: Iterable<T>,
		f: (
			elem: T,
			idx: number,
		) => Validation<E, T1> | AsyncValidationLike<E, T1>,
	): AsyncValidation<E, T1[]> {
		return traverseIntoPar(
			elems,
			async (elem, idx) =>
				(await f(elem, idx)).map((val): [number, T1] => [idx, val]),
			new ArrayAssignBuilder(),
		);
	}

	/**
	 * Concurrently evaluate `Validation` or `AsyncValidationLike` in an
	 * iterable and collect the successes into a `Builder`.
	 *
	 * @remarks
	 *
	 * If any `Validation` fails, the state of the provided `Builder` is
	 * undefined.
	 */
	export function allIntoPar<E extends Semigroup<E>, T, TFinish>(
		elems: Iterable<Validation<E, T> | AsyncValidationLike<E, T>>,
		builder: Builder<T, TFinish>,
	): AsyncValidation<E, TFinish> {
		return traverseIntoPar(elems, id, builder);
	}

	/**
	 * Concurrently evaluate the `Validation` or `AsyncValidationLike` in an
	 * array or a tuple literal and collect the successes in an equivalent
	 * structure.
	 *
	 * @remarks
	 *
	 * This function turns an array or a tuple literal of `Validation` or
	 * `AsyncValidationLike` "inside out". For example:
	 *
	 * -   `AsyncValidation<E, T>[]` becomes `AsyncValidation<E, T[]>`
	 * -   `[AsyncValidation<E, T1>, AsyncValidation<E, T2>]` becomes
	 *     `AsyncValidation<E, [T1, T2]>`
	 */
	export function allPar<
		TElems extends
			| readonly (
					| Validation<Semigroup<any>, any>
					| AsyncValidationLike<Semigroup<any>, any>
			  )[]
			| [],
	>(
		elems: TElems,
	): AsyncValidation<
		Validation.ErrT<{ [K in keyof TElems]: Awaited<TElems[K]> }[number]>,
		{ [K in keyof TElems]: Validation.OkT<Awaited<TElems[K]>> }
	>;

	/**
	 * Concurrently evaluate the `Validation` or `AsyncValidationLike` in an
	 * iterable and collect the successes in an array.
	 *
	 * @remarks
	 *
	 * This function turns an iterable of `Validation` or `AsyncValidationLike`
	 * "inside out". For example, `Iterable<AsyncValidation<E, T>>` becomes
	 * `AsyncValidation<E, T[]>`.
	 */
	export function allPar<E extends Semigroup<E>, T>(
		elems: Iterable<Validation<E, T> | AsyncValidationLike<E, T>>,
	): AsyncValidation<E, T[]>;

	export function allPar<E extends Semigroup<E>, T>(
		elems: Iterable<Validation<E, T> | AsyncValidationLike<E, T>>,
	): AsyncValidation<E, T[]> {
		return traversePar(elems, id);
	}

	/**
	 * Concurrently evaluate the `Validation` or `AsyncValidationLike` in a
	 * string-keyed record or object literal and collect the successes in an
	 * equivalent structure.
	 *
	 * @remarks
	 *
	 * This function turns a string-keyed record or object literal of
	 * `Validation` or `AsyncValidationLike` "inside out". For example:
	 *
	 * -   `Record<string, AsyncValidation<E, T>>` becomes `AsyncValidation<E,
	 *     Record<string, T>>`
	 * -   `{ x: AsyncValidation<E, T1>, y: AsyncValidation<E, T2> }` becomes
	 *     `AsyncValidation<E, { x: T1, y: T2 }>`
	 */
	export function allPropsPar<
		TProps extends Record<
			string,
			| Validation<Semigroup<any>, any>
			| AsyncValidationLike<Semigroup<any>, any>
		>,
	>(
		props: TProps,
	): AsyncValidation<
		Validation.ErrT<
			{ [K in keyof TProps]: Awaited<TProps[K]> }[keyof TProps]
		>,
		{ [K in keyof TProps]: Validation.OkT<Awaited<TProps[K]>> }
	>;

	export function allPropsPar<E extends Semigroup<E>, T>(
		props: Record<string, Validation<E, T> | AsyncValidationLike<E, T>>,
	): AsyncValidation<E, Record<string, T>> {
		return traverseIntoPar(
			Object.entries(props),
			async ([key, elem]) =>
				(await elem).map((val) => [key, val] as const),
			new ObjectAssignBuilder(),
		);
	}

	/**
	 * Concurrently apply an action that returns `Validation` or\
	 * `AsyncValidationLike` to the elements in an iterable and ignore the
	 * successes.
	 */
	export function forEachPar<T, E extends Semigroup<E>>(
		elems: Iterable<T>,
		f: (
			elem: T,
			idx: number,
		) => Validation<E, any> | AsyncValidationLike<E, any>,
	): AsyncValidation<E, void> {
		return traverseIntoPar(elems, f, new NoOpBuilder());
	}

	/**
	 * Adapt a synchronous or an asynchronous function to be applied in the
	 * context of `Validation` or `AsyncValidationLike`.
	 */
	export function liftPar<TArgs extends unknown[], T>(
		f: (...args: TArgs) => T | PromiseLike<T>,
	): <E extends Semigroup<E>>(
		...elems: {
			[K in keyof TArgs]:
				| Validation<E, TArgs[K]>
				| AsyncValidationLike<E, TArgs[K]>;
		}
	) => AsyncValidation<E, T> {
		return async (...elems) => {
			const result = (await allPar(elems)).map((args) =>
				f(...(args as TArgs)),
			);
			return result.isErr()
				? result
				: (Validation.ok(await result.val) as Validation<any, any>);
		};
	}
}
