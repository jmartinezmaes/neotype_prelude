/*
 * Copyright 2022-2023 Joshua Martinez-Maes
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
import { Maybe } from "./maybe.js";

export type Annotation<T, W> = Annotation.Value<T> | Annotation.Note<T, W>;

export namespace Annotation {
	export function value<T, W = never>(val: T): Annotation<T, W> {
		return new Value(val);
	}

	export function note<T, W>(val: T, log: W): Annotation<T, W> {
		return new Note(val, log);
	}

	export function write<W, T = void>(log: W): Annotation<T, W> {
		return note(undefined as T, log);
	}

	export function go<W extends Semigroup<W>, TReturn>(
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

	export function wrapGoFn<
		TArgs extends unknown[],
		W extends Semigroup<W>,
		TReturn,
	>(
		f: (...args: TArgs) => Go<TReturn, W>,
	): (...args: TArgs) => Annotation<TReturn, W> {
		return (...args) => go(f(...args));
	}

	export function reduce<T, TAcc, W extends Semigroup<W>>(
		elems: Iterable<T>,
		f: (acc: TAcc, elem: T, idx: number) => Annotation<TAcc, W>,
		initial: TAcc,
	): Annotation<TAcc, W> {
		return go(
			(function* () {
				let acc = initial;
				let idx = 0;
				for (const elem of elems) {
					acc = yield* f(acc, elem, idx);
					idx++;
				}
				return acc;
			})(),
		);
	}

	export function traverseInto<T, T1, W extends Semigroup<W>, TFinish>(
		elems: Iterable<T>,
		f: (elem: T, idx: number) => Annotation<T1, W>,
		builder: Builder<T1, TFinish>,
	): Annotation<TFinish, W> {
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

	export function traverse<T, T1, W extends Semigroup<W>>(
		elems: Iterable<T>,
		f: (elem: T, idx: number) => Annotation<T1, W>,
	): Annotation<T1[], W> {
		return traverseInto(elems, f, new ArrayPushBuilder());
	}

	export function allInto<T, W extends Semigroup<W>, TFinish>(
		annos: Iterable<Annotation<T, W>>,
		builder: Builder<T, TFinish>,
	): Annotation<TFinish, W> {
		return traverseInto(annos, id, builder);
	}

	export function all<
		TAnnos extends readonly Annotation<any, Semigroup<any>>[] | [],
	>(
		annos: TAnnos,
	): Annotation<
		{ -readonly [K in keyof TAnnos]: ValueT<TAnnos[K]> },
		NoteT<TAnnos[number]>
	>;

	export function all<T, W extends Semigroup<W>>(
		annos: Iterable<Annotation<T, W>>,
	): Annotation<T[], W>;

	export function all<T, W extends Semigroup<W>>(
		annos: Iterable<Annotation<T, W>>,
	): Annotation<T[], W> {
		return traverse(annos, id);
	}

	export function allProps<
		TProps extends Record<string, Annotation<any, Semigroup<any>>>,
	>(
		props: TProps,
	): Annotation<
		{ -readonly [K in keyof TProps]: ValueT<TProps[K]> },
		NoteT<TProps[keyof TProps]>
	>;

	export function allProps<T, W extends Semigroup<W>>(
		props: Record<string, Annotation<T, W>>,
	): Annotation<Record<string, T>, W>;

	export function allProps<T, W extends Semigroup<W>>(
		props: Record<string, Annotation<T, W>>,
	): Annotation<Record<string, T>, W> {
		return traverseInto(
			Object.entries(props),
			([key, elem]) => elem.map((val) => [key, val] as const),
			new ObjectAssignBuilder(),
		);
	}

	export function forEach<T, W extends Semigroup<W>>(
		elems: Iterable<T>,
		f: (elem: T, idx: number) => Annotation<any, W>,
	): Annotation<void, W> {
		return traverseInto(elems, f, new NoOpBuilder());
	}

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

	export enum Kind {
		VALUE,
		NOTE,
	}

	export abstract class Syntax {
		abstract readonly kind: Kind;

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

		[Semigroup.cmb]<T extends Semigroup<T>, W extends Semigroup<W>>(
			this: Annotation<T, W>,
			that: Annotation<T, W>,
		): Annotation<T, W> {
			return this.zipWith(that, cmb);
		}

		isValue<T>(this: Annotation<T, any>): this is Value<T> {
			return this.kind === Kind.VALUE;
		}

		isNote<T, W>(this: Annotation<T, W>): this is Note<T, W> {
			return this.kind === Kind.NOTE;
		}

		match<T, W, T1, T2>(
			this: Annotation<T, W>,
			ifValue: (val: T) => T1,
			ifNote: (val: T, log: W) => T2,
		): T1 | T2 {
			return this.isValue()
				? ifValue(this.val)
				: ifNote(this.val, this.log);
		}

		unwrap<T, W, T1>(
			this: Annotation<T, W>,
			f: (val: T, log: Maybe<W>) => T1,
		): T1 {
			return this.match(
				(val) => f(val, Maybe.nothing),
				(val, log) => f(val, Maybe.just(log)),
			);
		}

		getLog<W>(this: Annotation<any, W>): Maybe<W> {
			return this.isValue() ? Maybe.nothing : Maybe.just(this.log);
		}

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

		andThenGo<T, W extends Semigroup<W>, T1>(
			this: Annotation<T, W>,
			f: (val: T) => Go<T1, W>,
		): Annotation<T1, W> {
			return this.andThen((val) => go(f(val)));
		}

		flatten<T, W extends Semigroup<W>>(
			this: Annotation<Annotation<T, W>, W>,
		): Annotation<T, W> {
			return this.andThen(id);
		}

		and<T1, W extends Semigroup<W>>(
			this: Annotation<any, W>,
			that: Annotation<T1, W>,
		): Annotation<T1, W> {
			return this.andThen(() => that);
		}

		zipWith<T, W extends Semigroup<W>, T1, T2>(
			this: Annotation<T, W>,
			that: Annotation<T1, W>,
			f: (lhs: T, rhs: T1) => T2,
		): Annotation<T2, W> {
			return this.andThen((lhs) => that.map((rhs) => f(lhs, rhs)));
		}

		map<T, W, T1>(
			this: Annotation<T, W>,
			f: (val: T) => T1,
		): Annotation<T1, W> {
			return this.isValue()
				? value(f(this.val))
				: note(f(this.val), this.log);
		}

		mapNote<T, W, W1>(
			this: Annotation<T, W>,
			f: (log: W) => W1,
		): Annotation<T, W1> {
			return this.isValue() ? this : note(this.val, f(this.log));
		}

		notate<T, W extends Semigroup<W>>(
			this: Annotation<T, W>,
			f: (val: T) => W,
		): Annotation<T, W> {
			return this.andThen((val) => note(val, f(val)));
		}

		erase<T>(this: Annotation<T, any>): Annotation<T, never> {
			return this.isValue() ? this : value(this.val);
		}

		review<T, W>(this: Annotation<T, W>): Annotation<[T, Maybe<W>], W> {
			return this.map((val) => [val, this.getLog()]);
		}
	}

	export class Value<out T> extends Syntax {
		readonly kind = Kind.VALUE;

		readonly val: T;

		constructor(val: T) {
			super();
			this.val = val;
		}

		*[Symbol.iterator](): Generator<Annotation<T, never>, T> {
			return (yield this) as T;
		}
	}

	export class Note<out T, out W> extends Syntax {
		readonly kind = Kind.NOTE;

		readonly val: T;

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

	export type Go<TReturn, W extends Semigroup<W>> = Generator<
		Annotation<unknown, W>,
		TReturn
	>;

	export type ValueT<TAnno extends Annotation<any, any>> = [TAnno] extends [
		Annotation<infer T, any>,
	]
		? T
		: never;

	export type NoteT<TAnno extends Annotation<any, any>> = [TAnno] extends [
		Annotation<any, infer W>,
	]
		? W
		: never;
}

export type AsyncAnnotationLike<T, W> = PromiseLike<Annotation<T, W>>;

export type AsyncAnnotation<T, W> = Promise<Annotation<T, W>>;

export namespace AsyncAnnotation {
	export async function go<W extends Semigroup<W>, TReturn>(
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

	export function wrapGoFn<
		TArgs extends unknown[],
		W extends Semigroup<W>,
		TReturn,
	>(
		f: (...args: TArgs) => Go<TReturn, W>,
	): (...args: TArgs) => AsyncAnnotation<TReturn, W> {
		return (...args) => go(f(...args));
	}

	export function reduce<T, TAcc, W extends Semigroup<W>>(
		elems: AsyncIterable<T>,
		f: (
			acc: TAcc,
			elem: T,
			idx: number,
		) => Annotation<TAcc, W> | AsyncAnnotationLike<TAcc, W>,
		initial: TAcc,
	): AsyncAnnotation<TAcc, W> {
		return go(
			(async function* () {
				let acc = initial;
				let idx = 0;
				for await (const elem of elems) {
					acc = yield* await f(acc, elem, idx);
					idx++;
				}
				return acc;
			})(),
		);
	}

	export function traverseInto<T, T1, W extends Semigroup<W>, TFinish>(
		elems: AsyncIterable<T>,
		f: (
			elem: T,
			idx: number,
		) => Annotation<T1, W> | AsyncAnnotationLike<T1, W>,
		builder: Builder<T1, TFinish>,
	): AsyncAnnotation<TFinish, W> {
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

	export function traverse<T, T1, W extends Semigroup<W>>(
		elems: AsyncIterable<T>,
		f: (
			elem: T,
			idx: number,
		) => Annotation<T1, W> | AsyncAnnotationLike<T1, W>,
	): AsyncAnnotation<T1[], W> {
		return traverseInto(elems, f, new ArrayPushBuilder());
	}

	export function allInto<T, W extends Semigroup<W>, TFinish>(
		elems: AsyncIterable<Annotation<T, W>>,
		builder: Builder<T, TFinish>,
	): AsyncAnnotation<TFinish, W> {
		return traverseInto(elems, id, builder);
	}

	export function all<T, W extends Semigroup<W>>(
		elems: AsyncIterable<Annotation<T, W>>,
	): AsyncAnnotation<T[], W> {
		return traverse(elems, id);
	}

	export function forEach<T, W extends Semigroup<W>>(
		elems: AsyncIterable<T>,
		f: (
			elem: T,
			idx: number,
		) => Annotation<any, W> | AsyncAnnotationLike<any, W>,
	): AsyncAnnotation<void, W> {
		return traverseInto(elems, f, new NoOpBuilder());
	}

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
				const idx = remaining;
				remaining++;
				Promise.resolve(f(elem, idx)).then((anno) => {
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
			}
		});
	}

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

	export function allIntoPar<T, W extends Semigroup<W>, TFinish>(
		elems: Iterable<Annotation<T, W> | AsyncAnnotationLike<T, W>>,
		builder: Builder<T, TFinish>,
	): AsyncAnnotation<TFinish, W> {
		return traverseIntoPar(elems, id, builder);
	}

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
		{ [K in keyof TElems]: Annotation.ValueT<Awaited<TElems[K]>> },
		Annotation.NoteT<{ [K in keyof TElems]: Awaited<TElems[K]> }[number]>
	>;

	export function allPar<T, W extends Semigroup<W>>(
		elems: Iterable<Annotation<T, W> | AsyncAnnotationLike<T, W>>,
	): AsyncAnnotation<T[], W>;

	export function allPar<T, W extends Semigroup<W>>(
		elems: Iterable<Annotation<T, W> | AsyncAnnotationLike<T, W>>,
	): AsyncAnnotation<T[], W> {
		return traversePar(elems, id);
	}

	export function allPropsPar<
		TProps extends Record<
			string,
			| Annotation<any, Semigroup<any>>
			| AsyncAnnotationLike<any, Semigroup<any>>
		>,
	>(
		props: TProps,
	): AsyncAnnotation<
		{ [K in keyof TProps]: Annotation.ValueT<Awaited<TProps[K]>> },
		Annotation.NoteT<
			{ [K in keyof TProps]: Awaited<TProps[K]> }[keyof TProps]
		>
	>;

	export function allPropsPar<T, W extends Semigroup<W>>(
		props: Record<string, Annotation<T, W> | AsyncAnnotationLike<T, W>>,
	): AsyncAnnotation<Record<string, T>, W>;

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

	export function forEachPar<T, W extends Semigroup<W>>(
		elems: Iterable<T>,
		f: (
			elem: T,
			idx: number,
		) => Annotation<any, W> | AsyncAnnotationLike<any, W>,
	): AsyncAnnotation<void, W> {
		return traverseIntoPar(elems, f, new NoOpBuilder());
	}

	export function liftPar<TArgs extends unknown[], T>(
		f: (...args: TArgs) => T | PromiseLike<T>,
	): <W extends Semigroup<W>>(
		...elems: {
			[K in keyof TArgs]:
				| Annotation<TArgs[K], W>
				| AsyncAnnotationLike<TArgs[K], W>;
		}
	) => AsyncAnnotation<T, W> {
		return (...elems) =>
			go(
				(async function* (): Go<T, any> {
					return f(
						...((yield* await allPar(elems)) as TArgs),
					) as Awaited<T>;
				})(),
			);
	}

	export type Go<TReturn, W extends Semigroup<W>> = AsyncGenerator<
		Annotation<unknown, W>,
		TReturn
	>;
}
