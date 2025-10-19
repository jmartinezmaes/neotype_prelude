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
 * Optional values.
 *
 * @remarks
 *
 * {@link Maybe:type | `Maybe<T>`} is a type that represents an optional value.
 * It is represented by two variants: {@link Maybe.Nothing | `Nothing`} and
 * {@link Maybe.Just | `Just<T>`}.
 *
 * -   `Nothing` is the absent `Maybe` and contains no value.
 * -   A `Just<T>` is a present `Maybe` and contains a value of type `T`.
 *
 * The {@link Maybe:namespace | `Maybe`} companion namespace provides utilities
 * for working with the `Maybe<T>` type.
 *
 * Common uses for `Maybe` include:
 *
 * -   Initial values
 * -   Nullable values
 * -   Return values for functions that are not defined over their entire input
 *     range (partial functions)
 * -   Return values for reporting simple failures, where `Nothing` is returned
 *     on failure
 *
 * ## Importing from this module
 *
 * The types and namespaces from this module can be imported under the same
 * aliases:
 *
 * ```ts
 * import { Maybe } from "@neotype/prelude/maybe.js";
 * ```
 *
 * Or, they can be imported and aliased separately:
 *
 * ```ts
 * import { type Maybe, Maybe as M } from "@neotype/prelude/maybe.js";
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

/**
 * A type that represents either an absent value ({@linkcode Maybe.Nothing}) or
 * a present value ({@linkcode Maybe.Just}).
 */
export type Maybe<T> = Maybe.Nothing | Maybe.Just<T>;

/**
 * The companion namespace for the {@link Maybe:type | `Maybe<T>`} type.
 *
 * @remarks
 *
 * This namespace provides:
 *
 * -   Functions for constructing, chaining, and collecting into `Maybe`
 * -   A base class with the fluent API for `Maybe`
 * -   Variant classes
 * -   Utility types
 */
export namespace Maybe {
	/** Construct a `Just`. */
	export function just<T>(val: T): Maybe<T> {
		return new Just(val);
	}

	/** Construct a `Just` with a `void` value. */
	export function unit(): Maybe<void> {
		return just(undefined);
	}

	/**
	 * Consruct a `Maybe` from a value that is potentially `null` or
	 * `undefined`.
	 */
	export function fromNullish<T>(val: T | null | undefined): Maybe<T> {
		return val === null || val === undefined ? nothing : just(val);
	}

	/**
	 * Adapt a function that may return `null` or `undefined` into a function
	 * that returns `Maybe`.
	 */
	export function wrapNullishFn<TArgs extends unknown[], T>(
		f: (...args: TArgs) => T | null | undefined,
	): (...args: TArgs) => Maybe<T> {
		return (...args) => fromNullish(f(...args));
	}

	/** Adapt a predicate into a function that returns `Maybe`. */
	export function wrapPredicateFn<T, T1 extends T>(
		f: (val: T) => val is T1,
	): (val: T) => Maybe<T1>;

	export function wrapPredicateFn<T>(
		f: (val: T) => boolean,
	): (val: T) => Maybe<T>;

	export function wrapPredicateFn<T>(
		f: (val: T) => boolean,
	): (val: T) => Maybe<T> {
		return (val) => (f(val) ? just(val) : nothing);
	}

	/** Evaluate a `Maybe.Go` generator to return a `Maybe`. */
	export function go<TReturn>(gen: Go<TReturn>): Maybe<TReturn> {
		let next = gen.next();
		let halted = false;
		while (!next.done) {
			const maybe = next.value;
			if (maybe.isNothing()) {
				halted = true;
				next = gen.return(undefined as never);
			} else {
				next = gen.next(maybe.val);
			}
		}
		return halted ? nothing : just(next.value);
	}

	/**
	 * Evaluate a generator function that returns `Maybe.Go` to return a
	 * `Maybe`.
	 */
	export function fromGoFn<TReturn>(f: () => Go<TReturn>): Maybe<TReturn> {
		return go(f());
	}

	/**
	 * Adapt a generator function that returns `Maybe.Go` into a function that
	 * returns `Maybe`.
	 */
	export function wrapGoFn<TArgs extends unknown[], TReturn>(
		f: (...args: TArgs) => Go<TReturn>,
	): (...args: TArgs) => Maybe<TReturn> {
		return (...args) => go(f(...args));
	}

	/**
	 * Accumulate the elements in an iterable using a reducer function that
	 * returns `Maybe`.
	 */
	export function reduce<T, TAcc>(
		elems: Iterable<T>,
		f: (acc: TAcc, elem: T, idx: number) => Maybe<TAcc>,
		initial: TAcc,
	): Maybe<TAcc> {
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
	 * Map the elements in an iterable to `Maybe` and collect the `Just` values
	 * into a `Builder`.
	 *
	 * @remarks
	 *
	 * If any `Maybe` is `Nothing`, the state of the provided `Builder` is
	 * undefined.
	 */
	export function traverseInto<T, T1, TFinish>(
		elems: Iterable<T>,
		f: (elem: T, idx: number) => Maybe<T1>,
		builder: Builder<T1, TFinish>,
	): Maybe<TFinish> {
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
	 * Map the elements in an iterable to `Maybe` and collect the `Just` values
	 * in an array.
	 */
	export function traverse<T, T1>(
		elems: Iterable<T>,
		f: (elem: T, idx: number) => Maybe<T1>,
	): Maybe<T1[]> {
		return traverseInto(elems, f, new ArrayPushBuilder());
	}

	/**
	 * Evaluate the `Maybe` in an iterable and collect the `Just` values into a
	 * `Builder`.
	 *
	 * @remarks
	 *
	 * If any `Maybe` is `Nothing`, the state of the provided `Builder` is
	 * undefined.
	 */
	export function allInto<T, TFinish>(
		maybes: Iterable<Maybe<T>>,
		builder: Builder<T, TFinish>,
	): Maybe<TFinish> {
		return traverseInto(maybes, id, builder);
	}

	/**
	 * Evaluate the `Maybe` in an array or a tuple literal and collect the
	 * `Just` values in an equivalent structure.
	 *
	 * @remarks
	 *
	 * This function turns an array or a tuple literal of `Maybe` "inside out".
	 * For example:
	 *
	 * -   `Maybe<T>[]` becomes `Maybe<T[]>`
	 * -   `[Maybe<T1>, Maybe<T2>]` becomes `Maybe<[T1, T2]>`
	 */
	export function all<TMaybes extends readonly Maybe<any>[] | []>(
		maybes: TMaybes,
	): Maybe<{ -readonly [K in keyof TMaybes]: JustT<TMaybes[K]> }>;

	/**
	 * Evaluate the `Maybe` in an iterable and collect the `Just` values in an
	 * array.
	 *
	 * @remarks
	 *
	 * This function turns an iterable of `Maybe` "inside out". For example,
	 * `Iterable<Maybe<T>>` becomes `Maybe<T[]>`.
	 */
	export function all<T>(maybes: Iterable<Maybe<T>>): Maybe<T[]>;

	export function all<T>(maybes: Iterable<Maybe<T>>): Maybe<T[]> {
		return traverse(maybes, id);
	}

	/**
	 * Evaluate the `Maybe` in a string-keyed record or object literal and
	 * collect the `Just` values in an equivalent structure.
	 *
	 * @remarks
	 *
	 * This function turns a string-keyed record or object literal of `Maybe`
	 * "inside out". For example:
	 *
	 * -   `Record<string, Maybe<T>>` becomes `Maybe<Record<string, T>>`
	 * -   `{ x: Maybe<T1>, y: Maybe<T2> }` becomes `Maybe<{ x: T1, y: T2 }>`
	 */
	export function allProps<TMaybes extends Record<string, Maybe<any>>>(
		props: TMaybes,
	): Maybe<{ -readonly [K in keyof TMaybes]: JustT<TMaybes[K]> }>;

	export function allProps<T>(
		props: Record<string, Maybe<T>>,
	): Maybe<Record<string, T>> {
		return traverseInto(
			Object.entries(props),
			([key, elem]) => elem.map((val) => [key, val] as const),
			new ObjectAssignBuilder(),
		);
	}

	/**
	 * Apply an action that returns `Maybe` to the elements in an iterable and
	 * ignore the `Just` values.
	 */
	export function forEach<T>(
		elems: Iterable<T>,
		f: (elem: T, idx: number) => Maybe<any>,
	): Maybe<void> {
		return traverseInto(elems, f, new NoOpBuilder());
	}

	/** Adapt a synchronous function to be applied in the context of `Maybe`. */
	export function lift<TArgs extends unknown[], T>(
		f: (...args: TArgs) => T,
	): (...maybes: { [K in keyof TArgs]: Maybe<TArgs[K]> }) => Maybe<T> {
		return (...maybes) => all(maybes).map((args) => f(...args));
	}

	/** An enumeration that discriminates `Maybe`. */
	export enum Kind {
		NOTHING,
		JUST,
	}

	/** The fluent syntax for `Maybe`. */
	export abstract class Syntax {
		/** The property that discriminates `Maybe`. */
		abstract readonly kind: Kind;

		/**
		 * Compare this and that `Maybe` to determine their equality.
		 *
		 * @remarks
		 *
		 * Two `Maybe` are equal if they are both `Nothing`, or they are both
		 * both `Just` and their values are equal.
		 */
		[Eq.eq]<T extends Eq<T>>(this: Maybe<T>, that: Maybe<T>): boolean {
			return this.isNothing()
				? that.isNothing()
				: that.isJust() && eq(this.val, that.val);
		}

		/**
		 * Compare this and that `Maybe` to determine their ordering.
		 *
		 * @remarks
		 *
		 * When ordered, `Nothing` always compares as less than `Just`. If
		 * both are `Just`, their values are compared to determine the ordering.
		 */
		[Ord.cmp]<T extends Ord<T>>(this: Maybe<T>, that: Maybe<T>): Ordering {
			if (this.isNothing()) {
				return that.isNothing() ? Ordering.equal : Ordering.less;
			}
			return that.isNothing()
				? Ordering.greater
				: cmp(this.val, that.val);
		}

		/**
		 * If this and that `Maybe` are `Just`, combine their values; otherwise,
		 * return the first `Maybe` that is not `Nothing`.
		 */
		[Semigroup.cmb]<T extends Semigroup<T>>(
			this: Maybe<T>,
			that: Maybe<T>,
		): Maybe<T> {
			if (this.isNothing()) {
				return that;
			}
			return that.isNothing() ? this : just(cmb(this.val, that.val));
		}

		/** Test whether this `Maybe` is `Nothing`. */
		isNothing(this: Maybe<any>): this is Nothing {
			return this.kind === Kind.NOTHING;
		}

		/** Test whether this `Maybe` is `Just`. */
		isJust<T>(this: Maybe<T>): this is Just<T> {
			return this.kind === Kind.JUST;
		}

		/**
		 * If this `Maybe` is `Just`, apply a function to extract its value;
		 * otherwise, invoke a function to return a fallback value.
		 */
		match<T, T1, T2>(
			this: Maybe<T>,
			ifNothing: () => T1,
			ifJust: (val: T) => T2,
		): T1 | T2 {
			return this.isNothing() ? ifNothing() : ifJust(this.val);
		}

		/**
		 * If this `Maybe` is `Just`, extract its value; otherwise, invoke a
		 * function to return a fallback value.
		 */
		unwrapOrElse<T, T1>(this: Maybe<T>, ifNothing: () => T1): T | T1 {
			return this.match(ifNothing, id);
		}

		/**
		 * If this `Maybe` is `Just`, extract its value; otherwise, return a
		 * fallback value.
		 */
		unwrapOr<T, T1>(this: Maybe<T>, fallback: T1): T | T1 {
			return this.unwrapOrElse(() => fallback);
		}

		/**
		 * If this `Maybe` is `Just`, extract its value; otherwise, return
		 * `undefined`.
		 */
		toNullish<T>(this: Maybe<T>): T | undefined {
			return this.unwrapOr(undefined);
		}

		/**
		 * If this `Maybe` is `Nothing`, invoke a function to return a fallback
		 * `Maybe`.
		 */
		orElse<T, T1>(this: Maybe<T>, f: () => Maybe<T1>): Maybe<T | T1> {
			return this.isNothing() ? f() : this;
		}

		/** If this `Maybe` is `Nothing`, return that `Maybe`. */
		or<T, T1>(this: Maybe<T>, that: Maybe<T1>): Maybe<T | T1> {
			return this.orElse(() => that);
		}

		/** If this or that `Maybe` is exclusively `Just`, return the `Just`. */
		xor<T, T1>(this: Maybe<T>, that: Maybe<T1>): Maybe<T | T1> {
			if (this.isNothing()) {
				return that;
			}
			return that.isNothing() ? this : nothing;
		}

		/**
		 * If this `Maybe` is `Just`, apply a function to its value to return
		 * another `Maybe`.
		 */
		andThen<T, T1>(this: Maybe<T>, f: (val: T) => Maybe<T1>): Maybe<T1> {
			return this.isNothing() ? this : f(this.val);
		}

		/**
		 * If this `Maybe` is `Just`, apply a generator function to its value
		 * to return another `Maybe`.
		 */
		andThenGo<T, T1>(this: Maybe<T>, f: (val: T) => Go<T1>): Maybe<T1> {
			return this.andThen((val) => go(f(val)));
		}

		/** Remove one level of nesting from this `Maybe`. */
		flatten<T>(this: Maybe<Maybe<T>>): Maybe<T> {
			return this.andThen(id);
		}

		/**
		 * If this `Maybe` is `Just`, ignore its value and return that `Maybe`.
		 */
		and<T1>(this: Maybe<any>, that: Maybe<T1>): Maybe<T1> {
			return this.andThen(() => that);
		}

		/**
		 * If this `Maybe` is `Just`, apply a partial function to map its value.
		 *
		 * @remarks
		 *
		 * If the function returns `null` or `undefined`, return `Nothing`.
		 */
		mapNullish<T, T1>(
			this: Maybe<T>,
			f: (val: T) => T1 | null | undefined,
		): Maybe<T1> {
			return this.andThen((val) => fromNullish(f(val)));
		}

		/**
		 * If this `Maybe` is `Just`, apply a predicate to filter its value.
		 *
		 * @remarks
		 *
		 * If the predicate returns `false`, return `Nothing`.
		 */
		filter<T, T1 extends T>(
			this: Maybe<T>,
			f: (val: T) => val is T1,
		): Maybe<T1>;

		filter<T>(this: Maybe<T>, f: (val: T) => boolean): Maybe<T>;

		filter<T>(this: Maybe<T>, f: (val: T) => boolean): Maybe<T> {
			return this.andThen((val) => (f(val) ? just(val) : nothing));
		}

		/**
		 * If this and that `Maybe` are `Just`, apply a function to combine
		 * their values.
		 */
		zipWith<T, T1, T2>(
			this: Maybe<T>,
			that: Maybe<T1>,
			f: (lhs: T, rhs: T1) => T2,
		): Maybe<T2> {
			return this.andThen((lhs) => that.map((rhs) => f(lhs, rhs)));
		}

		/** If this `Maybe` is `Just`, apply a function to map its value. */
		map<T, T1>(this: Maybe<T>, f: (val: T) => T1): Maybe<T1> {
			return this.andThen((val) => just(f(val)));
		}
	}

	/** An absent `Maybe`. */
	export class Nothing extends Syntax {
		/**
		 * The singleton instance of `Nothing`.
		 *
		 * @remarks
		 *
		 * The {@linkcode nothing} constant is a more accessible alias for this
		 * object.
		 */
		static readonly singleton = new Nothing();

		readonly kind = Kind.NOTHING;

		private constructor() {
			super();
		}

		*[Symbol.iterator](): Generator<Maybe<never>, never> {
			return (yield this) as never;
		}
	}

	/** A present `Maybe`. */
	export class Just<out T> extends Syntax {
		readonly kind = Kind.JUST;

		/** The value of this `Maybe`. */
		readonly val: T;

		constructor(val: T) {
			super();
			this.val = val;
		}

		*[Symbol.iterator](): Generator<Maybe<T>, T> {
			return (yield this) as T;
		}
	}

	/** The absent `Maybe`. */
	export const nothing = Maybe.Nothing.singleton as Maybe<never>;

	/** A generator that yields `Maybe` and returns a value. */
	export type Go<TReturn> = Generator<Maybe<unknown>, TReturn>;

	/** Extract the `Just` value type `T` from the type `Maybe<T>`. */
	export type JustT<TMaybe extends Maybe<any>> = TMaybe extends Maybe<infer T>
		? T
		: never;
}
