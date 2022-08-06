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
 * Disjoint sums and typed failures.
 *
 * @module
 */

import { cmb, Semigroup } from "./cmb.js";
import { cmp, Eq, eq, greater, less, Ord, type Ordering } from "./cmp.js";
import { id } from "./fn.js";
import { type Validated } from "./validated.js";

/**
 * A type that represents an "exclusive or" relationship between two values
 * ({@link Either.Left Left} and {@link Either.Right Right}).
 */
export type Either<A, B> = Either.Left<A> | Either.Right<B>;

export namespace Either {
    /**
     * A unique symbol used in Either generator comprehensions.
     *
     * @hidden
     */
    export const yieldTkn = Symbol();

    /**
     * A unique symbol used in Either generator comprehensions.
     *
     * @hidden
     */
    export type YieldTkn = typeof yieldTkn;

    /**
     * The fluent syntax for Either.
     */
    export abstract class Syntax {
        /**
         * Test whether this and that Either are equal using Eq comparison.
         */
        [Eq.eq]<A extends Eq<A>, B extends Eq<B>>(
            this: Either<A, B>,
            that: Either<A, B>,
        ): boolean {
            if (leftsided(this)) {
                return leftsided(that) && eq(this.val, that.val);
            }
            return rightsided(that) && eq(this.val, that.val);
        }

        /**
         * Compare this and that Either using Ord comparison.
         */
        [Ord.cmp]<A extends Ord<A>, B extends Ord<B>>(
            this: Either<A, B>,
            that: Either<A, B>,
        ): Ordering {
            if (leftsided(this)) {
                return leftsided(that) ? cmp(this.val, that.val) : less;
            }
            return rightsided(that) ? cmp(this.val, that.val) : greater;
        }

        /**
         * If this and that Either are both rightsided and their values are a
         * Semigroup, combine the values.
         */
        [Semigroup.cmb]<E, A extends Semigroup<A>>(
            this: Either<E, A>,
            that: Either<E, A>,
        ): Either<E, A> {
            return this.zipWith(that, cmb);
        }

        /**
         * Case analysis for Either.
         */
        fold<A, B, C, D>(
            this: Either<A, B>,
            foldL: (x: A, either: Left<A>) => C,
            foldR: (x: B, either: Right<B>) => D,
        ): C | D {
            return leftsided(this)
                ? foldL(this.val, this)
                : foldR(this.val, this);
        }

        /**
         * If this Either is leftsided, extract its value; otherwise, apply a
         * function to the right value.
         */
        leftOrFold<A, B, C>(
            this: Either<A, B>,
            f: (x: B, either: Right<B>) => C,
        ): A | C {
            return this.fold(id, f);
        }

        /**
         * If this Either is rightsided, extract its value; otherwise, apply a
         * function to the left value.
         */
        rightOrFold<A, B, C>(
            this: Either<A, B>,
            f: (x: A, either: Left<A>) => C,
        ): B | C {
            return this.fold(f, id);
        }

        /**
         * If this Either is leftsided, apply a function to its value to produce
         * a new Either.
         *
         * The equivalent of {@link flatMap} for leftsided values.
         */
        bindLeft<E, A, E1, B>(
            this: Either<E, A>,
            f: (x: E) => Either<E1, B>,
        ): Either<E1, A | B> {
            return leftsided(this) ? f(this.val) : this;
        }

        /**
         * If this Either is leftsided, return a fallback Either.
         */
        orElse<A, E1, B>(
            this: Either<any, A>,
            that: Either<E1, B>,
        ): Either<E1, A | B> {
            return this.bindLeft(() => that);
        }

        /**
         * If this Either is rightsided, apply a function to its value to
         * produce a new Either.
         */
        flatMap<E, A, E1, B>(
            this: Either<E, A>,
            f: (x: A) => Either<E1, B>,
        ): Either<E | E1, B> {
            return leftsided(this) ? this : f(this.val);
        }

        /**
         * If this Either's right value is an Either, flatten this Either.
         */
        flat<E, E1, A>(this: Either<E, Either<E1, A>>): Either<E | E1, A> {
            return this.flatMap(id);
        }

