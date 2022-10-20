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
 * Validation with accumulating failures.
 *
 * `Validated<E, A>` is a type that represents a state of accumulated failure or
 * success; thus, `Validated` is represented by two variants: `Disputed<E>` and
 * `Accepted<A>`.
 *
 * `Validated` is useful for collecting information about **all** failures in a
 * program, rather than halting evaluation on the first failure. This behavior
 * makes `Validated` a suitable type for validating data from inputs, forms, and
 * other arbitrary information sources.
 *
 * Most combinators for `Validated` will begin accumulating `Disputed` values on
 * the first encountered `Disputed` variant. Combinators with this behavior will
 * will require a `Semigroup` implementation for the accumulating `Disputed`
 * value. This documentation will use the following semigroup in all examples:
 *
 * ## Importing from this module
 *
 * This module exports `Validated` as both a type and a namespace. The
 * `Validated` type is an alias for a discriminated union, and the `Validated`
 * namespace provides:
 *
 * - The `Disputed` and `Accepted` variant classes
 * - The abstract `Syntax` class that provides the fluent API for `Validated`
 * - The `Typ` enumeration that discriminates `Validated`
 * - Functions for constructing and collecting into `Validated`
 *
 * The type and namespace can be imported under the same alias:
 *
 * ```ts
 * import { Validated } from "@neotype/prelude/validated.js";
 * ```
 *
 * Or, the type ane namespace can be imported and aliased separately:
 *
 * ```ts
 * import {
 *     type Validated,
 *     Validated as V
 * } from "@neotype/prelude/validated.js";
 * ```
 *
 * ## Constructing `Validated`
 *
 * The `dispute` and `accept` functions construct the `Disputed` and `Accepted`
 * variants of `Validated`, respectively.
 *
 * Furthermore:
 *
 * - `fromEither` constructs a Validated from an Either. `Left` becomes
 *   `Disputed` and `Right` becomes `Accepted`.
 *
 * ## Querying the variant
 *
 * The `isDisputed` and `isAccepted` methods return `true` if a Validated is the
 * `Disputed` or `Accepted` variant, respectively. These methods will also
 * narrow the type of a Validated to its queried variant.
 *
 * A Validated's variant can also be queried and narrowed via the `typ`
 * property, which returns a member of the `Typ` enumeration.
 *
 * ## Extracting values
 *
 * A Validated's value can be accessed via the `val` property. The type of the
 * property can be narrowed by first querying the Validated's variant.
 *
 * These methods also extract a Validated's value:
 *
 * - `fold` applies one of two functions to the value, depending on the
 *   Validated's variant.
 * - `disputedOrFold` extracts the value if the Validated is `Disputed`;
 *   otherwise, it applies a function to the `Accepted` value to return a
 *   fallback result.
 * - `acceptedOrFold` extracts the value if the Validated is `Accepted`;
 *   otherwise, it applies a function to the `Disputed` value to return a
 *   fallback result.
 *
 * ## Comparing `Validated`
 *
 * `Validated` implements `Eq` and `Ord` when both its `Disputed` and `Accepted`
 * generic types implement `Eq` and `Ord`, respectively.
 *
 * - Two Validateds are equal if they are the same variant and their values
 *   are equal.
 * - When ordered, `Disputed` is always less than `Accepted`. If the variants
 *   are equal, their values will determine the ordering.
 *
 * ## `Validated` as a semigroup
 *
 * `Validated` implements `Semigroup` when both its `Disputed` and `Accepted`
 * generic types implement `Semigroup`. When combined, the first `Disputed`
 * Validated will begin accumulating failures. If both Validateds are
 * `Accepted`, their values will be combined and returned in `Accepted`.
 *
 * In other words, `cmb(x, y)` is equivalent to `x.zipWith(y, cmb)` for all
 * Validateds `x` and `y`.
 *
 * ## Transforming values
 *
 * These methods transform a Validated's value:
 *
 * - `bimap` applies one of two functions to the `Disputed` or `Accepted` value
 *   depending on the Validated's variant.
 * - `lmap` applies a function to the `Disputed` value, and leaves the
 *   `Accepted` value unaffected.
 * - `map` applies a function to the `Accepted` value, and leaves the `Disputed`
 *   value unaffected.
 *
 * These methods combine the values of two `Accepted` variants:
 *
 * - `zipWith` applies a function to their values.
 * - `zipFst` keeps only the first value, and discards the second.
 * - `zipSnd` keeps only the second value, and discards the first.
 *
 * ## Collecting into `Validated`
 *
 * `Validated` provides several functions for working with collections of
 * Validateds. Sometimes, a collection of Validateds must be turned "inside out"
 * into a Validated that contains an equivalent collection of `Accepted` values.
 *
 * These methods will traverse a collection of Validateds to extract the
 * `Accepted` values. If any Validated in the collection is `Disputed`, the
 * traversal is halted and `Disputed` values begin accumulating instead.
 *
 * - `collect` turns an Array or a tuple literal of Validateds inside out.
 * - `gather` turns a Record or an object literal of Validateds inside out.
 *
 * ## Examples
 *
 * These examples assume the following imports and utilities:
 *
 * ```ts
 * import { Semigroup } from "@neotype/prelude/cmb.js";
 * import { Validated } from "@neotype/prelude/validated.js";
 *
 * // A semigroup that wraps Arrays
 * class List<A> {
 *     readonly val: A[]
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
 * ```
 *
 * ### Validating a single property
 *
 * ```ts
 * function requireNonEmpty(input: string): Validated<List<string>, string> {
 *     return input.length > 0
 *         ? Validated.accept(input)
 *         : Validated.dispute(new List("empty input"));
 * }
 *
 * function requireAtSign(input: string): Validated<List<string>, string> {
 *     return input.includes("@")
 *         ? Validated.accept(input)
 *         : Validated.dispute(new List("missing @"));
 * }
 *
 * function requirePeriod(input: string): Validated<List<string>, string> {
 *     return input.includes(".")
 *         ? Validated.accept(input)
 *         : Validated.dispute(new List("missing period"));
 * }
 *
 * function validateEmail(input: string): Validated<List<string>, string> {
 *     return requireNonEmpty(input)
 *         .zipFst(requireAtSign(input))
 *         .zipFst(requirePeriod(input));
 * }
 *
 * ["", "neo", "neogmail.com", "neo@gmailcom", "neo@gmail.com"].forEach(
 *     (input) => {
 *         const result = JSON.stringify(validateEmail(input).val);
 *         console.log(`input "${input}": ${result}`);
 *     }
 * );
 *
 * // input "": ["empty input","missing @","missing period"]
 * // input "neo": ["missing @","missing period"]
 * // input "neogmail.com": ["missing @"]
 * // input "neo@gmailcom": ["missing period"]
 * // input "neo@gmail.com": "neo@gmail.com"
 * ```
 *
 * ### Validating multiple properties
 *
 * ```ts
 * interface Person {
 *     readonly name: string;
 *     readonly age: number;
 * }
 *
 * function validateName(input: string): Validated<List<string>, string> {
 *     return input.length
 *         ? Validated.accept(input)
 *         : Validated.dispute(new List("empty name"));
 * }
 *
 * function validateAge(input: number): Validated<List<string>, number> {
 *     return input >= 0 && input <= 100
 *         ? Validated.accept(input)
 *         : Validated.dispute(new List("age not in range"));
 * }
 *
 * function validatePerson(
 *     rawName: string,
 *     rawAge: number,
 * ): Validated<List<string>, Person> {
 *     return Validated.gather({
 *         name: validateName(rawName),
 *         age: validateAge(rawAge),
 *     });
 * }
 *
 * [
 *     ["", 182] as const,
 *     ["", 30] as const,
 *     ["Neo", 150] as const,
 *     ["Neo", 45] as const,
 * ].forEach((inputs) => {
 *     const [rawName, rawAge] = inputs;
 *     const result = JSON.stringify(validatePerson(rawName, rawAge).val);
 *     console.log(`inputs ${JSON.stringify(inputs)}: ${result}`);
 * });
 *
 * // inputs ["",182]: ["empty name","age not in range"]
 * // inputs ["",30]: ["empty name"]
 * // inputs ["Neo",150]: ["age not in range"]
 * // inputs ["Neo",45]: {"name":"Neo","age":45}
 * ```
 *
 * ### Validating arbitrary properties
 *
 * ```ts
 * function requireLowercase(input: string): Validated<List<string>, string> {
 *     return input === input.toLowerCase()
 *         ? Validated.accept(input)
 *         : Validated.dispute(new List(input));
 * }
 *
 * function requireLowercaseElems(
 *     inputs: string[]
 * ): Validated<List<string>, string[]> {
 *     return Validated.collect(inputs.map(requireLowercase));
 * }
 *
 * [
 *     ["New York", "Oregon"],
 *     ["foo", "Bar", "baz"],
 *     ["banana", "apple", "orange"],
 * ].forEach((inputs) => {
 *     const result = JSON.stringify(
 *         requireLowercaseElems(inputs).fold(
 *             (invalidInputs) => ({ invalid: invalidInputs }),
 *             (validInputs) => ({ valid: validInputs }),
 *         ),
 *     );
 *     console.log(`inputs ${JSON.stringify(inputs)}: ${result}`);
 * });
 *
 * // inputs ["New York","Oregon"]: {"invalid":["New York","Oregon"]}
 * // inputs ["foo","Bar","baz"]: {"invalid":["Bar"]}
 * // inputs ["banana","apple","orange"]: {"valid":["banana","apple","orange"]}
 * ```
 *
 * @module
 */

