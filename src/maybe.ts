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

export namespace Maybe {
    /**
     * An enumeration used to discriminate Maybe.
     */
    export enum Typ {
        Nothing = 0,
        Just = 1,
    }

    /**
     * A unique symbol used in Maybe generator comprehensions.
     *
     * @hidden
     */
    export const yieldTkn = Symbol();

    /**
     * A unique symbol used in Maybe generator comprehensions.
     *
     * @hidden
     */
    export type YieldTkn = typeof yieldTkn;

    /**
     * Construct a present Maybe.
     */
    export function just<A>(x: A): Maybe<A> {
        return new Just(x);
    }

    /**
     * Consruct a Maybe, converting null and undefined to nothing.
     */
    export function fromMissing<A>(x: A | null | undefined): Maybe<A> {
        return x === null || x === undefined ? nothing : just(x);
    }

    /**
     * Apply a predicate function to a value. If the predicate returns true,
     * return a Just containing the value; otherwise return nothing.
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
        f: () => Generator<readonly [Maybe<any>, YieldTkn], A, any>,
    ): Maybe<A> {
        const nxs = f();
        let nx = nxs.next();
        while (!nx.done) {
            const x = nx.value[0];
            if (x.isJust()) {
                nx = nxs.next(x.val);
            } else {
                return x;
            }
        }
        return just(nx.value);
    }

    /**
     * Reduce a finite iterable from left to right in the context of Maybe.
     */
    export function reduce<A, B>(
        xs: Iterable<A>,
        f: (acc: B, x: A) => Maybe<B>,
        z: B,
    ): Maybe<B> {
        return go(function* () {
            let acc = z;
            for (const x of xs) {
                acc = yield* f(acc, x);
            }
            return acc;
        });
    }

    /**
     * Evaluate the Maybes in an array or a tuple literal from left to right and
     * collect the present values in an array or a tuple literal, respectively.
     */
    export function collect<T extends readonly Maybe<any>[]>(
        xs: T,
    ): Maybe<Readonly<JustsT<T>>> {
        return go(function* () {
            const l = xs.length;
            const ys = new Array(l);
            for (let ix = 0; ix < l; ix++) {
                ys[ix] = yield* xs[ix];
            }
            return ys as unknown as JustsT<T>;
        });
    }

    /**
     * Evaluate a series of Maybes from left to right and collect the present
     * values in a tuple literal.
     */
    export function tupled<T extends [Maybe<any>, Maybe<any>, ...Maybe<any>[]]>(
        ...xs: T
    ): Maybe<Readonly<JustsT<T>>> {
        return collect(xs);
    }

    /**
     * Evaluate the Maybes in an object literal and collect the present values
     * in an object literal.
     */
    export function gather<T extends Record<any, Maybe<any>>>(
        xs: T,
    ): Maybe<{ readonly [K in keyof T]: JustT<T[K]> }> {
        return go(function* () {
            const ys: Record<any, unknown> = {};
            for (const [kx, x] of Object.entries(xs)) {
                ys[kx] = yield* x;
            }
            return ys as JustsT<T>;
        });
    }

    /**
     * Construct a Promise that fulfills with a Maybe using an async generator
     * comprehension.
     */
    export async function goAsync<A>(
        f: () => AsyncGenerator<readonly [Maybe<any>, YieldTkn], A, any>,
    ): Promise<Maybe<A>> {
        const nxs = f();
        let nx = await nxs.next();
        while (!nx.done) {
            const x = nx.value[0];
            if (x.isJust()) {
                nx = await nxs.next(x.val);
            } else {
                return x;
            }
        }
        return just(nx.value);
    }

    /**
     * The fluent syntax for Maybe.
     */
    export abstract class Syntax {
        /**
         * Test whether this and that Maybe are equal using Eq comparison.
         */
        [Eq.eq]<A extends Eq<A>>(this: Maybe<A>, that: Maybe<A>): boolean {
            if (this.isNothing()) {
                return that.isNothing();
            }
            return that.isJust() && eq(this.val, that.val);
        }

        /**
         * Compare this and that Maybe using Ord comparison.
         */
        [Ord.cmp]<A extends Ord<A>>(this: Maybe<A>, that: Maybe<A>): Ordering {
            if (this.isNothing()) {
                return that.isNothing() ? Ordering.equal : Ordering.less;
            }
            return that.isNothing()
                ? Ordering.greater
                : cmp(this.val, that.val);
        }

        /**
         * If this or that Maybe is absent, return the first non-absent Maybe.
         * If this and that are both present and their values are a Semigroup,
         * combine the values.
         */
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
         * Test whether this Maybe is a `Just`.
         */
        isJust<A>(this: Maybe<A>): this is Just<A> {
            return this.typ === Typ.Just;
        }

