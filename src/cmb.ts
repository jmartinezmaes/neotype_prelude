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
 * Functionality for associative combination.
 *
 * @remarks
 *
 * ## Importing from this module
 *
 * This module exposes utilities for working with semigroups. It is recommended
 * to import them as they are named:
 *
 * ```ts
 * import { cmb, Semigroup } from "@neotype/prelude/cmb.js";
 * ```
 *
 * ## Implementing semigroups
 *
 * -   The `Semigroup` interface provides a contract for implementing
 *     [semigroups]. See the documentation for implementation patterns.
 * -   The `Semigroup` companion namespace provides the unique symbol required
 *     to implement the associated interface.
 *
 * ## Combining semigroups
 *
 * The `cmb` function combines two of the same `Semigroup` values.
 *
 * ## Working with generic semigroups
 *
 * Sometimes it is necessary to work with arbitrary semigroups. To require that
 * a generic type `A` implements `Semigroup`, we write `A extends Semigroup<A>`.
 *
 * @example Working with generic semigroups
 *
 * Consider a program that combines an arbitrary semigroup with itself a finite
 * number of times:
 *
 * ```ts
 * import { cmb, Semigroup } from "@neotype/prelude/cmp.js";
 *
 * function cmbTimes<A extends Semigroup<A>>(x: A, n: number): A {
 *     if (n < 2 || n === Infinity) {
 *         return x;
 *     }
 *
 *     let acc = x;
 *     for (let i = 0; i < n; i++) {
 *         acc = cmb(acc, x);
 *     }
 *     return acc;
 * }
 * ```
 *
 * [semigroups]: https://mathworld.wolfram.com/Semigroup.html
 *
 * @module
 */

