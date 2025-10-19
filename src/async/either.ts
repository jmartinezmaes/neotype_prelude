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
 * Functionality for using `Either` with promises.
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
import { Either } from "../either.js";
import { id } from "../fn.js";

/** A promise-like object that fulfills with `Either`. */
export type AsyncEitherLike<A, B> = PromiseLike<Either<A, B>>;

/** A promise that fulfills with `Either`. */
export type AsyncEither<A, B> = Promise<Either<A, B>>;

/**
 * The companion namespace for the
 * {@link AsyncEither:type | `AsyncEither<A, B>`} type.
 *
 * @remarks
 *
 * This namespace provides functions for chaining and collecting into
 * `AsyncEither`.
 */
export namespace AsyncEither {
	/** Evaluate an `AsyncEither.Go` async generator to return an `AsyncEither`. */
	export async function go<E, TReturn>(
		gen: Go<E, TReturn>,
	): AsyncEither<E, TReturn> {
		let next = await gen.next();
		let err: any;
		let halted = false;
		while (!next.done) {
			const either = next.value;
			if (either.isLeft()) {
				halted = true;
				err = either.val;
				next = await gen.return(undefined as never);
			} else {
				next = await gen.next(either.val);
			}
		}
		return halted ? Either.left(err) : Either.right(next.value);
	}

	/**
	 * Evaluate an async generator function that returns `AsyncEither.Go` to
	 * return an `AsyncEither`.
	 */
	export function fromGoFn<E, TReturn>(
		f: () => Go<E, TReturn>,
	): AsyncEither<E, TReturn> {
		return go(f());
	}

	/**
	 * Adapt an async generator function that returns `AsyncEither.Go` into an
	 * async function that returns `AsyncEither`.
	 */
	export function wrapGoFn<TArgs extends unknown[], E, TReturn>(
		f: (...args: TArgs) => Go<E, TReturn>,
	): (...args: TArgs) => AsyncEither<E, TReturn> {
		return (...args) => go(f(...args));
	}

