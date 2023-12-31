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
	ArrayPushBuilder,
	ObjectAssignBuilder,
	type Builder,
	NoOpBuilder,
	ArrayAssignBuilder,
} from "./builder.js";
import { Semigroup, cmb } from "./cmb.js";
import { Eq, Ord, Ordering, cmp, eq } from "./cmp.js";
import { id } from "./fn.js";
import { Maybe } from "./maybe.js";

export type Annotation<T, N> = Annotation.Data<T> | Annotation.Note<T, N>;

export namespace Annotation {
	export function data<T>(data: T): Annotation<T, never> {
		return new Data(data);
	}

	export function note<T, N>(data: T, note: N): Annotation<T, N> {
		return new Note(data, note);
	}

	export function go<N extends Semigroup<N>, TReturn>(
		gen: Go<TReturn, N>,
	): Annotation<TReturn, N> {
		let nxt = gen.next();
		let acc: N | undefined;

		while (!nxt.done) {
			const anno = nxt.value;
			if (anno.isData()) {
				nxt = gen.next(anno.data);
			} else {
				if (acc === undefined) {
					acc = anno.note;
				} else {
					acc = cmb(acc, anno.note);
				}
				nxt = gen.next(anno.data);
			}
		}

		if (acc === undefined) {
			return data(nxt.value);
		}
		return note(nxt.value, acc);
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
		{ -readonly [K in keyof TAnnos]: DataT<TAnnos[K]> },
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
		{ -readonly [K in keyof TProps]: DataT<TProps[K]> },
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
			([key, elem]) => elem.map((data) => [key, data] as const),
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
		DATA,
		NOTE,
	}

	export abstract class Syntax {
		abstract readonly kind: Kind;

		[Eq.eq]<T extends Eq<T>, N extends Eq<N>>(
			this: Annotation<T, N>,
			that: Annotation<T, N>,
		): boolean {
			if (this.isData()) {
				return that.isData() && eq(this.data, that.data);
			}
			return (
				that.isNote() &&
				eq(this.data, that.data) &&
				eq(this.note, that.note)
			);
		}

		[Ord.cmp]<T extends Ord<T>, N extends Ord<N>>(
			this: Annotation<T, N>,
			that: Annotation<T, N>,
		): Ordering {
			if (this.isData()) {
				return that.isData()
					? cmp(this.data, that.data)
					: Ordering.less;
			}
			return that.isNote()
				? cmb(cmp(this.data, that.data), cmp(this.note, that.note))
				: Ordering.greater;
		}

		[Semigroup.cmb]<T extends Semigroup<T>, N extends Semigroup<N>>(
			this: Annotation<T, N>,
			that: Annotation<T, N>,
		): Annotation<T, N> {
			return this.zipWith(that, cmb);
		}

		isData<T>(this: Annotation<T, any>): this is Data<T> {
			return this.kind === Kind.DATA;
		}

		isNote<T, N>(this: Annotation<T, N>): this is Note<T, N> {
			return this.kind === Kind.NOTE;
		}

		match<T, N, T1, T2>(
			this: Annotation<T, N>,
			ifData: (data: T) => T1,
			ifNote: (data: T, note: N) => T2,
		): T1 | T2 {
			return this.isData()
				? ifData(this.data)
				: ifNote(this.data, this.note);
		}

		unwrap<T, N, T1>(
			this: Annotation<T, N>,
			f: (data: T, note: Maybe<N>) => T1,
		): T1 {
			return this.match(
				(data) => f(data, Maybe.nothing),
				(data, note) => f(data, Maybe.just(note)),
			);
		}

		getNote<N>(this: Annotation<any, N>): Maybe<N> {
			return this.isData() ? Maybe.nothing : Maybe.just(this.note);
		}

		andThen<T, N extends Semigroup<N>, T1>(
			this: Annotation<T, N>,
			f: (data: T) => Annotation<T1, N>,
		): Annotation<T1, N> {
			if (this.isData()) {
				return f(this.data);
			}
			const that = f(this.data);
			if (that.isData()) {
				return note(that.data, this.note);
			}
			return note(that.data, cmb(this.note, that.note));
		}

		andThenGo<T, N extends Semigroup<N>, T1>(
			this: Annotation<T, N>,
			f: (data: T) => Go<T1, N>,
		): Annotation<T1, N> {
			return this.andThen((data) => go(f(data)));
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
			f: (data: T) => T1,
		): Annotation<T1, N> {
			return this.isData()
				? data(f(this.data))
				: note(f(this.data), this.note);
		}

		mapNote<T, N, N1>(
			this: Annotation<T, N>,
			f: (note: N) => N1,
		): Annotation<T, N1> {
			return this.isData() ? this : note(this.data, f(this.note));
		}

		notate<T, N extends Semigroup<N>>(
			this: Annotation<T, N>,
			f: (data: T) => N,
		): Annotation<T, N> {
			return this.andThen((data) => note(data, f(data)));
		}

		erase<T>(this: Annotation<T, any>): Annotation<T, never> {
			return this.isData() ? this : data(this.data);
		}

		review<T, N>(this: Annotation<T, N>): Annotation<[T, Maybe<N>], N> {
			return this.map((data) => [data, this.getNote()]);
		}
	}

	export class Data<out T> extends Syntax {
		readonly kind = Kind.DATA;

		readonly data: T;

		constructor(data: T) {
			super();
			this.data = data;
		}

		*[Symbol.iterator](): Generator<Annotation<T, never>, T> {
			return (yield this) as T;
		}
	}

	export class Note<out T, out N> extends Syntax {
		readonly kind = Kind.NOTE;

		readonly data: T;

		readonly note: N;

		constructor(data: T, note: N) {
			super();
			this.data = data;
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

	export type DataT<TAnno extends Annotation<any, any>> = [TAnno] extends [
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
		let nxt = await gen.next();
		let acc: N | undefined;

		while (!nxt.done) {
			const anno = nxt.value;
			if (anno.isData()) {
				nxt = await gen.next(anno.data);
			} else {
				if (acc === undefined) {
					acc = anno.note;
				} else {
					acc = cmb(acc, anno.note);
				}
				nxt = await gen.next(anno.data);
			}
		}

		if (acc === undefined) {
			return Annotation.data(nxt.value);
		}
		return Annotation.note(nxt.value, acc);
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
			let acc: N | undefined;

			for (const elem of elems) {
				const idx = remaining;
				remaining++;
				Promise.resolve(f(elem, idx)).then((anno) => {
					if (anno.isData()) {
						builder.add(anno.data);
					} else {
						if (acc === undefined) {
							acc = anno.note;
						} else {
							acc = cmb(acc, anno.note);
						}
						builder.add(anno.data);
					}

					remaining--;
					if (remaining === 0) {
						if (acc === undefined) {
							resolve(Annotation.data(builder.finish()));
						} else {
							resolve(Annotation.note(builder.finish(), acc));
						}
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
				(await f(elem, idx)).map((data) => [idx, data] as const),
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
		{ [K in keyof TElems]: Annotation.DataT<Awaited<TElems[K]>> },
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
		{ [K in keyof TProps]: Annotation.DataT<Awaited<TProps[K]>> },
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
				(await elem).map((data) => [key, data] as const),
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
