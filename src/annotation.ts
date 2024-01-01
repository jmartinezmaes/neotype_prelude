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

export type Annotation<T, N> = Annotation.Value<T> | Annotation.Note<T, N>;

export namespace Annotation {
	export function value<T, N = never>(val: T): Annotation<T, N> {
		return new Value(val);
	}

	export function note<T, N>(val: T, note: N): Annotation<T, N> {
		return new Note(val, note);
	}

	export function go<N extends Semigroup<N>, TReturn>(
		gen: Go<TReturn, N>,
	): Annotation<TReturn, N> {
		let next = gen.next();
		let notes: N | undefined;
		while (!next.done) {
			const anno = next.value;
			if (anno.isNote()) {
				notes = notes === undefined ? anno.note : cmb(notes, anno.note);
			}
			next = gen.next(anno.val);
		}
		return notes === undefined
			? value(next.value)
			: note(next.value, notes);
	}

	export function wrapGoFn<
		TArgs extends unknown[],
		N extends Semigroup<N>,
		TReturn,
	>(
		f: (...args: TArgs) => Go<TReturn, N>,
	): (...args: TArgs) => Annotation<TReturn, N> {
		return (...args) => go(f(...args));
	}

	export function reduce<T, TAcc, N extends Semigroup<N>>(
		elems: Iterable<T>,
		f: (acc: TAcc, elem: T, idx: number) => Annotation<TAcc, N>,
		initial: TAcc,
	): Annotation<TAcc, N> {
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

	export function traverseInto<T, T1, N extends Semigroup<N>, TFinish>(
		elems: Iterable<T>,
		f: (elem: T, idx: number) => Annotation<T1, N>,
		builder: Builder<T1, TFinish>,
	): Annotation<TFinish, N> {
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

	export function traverse<T, T1, N extends Semigroup<N>>(
		elems: Iterable<T>,
		f: (elem: T, idx: number) => Annotation<T1, N>,
	): Annotation<T1[], N> {
		return traverseInto(elems, f, new ArrayPushBuilder());
	}

	export function allInto<T, N extends Semigroup<N>, TFinish>(
		annos: Iterable<Annotation<T, N>>,
		builder: Builder<T, TFinish>,
	): Annotation<TFinish, N> {
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

	export function all<T, N extends Semigroup<N>>(
		annos: Iterable<Annotation<T, N>>,
	): Annotation<T[], N>;

	export function all<T, N extends Semigroup<N>>(
		annos: Iterable<Annotation<T, N>>,
	): Annotation<T[], N> {
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

	export function allProps<T, N extends Semigroup<N>>(
		props: Record<string, Annotation<T, N>>,
	): Annotation<Record<string, T>, N>;

	export function allProps<T, N extends Semigroup<N>>(
		props: Record<string, Annotation<T, N>>,
	): Annotation<Record<string, T>, N> {
		return traverseInto(
			Object.entries(props),
			([key, elem]) => elem.map((val) => [key, val] as const),
			new ObjectAssignBuilder(),
		);
	}

	export function forEach<T, N extends Semigroup<N>>(
		elems: Iterable<T>,
		f: (elem: T, idx: number) => Annotation<any, N>,
	): Annotation<void, N> {
		return traverseInto(elems, f, new NoOpBuilder());
	}

	export function lift<TArgs extends unknown[], T>(
		f: (...args: TArgs) => T,
	): <N extends Semigroup<N>>(
		...annos: { [K in keyof TArgs]: Annotation<TArgs[K], N> }
	) => Annotation<T, N> {
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

		[Eq.eq]<T extends Eq<T>, N extends Eq<N>>(
			this: Annotation<T, N>,
			that: Annotation<T, N>,
		): boolean {
			return this.isValue()
				? that.isValue() && eq(this.val, that.val)
				: that.isNote() &&
						eq(this.val, that.val) &&
						eq(this.note, that.note);
		}

		[Ord.cmp]<T extends Ord<T>, N extends Ord<N>>(
			this: Annotation<T, N>,
			that: Annotation<T, N>,
		): Ordering {
			if (this.isValue()) {
				return that.isValue() ? cmp(this.val, that.val) : Ordering.less;
			}
			return that.isNote()
				? cmb(cmp(this.val, that.val), cmp(this.note, that.note))
				: Ordering.greater;
		}

		[Semigroup.cmb]<T extends Semigroup<T>, N extends Semigroup<N>>(
			this: Annotation<T, N>,
			that: Annotation<T, N>,
		): Annotation<T, N> {
			return this.zipWith(that, cmb);
		}

		isValue<T>(this: Annotation<T, any>): this is Value<T> {
			return this.kind === Kind.VALUE;
		}

		isNote<T, N>(this: Annotation<T, N>): this is Note<T, N> {
			return this.kind === Kind.NOTE;
		}

		match<T, N, T1, T2>(
			this: Annotation<T, N>,
			ifValue: (val: T) => T1,
			ifNote: (val: T, note: N) => T2,
		): T1 | T2 {
			return this.isValue()
				? ifValue(this.val)
				: ifNote(this.val, this.note);
		}

		unwrap<T, N, T1>(
			this: Annotation<T, N>,
			f: (val: T, note: Maybe<N>) => T1,
		): T1 {
			return this.match(
				(val) => f(val, Maybe.nothing),
				(val, note) => f(val, Maybe.just(note)),
			);
		}

		getNote<N>(this: Annotation<any, N>): Maybe<N> {
			return this.isValue() ? Maybe.nothing : Maybe.just(this.note);
		}

		andThen<T, N extends Semigroup<N>, T1>(
			this: Annotation<T, N>,
			f: (val: T) => Annotation<T1, N>,
		): Annotation<T1, N> {
			if (this.isValue()) {
				return f(this.val);
			}
			const that = f(this.val);
			return that.isValue()
				? note(that.val, this.note)
				: note(that.val, cmb(this.note, that.note));
		}

		andThenGo<T, N extends Semigroup<N>, T1>(
			this: Annotation<T, N>,
			f: (val: T) => Go<T1, N>,
		): Annotation<T1, N> {
			return this.andThen((val) => go(f(val)));
		}

		flatten<T, N extends Semigroup<N>>(
			this: Annotation<Annotation<T, N>, N>,
		): Annotation<T, N> {
			return this.andThen(id);
		}

		and<T1, N extends Semigroup<N>>(
			this: Annotation<any, N>,
			that: Annotation<T1, N>,
		): Annotation<T1, N> {
			return this.andThen(() => that);
		}

		zipWith<T, N extends Semigroup<N>, T1, T2>(
			this: Annotation<T, N>,
			that: Annotation<T1, N>,
			f: (lhs: T, rhs: T1) => T2,
		): Annotation<T2, N> {
			return this.andThen((lhs) => that.map((rhs) => f(lhs, rhs)));
		}

		map<T, N, T1>(
			this: Annotation<T, N>,
			f: (val: T) => T1,
		): Annotation<T1, N> {
			return this.isValue()
				? value(f(this.val))
				: note(f(this.val), this.note);
		}

		mapNote<T, N, N1>(
			this: Annotation<T, N>,
			f: (note: N) => N1,
		): Annotation<T, N1> {
			return this.isValue() ? this : note(this.val, f(this.note));
		}

		notate<T, N extends Semigroup<N>>(
			this: Annotation<T, N>,
			f: (val: T) => N,
		): Annotation<T, N> {
			return this.andThen((val) => note(val, f(val)));
		}

		erase<T>(this: Annotation<T, any>): Annotation<T, never> {
			return this.isValue() ? this : value(this.val);
		}

		review<T, N>(this: Annotation<T, N>): Annotation<[T, Maybe<N>], N> {
			return this.map((val) => [val, this.getNote()]);
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

	export class Note<out T, out N> extends Syntax {
		readonly kind = Kind.NOTE;

		readonly val: T;

		readonly note: N;

		constructor(val: T, note: N) {
			super();
			this.val = val;
			this.note = note;
		}

		*[Symbol.iterator](): Generator<Annotation<T, N>, T> {
			return (yield this) as T;
		}
	}

	export type Go<TReturn, N extends Semigroup<N>> = Generator<
		Annotation<unknown, N>,
		TReturn
	>;

	export type ValueT<TAnno extends Annotation<any, any>> = [TAnno] extends [
		Annotation<infer T, any>,
	]
		? T
		: never;

	export type NoteT<TAnno extends Annotation<any, any>> = [TAnno] extends [
		Annotation<any, infer N>,
	]
		? N
		: never;
}

export type AsyncAnnotationLike<T, N> = PromiseLike<Annotation<T, N>>;

export type AsyncAnnotation<T, N> = Promise<Annotation<T, N>>;

export namespace AsyncAnnotation {
	export async function go<N extends Semigroup<N>, TReturn>(
		gen: Go<TReturn, N>,
	): AsyncAnnotation<TReturn, N> {
		let next = await gen.next();
		let notes: N | undefined;
		while (!next.done) {
			const anno = next.value;
			if (anno.isNote()) {
				notes = notes === undefined ? anno.note : cmb(notes, anno.note);
			}
			next = await gen.next(anno.val);
		}
		return notes === undefined
			? Annotation.value(next.value)
			: Annotation.note(next.value, notes);
	}

	export function wrapGoFn<
		TArgs extends unknown[],
		N extends Semigroup<N>,
		TReturn,
	>(
		f: (...args: TArgs) => Go<TReturn, N>,
	): (...args: TArgs) => AsyncAnnotation<TReturn, N> {
		return (...args) => go(f(...args));
	}

	export function reduce<T, TAcc, N extends Semigroup<N>>(
		elems: AsyncIterable<T>,
		f: (
			acc: TAcc,
			elem: T,
			idx: number,
		) => Annotation<TAcc, N> | AsyncAnnotationLike<TAcc, N>,
		initial: TAcc,
	): AsyncAnnotation<TAcc, N> {
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

	export function traverseInto<T, T1, N extends Semigroup<N>, TFinish>(
		elems: AsyncIterable<T>,
		f: (
			elem: T,
			idx: number,
		) => Annotation<T1, N> | AsyncAnnotationLike<T1, N>,
		builder: Builder<T1, TFinish>,
	): AsyncAnnotation<TFinish, N> {
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

	export function traverse<T, T1, N extends Semigroup<N>>(
		elems: AsyncIterable<T>,
		f: (
			elem: T,
			idx: number,
		) => Annotation<T1, N> | AsyncAnnotationLike<T1, N>,
	): AsyncAnnotation<T1[], N> {
		return traverseInto(elems, f, new ArrayPushBuilder());
	}

	export function allInto<T, N extends Semigroup<N>, TFinish>(
		elems: AsyncIterable<Annotation<T, N>>,
		builder: Builder<T, TFinish>,
	): AsyncAnnotation<TFinish, N> {
		return traverseInto(elems, id, builder);
	}

	export function all<T, N extends Semigroup<N>>(
		elems: AsyncIterable<Annotation<T, N>>,
	): AsyncAnnotation<T[], N> {
		return traverse(elems, id);
	}

	export function forEach<T, N extends Semigroup<N>>(
		elems: AsyncIterable<T>,
		f: (
			elem: T,
			idx: number,
		) => Annotation<any, N> | AsyncAnnotationLike<any, N>,
	): AsyncAnnotation<void, N> {
		return traverseInto(elems, f, new NoOpBuilder());
	}

	export function traverseIntoPar<T, T1, N extends Semigroup<N>, TFinish>(
		elems: Iterable<T>,
		f: (
			elem: T,
			idx: number,
		) => Annotation<T1, N> | AsyncAnnotationLike<T1, N>,
		builder: Builder<T1, TFinish>,
	): AsyncAnnotation<TFinish, N> {
		return new Promise((resolve, reject) => {
			let remaining = 0;
			let notes: N | undefined;

			for (const elem of elems) {
				const idx = remaining;
				remaining++;
				Promise.resolve(f(elem, idx)).then((anno) => {
					if (anno.isNote()) {
						notes =
							notes === undefined
								? anno.note
								: cmb(notes, anno.note);
					}
					builder.add(anno.val);

					remaining--;
					if (remaining === 0) {
						resolve(
							notes === undefined
								? Annotation.value(builder.finish())
								: Annotation.note(builder.finish(), notes),
						);
						return;
					}
				}, reject);
			}
		});
	}

	export function traversePar<T, T1, N extends Semigroup<N>>(
		elems: Iterable<T>,
		f: (
			elem: T,
			idx: number,
		) => Annotation<T1, N> | AsyncAnnotationLike<T1, N>,
	): AsyncAnnotation<T1[], N> {
		return traverseIntoPar(
			elems,
			async (elem, idx) =>
				(await f(elem, idx)).map((val) => [idx, val] as const),
			new ArrayAssignBuilder(),
		);
	}

	export function allIntoPar<T, N extends Semigroup<N>, TFinish>(
		elems: Iterable<Annotation<T, N> | AsyncAnnotationLike<T, N>>,
		builder: Builder<T, TFinish>,
	): AsyncAnnotation<TFinish, N> {
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

	export function allPar<T, N extends Semigroup<N>>(
		elems: Iterable<Annotation<T, N> | AsyncAnnotationLike<T, N>>,
	): AsyncAnnotation<T[], N>;

	export function allPar<T, N extends Semigroup<N>>(
		elems: Iterable<Annotation<T, N> | AsyncAnnotationLike<T, N>>,
	): AsyncAnnotation<T[], N> {
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

	export function allPropsPar<T, N extends Semigroup<N>>(
		props: Record<string, Annotation<T, N> | AsyncAnnotationLike<T, N>>,
	): AsyncAnnotation<Record<string, T>, N>;

	export function allPropsPar<T, N extends Semigroup<N>>(
		props: Record<string, Annotation<T, N> | AsyncAnnotationLike<T, N>>,
	): AsyncAnnotation<Record<string, T>, N> {
		return traverseIntoPar(
			Object.entries(props),
			async ([key, elem]) =>
				(await elem).map((val) => [key, val] as const),
			new ObjectAssignBuilder(),
		);
	}

	export function forEachPar<T, N extends Semigroup<N>>(
		elems: Iterable<T>,
		f: (
			elem: T,
			idx: number,
		) => Annotation<any, N> | AsyncAnnotationLike<any, N>,
	): AsyncAnnotation<void, N> {
		return traverseIntoPar(elems, f, new NoOpBuilder());
	}

	export function liftPar<TArgs extends unknown[], T>(
		f: (...args: TArgs) => T | PromiseLike<T>,
	): <N extends Semigroup<N>>(
		...elems: {
			[K in keyof TArgs]:
				| Annotation<TArgs[K], N>
				| AsyncAnnotationLike<TArgs[K], N>;
		}
	) => AsyncAnnotation<T, N> {
		return (...elems) =>
			go(
				(async function* (): Go<T, any> {
					return f(
						...((yield* await allPar(elems)) as TArgs),
					) as Awaited<T>;
				})(),
			);
	}

	export type Go<TReturn, N extends Semigroup<N>> = AsyncGenerator<
		Annotation<unknown, N>,
		TReturn
	>;
}