import { cmb, Semigroup } from "./cmb.js";
import { cmp, Eq, eq, Ord, Ordering } from "./cmp.js";
import { type Either } from "./either.js";
import { id } from "./fn.js";

/**
 * A type that represents either accumulating failure (`Disputed`) or success
 * (`Accepted`).
 */
export type Validated<E, A> = Validated.Disputed<E> | Validated.Accepted<A>;

/**
 * The companion namespace for the `Validated` type.
 */
export namespace Validated {
    /**
     * An enumeration that discriminates `Validated`.
     */
    export enum Typ {
        Disputed,
        Accepted,
    }

    /**
     * Construct a `Disputed` Validated.
     */
    export function dispute<E, A = never>(x: E): Validated<E, A> {
        return new Disputed(x);
    }

    /**
     * Construct an `Accepted` Validated.
     */
    export function accept<A, E = never>(x: A): Validated<E, A> {
        return new Accepted(x);
    }

    /**
     * Convert an Either to a Validated.
     */
    export function fromEither<E, A>(either: Either<E, A>): Validated<E, A> {
        return either.fold(dispute, accept);
    }

    /**
     * Evaluate the Validateds in an Array or a tuple literal from left to right
     * and collect the `Accepted` values in an Array or a tuple literal,
     * respectively.
     */
    export function collect<
        T extends readonly Validated<Semigroup<any>, any>[],
    >(
        vtds: T,
    ): Validated<DisputedT<T[number]>, { [K in keyof T]: AcceptedT<T[K]> }> {
        let acc = accept<any, any>(new Array(vtds.length));
        for (const [idx, vtd] of vtds.entries()) {
            acc = acc.zipWith(vtd, (results, x) => {
                results[idx] = x;
                return results;
            });
        }
        return acc;
    }

