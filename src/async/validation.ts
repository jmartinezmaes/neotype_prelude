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
 * Functionality for using `Validation` with promises.
 *
 * @remarks
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
 * import { AsyncValidation } from "@neotype/prelude/async/validation.js";
 * ```
 *
 * Or, the types and namespaces can be imported and aliased separately:
 *
 * ```ts
 * import {
 *     type AsyncValidation,
 *     AsyncValidation as AV
 * } from "@neotype/prelude/async/validation.js";
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
} from "../builder.js";
import { type Semigroup, cmb } from "../cmb.js";
import { id } from "../fn.js";
import { Validation } from "../validation.js";

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
				Promise.resolve(f(elem, remaining)).then((vdn) => {
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
				remaining++;
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
