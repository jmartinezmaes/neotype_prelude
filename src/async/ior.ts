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
 *
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
import { Ior } from "../ior.js";

/** A promise-like object that fulfills with `Ior`. */
export type AsyncIorLike<A, B> = PromiseLike<Ior<A, B>>;

/** A promise that fulfills with `Ior`. */
export type AsyncIor<A, B> = Promise<Ior<A, B>>;

/**
 * The companion namespace for the {@link AsyncIor:type | `AsyncIor<A, B>`}
 * type.
 *
 * @remarks
 *
 * This namespace provides functions for chaining and collecting into
 * `AsyncIor`.
 */
export namespace AsyncIor {
	/** Evaluate an `AsyncIor.Go` async generator to return an `AsyncIor`. */
	export async function go<A extends Semigroup<A>, TReturn>(
		gen: Go<A, TReturn>,
	): AsyncIor<A, TReturn> {
		let next = await gen.next();
		let fsts: A | undefined;
		let halted = false;

		while (!next.done) {
			const ior = next.value;
			switch (ior.kind) {
				case Ior.Kind.LEFT:
					halted = true;
					fsts = fsts === undefined ? ior.val : cmb(fsts, ior.val);
					next = await gen.return(undefined as never);
					break;
				case Ior.Kind.RIGHT:
					next = await gen.next(ior.val);
					break;
				case Ior.Kind.BOTH:
					fsts =
						fsts === undefined
							? ior.fst
							: (fsts = cmb(fsts, ior.fst));
					next = await gen.next(ior.snd);
			}
		}

		if (halted) {
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			return Ior.left(fsts!);
		}
		return fsts === undefined
			? Ior.right(next.value)
			: Ior.both(fsts, next.value);
	}

	/**
	 * Evaluate an async generator function that returns `AsyncIor.Go` to return
	 * an `AsyncIor`.
	 */
	export function fromGoFn<A extends Semigroup<A>, TReturn>(
		f: () => Go<A, TReturn>,
	): AsyncIor<A, TReturn> {
		return go(f());
	}

	/**
	 * Adapt an async generator function that returns `AsyncIor.Go` into an
	 * async function that returns `Ior` or `AsyncIorLike`.
	 */
	export function wrapGoFn<
		TArgs extends unknown[],
		A extends Semigroup<A>,
		TReturn,
	>(
		f: (...args: TArgs) => Go<A, TReturn>,
	): (...args: TArgs) => AsyncIor<A, TReturn> {
		return (...args) => go(f(...args));
	}

