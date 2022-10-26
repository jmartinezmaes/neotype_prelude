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
 * -   Initial values
 * -   Nullable values
 * -   Optional fields in classes and objects
 * -   Return values for functions that are not defined over their entire input
 *     range (partial functions)
 * -   Return values for reporting simple failures, where `Nothing` is returned
 *     on failure
 * -   Optional function arguments
 *
 * ## Importing from this module
 *
 * This module exports `Maybe` as both a type and a namespace. The `Maybe` type
 * is an alias for a discriminated union, and the `Maybe` namespace provides:
 *
 * -   The `Nothing` and `Just` variant classes
 * -   The abstract `Syntax` class that provides the fluent API for `Maybe`
 * -   The `Typ` enumeration that discriminates `Maybe`
 * -   The `nothing` constant
 * -   Functions for constructing, chaining, and collecting into `Maybe`
 *
 * The type and namespce can be imported under the same alias:
 *
 * ```ts
 * import { Maybe } from "@neotype/prelude/maybe.js";
 * ```
 *
 * Or, the type and namespace can be imported and aliased separately:
 *
 * ```ts
 * import { type Maybe, Maybe as M } from "@neotype/prelude/maybe.js";
 * ```
 *
 * ## Constructing `Maybe`
 *
 * The `nothing` constant is the singleton instance of Maybe's `Nothing`
 * variant.
 *
 * These functions construct a Maybe:
 *
 * -   `just` constructs a `Just` variant.
 * -   `fromMissing` constructs a Maybe from a value that is potentially `null`
 *     or `undefined`, and converts such values to `Nothing`.
 * -   `guard` constructs a Maybe from applying a predicate function to a value.
 *     A value that satisfies the predicate is returned in `Just`, and `Nothing`
 *     is returned otherwise.
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
 * -   `justOrFold` returns the result of evaluating a provided fallback
 *     function.
 * -   `justOrElse` returns a provided fallback value.
 *
 * ## Comparing `Maybe`
 *
 * `Maybe` implements `Eq` and `Ord` when its generic type implements `Eq` and
 * `Ord`, respectively.
 *
 * -   Two Maybes are equal if they are both `Nothing`, or they are both `Just`
 *     and their values are equal.
 * -   When ordered, `Nothing` is always less than `Just`. If both variants are
 *     `Just`, their values will determine the ordering.
 *
 * ## `Maybe` as a semigroup
 *
 * `Maybe` implements `Semigroup` when its generic type implements `Semigroup`.
 * When combined, `Just` precedes `Nothing`. If both variants are `Just`, thier
 * values are combined and returned in `Just`.
 *
 * ## Transforming values
 *
 * The `map` method applies a function to a Maybe's `Just` value, and leaves
 * `Nothing` unaffected.
 *
 * These methods combine the values of two `Just` variants:
 *
 * -   `zipWith` applies a function to their values.
 * -   `zipFst` keeps only the first value, and discards the second.
 * -   `zipSnd` keeps only the second value, and discards the first.
 *
 * ## Chaining `Maybe`
 *
 * The `flatMap` method chains together computations that return `Maybe`. If a
 * Maybe is `Just`, a function is applied to its value and evaluated to return
 * another Maybe. If any Maybe is `Nothing`, the computation is halted and
 * `Nothing` is returned instead.
 *
 * ### Generator comprehensions
 *
 * Generator comprehensions provide an imperative syntax for chaining together
 * computations that return `Maybe`. Instead of `flatMap`, a Generator is used
 * to unwrap `Just` variants and apply functions to their values.
 *
 * The `go` function evaluates a Generator to return a Maybe. Within the
 * Generator, Maybes are yielded using the `yield*` keyword. This binds the
 * `Just` values to specified variables. When the computation is complete, a
 * final value can be computed and returned from the Generator.
 *
 * Generator comprehensions may contain:
 *
 * -   Variable declarations, assignments, and mutations
 * -   Function and class declarations
 * -   `for` loops
 * -   `while` and `do...while` loops
 * -   `if`/`else if`/`else` blocks
 * -   `switch` blocks
 * -   `try`/`catch` blocks
 *
 * ### Async generator comprehensions
 *
 * Async generator comprehensions provide `async`/`await` syntax and Promises to
 * `Maybe` generator comprehensions. Async computations that return `Maybe` can
 * be chained together using the familiar generator syntax.
 *
 * The `goAsync` function evaluates an AsyncGenerator to return a Promise that
 * fulfills with a Maybe. The semantics of `yield*` and `return` within async
 * comprehensions are identical to their synchronous counterparts.
 *
 * In addition to the syntax permitted in synchronous generator comprehensions,
 * async comprehensions may contain:
 *
 * -   The `await` keyword
 * -   `for await` loops (asynchronous iteration)
 *
 * ## Recovering from `Nothing`
 *
 * The `orElse` method returns a fallback Maybe in the case of `Nothing`.
 *
 * ## Collecting into `Maybe`
 *
 * `Maybe` provides several functions for working with collections of Maybes.
 * Sometimes, a collection of Maybes must be turned "inside out" into a Maybe
 * that contains an equivalent collection of `Just` values.
 *
 * These methods will traverse a collection of Maybes to extract the `Just`
 * values. If any Maybe in the collection is `Nothing`, the traversal is halted
 * and `Nothing` is returned instead.
 *
 * -   `collect` turns an Array or a tuple literal of Maybes inside out.
 * -   `gather` turns a Record or an object literal of Maybes inside out.
 *
 * Additionally, the `reduce` function reduces a finite Iterable from left to
 * right in the context of `Maybe`. This is useful for mapping, filtering, and
 * accumulating values using `Maybe`.
 *
 * ## Examples
 *
 * These examples assume the following imports:
 *
 * ```ts
 * import { Maybe } from "@neotype/prelude/maybe.js";
 * ```
 *
 * ### Basic matching and folding
 *
 * ```ts
 * const maybeNum: Maybe<number> = Maybe.just(1);
 *
 * // Querying and narrowing using methods
 * if (maybeNum.isNothing()) {
 *     console.log("Queried Nothing");
 * } else {
 *     console.log(`Queried Just: ${maybeNum.val}`);
 * }
 *
 * // Querying and narrowing using the `typ` property
 * switch (maybeNum.typ) {
 *     case Maybe.Typ.Nothing:
 *         console.log("Matched Nothing");
 *         break;
 *     case Maybe.Typ.Just:
 *         console.log(`Matched Just: ${maybeNum.val}`);
 * }
 *
 * // Case analysis using `fold`
 * maybeNum.fold(
 *     () => console.log("Folded Nothing"),
 *     (num) => console.log(`Folded Just: ${num}`),
 * );
 * ```
 *
 * ### Parsing with `Maybe`
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
 *     return n % 2 === 0 ? Maybe.just(n) : Maybe.nothing;
 * }
 *
 * function parseEvenInt(input: string): Maybe<number> {
 *     return parseInt(input).flatMap(guardEven);
 * }
 *
 * ["a", "1", "2", "-4", "+42", "0x2A"].forEach((input) => {
 *     const result = JSON.stringify(
 *         parseEvenInt(input).justOrElse("invalid input"),
 *     );
 *     console.log(`input "${input}": ${result}`);
 * });
 *
 * // input "a": "invalid input"
 * // input "1": "invalid input"
 * // input "2": 2
 * // input "-4": -4
 * // input "+42": 18
 * // input: "0x2A": 18
 * ```
 *
 * We can refactor the `parseEvenInt` function to use a generator comprehension
 * instead:
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
 * Suppose we want to parse an Array of inputs and collect the successful
 * results, or fail on the first parse error. We may write the following:
 *
 * ```ts
 * function parseEvenInts(inputs: string[]): Maybe<number[]> {
 *     return Maybe.collect(inputs.map(parseEvenInt));
 * }
 *
 * [
 *     ["a", "-4"],
 *     ["2", "-7"],
 *     ["+42", "0x2A"],
 * ].forEach((inputs) => {
 *     const result = JSON.stringify(
 *         parseEvenInts(inputs).justOrElse("invalid input"),
 *     );
 *     console.log(`inputs ${JSON.stringify(inputs)}: ${result}`);
 * });
 *
 * // inputs ["a","-4"]: "invalid input"
 * // inputs ["2","-7"]: "invalid input"
 * // inputs ["+42","0x2A"]: [42,42]
 * ```
 *
 * Perhaps we want to collect only distinct even numbers using a Set:
 *
 * ```ts
 * function parseEvenIntsUniq(inputs: string[]): Maybe<Set<number>> {
 *     return Maybe.go(function* () {
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
 *         parseEvenIntsUniq(inputs)
 *             .map(Array.from)
 *             .justOrElse("invalid input"),
 *     );
 *     console.log(`inputs ${JSON.stringify(inputs)}: ${result}`);
 * });
 *
 * // inputs ["a","-4"]: "invalid input"
 * // inputs ["2","-7"]: "invalid input"
 * // inputs ["+42","0x2A"]: [42]
 * ```
 *
 * Or, perhaps we want to associate the original input strings with our
 * successful parses:
 *
 * ```ts
 * function parseEvenIntsKeyed(
 *     inputs: string[],
 * ): Maybe<Record<string, number>> {
 *     return Maybe.gather(
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
 *     const result = JSON.stringify(
 *         parseEvenIntsKeyed(inputs).justOrElse("invalid input"),
 *     );
 *     console.log(`inputs ${JSON.stringify(inputs)}: ${result}`);
 * });
 *
 * // inputs ["a","-4"]: "invalid input"
 * // inputs ["2","-7"]: "invalid input"
 * // inputs ["+42","0x2A"]: {"+42":42,"0x2A":42}
 * ```
 *
 * Or, perhaps we want to sum our successful parses and return a total:
 *
 * ```ts
 * function parseEvenIntsAndSum(inputs: string[]): Maybe<number> {
 *     return Maybe.reduce(
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
 *     const result = JSON.stringify(
 *         parseEvenIntsAndSum(inputs).justOrElse("invalid input"),
 *     );
 *     console.log(`inputs ${JSON.stringify(inputs)}: ${result}`);
 * });
 *
 * // inputs ["a","-4"]: "invalid input"
 * // inputs ["2","-7"]: "invalid input"
 * // inputs ["+42","0x2A"]: 84
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
     * An enumeration that discriminates `Maybe`.
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
        f: () => Generator<Maybe<any>, A, unknown>,
    ): Maybe<A> {
        const gen = f();
        let nxt = gen.next();
        while (!nxt.done) {
            const maybe = nxt.value;
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
    ): Maybe<{ [K in keyof T]: JustT<T[K]> }> {
        return go(function* () {
            const results: unknown[] = new Array(maybes.length);
            for (const [idx, maybe] of maybes.entries()) {
                results[idx] = yield* maybe;
            }
            return results as { [K in keyof T]: JustT<T[K]> };
        });
    }

    /**
     * Evaluate the Maybes in a Record or an object literal and collect the
     * `Just` values in a Record or an object literal, respectively.
     */
    export function gather<T extends Record<any, Maybe<any>>>(
        maybes: T,
    ): Maybe<{ [K in keyof T]: JustT<T[K]> }> {
        return go(function* () {
            const results: Record<any, unknown> = {};
            for (const [key, maybe] of Object.entries(maybes)) {
                results[key] = yield* maybe;
            }
            return results as { [K in keyof T]: JustT<T[K]> };
        });
    }

    /**
     * Construct a Promise that fulfills with a Maybe using an async generator
     * comprehension.
     */
    export async function goAsync<A>(
        f: () => AsyncGenerator<Maybe<any>, A, unknown>,
    ): Promise<Maybe<A>> {
        const gen = f();
        let nxt = await gen.next();
        while (!nxt.done) {
            const maybe = nxt.value;
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
            foldJ: (x: A) => C,
        ): B | C {
            return this.isNothing() ? foldN() : foldJ(this.val);
        }

        /**
         * If this Maybe is `Just`, extract its value; otherwise, evaluate a
         * a function to return a fallback value.
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
        *[Symbol.iterator](): Iterator<Maybe<never>, never, unknown> {
            return (yield this) as never;
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
        *[Symbol.iterator](): Iterator<Maybe<A>, A, unknown> {
            return (yield this) as A;
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
}
