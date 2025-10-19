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
 * Functionality for using `Maybe` with promises.
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
import { id } from "../fn.js";
import { Maybe } from "../maybe.js";

/** A promise-like object that fulfills with `Maybe`. */
export type AsyncMaybeLike<T> = PromiseLike<Maybe<T>>;

/** A promise that fulfills with `Maybe`. */
export type AsyncMaybe<T> = Promise<Maybe<T>>;

/**
 * The companion namespace for the {@link AsyncMaybe:type | `AsyncMaybe<T>`}
 * type.
 *
 * @remarks
 *
 * This namespace provides functions for chaining and collecting into
 * `AsyncMaybe`.
 */
export namespace AsyncMaybe {
	/** Evaluate an `AsyncMaybe.Go` async generator to return an `AsyncMaybe`. */
	export async function go<TReturn>(
		gen: Go<TReturn>,
	): Promise<Maybe<TReturn>> {
		let next = await gen.next();
		let halted = false;
		while (!next.done) {
			const maybe = next.value;
			if (maybe.isNothing()) {
				halted = true;
				next = await gen.return(undefined as never);
			} else {
				next = await gen.next(maybe.val);
			}
		}
		return halted ? Maybe.nothing : Maybe.just(next.value);
	}

	/**
	 * Evaluate an async generator function that returns `AsyncMaybe.Go` to
	 * return an `AsyncMaybe`.
	 */
	export function fromGoFn<TReturn>(
		f: () => Go<TReturn>,
	): AsyncMaybe<TReturn> {
		return go(f());
	}

	/**
	 * Adapt an async generator function that returns `AsyncMaybe.Go` into an
	 * async function that returns `AsyncMaybe`.
	 */
	export function wrapGoFn<TArgs extends unknown[], TReturn>(
		f: (...args: TArgs) => Go<TReturn>,
	): (...args: TArgs) => AsyncMaybe<TReturn> {
		return (...args) => go(f(...args));
	}