	/**
	 * Accumulate the elements in an async iterable using a reducer function
	 * that returns `Ior` or `AsyncIorLike`.
	 */
	export function reduce<T, TAcc, A extends Semigroup<A>>(
		elems: AsyncIterable<T>,
		f: (
			acc: TAcc,
			elem: T,
			idx: number,
		) => Ior<A, TAcc> | AsyncIorLike<A, TAcc>,
		initial: TAcc,
	): AsyncIor<A, TAcc> {
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
	 * Map the elements in an async iterable to `Ior` or `AsyncIorLike` and
	 * collect the right-hand values into a `Builder`.
	 *
	 * @remarks
	 *
	 * If any `Ior` is `Left`, the state of the provided `Builder` is undefined.
	 */
	export function traverseInto<T, A extends Semigroup<A>, B, TFinish>(
		elems: AsyncIterable<T>,
		f: (elem: T, idx: number) => Ior<A, B> | AsyncIorLike<A, B>,
		builder: Builder<B, TFinish>,
	): AsyncIor<A, TFinish> {
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
	 * Map the elements in an async iterable to `Ior` or `AsyncIorLike` and
	 * collect the right-hand values in an array.
	 */
	export function traverse<T, A extends Semigroup<A>, B>(
		elems: AsyncIterable<T>,
		f: (elem: T, idx: number) => Ior<A, B> | AsyncIorLike<A, B>,
	): AsyncIor<A, B[]> {
		return traverseInto(elems, f, new ArrayPushBuilder());
	}

	/**
	 * Evaluate the `Ior` in an async iterable and collect the right-hand values
	 * into a `Builder`.
	 *
	 * @remarks
	 *
	 * If any `Ior` is `Left`, the state of the provided `Builder` is undefined.
	 */
	export function allInto<A extends Semigroup<A>, B, TFinish>(
		elems: AsyncIterable<Ior<A, B>>,
		builder: Builder<B, TFinish>,
	): AsyncIor<A, TFinish> {
		return traverseInto(elems, id, builder);
	}

	/**
	 * Evaluate the `Ior` in an async iterable and collect the right-hand values
	 * in an array.
	 *
	 * @remarks
	 *
	 * This function turns an async iterable of `Ior` "inside out". For example,
	 * `AsyncIterable<Ior<E, T>>` becomes `AsyncIor<E, T[]>`.
	 */
	export function all<A extends Semigroup<A>, B>(
		elems: AsyncIterable<Ior<A, B>>,
	): AsyncIor<A, B[]> {
		return traverse(elems, id);
	}

	/**
	 * Apply an action that returns `Ior` or `AsyncIorLike` to the elements in
	 * an async iterable and ignore the right-hand values.
	 */
	export function forEach<T, A extends Semigroup<A>>(
		elems: AsyncIterable<T>,
		f: (elem: T, idx: number) => Ior<A, any> | AsyncIorLike<A, any>,
	): AsyncIor<A, void> {
		return traverseInto(elems, f, new NoOpBuilder());
	}

	/**
	 * Concurrently map the elements in an iterable to `Ior` or `AsyncIorLike`
	 * and collect the right-hand values into a `Builder`.
	 *
	 * @remarks
	 *
	 * If any `Ior` is `Left`, the state of the provided `Builder` is undefined.
	 */
	export function traverseIntoPar<T, A extends Semigroup<A>, B, TFinish>(
		elems: Iterable<T>,
		f: (elem: T, idx: number) => Ior<A, B> | AsyncIorLike<A, B>,
		builder: Builder<B, TFinish>,
	): AsyncIor<A, TFinish> {
		return new Promise((resolve, reject) => {
			let remaining = 0;
			let fsts: A | undefined;

			for (const elem of elems) {
				Promise.resolve(f(elem, remaining)).then((ior) => {
					switch (ior.kind) {
						case Ior.Kind.LEFT:
							resolve(
								fsts === undefined
									? ior
									: Ior.left(cmb(fsts, ior.val)),
							);
							return;
						case Ior.Kind.RIGHT:
							builder.add(ior.val);
							break;
						case Ior.Kind.BOTH:
							fsts =
								fsts === undefined
									? ior.fst
									: cmb(fsts, ior.fst);
							builder.add(ior.snd);
					}

					remaining--;
					if (remaining === 0) {
						resolve(
							fsts === undefined
								? Ior.right(builder.finish())
								: Ior.both(fsts, builder.finish()),
						);
						return;
					}
				}, reject);
				remaining++;
			}
		});
	}

	/**
	 * Concurrently map the elements in an iterable to `Ior` or `AsyncIorLike`
	 * and collect the right-hand values in an array.
	 */
	export function traversePar<T, A extends Semigroup<A>, B>(
		elems: Iterable<T>,
		f: (elem: T, idx: number) => Ior<A, B> | AsyncIorLike<A, B>,
	): AsyncIor<A, B[]> {
		return traverseIntoPar(
			elems,
			async (elem, idx) =>
				(await f(elem, idx)).map((val): [number, B] => [idx, val]),
			new ArrayAssignBuilder(),
		);
	}

	/**
	 * Concurrently evaluate the `Ior` or `AsyncIorLike` in an iterable and
	 * collect the right-hand values into a `Builder`.
	 *
	 * @remarks
	 *
	 * If any `Ior` is `Left`, the state of the provided `Builder` is undefined.
	 */
	export function allIntoPar<A extends Semigroup<A>, B, TFinish>(
		elems: Iterable<Ior<A, B> | AsyncIorLike<A, B>>,
		builder: Builder<B, TFinish>,
	): AsyncIor<A, TFinish> {
		return traverseIntoPar(elems, id, builder);
	}

	/**
	 * Concurrently evaluate the `Ior` or `AsyncIorLike` in an array or a tuple
	 * literal and collect the right-hand values in an equivalent structure.
	 *
	 * @remarks
	 *
	 * This function turns an array or a tuple literal of `Ior` or
	 * `AsyncIorLike` "inside out". For example:
	 *
	 * -   `AsyncIor<E, T>[]` becomes `AsyncIor<E, T[]>`
	 * -   `[AsyncIor<E, T1>, AsyncIor<E, T2>]` becomes `AsyncIor<E, [T1, T2]>`
	 */
	export function allPar<
		TElems extends
			| readonly (
					| Ior<Semigroup<any>, any>
					| AsyncIorLike<Semigroup<any>, any>
			  )[]
			| [],
	>(
		elems: TElems,
	): AsyncIor<
		Ior.LeftT<{ [K in keyof TElems]: Awaited<TElems[K]> }[number]>,
		{ [K in keyof TElems]: Ior.RightT<Awaited<TElems[K]>> }
	>;

	/**
	 * Concurrently evaluate the `Ior` or `AsyncIorLike` in an iterable and
	 * collect the right-hand values in an array.
	 *
	 * @remarks
	 *
	 * This function turns an iterable of `Ior` or `AsyncIorLike` "inside out".
	 * For example, `Iterable<AsyncIor<E, T>>` becomes `AsyncIor<E, T[]>`.
	 */
	export function allPar<A extends Semigroup<A>, B>(
		elems: Iterable<Ior<A, B> | AsyncIorLike<A, B>>,
	): AsyncIor<A, B[]>;

	export function allPar<A extends Semigroup<A>, B>(
		elems: Iterable<Ior<A, B> | AsyncIorLike<A, B>>,
	): AsyncIor<A, B[]> {
		return traversePar(elems, id);
	}

	/**
	 * Concurrently evaluate the `Ior` or `AsyncIorLike` in a string-keyed
	 * record or object literal and collect the right-hand values in an
	 * equivalent structure.
	 *
	 * @remarks
	 *
	 * This function turns a string-keyed record or object literal of `Ior` or
	 * `AsyncIorLike` "inside out". For example:
	 *
	 * -   `Record<string, AsyncIor<E, T>>` becomes `AsyncIor<E, Record<string,
	 *     T>>`
	 * -   `{ x: AsyncIor<E, T1>, y: AsyncIor<E, T2> }` becomes `AsyncIor<E,
	 *     { x: T1, y: T2 }>`
	 */
	export function allPropsPar<
		TProps extends Record<
			string,
			Ior<Semigroup<any>, any> | AsyncIorLike<Semigroup<any>, any>
		>,
	>(
		props: TProps,
	): AsyncIor<
		Ior.LeftT<{ [K in keyof TProps]: Awaited<TProps[K]> }[keyof TProps]>,
		{ [K in keyof TProps]: Ior.RightT<Awaited<TProps[K]>> }
	>;

	export function allPropsPar<A extends Semigroup<A>, B>(
		props: Record<string, Ior<A, B> | AsyncIorLike<A, B>>,
	): AsyncIor<A, Record<string, B>> {
		return traverseIntoPar(
			Object.entries(props),
			async ([key, elem]) =>
				(await elem).map((val) => [key, val] as const),
			new ObjectAssignBuilder(),
		);
	}

	/**
	 * Concurrently apply an action that returns `Ior` or `AsyncIorLike` to the
	 * elements in an iterable and ignore the right-hand values.
	 */
	export function forEachPar<T, A extends Semigroup<A>>(
		elems: Iterable<T>,
		f: (elem: T, idx: number) => Ior<A, any> | AsyncIorLike<A, any>,
	): AsyncIor<A, void> {
		return traverseIntoPar(elems, f, new NoOpBuilder());
	}

	/**
	 * Adapt a synchronous or an asynchronous function to be applied in the
	 * context of `Ior` or `AsyncIorLike`.
	 */
	export function liftPar<TArgs extends unknown[], T>(
		f: (...args: TArgs) => T | PromiseLike<T>,
	): <A extends Semigroup<A>>(
		...elems: {
			[K in keyof TArgs]: Ior<A, TArgs[K]> | AsyncIorLike<A, TArgs[K]>;
		}
	) => AsyncIor<A, T> {
		return wrapGoFn(async function* (...elems): Go<any, T> {
			return f(...((yield* await allPar(elems)) as TArgs)) as Awaited<T>;
		});
	}

	/** An async generator that yields `Ior` and returns a value. */
	export type Go<A extends Semigroup<A>, TReturn> = AsyncGenerator<
		Ior<A, unknown>,
		TReturn
	>;
}
