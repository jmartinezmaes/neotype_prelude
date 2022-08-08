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

export namespace Validated {
    /**
     * Construct a disputed Validated.
     */
    export function dispute<E, A = never>(x: E): Validated<E, A> {
        return new Disputed(x);
    }

    /**
     * Construct an accepted Validated.
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
     * Evaluate the Validateds in an array or a tuple literal from left to right
     * and collect the accepted values in an array or a tuple literal,
     * respectively.
     */
    export function collect<E extends Semigroup<E>, A0, A1>(
        xs: readonly [Validated<E, A0>, Validated<E, A1>],
    ): Validated<E, readonly [A0, A1]>;

    export function collect<E extends Semigroup<E>, A0, A1, A2>(
        xs: readonly [Validated<E, A0>, Validated<E, A1>, Validated<E, A2>],
    ): Validated<E, readonly [A0, A1, A2]>;

    export function collect<E extends Semigroup<E>, A0, A1, A2, A3>(
        xs: readonly [
            Validated<E, A0>,
            Validated<E, A1>,
            Validated<E, A2>,
            Validated<E, A3>,
        ],
    ): Validated<E, readonly [A0, A1, A2, A3]>;

    export function collect<E extends Semigroup<E>, A0, A1, A2, A3, A4>(
        xs: readonly [
            Validated<E, A0>,
            Validated<E, A1>,
            Validated<E, A2>,
            Validated<E, A3>,
            Validated<E, A4>,
        ],
    ): Validated<E, readonly [A0, A1, A2, A3, A4]>;

    // prettier-ignore
    export function collect<E extends Semigroup<E>, A0, A1, A2, A3, A4, A5>(
        xs: readonly [
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
        xs: readonly [
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
        xs: readonly [
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
        xs: readonly [
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
        xs: readonly [
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
        xs: readonly Validated<E, A>[],
    ): Validated<E, readonly A[]>;

    export function collect<E extends Semigroup<E>, A>(
        xs: readonly Validated<E, A>[],
    ): Validated<E, readonly A[]> {
        return xs.reduce(
            (acc, v, iv) =>
                acc.zipWith(v, (ys, x) => {
                    ys[iv] = x;
                    return ys;
                }),
            accept<A[], E>(new Array(xs.length)),
        );
    }

    /**
     * Evaluate a series of Validateds from left to right and collect the
     * accepted values in a tuple literal.
     */
    export function tupled<E extends Semigroup<E>, A0, A1>(
        ...xs: [Validated<E, A0>, Validated<E, A1>]
    ): Validated<E, readonly [A0, A1]>;

    export function tupled<E extends Semigroup<E>, A0, A1, A2>(
        ...xs: [Validated<E, A0>, Validated<E, A1>, Validated<E, A2>]
    ): Validated<E, readonly [A0, A1, A2]>;

    export function tupled<E extends Semigroup<E>, A0, A1, A2, A3>(
        ...xs: [
            Validated<E, A0>,
            Validated<E, A1>,
            Validated<E, A2>,
            Validated<E, A3>,
        ]
    ): Validated<E, readonly [A0, A1, A2, A3]>;

    export function tupled<E extends Semigroup<E>, A0, A1, A2, A3, A4>(
        ...xs: [
            Validated<E, A0>,
            Validated<E, A1>,
            Validated<E, A2>,
            Validated<E, A3>,
            Validated<E, A4>,
        ]
    ): Validated<E, readonly [A0, A1, A2, A3, A4]>;

    export function tupled<E extends Semigroup<E>, A0, A1, A2, A3, A4, A5>(
        ...xs: [
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
        ...xs: [
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
        ...xs: [
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
        ...xs: [
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
        ...xs: [
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
        ...xs: Validated<E, A>[]
    ): Validated<E, readonly A[]> {
        return collect(xs);
    }

    /**
     * The fluent syntax for Validated.
     */
    export abstract class Syntax {
        /**
         * Test whether this and that Validated are equal using Eq comparison.
         */
        [Eq.eq]<E extends Eq<E>, A extends Eq<A>>(
            this: Validated<E, A>,
            that: Validated<E, A>,
        ): boolean {
            if (this.isDisputed()) {
                return that.isDisputed() && eq(this.val, that.val);
            }
            return that.isAccepted() && eq(this.val, that.val);
        }

        /**
         * Compare this and that Validated using Ord comparison.
         */
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

        /**
         * If this and that Validated are both accepted and their values are a
         * Semigroup, combine the values.
         */
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
            return this.typ === "Disputed";
        }

        /**
         * Test whether this Validated is `Accepted`.
         */
        isAccepted<A>(this: Validated<any, A>): this is Accepted<A> {
            return this.typ === "Accepted";
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
         * If this Validated is disputed, extract its value; otherwise, apply a
         * function to the accepted value.
         */
        disputedOrFold<E, A, B>(
            this: Validated<E, A>,
            f: (x: A, validated: Accepted<A>) => B,
        ): E | B {
            return this.fold(id, f);
        }

        /**
         * If this Validated is accepted, extract its value; otherwise, apply a
         * function to the disputed value.
         */
        acceptedOrFold<E, A, B>(
            this: Validated<E, A>,
            f: (x: E, validated: Disputed<E>) => B,
        ): A | B {
            return this.fold(f, id);
        }

        /**
         * If this Validated is accepted, apply a function to its value to
         * produce a new Validated.
         */
        bindAccepted<E, A, E1, B>(
            this: Validated<E, A>,
            f: (x: A) => Validated<E1, B>,
        ): Validated<E | E1, B> {
            return this.isDisputed() ? this : f(this.val);
        }

        /**
         * If this and that Validated are accepted, apply a function to their
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
         * If this and that Validated are accepted, keep only this Validated's
         * value.
         */
        zipFst<E extends Semigroup<E>, A>(
            this: Validated<E, A>,
            that: Validated<E, any>,
        ): Validated<E, A> {
            return this.zipWith(that, id);
        }

        /**
         * If this and that Validated are accepted, keep only that Validated's
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
         * disputed or accepted, respectively.
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
         * If this Validated is disputed, apply a function to its value.
         */
        mapDisputed<E, A, E1>(
            this: Validated<E, A>,
            f: (x: E) => E1,
        ): Validated<E1, A> {
            return this.isDisputed() ? dispute(f(this.val)) : this;
        }

        /**
         * If this Validated is accepted, apply a function to its value.
         */
        map<E, A, B>(this: Validated<E, A>, f: (x: A) => B): Validated<E, B> {
            return this.isDisputed() ? this : accept(f(this.val));
        }

        /**
         * If this Validated is accepted, overwrite its value.
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
         * The property that discriminates Validated.
         */
        readonly typ = "Disputed";

        /**
         * This Validated's value.
         */
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
         * The property that discriminates Validated.
         */
        readonly typ = "Accepted";

        /**
         * This Validated's value.
         */
        readonly val: A;

        constructor(val: A) {
            super();
            this.val = val;
        }
    }
}
