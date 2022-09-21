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
 * Functional unions and railway-oriented programming.
 *
 * `Either<A, B>` is a type that represents one of two values `A` and `B`; thus,
 * `Either` is represented by two variants: `Left<A>` and `Right<B>`.
 *
 * `Either` is often used to represent a value which is either correct or a
 * failure. By convention, `Left` contains failures and `Right` contains correct
 * values ("right" is a synonym for "correct").
 *
 * Some combinators for `Either` are specialized for this failure-handling
 * use case, and provide a right-biased behavior that "short-circuits" a
 * computation on the first encountered `Left` value. This behavior allows
 * Eithers to be composed in a way that propogates `Left` values while applying
 * logic to `Right` values -- a useful feature for railway-oriented programming.
 *
 * ## Importing from this module
 *
 * This module exposes `Either` as both a type and a namespace. The `Either`
 * type is an alias for a discriminated union, and the `Either` namespace
 * provides:
 *
 * - The `Left` and `Right` variant classes
 * - The abstract `Syntax` class that provides the fluent API for `Either`
 * - The `Typ` enumeration that discriminates `Either`
 * - Functions for constructing, chaining, and collecting into `Either`
 *
 * The type and namespace can be imported under the same alias:
 *
 * ```ts
 * import { Either } from "@neotype/prelude/either.js";
 *
 * const example: Either<string, number> = Either.right(1);
 * ```
 *
 * Or, the type and namespace can be imported and aliased separately:
 *
 * ```ts
 * import { type Either, Either as E } from "@neotype/prelude/either.js";
 *
 * const example: Either<string, number> = E.right(1);
 * ```
 *
 * ## Constructing `Either`
 *
 * The `left` and `right` functions construct the `Left` and `Right` variants
 * of `Either`, respectively.
 *
 * Furthermore:
 *
 * - `guard` constructs an Either from applying a predicate function to a value.
 *   The value is returned in `Right` or `Left` if it satisfies or does not
 *   satisfy the predicate, respectively.
 * - `fromValidated` converts a Validated to an Either. `Disputed` becomes
 *   `Left` and `Accepted` becomes `Right`.
 *
 * ## Querying and narrowing the variant
 *
 * The `isLeft` and `isRight` methods return `true` if an Either is the `Left`
 * or `Right` variant, respectively. These methods will also narrow the type of
 * an Either to its queried variant.
 *
 * An Either's variant can also be queried and narrowed via the `typ` property,
 * which returns a member of the `Typ` enumeration.
 *
 * ## Extracting values
 *
 * An Either's value can be accessed via the `val` property. The type of the
 * property can be narrowed by first querying the Either's variant.
 *
 * Alternatively, the `fold` method will unwrap an Either by applying one of two
 * functions to its `Left` or `Right` value.
 *
 * These methods will extract the value from an Either:
 *
 * - `leftOrFold` extracts the value if the Either is `Left`; otherwise, it
 *   applies a function to the `Right` value to return a fallback result.
 * - `rightOrFold` extracts the value if the Either is `Right`; otherwise, it
 *   applies a function to the `Left` value to return a fallback result.
 *
 * ## Comparing `Either`
 *
 * `Either` implements `Eq` and `Ord` when both its `Left` and `Right` values
 * implement `Eq` and `Ord`.
 *
 * - Two Eithers are equal if they are the same variant and their values are
 *   equal.
 * - When ordered, `Left` is always less than `Right`. If the variants are
 *   equal, their values will determine the ordering.
 *
 * ## `Either` as a semigroup
 *
 * `Either` implements `Semigroup` when its `Right` value implements
 * `Semigroup`. When combined, the first `Left` Either will short-circuit the
 * operation. If both Eithers are `Right`, their values will be combined and
 * returned in `Right`.
 *
 * In other words, `cmb(x, y)` is equivalent to `x.zipWith(y, cmb)` for all
 * Eithers `x` and `y`.
 *
 * ## Transforming values
 *
 * These methods transform an Either's value:
 *
 * - `bimap` applies one of two functions to the `Left` or `Right` value,
 *   depending on the Either's variant.
 * - `mapLeft` applies a function to the `Left` value, and leaves the `Right`
 *   value unaffected.
 * - `map` applies a function to the `Right` value, and leaves the `Left` value
 *   unaffected.
 * - `mapTo` overwrites the `Right` value, and leaves the `Left` value
 *   unaffected.
 *
 * These methods combine the values of two `Right` variants:
 *
 * - `zipWith` applies a function to their values.
 * - `zipFst` keeps only the first value, and discards the second.
 * - `zipSnd` keeps only the second value, and discards the first.
 *
 * ## Chaining `Either`
 *
 * The `flatMap` method chains together computations that return `Either`. If
 * an Either is `Right`, a function is applied to its value and evaluated to
 * return another Either. If any Either is `Left`, the computation is halted and
 * the `Left` is returned instead.
 *
 * Consider a program that uses `Either` to parse an even integer:
 *
 * ```ts
 * function parseInt(input: string): Either<string, number> {
 *     const n = Number.parseInt(input);
 *     return Number.isNaN(n)
 *         ? Either.left(`Value "${input}" is not an integer`)
 *         : Either.right(n);
 * }
 *
 * function guardEven(n: number): Either<string, number> {
 *     return n % 2 === 0
 *         ? Either.right(n)
 *         : Either.left(`Number ${n} is not even`);
 * }
 *
 * function parseEvenInt(input: string): Either<string, number> {
 *     return parseInt(input).flatMap(guardEven);
 * }
 *
 * console.log(parseEvenInt("a"));
 * console.log(parseEvenInt("1"));
 * console.log(parseEvenInt("2"));
 * ```
 *
 * ### Generator comprehenshions
 *
 * Generator comprehensions provide an alternative syntax for chaining together
 * computations that return `Either`. Instead of `flatMap`, a generator is used
 * to unwrap `Right` variants and apply functions to their values.
 *
 * The `go` function evaluates a generator to return an Either. Within the
 * generator, Eithers are yielded using the `yield*` keyword. This binds the
 * `Right` values to specified variables. When the computation is complete, a
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
 * function parseEvenInt(input: string): Either<string, number> {
 *     return Either.go(function* () {
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
 * `Either` generator comprehensions. Async computations that return `Either`
 * can be chained together using the familiar generator syntax.
 *
 * The `goAsync` function evaluates an async generator to return a Promise that
 * fulfills with an Either. The semantics of `yield*` and `return` within async
 * comprehensions are identical to their synchronous counterparts.
 *
 * In addition to the syntax permitted in synchronous generator comprehensions,
 * async comprehensions also support:
 *
 * - the `await` keyword
 * - `for await` loops (asynchronous iteration)
 *
 * Consider a program that uses requests data from a remote API and uses
 * `Either` to guard against unlocatable resources:
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
 * ): Promise<Either<string, string>> {
 *     const response = await fetch(`${usersEndpoint}/${id}`);
 *     if (!response.ok) {
 *         return Either.left(`User with id ${id} not found`);
 *     }
 *     const user: User = await response.json();
 *     return Either.right(user.username);
 * }
 *
 * function fetchUsernamesByUserIds(
 *     id1: number,
 *     id2: number,
 * ): Promise<Either<string, readonly [string, string]>> {
 *     return Either.goAsync(async function* () {
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
 * ## Collecting into `Either`
 *
 * `Either` provides several functions for working with collections of Eithers.
 * Sometimes, a collection of Eithers must be turned "inside out" into an Either
 * that contains a "mapped" collection of `Right` values.
 *
 * These methods will traverse a collection of Eithers to extract the `Right`
 * values. If any Either in the collection is `Left`, the traversal is halted
 * and the `Left` is returned instead.
 *
 * - `collect` turns an Array or a tuple literal of Eithers inside out.
 * - `tupled` turns a series of two or more individual Eithers inside out.
 * - `gather` turns a Record or an object literal of Eithers inside out.
 *
 * Additionally, the `reduce` function reduces a finite Iterable from left to
 * right in the context of `Either`. This is useful for mapping, filtering, and
 * accumulating values using `Either`:
 *
 * ```ts
 * function sumOnlyEvens(nums: number[]): Either<string, number> {
 *     return Either.reduce(
 *         nums,
 *         (total, num) =>
 *             Either.guard(total + num, (n) => n % 2 === 0).mapLeft(
 *                 (odd) => `encountered odd number ${odd}`,
 *             ),
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
import { type Validated } from "./validated.js";

/**
 * A type that represents one of two values (`Left` or `Right`).
 */
export type Either<A, B> = Either.Left<A> | Either.Right<B>;

/**
 * The companion namespace for the `Either` type.
 */
export namespace Either {
    /**
     * An enumeration that discriminates `Either`.
     */
    export enum Typ {
        Left,
        Right,
    }

    /**
     * Construct a `Left` Either with an optional type witness for the `Right`
     * value.
     */
    export function left<A, B = never>(x: A): Either<A, B> {
        return new Left(x);
    }

    /**
     * Construct a `Right` Either with an optional type witness for the `Left`
     * value.
     */
    export function right<B, A = never>(x: B): Either<A, B> {
        return new Right(x);
    }

    /**
     * Apply a predicate function to a value. If the predicate returns true,
     * return the value in `Right`; otherwise, return the value in `Left`.
     */
    export function guard<A, A1 extends A>(
        x: A,
        f: (x: A) => x is A1,
    ): Either<Exclude<A, A1>, A1>;

    export function guard<A>(x: A, f: (x: A) => boolean): Either<A, A>;

    export function guard<A>(x: A, f: (x: A) => boolean): Either<A, A> {
        return f(x) ? right(x) : left(x);
    }

    /**
     * Construct an Either from a Validated.
     */
    export function fromValidated<E, A>(vtd: Validated<E, A>): Either<E, A> {
        return vtd.fold(left, right);
    }

    /**
     * Construct an Either using a generator comprehension.
     */
    export function go<T extends readonly [Either<any, any>], A>(
        f: () => Generator<T, A, any>,
    ): Either<LeftT<T[0]>, A> {
        const gen = f();
        let nxt = gen.next();
        while (!nxt.done) {
            const either = nxt.value[0];
            if (either.isRight()) {
                nxt = gen.next(either.val);
            } else {
                return either;
            }
        }
        return right(nxt.value);
    }

    /**
     * Reduce a finite Iterable from left to right in the context of `Either`.
     */
    export function reduce<A, B, E>(
        xs: Iterable<A>,
        f: (acc: B, x: A) => Either<E, B>,
        initial: B,
    ): Either<E, B> {
        return go(function* () {
            let acc = initial;
            for (const x of xs) {
                acc = yield* f(acc, x);
            }
            return acc;
        });
    }

    /**
     * Evaluate the Eithers in an Array or a tuple literal from left to right
     * and collect the `Right` values in an Array or a tuple literal,
     * respectively.
     */
    export function collect<T extends readonly Either<any, any>[]>(
        eithers: T,
    ): Either<LeftT<T[number]>, Readonly<RightsT<T>>> {
        return go(function* () {
            const results = new Array(eithers.length);
            for (const [idx, either] of eithers.entries()) {
                results[idx] = yield* either;
            }
            return results as unknown as RightsT<T>;
        });
    }

    /**
     * Evaluate a series of Eithers from left to right and collect the `Right`
     * values in a tuple literal.
     */
    export function tupled<
        T extends [Either<any, any>, Either<any, any>, ...Either<any, any>[]],
    >(...eithers: T): Either<LeftT<T[number]>, Readonly<RightsT<T>>> {
        return collect(eithers);
    }

    /**
     * Evaluate the Eithers in a Record or an object literal and collect the
     * `Right` values in a Record or an object literal, respectively.
     */
    export function gather<T extends Record<any, Either<any, any>>>(
        eithers: T,
    ): Either<LeftT<T[keyof T]>, { readonly [K in keyof T]: RightT<T[K]> }> {
        return go(function* () {
            const results: Record<any, unknown> = {};
            for (const [key, either] of Object.entries(eithers)) {
                results[key] = yield* either;
            }
            return results as RightsT<T>;
        });
    }

    /**
     * Construct a Promise that fulfills with an Either using an async generator
     * comprehension.
     */
    export async function goAsync<T extends readonly [Either<any, any>], A>(
        f: () => AsyncGenerator<T, A, any>,
    ): Promise<Either<LeftT<T[0]>, A>> {
        const gen = f();
        let nxt = await gen.next();
        while (!nxt.done) {
            const either = nxt.value[0];
            if (either.isRight()) {
                nxt = await gen.next(either.val);
            } else {
                return either;
            }
        }
        return right(nxt.value);
    }

    /**
     * The fluent syntax for `Either`.
     */
    export abstract class Syntax {
        [Eq.eq]<A extends Eq<A>, B extends Eq<B>>(
            this: Either<A, B>,
            that: Either<A, B>,
        ): boolean {
            if (this.isLeft()) {
                return that.isLeft() && eq(this.val, that.val);
            }
            return that.isRight() && eq(this.val, that.val);
        }

        [Ord.cmp]<A extends Ord<A>, B extends Ord<B>>(
            this: Either<A, B>,
            that: Either<A, B>,
        ): Ordering {
            if (this.isLeft()) {
                return that.isLeft() ? cmp(this.val, that.val) : Ordering.less;
            }
            return that.isRight() ? cmp(this.val, that.val) : Ordering.greater;
        }

        [Semigroup.cmb]<E, A extends Semigroup<A>>(
            this: Either<E, A>,
            that: Either<E, A>,
        ): Either<E, A> {
            return this.zipWith(that, cmb);
        }

        /**
         * Test whether this Either is `Left`.
         */
        isLeft<A>(this: Either<A, any>): this is Left<A> {
            return this.typ === Typ.Left;
        }

        /**
         * Test whether this Either is `Right`.
         */
        isRight<B>(this: Either<any, B>): this is Right<B> {
            return this.typ === Typ.Right;
        }

        /**
         * Case analysis for `Either`.
         */
        fold<A, B, C, D>(
            this: Either<A, B>,
            foldL: (x: A, either: Left<A>) => C,
            foldR: (x: B, either: Right<B>) => D,
        ): C | D {
            return this.isLeft()
                ? foldL(this.val, this)
                : foldR(this.val, this);
        }

        /**
         * If this Either is `Left`, extract its value; otherwise, apply a
         * function to the `Right` value.
         */
        leftOrFold<A, B, C>(
            this: Either<A, B>,
            f: (x: B, either: Right<B>) => C,
        ): A | C {
            return this.fold(id, f);
        }

        /**
         * If this Either is `Right`, extract its value; otherwise, apply a
         * function to the `Left` value.
         */
        rightOrFold<A, B, C>(
            this: Either<A, B>,
            f: (x: A, either: Left<A>) => C,
        ): B | C {
            return this.fold(f, id);
        }

        /**
         * If this Either is `Left`, apply a function to its value to return
         * a new Either.
         */
        recover<E, A, E1, B>(
            this: Either<E, A>,
            f: (x: E) => Either<E1, B>,
        ): Either<E1, A | B> {
            return this.isLeft() ? f(this.val) : this;
        }

        /**
         * If this Either is `Left`, return a fallback Either.
         */
        orElse<A, E1, B>(
            this: Either<any, A>,
            that: Either<E1, B>,
        ): Either<E1, A | B> {
            return this.recover(() => that);
        }

        /**
         * If this Either is `Right`, apply a function to its value to return
         * a new Either.
         */
        flatMap<E, A, E1, B>(
            this: Either<E, A>,
            f: (x: A) => Either<E1, B>,
        ): Either<E | E1, B> {
            return this.isLeft() ? this : f(this.val);
        }

        /**
         * If this Either is `Right` and contains another Either, return the
         * inner Either.
         */
        flat<E, E1, A>(this: Either<E, Either<E1, A>>): Either<E | E1, A> {
            return this.flatMap(id);
        }

        /**
         * If this and that Either are `Right`, apply a function to their
         * values.
         */
        zipWith<E, A, E1, B, C>(
            this: Either<E, A>,
            that: Either<E1, B>,
            f: (x: A, y: B) => C,
        ): Either<E | E1, C> {
            return this.flatMap((x) => that.map((y) => f(x, y)));
        }

        /**
         * If this and that Either are `Right`, keep only this Either's value.
         */
        zipFst<E, A, E1>(
            this: Either<E, A>,
            that: Either<E1, any>,
        ): Either<E | E1, A> {
            return this.zipWith(that, id);
        }

        /**
         * If this and that Either are `Right`, keep only that Either's value.
         */
        zipSnd<E, E1, B>(
            this: Either<E, any>,
            that: Either<E1, B>,
        ): Either<E | E1, B> {
            return this.flatMap(() => that);
        }

        /**
         * Apply one of two functions to this Either's value if this is `Left`
         * or `Right`, respectively.
         */
        bimap<A, B, C, D>(
            this: Either<A, B>,
            mapL: (x: A) => C,
            mapR: (x: B) => D,
        ): Either<C, D> {
            return this.isLeft() ? left(mapL(this.val)) : right(mapR(this.val));
        }

        /**
         * If this Either is `Left`, apply a function to its value.
         */
        mapLeft<A, B, C>(this: Either<A, B>, f: (x: A) => C): Either<C, B> {
            return this.recover((x) => left(f(x)));
        }

        /**
         * If this Either is `Right`, apply a function to its value.
         */
        map<A, B, D>(this: Either<A, B>, f: (x: B) => D): Either<A, D> {
            return this.flatMap((x) => right(f(x)));
        }

        /**
         * If this Either is `Right`, overwrite its value.
         */
        mapTo<A, D>(this: Either<A, any>, value: D): Either<A, D> {
            return this.flatMap(() => right(value));
        }
    }

    /**
     * A leftsided Either.
     */
    export class Left<out A> extends Syntax {
        /**
         * The property that discriminates `Either`.
         */
        readonly typ = Typ.Left;

        readonly val: A;

        constructor(val: A) {
            super();
            this.val = val;
        }

        /**
         * Defining Iterable behavior for `Either` allows TypeScript to infer
         * `Right` types when yielding Eithers in generator comprehensions using
         * `yield*`.
         *
         * @hidden
         */
        *[Symbol.iterator](): Iterator<
            readonly [Either<A, never>],
            never,
            unknown
        > {
            return (yield [this]) as never;
        }
    }

    /**
     * A rightsided Either.
     */
    export class Right<out B> extends Syntax {
        /**
         * The property that discriminates `Either`.
         */
        readonly typ = Typ.Right;

        readonly val: B;

        constructor(val: B) {
            super();
            this.val = val;
        }

        /**
         * Defining Iterable behavior for `Either` allows TypeScript to infer
         * `Right` types when yielding Eithers in generator comprehensions using
         * `yield*`.
         *
         * @hidden
         */
        *[Symbol.iterator](): Iterator<
            readonly [Either<never, B>],
            B,
            unknown
        > {
            return (yield [this]) as B;
        }
    }

    /**
     * Extract the `Left` type `A` from the type `Either<A, B>`.
     */
    // prettier-ignore
    export type LeftT<T extends Either<any, any>> = 
        [T] extends [Either<infer A, any>] ? A : never;

    /**
     * Extract the `Right` type `B` from the type `Either<A, B>`.
     */
    // prettier-ignore
    export type RightT<T extends Either<any, any>> = 
        [T] extends [Either<any, infer B>] ? B : never;

    /**
     * Given an Array, a tuple literal, a Record, or an object literal of
     * `Either` types, map over the structure to return an equivalent structure
     * of the `Right` types.
     *
     * ```ts
     * type T0 = [Either<1, 2>, Either<3, 4>, Either<5, 6>];
     * type T1 = RightsT<T0>; // [2, 4, 6]
     *
     * type T2 = { x: Either<1, 2>, y: Either<3, 4>, z: Either<5, 6> };
     * type T3 = RightsT<T2>; // { x: 2, y: 4, z: 6 }
     * ```
     */
    export type RightsT<
        T extends readonly Either<any, any>[] | Record<any, Either<any, any>>,
    > = {
        [K in keyof T]: [T[K]] extends [Either<any, infer B>] ? B : never;
    };
}
