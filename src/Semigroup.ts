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
 * The Semigroup interface and associated operations.
 *
 * @module
 */

/**
 * The `Semigroup<A>` interface provides evidence that two values of type `A`
 * have an associative operation that combines them.
 *
 * ### Minimal implementation
 *
 * - {@link Semigroup[Semigroup.combine]}
 *
 * ### Properties
 *
 * Instances of Semigroup __must__ satisfy the following property:
 *
 * __Associativity__
 *
 * `combine (x, combine (y, z)) ≡ combine (combine (x, y), z)`
 */
export interface Semigroup<in out A> {
  [Semigroup.combine](this: A, that: A): A;
}

export namespace Semigroup {
  /**
   * A method that combines two Semigroup values using an associative operation.
   */
  export const combine = Symbol("@neotype/prelude/Semigroup/combine");
}

/**
 * Combine two values of the same Semigroup.
 *
 * ```ts
 * combine (x, y) = x[Semigroup.combine](y)
 * ```
 */
export function combine<A extends Semigroup<A>>(x: A, y: A): A {
  return x[Semigroup.combine](y);
}

/**
 * Combine a non-empty series of the same Semigroup from left to right.
 *
 * ```ts
 * combineAll (x, ...xs) ≡ [x, ...xs].reduce(combine)
 * ```
 */
export function combineAll<A extends Semigroup<A>>(...xs: [A, ...A[]]): A {
  return xs.reduce(combine);
}
