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
 * Functionality for associative combination.
 *
 * @module
 */

/**
 * The `Semigroup<A>` interface provides evidence that two values of type `A`
 * have an associative operation that combines them.
 *
 * ### Minimal implementation
 *
 * - {@link Semigroup[Semigroup.cmb]}
 *
 * ### Properties
 *
 * Instances of Semigroup __must__ satisfy the following property:
 *
 * __Associativity__
 *
 * `cmb (x, cmb (y, z)) ≡ cmb (cmb (x, y), z)`
 */
export interface Semigroup<in out A> {
  [Semigroup.cmb](this: A, that: A): A;
}

export namespace Semigroup {
  /**
   * A unique symbol for a method that combines two Semigroup values using an
   * associative operation.
   */
  export const cmb = Symbol("@neotype/prelude/Semigroup/cmb");
}

/**
 * Combine two values of the same Semigroup.
 *
 * ```ts
 * cmb (x, y) = x[Semigroup.cmb](y)
 * ```
 */
export function cmb<A extends Semigroup<A>>(x: A, y: A): A {
  return x[Semigroup.cmb](y);
}
