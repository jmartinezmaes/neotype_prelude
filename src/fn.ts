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

/**
 * Utility functions.
 *
 * @module
 */

/** The identity function. */
export function id<T>(val: T): T {
	return val;
}

/**
 * Return a function that always returns a provided value.
 *
 * @remarks
 *
 * This function is useful for eagerly memoizing a value that would otherwise be
 * suspended behind a function.
 */
export function constant<T>(val: T): (...args: any[]) => T {
	return () => val;
}

/** Adapt a predicate into an identical predicate that negates its result. */
export function negatePred<T, T1 extends T>(
	f: (val: T) => val is T1,
): (val: T) => val is Exclude<T, T1>;

export function negatePred<TArgs extends unknown[]>(
	f: (...args: TArgs) => boolean,
): (...args: TArgs) => boolean;

export function negatePred<TArgs extends unknown[]>(
	f: (...args: TArgs) => boolean,
): (...args: TArgs) => boolean {
	return (...args) => !f(...args);
}

/** Adapt a constructor into a callable function. */
export function wrapCtor<TArgs extends unknown[], T>(
	ctor: new (...args: TArgs) => T,
): (...args: TArgs) => T {
	return (...args) => new ctor(...args);
}
