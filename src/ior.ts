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
 * Functionality for "inclusive-or" relationships.
 *
 * `Ior<A, B>` is a type that represents *one or both* of two values `A` and
 * `B`; thus, `Ior` is represented by three variants: `Left<A>`, `Right<B>`,
 * and `Both<A, B>`.
 *
 * `Ior` is often used to represent states of failure or success similar to
 * `Either` and `Validated`. However, `Ior` is capable of also representing a
 * unique state using the `Both` variant. `Both` can represent a success that
 * carries additional information, or a state of *partial failure*.
 *
 * When composed, the behavior of `Ior` is a combination of the short-circuiting
 * behavior of `Either` and the failure-accumulating behavior of `Validated`:
 *
 * -   `Left` short-circuits a computation completely and combines its value
 *     with any existing left-hand value.
 * -   `Right` supplies its value to the next computation.
 * -   `Both` supplies its right-hand value to the next computation, and
 *     combines its left-hand value with any existing left-hand value.
 *
 * Combinators with this behavior will require a `Semigroup` implementation for
 * the accumulating left-hand value. This documentation will use the following
 * semigroup ahd utility functions in all examples:
 *
 * ```ts
 * import { Semigroup } from "@neotype/prelude/cmb.js";
 *
 * class List<A> {
 *     readonly val: A[];
 *
 *     constructor(...vals: A[]) {
 *         this.val = vals;
 *     }
 *
 *     [Semigroup.cmb](that: List<A>): List<A> {
 *         return new List(...this.val, ...that.val);
 *     }
 * }
 *
 * type Log = List<string>;
 *
 * function info(msg: string): Log {
 *     return new List(`Info: ${msg}`);
 * }
 *
 * function err(msg: string): Log {
 *     return new List(`Err: ${msg}`);
 * }
 * ```
 *
 * ## Importing from this module
 *
 * This module exposes `Ior` as both a type and a namespace. The `Ior` type is
 * an alias for a discriminated union, and the `Ior` namespace provides:
 *
 * -   The `Left`, `Right`, and `Both` variant classes
 * -   An abstract `Syntax` class that provides the fluent API for `Ior`
 * -   A `Typ` enumeration that discriminates `Ior`
 * -   Functions for constructing, chaining, and collecting into `Ior`
 *
 * The type and namespace can be imported under the same alias:
 *
 * ```ts
 * import { Ior } from "@neotype/prelude/ior.js";
 *
 * const example: Ior<List<string>, number> = Ior.both(new List("a"), 1);
 * ```
 *
 * Or, the type and namespace can be imported and aliased separately:
 *
 * ```ts
 * import { type Ior, Ior as I } from "@neotype/prelude/ior.js";
 *
 * const example: Ior<List<string>, number> = I.both(new List("a"), 1);
 * ```
 *
 * ## Constructing `Ior`
 *
 * The `left`, `right`, and `both` functions construct the `Left`, `Right`,
 * and `Both` variants of `Ior`, respectively.
 *
 * ## Querying and narrowing the variant
 *
 * The `isLeft`, `isRight`, and `isBoth` methods return `true` if an Ior is the
 * `Left`, `Right`, or `Both`  variant, respectively. These methods will also
 * narrow the type of an Ior to its queried variant.
 *
 * An Ior's variant can also be queried and narrowed via the `typ` property,
 * which returns a member of the `Typ` enumeration.
 *
 * ## Extracting values
 *
 * When an Ior is `Left` or `Right`, its value can be accessed via the `val`
 * property. When an Ior is `Both`, its left-hand and right-hand values can be
 * accessed via the `fst` and `snd` properties, respectively.
 *
 * Alternatively, the `fold` method will unwrap an Ior by applying one of three
 * functions to its left-hand and/or right-hand value(s).
 *
 * ## Comparing `Ior`
 *
 * `Ior` implements `Eq` and `Ord` when both its left-hand and right-hand values
 * implement `Eq` and `Ord`.
 *
 * -   Two Iors are equal if they are the same variant and their value(s) is
 *     (are) equal.
 * -   When compared, `Left` is less than `Right`, and `Right` is less than
 *     `Both`. If the variants are equal, their values determine the ordering.
 *     `Both` compares its `fst` and `snd` properties lexicographically.
 *
 * ## `Ior` as a semigroup
 *
 * `Ior` implements `Semigroup` when both its left-hand and right-hand values
 * implement `Semigroup`. Left-hand and right-hand values are combined pairwise,
 * and will accumulate into `Both`:
 *
 * ```ts
 * import { cmb } from "@neotype/prelude/cmb.js";
 *
 * const combined: Ior<List<string>, List<string>> = [
 *     Ior.left(new List("a")),
 *     Ior.both(new List("b"), new List("x")),
 *     Ior.right(new List("y")),
 * ].reduce(cmb);
 *
 * console.log(combined);
 * ```
 *
 * ## Transforming values
 *
 * These methods transform an Ior's value(s):
 *
 * -   `bimap` applies one or two functions to the left-hand and/or right-hand
 *     value(s) depending on the Ior's variant.
 * -   `mapLeft` applies a function to the left-hand value, leaving the
 *     right-hand value unaffected.
 * -   `map` applies a function to the right-hand value, leaving the left-hand
 *     value unaffected.
 * -   `mapTo` overwrites the right-hand value, leaving the left-hand value
 *     unaffected.
 *
 * These methods combine the right-hand values of two `Right` and/or `Both`
 * variants:
 *
 * -   `zipWith` applies a function to their values.
 * -   `zipFst` keeps only the first value, and discards the second.
 * -   `zipSnd` keeps only the second value, and discards the first.
 *
 * ## Chaining `Ior`
 *
 * The `flatMap` method chains together computations that return `Ior`. If an
 * Ior is `Right` or `Both`, a function is applied to its right-hand value and
 * evaluated to return another Ior. Left-hand values are accumulated along the
 * way and require an implementation for `Semigroup`. If any Ior is `Left`, the
 * computation is halted and the `Left` is returned instead.
 *
 * Consider a program that uses `Ior` to parse an even integer:
 *
 * ```ts
 * function parseInt(input: string): Ior<Log, number> {
 *     const n = Number.parseInt(input);
 *     if (Number.isNaN(n)) {
 *         return Ior.left(err(`cannot parse integer from ${input}`));
 *     }
 *     return Ior.both(info(`parse integer ${n}`), n);
 * }
 *
 * function guardEven(n: number): Ior<Log, number> {
 *     if (n % 2 === 0) {
 *         return Ior.both(info(`assert ${n} is even`), n);
 *     }
 *     return Ior.left(err(`${n} is not even`));
 * }
 *
 * function parseEvenInt(input: string): Ior<Log, number> {
 *     return parseInt(input).flatMap(guardEven);
 * }
 *
 * console.log(parseEvenInt("a"));
 * console.log(parseEvenInt("1"));
 * console.log(parseEvenInt("2"));
 * ```
 *
 * ### Generator comprehensions
 *
 * Generator comprehensions provide an alternative syntax for chaining together
 * computations that return `Ior`. Instead of `flatMap`, a generator is used
 * to unwrap `Right` and `Both` variants, and apply functions to their
 * right-hand values.
 *
 * The `go` function evaluates a generator to return an Ior. Within the
 * generator, Iors are yielded using the `yield*` keyword. This binds the
 * right-hand values to specified variables. When the computation is complete, a
 * final value can be computed and returned from the generator.
 *
 * Generator comprehensions support all syntax that would otherwise be valid
 * within a generator, including:
 *
 * -   Variable declarations, assignments, and mutations
 * -   Function and class declarations
 * -   `for` loops
 * -   `while` and `do...while` loops
 * -   `if`/`else if`/`else` blocks
 * -   `switch` blocks
 * -   `try`/`catch` blocks
 *
 * Consider the generator comprehension equivalent of the `parseEvenInt`
 * function above:
 *
 * ```ts
 * function parseEvenInt(input: string): Ior<Log, number> {
 *     return Ior.go(function* () {
 *         const n = yield* parseInt(input);
 *         const even = yield* guardEven(n);
 *         return even;
 *     });
 * }
 * ```
 *
 * Async generator comprehensions provide `async/await` syntax and Promises to
 * `Ior` generator comprehensions. Async computations that return `Ior` can
 * be chained together using the familiar generator syntax.
 *
 * The `goAsync` function evaluates an async generator to return a Promise that
 * fulfills with a `Ior`. The semantics of `yield*` and `return` within async
 * comprehensions are identical to their synchronous counterparts.
 *
 * In addition to the syntax permitted in synchronous generator comprehensions,
 * async comprehensions also support:
 *
 * -   the `await` keyword
 * -   `for await` loops (asynchronous iteration)
 *
 * Consider a program that uses requests data from a remote API and uses `Ior`
 * to guard against unlocatable resources:
 *
 * ```ts
 * interface User {
 *     readonly id: number;
 *     readonly username: string;
 * }
 *
 * // Contains 10 Users, with ids from 1 - 10
 * const usersEndpoint = "https://jsonplaceholder.typicode.com/users";
 *
 * async function fetchUsernameByUserId(
 *     id: number
 * ): Promise<Ior<Log, string>> {
 *     const response = await fetch(`${usersEndpoint}/${id}`);
 *     if (!response.ok) {
 *         return Ior.left(err(`user with id ${id} not found`));
 *     }
 *     const user: User = await response.json();
 *     return Ior.both(info(`found user with id ${id}`), user.username);
 * }
 *
 * function fetchUsernamesByUserIds(
 *     id1: number,
 *     id2: number,
 * ): Promise<Ior<Log, readonly [string, string]>> {
 *     return Ior.goAsync(async function* () {
 *         const uname1 = yield* await fetchUsernameByUserId(id1);
 *         const uname2 = yield* await fetchUsernameByUserId(id2);
 *         return [uname1, uname2] as const;
 *     });
 * }
 *
 * console.log(await fetchUsernamesByUserIds(12, 7));
 * console.log(await fetchUsernamesByUserIds(5, 14));
 * console.log(await fetchUsernamesByUserIds(6, 3));
 * ```
 *
 * ## Collecting into `Ior`
 *
 * `Ior` provides several functions for working with collections of Iors.
 * Sometimes, a collection of Iors must be turned "inside out" into an Ior that
 * contains a "mapped" collection of right-hand values.
 *
 * These methods will traverse a collection of Iors to extract the right-hand
 * values. If any Ior in the collection is `Left`, the traversal is halted and
 * and the `Left` is returned instead. An implementation for `Semigroup` is
 * required for left-hand values so they may accumulate.
 *
 * -   `collect` turns an Array or a tuple literal of Iors inside out.
 * -   `tupled` turns a series of two or more individual Iors inside out.
 *
 * Additionally, the `reduce` function reduces a finite Iterable from left to
 * right in the context of `Ior`. This is useful for mapping, filtering, and
 * accumulating values using `Ior`:
 *
 * ```ts
 * function sumOnlyEvens(nums: number[]): Ior<Log, number> {
 *     return Ior.reduce(
 *         nums,
 *         (total, num) => {
 *             if (num % 2 !== 0) {
 *                 return Ior.left(err(`encountered odd number ${num}`));
 *             }
 *             return Ior.both(info(`add ${total} and ${num}`), total + num);
 *         },
 *         0,
 *     );
 * }
 *
 * console.log(sumOnlyEvens([2, 3, 6]));
 * console.log(sumOnlyEvens([2, 4, 6]));
 * ```
 *
 * @module
 */

