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
 * Functionality for using `Annotation` with promises.
 *
 * @module
 */

import { Annotation } from "../annotation.js";
import {
	ArrayAssignBuilder,
	ArrayPushBuilder,
	NoOpBuilder,
	ObjectAssignBuilder,
	type Builder,
} from "../builder.js";
import { type Semigroup, cmb } from "../cmb.js";
import { id } from "../fn.js";

/** A promise-like object that fulfills with `Annotation`. */
export type AsyncAnnotationLike<T, W> = PromiseLike<Annotation<T, W>>;

/** A promise that fulfills with `Annotation`. */
export type AsyncAnnotation<T, W> = Promise<Annotation<T, W>>;

/**
 * The companion namespace for the
 * {@link AsyncAnnotation:type | `AsyncAnnotation<T, W>`} type.
 *
 * @remarks
 *
 * This namespace provides functions for chaining and collecting into
 * `AsyncAnnotation`.
 */
export namespace AsyncAnnotation {
	/**
	 * Evaluate an `AsyncAnnotation.Go` async generator to return an
	 * `AsyncAnnotation`.
	 */
	export async function go<TReturn, W extends Semigroup<W>>(
		gen: Go<TReturn, W>,
	): AsyncAnnotation<TReturn, W> {
		let next = await gen.next();
		let logs: W | undefined;
		while (!next.done) {
			const anno = next.value;
			if (anno.isNote()) {
				logs = logs === undefined ? anno.log : cmb(logs, anno.log);
			}
			next = await gen.next(anno.val);
		}
		return logs === undefined
			? Annotation.value(next.value)
			: Annotation.note(next.value, logs);
	}

	/**
	 * Evaluate an async generator function that returns `AsyncAnnotation.Go`
	 * to return an `AsyncAnnotation`.
	 */
	export function fromGoFn<TReturn, W extends Semigroup<W>>(
		f: () => Go<TReturn, W>,
	): AsyncAnnotation<TReturn, W> {
		return go(f());
	}

	/**
	 * Adapt an async generator function that returns `AsyncAnnotation.Go` into
	 * an async function that returns `AsyncAnnotation`.
	 */
	export function wrapGoFn<
		TArgs extends unknown[],
		TReturn,
		W extends Semigroup<W>,
	>(
		f: (...args: TArgs) => Go<TReturn, W>,
	): (...args: TArgs) => AsyncAnnotation<TReturn, W> {
		return (...args) => go(f(...args));
	}

	/**
	 * Accumulate the elements in an async iterable using a reducer function
	 * that returns `Annotation` or `AsyncAnnotationLike`.
	 */
	export function reduce<T, TAcc, W extends Semigroup<W>>(
		elems: AsyncIterable<T>,
		f: (
			acc: TAcc,
			elem: T,
			idx: number,
		) => Annotation<TAcc, W> | AsyncAnnotationLike<TAcc, W>,
		initial: TAcc,
	): AsyncAnnotation<TAcc, W> {
		return fromGoFn(async function* () {
			let acc = initial;
			let idx = 0;
			for await (const elem of elems) {
				acc = yield* await f(acc, elem, idx);
				idx++;
			}
			return acc;
		});
	}

	/**
	 * Map the elements in an async iterable to `Annotation` or
	 * `AsyncAnnotationLike` and collect the values into a `Builder`.
	 */
	export function traverseInto<T, T1, W extends Semigroup<W>, TFinish>(
		elems: AsyncIterable<T>,
		f: (
			elem: T,
			idx: number,
		) => Annotation<T1, W> | AsyncAnnotationLike<T1, W>,
		builder: Builder<T1, TFinish>,
	): AsyncAnnotation<TFinish, W> {
		return fromGoFn(async function* () {
			let idx = 0;
			for await (const elem of elems) {
				builder.add(yield* await f(elem, idx));
				idx++;
			}
			return builder.finish();
		});
	}

	/**
	 * Map the elements in an async iterable to `Annotation` or
	 * `AsyncAnnotationLike` and collect the values in an array.
	 */
	export function traverse<T, T1, W extends Semigroup<W>>(
		elems: AsyncIterable<T>,
		f: (
			elem: T,
			idx: number,
		) => Annotation<T1, W> | AsyncAnnotationLike<T1, W>,
	): AsyncAnnotation<T1[], W> {
		return traverseInto(elems, f, new ArrayPushBuilder());
	}

