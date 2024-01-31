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
 * The {@link Ior:namespace | `Ior`} companion namespace provides utilities for
 * for working with the `Ior<A, B>` type.
 *
 * `Ior` is often used to represent states of failure or success similar to
 * {@link either!Either:type | `Either`}. However, `Ior` is capable of also
 * representing a unique state using the `Both` variant. `Both` can represent a
 * success that contains additional information or a state of "partial failure",
 * similar to {@link annotation!Annotation:type | `Annotation`}.
 *
 * When composed, the behavior of `Ior` is a combination of the short-circuiting
 * behavior of `Either` and the accumulating behavior of `Annotation`:
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
 * ## Importing from this module
 *
 * The types and namespaces from this module can be imported under the same
 * aliases:
 *
 * ```ts
 * import { Ior } from "@neotype/prelude/ior.js";
 * ```
 *
 * Or, the types and namespaces can be imported and aliased separately:
 *
 * ```ts
 * import { type Ior, Ior as I } from "@neotype/prelude/ior.js";
 * ```
 *
 * @module
 */

import {
	ArrayPushBuilder,
	NoOpBuilder,
	ObjectAssignBuilder,
	type Builder,
} from "./builder.js";
import { Semigroup, cmb } from "./cmb.js";
import { Eq, Ord, Ordering, cmp, eq } from "./cmp.js";
import { id } from "./fn.js";
import type { Annotation } from "./annotation.js";
import type { Either } from "./either.js";
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

	/** Construct a `Right` with a `void` value. */
	export function unit<A = never>(): Ior<A, void> {
		return right(undefined);
	}

	/** Construct a `Both`. */
	export function both<A, B>(fst: A, snd: B): Ior<A, B> {
		return new Both(fst, snd);
	}

	/** Construct a `Both` with a `void` right-hand value. */
	export function write<A>(fst: A): Ior<A, void> {
		return both(fst, undefined);
	}

	/** Construct an `Ior` from an `Annotation`. */
	export function fromAnnotation<T, W>(anno: Annotation<T, W>): Ior<W, T> {
		return anno.match(right, (val, log) => both(log, val));
	}

	/** Construct an `Ior` from an `Either`. */
	export function fromEither<A, B>(either: Either<A, B>): Ior<A, B> {
		return either.match(left, right);
	}

	/** Construct an `Ior` from a `Validation`. */
	export function fromValidation<E, T>(vdn: Validation<E, T>): Ior<E, T> {
		return vdn.match(left, right);
	}

	/** Construct an `Ior` from a 2-tuple of values. */
	export function fromTuple<A, B>(tuple: readonly [A, B]): Ior<A, B> {
		return both(tuple[0], tuple[1]);
	}

	/** Evaluate an `Ior.Go` generator to return an `Ior`. */
	export function go<A extends Semigroup<A>, TReturn>(
		gen: Go<A, TReturn>,
	): Ior<A, TReturn> {
		let next = gen.next();
		let fsts: A | undefined;
		let halted = false;

		while (!next.done) {
			const ior = next.value;
			switch (ior.kind) {
				case Kind.LEFT:
					halted = true;
					fsts = fsts === undefined ? ior.val : cmb(fsts, ior.val);
					next = gen.return(undefined as never);
					break;
				case Kind.RIGHT:
					next = gen.next(ior.val);
					break;
				case Kind.BOTH:
					fsts =
						fsts === undefined
							? ior.fst
							: (fsts = cmb(fsts, ior.fst));
					next = gen.next(ior.snd);
			}
		}

		if (halted) {
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			return left(fsts!);
		}
		return fsts === undefined ? right(next.value) : both(fsts, next.value);
	}

	/**
	 * Evaluate a generator function that returns `Ior.Go` to return an `Ior`.
	 */
	export function fromGoFn<A extends Semigroup<A>, TReturn>(
		f: () => Go<A, TReturn>,
	): Ior<A, TReturn> {
		return go(f());
	}

	/**
	 * Adapt a generator function that returns `Ior.Go` into a function that
	 * returns `Ior`.
	 */
	export function wrapGoFn<
		TArgs extends unknown[],
		A extends Semigroup<A>,
		TReturn,
	>(
		f: (...args: TArgs) => Go<A, TReturn>,
	): (...args: TArgs) => Ior<A, TReturn> {
		return (...args) => go(f(...args));
	}

	/**
	 * Accumulate the elements in an iterable using a reducer function that
	 * returns `Ior`.
	 */
	export function reduce<T, TAcc, A extends Semigroup<A>>(
		elems: Iterable<T>,
		f: (acc: TAcc, elem: T, idx: number) => Ior<A, TAcc>,
		initial: TAcc,
	): Ior<A, TAcc> {
		return fromGoFn(function* () {
			let acc = initial;
			let idx = 0;
			for (const elem of elems) {
				acc = yield* f(acc, elem, idx);
				idx++;
			}
			return acc;
		});
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
		return fromGoFn(function* () {
			let idx = 0;
			for (const elem of elems) {
				builder.add(yield* f(elem, idx));
				idx++;
			}
			return builder.finish();
		});
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
			switch (this.kind) {
				case Kind.LEFT:
					return that.isLeft() && eq(this.val, that.val);
				case Kind.RIGHT:
					return that.isRight() && eq(this.val, that.val);
				case Kind.BOTH:
					return (
						that.isBoth() &&
						eq(this.fst, that.fst) &&
						eq(this.snd, that.snd)
					);
			}
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
			switch (this.kind) {
				case Kind.LEFT:
					return that.isLeft()
						? cmp(this.val, that.val)
						: Ordering.less;
				case Kind.RIGHT:
					switch (that.kind) {
						case Kind.LEFT:
							return Ordering.greater;
						case Kind.RIGHT:
							return cmp(this.val, that.val);
						case Kind.BOTH:
							return Ordering.less;
					}
				// eslint-disable-next-line no-fallthrough
				case Kind.BOTH:
					return that.isBoth()
						? cmb(cmp(this.fst, that.fst), cmp(this.snd, that.snd))
						: Ordering.greater;
			}
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
			switch (this.kind) {
				case Kind.LEFT:
					switch (that.kind) {
						case Kind.LEFT:
							return left(cmb(this.val, that.val));
						case Kind.RIGHT:
							return both(this.val, that.val);
						case Kind.BOTH:
							return both(cmb(this.val, that.fst), that.snd);
					}
				// eslint-disable-next-line no-fallthrough
				case Kind.RIGHT:
					switch (that.kind) {
						case Kind.LEFT:
							return both(that.val, this.val);
						case Kind.RIGHT:
							return right(cmb(this.val, that.val));
						case Kind.BOTH:
							return both(that.fst, cmb(this.val, that.snd));
					}
				// eslint-disable-next-line no-fallthrough
				case Kind.BOTH:
					switch (that.kind) {
						case Kind.LEFT:
							return both(cmb(this.fst, that.val), this.snd);
						case Kind.RIGHT:
							return both(this.fst, cmb(this.snd, that.val));
						case Kind.BOTH:
							return both(
								cmb(this.fst, that.fst),
								cmb(this.snd, that.snd),
							);
					}
			}
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
		match<A, B, T1, T2, T3>(
			this: Ior<A, B>,
			ifLeft: (val: A) => T1,
			ifRight: (val: B) => T2,
			ifBoth: (fst: A, snd: B) => T3,
		): T1 | T2 | T3 {
			switch (this.kind) {
				case Kind.LEFT:
					return ifLeft(this.val);
				case Kind.RIGHT:
					return ifRight(this.val);
				case Kind.BOTH:
					return ifBoth(this.fst, this.snd);
			}
		}

		/**
		 * If this `Ior` has a right-hand value, apply a function to the value
		 * to return another `Ior`.
		 */
		andThen<A extends Semigroup<A>, B, B1>(
			this: Ior<A, B>,
			f: (val: B) => Ior<A, B1>,
		): Ior<A, B1> {
			switch (this.kind) {
				case Kind.LEFT:
					return this;
				case Kind.RIGHT:
					return f(this.val);
				case Kind.BOTH: {
					const that = f(this.snd);
					switch (that.kind) {
						case Kind.LEFT:
							return left(cmb(this.fst, that.val));
						case Kind.RIGHT:
							return both(this.fst, that.val);
						case Kind.BOTH:
							return both(cmb(this.fst, that.fst), that.snd);
					}
				}
			}
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

		/** Remove one level of nesting from this `Ior`. */
		flatten<E extends Semigroup<E>, T>(this: Ior<E, Ior<E, T>>): Ior<E, T> {
			return this.andThen(id);
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
		mapLeft<A, B, A1>(this: Ior<A, B>, f: (val: A) => A1): Ior<A1, B> {
			switch (this.kind) {
				case Kind.LEFT:
					return left(f(this.val));
				case Kind.RIGHT:
					return this;
				case Kind.BOTH:
					return both(f(this.fst), this.snd);
			}
		}

		/**
		 * If this `Ior` has a right-hand value, apply a function to map the
		 * value.
		 */
		map<A, B, B1>(this: Ior<A, B>, f: (val: B) => B1): Ior<A, B1> {
			switch (this.kind) {
				case Kind.LEFT:
					return this;
				case Kind.RIGHT:
					return right(f(this.val));
				case Kind.BOTH:
					return both(this.fst, f(this.snd));
			}
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

		*[Symbol.iterator](): Generator<Ior<A, never>, never> {
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

		*[Symbol.iterator](): Generator<Ior<never, B>, B> {
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

		*[Symbol.iterator](): Generator<Ior<A, B>, B> {
			return (yield this) as B;
		}
	}

	/** A generator that yields `Ior` and returns a value. */
	export type Go<A extends Semigroup<A>, TReturn> = Generator<
		Ior<A, unknown>,
		TReturn
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
