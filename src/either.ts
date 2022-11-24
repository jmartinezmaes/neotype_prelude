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
 * @remarks
 *
 * `Either<A, B>` is a type that represents one of two values. It is represented
 * by two variants: `Left<A>` and `Right<B>`.
 *
 * -   The `Left<A>` variant represents a *left-sided* `Either` and contains a
 *     value of type `A`.
 * -   The `Right<B>` variant represents a *right-sided* `Either` and contains a
 *     value of type `B`.
 *
 * ### Handling failure with `Either`
 *
 * `Either` is also often used to represent a value which is either correct or a
 * failure. When using `Either` in this manner, the type is often written as
 * `Either<E, A>`, where:
 *
 * -   The `Left<E>` variant represents a *failed* `Either` and contains a
 *     *failure* of type `E`; and
 * -   The `Right<A>` variant represents a *successful* `Either` and contains a
 *     *success* of type `A`.
 *
 * Some combinators for `Either` are specialized for this failure-handling
 * use case, and provide a right-biased behavior that "short-circuits" a
 * computation on the first failed `Either`. This behavior allows functions
 * that return `Either` to be composed in a way that propogates failures while
 * applying logic to successes -- a useful feature for railway-oriented
 * programming.
 *
 * ## Importing from this module
 *
 * This module exports `Either` as both a type and a namespace. The `Either`
 * type is an alias for a discriminated union, and the `Either` namespace
 * provides:
 *
 * -   The `Left` and `Right` variant classes
 * -   The abstract `Syntax` class that provides the fluent API for `Either`
 * -   The `Typ` enumeration that discriminates `Either`
 * -   Functions for constructing, chaining, collecting into, and lifting into
 *     `Either`
 *
 * The type and namespace can be imported under the same alias:
 *
 * ```ts
 * import { Either } from "@neotype/prelude/either.js";
 * ```
 *
 * Or, the type and namespace can be imported and aliased separately:
 *
 * ```ts
 * import { type Either, Either as E } from "@neotype/prelude/either.js";
 * ```
 *
 * ## Constructing `Either`
 *
 * These functions construct an Either:
 *
 * -   `left` constructs a left-sided `Either`.
 * -   `right` constructs a right-sided `Either`.
 * -   `guard` constructs an `Either` from applying a predicate function to a
 *     value.
 * -   `fromValidation` constructs an `Either` from a `Validation`.
 *
 * ## Querying and narrowing the variant
 *
 * The `isLeft` and `isRight` methods return `true` if an `Either` is left-sided
 * or right-sided, respectively. These methods will also narrow the type of an
 * `Either` to the queried variant.
 *
 * The variant can also be queried and narrowed via the `typ` property, which
 * returns a member of the `Typ` enumeration.
 *
 * ## Extracting values
 *
 * The value within an `Either` can be accessed via the `val` property. The type
 * of the property can be narrowed by first querying the variant.
 *
 * The `unwrap` method also unwraps an `Either` by applying one of two functions
 * to the value, depending on the variant.
 *
 * ## Comparing `Either`
 *
 * `Either` has the following behavior as an equivalence relation:
 *
 * -   An `Either<A, B>` implements `Eq` when both `A` and `B` implement `Eq`.
 * -   Two `Either` values are equal if they are the same variant and their
 *     values are equal.
 *
 * `Either` has the following behavior as a total order:
 *
 * -   An `Either<A, B>` implements `Ord` when both `A` and `B` implement `Ord`.
 * -   When ordered, a left-sided `Either` always compares as less than any
 *     right-sided `Either`. If the variants are the same, their values are
 *     compared to determine the ordering.
 *
 * ## `Either` as a semigroup
 *
 * `Either` has the following behavior as a semigroup:
 *
 * -   An `Either<E, A>` implements `Semigroup` when both `E` and `A` implement
 *     `Semigroup`.
 * -   When combined, any left-sided `Either` short-circuits the combination and
 *     is returned instead. If both are right-sided, their values are combined
 *     and returned in a `Right`.
 *
 * ## Transforming values
 *
 * These methods transform the value within an `Either`:
 *
 * -   `bimap` applies one of two functions to the value, depending on the
 *     variant.
 * -   `lmap` applies a function to the value in a left-sided `Either`.
 * -   `map` applies a function to the value in a right-sided `Either`.
 *
 * These methods combine the values of two successful `Eithers`, or
 * short-circuit on the first failed `Either`:
 *
 * -   `zipWith` applies a function to their values.
 * -   `zipFst` keeps only the first value, and discards the second.
 * -   `zipSnd` keeps only the second value, and discards the first.
 *
 * ## Chaining `Either`
 *
 * The `flatMap` method chains together computations that return `Either`. If an
 * `Either` succeeds, a function is applied to its value and evaluated to return
 * another `Either`. If an `Either` fails, the computation halts and the failed
 * `Either` is returned instead.
 *
 * ### Generator comprehenshions
 *
 * Generator comprehensions provide an imperative syntax for chaining together
 * computations that return `Either`. Instead of `flatMap`, a generator is used
 * to unwrap successful `Either` values and apply functions to their values.
 *
 * The `go` function evaluates a generator to return an `Either`. Within the
 * generator, `Either` values are yielded using the `yield*` keyword. When a
 * yielded `Either` succeeds, its value may be bound to a specified variable.
 * If any yielded `Either` fails, the generator halts and the failed `Either` is
 * returned immediately; otherwise, when the computation is complete, a final
 * result can be computed and returned from the generator and will be returned
 * as a success.
 *
 * ### Async generator comprehensions
 *
 * Async generator comprehensions provide `async`/`await` syntax to `Either`
 * generator comprehensions, allowing promise-like computations that fulfill
 * with `Either` to be chained together using the familiar generator syntax.
 *
 * The `goAsync` function evaluates an async generator to return a `Promise`
 * that fulfills with an `Either`. The semantics of `yield*` and `return` within
 * async comprehensions are identical to their synchronous counterparts.
 *
 * ## Collecting into `Either`
 *
 * Sometimes, a collection of `Either` values must be turned "inside out" into a
 * `Either` that succeeds with an equivalent collection of successes.
 *
 * These methods will traverse a collection of `Either` values to extract the
 * successes. If any `Either` in the collection fails, the traversal halts and
 * the failed `Either` is returned instead.
 *
 * -   `collect` turns an array or a tuple literal of `Either` values inside
 *     out.
 * -   `gather` turns a record or an object literal of `Either` values inside
 *     out.
 *
 * The `reduce` function reduces a finite iterable from left to right in the
 * context of `Either`. This is useful for mapping, filtering, and accumulating
 * values using `Either`.
 *
 * ## Lifting functions to work with `Either`
 *
 * The `lift` function receives a function that accepts arbitrary arguments,
 * and returns an adapted function that accepts `Either` values as arguments
 * instead. The arguments are evaluated from left to right, and if they all
 * succeed, the original function is applied to their successes and the result
 * is returned as a success. If any `Either` fails, the failed `Either` is
 * returned instead.
 *
 * @example Basic matching and unwrapping
 *
 * ```ts
 * import { Either } from "@neotype/prelude/either.js";
 *
 * const strOrNum: Either<string, number> = Either.right(1);
 *
 * // Querying and narrowing using methods
 * if (strOrNum.isLeft()) {
 *     console.log(`Queried Left: ${strOrNum.val}`);
 * } else {
 *     console.log(`Queried Right: ${strOrNum.val}`);
 * }
 *
 * // Querying and narrowing using the `typ` property
 * switch (strOrNum.typ) {
 *     case Either.Typ.Left:
 *         console.log(`Matched Left: ${strOrNum.val}`);
 *         break;
 *     case Either.Typ.Right:
 *         console.log(`Matched Right: ${strOrNum.val}`);
 * }
 *
 * // Case analysis using `unwrap`
 * strOrNum.unwrap(
 *     (str) => console.log(`Unwrapped Left: ${str}`),
 *     (num) => console.log(`Unwrapped Right: ${num}`),
 * );
 * ```
 *
 * @example Parsing with `Either`
 *
 * First, our imports:
 *
 * ```ts
 * import { Either } from "@neotype/prelude/either.js";
 * ```
 *
 * Now, consider a program that uses `Either` to parse an even integer:
 *
 * ```ts
 * function parseInt(input: string): Either<string, number> {
 *     const n = Number.parseInt(input);
 *     return Number.isNaN(n)
 *         ? Either.left(`cannot parse '${input}' as int`)
 *         : Either.right(n);
 * }
 *
 * function guardEven(n: number): Either<string, number> {
 *     return n % 2 === 0
 *         ? Either.right(n)
 *         : Either.left(`${n} is not even`);
 * }
 *
 * function parseEvenInt(input: string): Either<string, number> {
 *     return parseInt(input).flatMap(guardEven);
 * }
 *
 * ["a", "1", "2", "-4", "+42", "0x2A"].forEach((input) => {
 *     const result = JSON.stringify(parseEvenInt(input).val);
 *     console.log(`input "${input}": ${result}`);
 * });
 *
 * // input "a": "cannot parse 'a' as int"
 * // input "1": "1 is not even"
 * // input "2": 2
 * // input "-4": -4
 * // input "+42": 42
 * // input "0x2A": 42
 * ```
 *
 * We can refactor the `parseEvenInt` function to use a generator comprehension
 * instead:
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
 * Suppose we want to parse an array of inputs and collect the successful
 * results, or fail on the first parse error. We may write the following:
 *
 * ```ts
 * function parseEvenInts(inputs: string[]): Either<string, number[]> {
 *     return Either.collect(inputs.map(parseEvenInt));
 * }
 *
 * [
 *     ["a", "-4"],
 *     ["2", "-7"],
 *     ["+42", "0x2A"],
 * ].forEach((inputs) => {
 *     const result = JSON.stringify(parseEvenInts(inputs).val);
 *     console.log(`inputs ${JSON.stringify(inputs)}: ${result}`);
 * });
 *
 * // inputs ["a","-4"]: "cannot parse 'a' as int"
 * // inputs ["2","-7"]: "-7 is not even"
 * // inputs ["+42","0x2A"]: [42,42]
 * ```
 *
 * Perhaps we want to collect only distinct even numbers using a `Set`:
 *
 * ```ts
 * function parseEvenIntsUniq(inputs: string[]): Either<string, Set<number>> {
 *     return Either.go(function* () {
 *         const results = new Set<number>();
 *         for (const input of inputs) {
 *             results.add(yield* parseEvenInt(input));
 *         }
 *         return results;
 *     });
 * }
 *
 * [
 *     ["a", "-4"],
 *     ["2", "-7"],
 *     ["+42", "0x2A"],
 * ].forEach((inputs) => {
 *     const result = JSON.stringify(
 *         parseEvenIntsUniq(inputs).map(Array.from).val,
 *     );
 *     console.log(`inputs ${JSON.stringify(inputs)}: ${result}`);
 * });
 *
 * // inputs ["a","-4"]: "cannot parse 'a' as int"
 * // inputs ["2","-7"]: "-7 is not even"
 * // inputs ["+42","0x2A"]: [42]
 * ```
 *
 * Or, perhaps we want to associate the original input strings with our
 * successful parses:
 *
 * ```ts
 * function parseEvenIntsKeyed(
 *     inputs: string[],
 * ): Either<string, Record<string, number>> {
 *     return Either.gather(
 *         Object.fromEntries(
 *             inputs.map((input) => [input, parseEvenInt(input)] as const),
 *         ),
 *     );
 * }
 *
 * [
 *     ["a", "-4"],
 *     ["2", "-7"],
 *     ["+42", "0x2A"],
 * ].forEach((inputs) => {
 *     const result = JSON.stringify(parseEvenIntsKeyed(inputs).val);
 *     console.log(`inputs ${JSON.stringify(inputs)}: ${result}`);
 * });
 *
 * // inputs ["a","-4"]: "cannot parse 'a' as int"
 * // inputs ["2","-7"]: "-7 is not even"
 * // inputs ["+42","0x2A"]: {"+42":42,"0x2A":42}
 * ```
 *
 * Or, perhaps we want to sum our successful parses and return a total:
 *
 * ```ts
 * function parseEvenIntsAndSum(inputs: string[]): Either<string, number> {
 *     return Either.reduce(
 *         inputs,
 *         (total, input) => parseEvenInt(input).map((even) => total + even),
 *         0,
 *     );
 * }
 *
 * [
 *     ["a", "-4"],
 *     ["2", "-7"],
 *     ["+42", "0x2A"],
 * ].forEach((inputs) => {
 *     const result = JSON.strigify(parseEvenIntsAndSum(inputs).val);
 *     console.log(`inputs ${JSON.stringify(inputs)}: ${result}`);
 * });
 *
 * // inputs ["a","-4"]: "cannot parse 'a' as int"
 * // inputs ["2","-7"]: "-7 is not even"
 * // inputs ["+42","0x2A"]: 84
 * ```
 *
 * @module
 */