import { cmb, Semigroup } from "./cmb.js";
import { cmp, Eq, eq, Ord, Ordering } from "./cmp.js";
import { type Either } from "./either.js";
import { id } from "./fn.js";

/**
 * A type that represents one or both of two values (`Left`, `Right`, or
 * `Both`).
 */
export type Ior<A, B> = Ior.Left<A> | Ior.Right<B> | Ior.Both<A, B>;

/**
 * The companion namespace for the `Ior` type.
 */
export namespace Ior {
    /**
     * An enumeration that discriminates `Ior`.
     */
    export enum Typ {
        Left,
        Right,
        Both,
    }

    /**
     * Construct a `Left` Ior with an optional type witness for the right-hand
     * value.
     */
    export function left<A, B = never>(x: A): Ior<A, B> {
        return new Left(x);
    }

    /**
     * Construct a `Right` Ior with an optional type witness for the left-hand
     * value.
     */
    export function right<B, A = never>(x: B): Ior<A, B> {
        return new Right(x);
    }

    /**
     * Construct a `Both` Ior.
     */
    export function both<A, B>(x: A, y: B): Ior<A, B> {
        return new Both(x, y);
    }

    /**
     * Construct an Ior from an Either.
     *
     * `Right` and `Left` Eithers will become `Right` and `Left` Iors,
     * respectively.
     */
    export function fromEither<A, B>(either: Either<A, B>): Ior<A, B> {
        return either.fold(left, right);
    }

