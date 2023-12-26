import { type Semigroup, cmb } from "./cmb.js";
import { id } from "./fn.js";
import { Maybe } from "./maybe.js";

export type Annotation<T, N> = Annotation.Data<T> | Annotation.Note<T, N>;

export namespace Annotation {
	export function data<T>(val: T): Annotation<T, never> {
		return new Data(val);
	}

	export function note<T, N>(data: T, note: N): Annotation<T, N> {
		return new Note(data, note);
	}

	export enum Kind {
		DATA,
		NOTE,
	}

	export abstract class Syntax {
		abstract readonly kind: Kind;

		isData<T>(this: Annotation<T, any>): this is Data<T> {
			return this.kind === Kind.DATA;
		}

		isNote<T, N>(this: Annotation<T, N>): this is Note<T, N> {
			return this.kind === Kind.NOTE;
		}

		unwrap<T, N, T1>(
			this: Annotation<T, N>,
			f: (data: T, note: Maybe<N>) => T1,
		): T1 {
			return this.isData()
				? f(this.val, Maybe.nothing)
				: f(this.data, Maybe.just(this.note));
		}

		andThen<T, N extends Semigroup<N>, T1>(
			this: Annotation<T, N>,
			f: (val: T) => Annotation<T1, N>,
		): Annotation<T1, N> {
			if (this.isData()) {
				return f(this.val);
			}
			const that = f(this.data);
			if (that.isData()) {
				return note(that.val, this.note);
			}
			return note(that.data, cmb(this.note, that.note));
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

		map<T, N, T1>(
			this: Annotation<T, N>,
			f: (val: T) => T1,
		): Annotation<T1, N> {
			return this.isData()
				? data(f(this.val))
				: note(f(this.data), this.note);
		}

		mapNote<T, N, N1>(
			this: Annotation<T, N>,
			f: (val: N) => N1,
		): Annotation<T, N1> {
			return this.isData() ? this : note(this.data, f(this.note));
		}

		notate<T, N extends Semigroup<N>>(
			this: Annotation<T, N>,
			f: (val: T) => N,
		): Annotation<T, N> {
			return this.andThen((val) => note(val, f(val)));
		}
	}

	export class Data<out T> extends Syntax {
		readonly kind = Kind.DATA;

		readonly val: T;

		constructor(val: T) {
			super();
			this.val = val;
		}
	}

	export class Note<out T, out N> extends Syntax {
		readonly kind = Kind.NOTE;

		readonly data: T;

		readonly note: N;

		get val(): [T, N] {
			return [this.data, this.note];
		}

		constructor(data: T, note: N) {
			super();
			this.data = data;
			this.note = note;
		}
	}
}