import { cmb, Semigroup } from "./cmb.js";
import { cmp, Eq, eq, Ord, Ordering } from "./cmp.js";
import { id } from "./fn.js";
import { type Validation } from "./validation.js";

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
     * Construct a left-sided `Either` from a value.
     */
    export function left<A, B = never>(x: A): Either<A, B> {
        return new Left(x);
    }

    /**
     * Construct a right-sided `Either` from a value.
     */
    export function right<B, A = never>(x: B): Either<A, B> {
        return new Right(x);
    }

    /**
     * Apply a predicate function to a value. If the predicate returns `true`,
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
     * Construct an `Either` from a `Validation`.
     *
     * @remarks
     *
     * `Err` and `Ok` variants of `Validation` will become `Left` and `Right`
     * variants of `Either`, respectively.
     */
    export function fromValidation<E, A>(vdn: Validation<E, A>): Either<E, A> {
        return vdn.unwrap(left, right);
    }

    /**
     * Construct an `Either` using a generator comprehension.
     */
    export function go<T extends Either<any, any>, A>(
        f: () => Generator<T, A, unknown>,
    ): Either<LeftT<T>, A> {
        const gen = f();
        let nxt = gen.next();
        while (!nxt.done) {
            const either = nxt.value;
            if (either.isRight()) {
                nxt = gen.next(either.val);
            } else {
                return either;
            }
        }
        return right(nxt.value);
    }

    /**
     * Reduce a finite iterable from left to right in the context of `Either`.
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
     * Evaluate the `Either` values in an array or a tuple literal from left to
     * right. If they all succeed, collect their successes in an array or a
     * tuple literal, respectively, and succeed with the result; otherwise,
     * return the first failed `Either`.
     */
    export function collect<T extends readonly Either<any, any>[]>(
        eithers: T,
    ): Either<LeftT<T[number]>, { [K in keyof T]: RightT<T[K]> }> {
        return go(function* () {
            const results: unknown[] = new Array(eithers.length);
            for (const [idx, either] of eithers.entries()) {
                results[idx] = yield* either;
            }
            return results as { [K in keyof T]: RightT<T[K]> };
        });
    }

    /**
     * Evaluate the `Either` values in a record or an object literal. If they
     * all succeed, collect their successes in a record or an object literal,
     * respectively, and succeed with the result; otherwise, return the first
     * failed `Either`.
     */
    export function gather<T extends Record<any, Either<any, any>>>(
        eithers: T,
    ): Either<LeftT<T[keyof T]>, { [K in keyof T]: RightT<T[K]> }> {
        return go(function* () {
            const results: Record<any, unknown> = {};
            for (const [key, either] of Object.entries(eithers)) {
                results[key] = yield* either;
            }
            return results as { [K in keyof T]: RightT<T[K]> };
        });
    }

    /**
     * Lift a function of any arity into the context of `Either`.
     */
    export function lift<T extends readonly unknown[], A>(
        f: (...args: T) => A,
    ): <T1 extends { [K in keyof T]: Either<any, T[K]> }>(
        ...eithers: T1
    ) => Either<LeftT<T1[number]>, A> {
        return (...eithers) =>
            collect(eithers).map((args) => f(...(args as T)));
    }

    /**
     * Construct a `Promise` that fulfills with an `Either` using an async
     * generator comprehension.
     */
    export async function goAsync<T extends Either<any, any>, A>(
        f: () => AsyncGenerator<T, A, unknown>,
    ): Promise<Either<LeftT<T>, A>> {
        const gen = f();
        let nxt = await gen.next();
        while (!nxt.done) {
            const either = nxt.value;
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
         * Test whether this `Either` is left-sided.
         */
        isLeft<A>(this: Either<A, any>): this is Left<A> {
            return this.typ === Typ.Left;
        }

        /**
         * Test whether this `Either` is right-sided.
         */
        isRight<B>(this: Either<any, B>): this is Right<B> {
            return this.typ === Typ.Right;
        }

        /**
         * Case analysis for `Either`.
         */
        unwrap<A, B, C, D>(
            this: Either<A, B>,
            onLeft: (x: A) => C,
            onRight: (x: B) => D,
        ): C | D {
            return this.isLeft() ? onLeft(this.val) : onRight(this.val);
        }

        /**
         * If this `Either` fails, apply a function to its failure to return
         * another `Either`; otherwise, return this `Either` as is.
         */
        recover<E, A, E1, B>(
            this: Either<E, A>,
            f: (x: E) => Either<E1, B>,
        ): Either<E1, A | B> {
            return this.isLeft() ? f(this.val) : this;
        }

        /**
         * If this `Either` fails, return a fallback `Either`; otherwise, return
         * this `Either` as is.
         */
        orElse<A, E1, B>(
            this: Either<any, A>,
            that: Either<E1, B>,
        ): Either<E1, A | B> {
            return this.recover(() => that);
        }

        /**
         * If this `Either` succeeds, apply a function to its success to return
         * another `Either`; otherwise, return this `Either` as is.
         */
        flatMap<E, A, E1, B>(
            this: Either<E, A>,
            f: (x: A) => Either<E1, B>,
        ): Either<E | E1, B> {
            return this.isLeft() ? this : f(this.val);
        }

        /**
         * If this `Either` succeeds with another `Either`, return the inner
         * `Either`; otherwise, return this `Either` as is.
         */
        flat<E, E1, A>(this: Either<E, Either<E1, A>>): Either<E | E1, A> {
            return this.flatMap(id);
        }

        /**
         * If this and that `Either` both succeed, apply a function to their
         * successes and succeed with the result; otherwise, return the first
         * failed `Either`.
         */
        zipWith<E, A, E1, B, C>(
            this: Either<E, A>,
            that: Either<E1, B>,
            f: (x: A, y: B) => C,
        ): Either<E | E1, C> {
            return this.flatMap((x) => that.map((y) => f(x, y)));
        }

        /**
         * If this and that `Either` both succeed, succeed with only the first
         * success and discard the second; otherwise, return the first failed
         * `Either`.
         */
        zipFst<E, A, E1>(
            this: Either<E, A>,
            that: Either<E1, any>,
        ): Either<E | E1, A> {
            return this.zipWith(that, id);
        }

        /**
         * If this and that `Either` both succeed, succeed with only the second
         * success and discard the first; otherwise, return the first failed
         * `Either`.
         */
        zipSnd<E, E1, B>(
            this: Either<E, any>,
            that: Either<E1, B>,
        ): Either<E | E1, B> {
            return this.flatMap(() => that);
        }

        /**
         * If this `Either` is left-sided, apply a function to its value and
         * return the result in a `Left`; otherwise, apply a function to its
         * value and return the result in a `Right`.
         */
        bimap<A, B, C, D>(
            this: Either<A, B>,
            lmap: (x: A) => C,
            rmap: (x: B) => D,
        ): Either<C, D> {
            return this.isLeft() ? left(lmap(this.val)) : right(rmap(this.val));
        }

        /**
         * If this `Either` is left-sided, apply a function to its value and
         * return the result in a `Left`; otherwise, return this `Either` as is.
         */
        lmap<A, B, C>(this: Either<A, B>, f: (x: A) => C): Either<C, B> {
            return this.recover((x) => left(f(x)));
        }

        /**
         * If this `Either` is right-sided, apply a function to its value and
         * return the result in a `Right`; otherwise, return this `Either` as
         * is.
         */
        map<A, B, D>(this: Either<A, B>, f: (x: B) => D): Either<A, D> {
            return this.flatMap((x) => right(f(x)));
        }
    }

    /**
     * A left-sided Either.
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
         * Defining iterable behavior for `Either` allows TypeScript to infer
         * right-sided value types when yielding `Either` values in generator
         * comprehensions using `yield*`.
         *
         * @hidden
         */
        *[Symbol.iterator](): Iterator<Either<A, never>, never, unknown> {
            return (yield this) as never;
        }
    }

    /**
     * A right-sided Either.
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
         * Defining iterable behavior for `Either` allows TypeScript to infer
         * right-sided value types when yielding `Either` values in generator
         * comprehensions using `yield*`.
         *
         * @hidden
         */
        *[Symbol.iterator](): Iterator<Either<never, B>, B, unknown> {
            return (yield this) as B;
        }
    }

    /**
     * Extract the left-sided value type `A` from the type `Either<A, B>`.
     */
    // prettier-ignore
    export type LeftT<T extends Either<any, any>> = 
        [T] extends [Either<infer A, any>] ? A : never;

    /**
     * Extract the right-sided value type `B` from the type `Either<A, B>`.
     */
    // prettier-ignore
    export type RightT<T extends Either<any, any>> = 
        [T] extends [Either<any, infer B>] ? B : never;
}
