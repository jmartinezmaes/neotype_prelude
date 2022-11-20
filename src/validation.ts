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
 * @remarks
 *
 * `Validation<E, A>` is a type that represents a state of accumulated failure
 * or success; thus, `Validation` is represented by two variants: `Err<E>` and
 * `Ok<A>`.
 *
 * -   The `Err` variant represents a *failed* `Validation` and contains a
 *     *failure* of type `E`.
 * -   The `Ok` variant represents a *successful* `Validation` and contains a
 *     *success* of type `A`.
 *
 * `Validation` is useful for collecting information about **all** failures in a
 * program, rather than halting evaluation on the first failure. This behavior
 * makes `Validation` a suitable type for validating data from inputs, forms,
 * and other arbitrary information sources.
 *
 * Most combinators for `Validation` will begin accumulating failures on the
 * first encountered `Err`. Combinators with this behavior will require a
 * `Semigroup` implementation from the accumulating failures.
 *
 * ## Importing from this module
 *
 * This module exports `Validation` as both a type and a namespace. The
 * `Validation` type is an alias for a discriminated union, and the `Validation`
 * namespace provides:
 *
 * -   The `Err` and `Ok` variant classes
 * -   The abstract `Syntax` class that provides the fluent API for `Validation`
 * -   The `Typ` enumeration that discriminates `Validation`
 * -   Functions for constructing, collecting, and lifting into `Validation`
 *
 * The type and namespace can be imported under the same alias:
 *
 * ```ts
 * import { Validation } from "@neotype/prelude/validation.js";
 * ```
 *
 * Or, the type and namespace can be imported and aliased separately:
 *
 * ```ts
 * import {
 *     type Validation,
 *     Validation as V
 * } from "@neotype/prelude/validation.js";
 * ```
 *
 * ## Constructing `Validation`
 *
 * These functions construct a `Validation`:
 *
 * -   `err` constructs a failed `Validation`
 * -   `ok` constructs a successful `Validation`.
 * -   `fromEither` constructs a `Validation` from an `Either`. The `Left` and
 *     `Right` variants of `Either` become the `Err` and `Ok` variants of
 *     `Validation`, respectively.
 *
 * ## Querying and narrowing the variant
 *
 * The `isErr` and `isOk` methods return `true` if a `Validation` is `Err` or
 * `Ok`, respectively. These methods will also narrow the type of a `Validation`
 * to its queried variant.
 *
 * The variant can also be queried and narrowed via the `typ` property, which
 * returns a member of the `Typ` enumeration.
 *
 * ## Extracting values
 *
 * The failure or success within a `Validation` can be accessed via the `val`
 * property. The type of the `val` property can be narrowed by first querying
 * the variant.
 *
 * The `unwrap` method also unwraps a `Validation` by applying one of two
 * functions to the failure or success, depending on the variant.
 *
 * ## Comparing `Validation`
 *
 * `Validation` has the following behavior as an equivalence relation:
 *
 * -   A `Validation<E, A>` implements `Eq` when both `E` and `A` implement
 *     `Eq`.
 * -   Two `Validation` values are equal if they are the same variant and their
 *     failures or successes are equal.
 *
 * `Validation` has the following behavior as a total order:
 *
 * -   A `Validation<E, A>` implements `Ord` when both `E` and `A` implement
 *     `Ord`.
 * -   When ordered, an `Err` always compares as less than any `Ok`. If the
 *     variants are equal, their failures or successes are compared to determine
 *     the ordering.
 *
 * ## `Validation` as a semigroup
 *
 * `Validation` has the following behavior as a semigroup:
 *
 * -   A `Validation<E, A>` implements `Semigroup` when both `E` and `A`
 *     implement `Semigroup`.
 * -   When combined, any `Err` will ignore the combination and begin
 *     accumulating failures instead. If both variants are `Ok`, their successes
 *     will be combined and returned in an `Ok`.
 *
 * ## Transforming values
 *
 * These methods transform the failure or success within a `Validation`:
 *
 * -   `bimap` applies one of two functions to the failure or success, depending
 *     on the variant.
 * -   `lmap` applies a function to the failure, and leaves the success as is.
 * -   `map` applies a function to the success, and leaves the failure as is.
 *
 * These methods combine the successes of two `Ok` variants, or begin
 * accumulating failures on any `Err`:
 *
 * -   `zipWith` applies a function to the successes.
 * -   `zipFst` keeps only the first success, and discards the second.
 * -   `zipSnd` keeps only the second success, and discards the first.
 *
 * ## Collecting into `Validation`
 *
 * Sometimes, a collection of `Validation` values must be turned "inside out"
 * into a `Validation` that succeeds with an equivalent collection of successes.
 *
 * These functions traverse a collection of `Validation` values to extract the
 * successes. If any `Validation` in the collection fails, the traversal halts
 * and failures begin accumulating instead.
 *
 * -   `collect` turns an array or a tuple literal of `Validation` values inside
 *     out.
 * -   `gather` turns a record or an object literal of `Validation` values
 *     inside out.
 *
 * ## Lifting functions to work with `Validation`
 *
 * The `lift` function receives a function that accepts arbitrary arguments, and
 * returns an adapted function that accepts `Validation` values as arguments
 * instead. The arguments are evaluated from left to right, and if they all
 * succeed, the original function is applied to their successes to succeed with
 * the result. If any `Validation` fails, failures will begin accumulating
 * instead.
 *
 * @example Validating a single property
 *
 * First, our imports:
 *
 * ```ts
 * import { Semigroup } from "@neotype/prelude/cmb.js";
 * import { Validation } from "@neotype/prelude/validation.js";
 * ```
 *
 * Let's also define a helper semigroup type:
 *
 * ```ts
 * // A semigroup that wraps arrays
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
 * Now, consider a program that performs a trivial email validation:
 *
 * ```ts
 * function requireNonEmpty(input: string): Validation<List<string>, string> {
 *     return input.length > 0
 *         ? Validation.ok(input)
 *         : Validation.err(new List("empty input"));
 * }
 *
 * function requireAtSign(input: string): Validation<List<string>, string> {
 *     return input.includes("@")
 *         ? Validation.ok(input)
 *         : Validation.err(new List("missing @"));
 * }
 *
 * function requirePeriod(input: string): Validation<List<string>, string> {
 *     return input.includes(".")
 *         ? Validation.ok(input)
 *         : Validation.err(new List("missing period"));
 * }
 *
 * function validateEmail(input: string): Validation<List<string>, string> {
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
 * @example Validating multiple properties
 *
 * First, our imports:
 *
 * ```ts
 * import { Semigroup } from "@neotype/prelude/cmb.js";
 * import { Validation } from "@neotype/prelude/validation.js";
 * ```
 *
 * Let's also define a helper semigroup type:
 *
 * ```ts
 * // A semigroup that wraps arrays
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
 * Now, consider a program that validates a `Person` object with a `name` and an
 * `age`:
 *
 * ```ts
 * interface Person {
 *     name: string;
 *     age: number;
 * }
 *
 * function validateName(input: string): Validation<List<string>, string> {
 *     return input.length
 *         ? Validation.ok(input)
 *         : Validation.err(new List("empty name"));
 * }
 *
 * function validateAge(input: number): Validation<List<string>, number> {
 *     return input >= 0 && input <= 100
 *         ? Validation.ok(input)
 *         : Validation.err(new List("age not in range"));
 * }
 *
 * function validatePerson(
 *     rawName: string,
 *     rawAge: number,
 * ): Validation<List<string>, Person> {
 *     return Validation.gather({
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
 * @example Validating arbitrary properties
 *
 * First, our imports:
 *
 * ```ts
 * import { Semigroup } from "@neotype/prelude/cmb.js";
 * import { Validation } from "@neotype/prelude/validation.js";
 * ```
 *
 * Let's also define a helper semigroup type:
 *
 * ```ts
 * // A semigroup that wraps arrays
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
 * Now, consider a program that validates an arbitrary-length array of strings:
 *
 * ```ts
 * function requireLowercase(input: string): Validation<List<string>, string> {
 *     return input === input.toLowerCase()
 *         ? Validation.ok(input)
 *         : Validation.err(new List(input));
 * }
 *
 * function requireLowercaseElems(
 *     inputs: string[]
 * ): Validation<List<string>, string[]> {
 *     return Validation.collect(inputs.map(requireLowercase));
 * }
 *
 * [
 *     ["New York", "Oregon"],
 *     ["foo", "Bar", "baz"],
 *     ["banana", "apple", "orange"],
 * ].forEach((inputs) => {
 *     const result = JSON.stringify(
 *         requireLowercaseElems(inputs).unwrap(
 *             (invalidInputs) => ({ invalid: invalidInputs }),
 *             (validInputs) => ({ valid: validInputs }),
 *         ),
 *     );
 *     console.log(`inputs ${JSON.stringify(inputs)}: ${result}`);
 * });
 *
 * // inputs ["New York","Oregon"]: {"invalid":["New York","Oregon"]}
 * // inputs ["Code","of","Conduct"]: {"invalid":["Code","Conduct"]}
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
 * A type that represents either accumulating failure (`Err`) or success (`Ok`).
 */
export type Validation<E, A> = Validation.Err<E> | Validation.Ok<A>;

/**
 * The companion namespace for the `Validation` type.
 */
export namespace Validation {
    /**
     * An enumeration that discriminates `Validation`.
     */
    export enum Typ {
        Err,
        Ok,
    }

    /**
     * Construct a failed `Validation` from a value.
     */
    export function err<E, A = never>(x: E): Validation<E, A> {
        return new Err(x);
    }

    /**
     * Construct a successful `Validation` from a value.
     */
    export function ok<A, E = never>(x: A): Validation<E, A> {
        return new Ok(x);
    }

    /**
     * Construct a `Validation` from an `Either`.
     *
     * @remarks
     *
     * `Left` and `Right` variants of `Either` will become `Err` and `Ok`
     * variants of `Validated`, respectively.
     */
    export function fromEither<E, A>(either: Either<E, A>): Validation<E, A> {
        return either.unwrap(err, ok);
    }

    /**
     * Evaluate the `Validation` values in an array or a tuple literal from left
     * to right. If they all succeed, collect the successes in an array or a
     * tuple literal, respectively; otherwise, begin accumulating failures on
     * the first failed `Validation`.
     */
    export function collect<
        T extends readonly Validation<Semigroup<any>, any>[],
    >(vdns: T): Validation<ErrT<T[number]>, { [K in keyof T]: OkT<T[K]> }> {
        let acc = ok<any, any>(new Array(vdns.length));
        for (const [idx, vdn] of vdns.entries()) {
            acc = acc.zipWith(vdn, (results, x) => {
                results[idx] = x;
                return results;
            });
        }
        return acc;
    }

    /**
     * Evaluate the `Validation` values in a record or an object literal. If
     * they all succeed, collect the successes in a record or an object literal,
     * respectively; otherwise, begin accumulating failures on the first failed
     * `Validation`.
     */
    export function gather<
        T extends Record<string, Validation<Semigroup<any>, any>>,
    >(vdns: T): Validation<ErrT<T[keyof T]>, { [K in keyof T]: OkT<T[K]> }> {
        let acc = ok<any, any>({});
        for (const [key, vdn] of Object.entries(vdns)) {
            acc = acc.zipWith(vdn, (results, x) => {
                results[key] = x;
                return results;
            });
        }
        return acc;
    }

    /**
     * Lift a function of any arity into the context of `Validation`.
     */
    export function lift<T extends readonly unknown[], A>(
        f: (...args: T) => A,
    ): <E extends Semigroup<E>>(
        ...vdns: { [K in keyof T]: Validation<E, T[K]> }
    ) => Validation<E, A> {
        return (...vdns) =>
            collect(vdns).map((args) => f(...(args as T))) as Validation<
                any,
                A
            >;
    }

    /**
     * The fluent syntax for `Validation`.
     */
    export abstract class Syntax {
        [Eq.eq]<E extends Eq<E>, A extends Eq<A>>(
            this: Validation<E, A>,
            that: Validation<E, A>,
        ): boolean {
            if (this.isErr()) {
                return that.isErr() && eq(this.val, that.val);
            }
            return that.isOk() && eq(this.val, that.val);
        }

        [Ord.cmp]<E extends Ord<E>, A extends Ord<A>>(
            this: Validation<E, A>,
            that: Validation<E, A>,
        ): Ordering {
            if (this.isErr()) {
                return that.isErr() ? cmp(this.val, that.val) : Ordering.less;
            }
            return that.isOk() ? cmp(this.val, that.val) : Ordering.greater;
        }

        [Semigroup.cmb]<E extends Semigroup<E>, A extends Semigroup<A>>(
            this: Validation<E, A>,
            that: Validation<E, A>,
        ): Validation<E, A> {
            return this.zipWith(that, cmb);
        }

        /**
         * Test whether this `Validation` has failed.
         */
        isErr<E>(this: Validation<E, any>): this is Err<E> {
            return this.typ === Typ.Err;
        }

        /**
         * Test whether this `Validation` has succeeded.
         */
        isOk<A>(this: Validation<any, A>): this is Ok<A> {
            return this.typ === Typ.Ok;
        }

        /**
         * Case analysis for `Validation`.
         */
        unwrap<E, A, B, B1>(
            this: Validation<E, A>,
            onErr: (x: E) => B,
            onOk: (x: A) => B1,
        ): B | B1 {
            return this.isErr() ? onErr(this.val) : onOk(this.val);
        }

        /**
         * If this and that `Validation` both succeed, apply a function to their
         * successes and succeed with the result; otherwise, begin accumulating
         * failures on the first failed `Validation`.
         */
        zipWith<E extends Semigroup<E>, A, B, C>(
            this: Validation<E, A>,
            that: Validation<E, B>,
            f: (x: A, y: B) => C,
        ): Validation<E, C> {
            if (this.isErr()) {
                return that.isErr() ? err(cmb(this.val, that.val)) : this;
            }
            return that.isErr() ? that : ok(f(this.val, that.val));
        }

        /**
         * If this and that `Validation` both succeed, keep only the first
         * success and discard the second; otherwise, begin accumulating
         * failures on the first failed `Validation`.
         */
        zipFst<E extends Semigroup<E>, A>(
            this: Validation<E, A>,
            that: Validation<E, any>,
        ): Validation<E, A> {
            return this.zipWith(that, id);
        }

        /**
         * If this and that `Validation` both succeed, keep only the second
         * success and discard the first; otherwise, begin accumulating failures
         * on the first failed `Validation`.
         */
        zipSnd<E extends Semigroup<E>, B>(
            this: Validation<E, any>,
            that: Validation<E, B>,
        ): Validation<E, B> {
            return this.zipWith(that, (_, y) => y);
        }

        /**
         * If this `Validation` fails, apply a function to its failure and fail
         * with the result; otherwise, apply a function to its success and
         * succeed with the result.
         */
        bimap<E, A, E1, B>(
            this: Validation<E, A>,
            lmap: (x: E) => E1,
            rmap: (x: A) => B,
        ): Validation<E1, B> {
            return this.isErr() ? err(lmap(this.val)) : ok(rmap(this.val));
        }

        /**
         * If this `Validation` fails, apply a function to its failure and fail
         * with the result; otherwise, return this `Validation` as is.
         */
        lmap<E, A, E1>(
            this: Validation<E, A>,
            f: (x: E) => E1,
        ): Validation<E1, A> {
            return this.isErr() ? err(f(this.val)) : this;
        }

        /**
         * If this `Validation` succeeds, apply a function to its success and
         * succeed with the result; otherwise, return this `Validation` as is.
         */
        map<E, A, B>(this: Validation<E, A>, f: (x: A) => B): Validation<E, B> {
            return this.isErr() ? this : ok(f(this.val));
        }
    }

    /**
     * A failed `Validation`.
     */
    export class Err<out E> extends Syntax {
        /**
         * The property that discriminates `Validation`.
         */
        readonly typ = Typ.Err;

        readonly val: E;

        constructor(val: E) {
            super();
            this.val = val;
        }
    }

    /**
     * A successful `Validation`.
     */
    export class Ok<out A> extends Syntax {
        /**
         * The property that discriminates `Validation`.
         */
        readonly typ = Typ.Ok;

        readonly val: A;

        constructor(val: A) {
            super();
            this.val = val;
        }
    }

    /**
     * Extract the failure type `E` from a `Validation<E, A>`.
     */
    // prettier-ignore
    export type ErrT<T extends Validation<any, any>> =
        [T] extends [Validation<infer E, any>] ? E : never;

    /**
     * Extract the success type `A` from a `Validation<E, A>`.
     */
    // prettier-ignore
    export type OkT<T extends Validation<any, any>> =
        [T] extends [Validation<any, infer A>] ? A : never;
}