	/**
	 * Accumulate the elements in an async iterable using a reducer function
	 * that returns `Either` or `AsyncEitherLike`.
	 */
	export function reduce<T, TAcc, E>(
		elems: AsyncIterable<T>,
		f: (
			acc: TAcc,
			elem: T,
			idx: number,
		) => Either<E, TAcc> | AsyncEitherLike<E, TAcc>,
		initial: TAcc,
	): AsyncEither<E, TAcc> {
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
	 * Map the elements in an async iterable to `Either` or `AsyncEitherLike`
	 * and collect the `Right` values into a `Builder`.
	 *
	 * @remarks
	 *
	 * If any `Either` is `Left`, the state of the provided `Builder` is
	 * undefined.
	 */
	export function traverseInto<T, E, T1, TFinish>(
		elems: AsyncIterable<T>,
		f: (elem: T, idx: number) => Either<E, T1> | AsyncEitherLike<E, T1>,
		builder: Builder<T1, TFinish>,
	): AsyncEither<E, TFinish> {
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
	 * Map the elements in an async iterable to `Either` or `AsyncEitherLike`
	 * and collect the `Right` values in an array.
	 */
	export function traverse<T, E, T1>(
		elems: AsyncIterable<T>,
		f: (elem: T, idx: number) => Either<E, T1> | AsyncEitherLike<E, T1>,
	): AsyncEither<E, T1[]> {
		return traverseInto(elems, f, new ArrayPushBuilder());
	}

	/**
	 * Evaluate the `Either` in an async iterable and collect the `Right` values
	 * into a `Builder`.
	 *
	 * @remarks
	 *
	 * If any `Either` is `Left`, the state of the provided `Builder` is
	 * undefined.
	 */
	export function allInto<E, T, TFinish>(
		elems: AsyncIterable<Either<E, T>>,
		builder: Builder<T, TFinish>,
	): AsyncEither<E, TFinish> {
		return traverseInto(elems, id, builder);
	}

	/**
	 * Evaluate the `Either` in an async iterable and collect the `Right` values
	 * in an array.
	 *
	 * @remarks
	 *
	 * This function turns an async iterable of `Either` "inside out". For
	 * example, `AsyncIterable<Either<E, T>>` becomes `AsyncEither<E, T[]>`.
	 */
	export function all<E, T>(
		elems: AsyncIterable<Either<E, T>>,
	): AsyncEither<E, T[]> {
		return traverse(elems, id);
	}

	/**
	 * Apply an action that returns `Either` or `AsyncEitherLike` to the
	 * elements in an async iterable and ignore the `Right` values.
	 */
	export function forEach<T, E>(
		elems: AsyncIterable<T>,
		f: (elem: T, idx: number) => Either<E, any> | AsyncEitherLike<E, any>,
	): AsyncEither<E, void> {
		return traverseInto(elems, f, new NoOpBuilder());
	}

	/**
	 * Concurrently map the elements in an iterable to `Either` or
	 * `AsyncEitherLike` and collect the `Right` values into a `Builder`.
	 *
	 * @remarks
	 *
	 * If any `Either` is `Left`, the state of the provided `Builder` is
	 * undefined.
	 */
	export function traverseIntoPar<T, E, T1, TFinish>(
		elems: Iterable<T>,
		f: (elem: T, idx: number) => Either<E, T1> | AsyncEitherLike<E, T1>,
		builder: Builder<T1, TFinish>,
	): AsyncEither<E, TFinish> {
		return new Promise((resolve, reject) => {
			let remaining = 0;
			for (const elem of elems) {
				Promise.resolve(f(elem, remaining)).then((either) => {
					if (either.isLeft()) {
						resolve(either);
						return;
					}
					builder.add(either.val);
					remaining--;
					if (remaining === 0) {
						resolve(Either.right(builder.finish()));
						return;
					}
				}, reject);
				remaining++;
			}
		});
	}

	/**
	 * Concurrently map the elements in an iterable to `Either` or
	 * `AsyncEitherLike` and collect the `Right` values in an array.
	 */
	export function traversePar<T, E, T1>(
		elems: Iterable<T>,
		f: (elem: T, idx: number) => Either<E, T1> | AsyncEitherLike<E, T1>,
	): AsyncEither<E, T1[]> {
		return traverseIntoPar(
			elems,
			async (elem, idx) =>
				(await f(elem, idx)).map((val) => [idx, val] as const),
			new ArrayAssignBuilder(),
		);
	}

	/**
	 * Concurrently evaluate the `Either` or `AsyncEitherLike` in an iterable
	 * iterable and collect the `Right` values into a `Builder`.
	 *
	 * @remarks
	 *
	 * If any `Either` is `Left`, the state of the provided `Builder` is
	 * undefined.
	 */
	export function allIntoPar<E, T, TFinish>(
		elems: Iterable<Either<E, T> | AsyncEitherLike<E, T>>,
		builder: Builder<T, TFinish>,
	): AsyncEither<E, TFinish> {
		return traverseIntoPar(elems, id, builder);
	}

	/**
	 * Concurrently evaluate the `Either` or `AsyncEitherLike` in an array or a
	 * tuple literal and collect the `Right` values in an equivalent structure.
	 *
	 * @remarks
	 *
	 * This function turns an array or a tuple literal of `AsyncEitherLike`
	 * "inside out". For example:
	 *
	 * -   `AsyncEither<E, T>[]` becomes `AsyncEither<E, T[]>`
	 * -   `[AsyncEither<E, T1>, AsyncEither<E, T2>]` becomes `AsyncEither<E,
	 *     [T1, T2]>`
	 */
	export function allPar<
		TElems extends
			| readonly (Either<any, any> | AsyncEitherLike<any, any>)[]
			| [],
	>(
		elems: TElems,
	): AsyncEither<
		Either.LeftT<{ [K in keyof TElems]: Awaited<TElems[K]> }[number]>,
		{ [K in keyof TElems]: Either.RightT<Awaited<TElems[K]>> }
	>;

	/**
	 * Concurrently evaluate the `Either` or `AsyncEitherLike` in an iterable
	 * and collect the `Right` values in an array.
	 *
	 * @remarks
	 *
	 * This function turns an iterable of `AsyncEitherLike` "inside out". For
	 * example, `Iterable<AsyncEither<E, T>>` becomes `AsyncEither<E, T[]>`.
	 */
	export function allPar<E, T>(
		elems: Iterable<Either<E, T> | AsyncEitherLike<E, T>>,
	): AsyncEither<E, T[]>;

	export function allPar<E, T>(
		elems: Iterable<Either<E, T> | AsyncEitherLike<E, T>>,
	): AsyncEither<E, T[]> {
		return traversePar(elems, id);
	}

	/**
	 * Concurrently evaluate `Either` or `AsyncEitherLike` in a string-keyed
	 * record or object literal and collect the `Right` values in an equivalent
	 * structure.
	 *
	 * @remarks
	 *
	 * This function turns a string-keyed record or object literal of
	 * `AsyncEitherLike` "inside out". For example:
	 *
	 * -   `Record<string, AsyncEither<E, T>>` becomes `AsyncEither<E,
	 *     Record<string, T>>`
	 * -   `{ x: AsyncEither<E, T1>, y: AsyncEither<E, T2> }` becomes
	 *     `AsyncEither<E, { x: T1, y: T2 }>`
	 */
	export function allPropsPar<
		TProps extends Record<
			string,
			Either<any, any> | AsyncEitherLike<any, any>
		>,
	>(
		props: TProps,
	): AsyncEither<
		Either.LeftT<{ [K in keyof TProps]: Awaited<TProps[K]> }[keyof TProps]>,
		{ [K in keyof TProps]: Either.RightT<Awaited<TProps[K]>> }
	>;

	export function allPropsPar<E, T>(
		props: Record<string, Either<E, T> | AsyncEitherLike<E, T>>,
	): AsyncEither<E, Record<string, T>> {
		return traverseIntoPar(
			Object.entries(props),
			async ([key, elem]) =>
				(await elem).map((val) => [key, val] as const),
			new ObjectAssignBuilder(),
		);
	}

	/**
	 * Concurrently apply an action that returns `Either` or `AsyncEitherLike`
	 * to the elements in an iterable and ignore the `Right` values.
	 */
	export function forEachPar<T, E>(
		elems: Iterable<T>,
		f: (elem: T, idx: number) => Either<E, any> | AsyncEitherLike<E, any>,
	): AsyncEither<E, void> {
		return traverseIntoPar(elems, f, new NoOpBuilder());
	}

	/**
	 * Adapt a synchronous or an asynchronous function to be applied in the
	 * context of `Either` or `AsyncEitherLike`.
	 */
	export function liftPar<TArgs extends unknown[], T>(
		f: (...args: TArgs) => T | PromiseLike<T>,
	): <E>(
		...elems: {
			[K in keyof TArgs]:
				| Either<E, TArgs[K]>
				| AsyncEitherLike<E, TArgs[K]>;
		}
	) => AsyncEither<E, T> {
		return wrapGoFn(async function* (...elems): Go<any, T> {
			return f(...((yield* await allPar(elems)) as TArgs)) as Awaited<T>;
		});
	}

	/** An async generator that yields `Either` and returns a value. */
	export type Go<E, TReturn> = AsyncGenerator<Either<E, unknown>, TReturn>;
}
