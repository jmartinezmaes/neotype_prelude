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
 * Optional values.
 *
 * @remarks
 *
 * `Maybe<A>` is a type that represents an optional value. It is represented by
 * two variants: `Nothing` and `Just<A>`.
 *
 * -   The `Nothing` variant represents an *absent* `Maybe`, and contains no
 *     value.
 * -   The `Just<A>` variant represents a *present* `Maybe`, and contains a
 *     value of type `A`.
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
 * -   Functions for constructing, chaining, collecting into, and lifting into
 *     `Maybe`
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
 * The `nothing` constant is the singleton instance of the absent `Maybe`.
 *
 * These functions construct a `Maybe`:
 *
 * -   `just` constructs a present `Maybe`.
 * -   `fromMissing` constructs a `Maybe` from a value that is potentially
 *     `null` or `undefined`.
 *
 * These functions adapt other functions to return a `Maybe`:
 *
 * -   `wrapFn` adapts a function that may return `null` or `undefined`.
 * -   `wrapPred` adapts a predicate.
 *
 * ## Querying and narrowing the variant
 *
 * The `isNothing` and `isJust` methods return `true` if a `Maybe` is absent or
 * present, respectively. These methods also narrow the type of a `Maybe` to the
 * queried variant.
 *
 * The variant can also be queried and narrowed via the `typ` property, which
 * returns a member of the `Typ` enumeration.
 *
 * ## Extracting values
 *
 * If a `Maybe` is present, its value can be accessed via the `val` property. To
 * access the property, the variant must first be queried and narrowed to
 * `Just`.
 *
 * The `unwrap` method unwraps a `Maybe` by either evaluating a function if
 * absent, or applying a function to its value if present.
 *
 * These methods extract the value from a `Maybe` if present; otherwise:
 *
 * - `getOrElse` evaluates a function to return a fallback result.
 * - `getOr` returns a fallback value.
 *
 * ## Comparing `Maybe`
 *
 * `Maybe` has the following behavior as an equivalence relation:
 *
 * -   A `Maybe<A>` implements `Eq` when `A` implements `Eq`.
 * -   Two `Maybe` values are equal if they are both absent, or they are both
 *     present and and their values are equal.
 *
 * `Maybe` has the following behavior as a total order:
 *
 * -   A `Maybe<A>` implements `Ord` when `A` implements `Ord`.
 * -   When ordered, an absent `Maybe` always compares as less than than any
 *     present `Maybe`. If they are both present, their values are compared to
 *     determine the ordering.
 *
 * ## `Maybe` as a semigroup
 *
 * `Maybe` has the following behavior as a semigroup:
 *
 * -   A `Maybe<A>` implements `Semigroup` when `A` implements `Semigroup`.
 * -   When combined, present `Maybe` values have precedence over absent `Maybe`
 *     values. If they are both present, thier values are combined and returned
 *     in a `Just`.
 *
 * ## Transforming values
 *
 * The `map` method transforms the value within a `Maybe` if present, and does
 * nothing if absent.
 *
 * These methods combine the values of two `Maybe` values if both are present,
 * or short-circuit on the first absent `Maybe`:
 *
 * -   `zipWith` applies a function to their values.
 * -   `zipFst` keeps only the first value, and discards the second.
 * -   `zipSnd` keeps only the second value, and discards the first.
 *
 * ## Chaining `Maybe`
 *
 * The `flatMap` method chains together computations that return `Maybe`. If a
 * `Maybe` is present, a function is applied to its value to return another
 * `Maybe`. If a `Maybe` is absent, the computation halts and `Nothing` is
 * returned instead.
 *
 * ### Generator comprehensions
 *
 * Generator comprehensions provide an imperative syntax for chaining together
 * computations that return `Maybe`. Instead of `flatMap`, a generator is used
 * to unwrap present `Maybe` values and apply functions to their values.
 *
 * The `go` function evaluates a generator to return a `Maybe`. Within the
 * generator, `Maybe` values are yielded using the `yield*` keyword. If a
 * yielded `Maybe` is present, its value may be bound to a specified variable.
 * If any yielded `Maybe` is absent, the generator halts and `go` returns
 * `Nothing`; otherwise, when the computation is complete, the generator may
 * return a final result and `go` returns the result in a `Just`.
 *
 * ### Async generator comprehensions
 *
 * Async generator comprehensions provide `async`/`await` syntax to `Maybe`
 * generator comprehensions, allowing promise-like computations that fulfill
 * with `Maybe` to be chained together using the familiar generator syntax.
 *
 * The `goAsync` function evaluates an async generator to return a `Promise`
 * that fulfills with a `Maybe`. The semantics of `yield*` and `return` within
 * async comprehensions are identical to their synchronous counterparts.
 *
 * ## Recovering from `Nothing`
 *
 * The `recover` method evaluates a function to return a fallback `Maybe` if
 * absent, and does nothing if present.
 *
 * ## Collecting into `Maybe`
 *
 * These functions turn a container of `Maybe` elements "inside out". If the
 * elements are all present, their values are collected into an equivalent
 * container and returned in a `Just`. If any element is absent, `Nothing` is
 * returned instead.
 *
 * -   `collect` turns an array or a tuple literal of `Maybe` elements inside
 *     out. For example:
 *     -   `Maybe<A>[]` becomes `Maybe<A[]>`
 *     -   `[Maybe<A>, Maybe<B>]` becomes `Maybe<[A, B]>`
 * -   `gather` turns a record or an object literal of `Maybe` elements inside
 *     out. For example:
 *     -   `Record<string, Maybe<A>>` becomes `Maybe<Record<string, A>>`
 *     -   `{ x: Maybe<A>, y: Maybe<B> }` becomes `Maybe<{ x: A, y: B }>`
 *
 * The `reduce` function reduces a finite iterable from left to right in the
 * context of `Maybe`. This is useful for mapping, filtering, and accumulating
 * values using `Maybe`.
 *
 * ## Lifting functions to work with `Maybe`
 *
 * The `lift` function receives a function that accepts arbitrary arguments,
 * and returns an adapted function that accepts `Maybe` values as arguments
 * instead. The arguments are evaluated from left to right, and if they are all
 * present, the original function is applied to their values and the result is
 * returned in a `Just`. If any argument is absent, `Nothing` is returned
 * instead.
 *
 * @example Basic matching and unwrapping
 *
 * ```ts
 * import { Maybe } from "@neotype/prelude/maybe.js"
 *
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
 * // Case analysis using `unwrap`
 * maybeNum.unwrap(
 *     () => console.log("Unwrapped Nothing"),
 *     (num) => console.log(`Unwrapped Just: ${num}`),
 * );
 * ```
 *
 * @example Parsing with `Maybe`
 *
 * First, the necessary imports:
 *
 * ```ts
 * import { Maybe } from "@neotype/prelude/maybe.js";
 * ```
 *
 * Now, consider a program that uses `Maybe` to parse an even integer:
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
 *         parseEvenInt(input).getOr("invalid input"),
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
 * Suppose we want to parse an array of inputs and collect the successful
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
 *         parseEvenInts(inputs).getOr("invalid input"),
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
 *         parseEvenIntsUniq(inputs).map(Array.from).getOr("invalid input"),
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
 *         parseEvenIntsKeyed(inputs).getOr("invalid input"),
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
 *         parseEvenIntsAndSum(inputs).getOr("invalid input"),
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
        NOTHING,
        JUST,
    }

    /**
     * Construct a present `Maybe` from a value.
     */
    export function just<A>(x: A): Maybe<A> {
        return new Just(x);
    }

    /**
     * Consruct a `Maybe` from a value that is potentially `null` or
     * `undefined`.
     *
     * @remarks
     *
     * If the value is `null` or `undefined`, return `Nothing`; otherwise,
     * return the value in a `Just`.
     */
    export function fromMissing<A>(x: A | null | undefined): Maybe<A> {
        return x === null || x === undefined ? nothing : just(x);
    }

    /**
     * Adapt a function that may return `null` or `undefined` into a function
     * that returns a `Maybe`.
     *
     * @remarks
     *
     * If the function returns `null` or `undefined`, return `Nothing`;
     * otherwise, return the result in a `Just`.
     */
    export function wrapFn<T extends unknown[], A>(
        f: (...args: T) => A | null | undefined,
    ): (...args: T) => Maybe<A> {
        return (...args) => fromMissing(f(...args));
    }

    /**
     * Adapt a predicate into a function that returns a `Maybe`.
     *
     * @remarks
     *
     * If the predicate returns `true`, return the argument in a `Just`;
     * otherwise, return `Nothing`.
     */
    export function wrapPred<A, A1 extends A>(
        f: (x: A) => x is A1,
    ): (x: A) => Maybe<A1>;

    export function wrapPred<A>(f: (x: A) => boolean): (x: A) => Maybe<A>;

    export function wrapPred<A>(f: (x: A) => boolean): (x: A) => Maybe<A> {
        return (x) => (f(x) ? just(x) : nothing);
    }

    /**
     * Construct a `Maybe` using a generator comprehension.
     *
     * @remarks
     *
     * The contract for generator comprehensions is as follows:
     *
     * -   The generator provided to `go` must only yield `Maybe` values.
     * -   `Maybe` values must only be yielded using the `yield*` keyword, and
     *     never `yield` (without the `*`). Omitting the `*` inhibits proper
     *     type inference and may cause undefined behavior.
     * -   A `yield*` statement may bind a variable provided by the caller. The
     *     variable inherits the type of the value of the yielded `Maybe`.
     * -   If a yielded `Maybe` is present, its value is bound to a variable (if
     *     provided) and the generator advances.
     * -   If a yielded `Maybe` is absent, the generator halts and `go` returns
     *     `Nothing`.
     * -   The `return` statement of the generator may return a final result,
     *     which is returned from `go` in a `Just` if all yielded `Maybe` values
     *     are present.
     * -   All syntax normally permitted in generators (statements, loops,
     *     declarations, etc.) is permitted within generator comprehensions.
     *
     * @example Basic yielding and returning
     *
     * Consider a comprehension that sums the successes of three `Maybe` values:
     *
     * ```ts
     * import { Maybe } from "@neotype/prelude/maybe.js";
     *
     * const arg0: Maybe<number> = Maybe.just(1);
     * const arg1: Maybe<number> = Maybe.just(2);
     * const arg2: Maybe<number> = Maybe.just(3);
     *
     * const summed: Maybe<number> = Maybe.go(function* () {
     *     const x = yield* arg0;
     *     const y = yield* arg1;
     *     const z = yield* arg2;
     *
     *     return x + y + z;
     * });
     *
     * console.log(summed.getOr("Nothing")); // 6
     * ```
     *
     * Now, observe the change in behavior if one of the yielded arguments was
     * an absent `Maybe` instead. Replace the declaration of `arg1` with the
     * following and re-run the program.
     *
     * ```ts
     * const arg1: Maybe<number> = Maybe.nothing;
     * ```
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
     * Reduce a finite iterable from left to right in the context of `Maybe`.
     *
     * @remarks
     *
     * Start with an initial accumulator and reduce the elements of an iterable
     * using a reducer function that returns a `Maybe`. While the function
     * returns a present `Maybe`, continue the reduction using the value as the
     * new accumulator until there are no elements remaining, and then return
     * the final accumulator in a `Just`; otherwise, return `Nothing`.
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
     * Turn an array or a tuple literal of `Maybe` elements "inside out".
     *
     * @remarks
     *
     * Evaluate the `Maybe` elements in an array or a tuple literal from left to
     * right. If they are all present, collect their values in an array or a
     * tuple literal, respectively, and return the result in a `Just`;
     * otherwise, return `Nothing`.
     *
     * For example:
     *
     * -   `Maybe<A>[]` becomes `Maybe<A[]>`
     * -   `[Maybe<A>, Maybe<B>]` becomes `Maybe<[A, B]>`
     */
    export function collect<T extends readonly Maybe<any>[]>(
        maybes: T,
    ): Maybe<{ [K in keyof T]: JustT<T[K]> }> {
        return go(function* () {
            const results: unknown[] = new Array(maybes.length);
            for (const [idx, maybe] of maybes.entries()) {
                results[idx] = yield* maybe;
            }
            return results as any;
        });
    }

    /**
     * Turn a record or an object literal of `Maybe` elements "inside out".
     *
     * @remarks
     *
     * Evaluate the `Maybe` elements in a record or an object literal. If they
     * are all present, collect their values in a record or an object literal,
     * respectively, and return the result in a `Just`; otherwise, return
     * `Nothing`.
     *
     * For example:
     *
     * -   `Record<string, Maybe<A>>` becomes `Maybe<Record<string, A>>`
     * -   `{ x: Maybe<A>, y: Maybe<B> }` becomes `Maybe<{ x: A, y: B }>`
     */
    export function gather<T extends Record<any, Maybe<any>>>(
        maybes: T,
    ): Maybe<{ [K in keyof T]: JustT<T[K]> }> {
        return go(function* () {
            const results: Record<any, unknown> = {};
            for (const [key, maybe] of Object.entries(maybes)) {
                results[key] = yield* maybe;
            }
            return results as any;
        });
    }

    /**
     * Lift a function into the context of `Maybe`.
     *
     * @remarks
     *
     * Given a function that accepts arbitrary arguments, return an adapted
     * function that accepts `Maybe` values as arguments. When applied, evaluate
     * the arguments from left to right. If they are all present, apply the
     * original function to their values and return the result in a `Just`;
     * otherwise, return `Nothing`.
     */
    export function lift<T extends unknown[], A>(
        f: (...args: T) => A,
    ): (...maybes: { [K in keyof T]: Maybe<T[K]> }) => Maybe<A> {
        return (...maybes) => collect(maybes).map((args) => f(...args));
    }

    /**
     * Construct a `Promise` that fulfills with a `Maybe` using an async
     * generator comprehension.
     *
     * @remarks
     *
     * The contract for async generator comprehensions is as follows:
     *
     * -   The async generator provided to `goAsync` must only yield `Maybe`
     *     values.
     *     -   `Promise` values must never be yielded. If a `Promise` contains
     *         a `Maybe`, the `Promise` must first be awaited to access and
     *         yield the `Maybe`. This is done with a `yield* await` statement.
     * -   `Maybe` values must only be yielded using the `yield*` keyword, and
     *     never `yield` (without the `*`). Omitting the `*` inhibits proper
     *     type inference and may cause undefined behavior.
     * -   A `yield*` statement may bind a variable provided by the caller. The
     *     variable inherits the type of the value of the yielded `Maybe`.
     * -   If a yielded `Maybe` is present, its value is bound to a variable (if
     *     provided) and the generator advances.
     * -   If a yielded `Maybe` is absent, the generator halts and `goAsync`
     *     fulfills with `Nothing`.
     * -   If a `Promise` rejects or an operation throws, the generator halts
     *     and `goAsync` rejects with the error.
     * -   The `return` statement of the generator may return a final result,
     *     and `goAsync` fulfills with the result in a `Just` if all yielded
     *     `Maybe` values are present and no errors are encountered.
     * -   All syntax normally permitted in async generators (the `await`
     *     keyword, statements, loops, declarations, etc.) is permitted within
     *     async generator comprehensions.
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
     * The fluent syntax for `Maybe`.
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
         * Test whether this `Maybe` is absent.
         */
        isNothing(this: Maybe<any>): this is Nothing {
            return this.typ === Typ.NOTHING;
        }

        /**
         * Test whether this `Maybe` is present.
         */
        isJust<A>(this: Maybe<A>): this is Just<A> {
            return this.typ === Typ.JUST;
        }

        /**
         * If this `Maybe` is present, apply a function to its value and return
         * the result; otherwise, evaluate a fallback function and return the
         * result.
         */
        unwrap<A, B, C>(
            this: Maybe<A>,
            onNothing: () => B,
            onJust: (x: A) => C,
        ): B | C {
            return this.isNothing() ? onNothing() : onJust(this.val);
        }

        /**
         * If this `Maybe` is present, extract its value; otherwise, evaluate a
         * function to return a fallback result.
         */
        getOrElse<A, B>(this: Maybe<A>, f: () => B): A | B {
            return this.unwrap(f, id);
        }

        /**
         * If this `Maybe` is present, extract its value; otherwise, return a
         * fallback value.
         */
        getOr<A, B>(this: Maybe<A>, fallback: B): A | B {
            return this.unwrap(() => fallback, id);
        }

        /**
         * If this `Maybe` is absent, evaluate a function to return a fallback
         * `Maybe`; otherwise, return this `Maybe` as is.
         */
        recover<A, B>(this: Maybe<A>, f: () => Maybe<B>): Maybe<A | B> {
            return this.isNothing() ? f() : this;
        }

        /**
         * If this `Maybe` is present, apply a function to its value to return
         * another `Maybe`; otherwise, return `Nothing`.
         */
        flatMap<A, B>(this: Maybe<A>, f: (x: A) => Maybe<B>): Maybe<B> {
            return this.isNothing() ? this : f(this.val);
        }

        /**
         * If this and that `Maybe` are both present, apply a function to thier
         * values and return the result in a `Just`; otherwise, return
         * `Nothing`.
         */
        zipWith<A, B, C>(
            this: Maybe<A>,
            that: Maybe<B>,
            f: (x: A, y: B) => C,
        ): Maybe<C> {
            return this.flatMap((x) => that.map((y) => f(x, y)));
        }

        /**
         * If this and that `Maybe` are both present, return only the first
         * value in a `Just` and discard the second; otherwise, return
         * `Nothing`.
         */
        zipFst<A>(this: Maybe<A>, that: Maybe<any>): Maybe<A> {
            return this.zipWith(that, id);
        }

        /**
         * If this and that `Maybe` are both present, return only the second
         * value in a `Just` and discard the first; otherwise, return `Nothing`.
         */
        zipSnd<B>(this: Maybe<any>, that: Maybe<B>): Maybe<B> {
            return this.flatMap(() => that);
        }

        /**
         * If this `Maybe` is present, apply a function to its value and return
         * the result in a `Just`; otherwise, return `Nothing`.
         */
        map<A, B>(this: Maybe<A>, f: (x: A) => B): Maybe<B> {
            return this.flatMap((x) => just(f(x)));
        }
    }

    /**
     * An absent `Maybe`.
     */
    export class Nothing extends Syntax {
        static readonly singleton = new Nothing();

        /**
         * The property that discriminates Maybe.
         */
        readonly typ = Typ.NOTHING;

        private constructor() {
            super();
        }

        /**
         * Defining iterable behavior for `Maybe` allows TypeScript to infer
         * `Just` types when yielding `Maybe` values in generator comprehensions
         * using `yield*`.
         *
         * @hidden
         */
        *[Symbol.iterator](): Iterator<Maybe<never>, never, unknown> {
            return (yield this) as never;
        }
    }

    /**
     * A present `Maybe`.
     */
    export class Just<out A> extends Syntax {
        /**
         * The property that discriminates `Maybe`.
         */
        readonly typ = Typ.JUST;

        readonly val: A;

        constructor(val: A) {
            super();
            this.val = val;
        }

        /**
         * Defining iterable behavior for `Maybe` allows TypeScript to infer
         * `Just` types when yielding `Maybe` values in generator comprehensions
         * using `yield*`.
         *
         * @hidden
         */
        *[Symbol.iterator](): Iterator<Maybe<A>, A, unknown> {
            return (yield this) as A;
        }
    }

    /**
     * The absent `Maybe`.
     */
    export const nothing = Maybe.Nothing.singleton as Maybe<never>;

    /**
     * Extract the present value type `A` from the type `Maybe<A>`.
     */
    // prettier-ignore
    export type JustT<T extends Maybe<any>> =
        T extends Maybe<infer A> ? A : never;
}
