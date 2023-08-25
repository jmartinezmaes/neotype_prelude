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

import { cmb, type Semigroup } from "./cmb.js";

/**
 * Construction with the builder pattern.
 *
 * @remarks
 *
 * {@link Builder | `Builder<T, TFinish>`} provides an interface for
 * constructing values. A `Builder<T, TFinish>` accepts inputs of type `T` and
 * produces an output of type `TFinish`.
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

/** An interface that produces a result from added values. */
export interface Builder<in T, out TFinish> {
	/** Add a single element to this builder. */
	add(input: T): void;

	/** Return the result of all elements added to this builder. */
	finish(): TFinish;
}

/** A builder that constructs a string. */
export abstract class StringBuilder<in T> implements Builder<T, string> {
	protected output: string;

	constructor(initial = "") {
		this.output = initial;
	}

	abstract add(input: T): void;

	finish(): string {
		return this.output;
	}
}

/** A builder that constructs a string by appending strings. */
export class StringAppendBuilder extends StringBuilder<string> {
	add(input: string): void {
		this.output += input;
	}
}

/** A builder that constructs a string by prepending strings. */
export class StringPrependBuilder extends StringBuilder<string> {
	add(input: string): void {
		this.output = input + this.output;
	}
}

/** A builder that constructs an array. */
export abstract class ArrayBuilder<in T, out TFinish>
	implements Builder<T, TFinish[]>
{
	protected output: TFinish[];

	constructor(initial: TFinish[] = []) {
		this.output = initial;
	}

	abstract add(input: T): void;

	finish(): TFinish[] {
		return this.output;
	}
}

/** A builder that constructs an array by appending elements. */
export class ArrayPushBuilder<in out T> extends ArrayBuilder<T, T> {
	add(input: T): void {
		this.output.push(input);
	}
}

/** A builder that constructs an array by prepending elements. */
export class ArrayUnshiftBuilder<in out T> extends ArrayBuilder<T, T> {
	add(input: T): void {
		this.output.unshift(input);
	}
}

/**
 * A builder that constructs an array by assigning elements to indices from
 * index-element pairs.
 */
export class ArrayAssignBuilder<in out T> extends ArrayBuilder<
	readonly [number, T],
	T
> {
	add(input: readonly [number, T]): void {
		const [idx, elem] = input;
		this.output[idx] = elem;
	}
}

/** A builder that constructs an object. */
export abstract class ObjectBuilder<
	in T,
	in out K extends number | string | symbol,
	out V,
> implements Builder<T, Record<K, V>>
{
	protected output: Record<K, V>;

	constructor(initial: Record<K, V> = {} as Record<K, V>) {
		this.output = initial;
	}

	abstract add(input: T): void;

	finish(): Record<K, V> {
		return this.output;
	}
}

/**
 * A builder that constructs an object by assigning values to keys from
 * key-value pairs.
 */
export class ObjectAssignBuilder<
	in out K extends number | string | symbol,
	in out V,
> extends ObjectBuilder<readonly [K, V], K, V> {
	add(input: readonly [K, V]): void {
		const [key, val] = input;
		this.output[key] = val;
	}
}

/** A builder that constucts a map. */
export abstract class MapBuilder<in T, out K, out V>
	implements Builder<T, Map<K, V>>
{
	protected output: Map<K, V>;

	constructor(initial: Map<K, V> = new Map()) {
		this.output = initial;
	}

	abstract add(input: T): void;

	finish(): Map<K, V> {
		return this.output;
	}
}

/**
 * A builder that constucts a map by assigning values to keys from key-value
 * pairs.
 */
export class MapSetBuilder<in out K, in out V> extends MapBuilder<
	readonly [K, V],
	K,
	V
> {
	add(input: readonly [K, V]): void {
		const [key, val] = input;
		this.output.set(key, val);
	}
}

/** A builder that constucts a set. */
export abstract class SetBuilder<in T, out TFinish>
	implements Builder<T, Set<TFinish>>
{
	protected output: Set<TFinish>;

	constructor(initial: Set<TFinish> = new Set()) {
		this.output = initial;
	}

	abstract add(input: T): void;

	finish(): Set<TFinish> {
		return this.output;
	}
}

/** A builder that constucts a set by adding elements. */
export class SetAddBuilder<in out T> extends SetBuilder<T, T> {
	add(input: T): void {
		this.output.add(input);
	}
}

/** A builder that constructs a semigroup by combining semigroups. */
export class SemigroupCmbBuilder<in out T extends Semigroup<T>>
	implements Builder<T, T>
{
	protected output: T;

	constructor(initial: T) {
		this.output = initial;
	}

	add(input: T): void {
		this.output = cmb(this.output, input);
	}

	finish(): T {
		return this.output;
	}
}

/**
 * A higher-order builder that wraps an existing builder to add multiple values
 * at once.
 */
export class AddManyBuilder<in T, out TFinish>
	implements Builder<Iterable<T>, TFinish>
{
	protected builder: Builder<T, TFinish>;

	constructor(builder: Builder<T, TFinish>) {
		this.builder = builder;
	}

	add(input: Iterable<T>): void {
		for (const elem of input) {
			this.builder.add(elem);
		}
	}

	finish(): TFinish {
		return this.builder.finish();
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
