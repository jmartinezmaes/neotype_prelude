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

import { cmb, type Semigroup } from "./cmb.js";

/**
 * Construction with the builder pattern.
 *
 * @remarks
 *
 * {@link Builder | `Builder<T, TFinish>`} provides an interface for
 * constructing values. A `Builder<T, TFinish>` accepts values of type `T` and
 * produces a result of type `TFinish`.
 *
 * Builders are often used to construct various containers, but they can be
 * useful in any task that involves collecting or combining values to produce a
 * final result.
 *
 * ## Importing from this module
 *
 * All exports from this module can be imported as named or aliased as
 * necessary.
 *
 * @module
 */

/**
 * An interface that produces a result from added values.
 */
export interface Builder<in T, out TFinish> {
	/**
	 * Add a single element to this builder.
	 */
	add(val: T): void;

	/**
	 * Return the result of all elements added to this builder.
	 *
	 * @remarks
	 *
	 * Implementors of `Builder` should define their behavior after `finish` is
	 * called, and whether any further sequences of method calls are allowed.
	 */
	finish(): TFinish;
}

/**
 * A builder that constructs a string.
 */
export abstract class StringBuilder<in T> implements Builder<T, string> {
	protected val: string;

	constructor(initial = "") {
		this.val = initial;
	}

	abstract add(elem: T): void;

	finish(): string {
		return this.val;
	}
}

/**
 * A builder that constructs a string by appending strings.
 */
export class StringAppendBuilder extends StringBuilder<string> {
	add(elem: string): void {
		this.val += elem;
	}
}

/**
 * A builder that constructs a string by prepending strings.
 */
export class StringPrependBuilder extends StringBuilder<string> {
	add(elem: string): void {
		this.val = elem + this.val;
	}
}

/**
 * A builder that constructs an array.
 */
export abstract class ArrayBuilder<in T, out TFinish>
	implements Builder<T, TFinish[]>
{
	protected elems: TFinish[];

	constructor(initial: TFinish[] = []) {
		this.elems = initial;
	}

	abstract add(elem: T): void;

	finish(): TFinish[] {
		return this.elems;
	}
}

/**
 * A builder that constructs an array by appending elements.
 */
export class ArrayPushBuilder<in out T> extends ArrayBuilder<T, T> {
	add(elem: T): void {
		this.elems.push(elem);
	}
}

/**
 * A builder that constructs an array by prepending elements.
 */
export class ArrayUnshiftBuilder<in out T> extends ArrayBuilder<T, T> {
	add(elem: T): void {
		this.elems.unshift(elem);
	}
}

/**
 * A builder that constructs an array by assigning elements to indices from
 * index-element pairs.
 */
export class ArrayEntryBuilder<in out T> extends ArrayBuilder<
	readonly [number, T],
	T
> {
	add([idx, elem]: readonly [number, T]): void {
		this.elems[idx] = elem;
	}
}

/**
 * A builder that constructs an array by concatenating arrays.
 */
export class ArrayConcatBuilder<in out T> extends ArrayBuilder<T[], T> {
	add(elem: T[]): void {
		this.elems = this.elems.concat(elem);
	}
}

/**
 * A builder that constructs an object.
 */
export abstract class RecordBuilder<
	in T,
	in out K extends number | string | symbol,
	out V,
> implements Builder<T, Record<K, V>>
{
	protected elems: Record<K, V>;

	constructor(initial: Record<K, V> = {} as Record<K, V>) {
		this.elems = initial;
	}

	abstract add(elem: T): void;

	finish(): Record<K, V> {
		return this.elems;
	}
}

/**
 * A builder that constructs an object by assigning values to keys from
 * key-value pairs.
 */
export class RecordEntryBuilder<
	in out K extends number | string | symbol,
	in out V,
> extends RecordBuilder<readonly [K, V], K, V> {
	add([key, val]: readonly [K, V]): void {
		this.elems[key] = val;
	}
}

/**
 * A builder that constructs an object by merging objects.
 */
export class RecordSpreadBuilder<
	in out K extends number | string | symbol,
	in out V,
> extends RecordBuilder<Record<K, V>, K, V> {
	add(elem: Record<K, V>): void {
		this.elems = { ...this.elems, ...elem };
	}
}

/**
 * A builder that constucts a map.
 */
export abstract class MapBuilder<in T, out K, out V>
	implements Builder<T, Map<K, V>>
{
	protected elems: Map<K, V>;

	constructor(initial: Map<K, V> = new Map()) {
		this.elems = initial;
	}

	abstract add(elem: T): void;

	finish(): Map<K, V> {
		return this.elems;
	}
}

/**
 * A builder that constucts a map by assigning values to keys from key-value
 * pairs.
 */
export class MapEntryBuilder<in out K, in out V> extends MapBuilder<
	readonly [K, V],
	K,
	V
> {
	add([key, val]: readonly [K, V]): void {
		this.elems.set(key, val);
	}
}

/**
 * A builder that constucts a map by taking the union of maps.
 */
export class MapUnionBuilder<in out K, in out V> extends MapBuilder<
	Map<K, V>,
	K,
	V
> {
	add(elem: Map<K, V>): void {
		this.elems = new Map(
			(function* (elems: Map<K, V>) {
				yield* elems;
				yield* elem;
			})(this.elems),
		);
	}
}

/**
 * A builder that constucts a set.
 */
export abstract class SetBuilder<in T, out TFinish>
	implements Builder<T, Set<TFinish>>
{
	protected elems: Set<TFinish>;

	constructor(initial: Set<TFinish> = new Set()) {
		this.elems = initial;
	}

	abstract add(elem: T): void;

	finish(): Set<TFinish> {
		return this.elems;
	}
}

/**
 * A builder that constucts a set by adding elements.
 */
export class SetValueBuilder<in out T> extends SetBuilder<T, T> {
	add(elem: T): void {
		this.elems.add(elem);
	}
}

/**
 * A builder that constucts a set by taking the union of sets.
 */
export class SetUnionBuilder<in out T> extends SetBuilder<Set<T>, T> {
	add(elem: Set<T>): void {
		this.elems = new Set(
			(function* (elems: Set<T>) {
				yield* elems;
				yield* elem;
			})(this.elems),
		);
	}
}

/**
 * A builder that constructs a semigroup by combining semigroups.
 */
export class SemigroupBuilder<in out T extends Semigroup<T>>
	implements Builder<T, T>
{
	protected val: T;

	constructor(initial: T) {
		this.val = initial;
	}

	add(elem: T): void {
		this.val = cmb(this.val, elem);
	}

	finish(): T {
		return this.val;
	}
}

/**
 * A builder that does not consider its arguments and does not produce a result.
 */
export class NoOpBuilder implements Builder<unknown, void> {
	add(): void {
		return;
	}

	finish(): void {
		return;
	}
}