/**
 * An interface that provides evidence of a [semigroup].
 *
 * @remarks
 *
 * ## Properties
 *
 * Implementors of `Semigroup` must implement an operation that satisfies the
 * [associative property], such that:
 *
 * -   `cmb(x, cmb(y, z))` is equivalent to `cmb(cmb(x, y), z)`
 *
 * for all values `x`, `y`, and `z`.
 *
 * ## Implementing `Semigroup`
 *
 * `Semigroup` requires an implementation for `[Semigroup.cmb]`.
 *
 * The most common implementation strategies are writing classes and patching
 * existing prototypes. Implementation is implicit and does not require an
 * `implements` clause. TypeScript uses [structural subtyping] to determine
 * whether a value implements `Semigroup`.
 *
 * ### Conditional implementation
 *
 * Working with generic types requires additional consideration: in some cases,
 * a generic type implements `Semigroup` **only** when one or more of its
 * generic parameters implement `Semigroup`; in these cases, we must require a
 * `Semigroup` implementation from the parameter(s). In other cases, there are
 * no such requirements.
 *
 * ### Writing classes
 *
 * Classes and objects can implement `Semigroup`. This strategy works best for
 * types that:
 *
 * -   are already modeled using classes or objects.
 * -   provide direct access to their implementation.
 * -   have a single, specific behavior as a semigroup.
 *
 * Additionally, classes can easily wrap existing types to provide a variety of
 * `Semigroup` implementations. These "helper" classes are useful for types
 * that:
 *
 * -   have more than one behavior as a semigroup, or already have a default
 *     implementation for `Semigroup` but can have alternative implementations.
 * -   do not provide access to their implementation, and where patching the
 *     implementation is undesireable.
 *
 * ### Patching existing prototypes
 *
 * Existing types can be patched to implement `Semigroup`. This strategy works
 * well for types that:
 *
 * -   are built-in or imported from external modules.
 * -   do not provide access to their implementation.
 * -   have a single, specific behavior as a semigroup, or where the programmer
 *     wishes to implement a default behavior.
 *
 * Patching a type in TypeScript requires two steps:
 *
 * 1.  an [augmentation] for a module or the global scope that patches the
 *     type-level representation; and
 * 2.  a concrete implementation for `[Semigroup.cmb]`.
 *
 * The concrete implementation logic is similar to writing a method body for a
 * class or object, and the same practices apply when requiring generic type
 * parameters to implement `Semigroup`.
 *
 * @example Non-generic implementation
 *
 * Consider a type that combines strings using concatenation:
 *
 * ```ts
 * import { Semigroup } from "@neotype/prelude/cmb.js";
 *
 * class Str {
 *     constructor(readonly val: string) {}
 *
 *     [Semigroup.cmb](that: Str): Str {
 *         return new Str(this.val + that.val);
 *     }
 * }
 * ```
 *
 * @example Generic implementation with no `Semigroup` requirements
 *
 * Consider a type that combines arrays using concatenation:
 *
 * ```ts
 * import { Semigroup } from "@neotype/prelude/cmb.js";
 *
 * class Concat<out A> {
 *     constructor(readonly val: A[]) {}
 *
 *     [Semigroup.cmb](that: Concat<A>): Concat<A> {
 *         return new Concat([...this.val, ...that.val]);
 *     }
 * }
 * ```
 *
 * Notice how `Concat` is generic, but there are no special requirements for
 * implementing `[Semigroup.cmb]`.
 *
 * @example Generic implementation with a `Semigroup` requirement
 *
 * Consider a type that combines `Promise` values by combining their results,
 * which requires that the results also implement `Semigroup`:
 *
 * ```ts
 * import { cmb, Semigroup } from "@neotype/prelude/cmb.js";
 *
 * class Async<out A> {
 *     constructor(readonly val: Promise<A>) {}
 *
 *     [Semigroup.cmb]<A extends Semigroup<A>>(
 *         this: Async<A>,
 *         that: Async<A>,
 *     ): Async<A> {
 *         return new Async(
 *             this.val.then((x) => that.val.then((y) => cmb(x, y))),
 *         );
 *     }
 * }
 * ```
 *
 * Notice the extra syntax when implementing `[Semigroup.cmb]`. We introduce
 * a *method-scoped* generic parameter `A` and require that it has a `Semigroup`
 * implementation by writing `A extends Semigroup<A>` (the name `A` is
 * arbitrary).
 *
 * Then, we require that `this` and `that` are `Async<A>` where `A extends
 * Semigroup<A>`. This allows us to use `cmb` to implement our desired behavior.
 *
 * @example Generic implementation with multiple `Semigroup` requirements
 *
 * Consider a type that combines two values pairwise, which requires that each
 * value implement `Semigroup`:
 *
 * ```ts
 * import { cmb, Semigroup } from "@neotype/prelude/cmb.js";
 *
 * class Pair<out A, out B> {
 *     constructor(readonly fst: A, readonly snd: B) {}
 *
 *     [Semigroup.cmb]<A extends Semigroup<A>, B extends Semigroup<B>>(
 *         this: Pair<A, B>,
 *         that: Pair<A, B>,
 *     ): Pair<A, B> {
 *         return new Pair(cmb(this.fst, that.fst), cmb(this.snd, that.snd));
 *     }
 * }
 * ```
 *
 * The syntax is similar to the `Async` implementation above. Notice there are
 * now two method-scoped generic parameters that are each required to implement
 * `Semigroup`.
 *
 * @example Non-generic augmentation
 *
 * Consider a global augmentation for the `String` prototype:
 *
 * ```ts
 * import { Semigroup } from "@neotype/prelude/cmb.js";
 *
 * declare global {
 *     interface String {
 *         [Semigroup.cmb](that: string): string
 *     }
 * }
 *
 * String.prototype[Semigroup.cmb] = function (that: string): string {
 *     return this + that;
 * };
 * ```
 *
 * @example Generic augmentation
 *
 * Consider a module augmentation for an externally defined `Pair` type:
 *
 * ```ts
 * import { cmb, Semigroup } from "@neotype/prelude/cmb.js";
 * import { Pair } from "path_to/pair.js";
 *
 * declare module "path_to/pair.js" {
 *     interface Pair<A, B> {
 *         [Semigroup.cmb]<A extends Semigroup<A>, B extends Semigroup<B>>(
 *             this: Pair<A, B>,
 *             that: Pair<A, B>,
 *         ): Pair<A, B>
 *     }
 * }
 *
 * Pair.prototype[Semigroup.cmb] = function <
 *     A extends Semigroup<A>,
 *     B extends Semigroup<B>,
 * >(this: Pair<A, B>, that: Pair<A, B>): Pair<A, B> {
 *     return new Pair(cmb(this.fst, that.fst), cmb(this.snd, that.snd));
 * };
 * ```
 *
 * [semigroup]: https://mathworld.wolfram.com/Semigroup.html
 * [associative property]: https://mathworld.wolfram.com/Associative.html
 * [structural subtyping]:
 *     https://www.typescriptlang.org/docs/handbook/type-compatibility.html#site-content
 * [augmentation]:
 *     https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
 */
export interface Semigroup<in out A> {
    /**
     * Combine this and that `Semigroup` value using an associative binary
     * operation.
     */
    [Semigroup.cmb](that: A): A;
}

/**
 * The companion namespace for the `Semigroup` interface.
 */
export namespace Semigroup {
    /**
     * The unique symbol used by implementors of `Semigroup`.
     */
    export const cmb = Symbol();
}

/**
 * Combine two of the same `Semigroup` values.
 *
 * @remarks
 *
 * `cmb(x, y)` is equivalent to `x[Semigroup.cmb](y)`.
 */
export function cmb<A extends Semigroup<A>>(x: A, y: A): A {
    return x[Semigroup.cmb](y);
}
