/*
 * Copyright 2022 Josh Martinez
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

/**
 * The identity function.
 */
export function id<A>(x: A): A {
    return x;
}

/**
 * Return a function that always returns a provided value.
 *
 * @remarks
 *
 * This function is useful for eagerly memoizing a value that would otherwise be
 * suspended behind a function.
 */
export function constant<A>(x: A): (...args: any[]) => A {
    return () => x;
}

/**
 * Adapt a predicate of any arity into an identical predicate that negates its
 * result.
 */
export function negatePred<A, A1 extends A>(
    f: (x: A) => x is A1,
): (x: A) => x is Exclude<A, A1>;

export function negatePred<T extends unknown[]>(
    f: (...args: T) => boolean,
): (...args: T) => boolean;

export function negatePred<T extends unknown[]>(
    f: (...args: T) => boolean,
): (...args: T) => boolean {
    return (...args) => !f(...args);
}

/**
 * Adapt a constructor of any arity into a callable function.
 */
export function wrapCtor<T extends unknown[], A>(
    ctor: new (...args: T) => A,
): (...args: T) => A {
    return (...args) => new ctor(...args);
}
