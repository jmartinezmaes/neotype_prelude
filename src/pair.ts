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
 * Pairs of values.
 *
 * @remarks
 *
 * {@link Pair | `Pair<A, B>`} is a type that represents a pair of values `A`
 * and `B`. `Pair` also provides an equivalence relation, a total order, and a
 * semigroup.
 *
 * ## Importing from this module
 *
 * This module exports `Pair` as a class. It can be imported as named:
 *
 * ```ts
 * import { Pair } from "@neotype/prelude/pair.js";
 * ```
 *
 * Or, the type and the class can be imported and alised separately:
 *
 * ```ts
 * import { type Pair, Pair as P } from "@neotype/prelude/pair.js";
 * ```
 *
 * @module
 */

import { Semigroup, cmb } from "./cmb.js";
import { Eq, Ord, cmp, eq, type Ordering } from "./cmp.js";

/** A pair of values. */
export class Pair<out A, out B> {
	/** Construct a `Pair` from a 2-tuple of values. */
	static fromTuple<A, B>(tuple: readonly [A, B]): Pair<A, B> {
		return new Pair(tuple[0], tuple[1]);
	}

	/** The first value of this `Pair`. */
	readonly fst: A;

	/** The second value of this `Pair`. */
	readonly snd: B;

	/** A 2-tuple of the first value and second value of this `Pair`. */
	get val(): [A, B] {
		return [this.fst, this.snd];
	}

	constructor(fst: A, snd: B) {
		this.fst = fst;
		this.snd = snd;
	}

	/**
	 * Compare this and that `Pair` to determine their equality.
	 *
	 * @remarks
	 *
	 * Two `Pair` are equal if their first values are equal and their second
	 * values are equal.
	 */
	[Eq.eq]<A extends Eq<A>, B extends Eq<B>>(
		this: Pair<A, B>,
		that: Pair<A, B>,
	): boolean {
		return eq(this.fst, that.fst) && eq(this.snd, that.snd);
	}

	/**
	 * Compare this and that `Pair` to determine their ordering.
	 *
	 * @remarks
	 *
	 * When ordered, `Pair` compares first values and second values
	 * lexicographically.
	 */
	[Ord.cmp]<A extends Ord<A>, B extends Ord<B>>(
		this: Pair<A, B>,
		that: Pair<A, B>,
	): Ordering {
		return cmb(cmp(this.fst, that.fst), cmp(this.snd, that.snd));
	}

	/**
	 * Combine the first values and second values of this and that `Pair`
	 * pairwise.
	 */
	[Semigroup.cmb]<A extends Semigroup<A>, B extends Semigroup<B>>(
		this: Pair<A, B>,
		that: Pair<A, B>,
	): Pair<A, B> {
		return new Pair(cmb(this.fst, that.fst), cmb(this.snd, that.snd));
	}

	/**
	 * Apply a function to extract the first value and second value out of this
	 * `Pair`.
	 */
	unwrap<T>(f: (fst: A, snd: B) => T): T {
		return f(this.fst, this.snd);
	}

	/** Apply a function to map the first value of this `Pair`. */
	lmap<A1>(f: (val: A) => A1): Pair<A1, B> {
		return new Pair(f(this.fst), this.snd);
	}

	/** Apply a function to map the second value of this `Pair`. */
	map<B1>(f: (val: B) => B1): Pair<A, B1> {
		return new Pair(this.fst, f(this.snd));
	}
}
