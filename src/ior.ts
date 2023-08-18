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
 * Functionality for "inclusive-or" relationships.
 *
 * @remarks
 *
 * {@link Ior:type | `Ior<A, B>`} is a type that represents one or both of two
 * values. It is represented by three variants: {@link Ior.Left | `Left<A>`},
 * {@link Ior.Right | `Right<B>`}, and {@link Ior.Both | `Both<A, B>`}.
 *
 * -   A `Left<A>` contains a left-hand value of type `A`.
 * -   A `Right<B>` contains a right-hand value of type `B`.
 * -   A `Both<A, B>` contains a left-hand value of type `A` and a right-hand
 *     value of type `B`.
 *
 * The companion {@linkcode Ior:namespace} namespace provides utilities for
 * working with the `Ior<A, B>` type.
 *
 * `Ior` is often used to represent states of failure or success similar to
 * {@linkcode either!Either:type} and {@linkcode validation!Validation:type}.
 * However, `Ior` is capable of also representing a unique state using the
 * `Both` variant. `Both` can represent a success that contains additional
 * information, or a state of "partial failure".
 *
 * When composed, the behavior of `Ior` is a combination of the short-circuiting
 * behavior of `Either` and the failure-accumulating behavior of `Validation`:
 *
 * -   `Left` short-circuits a computation completely and combines its left-hand
 *     value with any existing left-hand value.
 * -   `Right` supplies its right-hand value to the next computation.
 * -   `Both` supplies its right-hand value to the next computation, and
 *     combines its left-hand value with any existing left-hand value.
 *
 * Combinators with this behavior require a `Semigroup` implementation from the
 * accumulating left-hand value.
 *
 * ## Using `Ior` with promises
 *
 * {@link AsyncIor:type | `AsyncIor<A, B>`} is an alias for `Promise<Ior<A,
 * B>>`. The companion {@linkcode AsyncIor:namespace} namespace provides
 * utilities for working with the `AsyncIor<A, B>` type.
 *
 * To accommodate promise-like values, this module also provides the
 * {@link AsyncIorLike | `AsyncIorLike<A, B>`} type as an alias for
 * `PromiseLike<Ior<A, B>>`.
 *
 * ## Importing from this module
 *
 * The types and namespaces from this module can be imported under the same
 * aliases:
 *
 * ```ts
 * import { AsyncIor, Ior } from "@neotype/prelude/ior.js";
 * ```
 *
 * Or, the types and namespaces can be imported and aliased separately:
 *
 * ```ts
 * import {
 *     type AsyncIor,
 *     type Ior,
 *     AsyncIor as AI,
 *     Ior as I
 * } from "@neotype/prelude/ior.js";
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
import type { Either } from "./either.js";
import { id } from "./fn.js";
import type { Validation } from "./validation.js";

/**
 * A type that represents one or both of two values ({@linkcode Ior.Left},
 * {@linkcode Ior.Right}, or {@linkcode Ior.Both}).
 */
export type Ior<A, B> = Ior.Left<A> | Ior.Right<B> | Ior.Both<A, B>;

/**
 * The companion namespace for the {@link Ior:type | `Ior<A, B>`} type.
 *
 * @remarks
 *
 * This namespace provides:
 *
 * -   Functions for constructing, chaining, and collecting into `Ior`.
 * -   A base class with the fluent API for `Ior`
 * -   Variant classes
 * -   Utility types
 */
export namespace Ior {
	/** Construct a `Left`. */
	export function left<A, B = never>(val: A): Ior<A, B> {
		return new Left(val);
	}

	/** Construct a `Right`. */
	export function right<B, A = never>(val: B): Ior<A, B> {
		return new Right(val);
	}

	/** Construct a `Both`. */
	export function both<A, B>(fst: A, snd: B): Ior<A, B> {
		return new Both(fst, snd);
	}

	/** Construct an `Ior` from an `Either`. */
	export function fromEither<A, B>(either: Either<A, B>): Ior<A, B> {
		return either.unwrap(left, right);
	}

	/** Construct an `Ior` from a `Validation`. */
	export function fromValidation<E, T>(vdn: Validation<E, T>): Ior<E, T> {
		return vdn.unwrap(left, right);
	}

	/** Construct an `Ior` from a 2-tuple of values. */
	export function fromTuple<A, B>(tuple: readonly [A, B]): Ior<A, B> {
		return both(tuple[0], tuple[1]);
	}

	/** Evaluate an `Ior.Go` generator to return an `Ior`. */
	export function go<A extends Semigroup<A>, TReturn>(
		gen: Go<A, TReturn>,
	): Ior<A, TReturn> {
		let nxt = gen.next();
		let acc: A | undefined;
		let isHalted = false;

		while (!nxt.done) {
			const ior = nxt.value;
			if (ior.isRight()) {
				nxt = gen.next(ior.val);
			} else if (ior.isBoth()) {
				if (acc === undefined) {
					acc = ior.fst;
				} else {
					acc = cmb(acc, ior.fst);
				}
				nxt = gen.next(ior.snd);
			} else {
				isHalted = true;
				if (acc === undefined) {
					acc = ior.val;
				} else {
					acc = cmb(acc, ior.val);
				}
				nxt = gen.return(undefined as any);
			}
		}

		if (isHalted) {
			return left(acc as A);
		}
		if (acc === undefined) {
			return right(nxt.value);
		}
		return both(acc, nxt.value);
	}

	/**
	 * Adapt a generator function that returns `Ior.Go` into a function that
	 * returns `Ior`.
	 */
	export function wrapGo<T, A extends Semigroup<A>, TReturn>(
		f: (val: T) => Go<A, TReturn>,
	): (val: T) => Ior<A, TReturn> {
		return (val) => go(f(val));
	}

	/**
	 * Accumulate the elements in an iterable using a reducer function that
	 * returns `Ior`.
	 */
	export function reduce<T, TAcc, A extends Semigroup<A>>(
		elems: Iterable<T>,
		accum: (acc: TAcc, val: T) => Ior<A, TAcc>,
		initial: TAcc,
	): Ior<A, TAcc> {
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
	 * Map the elements in an iterable to `Ior` and collect the right-hand
	 * values into a `Builder`.
	 *
	 * @remarks
	 *
	 * If any `Ior` is `Left`, the state of the provided `Builder` is undefined.
	 */
	export function traverseInto<T, A extends Semigroup<A>, B, TFinish>(
		elems: Iterable<T>,
		f: (elem: T, idx: number) => Ior<A, B>,
		builder: Builder<B, TFinish>,
	): Ior<A, TFinish> {
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
	 * Map the elements in an iterable to `Ior` and collect the right-hand
	 * values in an array.
	 */
	export function traverse<T, A extends Semigroup<A>, B>(
		elems: Iterable<T>,
		f: (elem: T, idx: number) => Ior<A, B>,
	): Ior<A, B[]> {
		return traverseInto(elems, f, new ArrayPushBuilder());
	}

	/**
	 * Evaluate the `Ior` in an iterable and collect the right-hand values into
	 * a `Builder`.
	 *
	 * @remarks
	 *
	 * If any `Ior` is `Left`, the state of the provided `Builder` is undefined.
	 */
	export function allInto<A extends Semigroup<A>, B, TFinish>(
		iors: Iterable<Ior<A, B>>,
		builder: Builder<B, TFinish>,
	): Ior<A, TFinish> {
		return traverseInto(iors, id, builder);
	}

	/**
	 * Evaluate the `Ior` in an array or a tuple literal and collect the
	 * right-hand values in an equivalent structure.
	 *
	 * @remarks
	 *
	 * This function turns an array or a tuple literal of `Ior` "inside out".
	 * For example:
	 *
	 * -   `Ior<E, T>[]` becomes `Ior<E, T[]>`
	 * -   `[Ior<E, T1>, Ior<E, T2>]` becomes `Ior<E, [T1, T2]>`
	 */
	export function all<TIors extends readonly Ior<Semigroup<any>, any>[] | []>(
		iors: TIors,
	): Ior<
		LeftT<TIors[number]>,
		{ -readonly [K in keyof TIors]: RightT<TIors[K]> }
	>;

	/**
	 * Evaluate the `Ior` in an iterable and collect the right-hand values in
	 * an array.
	 *
	 * @remarks
	 *
	 * This function turns an iterable of `Ior` "inside out". For example,
	 * `Iterable<Ior<E, T>>` becomes `Ior<E, T[]>`.
	 */
	export function all<A extends Semigroup<A>, B>(
		iors: Iterable<Ior<A, B>>,
	): Ior<A, B[]>;

	export function all<A extends Semigroup<A>, B>(
		iors: Iterable<Ior<A, B>>,
	): Ior<A, B[]> {
		return traverse(iors, id);
	}

	/**
	 * Evaluate the `Ior` in a string-keyed record or object literal and collect
	 * the right-hand values in an equivalent structure.
	 *
	 * @remarks
	 *
	 * This function turns a string-keyed record or object literal of `Ior`
	 * "inside out". For example:
	 *
	 * -   `Record<string, Ior<E, T>>` becomes `Ior<E, Record<string, T>>`
	 * -   `{ x: Ior<E, T1>, y: Ior<E, T2> }` becomes `Ior<E, { x: T1, y: T2 }>`
	 */
	export function allProps<
		TProps extends Record<string, Ior<Semigroup<any>, any>>,
	>(
		props: TProps,
	): Ior<
		LeftT<TProps[keyof TProps]>,
		{ -readonly [K in keyof TProps]: RightT<TProps[K]> }
	>;

	export function allProps<A extends Semigroup<A>, B>(
		props: Record<string, Ior<A, B>>,
	): Ior<A, Record<string, B>> {
		return traverseInto(
			Object.entries(props),
			([key, elem]) => elem.map((val) => [key, val] as const),
			new ObjectAssignBuilder(),
		);
	}

	/**
	 * Apply an action that returns `Ior` to the elements in an iterable and
	 * ignore the right-hand values.
	 */
	export function forEach<T, A extends Semigroup<A>>(
		elems: Iterable<T>,
		f: (elem: T, idx: number) => Ior<A, any>,
	): Ior<A, void> {
		return traverseInto(elems, f, new NoOpBuilder());
	}

	/** Adapt a synchronous function to be applied in the context of `Ior`. */
	export function lift<TArgs extends unknown[], T>(
		f: (...args: TArgs) => T,
	): <A extends Semigroup<A>>(
		...iors: { [K in keyof TArgs]: Ior<A, TArgs[K]> }
	) => Ior<A, T> {
		return (...iors) =>
			all(iors).map((args) => f(...(args as TArgs))) as Ior<any, T>;
	}

	/** An enumeration that discriminates `Ior`. */
	export enum Kind {
		LEFT,
		RIGHT,
		BOTH,
	}

	/** The fluent syntax for `Ior`. */
	export abstract class Syntax {
		/** The property that discriminates `Ior`. */
		abstract readonly kind: Kind;

		/**
		 * Compare this and that `Ior` to determine their equality.
		 *
		 * @remarks
		 *
		 * Two `Ior` are equal if they are the same variant and their value(s)
		 * is (are) equal.
		 */
		[Eq.eq]<A extends Eq<A>, B extends Eq<B>>(
			this: Ior<A, B>,
			that: Ior<A, B>,
		): boolean {
			if (this.isLeft()) {
				return that.isLeft() && eq(this.val, that.val);
			}
			if (this.isRight()) {
				return that.isRight() && eq(this.val, that.val);
			}
			return (
				that.isBoth() &&
				eq(this.fst, that.fst) &&
				eq(this.snd, that.snd)
			);
		}

		/**
		 * Compare this and that `Ior` to determine their ordering.
		 *
		 * @remarks
		 *
		 * When ordered, `Left` always compares as less than `Right`, and
		 * `Right` always compares as less than `Both`. If the variants are the
		 * same, their value(s) are compared to determine the ordering. `Both`
		 * compares left-hand values and right-hand values lexicographically.
		 */
		[Ord.cmp]<A extends Ord<A>, B extends Ord<B>>(
			this: Ior<A, B>,
			that: Ior<A, B>,
		): Ordering {
			if (this.isLeft()) {
				return that.isLeft() ? cmp(this.val, that.val) : Ordering.less;
			}
			if (this.isRight()) {
				if (that.isRight()) {
					return cmp(this.val, that.val);
				}
				return that.isLeft() ? Ordering.greater : Ordering.less;
			}
			if (that.isBoth()) {
				return cmb(cmp(this.fst, that.fst), cmp(this.snd, that.snd));
			}
			return Ordering.greater;
		}

		/**
		 * Combine the values of this and that `Ior`.
		 *
		 * @remarks
		 *
		 * When combined, left-hand values and right-hand values are combined
		 * pairwise. Combination is lossless and merges values into `Both`
		 * when there is no existing value to combine with.
		 */
		[Semigroup.cmb]<A extends Semigroup<A>, B extends Semigroup<B>>(
			this: Ior<A, B>,
			that: Ior<A, B>,
		): Ior<A, B> {
			if (this.isLeft()) {
				if (that.isLeft()) {
					return left(cmb(this.val, that.val));
				}
				if (that.isRight()) {
					return both(this.val, that.val);
				}
				return both(cmb(this.val, that.fst), that.snd);
			}

			if (this.isRight()) {
				if (that.isLeft()) {
					return both(that.val, this.val);
				}
				if (that.isRight()) {
					return right(cmb(this.val, that.val));
				}
				return both(that.fst, cmb(this.val, that.snd));
			}

			if (that.isLeft()) {
				return both(cmb(this.fst, that.val), this.snd);
			}
			if (that.isRight()) {
				return both(this.fst, cmb(this.snd, that.val));
			}
			return both(cmb(this.fst, that.fst), cmb(this.snd, that.snd));
		}

		/** Test whether this `Ior` is `Left`. */
		isLeft<A>(this: Ior<A, any>): this is Left<A> {
			return this.kind === Kind.LEFT;
		}

		/** Test whether this `Ior` is `Right`. */
		isRight<B>(this: Ior<any, B>): this is Right<B> {
			return this.kind === Kind.RIGHT;
		}

		/** Test whether this `Ior` is `Both`. */
		isBoth<A, B>(this: Ior<A, B>): this is Both<A, B> {
			return this.kind === Kind.BOTH;
		}

		/**
		 * Apply one of three functions to extract the value(s) out of this
		 * `Ior` depending on the variant.
		 */
		unwrap<A, B, T1, T2, T3>(
			this: Ior<A, B>,
			unwrapLeft: (val: A) => T1,
			unwrapRight: (val: B) => T2,
			unwrapBoth: (fst: A, snd: B) => T3,
		): T1 | T2 | T3 {
			if (this.isLeft()) {
				return unwrapLeft(this.val);
			}
			if (this.isRight()) {
				return unwrapRight(this.val);
			}
			return unwrapBoth(this.fst, this.snd);
		}

		/**
		 * If this `Ior` has a right-hand value, apply a function to the value
		 * to return another `Ior`.
		 */
		andThen<A extends Semigroup<A>, B, B1>(
			this: Ior<A, B>,
			f: (val: B) => Ior<A, B1>,
		): Ior<A, B1> {
			if (this.isLeft()) {
				return this;
			}
			if (this.isRight()) {
				return f(this.val);
			}
			const that = f(this.snd);
			if (that.isLeft()) {
				return left(cmb(this.fst, that.val));
			}
			if (that.isRight()) {
				return both(this.fst, that.val);
			}
			return both(cmb(this.fst, that.fst), that.snd);
		}

		/**
		 * If this `Ior` has a right-hand value, apply a generator function to
		 * the value to return another `Ior`.
		 */
		andThenGo<A extends Semigroup<A>, B, B1>(
			this: Ior<A, B>,
			f: (val: B) => Go<A, B1>,
		): Ior<A, B1> {
			return this.andThen((val) => go(f(val)));
		}

		/**
		 * If this `Ior` has a right-hand value, ignore the value and return
		 * that `Ior`.
		 */
		and<A extends Semigroup<A>, B1>(
			this: Ior<A, any>,
			that: Ior<A, B1>,
		): Ior<A, B1> {
			return this.andThen(() => that);
		}

		/**
		 * If this and that `Ior` have right-hand values, apply a function to
		 * combine the values.
		 */
		zipWith<A extends Semigroup<A>, B, B1, B2>(
			this: Ior<A, B>,
			that: Ior<A, B1>,
			f: (lhs: B, rhs: B1) => B2,
		): Ior<A, B2> {
			return this.andThen((lhs) => that.map((rhs) => f(lhs, rhs)));
		}

		/**
		 * If this `Ior` has a left-hand value, apply a function to map the
		 * value.
		 */
		lmap<A, B, A1>(this: Ior<A, B>, f: (val: A) => A1): Ior<A1, B> {
			if (this.isLeft()) {
				return left(f(this.val));
			}
			if (this.isRight()) {
				return this;
			}
			return both(f(this.fst), this.snd);
		}

		/**
		 * If this `Ior` has a right-hand value, apply a function to map the
		 * value.
		 */
		map<A, B, B1>(this: Ior<A, B>, f: (val: B) => B1): Ior<A, B1> {
			if (this.isLeft()) {
				return this;
			}
			if (this.isRight()) {
				return right(f(this.val));
			}
			return both(this.fst, f(this.snd));
		}
	}

	/** An `Ior` with a left-hand value. */
	export class Left<out A> extends Syntax {
		readonly kind = Kind.LEFT;

		/** The value of this `Ior`. */
		readonly val: A;

		constructor(val: A) {
			super();
			this.val = val;
		}

		*[Symbol.iterator](): Generator<Ior<A, never>, never, unknown> {
			return (yield this) as never;
		}
	}

	/** An `Ior` with a right-hand value. */
	export class Right<out B> extends Syntax {
		readonly kind = Kind.RIGHT;

		/** The value of this `Ior`. */
		readonly val: B;

		constructor(val: B) {
			super();
			this.val = val;
		}

		*[Symbol.iterator](): Generator<Ior<never, B>, B, unknown> {
			return (yield this) as B;
		}
	}

	/** An `Ior` with a left-hand and a right-hand value. */
	export class Both<out A, out B> extends Syntax {
		readonly kind = Kind.BOTH;

		/** The left-hand value of this `Ior`. */
		readonly fst: A;

		/** The right-hand value of this `Ior`. */
		readonly snd: B;

		/**
		 * A 2-tuple of the left-hand value and right-hand value of this `Ior`.
		 */
		get val(): [A, B] {
			return [this.fst, this.snd];
		}

		constructor(fst: A, snd: B) {
			super();
			this.fst = fst;
			this.snd = snd;
		}

		*[Symbol.iterator](): Generator<Ior<A, B>, B, unknown> {
			return (yield this) as B;
		}
	}

	/** A generator that yields `Ior` and returns a value. */
	export type Go<A extends Semigroup<A>, TReturn> = Generator<
		Ior<A, unknown>,
		TReturn,
		unknown
	>;

	/** Extract the left-hand value type `A` from the type `Ior<A, B>`. */
	export type LeftT<TIor extends Ior<any, any>> = [TIor] extends [
		Ior<infer A, any>,
	]
		? A
		: never;

	/** Extract the right-hand value type `B` from the type `Ior<A, B>`. */
	export type RightT<TIor extends Ior<any, any>> = [TIor] extends [
		Ior<any, infer B>,
	]
		? B
		: never;
}

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
		let nxt = await gen.next();
		let acc: A | undefined;
		let isHalted = false;

		while (!nxt.done) {
			const ior = nxt.value;
			if (ior.isRight()) {
				nxt = await gen.next(ior.val);
			} else if (ior.isBoth()) {
				if (acc === undefined) {
					acc = ior.fst;
				} else {
					acc = cmb(acc, ior.fst);
				}
				nxt = await gen.next(ior.snd);
			} else {
				isHalted = true;
				if (acc === undefined) {
					acc = ior.val;
				} else {
					acc = cmb(acc, ior.val);
				}
				nxt = await gen.return(undefined as any);
			}
		}

		if (isHalted) {
			return Ior.left(acc as A);
		}
		if (acc === undefined) {
			return Ior.right(nxt.value);
		}
		return Ior.both(acc, nxt.value);
	}

	/**
	 * Adapt an async generator function that returns `AsyncIor.Go` into an
	 * async function that returns `AsyncIor`.
	 */
	export function wrapGo<T, A extends Semigroup<A>, TReturn>(
		f: (val: T) => Go<A, TReturn>,
	): (val: T) => AsyncIor<A, TReturn> {
		return (val) => go(f(val));
	}

	/**
	 * Accumulate the elements in an async iterable using a reducer function
	 * that returns `Ior` `AsyncIorLike`.
	 */
	export function reduce<T, TAcc, A extends Semigroup<A>>(
		elems: AsyncIterable<T>,
		accum: (acc: TAcc, val: T) => Ior<A, TAcc> | AsyncIorLike<A, TAcc>,
		initial: TAcc,
	): AsyncIor<A, TAcc> {
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
	 * Map the elements in an async iterable to `Ior` and collect the right-hand
	 * values into a `Builder`.
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
	 * Map the elements in an async iterable to `Ior` and collect the right-hand
	 * values in an array.
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
			let acc: A | undefined;

			for (const elem of elems) {
				const idx = remaining;
				remaining++;
				Promise.resolve(f(elem, idx)).then((ior) => {
					if (ior.isLeft()) {
						if (acc === undefined) {
							resolve(ior);
						} else {
							resolve(Ior.left(cmb(acc, ior.val)));
						}
						return;
					}

					if (ior.isRight()) {
						builder.add(ior.val);
					} else {
						if (acc === undefined) {
							acc = ior.fst;
						} else {
							acc = cmb(acc, ior.fst);
						}
						builder.add(ior.snd);
					}

					remaining--;
					if (remaining === 0) {
						if (acc === undefined) {
							resolve(Ior.right(builder.finish()));
						} else {
							resolve(Ior.both(acc, builder.finish()));
						}
						return;
					}
				}, reject);
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
		return (...elems) =>
			go(
				(async function* (): Go<any, T> {
					return f(
						...((yield* await allPar(elems)) as TArgs),
					) as Awaited<T>;
				})(),
			);
	}

	/** An async generator that yields `Ior` and returns a value. */
	export type Go<A extends Semigroup<A>, TReturn> = AsyncGenerator<
		Ior<A, unknown>,
		TReturn,
		unknown
	>;
}
