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
 * The Eq interface and associated operations.
 *
 * @module
 */

/**
 * The `Eq<A>` interface provides evidence that two values of type `A` have
 * equality and inequality.
 *
 * ### Minimal implementation
 *
 * - {@link Eq[Eq.eq]}
 *
 * ### Properties
 *
 * Instances of Eq are encouraged to satisfy the following properties:
 *
 * __Reflexivity__
 *
 * `eq (x, x) === true`
 *
 * __Symmetry__
 *
 * `eq (x, y) === eq (y, x)`
 *
 * __Transitivity__
 *
 * If `eq (x, y) && eq (y, z) === true` then `eq (x, z) === true`
 *
 * __Extensionality__
 *
 * If `eq (x, y) === true` and `f` is a function whose return type is an
 * instance of `Eq`, then `eq (f (x), f (y)) === true`
 */
export interface Eq<in A> {
  [Eq.eq](this: A, that: A): boolean;
}

export namespace Eq {
  /**
   * A method that determines the equality or inequality of two Eq values.
   */
  export const eq = Symbol("@neotype/prelude/Eq/eq");
}

/**
 * Test whether two values are equal using Eq comparison.
 *
 * ```ts
 * eq (x, y) ≡ x[Eq.eq](y)
 * ```
 */
export function eq<A extends Eq<A>>(x: A, y: A): boolean {
  return x[Eq.eq](y);
}

/**
 * Test whether two values are inequal using Eq comparison.
 *
 * ```ts
 * ne (x, y) ≡ !x[Eq.eq](y)
 * ```
 */
export function ne<A extends Eq<A>>(x: A, y: A): boolean {
  return !x[Eq.eq](y);
}

/**
 * Test whether two iterables are equal using Eq comparison.
 *
 * ```ts
 * ieq ([a   ], [    ]) ≡ false
 * ieq ([    ], [b   ]) ≡ false
 * ieq ([a, x], [b   ]) ≡ false
 * ieq ([a,  ], [b, y]) ≡ false
 * ieq ([a, x], [b, y]) ≡ eq (a, b) && eq (x, y)
 * ```
 */
export function ieq<A extends Eq<A>>(
  xs: Iterable<A>,
  ys: Iterable<A>,
): boolean {
  const nxs = xs[Symbol.iterator]();
  const nys = ys[Symbol.iterator]();
  let nx = nxs.next();
  let ny = nys.next();

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (!nx.done) {
      if (!ny.done) {
        if (ne(nx.value, ny.value)) {
          return false;
        }
        nx = nxs.next();
        ny = nys.next();
      } else {
        return false;
      }
    } else {
      return !!ny.done;
    }
  }
}

/**
 * Test whether two iterables are inequal using Eq comparison.
 */
export function ine<A extends Eq<A>>(
  xs: Iterable<A>,
  ys: Iterable<A>,
): boolean {
  return !ieq(xs, ys);
}
