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
 * Logging and accumulating information.
 *
 * @remarks
 *
 * {@link Annotation:type | `Annotation<T, W>`} is a type that represents a
 * value and additional accumulating information. It is represented by two
 * variants: {@link Annotation.Value | `Value<T>`} and
 * {@link Annotation.Note | `Note<T, W>`}.
 *
 * -   A `Value<T>` contains a value of type `T` and no additional information.
 * -   A `Note<T, W>` contains a value of type `T` and additional information of
 *     type `W`.
 *
 * The {@link Annotation:namespace | `Annotation`} companion namespace provides
 * utilities for working with the `Annotation<T, W>` type.
 *
 * `Annotation` is useful for collecting and accumulating information in a
 * program that does not constitute an error state. Examples include logs,
 * warnings, and metadata. When composed, `Annotation` will accumulate this
 * information.
 *
 * Most combinators for `Annotation` require a `Semigroup` implementation from
 * the accumulating information.
 *
 * ## Using `Annotation` with promises
 *
 * {@link AsyncAnnotation:type | `AsyncAnnotation<T, W>`} is an alias for
 * `Promise<Annotation<T, W>>`. The
 * {@link AsyncAnnotation:namespace | `AsyncAnnotation`} companion namespace
 * provides utilities for working with the `AsyncAnnotation<T, W>` type.
 *
 * To accommodate promise-like values, this module also provides the
 * {@link AsyncAnnotationLike | `AsyncAnnotationLike<T, W>`} type as an alias
 * for `PromiseLike<Annotation<T, W>>`.
 *
 * ## Importing from this module
 *
 * The type aliases and namespaces from this module can be imported under the
 * same aliases:
 *
 * ```ts
 * import { Annotation, AsyncAnnotation } from "@neotype/prelude/annotation.js";
 * ```
 *
 * Or, the types and namespaces can be imported and aliased separately:
 *
 * ```ts
 * import {
 *     type Annotation,
 *     type AsyncAnnotation,
 *     Annotation as A,
 *     AsyncAnnotation as AA
 * } from "@neotype/prelude/annotation.js";
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
 * A type that represents a simple value ({@linkcode Annotation.Value}) or a
 * value and accumulating information ({@linkcode Annotation.Note}).
 */
export type Annotation<T, W> = Annotation.Value<T> | Annotation.Note<T, W>;

/**
 * The companion namespace for the {@link Annotation:type | `Annotation<T, W>`}
 * type.
 *
 * @remarks
 *
 * This namespace provides:
 *
 * -   Functions for constructing, chaining, and collecting into `Annotation`
 * -   A base class with the fluent API for `Annotation`
 * -   Variant classes
 * -   Utility types
 */
export namespace Annotation {
	/** Construct a `Value`. */
	export function value<T, W = never>(val: T): Annotation<T, W> {
		return new Value(val);
	}

	/** Construct a `Value` with a `void` value. */
	export function unit<W = never>(): Annotation<void, W> {
		return value(undefined);
	}

	/** Construct a `Note`. */
	export function note<T, W>(val: T, log: W): Annotation<T, W> {
		return new Note(val, log);
	}

	/** Write an entry to the log. */
	export function write<W>(log: W): Annotation<void, W> {
		return note(undefined, log);
	}

	/** Evaluate an `Annotation.Go` generator to return an `Annotation`. */
	export function go<TReturn, W extends Semigroup<W>>(
		gen: Go<TReturn, W>,
	): Annotation<TReturn, W> {
		let next = gen.next();
		let logs: W | undefined;
		while (!next.done) {
			const anno = next.value;
			if (anno.isNote()) {
				logs = logs === undefined ? anno.log : cmb(logs, anno.log);
			}
			next = gen.next(anno.val);
		}
		return logs === undefined ? value(next.value) : note(next.value, logs);
	}

	/**
	 * Evaluate a generator function that returns `Annotation.Go` to return an
	 * `Annotation`.
	 */
	export function fromGoFn<TReturn, W extends Semigroup<W>>(
		f: () => Go<TReturn, W>,
	): Annotation<TReturn, W> {
		return go(f());
	}

	/**
	 * Adapt a generator function that returns `Annotation.Go` into a function
	 * that returns `Annotation`.
	 */
	export function wrapGoFn<
		TArgs extends unknown[],
		TReturn,
		W extends Semigroup<W>,
	>(
		f: (...args: TArgs) => Go<TReturn, W>,
	): (...args: TArgs) => Annotation<TReturn, W> {
		return (...args) => go(f(...args));
	}

	/**
	 * Accumulate the elements in an iterable using a reducer function that
	 * returns `Annotation`.
	 */
	export function reduce<T, TAcc, W extends Semigroup<W>>(
		elems: Iterable<T>,
		f: (acc: TAcc, elem: T, idx: number) => Annotation<TAcc, W>,
		initial: TAcc,
	): Annotation<TAcc, W> {
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
	 * Map the elements in an iterable to `Annotation` and collect the values
	 * into a `Builder`.
	 */
	export function traverseInto<T, T1, W extends Semigroup<W>, TFinish>(
		elems: Iterable<T>,
		f: (elem: T, idx: number) => Annotation<T1, W>,
		builder: Builder<T1, TFinish>,
	): Annotation<TFinish, W> {
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
	 * Map the elements in an iterable to `Annotation` and collect the values in
	 * an array.
	 */
	export function traverse<T, T1, W extends Semigroup<W>>(
		elems: Iterable<T>,
		f: (elem: T, idx: number) => Annotation<T1, W>,
	): Annotation<T1[], W> {
		return traverseInto(elems, f, new ArrayPushBuilder());
	}

	/**
	 * Evaluate the `Annotation` in an iterable and collect the values into a
	 * `Builder`.
	 */
	export function allInto<T, W extends Semigroup<W>, TFinish>(
		annos: Iterable<Annotation<T, W>>,
		builder: Builder<T, TFinish>,
	): Annotation<TFinish, W> {
		return traverseInto(annos, id, builder);
	}

	/**
	 * Evaluate the `Annotation` in an array or a tuple literal and collect the
	 * values in an equivalent structure.
	 *
	 * @remarks
	 *
	 * This function turns an array or a tuple literal of `Annotation` "inside
	 * out". For example:
	 *
	 * -   `Annotation<T, W>[]` becomes `Annotation<T[], W>`
	 * -   `[Annotation<T1, W>, Annotation<T2, W>]` becomes `Annotation<[T1,
	 *     T2], W>`
	 */
	export function all<
		TAnnos extends readonly Annotation<any, Semigroup<any>>[] | [],
	>(
		annos: TAnnos,
	): Annotation<
		{ -readonly [K in keyof TAnnos]: ValT<TAnnos[K]> },
		LogT<TAnnos[number]>
	>;

	/**
	 * Evaluate the `Annotation` in an iterable and collect the values in an
	 * array.
	 *
	 * @remarks
	 *
	 * This function turns an iterable of `Annotation` "inside out". For
	 * example, `Iterable<Annotation<T, W>>` becomes `Annotation<T[], W>`.
	 */
	export function all<T, W extends Semigroup<W>>(
		annos: Iterable<Annotation<T, W>>,
	): Annotation<T[], W>;

	export function all<T, W extends Semigroup<W>>(
		annos: Iterable<Annotation<T, W>>,
	): Annotation<T[], W> {
		return traverse(annos, id);
	}

	/**
	 * Evaluate the `Annotation` in a string-keyed record or object literal and
	 * collect the values in an equivalent structure.
	 *
	 * @remarks
	 *
	 * This function turns a string-keyed record or object literal of
	 * `Annotation` "inside out". For example:
	 *
	 * -   `Record<string, Annotation<T, W>>` becomes `Annotation<Record<string,
	 *     T>, W>`
	 * -   `{ x: Annotation<T1, W>, y: Annotation<T2, W> }` becomes
	 *     `Annotation<{ x: T1, y: T2 }, W>`
	 */
	export function allProps<
		TProps extends Record<string, Annotation<any, Semigroup<any>>>,
	>(
		props: TProps,
	): Annotation<
		{ -readonly [K in keyof TProps]: ValT<TProps[K]> },
		LogT<TProps[keyof TProps]>
	>;

	export function allProps<T, W extends Semigroup<W>>(
		props: Record<string, Annotation<T, W>>,
	): Annotation<Record<string, T>, W> {
		return traverseInto(
			Object.entries(props),
			([key, elem]) => elem.map((val) => [key, val] as const),
			new ObjectAssignBuilder(),
		);
	}

	/**
	 * Apply an action that returns `Annotation` to the elements in an iterable
	 * and ignore the values.
	 */
	export function forEach<T, W extends Semigroup<W>>(
		elems: Iterable<T>,
		f: (elem: T, idx: number) => Annotation<any, W>,
	): Annotation<void, W> {
		return traverseInto(elems, f, new NoOpBuilder());
	}

	/**
	 * Adapt a synchronous function to be applied in the context of
	 * `Annotation`.
	 */
	export function lift<TArgs extends unknown[], T>(
		f: (...args: TArgs) => T,
	): <W extends Semigroup<W>>(
		...annos: { [K in keyof TArgs]: Annotation<TArgs[K], W> }
	) => Annotation<T, W> {
		return (...annos) =>
			all(annos).map((args) => f(...(args as TArgs))) as Annotation<
				T,
				any
			>;
	}

	/** An enumeration that discrimiates `Annotation`. */
	export enum Kind {
		VALUE,
		NOTE,
	}

	/** The fluent syntax for `Annotation`. */
	export abstract class Syntax {
		/** The property that discriminates `Annotation`. */
		abstract readonly kind: Kind;

		/**
		 * Compare this and that `Annotation` to determine their equality.
		 *
		 * @remarks
		 *
		 * Two `Annotation` are equal if they are both `Value` and their values
		 * are equal, or they are both `Note` and their values and logs are
		 * respectively equal.
		 */
		[Eq.eq]<T extends Eq<T>, W extends Eq<W>>(
			this: Annotation<T, W>,
			that: Annotation<T, W>,
		): boolean {
			return this.isValue()
				? that.isValue() && eq(this.val, that.val)
				: that.isNote() &&
						eq(this.val, that.val) &&
						eq(this.log, that.log);
		}

		/**
		 * Compare this and that Annotation to determine their ordering.
		 *
		 * @remarks
		 *
		 * When ordered, `Value` always compares as less than `Note`. If both
		 * variants are `Value`, their values are compared to determine the
		 * ordering. If both variants are `Note`, their values and logs are
		 * compared lexicographically to determine the ordering.
		 */
		[Ord.cmp]<T extends Ord<T>, W extends Ord<W>>(
			this: Annotation<T, W>,
			that: Annotation<T, W>,
		): Ordering {
			if (this.isValue()) {
				return that.isValue() ? cmp(this.val, that.val) : Ordering.less;
			}
			return that.isNote()
				? cmb(cmp(this.val, that.val), cmp(this.log, that.log))
				: Ordering.greater;
		}

		/** Combine the values of this and that `Annotation`. */
		[Semigroup.cmb]<T extends Semigroup<T>, W extends Semigroup<W>>(
			this: Annotation<T, W>,
			that: Annotation<T, W>,
		): Annotation<T, W> {
			return this.zipWith(that, cmb);
		}

		/** Test whether this `Annotation` is `Value`. */
		isValue<T>(this: Annotation<T, any>): this is Value<T> {
			return this.kind === Kind.VALUE;
		}

		/** Test whether this `Annotation` is `Note`. */
		isNote<T, W>(this: Annotation<T, W>): this is Note<T, W> {
			return this.kind === Kind.NOTE;
		}

		/**
		 * Apply one of two functions to extract the value and log from this
		 * `Annotation`, depending on the variant.
		 */
		match<T, W, T1, T2>(
			this: Annotation<T, W>,
			ifValue: (val: T) => T1,
			ifNote: (val: T, log: W) => T2,
		): T1 | T2 {
			return this.isValue()
				? ifValue(this.val)
				: ifNote(this.val, this.log);
		}

		/**
		 * Apply a function to the value of this `Annotation` to return another
		 * `Annotation`.
		 */
		andThen<T, W extends Semigroup<W>, T1>(
			this: Annotation<T, W>,
			f: (val: T) => Annotation<T1, W>,
		): Annotation<T1, W> {
			if (this.isValue()) {
				return f(this.val);
			}
			const that = f(this.val);
			return that.isValue()
				? note(that.val, this.log)
				: note(that.val, cmb(this.log, that.log));
		}

		/**
		 * Apply a generator function to the value of this `Annotation` to
		 * return another `Annotation`.
		 */
		andThenGo<T, W extends Semigroup<W>, T1>(
			this: Annotation<T, W>,
			f: (val: T) => Go<T1, W>,
		): Annotation<T1, W> {
			return this.andThen((val) => go(f(val)));
		}

		/** Remove one level of nesting from this `Annotation`. */
		flatten<T, W extends Semigroup<W>>(
			this: Annotation<Annotation<T, W>, W>,
		): Annotation<T, W> {
			return this.andThen(id);
		}

		/**
		 * Ignore the value of this `Annotation` and keep the value of that
		 * `Annotation`.
		 */
		and<T1, W extends Semigroup<W>>(
			this: Annotation<any, W>,
			that: Annotation<T1, W>,
		): Annotation<T1, W> {
			return this.andThen(() => that);
		}

		/**
		 * Apply a function to combine the values of this and that `Annotation`.
		 */
		zipWith<T, W extends Semigroup<W>, T1, T2>(
			this: Annotation<T, W>,
			that: Annotation<T1, W>,
			f: (lhs: T, rhs: T1) => T2,
		): Annotation<T2, W> {
			return this.andThen((lhs) => that.map((rhs) => f(lhs, rhs)));
		}

		/** Apply a function to map the value of this `Annotation`. */
		map<T, W, T1>(
			this: Annotation<T, W>,
			f: (val: T) => T1,
		): Annotation<T1, W> {
			return this.isValue()
				? value(f(this.val))
				: note(f(this.val), this.log);
		}

		/** Apply a function to map the log of this `Annotation`. */
		mapLog<T, W, W1>(
			this: Annotation<T, W>,
			f: (log: W) => W1,
		): Annotation<T, W1> {
			return this.isValue() ? this : note(this.val, f(this.log));
		}

		/**
		 * Apply a function to the value of this `Annotation` and append the
		 * result to the log.
		 */
		notateWith<T, W extends Semigroup<W>>(
			this: Annotation<T, W>,
			f: (val: T) => W,
		): Annotation<T, W> {
			return this.andThen((val) => note(val, f(val)));
		}

		/** Write an entry to the log of this `Annotation`. */
		notate<T, W extends Semigroup<W>>(
			this: Annotation<T, W>,
			log: W,
		): Annotation<T, W> {
			return this.notateWith(() => log);
		}

		/** Erase the log of this `Annotation`. */
		eraseLog<T>(this: Annotation<T, any>): Annotation<T, never> {
			return this.isValue() ? this : value(this.val);
		}
	}

	/** An `Annotation` with a value. */
	export class Value<out T> extends Syntax {
		readonly kind = Kind.VALUE;

		/** The value of this `Annotation`. */
		readonly val: T;

		constructor(val: T) {
			super();
			this.val = val;
		}

		*[Symbol.iterator](): Generator<Annotation<T, never>, T> {
			return (yield this) as T;
		}
	}

	/** An `Annotation` with a value and a log. */
	export class Note<out T, out W> extends Syntax {
		readonly kind = Kind.NOTE;

		/** The value of this `Annotation`. */
		readonly val: T;

		/** The log of this `Annotation`. */
		readonly log: W;

		constructor(val: T, log: W) {
			super();
			this.val = val;
			this.log = log;
		}

		*[Symbol.iterator](): Generator<Annotation<T, W>, T> {
			return (yield this) as T;
		}
	}

	/** A generator that yields `Annotation` and returns a value. */
	export type Go<TReturn, W extends Semigroup<W>> = Generator<
		Annotation<unknown, W>,
		TReturn
	>;

	/** Extract the value type `T` from the type `Annotation<T, W>`. */
	export type ValT<TAnno extends Annotation<any, any>> = [TAnno] extends [
		Annotation<infer T, any>,
	]
		? T
		: never;

	/** Extract the log type `W` from the type `Annotation<T, W>`. */
	export type LogT<TAnno extends Annotation<any, any>> = [TAnno] extends [
		Annotation<any, infer W>,
	]
		? W
		: never;
}