        /**
         * If this and that Either are rightsided, apply a function to their
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
         * If this and that Either are rightsided, keep only this Either's value.
         */
        zipFst<E, A, E1>(
            this: Either<E, A>,
            that: Either<E1, any>,
        ): Either<E | E1, A> {
            return this.zipWith(that, id);
        }

        /**
         * If this and that Either are rightsided, keep only that Either's value.
         */
        zipSnd<E, E1, B>(
            this: Either<E, any>,
            that: Either<E1, B>,
        ): Either<E | E1, B> {
            return this.flatMap(() => that);
        }

        /**
         * Apply one of two functions to this Either's value if this is
         * leftsided or rightsided, respectively.
         */
        bimap<A, B, C, D>(
            this: Either<A, B>,
            mapL: (x: A) => C,
            mapR: (x: B) => D,
        ): Either<C, D> {
            return leftsided(this)
                ? left(mapL(this.val))
                : right(mapR(this.val));
        }

        /**
         * If this Either is leftsided, apply a function to its value.
         */
        mapLeft<A, B, C>(this: Either<A, B>, f: (x: A) => C): Either<C, B> {
            return this.bindLeft((x) => left(f(x)));
        }

        /**
         * If this Either is rightsided, apply a function to its value.
         */
        map<A, B, D>(this: Either<A, B>, f: (x: B) => D): Either<A, D> {
            return this.flatMap((x) => right(f(x)));
        }

        /**
         * If this Either is rightsided, overwrite its value.
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
         * The property that discriminates Either.
         */
        readonly typ = "Left";

        /**
         * Construct an instance of `Either.Left`.
         *
         * Explicit use of this constructor should be avoided; use the
         * {@link left} function instead.
         */
        constructor(readonly val: A) {
            super();
        }

        /**
         * Defining iterable behavior for Either allows TypeScript to infer
         * rightsided types when yielding Eithers in generator comprehensions
         * using `yield*`.
         *
         * @hidden
         */
        *[Symbol.iterator](): Iterator<
            readonly [Either<A, never>, YieldTkn],
            never,
            unknown
        > {
            return (yield [this, yieldTkn]) as never;
        }
    }

    /**
     * A rightsided Either.
     */
    export class Right<out B> extends Syntax {
        /**
         * The property that discriminates Either.
         */
        readonly typ = "Right";

        /**
         * Construct an instance of `Either.Right`.
         *
         * Explicit use of this constructor should be avoided; use the
         * {@link right} function instead.
         */
        constructor(readonly val: B) {
            super();
        }

        /**
         * Defining iterable behavior for Either allows TypeScript to infer
         * rightsided types when yielding Eithers in generator comprehensions
         * using `yield*`.
         *
         * @hidden
         */
        *[Symbol.iterator](): Iterator<
            readonly [Either<never, B>, YieldTkn],
            B,
            unknown
        > {
            return (yield [this, yieldTkn]) as B;
        }
    }

    /**
     * Extract the leftsided type `A` from the type `Either<A, B>`.
     */
    // prettier-ignore
    export type LeftT<T extends Either<any, any>> = 
        [T] extends [Either<infer A, any>] ? A : never;

    /**
     * Extract the rightsided type `B` from the type `Either<A, B>`.
     */
    // prettier-ignore
    export type RightT<T extends Either<any, any>> = 
        [T] extends [Either<any, infer B>] ? B : never;

    /**
     * Given a tuple literal or an object literal of Either types, map over the
     * structure to produce a tuple literal or an object literal of the
     * rightsided types.
     *
     * ```ts
     * type T0 = [Either<1, 2>, Either<3, 4>, Either<5, 6>];
     * type T1 = Either.RightsT<T0>; // [2, 4, 6]
     *
     * type T2 = { x: Either<1, 2>, y: Either<3, 4>, z: Either<5, 6> };
     * type T3 = Either.RightsT<T2>; // { x: 2, y: 4, z: 6 }
     * ```
     */
    export type RightsT<
        T extends readonly Either<any, any>[] | Record<any, Either<any, any>>,
    > = { [K in keyof T]: [T[K]] extends [Either<any, infer B>] ? B : never };
}

/**
 * Construct a leftsided Either with an optional type witness for the
 * rightsided value.
 */
export function left<A, B = never>(x: A): Either<A, B> {
    return new Either.Left(x);
}