	/**
	 * Accumulate the elements in an async iterable using a reducer function
	 * that returns `Maybe` or `AsyncMaybeLike`.
	 */
	export function reduce<T, TAcc>(
		elems: AsyncIterable<T>,
		f: (
			acc: TAcc,
			elem: T,
			idx: number,
		) => Maybe<TAcc> | AsyncMaybeLike<TAcc>,
		initial: TAcc,
	): AsyncMaybe<TAcc> {
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
	 * Map the elements in an async iterable to `Maybe` or `AsyncMaybeLike` and
	 * collect the `Just` values into a `Builder`.
	 *
	 * @remarks
	 *
	 * If any `Maybe` is `Nothing`, the state of the provided `Builder` is
	 * undefined.
	 */
	export function traverseInto<T, T1, TFinish>(
		elems: AsyncIterable<T>,
		f: (elem: T, idx: number) => Maybe<T1> | AsyncMaybeLike<T1>,
		builder: Builder<T1, TFinish>,
	): AsyncMaybe<TFinish> {
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
	 * Map the elements in an async iterable to `Maybe` or `AsyncMaybeLike` and
	 * collect the `Just` values in an array.
	 */
	export function traverse<T, T1>(
		elems: AsyncIterable<T>,
		f: (elem: T, idx: number) => Maybe<T1> | AsyncMaybeLike<T1>,
	): AsyncMaybe<T1[]> {
		return traverseInto(elems, f, new ArrayPushBuilder());
	}

	/**
	 * Evaluate the `Maybe` in an async iterable and collect the `Just` values
	 * into a `Builder`.
	 *
	 * @remarks
	 *
	 * If any `Maybe` is `Nothing`, the state of the provided `Builder` is
	 * undefined.
	 */
	export function allInto<T, TFinish>(
		elems: AsyncIterable<Maybe<T>>,
		builder: Builder<T, TFinish>,
	): AsyncMaybe<TFinish> {
		return traverseInto(elems, id, builder);
	}

	/**
	 * Evaluate the `Maybe` in an async iterable and collect the `Just` values
	 * in an array.
	 *
	 * @remarks
	 *
	 * This function turns an async iterable of `Maybe` "inside out". For
	 * example, `AsyncIterable<Maybe<T>>` becomes `AsyncMaybe<T[]>`.
	 */
	export function all<T>(elems: AsyncIterable<Maybe<T>>): AsyncMaybe<T[]> {
		return traverse(elems, id);
	}

	/**
	 * Apply an action that returns `Maybe` or `AsyncMaybeLike` to the elements
	 * in an async iterable and ignore the `Just` values.
	 */
	export function forEach<T>(
		elems: AsyncIterable<T>,
		f: (elem: T, idx: number) => Maybe<any> | AsyncMaybeLike<any>,
	): AsyncMaybe<void> {
		return traverseInto(elems, f, new NoOpBuilder());
	}

	/**
	 * Concurrently map the elements in an iterable to `Maybe` or
	 * `AsyncMaybeLike` and collect the `Just` values into a `Builder`.
	 *
	 * @remarks
	 *
	 * If any `Maybe` is `Nothing`, the state of the provided `Builder` is
	 * undefined.
	 */
	export function traverseIntoPar<T, T1, TFinish>(
		elems: Iterable<T>,
		f: (elem: T, idx: number) => Maybe<T1> | AsyncMaybeLike<T1>,
		builder: Builder<T1, TFinish>,
	): AsyncMaybe<TFinish> {
		return new Promise((resolve, reject) => {
			let remaining = 0;
			for (const elem of elems) {
				Promise.resolve(f(elem, remaining)).then((maybe) => {
					if (maybe.isNothing()) {
						resolve(maybe);
						return;
					}
					builder.add(maybe.val);
					remaining--;
					if (remaining === 0) {
						resolve(Maybe.just(builder.finish()));
						return;
					}
				}, reject);
				remaining++;
			}
		});
	}

	/**
	 * Concurrently map the elements in an iterable to `Maybe` or
	 * `AsyncMaybeLike` and collect the `Just` values in an array.
	 */
	export function traversePar<T, T1>(
		elems: Iterable<T>,
		f: (elem: T, idx: number) => Maybe<T1> | AsyncMaybeLike<T1>,
	): AsyncMaybe<T1[]> {
		return traverseIntoPar(
			elems,
			async (elem, idx) =>
				(await f(elem, idx)).map((val) => [idx, val] as const),
			new ArrayAssignBuilder(),
		);
	}

	/**
	 * Concurrently evaluate the `Maybe` or `AsyncMaybeLike` in an iterable and
	 * collect the `Just` values into a `Builder`.
	 *
	 * @remarks
	 *
	 * If any `Maybe` is `Nothing`, the state of the provided `Builder` is
	 * undefined.
	 */
	export function allIntoPar<T, TFinish>(
		elems: Iterable<Maybe<T> | AsyncMaybeLike<T>>,
		builder: Builder<T, TFinish>,
	): AsyncMaybe<TFinish> {
		return traverseIntoPar(elems, id, builder);
	}

	/**
	 * Concurrently evaluate the `Maybe` or `AsyncMaybeLike` in an array or a
	 * tuple literal and collect the `Just` values in an equivalent structure.
	 *
	 * @remarks
	 *
	 * This function turns an array or a tuple literal of `Maybe` or
	 * `AsyncMaybeLike` "inside out". For example:
	 *
	 * -   `AsyncMaybe<T>[]` becomes `AsyncMaybe<T[]>`
	 * -   `[AsyncMaybe<T1>, AsyncMaybe<T2>]` becomes `AsyncMaybe<[T1, T2]>`
	 */
	export function allPar<
		TElems extends readonly (Maybe<any> | AsyncMaybeLike<any>)[] | [],
	>(
		elems: TElems,
	): AsyncMaybe<{ [K in keyof TElems]: Maybe.JustT<Awaited<TElems[K]>> }>;

	/**
	 * Concurrently evaluate the `Maybe` or `AsyncMaybeLike` in an iterable and
	 * collect the `Just` values in an array.
	 *
	 * @remarks
	 *
	 * This function turns an iterable of `Maybe` or `AsyncMaybeLike` "inside
	 * out" For example, `Iterable<AsyncMaybe<T>>` becomes `AsyncMaybe<T[]>`.
	 */
	export function allPar<T>(
		elems: Iterable<Maybe<T> | AsyncMaybeLike<T>>,
	): AsyncMaybe<T[]>;

	export function allPar<T>(
		elems: Iterable<Maybe<T> | AsyncMaybeLike<T>>,
	): AsyncMaybe<T[]> {
		return traversePar(elems, id);
	}

	/**
	 * Concurrently evaluate the `Maybe` or `AsyncMaybeLike` in a string-keyed
	 * record or object literal and collect the `Just` values in an equivalent
	 * structure.
	 *
	 * @remarks
	 *
	 * This function turns a string-keyed record or object literal of `Maybe` or
	 * `AsyncMaybeLike` "inside out". For example:
	 *
	 * -   `Record<string, AsyncMaybe<T>>` becomes `AsyncMaybe<Record<string,
	 *     T>>`
	 * -   `{ x: AsyncMaybe<T1>, y: AsyncMaybe<T2> }` becomes `AsyncMaybe<{ x:
	 *     T1, y: T2 }>`
	 */
	export function allPropsPar<
		TProps extends Record<string, Maybe<any> | AsyncMaybeLike<any>>,
	>(
		props: TProps,
	): AsyncMaybe<{ [K in keyof TProps]: Maybe.JustT<Awaited<TProps[K]>> }>;

	export function allPropsPar<T>(
		props: Record<string, Maybe<T> | AsyncMaybeLike<T>>,
	): AsyncMaybe<Record<string, T>> {
		return traverseIntoPar(
			Object.entries(props),
			async ([key, elem]) =>
				(await elem).map((val) => [key, val] as const),
			new ObjectAssignBuilder(),
		);
	}

	/**
	 * Concurrently apply an action that returns `Maybe` or `AsyncMaybeLike`
	 * to the elements in an iterable and ignore the `Just` values.
	 */
	export function forEachPar<T>(
		elems: Iterable<T>,
		f: (elem: T, idx: number) => Maybe<any> | AsyncMaybeLike<any>,
	): AsyncMaybe<void> {
		return traverseIntoPar(elems, f, new NoOpBuilder());
	}

	/**
	 * Adapt a synchronous or an asynchronous function to be applied in the
	 * context of `Maybe` or `AsyncMaybeLike`.
	 */
	export function liftPar<TArgs extends unknown[], T>(
		f: (...args: TArgs) => T | PromiseLike<T>,
	): (
		...elems: {
			[K in keyof TArgs]: Maybe<TArgs[K]> | AsyncMaybeLike<TArgs[K]>;
		}
	) => Promise<Maybe<T>> {
		return wrapGoFn(async function* (...elems) {
			return f(...(yield* await allPar(elems)));
		});
	}

	/** An async generator that yields `Maybe` and returns a value. */
	export type Go<TReturn> = AsyncGenerator<Maybe<unknown>, TReturn>;
}