    /**
     * Construct an Ior using a generator comprehension.
     */
    export function go<E extends Semigroup<E>, A>(
        f: () => Generator<readonly [Ior<E, any>], A, any>,
    ): Ior<E, A> {
        const gen = f();
        let nxt = gen.next();
        let acc: E | undefined;

        while (!nxt.done) {
            const ior = nxt.value[0];
            if (ior.isRight()) {
                nxt = gen.next(ior.val);
            } else if (ior.isBoth()) {
                acc = acc !== undefined ? cmb(acc, ior.fst) : ior.fst;
                nxt = gen.next(ior.snd);
            } else {
                return acc !== undefined ? left(cmb(acc, ior.val)) : ior;
            }
        }
        return acc !== undefined ? both(acc, nxt.value) : right(nxt.value);
    }

    /**
     * Reduce a finite Iterable from left to right in the context of `Ior`.
     */
    export function reduce<A, B, E extends Semigroup<E>>(
        xs: Iterable<A>,
        f: (acc: B, x: A) => Ior<E, B>,
        initial: B,
    ): Ior<E, B> {
        return go(function* () {
            let acc = initial;
            for (const x of xs) {
                acc = yield* f(acc, x);
            }
            return acc;
        });
    }

    /**
     * Evaluate the Iors in an Array or a tuple literal from left to right and
     * collect the right-hand values in an Array or a tuple literal,
     * respectively.
     */
    export function collect<E extends Semigroup<E>, A0, A1>(
        iors: readonly [Ior<E, A0>, Ior<E, A1>],
    ): Ior<E, readonly [A0, A1]>;