	/**
	 * Evaluate the `Annotation` in an async iterable and collect the values
	 * into a `Builder`.
	 */
	export function allInto<T, W extends Semigroup<W>, TFinish>(
		elems: AsyncIterable<Annotation<T, W>>,
		builder: Builder<T, TFinish>,
	): AsyncAnnotation<TFinish, W> {
		return traverseInto(elems, id, builder);
	}

	/**
	 * Evaluate the `Annotation` in an async iterable and collect the values in
	 * an array.
	 */
	export function all<T, W extends Semigroup<W>>(
		elems: AsyncIterable<Annotation<T, W>>,
	): AsyncAnnotation<T[], W> {
		return traverse(elems, id);
	}

	/**
	 * Apply an action that returns `Annotation` or `AsyncAnnotationLike` to the
	 * elements in an async iterable and ignore the values.
	 */
	export function forEach<T, W extends Semigroup<W>>(
		elems: AsyncIterable<T>,
		f: (
			elem: T,
			idx: number,
		) => Annotation<any, W> | AsyncAnnotationLike<any, W>,
	): AsyncAnnotation<void, W> {
		return traverseInto(elems, f, new NoOpBuilder());
	}

	/**
	 * Concurrently map the elements in an iterable to `Annotation` or
	 * `AsyncAnnotationLike` anc collect the values into a `Builder`.
	 */
	export function traverseIntoPar<T, T1, W extends Semigroup<W>, TFinish>(
		elems: Iterable<T>,
		f: (
			elem: T,
			idx: number,
		) => Annotation<T1, W> | AsyncAnnotationLike<T1, W>,
		builder: Builder<T1, TFinish>,
	): AsyncAnnotation<TFinish, W> {
		return new Promise((resolve, reject) => {
			let remaining = 0;
			let logs: W | undefined;

			for (const elem of elems) {
				Promise.resolve(f(elem, remaining)).then((anno) => {
					if (anno.isNote()) {
						logs =
							logs === undefined ? anno.log : cmb(logs, anno.log);
					}
					builder.add(anno.val);

					remaining--;
					if (remaining === 0) {
						resolve(
							logs === undefined
								? Annotation.value(builder.finish())
								: Annotation.note(builder.finish(), logs),
						);
						return;
					}
				}, reject);
				remaining++;
			}
		});
	}

	/**
	 * Concurrently map the elements in an iterable to `Annotation` or
	 * `AsyncAnnotationLike` and collect the values in an array.
	 */
	export function traversePar<T, T1, W extends Semigroup<W>>(
		elems: Iterable<T>,
		f: (
			elem: T,
			idx: number,
		) => Annotation<T1, W> | AsyncAnnotationLike<T1, W>,
	): AsyncAnnotation<T1[], W> {
		return traverseIntoPar(
			elems,
			async (elem, idx) =>
				(await f(elem, idx)).map((val) => [idx, val] as const),
			new ArrayAssignBuilder(),
		);
	}

	/**
	 * Concurrently evaluate the `Annotation` or `AsyncAnnotation` in an
	 * iterable and collect the values into a `Builder`.
	 */
	export function allIntoPar<T, W extends Semigroup<W>, TFinish>(
		elems: Iterable<Annotation<T, W> | AsyncAnnotationLike<T, W>>,
		builder: Builder<T, TFinish>,
	): AsyncAnnotation<TFinish, W> {
		return traverseIntoPar(elems, id, builder);
	}

	/**
	 * Concurrently evaluate the `Annotation` or `AsyncAnnotationLike` in an
	 * array or a tuple literal and collect the values in an equivalent
	 * structure.
	 *
	 * @remarks
	 *
	 * This function turns an array or a tuple literal of `Annotation` or
	 * `AsyncAnnotationLike` "inside out". For example:
	 *
	 * -   `AsyncAnnotation<T, W>[]` becomes `AsyncAnnotation<T[], W>`
	 * -   `[AsyncAnnotation<T1, W>, AsyncAnnotation<T2, W>]` becomes
	 *     `AsyncAnnotation<[T1, T2], W>`
	 */
	export function allPar<
		TElems extends
			| readonly (
					| Annotation<any, Semigroup<any>>
					| AsyncAnnotationLike<any, Semigroup<any>>
			  )[]
			| [],
	>(
		elems: TElems,
	): AsyncAnnotation<
		{ [K in keyof TElems]: Annotation.ValT<Awaited<TElems[K]>> },
		Annotation.LogT<{ [K in keyof TElems]: Awaited<TElems[K]> }[number]>
	>;