        /**
         * Case analysis for Maybe.
         */
        fold<A, B, C>(
            this: Maybe<A>,
            foldL: () => B,
            foldR: (x: A, maybe: Just<A>) => C,
        ): B | C {
            return this.isNothing() ? foldL() : foldR(this.val, this);
        }

        /**
         * If this Maybe is present, extract its value; otherwise, produce a
         * fallback value.
         */
        getOrFold<A, B>(this: Maybe<A>, f: () => B): A | B {
            return this.fold(f, id);
        }

        /**
         * If this Maybe is present, extract its value; otherwise, return a
         * fallback value.
         */
        getOrElse<A, B>(this: Maybe<A>, fallback: B): A | B {
            return this.fold(() => fallback, id);
        }

        /**
         * If this Maybe is absent, return a fallback Maybe.
         */
        orElse<A, B>(this: Maybe<A>, that: Maybe<B>): Maybe<A | B> {
            return this.isNothing() ? that : this;
        }

        /**
         * If this Maybe is present, apply a function to its value to produce a
         * new Maybe.
         */
        flatMap<A, B>(this: Maybe<A>, f: (x: A) => Maybe<B>): Maybe<B> {
            return this.isNothing() ? this : f(this.val);
        }

        /**
         * If this Maybe contains another Maybe, flatten this Maybe.
         */
        flat<A>(this: Maybe<Maybe<A>>): Maybe<A> {
            return this.flatMap(id);
        }

        /**
         * If this and that Maybe are present, apply a function to thier values.
         */
        zipWith<A, B, C>(
            this: Maybe<A>,
            that: Maybe<B>,
            f: (x: A, y: B) => C,
        ): Maybe<C> {
            return this.flatMap((x) => that.map((y) => f(x, y)));
        }

        /**
         * If this and that Maybe are present, keep only this Maybe's value.
         */
        zipFst<A>(this: Maybe<A>, that: Maybe<any>): Maybe<A> {
            return this.zipWith(that, id);
        }

        /**
         * If this and that Maybe are present, keep only that Maybe's value.
         */
        zipSnd<B>(this: Maybe<any>, that: Maybe<B>): Maybe<B> {
            return this.flatMap(() => that);
        }

        /**
         * If this Maybe is present, apply a function to its value.
         */
        map<A, B>(this: Maybe<A>, f: (x: A) => B): Maybe<B> {
            return this.flatMap((x) => just(f(x)));
        }

        /**
         * If this Maybe is present, overwrite its value.
         */
        mapTo<B>(this: Maybe<any>, value: B): Maybe<B> {
            return this.flatMap(() => just(value));
        }
    }

    /**
     * An absent Maybe.
     */
    export class Nothing extends Syntax {
        /**
         * The property that discriminates Maybe.
         */
        readonly typ = Typ.Nothing;

        /**
         * The singleton instance of the absent Maybe.
         */
        static readonly singleton = new Nothing();

        private constructor() {
            super();
        }

        /**
         * Defining iterable behavior for Maybe allows TypeScript to infer
         * present types when yielding Maybes in generator comprehensions using
         * `yield*`.
         *
         * @hidden
         */
        *[Symbol.iterator](): Iterator<
            readonly [Maybe<never>, YieldTkn],
            never,
            unknown
        > {
            return (yield [this, yieldTkn]) as never;
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

        /**
         * This Maybe's value.
         */
        readonly val: A;

        constructor(val: A) {
            super();
            this.val = val;
        }

        /**
         * Defining iterable behavior for Maybe allows TypeScript to infer
         * present types when yielding Maybes in generator comprehensions using
         * `yield*`.
         *
         * @hidden
         */
        *[Symbol.iterator](): Iterator<
            readonly [Maybe<A>, YieldTkn],
            A,
            unknown
        > {
            return (yield [this, yieldTkn]) as A;
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

    /**
     * Given a tuple literal or an object literal of Maybe types, map over the
     * structure to produce a tuple literal or an object literal of the present
     * types.
     *
     * ```ts
     * type T0 = [Maybe<1>, Maybe<2>, Maybe<3>];
     * type T1 = JustsT<T0>; // readonly [1, 2, 3]
     *
     * type T2 = { x: Maybe<1>, y: Maybe<2>, z: Maybe<3> };
     * type T3 = JustsT<T2>; // { x: 1, y: 2, z: 3 }
     * ```
     */
    export type JustsT<
        T extends readonly Maybe<any>[] | Record<any, Maybe<any>>,
    > = { [K in keyof T]: T[K] extends Maybe<infer A> ? A : never };
}
