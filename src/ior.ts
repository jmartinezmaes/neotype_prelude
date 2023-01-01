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
 * @remarks
 *
 * `Ior<A, B>` is a type that represents one or both of two values. It is
 * represented by three variants: `Left<A>`, `Right<B>`, and `Both<A, B>`.
 *
 * -   A `Left<A>` contains a *left-hand* value of type `A`.
 * -   A `Right<B>` contains a *right-hand* value of type `B`.
 * -   A `Both<A, B>` contains a left-hand value of type `A` and a right-hand
 *     value of type `B`.
 *
 * `Ior` is often used to represent states of failure or success similar to
 * `Either` and `Validation`. However, `Ior` is capable of also representing a
 * unique state using the `Both` variant. `Both` can represent a success that
 * contains additional information, or a state of "partial failure".
 *
 * When composed, the behavior of `Ior` is a combination of the short-circuiting
 * behavior of `Either` and the failure-accumulating behavior of `Validation`:
 *
 * -   A `Left` short-circuits a computation completely and combines its
 *     left-hand value with any existing left-hand value.
 * -   A `Right` supplies its right-hand value to the next computation.
 * -   A `Both` supplies its right-hand value to the next computation, and
 *     combines its left-hand value with any existing left-hand value.
 *
 * Combinators with this behavior require a `Semigroup` implementation from the
 * accumulating left-hand value.
 *
 * ## Importing from this module
 *
 * This module exports `Ior` as both a type and a namespace. The `Ior` type is
 * an alias for a discriminated union, and the `Ior` namespace provides:
 *
 * -   The `Left`, `Right`, and `Both` variant classes
 * -   The abstract `Syntax` class that provides the fluent API for `Ior`
 * -   The `Typ` enumeration that discriminates `Ior`
 * -   Functions for constructing, chaining, collecting into, and lifting into
 *     `Ior`
 *
 * The type and namespace can be imported under the same alias:
 *
 * ```ts
 * import { Ior } from "@neotype/prelude/ior.js";
 * ```
 *
 * Or, the type and namespace can be imported and aliased separately:
 *
 * ```ts
 * import { type Ior, Ior as I } from "@neotype/prelude/ior.js";
 * ```
 *
 * ## Constructing `Ior`
 *
 * These methods construct an `Ior`:
 *
 * -   `left` constructs a `Left` variant.
 * -   `right` constructs a `Right` variant.
 * -   `both` constructs a `Both` variant.
 * -   `fromEither` constructs an `Ior` from an `Either`.
 * -   `fromValidation` constructs an `Ior` from a `Validation`
 *
 * ## Querying and narrowing the variant
 *
 * The `isLeft`, `isRight`, and `isBoth` methods return `true` if an `Ior` is
 * a `Left`, a `Right`, or a `Both`, respectively. These methods also narrow the
 * type of an `Ior` to the queried variant.
 *
 * The variant can also be queried and narrowed via the `typ` property, which
 * returns a member of the `Typ` enumeration.
 *
 * ## Extracting values
 *
 * The value(s) within an `Ior` can be accessed via the `val` property. If an
 * `Ior` is a `Left` or a `Right`, the `val` property accesses the left-hand or
 * right-hand value, respectively. If an `Ior` is a `Both`, the `val` property
 * is a 2-tuple of the left-hand and right-hand values. The type of the property
 * can be narrowed by first querying the variant.
 *
 * The left-hand and right-hand values of `Both` variants can also be accessed
 * individually via the `fst` and `snd` properties, respectively.
 *
 * The `unwrap` method unwraps an `Ior` by applying one of three functions to
 * its left-hand and/or right-hand value(s).
 *
 * ## Comparing `Ior`
 *
 * `Ior` has the following behavior as an equivalence relation:
 *
 * -   An `Ior<A, B>` implements `Eq` when both `A` and `B` implement `Eq`.
 * -   Two `Ior` values are equal if they are the same variant and their
 *     left-hand and/or right-hand value(s) are equal.
 *
 * `Ior` has the following behavior as a total order:
 *
 * -   An `Ior<A, B>` implements `Ord` when both `A` and `B` implement `Ord`.
 * -   When ordered, a `Left` always compares as less than any `Right`, and a
 *     `Right` always compares as less than any `Both`. If the variants are the
 *     same, their left-hand and/or right-hand values are compared to determine
 *     the ordering. `Both` variants compare their left-hand and right-hand
 *     values lexicographically.
 *
 * ## `Ior` as a semigroup
 *
 * `Ior` has the following behavior as a semigroup:
 *
 * -   An `Ior<A, B>` implements `Semigroup` when both `A` and `B` implement
 *     `Semigroup`.
 * -   When combined, left-hand and right-hand values are combined pairwise.
 *     Combination is lossless and merges values into `Both` variants when there
 *     is no existing value to combine with.
 *
 * ## Transforming values
 *
 * These methods transform the value(s) within an `Ior`:
 *
 * -   `lmap` applies a function to the left-hand value.
 * -   `map` applies a function to the left-hand value.
 *
 * These methods combine the right-hand values of two `Right` and/or `Both`
 * variants, or short-circuit on the first `Left`:
 *
 * -   `zipWith` applies a function to their right-hand values.
 * -   `zipFst` keeps only the first right-hand value, and discards the second.
 * -   `zipSnd` keeps only the second right-hand value, and discards the first.
 *
 * ## Chaining `Ior`
 *
 * The `flatMap` method chains together computations that return `Ior`. If an
 * `Ior` has a right-hand value, a function is applied the value to return
 * another `Ior`. The left-hand values of `Both` variants accumulate using their
 * behavior as a semigroup. If an `Ior` is a `Left`, the computation halts and
 * the left-hand value is combined with any existing left-hand value, and the
 * result is returned in a `Left`.
 *
 * ### Generator comprehensions
 *
 * Generator comprehensions provide an imperative syntax for chaining together
 * computations that return `Ior`. Instead of `flatMap`, a generator is used
 * to unwrap `Ior` values and apply functions to right-hand values.
 *
 * The `go` function evaluates a generator to return an `Ior`. Within the
 * generator, `Ior` values are yielded using the `yield*` keyword. If a yielded
 * `Ior` has a right-hand value, the value may be bound to a specified variable.
 * The left-hand values of `Both` variants accumulate using their behavior as a
 * semigroup. If any yielded `Ior` is a `Left`, the generator halts and the
 * left-hand value is combined with any existing left-hand value, and the result
 * is returned in a `Left`; otherwise, when the computation is complete, the
 * generator may return a final result and `go` returns the result as a
 * right-hand value.
 *
 * ## Async generator comprehensions
 *
 * Async generator comprehensions provide `async`/`await` syntax to `Ior`
 * generator comprehensions, allowing promise-like computations that fulfill
 * with `Ior` to be chained together using the familiar generator syntax.
 *
 * The `goAsync` function evaluates an async generator to return a `Promise`
 * that fulfills with an `Ior`. The semantics of `yield*` and `return` within
 * async comprehensions are identical to their synchronous counterparts.
 *
 * ## Collecting into `Ior`
 *
 * These methods turn a container of `Ior` elements "inside out". If all
 * elements have right-hand values, the values are collected into an equivalent
 * container and returned as a right-hand value. The left-hand values of `Both`
 * variants accumulate using their behavior as a semigroup. If any element is a
 * `Left`, the collection halts and the left-hand value is combined with any
 * existing left-hand value, and the result is returned in a `Left`.
 *
 * -   `collect` turns an array or a tuple literal of `Ior` elements inside out.
 *     For example:
 *     -   `Ior<A, B>[]` becomes `Ior<A, B[]>`
 *     -   `[Ior<A, B>, Ior<A, C>]` becomes `Ior<A, [B, C]>`
 * -   `gather` turns a record or an object literal of `Ior` elements inside
 *     out. For example:
 *     -   `Record<string, Ior<A, B>>` becomes `Ior<A, Record<string, B>>`
 *     -   `{ x: Ior<A, B>, y: Ior<A, C> }` becomes `Ior<A, { x: B, y: C }>`
 *
 * The `reduce` function reduces a finite iterable from left to right in the
 * context of `Ior`. This is useful for mapping, filtering, and accumulating
 * values using `Ior`.
 *
 * ## Lifting functions to work with `Ior`
 *
 * The `lift` function receives a function that accepts arbitrary arguments,
 * and returns an adapted function that accepts `Ior` values as arguments
 * instead. The arguments are evaluated from left to right, and if they all
 * have right-hand values, the original function is applied to the values and
 * the result is returned as a right-hand value. The left-hand values of `Both`
 * variants accumulate using their behavior as a semigroup. If any argument is a
 * `Left`, the operation halts and the left-hand value is combined with any
 * existing left-hand value, and the result is returned in a `Left`.
 *
 * @example Basic matching and unwrapping
 *
 * ```ts
 * import { Ior } from "@neotype/prelude/ior.js"
 *
 * const strIorNum: Ior<string, number> = Ior.both("a", 1);
 *
 * // Querying and narrowing using methods
 * if (strIorNum.isLeft()) {
 *     console.log(`Queried Left: ${strIorNum.val}`);
 * } else if (strIorNum.isRight()) {
 *     console.log(`Queried Right: ${strIorNum.val}`);
 * } else {
 *     console.log(`Queried Both: ${strIorNum.fst} and ${strIorNum.snd}`);
 * }
 *
 * // Querying and narrowing using the `typ` property
 * switch (strIorNum.typ) {
 *     case Ior.Typ.Left:
 *         console.log(`Matched Left: ${strIorNum.val}`);
 *         break;
 *     case Ior.Typ.Right:
 *         console.log(`Matched Right: ${strIorNum.val}`);
 *         break;
 *     case Ior.Typ.Both:
 *         console.log(`Matched Both: ${strIorNum.fst} and ${strIorNum.snd}`);
 * }
 *
 * // Case analysis using `unwrap`
 * strIorNum.unwrap(
 *     (str) => console.log(`Unwrapped Left: ${str}`),
 *     (num) => console.log(`Unwrapped Right: ${num}`),
 *     (str, num) => console.log(`Unwrapped Both: ${str} and ${num}`),
 * );
 * ```
 *
 * @example Parsing with `Ior`
 *
 * First, the necessary imports:
 *
 * ```ts
 * import { Semigroup } from "@neotype/prelude/cmb.js";
 * import { Ior } from "@neotype/prelude/ior.js";
 * ```
 *
 * For our example, let's also define a helper semigroup type and some other
 * utilities:
 *
 * ```ts
 * // A semigroup that wraps arrays.
 * class List<out A> {
 *     readonly val: A[];
 *
 *     constructor(...vals: A[]) {
 *         this.val = vals;
 *     }
 *
 *     [Semigroup.cmb](that: List<A>): List<A> {
 *         return new List(...this.val, ...that.val);
 *     }
 *
 *     toJSON(): A[] {
 *         return this.val;
 *     }
 * }
 *
 * // A `Log` represents a List of entries relevant to our program. Log entries
 * // have a log level of "info" or "err".
 * type Log = List<string>;
 *
 * function info(msg: string): Log {
 *     return new List(`info: ${msg}`);
 * }
 *
 * function err(msg: string): Log {
 *     return new List(`err: ${msg}`);
 * }
 * ```
 *
 * Now, consider a program that uses `Ior` to parse an even integer.
 *
 * ```ts
 * function parseInt(input: string): Ior<Log, number> {
 *     const n = Number.parseInt(input);
 *     return Number.isNaN(n)
 *         ? Ior.left(err(`cannot parse '${input}' as int`))
 *         : Ior.both(info(`parse '${input}' ok`), n);
 * }
 *
 * function guardEven(n: number): Ior<Log, number> {
 *     return n % 2 === 0 ? Ior.right(n) : Ior.left(err(`${n} is not even`));
 * }
 *
 * function parseEvenInt(input: string): Ior<Log, number> {
 *     return parseInt(input).flatMap(guardEven);
 * }
 *
 * ["a", "1", "2", "-4", "+42", "0x2A"].forEach((input) => {
 *     const result = JSON.stringify(parseEvenInt(input).val);
 *     console.log(`input "${input}": ${result}`);
 * });
 *
 * // input "a": ["err: cannot parse 'a' as int]
 * // input "1": ["err: 1 is not even"]
 * // input "2": [["info: parse '2' ok"],2]
 * // input "-4": [["info: parse '-4' ok"],-4]
 * // input "+42": [["info: parse '+42' ok"],42]
 * // input "0x2A: [["info: parse '0x2A' ok"],42]
 * ```
 *
 * We can refactor the `parseEvenInt` function to use a generator comprehension
 * instead:
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
 * Suppose we want to parse an array of inputs and collect the successful
 * results, or fail on the first parse error. We may write the following:
 *
 * ```ts
 * function parseEvenInts(inputs: string[]): Ior<Log, number[]> {
 *     return Ior.collect(inputs.map(parseEvenInt));
 * }
 *
 * [
 *     ["a", "-4"],
 *     ["2", "-7"],
 *     ["+42", "0x2A"],
 * ].forEach((inputs) => {
 *     const result = JSON.stringify(parseEvenInts(inputs).val);
 *     console.log(`inputs ${JSON.stringify(inputs)}:\n  ${result}`);
 * });
 *
 * // inputs ["a","-4"]:
 * //   ["err: cannot parse 'a' as int"]
 * // inputs ["2","-7"]:
 * //   ["info: parse '2' ok","info: parse '-7' ok","err: -7 is not even"]
 * // inputs ["+42" "0x2A"]:
 * //   [["info: parse '+42' ok","info: parse '0x2A' ok"],[42,42]]
 * ```
 *
 * Perhaps we want to collect only distinct even numbers using a Set:
 *
 * ```ts
 * function parseEvenIntsUniq(inputs: string[]): Ior<Log, Set<number>> {
 *     return Ior.go(function* () {
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
 *     console.log(`inputs ${JSON.stringify(inputs)}:\n  ${result}`);
 * });
 *
 * // inputs ["a","-4"]:
 * //   ["err: cannot parse 'a' as int"]
 * // inputs ["2","-7"]:
 * //   ["info: parse '2' ok","info: parse '-7' ok","err: -7 is not even"]
 * // inputs ["+42" "0x2A"]:
 * //   [["info: parse '+42' ok","info: parse '0x2A' ok"],[42]]
 * ```
 *
 * Or, perhaps we want to associate the original input strings with our
 * successful parses:
 *
 * ```ts
 * function parseEvenIntsKeyed(
 *     inputs: string[],
 * ): Ior<Log, Record<string, number>> {
 *     return Ior.gather(
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
 *     console.log(`inputs ${JSON.stringify(inputs)}:\n  ${result}`);
 * });
 *
 * // inputs ["a","-4"]:
 * //   ["err: cannot parse 'a' as int"]
 * // inputs ["2","-7"]:
 * //   ["info: parse '2' ok","info: parse '-7' ok","err: -7 is not even"]
 * // inputs ["+42" "0x2A"]:
 * //   [["info: parse '+42' ok","info: parse '0x2A' ok"],{"+42":42,"0x2A":42}]
 * ```
 *
 * Or, perhaps we want to sum our successful parses and return a total:
 *
 * ```ts
 * function parseEvenIntsAndSum(inputs: string[]): Ior<Log, number> {
 *     return Ior.reduce(
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
 *     const result = JSON.stringify(parseEvenIntsAndSum(inputs).val);
 *     console.log(`inputs ${JSON.stringify(inputs)}:\n  ${result}`);
 * });
 *
 * // inputs ["a","-4"]:
 * //   ["err: cannot parse 'a' as int"]
 * // inputs ["2","-7"]:
 * //   ["info: parse '2' ok","info: parse '-7' ok","err: -7 is not even"]
 * // inputs ["+42" "0x2A"]:
 * //   [["info: parse '+42' ok","info: parse '0x2A' ok"],84]
 * ```
 *
 * @module
 */