    export function collect<E extends Semigroup<E>, A0, A1, A2>(
        iors: readonly [Ior<E, A0>, Ior<E, A1>, Ior<E, A2>],
    ): Ior<E, readonly [A0, A1, A2]>;

    export function collect<E extends Semigroup<E>, A0, A1, A2, A3>(
        iors: readonly [Ior<E, A0>, Ior<E, A1>, Ior<E, A2>, Ior<E, A3>],
    ): Ior<E, readonly [A0, A1, A2, A3]>;

    export function collect<E extends Semigroup<E>, A0, A1, A2, A3, A4>(
        iors: readonly [
            Ior<E, A0>,
            Ior<E, A1>,
            Ior<E, A2>,
            Ior<E, A3>,
            Ior<E, A4>,
        ],
    ): Ior<E, readonly [A0, A1, A2, A3, A4]>;

    export function collect<E extends Semigroup<E>, A0, A1, A2, A3, A4, A5>(
        iors: readonly [
            Ior<E, A0>,
            Ior<E, A1>,
            Ior<E, A2>,
            Ior<E, A3>,
            Ior<E, A4>,
            Ior<E, A5>,
        ],
    ): Ior<E, readonly [A0, A1, A2, A3, A4, A5]>;

    export function collect<E extends Semigroup<E>, A0, A1, A2, A3, A4, A5, A6>(
        iors: readonly [
            Ior<E, A0>,
            Ior<E, A1>,
            Ior<E, A2>,
            Ior<E, A3>,
            Ior<E, A4>,
            Ior<E, A5>,
            Ior<E, A6>,
        ],
    ): Ior<E, readonly [A0, A1, A2, A3, A4, A5, A6]>;