	/**
	 * Concurrently evaluate the `Annotation` or `AsyncAnnotationLike` in an
	 * iterable and collect the values in an array.
	 *
	 * @remarks
	 *
	 * This function turns an iterable of `Annotation` or `AsyncAnnotationLike`
	 * "inside out". For example, `Iterable<AsyncAnnotation<T, W>>` becomes
	 * `AsyncAnnotation<T[], W>`.
	 */
	export function allPar<T, W extends Semigroup<W>>(
		elems: Iterable<Annotation<T, W> | AsyncAnnotationLike<T, W>>,
	): AsyncAnnotation<T[], W>;

	export function allPar<T, W extends Semigroup<W>>(
		elems: Iterable<Annotation<T, W> | AsyncAnnotationLike<T, W>>,
	): AsyncAnnotation<T[], W> {
		return traversePar(elems, id);
	}

	/**
	 * Concurrently evaluate the `Annotation` or `AsyncAnnotationLike` in a
	 * string-keyed record or object literal and collect the values in an
	 * equivalent structure.
	 *
	 * @remarks
	 *
	 * This function turns a string-keyed record or object literal of
	 * `Annotation` or `AsyncAnnotationLike` "inside out". For example:
	 *
	 * -   `Record<string, AsyncAnnotation<T, W>>` becomes
	 *     `AsyncAnnotation<Record<string, T>, W>`
	 * -   `{ x: AsyncAnnotation<T1, W>, y: AsyncAnnotation<T2, W> }` becomes
	 *     `AsyncAnnotation<{ x: T1, y: T2 }, W>`
	 */
	export function allPropsPar<
		TProps extends Record<
			string,
			| Annotation<any, Semigroup<any>>
			| AsyncAnnotationLike<any, Semigroup<any>>
		>,
	>(
		props: TProps,
	): AsyncAnnotation<
		{ [K in keyof TProps]: Annotation.ValT<Awaited<TProps[K]>> },
		Annotation.LogT<
			{ [K in keyof TProps]: Awaited<TProps[K]> }[keyof TProps]
		>
	>;

	export function allPropsPar<T, W extends Semigroup<W>>(
		props: Record<string, Annotation<T, W> | AsyncAnnotationLike<T, W>>,
	): AsyncAnnotation<Record<string, T>, W> {
		return traverseIntoPar(
			Object.entries(props),
			async ([key, elem]) =>
				(await elem).map((val) => [key, val] as const),
			new ObjectAssignBuilder(),
		);
	}

	/**
	 * Concurrently apply an action that returns `Annotation` or
	 * `AsyncAnnotationLike` to the elements in an iterable and ignore the
	 * values.
	 */
	export function forEachPar<T, W extends Semigroup<W>>(
		elems: Iterable<T>,
		f: (
			elem: T,
			idx: number,
		) => Annotation<any, W> | AsyncAnnotationLike<any, W>,
	): AsyncAnnotation<void, W> {
		return traverseIntoPar(elems, f, new NoOpBuilder());
	}

	/**
	 * Adapt a synchronous or an asynchronous function to be applied in the
	 * context of `Annotation` or `AsyncAnnotationLike`.
	 */
	export function liftPar<TArgs extends unknown[], T>(
		f: (...args: TArgs) => T | PromiseLike<T>,
	): <W extends Semigroup<W>>(
		...elems: {
			[K in keyof TArgs]:
				| Annotation<TArgs[K], W>
				| AsyncAnnotationLike<TArgs[K], W>;
		}
	) => AsyncAnnotation<T, W> {
		return wrapGoFn(async function* (...elems): Go<T, any> {
			return f(...((yield* await allPar(elems)) as TArgs)) as Awaited<T>;
		});
	}

	/** An async generator that yields `Annotation` and returns a value. */
	export type Go<TReturn, W extends Semigroup<W>> = AsyncGenerator<
		Annotation<unknown, W>,
		TReturn
	>;
}
