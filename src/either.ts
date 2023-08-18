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
 * {@link Either:type | `Either<A, B>`} is a type that represents one of two
 * values. It is represented by two variants: {@link Either.Left | `Left<A>`}
 * and {@link Either.Right | `Right<B>`}.
 *
 * -   A `Left<A>` is a left-sided `Either` and contains a value of type `A`.
 * -   A `Right<B>` is a right-sided `Either` and contains a value of type `B`.
 *
 * The companion {@linkcode Either:namespace} namespace provides utilities for
 * working with the `Either<A, B>` type.
 *
 * ## Handling failure
 *
 * `Either` is also used to represent a value which is either a success or a
 * failure. `Left` variant represents a failed value, while the `Right` variant
 * represents a successful value.
 *
 * Some combinators for `Either` are specialized for this failure-handling
 * use case, and provide a right-biased behavior that "short-circuits" a
 * computation on the first `Left`. This behavior allows functions that return
 * `Either` to be composed in a way that propogates failures while applying
 * logic to successes -- a useful feature for railway-oriented programming.
 *
 * ## Using `Either` with promises
 *
 * {@link AsyncEither:type | `AsyncEither<A, B>`} is an alias for
 * `Promise<Either<A, B>>`. The companion {@linkcode AsyncEither:namespace}
 * namespace provides utilities for working with the `AsyncEither<A, B>` type.
 *
 * To accommodate promise-like values, this module also provides the
 * {@link AsyncEitherLike | `AsyncEitherLike<A, B>`} type as an alias for
 * `PromiseLike<Either<A, B>>`.
 *
 * ## Importing from this module
 *
 * The types and namespaces from this module can be imported under the same
 * aliases:
 *
 * ```ts
 * import { AsyncEither, Either } from "@neotype/prelude/either.js";
 * ```
 *
 * Or, they can be imported and aliased separately:
 *
 * ```ts
 * import {
 *     type AsyncEither,
 *     type Either,
 *     AsyncEither as AE,
 *     Either as E
 * } from "@neotype/prelude/either.js";
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
import type { Validation } from "./validation.js";

/**
 * A type that represents one of two values ({@linkcode Either.Left} or
 * {@linkcode Either.Right}).
 */
export type Either<A, B> = Either.Left<A> | Either.Right<B>;

/**
 * The companion namespace for the {@link Either:type | `Either<A, B>`} type.
 *
 * @remarks
 *
 * This namespace provides:
 *
 * -   Functions for constructing, chaining, and collecting into `Either`
 * -   A base class with the fluent API for `Either`
 * -   Variant classes
 * -   Utility types
 */
export namespace Either {
	/** Construct a `Left`. */
	export function left<A, B = never>(val: A): Either<A, B> {
		return new Left(val);
	}

	/** Construct a `Right`. */
	export function right<B, A = never>(val: B): Either<A, B> {
		return new Right(val);
	}

	/** Construct an `Either` from a `Validation`. */
	export function fromValidation<E, T>(vdn: Validation<E, T>): Either<E, T> {
		return vdn.unwrap(left, right);
	}

	/** Evaluate an `Either.Go` generator to return an `Either`. */
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
	 * Adapt a generator function that returns `Either.Go` into a function that
	 * returns `Either`.
	 */
	export function wrapGo<T, E, TReturn>(
		f: (val: T) => Go<E, TReturn>,
	): (val: T) => Either<E, TReturn> {
		return (val) => go(f(val));
	}

	/**
	 * Accumulate the elements in an iterable using a reducer function that
	 * returns `Either`.
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
	 * Map the elements in an iterable to `Either` and collect the `Right`
	 * values into a `Builder`.
	 *
	 * @remarks
	 *
	 * If any `Either` is `Left`, the state of the provided `Builder` is
	 * undefined.
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
	 * Map the elements in an iterable to `Either` and collect the `Right`
	 * values in an array.
	 */
	export function traverse<T, E, T1>(
		elems: Iterable<T>,
		f: (elem: T, idx: number) => Either<E, T1>,
	): Either<E, T1[]> {
		return traverseInto(elems, f, new ArrayPushBuilder());
	}

	/**
	 * Evaluate the `Either` in an iterable and collect the `Right` values into
	 * a `Builder`.
	 *
	 * @remarks
	 *
	 * If any `Either` is `Left`, the state of the provided `Builder` is
	 * undefined.
	 */
	export function allInto<E, T, TFinish>(
		eithers: Iterable<Either<E, T>>,
		builder: Builder<T, TFinish>,
	): Either<E, TFinish> {
		return traverseInto(eithers, id, builder);
	}

	/**
	 * Evaluate the `Either` in an array or a tuple literal and collect the
	 * `Right` values in an equivalent structure.
	 *
	 * @remarks
	 *
	 * This function turns an array or a tuple literal of `Either` "inside out".
	 * For example:
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
	 * Evaluate the `Either` in an iterable and collect the `Right` values in an
	 * array.
	 *
	 * @remarks
	 *
	 * This function turns an iterable of `Either` "inside out". For example,
	 * `Iterable<Either<E, T>>` becomes `Either<E, T[]>`.
	 */
	export function all<E, T>(eithers: Iterable<Either<E, T>>): Either<E, T[]>;

	export function all<E, T>(eithers: Iterable<Either<E, T>>): Either<E, T[]> {
		return traverse(eithers, id);
	}

	/**
	 * Evaluate the `Either` in a string-keyed record or object literal and
	 * collect the `Right` values in an equivalent structure.
	 *
	 * @remarks
	 *
	 * This function turns a string-keyed record or object literal of `Either`
	 * "inside out". For example:
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
		return traverseInto(
			Object.entries(props),
			([key, elem]) => elem.map((val) => [key, val] as const),
			new ObjectAssignBuilder(),
		);
	}

	/**
	 * Apply an action that returns `Either` to the elements in an iterable and
	 * ignore the `Right` values.
	 */
	export function forEach<T, E>(
		elems: Iterable<T>,
		f: (elem: T, idx: number) => Either<E, any>,
	): Either<E, void> {
		return traverseInto(elems, f, new NoOpBuilder());
	}

	/**
	 * Adapt a synchronous function to be applied in the context of `Either`.
	 */
	export function lift<TArgs extends unknown[], T>(
		f: (...args: TArgs) => T,
	): <TEithers extends { [K in keyof TArgs]: Either<any, TArgs[K]> }>(
		...eithers: TEithers
	) => Either<LeftT<TEithers[number]>, T> {
		return (...eithers) =>
			all(eithers).map((args) => f(...(args as TArgs)));
	}

	/** An enumeration that discriminates `Either`. */
	export enum Kind {
		LEFT,
		RIGHT,
	}

	/** The fluent syntax for `Either`. */
	export abstract class Syntax {
		/** The property that discriminates `Either`. */
		abstract readonly kind: Kind;

		/**
		 * Compare this and that `Either` to determine their equality.
		 *
		 * @remarks
		 *
		 * Two `Either` are equal if they are the same variant and their values
		 * are equal.
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
		 * When ordered, `Left` always compares as less than `Right`. If the
		 * variants are the same, their values are compared to determine the
		 * ordering.
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

		/** If this and that `Either` are `Right`, combine their values. */
		[Semigroup.cmb]<E, T extends Semigroup<T>>(
			this: Either<E, T>,
			that: Either<E, T>,
		): Either<E, T> {
			return this.zipWith(that, cmb);
		}

		/** Test whether this `Either` is `Left`. */
		isLeft<A>(this: Either<A, any>): this is Left<A> {
			return this.kind === Kind.LEFT;
		}

		/** Test whether this `Either` is `Right`. */
		isRight<B>(this: Either<any, B>): this is Right<B> {
			return this.kind === Kind.RIGHT;
		}

		/**
		 * Apply one of two functions to extract the value out of this `Either`
		 * depending on the variant.
		 */
		unwrap<A, B, T1, T2>(
			this: Either<A, B>,
			unwrapLeft: (val: A) => T1,
			unwrapRight: (val: B) => T2,
		): T1 | T2 {
			return this.isLeft() ? unwrapLeft(this.val) : unwrapRight(this.val);
		}

		/**
		 * If this `Either` is `Left`, apply a function to its value to return
		 * another `Either`.
		 */
		orElse<E, T, E1, T1>(
			this: Either<E, T>,
			f: (val: E) => Either<E1, T1>,
		): Either<E1, T | T1> {
			return this.isLeft() ? f(this.val) : this;
		}

		/**
		 * If this `Either` is `Left`, ignore its value and return that
		 * `Either`.
		 */
		or<T, E1, T1>(
			this: Either<any, T>,
			that: Either<E1, T1>,
		): Either<E1, T | T1> {
			return this.orElse(() => that);
		}

		/**
		 * If this `Either` is `Right`, apply a function to its value to return
		 * another `Either`.
		 */
		andThen<E, T, E1, T1>(
			this: Either<E, T>,
			f: (val: T) => Either<E1, T1>,
		): Either<E | E1, T1> {
			return this.isLeft() ? this : f(this.val);
		}

		/**
		 * If this `Either` is `Right`, apply a generator function to its value
		 * to return another `Either`.
		 */
		andThenGo<E, T, E1, T1>(
			this: Either<E, T>,
			f: (val: T) => Go<E1, T1>,
		): Either<E | E1, T1> {
			return this.andThen((val) => go(f(val)));
		}

		/**
		 * If this `Either` is `Right`, ignore its value and return that
		 * `Either`.
		 */
		and<E, E1, T1>(
			this: Either<E, any>,
			that: Either<E1, T1>,
		): Either<E | E1, T1> {
			return this.andThen(() => that);
		}

		/**
		 * If this and that `Either` are `Right`, apply a function to combine
		 * their values.
		 */
		zipWith<E, T, E1, T1, T2>(
			this: Either<E, T>,
			that: Either<E1, T1>,
			f: (lhs: T, rhs: T1) => T2,
		): Either<E | E1, T2> {
			return this.andThen((lhs) => that.map((rhs) => f(lhs, rhs)));
		}

		/** If this `Either` is `Left`, apply a function to map its value. */
		lmap<A, B, A1>(this: Either<A, B>, f: (val: A) => A1): Either<A1, B> {
			return this.orElse((val) => left(f(val)));
		}

		/** If this `Either` is `Right`, apply a function to map its value. */
		map<A, B, B1>(this: Either<A, B>, f: (val: B) => B1): Either<A, B1> {
			return this.andThen((val) => right(f(val)));
		}
	}

	/** A left-sided Either. */
	export class Left<out A> extends Syntax {
		readonly kind = Kind.LEFT;

		/** The value of this `Either`. */
		readonly val: A;

		constructor(val: A) {
			super();
			this.val = val;
		}

		*[Symbol.iterator](): Generator<Either<A, never>, never, unknown> {
			return (yield this) as never;
		}
	}

	/** A right-sided Either. */
	export class Right<out B> extends Syntax {
		readonly kind = Kind.RIGHT;

		/** The value of this `Either`. */
		readonly val: B;

		constructor(val: B) {
			super();
			this.val = val;
		}

		*[Symbol.iterator](): Generator<Either<never, B>, B, unknown> {
			return (yield this) as B;
		}
	}

	/** A generator that yields `Either` and returns a value. */
	export type Go<E, TReturn> = Generator<
		Either<E, unknown>,
		TReturn,
		unknown
	>;

	/** Extract the `Left` value type `A` from the type `Either<A, B>`. */
	export type LeftT<TEither extends Either<any, any>> = [TEither] extends [
		Either<infer A, any>,
	]
		? A
		: never;

	/** Extract the `Right` value type `B` from the type `Either<A, B>`. */
	export type RightT<TEither extends Either<any, any>> = [TEither] extends [
		Either<any, infer B>,
	]
		? B
		: never;
}

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
	/**
	 * Evaluate an `AsyncEither.Go` async generator to return an `AsyncEither`.
	 */
	export async function go<E, TReturn>(
		gen: Go<E, TReturn>,
	): AsyncEither<E, TReturn> {
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
		return isHalted ? Either.left(err) : Either.right(nxt.value);
	}

	/**
	 * Adapt an async generator function that returns `AsyncEither.Go` into an
	 * async function that returns `AsyncEither`.
	 */
	export function wrapGo<T, E, TReturn>(
		f: (val: T) => Go<E, TReturn>,
	): (val: T) => AsyncEither<E, TReturn> {
		return (val) => go(f(val));
	}

	/**
	 * Accumulate the elements in an async iterable using a reducer function
	 * that returns `Either` or `AsyncEitherLike`.
	 */
	export function reduce<T, TAcc, E>(
		elems: AsyncIterable<T>,
		accum: (
			acc: TAcc,
			val: T,
		) => Either<E, TAcc> | AsyncEitherLike<E, TAcc>,
		initial: TAcc,
	): AsyncEither<E, TAcc> {
		return go(
			(async function* () {
				let acc = initial;
				for await (const elem of elems) {
					acc = yield* await accum(acc, elem);
				}
				return acc;
			})(),
		);
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
		return go(
			(async function* () {
				let idx = 0;
				for await (const elem of elems) {
					builder.add(yield* await f(elem, idx));
					idx++;
				}
				return builder.finish();
			})(),
		);
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
						resolve(Either.right(builder.finish()));
						return;
					}
				}, reject);
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
	): <
		TElems extends {
			[K in keyof TArgs]:
				| Either<any, TArgs[K]>
				| AsyncEitherLike<any, TArgs[K]>;
		},
	>(
		...elems: TElems
	) => AsyncEither<
		Either.LeftT<{ [K in keyof TElems]: Awaited<TElems[K]> }[number]>,
		T
	> {
		return (...elems) =>
			go(
				(async function* () {
					return f(...((yield* await allPar(elems)) as TArgs));
				})(),
			);
	}

	/** An async generator that yields `Either` and returns a value. */
	export type Go<E, TReturn> = AsyncGenerator<
		Either<E, any>,
		TReturn,
		unknown
	>;
}