    // prettier-ignore
    export function collect<E extends Semigroup<E>, A0, A1, A2, A3, A4, A5, A6, A7>(
        iors: readonly [
            Ior<E, A0>,
            Ior<E, A1>,
            Ior<E, A2>,
            Ior<E, A3>,
            Ior<E, A4>,
            Ior<E, A5>,
            Ior<E, A6>,
            Ior<E, A7>,
        ],
    ): Ior<E, readonly [A0, A1, A2, A3, A4, A5, A6, A7]>;

    // prettier-ignore
    export function collect<E extends Semigroup<E>, A0, A1, A2, A3, A4, A5, A6, A7, A8>(
        iors: readonly [
            Ior<E, A0>,
            Ior<E, A1>,
            Ior<E, A2>,
            Ior<E, A3>,
            Ior<E, A4>,
            Ior<E, A5>,
            Ior<E, A6>,
            Ior<E, A7>,
            Ior<E, A8>,
        ],
    ): Ior<E, readonly [A0, A1, A2, A3, A4, A5, A6, A7, A8]>;

    // prettier-ignore
    export function collect<E extends Semigroup<E>, A0, A1, A2, A3, A4, A5, A6, A7, A8, A9>(
        iors: readonly [
            Ior<E, A0>,
            Ior<E, A1>,
            Ior<E, A2>,
            Ior<E, A3>,
            Ior<E, A4>,
            Ior<E, A5>,
            Ior<E, A6>,
            Ior<E, A7>,
            Ior<E, A8>,
            Ior<E, A9>,
        ],
    ): Ior<E, readonly [A0, A1, A2, A3, A4, A5, A6, A7, A8, A9]>;

    export function collect<E extends Semigroup<E>, A>(
        iors: readonly Ior<E, A>[],
    ): Ior<E, readonly A[]>;

    export function collect<E extends Semigroup<E>, A>(
        iors: readonly Ior<E, A>[],
    ): Ior<E, readonly A[]> {
        return go(function* () {
            const results: A[] = new Array(iors.length);
            for (const [idx, ior] of iors.entries()) {
                results[idx] = yield* ior;
            }
            return results;
        });
    }

    /**
     * Evaluate a series of Iors from left to right and collect the right-hand
     * values in a tuple literal.
     */
    export function tupled<E extends Semigroup<E>, A0, A1>(
        ...iors: [Ior<E, A0>, Ior<E, A1>]
    ): Ior<E, readonly [A0, A1]>;

    export function tupled<E extends Semigroup<E>, A0, A1, A2>(
        ...iors: [Ior<E, A0>, Ior<E, A1>, Ior<E, A2>]
    ): Ior<E, readonly [A0, A1, A2]>;

    export function tupled<E extends Semigroup<E>, A0, A1, A2, A3>(
        ...iors: [Ior<E, A0>, Ior<E, A1>, Ior<E, A2>, Ior<E, A3>]
    ): Ior<E, readonly [A0, A1, A2, A3]>;

    export function tupled<E extends Semigroup<E>, A0, A1, A2, A3, A4>(
        ...iors: [Ior<E, A0>, Ior<E, A1>, Ior<E, A2>, Ior<E, A3>, Ior<E, A4>]
    ): Ior<E, readonly [A0, A1, A2, A3, A4]>;

