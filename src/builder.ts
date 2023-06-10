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
 * Construction with the Builder pattern.
 *
 * @remarks
 *
 * `Builder<T, TFinish>` provides an interface for constructing values. A
 * `Builder<T, TFinish>` accepts values of type `T` and produces a result of
 * type `TFinish`.
 *
 * `Builder` objects are often used to construct various containers, but they
 * can be useful in any scenario that involves aggregating or combining values
 * to produce a final result.
 *
 * ## Importing from this module
 *
 * The `Builder` interface can be imported as named:
 *
 * ```ts
 * import type { Builder } from "@neotype/prelude/builder.js";
 * ```
 *
 * ## Implementing `Builder`
 *
 * Implementors of `Builder` must implement the `add` and `finish` methods.
 *
 * -   `add` accepts a value to combine with any existing values in the
 *     `Builder`.
 * -   `finish` returns the final result from the `Builder`. Implementors should
 *     specify the behavior of the `Builder` after `finish` is called, and
 *     whether any further sequences of method calls are allowed.
 *
 * @example Creating a `Builder` for arrays
 *
 * Consider an `ArrayBuilder` class that builds an array by appending values:
 *
 * ```ts
 * import type { Builder } from "@neotype/prelude/builder.js";
 *
 * class ArrayBuilder<in out T> implements Builder<T, T[]> {
 *     readonly #elems: T[] = [];
 *
 *     add(elem: T): void {
 *         this.#elems.push(elem);
 *     }
 *
 *     finish(): T[] {
 *         return this.#elems;
 *     }
 * }
 * ```
 *
 * @module
 */

/**
 * An interface that produces a result from added values.
 */
export interface Builder<in T, out TFinish> {
	/**
	 * Add a single element to this `Builder`.
	 */
	add(val: T): void;

	/**
	 * Return the result of all elements added to this `Builder`.
	 *
	 * @remarks
	 *
	 * Implementors of `Builder` should define their behavior after `finish` is
	 * called, and whether any further sequences of method calls are allowed.
	 */
	finish(): TFinish;
}

/**
 *
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
 *
 */
export class StringAppendBuilder extends StringBuilder<string> {
	add(elem: string): void {
		this.val += elem;
	}
}

/**
 *
 */
export class StringPrependBuilder extends StringBuilder<string> {
	add(elem: string): void {
		this.val = elem + this.val;
	}
}

/**
 *
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
 *
 */
export class ArrayPushBuilder<in out T> extends ArrayBuilder<T, T> {
	add(elem: T): void {
		this.elems.push(elem);
	}
}

/**
 *
 */
export class ArrayUnshiftBuilder<in out T> extends ArrayBuilder<T, T> {
	add(elem: T): void {
		this.elems.unshift(elem);
	}
}

/**
 *
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
 *
 */
export class ArrayConcatBuilder<in out T> extends ArrayBuilder<T[], T> {
	add(elem: T[]): void {
		this.elems = this.elems.concat(elem);
	}
}

/**
 *
 */
export abstract class RecordBuilder<in T, out TFinish>
	implements Builder<T, Record<string, TFinish>>
{
	protected elems: Record<string, TFinish>;

	constructor(initial: Record<string, TFinish> = {}) {
		this.elems = initial;
	}

	abstract add(elem: T): void;

	finish(): Record<string, TFinish> {
		return this.elems;
	}
}

/**
 *
 */
export class RecordEntryBuilder<in out T> extends RecordBuilder<
	readonly [string, T],
	T
> {
	add([key, val]: readonly [string, T]): void {
		this.elems[key] = val;
	}
}

/**
 *
 */
export class RecordSpreadBuilder<in out T> extends RecordBuilder<
	Record<string, T>,
	T
> {
	add(elem: Record<string, T>): void {
		this.elems = { ...this.elems, ...elem };
	}
}

/**
 *
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
 *
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
 *
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
 *
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
 *
 */
export class SetValueBuilder<in out T> extends SetBuilder<T, T> {
	add(elem: T): void {
		this.elems.add(elem);
	}
}

/**
 *
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
 *
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
 *
 */
export class NoOpBuilder implements Builder<unknown, void> {
	add(): void {
		return;
	}

	finish(): void {
		return;
	}
}