import { cmb, Semigroup } from "./cmb.js";
import { cmp, Eq, eq, Ord, Ordering } from "./cmp.js";
import { type Either } from "./either.js";
import { id } from "./fn.js";
import { type Validation } from "./validation.js";

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
     * Construct a `Left` variant of `Ior` from a value.
     */
    export function left<A, B = never>(x: A): Ior<A, B> {
        return new Left(x);
    }

    /**
     * Construct a `Right` variant of `Ior` from a value.
     */
    export function right<B, A = never>(x: B): Ior<A, B> {
        return new Right(x);
    }

    /**
     * Construct a `Both` variant of `Ior` from two values.
     */
    export function both<A, B>(x: A, y: B): Ior<A, B> {
        return new Both(x, y);
    }

    /**
     * Construct an `Ior` from an `Either`.
     *
     * @remarks
     *
     * `Left` and `Right` variants of `Either` become `Left` and `Right`
     * variants of `Ior`, respectively.
     */
    export function fromEither<A, B>(either: Either<A, B>): Ior<A, B> {
        return either.unwrap(left, right);
    }

    /**
     * Construct an `Ior` from a `Validation`.
     *
     * @remarks
     *
     * `Err` and `Ok` variants of `Validation` become `Left` and `Right`
     * variants of `Ior`, respectively.
     */
    export function fromValidation<E, A>(vdn: Validation<E, A>): Ior<E, A> {
        return vdn.unwrap(left, right);
    }

    /**
     * Construct an `Ior` using a generator comprehension.
     *
     * @remarks
     *
     * The contract for generator comprehensions is as follows:
     *
     * -   The generator provided to `go` must only yield `Ior` values.
     * -   `Ior` values must only be yielded using the `yield*` keyword, and
     *     never `yield` (without the `*`). Omitting the `*` inhibits proper
     *     type inference and may cause undefined behavior.
     * -   A `yield*` statement may bind a variable provided by the caller. The
     *     variable inherits the type of the right-hand value of the yielded
     *     `Ior`.
     * -   If a yielded `Ior` has a right-hand value, the value is bound to a
     *     variable (if provided) and the generator advances.
     * -   If a yielded `Ior` is a `Both`, its left-hand value is combined with
     *     any existing left-hand value using its behavior as a semigroup.
     * -   If a yielded `Ior` is a `Left`, the generator halts and `go` combines
     *     the left-hand value with any existing left hand value, and returns
     *     the result in a `Left`.
     * -   The `return` statement of the generator may return a final result,
     *     which is returned from `go` as a right-hand value if no `Left`
     *     variants are encountered.
     * -   All syntax normally permitted in generators (statements, loops,
     *     declarations, etc.) is permitted within generator comprehensions.
     *
     * @example Basic yielding and returning
     *
     * Consider a comprehension that sums the right-hand of three `Ior` values,
     * and also combines strings using a user-defined semigroup:
     *
     * ```ts
     * import { Ior } from "@neotype/prelude/ior.js";
     * import { Semigroup } from "@neotype/prelude/semigroup.js";
     *
     * // A helper type that provides a semigroup for strings
     * class Str {
     *     constructor(readonly val: string) {}
     *
     *     [Semigroup.cmb](that: Str): Str {
     *         return new Str(this.val + that.val);
     *     }
     *
     *     toJSON() {
     *         return this.val;
     *     }
     * }
     *
     * const arg0: Ior<Str, number> = Ior.both(new Str("a"), 1);
     * const arg1: Ior<Str, number> = Ior.right(2);
     * const arg2: Ior<Str, number> = Ior.both(new Str("b"), 2);
     *
     * const summed: Ior<Str, number> = Ior.go(function* () {
     *     const x = yield* arg0;
     *     const y = yield* arg1;
     *     const z = yield* arg2;
     *
     *     return x + y + z;
     * });
     *
     * console.log(JSON.stringify(summed.val)); // ["ab",3]
     * ```
     *
     * Now, observe the change in behavior if one of the yielded arguments was
     * a `Left` variant of `Ior` instead. Replace the declaration of `arg1` with
     * the following and re-run the program.
     *
     * ```ts
     * const arg1: Ior<Str, number> = Ior.left(new Str("c"));
     * ```
     */
    export function go<A extends Semigroup<A>, B>(
        f: () => Generator<Ior<A, any>, B, unknown>,
    ): Ior<A, B> {
        const gen = f();
        let nxt = gen.next();
        let acc: A | undefined;

        while (!nxt.done) {
            const ior = nxt.value;
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
     * Reduce a finite iterable from left to right in the context of `Ior`.
     *
     * @remarks
     *
     * Start with an initial accumulator and reduce the elements of an iterable
     * using a reducer function that returns an `Ior`. While the function
     * returns an `Ior` that has a right-hand value, continue the reduction
     * using the value as the new accumulator until there are no elements
     * remaining, and then return final accumulator as a right-hand value.
     * Accumulate the left-hand values of `Both` variants using their behavior
     * as a semigroup. If any `Ior` is a `Left`, halt the reduction and combine
     * the left-hand value with any existing left-hand value, and return the
     * result in a `Left`.
     */
    export function reduce<B, C, A extends Semigroup<A>>(
        xs: Iterable<B>,
        f: (acc: C, x: B) => Ior<A, C>,
        initial: C,
    ): Ior<A, C> {
        return go(function* () {
            let acc = initial;
            for (const x of xs) {
                acc = yield* f(acc, x);
            }
            return acc;
        });
    }

    /**
     * Turn an array or a tuple literal of `Ior` elements "inside out".
     *
     * @remarks
     *
     * Evaluate the `Ior` elements in an array or a tuple literal from left to
     * right. If they all have right-hand values, collect the values in an array
     * or a tuple literal, respectively, and return the result as a right-hand
     * value. Accumulate the left-hand values of `Both` variants using their
     * behavior as a semigroup. If any element is a `Left`, halt the collection
     * and combine the left-hand value with any existing left-hand value, and
     * return the result in a `Left`.
     *
     * For example:
     *
     * -   `Ior<A, B>[]` becomes `Ior<A, B[]>`
     * -   `[Ior<A, B>, Ior<A, C>]` becomes `Ior<A, [B, C]>`
     */
    export function collect<T extends readonly Ior<Semigroup<any>, any>[]>(
        iors: T,
    ): Ior<LeftT<T[number]>, { [K in keyof T]: RightT<T[K]> }> {
        return go(function* () {
            const results: unknown[] = new Array(iors.length);
            for (const [idx, ior] of iors.entries()) {
                results[idx] = yield* ior;
            }
            return results;
        }) as Ior<LeftT<T[number]>, { [K in keyof T]: RightT<T[K]> }>;
    }

    /**
     * Turn a record or an object literal of `Ior` elements "inside out".
     *
     * @remarks
     *
     * Evaluate the `Ior` elements in a record or an object literal. If they all
     * have right-hand values, collect the values in a record or an object
     * literal, tuple literal, respectively, and return the result as a
     * right-hand value. Accumulate the left-hand values of `Both` variants
     * using their behavior as a semigroup. If any element is a `Left`, halt the
     * collection and combine the left-hand value with any existing left-hand
     * value, and return the result in a `Left`.
     *
     * For example:
     *
     * -   `Record<string, Ior<A, B>>` becomes `Ior<A, Record<string, B>>`
     * -   `{ x: Ior<A, B>, y: Ior<A, C> }` becomes `Ior<A, { x: B, y: C }>`
     */
    export function gather<T extends Record<any, Ior<Semigroup<any>, any>>>(
        iors: T,
    ): Ior<LeftT<T[keyof T]>, { [K in keyof T]: RightT<T[K]> }> {
        return Ior.go(function* () {
            const results: Record<any, unknown> = {};
            for (const [key, ior] of Object.entries(iors)) {
                results[key] = yield* ior;
            }
            return results;
        }) as Ior<LeftT<T[keyof T]>, { [K in keyof T]: RightT<T[K]> }>;
    }

    /**
     * Lift a function into the context of `Ior`.
     *
     * @remarks
     *
     * Given a function that accepts arbitrary arguments, return an adapted
     * function that accepts `Ior` values as arguments. When applied, evaluate
     * evaluate the arguments from left to right. If they all have right-hand
     * values, apply the original function to the values and return the result
     * as a right-hand value. Accumulate the left-hand values of `Both` variants
     * using their behavior as a semigroup. If any argument is a `Left`, halt
     * the operation and combine the left-hand value with any existing left-hand
     * value, and return the result in a `Left`.
     */
    export function lift<T extends unknown[], B>(
        f: (...args: T) => B,
    ): <A extends Semigroup<A>>(
        ...iors: { [K in keyof T]: Ior<A, T[K]> }
    ) => Ior<A, B> {
        return (...iors) =>
            collect(iors).map((args) => f(...(args as T))) as Ior<any, B>;
    }

    /**
     * Construct a `Promise` that fulfills with an `Ior` using an async
     * generator comprehension.
     *
     * @remarks
     *
     * The contract for async generator comprehensions is as follows:
     *
     * -   The async generator provided to `goAsync` must only yield `Ior`
     *     values.
     *     -   `Promise` values must never be yielded. If a `Promise` contains
     *         an `Ior`, the `Promise` must first be awaited to access and yield
     *         the `Ior`. This is done with a `yield* await` statement.
     * -   `Ior` values must only be yielded using the `yield*` keyword, and
     *     never `yield` (without the `*`). Omitting the `*` inhibits proper
     *     type inference and may cause undefined behavior.
     * -   A `yield*` statement may bind a variable provided by the caller. The
     *     variable inherits the type of the right-hand value of the yielded
     *     `Ior`.
     * -   If a yielded `Ior` has a right-hand value, the value is bound to a
     *     variable (if provided) and the generator advances.
     * -   If a yielded `Ior` is a `Both`, its left-hand value is combined with
     *     any existing left-hand value using its behavior as a semigroup.
     * -   If a yielded `Ior` is a `Left`, the generator halts and `goAsync`
     *     combines the left-hand value with any existing left-hand value, and
     *     fulfills with the result in a `Left`.
     * -   If a `Promise` rejects or an operation throws, the generator halts
     *     and `goAsync` rejects with the error.
     * -   The `return` statement of the generator may return a final result,
     *     and `goAsync` fulfills with the result as a right-hand value if no
     *     `Left` variants or errors are encountered.
     * -   All syntax normally permitted in async generators (the `await`
     *     keyword, statements, loops, declarations, etc.) is permitted within
     *     async generator comprehensions.
     */
    export async function goAsync<A extends Semigroup<A>, B>(
        f: () => AsyncGenerator<Ior<A, any>, B, unknown>,
    ): Promise<Ior<A, B>> {
        const gen = f();
        let nxt = await gen.next();
        let acc: A | undefined;

        while (!nxt.done) {
            const ior = nxt.value;
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
         * Test whether this `Ior` is the `Left` variant.
         */
        isLeft<A>(this: Ior<A, any>): this is Left<A> {
            return this.typ === Typ.Left;
        }

        /**
         * Test whether this `Ior` is the `Right` variant.
         */
        isRight<B>(this: Ior<any, B>): this is Right<B> {
            return this.typ === Typ.Right;
        }

        /**
         * Test whether this `Ior` is the `Both` variant.
         */
        isBoth<A, B>(this: Ior<A, B>): this is Both<A, B> {
            return this.typ === Typ.Both;
        }

        /**
         * Apply one of three functions to the left-hand and/or right-hand
         * values(s) of this `Ior` depending on the variant, and return the
         * result.
         */
        unwrap<A, B, C, D, E>(
            this: Ior<A, B>,
            onLeft: (x: A) => C,
            onRight: (x: B) => D,
            onBoth: (x: A, y: B) => E,
        ): C | D | E {
            if (this.isLeft()) {
                return onLeft(this.val);
            }
            if (this.isRight()) {
                return onRight(this.val);
            }
            return onBoth(this.fst, this.snd);
        }

        /**
         * If this `Ior` has a right-hand value, apply a function to the value
         * to return another `Ior`. Accumulate the left-hand values of `Both`
         * variants using their behavior as a semigroup. If either `Ior` is a
         * `Left`, combine the left-hand value with any existing left-hand value
         * and return the result in a `Left`.
         */
        flatMap<A extends Semigroup<A>, B, C>(
            this: Ior<A, B>,
            f: (x: B) => Ior<A, C>,
        ): Ior<A, C> {
            if (this.isLeft()) {
                return this;
            }
            if (this.isRight()) {
                return f(this.val);
            }
            const that = f(this.snd);
            if (that.isLeft()) {
                return left(cmb(this.fst, that.val));
            }
            if (that.isRight()) {
                return both(this.fst, that.val);
            }
            return both(cmb(this.fst, that.fst), that.snd);
        }

        /**
         * If this and that `Ior` have a right-hand value, apply a function to
         * the values and return the result as a right-hand value. Accumulate
         * the left-hand values of `Both` variants using their behavior as a
         * semigroup. If either `Ior` is a `Left`, combine the left-hand value
         * with any existing left-hand value and return the result in a `Left`.
         */
        zipWith<A extends Semigroup<A>, B, C, D>(
            this: Ior<A, B>,
            that: Ior<A, C>,
            f: (x: B, y: C) => D,
        ): Ior<A, D> {
            return this.flatMap((x) => that.map((y) => f(x, y)));
        }

        /**
         * If this and that `Ior` have a right-hand value, keep only the first
         * value as a right-hand value and discard the second. Accumulate the
         * left-hand values of `Both` variants using their behavior as a
         * semigroup. If either `Ior` is a `Left`, combine the left-hand value
         * with any existing left-hand value and return the result in a `Left`.
         */
        zipFst<A extends Semigroup<A>, B>(
            this: Ior<A, B>,
            that: Ior<A, any>,
        ): Ior<A, B> {
            return this.zipWith(that, id);
        }

        /**
         * If this and that `Ior` have a right-hand value, keep only the second
         * value as a right-hand value and discard the first. Accumulate the
         * left-hand values of `Both` variants using their behavior as a
         * semigroup. If either `Ior` is a `Left`, combine the left-hand value
         * with any existing left-hand value and return the result in a `Left`.
         */
        zipSnd<A extends Semigroup<A>, C>(
            this: Ior<A, any>,
            that: Ior<A, C>,
        ): Ior<A, C> {
            return this.flatMap(() => that);
        }

        /**
         * If this `Ior` has a left-hand value, apply a function to the value
         * and return the result as a left-hand value; otherwise, return this
         * `Ior` as is.
         */
        lmap<A, B, C>(this: Ior<A, B>, f: (x: A) => C): Ior<C, B> {
            if (this.isLeft()) {
                return left(f(this.val));
            }
            if (this.isRight()) {
                return this;
            }
            return both(f(this.fst), this.snd);
        }

        /**
         * If this `Ior` has a right-hand value, apply a function to the value
         * and return the result as a right-hand value; otherwise, return this
         * `Ior` as is.
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
    }

    /**
     * An `Ior` with a left-hand value.
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
         * Defining iterable behavior for `Ior` allows TypeScript to infer
         * right-hand value types when yielding `Ior` values in generator
         * comprehensions using `yield*`.
         *
         * @hidden
         */
        *[Symbol.iterator](): Iterator<Ior<A, never>, never, unknown> {
            return (yield this) as never;
        }
    }

    /**
     * An `Ior` with a right-hand value.
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
         * Defining iterable behavior for `Ior` allows TypeScript to infer
         * right-hand value types when yielding `Ior` values in generator
         * comprehensions using `yield*`.
         *
         * @hidden
         */
        *[Symbol.iterator](): Iterator<Ior<never, B>, B, unknown> {
            return (yield this) as B;
        }
    }

    /**
     * An `Ior` with a left-hand and a right-hand value.
     */
    export class Both<out A, out B> extends Syntax {
        /**
         * The property that discriminates `Ior`.
         */
        readonly typ = Typ.Both;

        readonly fst: A;

        readonly snd: B;

        get val(): [A, B] {
            return [this.fst, this.snd];
        }

        constructor(fst: A, snd: B) {
            super();
            this.fst = fst;
            this.snd = snd;
        }

        /**
         * Defining iterable behavior for `Ior` allows TypeScript to infer
         * right-hand value types when yielding `Ior` values in generator
         * comprehensions using `yield*`.
         *
         * @hidden
         */
        *[Symbol.iterator](): Iterator<Ior<A, B>, B, unknown> {
            return (yield this) as B;
        }
    }

    /**
     * Extract the left-hand value type `A` from the type `Ior<A, B>`.
     */
    // prettier-ignore
    export type LeftT<T extends Ior<any, any>> =
        [T] extends [Ior<infer A, any>] ? A : never;

    /**
     * Extract the right-hand value type `B` from the type `Ior<A, B>`.
     */
    // prettier-ignore
    export type RightT<T extends Ior<any, any>> =
        [T] extends [Ior<any, infer B>] ? B : never;
}