    export function tupled<E extends Semigroup<E>, A0, A1, A2, A3, A4, A5>(
        ...iors: [
            Ior<E, A0>,
            Ior<E, A1>,
            Ior<E, A2>,
            Ior<E, A3>,
            Ior<E, A4>,
            Ior<E, A5>,
        ]
    ): Ior<E, readonly [A0, A1, A2, A3, A4, A5]>;

    export function tupled<E extends Semigroup<E>, A0, A1, A2, A3, A4, A5, A6>(
        ...iors: [
            Ior<E, A0>,
            Ior<E, A1>,
            Ior<E, A2>,
            Ior<E, A3>,
            Ior<E, A4>,
            Ior<E, A5>,
            Ior<E, A6>,
        ]
    ): Ior<E, readonly [A0, A1, A2, A3, A4, A5, A6]>;

    // prettier-ignore
    export function tupled<E extends Semigroup<E>, A0, A1, A2, A3, A4, A5, A6, A7>(
        ...iors: [
            Ior<E, A0>,
            Ior<E, A1>,
            Ior<E, A2>,
            Ior<E, A3>,
            Ior<E, A4>,
            Ior<E, A5>,
            Ior<E, A6>,
            Ior<E, A7>,
        ]
    ): Ior<E, readonly [A0, A1, A2, A3, A4, A5, A6, A7]>;

    // prettier-ignore
    export function tupled<E extends Semigroup<E>, A0, A1, A2, A3, A4, A5, A6, A7, A8>(
        ...iors: [
            Ior<E, A0>,
            Ior<E, A1>,
            Ior<E, A2>,
            Ior<E, A3>,
            Ior<E, A4>,
            Ior<E, A5>,
            Ior<E, A6>,
            Ior<E, A7>,
            Ior<E, A8>,
        ]
    ): Ior<E, readonly [A0, A1, A2, A3, A4, A5, A6, A7, A8]>;

    // prettier-ignore
    export function tupled<E extends Semigroup<E>, A0, A1, A2, A3, A4, A5, A6, A7, A8, A9>(
        ...iors: [
            Ior<E, A0>,
            Ior<E, A1>,
            Ior<E, A2>,
            Ior<E, A3>,
            Ior<E, A4>,
            Ior<E, A5>,
            Ior<E, A6>,
            Ior<E, A7>,
            Ior<E, A8>,
            Ior<E, A9>,
        ]
    ): Ior<E, readonly [A0, A1, A2, A3, A4, A5, A6, A7, A8, A9]>;

    export function tupled<E extends Semigroup<E>, A>(
        ...iors: Ior<E, A>[]
    ): Ior<E, readonly A[]> {
        return collect(iors);
    }

    /**
     * Construct a Promise that fulfills with an Ior using an async generator
     * comprehension.
     */
    export async function goAsync<E extends Semigroup<E>, A>(
        f: () => AsyncGenerator<readonly [Ior<E, any>], A, any>,
    ): Promise<Ior<E, A>> {
        const gen = f();
        let nxt = await gen.next();
        let acc: E | undefined;

        while (!nxt.done) {
            const ior = nxt.value[0];
            if (ior.isRight()) {
                nxt = await gen.next(ior.val);
            } else if (ior.isBoth()) {
                acc = acc !== undefined ? cmb(acc, ior.fst) : ior.fst;
                nxt = await gen.next(ior.snd);
            } else {
                return acc !== undefined ? left(cmb(acc, ior.val)) : ior;
            }
        }
        return acc !== undefined ? both(acc, nxt.value) : right(nxt.value);
    }

    /**
     * The fluent syntax for `Ior`.
     */
    export abstract class Syntax {
        [Eq.eq]<A extends Eq<A>, B extends Eq<B>>(
            this: Ior<A, B>,
            that: Ior<A, B>,
        ): boolean {
            if (this.isLeft()) {
                return that.isLeft() && eq(this.val, that.val);
            }
            if (this.isRight()) {
                return that.isRight() && eq(this.val, that.val);
            }
            return (
                that.isBoth() &&
                eq(this.fst, that.fst) &&
                eq(this.snd, that.snd)
            );
        }

