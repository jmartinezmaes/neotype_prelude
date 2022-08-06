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
 * Utility functions and function application.
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
 * Retrieve the first element in a pair-like structure.
 */
export function fst<A>(pair: [A, any]): A {
    return pair[0];
}

/**
 * Retrieve the second argument in a pair-like structure.
 */
export function snd<B>(pair: [any, B]): B {
    return pair[1];
}

/**
 * Reverse a refinement function or a predicate function.
 */
export function negate<A, A1 extends A>(
    f: (x: A) => x is A1,
): (x: A) => x is Exclude<A, A1>;

export function negate<A>(f: (x: A) => boolean): (x: A) => boolean;

export function negate<A>(f: (x: A) => boolean): (x: A) => boolean {
    return (x) => !f(x);
}
