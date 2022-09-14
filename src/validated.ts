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
 * This module provides the `Validated` type and associated operations.
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
 * ```ts
 * import { Semigroup } from "@neotype/prelude/cmb.js";
 *
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
 * }
 * ```
 *
 * ## Importing from this module
 *
 * This module exposes `Validated` as both a type and a namespace. The namespace
 * provides functions and other utilities for the `Validated` type.
 *
 * The type and namespace can be imported under the same alias:
 *
 * ```ts
 * import { Validated } from "@neotype/prelude/validated.js";
 *
 * const example: Validated<List<string>, number> = Validated.accept(1);
 * ```
 *
 * Or, the type ane namespace can be imported and aliased separately:
 *
 * ```ts
 * import {
 *     type Validated,
 *     Validated as V,
 * } from "@neotype/prelude/validated.js";
 *
 * const example: Validated<List<string>, number> = V.accept(1);
 * ```
 *
 * ## Constructing `Validated`
 *
 * The `dispute` and `accept` functions construct the `Disputed` and `Accepted`
 * variants of `Validated`, respectively.
 *
 * Furthermore:
 *
 * -   `fromEither` constructs a Validated from an Either; `Left` becomes
 *     `Disputed` and `Right` becomes `Accepted`.
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
 * Alternatively, the `fold` method will unwrap a Validated by applying one of
 * two functions to its `Disputed` or `Accepted` value.
 *
 * These methods will extract the value from a Validated:
 *
 * -   `disputedOrFold` extracts the value if the Validated is `Disputed`;
 *     otherwise, it applies a function to the `Accepted` value to return a
 *     fallback result.
 * -   `acceptedOrFold` extracts the value if the Validated is `Accepted`;
 *     otherwise, it applies a function to the `Disputed` value to return a
 *     fallback result.
 *
 * `Validated` implements `Eq` and `Ord` when both its `Disputed` and `Accepted`
 * values implement `Eq` and `Ord`.
 *
 * -   Two Validateds are equal if they are the same variant and their values
 *     are equal.
 * -   When ordered, `Disputed` is always less than `Accepted`. If the
 *     variants are equal, their values will determine the ordering.
 *
 * ## `Validated` as a semigroup
 *
 * `Validated` implements `Semigroup` when both its `Disputed` and `Accepted`
 * values implement `Semigroup`. When combined, the first `Disputed` Validated
 * will begin accumulating failures. If both Validateds are `Accepted`, their
 * values will be combined and returned in `Accepted`.
 *
 * In other words, `cmb(x, y)` is equivalent to `x.zipWith(y, cmb)` for all
 * Validateds `x` and `y`.
 *
 * ## Transforming values
 *
 * These methods transform a Validated's value:
 *
 * -   `bimap` applies one of two functions to the `Disputed` or `Accepted`
 *     value depending on the Validated's variant.
 * -   `mapDisputed` applies a function to the `Disputed` value, and leaves the
 *     `Accepted` value unaffected.
 * -   `map` applies a function to the `Accepted` value, and leaves the
 *     `Disputed` value unaffected.
 * -   `mapTo` overwrites the `Accepted` value, and leaves the `Disputed` value
 *     unaffected.
 *
 * These methods combine the values of two `Accepted` variants:
 *
 * -   `zipWith` applies a function to their values.
 * -   `zipFst` keeps only the first value, and discards the second.
 * -   `zipSnd` keeps only the second value, and discards the first.
 *
 * ## Collecting into `Validated`
 *
 * `Validated` provides several functions for working with collections of
 * Validateds. Sometimes, a collection of Validateds must be turned "inside out"
 * into a Validated that contains a "mapped" collection of `Accepted` values.
 *
 * These methods will traverse a collection of Validateds to extract the
 * `Accepted` values. If any Validated in the collection is `Disputed`, the
 * traversal is halted and `Disputed` values begin accumulating instead.
 *
 * -   `collect` turns an Array or a tuple literal of Validateds inside out.
 * -   `tupled` turns a series of two or more individual Validateds inside out.
 *
 * ```ts
 * console.log(
 *     Validated.collect([Validated.accept(42), Validated.accept("ok")]),
 * );
 * console.log(Validated.tupled(Validated.accept(42), Validated.accept("ok")));
 * ```
 *
 * ## Examples
 *
 * ### Validating a single property
 *
 * ```ts
 * function requireNonEmpty(input: string): Validated<List<string>, string> {
 *     return input.length
 *         ? Validated.accept(input)
 *         : Validated.dispute(new List("Email must not be empty"));
 * }
 *
 * function requireAtSign(input: string): Validated<List<string>, string> {
 *     return input.includes("@")
 *         ? Validated.accept(input)
 *         : Validated.dispute(new List(`Email must include "@"`));
 * }
 *
 * function requirePeriod(input: string): Validated<List<string>, string> {
 *     return input.includes(".")
 *         ? Validated.accept(input)
 *         : Validated.dispute(new List("Email must include period"));
 * }
 *
 * function validateEmail(input: string): Validated<List<string>, string> {
 *     return requireNonEmpty(input)
 *         .zipFst(requireAtSign(input))
 *         .zipFst(requirePeriod(input));
 * }
 *
 * [
 *     "",
 *     "neo",
 *     "neogmail.com",
 *     "neo@gmailcom",
 *     "neo@gmail.com",
 * ].forEach((input) =>
 *     console.log(`email "${input}": `, validateEmail(input)),
 * );
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
 *         : Validated.dispute(new List("Name must not be empty"));
 * }
 *
 * function validateAge(input: number): Validated<List<string>, number> {
 *     return input >= 0 && input <= 100
 *         ? Validated.accept(input)
 *         : Validated.dispute(new List("Age must be between 0 and 100"));
 * }
 *
 * function validatePerson(
 *     rawName: string,
 *     rawAge: number,
 * ): Validated<List<string>, Person> {
 *     return validateName(rawName)
 *         .zipWith(validateAge(rawAge), (name, age) => ({ name, age }));
 * }
 *
 * [
 *     ["", 182],
 *     ["", 30],
 *     ["Neo", 150],
 *     ["Neo", 45],
 * ].forEach(([input1, input2]) =>
 *     console.log(
 *         `inputs [${input1}, ${input2}]: `,
 *         validatePerson(input1, input2),
 *     ),
 * );
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
 *     input: string[]
 * ): Validated<List<string>, string[]> {
 *     return Validated.collect(elems.map(requireLowercase));
 * }
 *
 * [
 *     ["New York", "Oregon"],
 *     ["foo", "Bar", "baz"],
 *     ["banana", "apple", "orange"],
 * ].forEach((elems) =>
 *     console.log(`elems: [${elems}]`, requireLowercaseElems(elems)),
 * );
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
 *
 * The namespace provides:
 *
 * -   The `Disputed` and `Accepted` variant classes.
 * -   An abstract `Syntax` class that provides the fluent API for `Validated`.
 * -   A `Typ` enumeration that discriminates `Validated`.
 * -   Functions for constructing and collecting into `Validated`.
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
    export function collect<E extends Semigroup<E>, A0, A1>(
        vtds: readonly [Validated<E, A0>, Validated<E, A1>],
    ): Validated<E, readonly [A0, A1]>;

    export function collect<E extends Semigroup<E>, A0, A1, A2>(
        vtds: readonly [Validated<E, A0>, Validated<E, A1>, Validated<E, A2>],
    ): Validated<E, readonly [A0, A1, A2]>;

    export function collect<E extends Semigroup<E>, A0, A1, A2, A3>(
        vtds: readonly [
            Validated<E, A0>,
            Validated<E, A1>,
            Validated<E, A2>,
            Validated<E, A3>,
        ],
    ): Validated<E, readonly [A0, A1, A2, A3]>;

    export function collect<E extends Semigroup<E>, A0, A1, A2, A3, A4>(
        vtds: readonly [
            Validated<E, A0>,
            Validated<E, A1>,
            Validated<E, A2>,
            Validated<E, A3>,
            Validated<E, A4>,
        ],
    ): Validated<E, readonly [A0, A1, A2, A3, A4]>;

    // prettier-ignore
    export function collect<E extends Semigroup<E>, A0, A1, A2, A3, A4, A5>(
        vtds: readonly [
            Validated<E, A0>,
            Validated<E, A1>,
            Validated<E, A2>,
            Validated<E, A3>,
            Validated<E, A4>,
            Validated<E, A5>,
        ],
    ): Validated<E, readonly [A0, A1, A2, A3, A4, A5]>;

    // prettier-ignore
    export function collect<E extends Semigroup<E>, A0, A1, A2, A3, A4, A5, A6>(
        vtds: readonly [
            Validated<E, A0>,
            Validated<E, A1>,
            Validated<E, A2>,
            Validated<E, A3>,
            Validated<E, A4>,
            Validated<E, A5>,
            Validated<E, A6>,
        ],
    ): Validated<E, readonly [A0, A1, A2, A3, A4, A5, A6]>;

    // prettier-ignore
    export function collect<E extends Semigroup<E>, A0, A1, A2, A3, A4, A5, A6, A7>(
        vtds: readonly [
            Validated<E, A0>,
            Validated<E, A1>,
            Validated<E, A2>,
            Validated<E, A3>,
            Validated<E, A4>,
            Validated<E, A5>,
            Validated<E, A6>,
            Validated<E, A7>,
        ],
    ): Validated<E, readonly [A0, A1, A2, A3, A4, A5, A6, A7]>;

    // prettier-ignore
    export function collect<E extends Semigroup<E>, A0, A1, A2, A3, A4, A5, A6, A7, A8>(
        vtds: readonly [
            Validated<E, A0>,
            Validated<E, A1>,
            Validated<E, A2>,
            Validated<E, A3>,
            Validated<E, A4>,
            Validated<E, A5>,
            Validated<E, A6>,
            Validated<E, A7>,
            Validated<E, A8>,
        ],
    ): Validated<E, readonly [A0, A1, A2, A3, A4, A5, A6, A7, A8]>;

    // prettier-ignore
    export function collect<E extends Semigroup<E>, A0, A1, A2, A3, A4, A5, A6, A7, A8, A9>(
        vtds: readonly [
            Validated<E, A0>,
            Validated<E, A1>,
            Validated<E, A2>,
            Validated<E, A3>,
            Validated<E, A4>,
            Validated<E, A5>,
            Validated<E, A6>,
            Validated<E, A7>,
            Validated<E, A8>,
            Validated<E, A9>,
        ],
    ): Validated<E, readonly [A0, A1, A2, A3, A4, A5, A6, A7, A8, A9]>;

    export function collect<E extends Semigroup<E>, A>(
        vtds: readonly Validated<E, A>[],
    ): Validated<E, readonly A[]>;

    export function collect<E extends Semigroup<E>, A>(
        vtds: readonly Validated<E, A>[],
    ): Validated<E, readonly A[]> {
        let acc = accept<A[], E>(new Array(vtds.length));
        for (const [idx, vtd] of vtds.entries()) {
            acc = acc.zipWith(vtd, (results, x) => {
                results[idx] = x;
                return results;
            });
        }
        return acc;
    }

    /**
     * Evaluate a series of Validateds from left to right and collect the
     * `Accepted` values in a tuple literal.
     */
    export function tupled<E extends Semigroup<E>, A0, A1>(
        ...vdts: [Validated<E, A0>, Validated<E, A1>]
    ): Validated<E, readonly [A0, A1]>;

    export function tupled<E extends Semigroup<E>, A0, A1, A2>(
        ...vdts: [Validated<E, A0>, Validated<E, A1>, Validated<E, A2>]
    ): Validated<E, readonly [A0, A1, A2]>;

    export function tupled<E extends Semigroup<E>, A0, A1, A2, A3>(
        ...vdts: [
            Validated<E, A0>,
            Validated<E, A1>,
            Validated<E, A2>,
            Validated<E, A3>,
        ]
    ): Validated<E, readonly [A0, A1, A2, A3]>;

    export function tupled<E extends Semigroup<E>, A0, A1, A2, A3, A4>(
        ...vdts: [
            Validated<E, A0>,
            Validated<E, A1>,
            Validated<E, A2>,
            Validated<E, A3>,
            Validated<E, A4>,
        ]
    ): Validated<E, readonly [A0, A1, A2, A3, A4]>;

    export function tupled<E extends Semigroup<E>, A0, A1, A2, A3, A4, A5>(
        ...vdts: [
            Validated<E, A0>,
            Validated<E, A1>,
            Validated<E, A2>,
            Validated<E, A3>,
            Validated<E, A4>,
            Validated<E, A5>,
        ]
    ): Validated<E, readonly [A0, A1, A2, A3, A4, A5]>;

    // prettier-ignore
    export function tupled<E extends Semigroup<E>, A0, A1, A2, A3, A4, A5, A6>(
        ...vdts: [
            Validated<E, A0>,
            Validated<E, A1>,
            Validated<E, A2>,
            Validated<E, A3>,
            Validated<E, A4>,
            Validated<E, A5>,
            Validated<E, A6>,
        ]
    ): Validated<E, readonly [A0, A1, A2, A3, A4, A5, A6]>;

    // prettier-ignore
    export function tupled<E extends Semigroup<E>, A0, A1, A2, A3, A4, A5, A6, A7>(
        ...vdts: [
            Validated<E, A0>,
            Validated<E, A1>,
            Validated<E, A2>,
            Validated<E, A3>,
            Validated<E, A4>,
            Validated<E, A5>,
            Validated<E, A6>,
            Validated<E, A7>,
        ]
    ): Validated<E, readonly [A0, A1, A2, A3, A4, A5, A6, A7]>;

    // prettier-ignore
    export function tupled<E extends Semigroup<E>, A0, A1, A2, A3, A4, A5, A6, A7, A8>(
        ...vdts: [
            Validated<E, A0>,
            Validated<E, A1>,
            Validated<E, A2>,
            Validated<E, A3>,
            Validated<E, A4>,
            Validated<E, A5>,
            Validated<E, A6>,
            Validated<E, A7>,
            Validated<E, A8>,
        ]
    ): Validated<E, readonly [A0, A1, A2, A3, A4, A5, A6, A7, A8]>;

    // prettier-ignore
    export function tupled<E extends Semigroup<E>, A0, A1, A2, A3, A4, A5, A6, A7, A8, A9>(
        ...vdts: [
            Validated<E, A0>,
            Validated<E, A1>,
            Validated<E, A2>,
            Validated<E, A3>,
            Validated<E, A4>,
            Validated<E, A5>,
            Validated<E, A6>,
            Validated<E, A7>,
            Validated<E, A8>,
            Validated<E, A9>,
        ]
    ): Validated<E, readonly [A0, A1, A2, A3, A4, A5, A6, A7, A8, A9]>;

    export function tupled<E extends Semigroup<E>, A>(
        ...vdts: Validated<E, A>[]
    ): Validated<E, readonly A[]> {
        return collect(vdts);
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
            foldL: (x: E, validated: Disputed<E>) => B,
            foldR: (x: A, validated: Accepted<A>) => B1,
        ): B | B1 {
            return this.isDisputed()
                ? foldL(this.val, this)
                : foldR(this.val, this);
        }

        /**
         * If this Validated is `Disputed`, extract its value; otherwise, apply
         * a function to the `Accepted` value.
         */
        disputedOrFold<E, A, B>(
            this: Validated<E, A>,
            f: (x: A, validated: Accepted<A>) => B,
        ): E | B {
            return this.fold(id, f);
        }

        /**
         * If this Validated is `Accepted`, extract its value; otherwise, apply
         * a function to the `Disputed` value.
         */
        acceptedOrFold<E, A, B>(
            this: Validated<E, A>,
            f: (x: E, validated: Disputed<E>) => B,
        ): A | B {
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
            mapL: (x: E) => E1,
            mapR: (x: A) => B,
        ): Validated<E1, B> {
            return this.isDisputed()
                ? dispute(mapL(this.val))
                : accept(mapR(this.val));
        }

        /**
         * If this Validated is `Disputed`, apply a function to its value.
         */
        mapDisputed<E, A, E1>(
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

        /**
         * If this Validated is `Accepted`, overwrite its value.
         */
        mapTo<E, B>(this: Validated<E, any>, value: B): Validated<E, B> {
            return this.map(() => value);
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
}