/**
 * Construct a rightsided Either with an optional type witness for the
 * leftsided value.
 */
export function right<B, A = never>(x: B): Either<A, B> {
    return new Either.Right(x);
}

/**
 * Apply a predicate function to a value. If the predicate returns true, return
 * a Right containing the value; otherwise, return a Left containing the value.
 */
export function guardEither<A, A1 extends A>(
    x: A,
    f: (x: A) => x is A1,
): Either<Exclude<A, A1>, A1>;

export function guardEither<A>(x: A, f: (x: A) => boolean): Either<A, A>;

export function guardEither<A>(x: A, f: (x: A) => boolean): Either<A, A> {
    return f(x) ? right(x) : left(x);
}

/**
 * Test whether an Either is leftsided.
 */
export function leftsided<A>(either: Either<A, any>): either is Either.Left<A> {
    return either.typ === "Left";
}

/**
 * Test whether an Either is rightsided.
 */
export function rightsided<B>(
    either: Either<any, B>,
): either is Either.Right<B> {
    return either.typ === "Right";
}

/**
 * Convert a Validated to an Either.
 */
export function viewEither<E, A>(validated: Validated<E, A>): Either<E, A> {
    return validated.fold(left, right);
}

/**
 * Construct an Either using a generator comprehension.
 */
export function doEither<
    T extends readonly [Either<any, any>, Either.YieldTkn],
    A,
>(f: () => Generator<T, A, any>): Either<Either.LeftT<T[0]>, A> {
    const nxs = f();
    let nx = nxs.next();
    while (!nx.done) {
        const x = nx.value[0];
        if (rightsided(x)) {
            nx = nxs.next(x.val);
        } else {
            return x;
        }
    }
    return right(nx.value);
}

/**
 * Reduce a finite iterable from left to right in the context of Either.
 */
export function reduceEither<A, B, E>(
    xs: Iterable<A>,
    f: (acc: B, x: A) => Either<E, B>,
    z: B,
): Either<E, B> {
    return doEither(function* () {
        let acc = z;
        for (const x of xs) {
            acc = yield* f(acc, x);
        }
        return acc;
    });
}

/**
 * Evaluate the Eithers in an array or a tuple literal from left to right and
 * collect the rightsided values in an array or a tuple literal, respectively.
 */
export function collectEither<T extends readonly Either<any, any>[]>(
    xs: T,
): Either<Either.LeftT<T[number]>, Readonly<Either.RightsT<T>>> {
    return doEither(function* () {
        const l = xs.length;
        const ys = new Array(l);
        for (let ix = 0; ix < l; ix++) {
            ys[ix] = yield* xs[ix];
        }
        return ys as unknown as Either.RightsT<T>;
    });
}

/**
 * Evaluate a series of Eithers from left to right and collect the rightsided
 * values in a tuple literal.
 */
export function tupledEither<
    T extends [Either<any, any>, Either<any, any>, ...Either<any, any>[]],
>(...xs: T): Either<Either.LeftT<T[number]>, Readonly<Either.RightsT<T>>> {
    return collectEither(xs);
}

/**
 * Evaluate the Eithers in an object literal and collect the rightsided values
 * in an object literal.
 */
export function gatherEither<T extends Record<any, Either<any, any>>>(
    xs: T,
): Either<
    Either.LeftT<T[keyof T]>,
    { readonly [K in keyof T]: Either.RightT<T[K]> }
> {
    return doEither(function* () {
        const ys: Record<any, unknown> = {};
        for (const [kx, x] of Object.entries(xs)) {
            ys[kx] = yield* x;
        }
        return ys as Either.RightsT<T>;
    });
}

/**
 * Construct a Promise that fulfills with an Either using an async generator
 * comprehension.
 */
export async function doEitherAsync<
    T extends readonly [Either<any, any>, Either.YieldTkn],
    A,
>(f: () => AsyncGenerator<T, A, any>): Promise<Either<Either.LeftT<T[0]>, A>> {
    const nxs = f();
    let nx = await nxs.next();
    while (!nx.done) {
        const x = nx.value[0];
        if (rightsided(x)) {
            nx = await nxs.next(x.val);
        } else {
            return x;
        }
    }
    return right(nx.value);
}