    /**
     * Evaluate the Validateds in a Record or an object literal and collect the
     * `Accepted` values in a Record or an object literal, respectively.
     */
    export function gather<
        T extends Record<string, Validated<Semigroup<any>, any>>,
    >(
        vtds: T,
    ): Validated<DisputedT<T[keyof T]>, { [K in keyof T]: AcceptedT<T[K]> }> {
        let acc = accept<any, any>({});
        for (const [key, vtd] of Object.entries(vtds)) {
            acc = acc.zipWith(vtd, (results, x) => {
                results[key as keyof T] = x;
                return results;
            });
        }
        return acc;
    }

    /**
     * The fluent syntax for `Validated`.
     */
    export abstract class Syntax {
        [Eq.eq]<E extends Eq<E>, A extends Eq<A>>(
            this: Validated<E, A>,
            that: Validated<E, A>,
        ): boolean {
            if (this.isDisputed()) {
                return that.isDisputed() && eq(this.val, that.val);
            }
            return that.isAccepted() && eq(this.val, that.val);
        }

        [Ord.cmp]<E extends Ord<E>, A extends Ord<A>>(
            this: Validated<E, A>,
            that: Validated<E, A>,
        ): Ordering {
            if (this.isDisputed()) {
                return that.isDisputed()
                    ? cmp(this.val, that.val)
                    : Ordering.less;
            }
            return that.isAccepted()
                ? cmp(this.val, that.val)
                : Ordering.greater;
        }

        [Semigroup.cmb]<E extends Semigroup<E>, A extends Semigroup<A>>(
            this: Validated<E, A>,
            that: Validated<E, A>,
        ): Validated<E, A> {
            return this.zipWith(that, cmb);
        }

