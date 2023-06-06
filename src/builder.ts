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
