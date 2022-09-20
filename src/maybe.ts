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
 * Optional values.
 *
 * `Maybe<A>` is a type that represents an optional value `A`, and is
 * represented by two variants: `Nothing` describes an absent value, and
 * `Just<A>` describes a present value.
 *
 * Common uses for `Maybe` include:
 *
 * - Initial values
 * - Nullable values
 * - Optional fields in classes and objects
 * - Return values for functions that are not defined over their entire input
 *   range (partial functions)
 * - Return values for reporting simple failures, where `Nothing` is returned on
 *   failure
 * - Optional function arguments
 *
 * ## Importing from this module
 *
 * This module exports `Maybe` as both a type and a namespace. The `Maybe` type
 * is an alias for a discriminated union, and the `Maybe` namespace provides:
 *
 * - The `Nothing` and `Just` variant classes
 * - An abstract `Syntax` class that provides the fluent API for `Maybe`
 * - A `Typ` enumeration that discriminates `Maybe`
 * - The `nothing` constant
 * - Functions for constructing, chaining, and collecting into `Maybe`
 *
 * The type and namespce can be imported under the same alias:
 *
 * ```ts
 * import { Maybe } from "@neotype/prelude/maybe.js";
 *
 * const example: Maybe<number> = Maybe.just(1);
 * ```
 *
 * Or, the type and namespace can be imported and aliased separately:
 *
 * ```ts
 * import { type Maybe, Maybe as M } from "@neotype/prelude/maybe.js";
 *
 * const example: Maybe<number> = M.just(1);
 * ```
 *
 * ## Constructing `Maybe`
 *
 * The `nothing` constant is the singleton instance of Maybe's `Nothing`
 * variant. The `just` function constructs a `Just` variant of `Maybe`.
 *
 * Furthermore:
 *
 * - `fromMissing` constructs a Maybe from a value that is potentially `null`
 *   or `undefined`, and converts such values to `Nothing`.
 * - `guard` constructs a Maybe from applying a predicate function to a value.
 *   A value that satisfies the predicate is returned in `Just`, and `Nothing`
 *   is returned otherwise.
 *
 * ## Querying and narrowing the variant
 *
 * The `isNothing` and `isJust` methods return `true` if a Maybe is the
 * `Nothing` or `Just` variant, respectively. These methods will also narrow the
 * type of a Maybe to its queried variant.
 *
 * A Maybe's variant can also be queried and narrowed via the `typ` property,
 * which returns a member of the `Typ` enumeration.
 *
 * ## Extracting values
 *
 * When a Maybe is `Just`, its value can be accessed via the `val` property. To
 * access the property, the Maybe's variant must first be queried and narrowed
 * to `Just`.
 *
 * Alternatively, the `fold` method will unwrap a Maybe by either evaluating a
 * function in the case of `Nothing`, or applying a function to the `Just`
 * value.
 *
 * These methods will extract the value from a `Just` Maybe. If the Maybe is
 * `Nothing`:
 *
 * - `justOrFold` returns the result of evaluating a provided fallback function.
 * - `justOrElse` returns a provided fallback value.
 *
 * ## Comparing `Maybe`
 *
 * `Maybe` implements `Eq` and `Ord` when its value implements `Eq` and `Ord`,
 * respectively.
 *
 * - Two Maybes are equal if they are both `Nothing`, or they are both `Just`
 *   and their values are equal.
 * - When ordered, `Nothing` is always less than `Just`. If both Maybes are
 *   `Just`, their values will determine the ordering.
 *
 * ## `Maybe` as a semigroup
 *
 * `Maybe` implements `Semigroup` when its value implements `Semigroup`. When
 * combined, `Just` precedes `Nothing`. If both Maybes are `Just`, thier values
 * are combined and returned in `Just`.
 *
 * ## Transforming values
 *
 * These methods transform a Maybe's value:
 *
 * - `map` applies a function to the `Just` value, and leaves `Nothing`
 *   unaffected.
 * - `mapTo` overwrites the `Just` value, and leaves `Nothing` unaffected.
 *
 * These methods combine the values of two `Just` variants:
 *
 * - `zipWith` applies a function to their values.
 * - `zipFst` keeps only the first value, and discards the second.
 * - `zipSnd` keeps only the second value, and discards the first.
 *
 * ## Chaining `Maybe`
 *
 * The `flatMap` method chains together computations that return `Maybe`. If a
 * Maybe is `Just`, a function is applied to its value and evaluated to return
 * another Maybe. If any Maybe is `Nothing`, the computation is halted and
 * `Nothing` is returned instead.
 *
 * Consider a program that uses `Maybe` to parse an even integer:
 *
 * ```ts
 * function parseInt(input: string): Maybe<number> {
 *     const n = Number.parseInt(input);
 *     return Number.isNaN(n) ? Maybe.nothing : Maybe.just(n);
 * }
 *
 * function guardEven(n: number): Maybe<number> {
 *     return Maybe.guard(n, (n) => n % 2 === 0);
 * }
 *
 * function parseEvenInt(input: string): Maybe<number> {
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
 * computations that return `Maybe`. Instead of `flatMap`, a generator is used
 * to unwrap `Just` variants and apply functions to their values.
 *
 * The `go` function evaluates a generator to return a Maybe. Within the
 * generator, Maybes are yielded using the `yield*` keyword. This binds the
 * `Just` values to specified variables. When the computation is complete, a
 * final value can be computed and returned from the generator.
 *
 * Generator comprehensions support all syntax that would otherwise be valid
 * within a generator, including:
 *
 * - Variable declarations, assignments, and mutations
 * - Function and class declarations
 * - `for` loops
 * - `while` and `do...while` loops
 * - `if`/`else if`/`else` blocks
 * - `switch` blocks
 * - `try`/`catch` blocks
 *
 * Consider the generator comprehension equivalent of the `parseEvenInt`
 * function above:
 *
 * ```ts
 * function parseEvenInt(input: string): Maybe<number> {
 *     return Maybe.go(function* () {
 *         const n = yield* parseInt(input);
 *         const even = yield* guardEven(n);
 *         return even;
 *     });
 * }
 * ```
 *
 * ### Async generator comprehensions
 *
 * Async generator comprehensions provide `async/await` syntax and Promises to
 * `Maybe` generator comprehensions. Async computations that return `Maybe` can
 * be chained together using the familiar generator syntax.
 *
 * The `goAsync` function evaluates an async generator to return a Promise that
 * fulfills with a Maybe. The semantics of `yield*` and `return` within async
 * comprehensions are identical to their synchronous counterparts.
 *
 * In addition to the syntax permitted in synchronous generator comprehensions,
 * async comprehensions also support:
 *
 * - the `await` keyword
 * - `for await` loops (asynchronous iteration)
 *
 * Consider a program that uses requests data from a remote API and uses `Maybe`
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
 * async function fetchUsernameByUserId(id: number): Promise<Maybe<string>> {
 *     const response = await fetch(`${usersEndpoint}/${id}`);
 *     if (!response.ok) {
 *         return Maybe.nothing;
 *     }
 *     const user: User = await response.json();
 *     return Maybe.just(user.username);
 * }
 *
 * function fetchUsernamesByUserIds(
 *     id1: number,
 *     id2: number,
 * ): Promise<Maybe<readonly [string, string]>> {
 *     return Maybe.goAsync(async function* () {
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
 * ## Collecting into `Maybe`
 *
 * `Maybe` provides several functions for working with collections of Maybes.
 * Sometimes, a collection of Maybes must be turned "inside out" into a Maybe
 * that contains a "mapped" collection of `Just` values.
 *
 * These methods will traverse a collection of Maybes to extract the `Just`
 * values. If any Maybe in the collection is `Nothing`, the traversal is halted
 * and `Nothing` is returned instead.
 *
 * - `collect` turns an Array or a tuple literal of Maybes inside out.
 * - `tupled` turns a series of two or more individual Maybes inside out.
 * - `gather` turns a Record or an object literal of Maybes inside out.
 *
 * Additionally, the `reduce` function reduces a finite Iterable from left to
 * right in the context of `Maybe`. This is useful for mapping, filtering, and
 * accumulating values using `Maybe`:
 *
 * ```ts
 * function sumOnlyEvens(nums: number[]): Maybe<number> {
 *     return Maybe.reduce(
 *         nums,
 *         (total, num) => Maybe.guard(total + num, (n) => n % 2 === 0),
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
import { id } from "./fn.js";

/**
 * A type that represents either an absent value (`Nothing`) or a present value
 * (`Just`).
 */
export type Maybe<A> = Maybe.Nothing | Maybe.Just<A>;

/**
 * The companion namespace for the `Maybe` type.
 */
export namespace Maybe {
    /**
     * An enumeration that discriminates Maybe.
     */
    export enum Typ {
        Nothing,
        Just,
    }

    /**
     * Construct a `Just` Maybe.
     */
    export function just<A>(x: A): Maybe<A> {
        return new Just(x);
    }

    /**
     * Consruct a Maybe, converting `null` and `undefined` to `Nothing`.
     */
    export function fromMissing<A>(x: A | null | undefined): Maybe<A> {
        return x === null || x === undefined ? nothing : just(x);
    }

    /**
     * Apply a predicate function to a value. If the predicate returns true,
     * return the value in a `Just`; otherwise, return `Nothing`.
     */
    export function guard<A, A1 extends A>(
        x: A,
        f: (x: A) => x is A1,
    ): Maybe<A1>;

    export function guard<A>(x: A, f: (x: A) => boolean): Maybe<A>;

    export function guard<A>(x: A, f: (x: A) => boolean): Maybe<A> {
        return f(x) ? just(x) : nothing;
    }

    /**
     * Construct a Maybe using a generator comprehension.
     */
    export function go<A>(
        f: () => Generator<readonly [Maybe<any>], A, any>,
    ): Maybe<A> {
        const gen = f();
        let nxt = gen.next();
        while (!nxt.done) {
            const maybe = nxt.value[0];
            if (maybe.isJust()) {
                nxt = gen.next(maybe.val);
            } else {
                return maybe;
            }
        }
        return just(nxt.value);
    }

    /**
     * Reduce a finite Iterable from left to right in the context of Maybe.
     */
    export function reduce<A, B>(
        xs: Iterable<A>,
        f: (acc: B, x: A) => Maybe<B>,
        initial: B,
    ): Maybe<B> {
        return go(function* () {
            let acc = initial;
            for (const x of xs) {
                acc = yield* f(acc, x);
            }
            return acc;
        });
    }

    /**
     * Evaluate the Maybes in an Array or a tuple literal from left to right and
     * collect the `Just` values in an Array or a tuple literal, respectively.
     */
    export function collect<T extends readonly Maybe<any>[]>(
        maybes: T,
    ): Maybe<Readonly<JustsT<T>>> {
        return go(function* () {
            const results = new Array(maybes.length);
            for (const [idx, maybe] of maybes.entries()) {
                results[idx] = yield* maybe;
            }
            return results as unknown as JustsT<T>;
        });
    }

    /**
     * Evaluate a series of Maybes from left to right and collect the `Just`
     * values in a tuple literal.
     */
    export function tupled<T extends [Maybe<any>, Maybe<any>, ...Maybe<any>[]]>(
        ...maybes: T
    ): Maybe<Readonly<JustsT<T>>> {
        return collect(maybes);
    }

    /**
     * Evaluate the Maybes in a Record or an object literal and collect the
     * `Just` values in a Record or an object literal, respectively.
     */
    export function gather<T extends Record<any, Maybe<any>>>(
        maybes: T,
    ): Maybe<{ readonly [K in keyof T]: JustT<T[K]> }> {
        return go(function* () {
            const results: Record<any, unknown> = {};
            for (const [key, maybe] of Object.entries(maybes)) {
                results[key] = yield* maybe;
            }
            return results as JustsT<T>;
        });
    }

    /**
     * Construct a Promise that fulfills with a Maybe using an async generator
     * comprehension.
     */
    export async function goAsync<A>(
        f: () => AsyncGenerator<readonly [Maybe<any>], A, any>,
    ): Promise<Maybe<A>> {
        const gen = f();
        let nxt = await gen.next();
        while (!nxt.done) {
            const maybe = nxt.value[0];
            if (maybe.isJust()) {
                nxt = await gen.next(maybe.val);
            } else {
                return maybe;
            }
        }
        return just(nxt.value);
    }

    /**
     * The fluent syntax for Maybe.
     */
    export abstract class Syntax {
        [Eq.eq]<A extends Eq<A>>(this: Maybe<A>, that: Maybe<A>): boolean {
            if (this.isNothing()) {
                return that.isNothing();
            }
            return that.isJust() && eq(this.val, that.val);
        }

        [Ord.cmp]<A extends Ord<A>>(this: Maybe<A>, that: Maybe<A>): Ordering {
            if (this.isNothing()) {
                return that.isNothing() ? Ordering.equal : Ordering.less;
            }
            return that.isNothing()
                ? Ordering.greater
                : cmp(this.val, that.val);
        }

        [Semigroup.cmb]<A extends Semigroup<A>>(
            this: Maybe<A>,
            that: Maybe<A>,
        ): Maybe<A> {
            if (this.isJust()) {
                return that.isJust() ? just(cmb(this.val, that.val)) : this;
            }
            return that;
        }

        /**
         * Test whether this Maybe is `Nothing`.
         */
        isNothing(this: Maybe<any>): this is Nothing {
            return this.typ === Typ.Nothing;
        }

        /**
         * Test whether this Maybe is `Just`.
         */
        isJust<A>(this: Maybe<A>): this is Just<A> {
            return this.typ === Typ.Just;
        }

        /**
         * Case analysis for Maybe.
         */
        fold<A, B, C>(
            this: Maybe<A>,
            foldN: () => B,
            foldJ: (x: A, maybe: Just<A>) => C,
        ): B | C {
            return this.isNothing() ? foldN() : foldJ(this.val, this);
        }

        /**
         * If this Maybe is `Just`, extract its value; otherwise, return a
         * fallback value.
         */
        justOrFold<A, B>(this: Maybe<A>, f: () => B): A | B {
            return this.fold(f, id);
        }

        /**
         * If this Maybe is `Just`, extract its value; otherwise, return a
         * fallback value.
         */
        justOrElse<A, B>(this: Maybe<A>, fallback: B): A | B {
            return this.fold(() => fallback, id);
        }

        /**
         * If this Maybe is `Nothing`, return a fallback Maybe.
         */
        orElse<A, B>(this: Maybe<A>, that: Maybe<B>): Maybe<A | B> {
            return this.isNothing() ? that : this;
        }

        /**
         * If this Maybe is `Just`, apply a function to its value to return a
         * new Maybe.
         */
        flatMap<A, B>(this: Maybe<A>, f: (x: A) => Maybe<B>): Maybe<B> {
            return this.isNothing() ? this : f(this.val);
        }

        /**
         * If this Maybe is `Just` and contains another Maybe, return the inner
         * Maybe.
         */
        flat<A>(this: Maybe<Maybe<A>>): Maybe<A> {
            return this.flatMap(id);
        }

        /**
         * If this and that Maybe are `Just`, apply a function to thier values.
         */
        zipWith<A, B, C>(
            this: Maybe<A>,
            that: Maybe<B>,
            f: (x: A, y: B) => C,
        ): Maybe<C> {
            return this.flatMap((x) => that.map((y) => f(x, y)));
        }

        /**
         * If this and that Maybe are `Just`, keep only this Maybe's value.
         */
        zipFst<A>(this: Maybe<A>, that: Maybe<any>): Maybe<A> {
            return this.zipWith(that, id);
        }

        /**
         * If this and that Maybe are `Just`, keep only that Maybe's value.
         */
        zipSnd<B>(this: Maybe<any>, that: Maybe<B>): Maybe<B> {
            return this.flatMap(() => that);
        }

        /**
         * If this Maybe is `Just`, apply a function to its value.
         */
        map<A, B>(this: Maybe<A>, f: (x: A) => B): Maybe<B> {
            return this.flatMap((x) => just(f(x)));
        }

        /**
         * If this Maybe is `Just`, overwrite its value.
         */
        mapTo<B>(this: Maybe<any>, value: B): Maybe<B> {
            return this.flatMap(() => just(value));
        }
    }

    /**
     * An absent Maybe.
     */
    export class Nothing extends Syntax {
        static readonly singleton = new Nothing();

        /**
         * The property that discriminates Maybe.
         */
        readonly typ = Typ.Nothing;

        private constructor() {
            super();
        }

        /**
         * Defining Iterable behavior for Maybe allows TypeScript to infer
         * `Just` types when yielding Maybes in generator comprehensions using
         * `yield*`.
         *
         * @hidden
         */
        *[Symbol.iterator](): Iterator<
            readonly [Maybe<never>],
            never,
            unknown
        > {
            return (yield [this]) as never;
        }
    }

    /**
     * A present Maybe.
     */
    export class Just<out A> extends Syntax {
        /**
         * The property that discriminates Maybe.
         */
        readonly typ = Typ.Just;

        readonly val: A;

        constructor(val: A) {
            super();
            this.val = val;
        }

        /**
         * Defining Iterable behavior for Maybe allows TypeScript to infer
         * `Just` types when yielding Maybes in generator comprehensions using
         * `yield*`.
         *
         * @hidden
         */
        *[Symbol.iterator](): Iterator<readonly [Maybe<A>], A, unknown> {
            return (yield [this]) as A;
        }
    }

    /**
     * The absent Maybe.
     */
    export const nothing = Maybe.Nothing.singleton as Maybe<never>;

    /**
     * Extract the present type `A` from the type `Maybe<A>`.
     */
    // prettier-ignore
    export type JustT<T extends Maybe<any>> =
        T extends Maybe<infer A> ? A : never;

    /**
     * Given an Array, a tuple literal, a Record, or an object literal of Maybe
     * types, map over the structure to return an equivalent structure of the
     * `Just` types.
     *
     * ```ts
     * type T0 = [Maybe<1>, Maybe<2>, Maybe<3>];
     * type T1 = JustsT<T0>; // [1, 2, 3]
     *
     * type T2 = { x: Maybe<1>, y: Maybe<2>, z: Maybe<3> };
     * type T3 = JustsT<T2>; // { x: 1, y: 2, z: 3 }
     * ```
     */
    export type JustsT<
        T extends readonly Maybe<any>[] | Record<any, Maybe<any>>,
    > = {
        [K in keyof T]: T[K] extends Maybe<infer A> ? A : never;
    };
}