        [Ord.cmp]<A extends Ord<A>, B extends Ord<B>>(
            this: Ior<A, B>,
            that: Ior<A, B>,
        ): Ordering {
            if (this.isLeft()) {
                return that.isLeft() ? cmp(this.val, that.val) : Ordering.less;
            }
            if (this.isRight()) {
                if (that.isRight()) {
                    return cmp(this.val, that.val);
                }
                return that.isLeft() ? Ordering.greater : Ordering.less;
            }
            if (that.isBoth()) {
                return cmb(cmp(this.fst, that.fst), cmp(this.snd, that.snd));
            }
            return Ordering.greater;
        }

        [Semigroup.cmb]<A extends Semigroup<A>, B extends Semigroup<B>>(
            this: Ior<A, B>,
            that: Ior<A, B>,
        ): Ior<A, B> {
            if (this.isLeft()) {
                if (that.isLeft()) {
                    return left(cmb(this.val, that.val));
                }
                if (that.isRight()) {
                    return both(this.val, that.val);
                }
                return both(cmb(this.val, that.fst), that.snd);
            }

            if (this.isRight()) {
                if (that.isLeft()) {
                    return both(that.val, this.val);
                }
                if (that.isRight()) {
                    return right(cmb(this.val, that.val));
                }
                return both(that.fst, cmb(this.val, that.snd));
            }

            if (that.isLeft()) {
                return both(cmb(this.fst, that.val), this.snd);
            }
            if (that.isRight()) {
                return both(this.fst, cmb(this.snd, that.val));
            }
            return both(cmb(this.fst, that.fst), cmb(this.snd, that.snd));
        }

        /**
         * Test whether this Ior is `Left`.
         */
        isLeft<A>(this: Ior<A, any>): this is Left<A> {
            return this.typ === Typ.Left;
        }

        /**
         * Test whether this Ior is `Right`.
         */
        isRight<B>(this: Ior<any, B>): this is Right<B> {
            return this.typ === Typ.Right;
        }

        /**
         * Test whether this Ior is `Both`.
         */
        isBoth<A, B>(this: Ior<A, B>): this is Both<A, B> {
            return this.typ === Typ.Both;
        }

        /**
         * Case analysis for `Ior`.
         */
        fold<A, B, C, D, E>(
            this: Ior<A, B>,
            foldL: (x: A, ior: Left<A>) => C,
            foldR: (x: B, ior: Right<B>) => D,
            foldB: (x: A, y: B, ior: Both<A, B>) => E,
        ): C | D | E {
            if (this.isLeft()) {
                return foldL(this.val, this);
            }
            if (this.isRight()) {
                return foldR(this.val, this);
            }
            return foldB(this.fst, this.snd, this);
        }

        /**
         * If this Ior has a right-hand value, apply a function to the value
         * to return a new Ior.
         */
        flatMap<E extends Semigroup<E>, A, B>(
            this: Ior<E, A>,
            f: (x: A) => Ior<E, B>,
        ): Ior<E, B> {
            if (this.isLeft()) {
                return this;
            }
            if (this.isRight()) {
                return f(this.val);
            }
            return f(this.snd).mapLeft((y) => cmb((this as Both<E, A>).fst, y));
        }

        /**
         * If this Ior's right-hand value is another Ior, return the inner Ior.
         */
        flat<E extends Semigroup<E>, A>(this: Ior<E, Ior<E, A>>): Ior<E, A> {
            return this.flatMap(id);
        }

        /**
         * If this and that Ior have a right-hand value, apply a function to
         * the values.
         */
        zipWith<E extends Semigroup<E>, A, B, C>(
            this: Ior<E, A>,
            that: Ior<E, B>,
            f: (x: A, y: B) => C,
        ): Ior<E, C> {
            return this.flatMap((x) => that.map((y) => f(x, y)));
        }