        /**
         * Test whether this Validated is `Disputed`.
         */
        isDisputed<E>(this: Validated<E, any>): this is Disputed<E> {
            return this.typ === Typ.Disputed;
        }

        /**
         * Test whether this Validated is `Accepted`.
         */
        isAccepted<A>(this: Validated<any, A>): this is Accepted<A> {
            return this.typ === Typ.Accepted;
        }

        /**
         * Case analysis for Validated.
         */
        fold<E, A, B, B1>(
            this: Validated<E, A>,
            foldL: (x: E) => B,
            foldR: (x: A) => B1,
        ): B | B1 {
            return this.isDisputed() ? foldL(this.val) : foldR(this.val);
        }

        /**
         * If this Validated is `Disputed`, extract its value; otherwise, apply
         * a function to the `Accepted` value.
         */
        disputedOrFold<E, A, B>(this: Validated<E, A>, f: (x: A) => B): E | B {
            return this.fold(id, f);
        }

        /**
         * If this Validated is `Accepted`, extract its value; otherwise, apply
         * a function to the `Disputed` value.
         */
        acceptedOrFold<E, A, B>(this: Validated<E, A>, f: (x: E) => B): A | B {
            return this.fold(f, id);
        }

        /**
         * If this and that Validated are `Accepted`, apply a function to their
         * values.
         */
        zipWith<E extends Semigroup<E>, A, B, C>(
            this: Validated<E, A>,
            that: Validated<E, B>,
            f: (x: A, y: B) => C,
        ): Validated<E, C> {
            if (this.isDisputed()) {
                return that.isDisputed()
                    ? dispute(cmb(this.val, that.val))
                    : this;
            }
            return that.isDisputed() ? that : accept(f(this.val, that.val));
        }

        /**
         * If this and that Validated are `Accepted`, keep only this Validated's
         * value.
         */
        zipFst<E extends Semigroup<E>, A>(
            this: Validated<E, A>,
            that: Validated<E, any>,
        ): Validated<E, A> {
            return this.zipWith(that, id);
        }

        /**
         * If this and that Validated are `Accepted`, keep only that Validated's
         * value.
         */
        zipSnd<E extends Semigroup<E>, B>(
            this: Validated<E, any>,
            that: Validated<E, B>,
        ): Validated<E, B> {
            return this.zipWith(that, (_, y) => y);
        }

        /**
         * Apply one of two functions to this Validated's value if this is
         * `Disputed` or `Accepted`, respectively.
         */
        bimap<E, A, E1, B>(
            this: Validated<E, A>,
            lmap: (x: E) => E1,
            rmap: (x: A) => B,
        ): Validated<E1, B> {
            return this.isDisputed()
                ? dispute(lmap(this.val))
                : accept(rmap(this.val));
        }

        /**
         * If this Validated is `Disputed`, apply a function to its value.
         */
        lmap<E, A, E1>(
            this: Validated<E, A>,
            f: (x: E) => E1,
        ): Validated<E1, A> {
            return this.isDisputed() ? dispute(f(this.val)) : this;
        }

        /**
         * If this Validated is `Accepted`, apply a function to its value.
         */
        map<E, A, B>(this: Validated<E, A>, f: (x: A) => B): Validated<E, B> {
            return this.isDisputed() ? this : accept(f(this.val));
        }
    }

    /**
     * A disputed Validated.
     */
    export class Disputed<out E> extends Syntax {
        /**
         * The property that discriminates `Validated`.
         */
        readonly typ = Typ.Disputed;

        readonly val: E;

        constructor(val: E) {
            super();
            this.val = val;
        }
    }

    /**
     * An accepted Validated.
     */
    export class Accepted<out A> extends Syntax {
        /**
         * The property that discriminates `Validated`.
         */
        readonly typ = Typ.Accepted;

        readonly val: A;

        constructor(val: A) {
            super();
            this.val = val;
        }
    }

    /**
     * Extract the `Disputed` type `E` from the type `Validated<E, A>`.
     */
    // prettier-ignore
    export type DisputedT<T extends Validated<any, any>> =
        [T] extends [Validated<infer E, any>] ? E : never;

    /**
     * Extract the `Accepted` type `A` from the type `Validated<E, A>`.
     */
    // prettier-ignore
    export type AcceptedT<T extends Validated<any, any>> =
        [T] extends [Validated<any, infer A>] ? A : never;
}