        /**
         * If this and that Ior have a right-hand value, keep only this Ior's
         * value.
         */
        zipFst<E extends Semigroup<E>, A>(
            this: Ior<E, A>,
            that: Ior<E, any>,
        ): Ior<E, A> {
            return this.zipWith(that, id);
        }

        /**
         * If this and that Ior have a right-hand value, keep only that Ior's
         * value.
         */
        zipSnd<E extends Semigroup<E>, B>(
            this: Ior<E, any>,
            that: Ior<E, B>,
        ): Ior<E, B> {
            return this.flatMap(() => that);
        }

        /**
         * Apply functions to this Ior's left and right values.
         */
        bimap<A, B, C, D>(
            this: Ior<A, B>,
            mapL: (x: A) => C,
            mapR: (x: B) => D,
        ): Ior<C, D> {
            if (this.isLeft()) {
                return left(mapL(this.val));
            }
            if (this.isRight()) {
                return right(mapR(this.val));
            }
            return both(mapL(this.fst), mapR(this.snd));
        }

        /**
         * If this Ior has a left-hand value, apply a function to the value.
         */
        mapLeft<A, B, C>(this: Ior<A, B>, f: (x: A) => C): Ior<C, B> {
            if (this.isRight()) {
                return this;
            }
            if (this.isLeft()) {
                return left(f(this.val));
            }
            return both(f(this.fst), this.snd);
        }

        /**
         * If this Ior has a right-hand value, apply a function to the value.
         */
        map<A, B, D>(this: Ior<A, B>, f: (x: B) => D): Ior<A, D> {
            if (this.isLeft()) {
                return this;
            }
            if (this.isRight()) {
                return right(f(this.val));
            }
            return both(this.fst, f(this.snd));
        }

        /**
         * If this Ior has a right-hand value, overwrite the value.
         */
        mapTo<A, D>(this: Ior<A, any>, value: D): Ior<A, D> {
            return this.map(() => value);
        }
    }

    /**
     * An Ior with a left-hand value.
     */
    export class Left<out A> extends Syntax {
        /**
         * The property that discriminates `Ior`.
         */
        readonly typ = Typ.Left;

        readonly val: A;

        constructor(val: A) {
            super();
            this.val = val;
        }

        /**
         * Defining Iterable behavior for `Ior` allows TypeScript to infer
         * right-hand value types when yielding Iors in generator comprehensions
         * using `yield*`.
         *
         * @hidden
         */
        *[Symbol.iterator](): Iterator<
            readonly [Ior<A, never>],
            never,
            unknown
        > {
            return (yield [this]) as never;
        }
    }

    /**
     * An Ior with a right-hand value.
     */
    export class Right<out B> extends Syntax {
        /**
         * The property that discriminates `Ior`.
         */
        readonly typ = Typ.Right;

        readonly val: B;

        constructor(val: B) {
            super();
            this.val = val;
        }

        /**
         * Defining Iterable behavior for `Ior` allows TypeScript to infer
         * right-hand value types when yielding Iors in generator comprehensions
         * using `yield*`.
         *
         * @hidden
         */
        *[Symbol.iterator](): Iterator<readonly [Ior<never, B>], B, unknown> {
            return (yield [this]) as B;
        }
    }

    /**
     * An Ior with a left-hand and a right-hand value.
     */
    export class Both<out A, out B> extends Syntax {
        /**
         * The property that discriminates `Ior`.
         */
        readonly typ = Typ.Both;

        readonly fst: A;
        readonly snd: B;

        constructor(fst: A, snd: B) {
            super();
            this.fst = fst;
            this.snd = snd;
        }

        /**
         * Defining Iterable behavior for `Ior` allows TypeScript to infer
         * right-hand value types when yielding Iors in generator comprehensions
         * using `yield*`.
         *
         * @hidden
         */
        *[Symbol.iterator](): Iterator<readonly [Ior<A, B>], B, unknown> {
            return (yield [this]) as B;
        }
    }
}
