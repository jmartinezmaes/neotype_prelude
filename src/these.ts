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
 * Dual functionality of Either and Validated.
 *
 * @module
 */

import { cmb, Semigroup } from "./cmb.js";
import { cmp, Eq, eq, Ord, Ordering } from "./cmp.js";
import { id } from "./fn.js";

/**
 * A type that represents one or both of two values (`First`, `Second`, or
 * `Both`).
 */
export type These<A, B> = These.First<A> | These.Second<B> | These.Both<A, B>;

export namespace These {
    /**
     * A unique symbol used in These generator comprehensions.
     *
     * @hidden
     */
    export const yieldTkn = Symbol();

    /**
     * A unique symbol used in These generator comprehensions.
     *
     * @hidden
     */
    export type YieldTkn = typeof yieldTkn;

    /**
     * Construct a These with only a first value, with an optional type witness
     * for the second value.
     */
    export function first<A, B = never>(x: A): These<A, B> {
        return new First(x);
    }

    /**
     * Construct a These with only a second value, with an optional type witness
     * for the first value.
     */
    export function second<B, A = never>(x: B): These<A, B> {
        return new Second(x);
    }

    /**
     * Construct a These with a first and second value.
     */
    export function both<A, B>(x: A, y: B): These<A, B> {
        return new Both(x, y);
    }

    /**
     * Construct a These using a generator comprehension.
     */
    export function go<E extends Semigroup<E>, A>(
        f: () => Generator<readonly [These<E, any>, These.YieldTkn], A, any>,
    ): These<E, A> {
        const nxs = f();
        let nx = nxs.next();
        let e: E | undefined;

        while (!nx.done) {
            const t = nx.value[0];
            if (t.isSecond()) {
                nx = nxs.next(t.val);
            } else if (t.isBoth()) {
                e = e !== undefined ? cmb(e, t.fst) : t.fst;
                nx = nxs.next(t.snd);
            } else {
                return e !== undefined ? first(cmb(e, t.val)) : t;
            }
        }
        return e !== undefined ? both(e, nx.value) : second(nx.value);
    }

    /**
     * Reduce a finite iterable from left to right in the context of These.
     */
    export function reduce<A, B, E extends Semigroup<E>>(
        xs: Iterable<A>,
        f: (acc: B, x: A) => These<E, B>,
        z: B,
    ): These<E, B> {
        return go(function* () {
            let acc = z;
            for (const x of xs) {
                acc = yield* f(acc, x);
            }
            return acc;
        });
    }

    /**
     * Evaluate the These in an array or a tuple literal from left to right and
     * collect the second values in an array or a tuple literal, respectively.
     */
    export function collect<E extends Semigroup<E>, A0, A1>(
        xs: readonly [These<E, A0>, These<E, A1>],
    ): These<E, readonly [A0, A1]>;

    export function collect<E extends Semigroup<E>, A0, A1, A2>(
        xs: readonly [These<E, A0>, These<E, A1>, These<E, A2>],
    ): These<E, readonly [A0, A1, A2]>;

    export function collect<E extends Semigroup<E>, A0, A1, A2, A3>(
        xs: readonly [These<E, A0>, These<E, A1>, These<E, A2>, These<E, A3>],
    ): These<E, readonly [A0, A1, A2, A3]>;

    export function collect<E extends Semigroup<E>, A0, A1, A2, A3, A4>(
        xs: readonly [
            These<E, A0>,
            These<E, A1>,
            These<E, A2>,
            These<E, A3>,
            These<E, A4>,
        ],
    ): These<E, readonly [A0, A1, A2, A3, A4]>;

    export function collect<E extends Semigroup<E>, A0, A1, A2, A3, A4, A5>(
        xs: readonly [
            These<E, A0>,
            These<E, A1>,
            These<E, A2>,
            These<E, A3>,
            These<E, A4>,
            These<E, A5>,
        ],
    ): These<E, readonly [A0, A1, A2, A3, A4, A5]>;

    export function collect<E extends Semigroup<E>, A0, A1, A2, A3, A4, A5, A6>(
        xs: readonly [
            These<E, A0>,
            These<E, A1>,
            These<E, A2>,
            These<E, A3>,
            These<E, A4>,
            These<E, A5>,
            These<E, A6>,
        ],
    ): These<E, readonly [A0, A1, A2, A3, A4, A5, A6]>;

    // prettier-ignore
    export function collect<E extends Semigroup<E>, A0, A1, A2, A3, A4, A5, A6, A7>(
        xs: readonly [
            These<E, A0>,
            These<E, A1>,
            These<E, A2>,
            These<E, A3>,
            These<E, A4>,
            These<E, A5>,
            These<E, A6>,
            These<E, A7>,
        ],
    ): These<E, readonly [A0, A1, A2, A3, A4, A5, A6, A7]>;

    // prettier-ignore
    export function collect<E extends Semigroup<E>, A0, A1, A2, A3, A4, A5, A6, A7, A8>(
        xs: readonly [
            These<E, A0>,
            These<E, A1>,
            These<E, A2>,
            These<E, A3>,
            These<E, A4>,
            These<E, A5>,
            These<E, A6>,
            These<E, A7>,
            These<E, A8>,
        ],
    ): These<E, readonly [A0, A1, A2, A3, A4, A5, A6, A7, A8]>;

    // prettier-ignore
    export function collect<E extends Semigroup<E>, A0, A1, A2, A3, A4, A5, A6, A7, A8, A9>(
        xs: readonly [
            These<E, A0>,
            These<E, A1>,
            These<E, A2>,
            These<E, A3>,
            These<E, A4>,
            These<E, A5>,
            These<E, A6>,
            These<E, A7>,
            These<E, A8>,
            These<E, A9>,
        ],
    ): These<E, readonly [A0, A1, A2, A3, A4, A5, A6, A7, A8, A9]>;

    export function collect<E extends Semigroup<E>, A>(
        xs: readonly These<E, A>[],
    ): These<E, readonly A[]>;

    export function collect<E extends Semigroup<E>, A>(
        xs: readonly These<E, A>[],
    ): These<E, readonly A[]> {
        return go(function* () {
            const l = xs.length;
            const ys: A[] = new Array(l);
            for (let ix = 0; ix < l; ix++) {
                ys[ix] = yield* xs[ix];
            }
            return ys;
        });
    }

    /**
     * Evaluate a series of These from left to right and collect the second
     * values in a tuple literal.
     */
    export function tupled<E extends Semigroup<E>, A0, A1>(
        ...xs: [These<E, A0>, These<E, A1>]
    ): These<E, readonly [A0, A1]>;

    export function tupled<E extends Semigroup<E>, A0, A1, A2>(
        ...xs: [These<E, A0>, These<E, A1>, These<E, A2>]
    ): These<E, readonly [A0, A1, A2]>;

    export function tupled<E extends Semigroup<E>, A0, A1, A2, A3>(
        ...xs: [These<E, A0>, These<E, A1>, These<E, A2>, These<E, A3>]
    ): These<E, readonly [A0, A1, A2, A3]>;

    export function tupled<E extends Semigroup<E>, A0, A1, A2, A3, A4>(
        ...xs: [
            These<E, A0>,
            These<E, A1>,
            These<E, A2>,
            These<E, A3>,
            These<E, A4>,
        ]
    ): These<E, readonly [A0, A1, A2, A3, A4]>;

    export function tupled<E extends Semigroup<E>, A0, A1, A2, A3, A4, A5>(
        ...xs: [
            These<E, A0>,
            These<E, A1>,
            These<E, A2>,
            These<E, A3>,
            These<E, A4>,
            These<E, A5>,
        ]
    ): These<E, readonly [A0, A1, A2, A3, A4, A5]>;

    export function tupled<E extends Semigroup<E>, A0, A1, A2, A3, A4, A5, A6>(
        ...xs: [
            These<E, A0>,
            These<E, A1>,
            These<E, A2>,
            These<E, A3>,
            These<E, A4>,
            These<E, A5>,
            These<E, A6>,
        ]
    ): These<E, readonly [A0, A1, A2, A3, A4, A5, A6]>;

    // prettier-ignore
    export function tupled<E extends Semigroup<E>, A0, A1, A2, A3, A4, A5, A6, A7>(
        ...xs: [
            These<E, A0>,
            These<E, A1>,
            These<E, A2>,
            These<E, A3>,
            These<E, A4>,
            These<E, A5>,
            These<E, A6>,
            These<E, A7>,
        ]
    ): These<E, readonly [A0, A1, A2, A3, A4, A5, A6, A7]>;

    // prettier-ignore
    export function tupled<E extends Semigroup<E>, A0, A1, A2, A3, A4, A5, A6, A7, A8>(
        ...xs: [
            These<E, A0>,
            These<E, A1>,
            These<E, A2>,
            These<E, A3>,
            These<E, A4>,
            These<E, A5>,
            These<E, A6>,
            These<E, A7>,
            These<E, A8>,
        ]
    ): These<E, readonly [A0, A1, A2, A3, A4, A5, A6, A7, A8]>;

    // prettier-ignore
    export function tupled<E extends Semigroup<E>, A0, A1, A2, A3, A4, A5, A6, A7, A8, A9>(
        ...xs: [
            These<E, A0>,
            These<E, A1>,
            These<E, A2>,
            These<E, A3>,
            These<E, A4>,
            These<E, A5>,
            These<E, A6>,
            These<E, A7>,
            These<E, A8>,
            These<E, A9>,
        ]
    ): These<E, readonly [A0, A1, A2, A3, A4, A5, A6, A7, A8, A9]>;

    export function tupled<E extends Semigroup<E>, A>(
        ...xs: These<E, A>[]
    ): These<E, readonly A[]> {
        return collect(xs);
    }

    /**
     * Construct a Promise that fulfills with a These using an async generator
     * comprehension.
     */
    export async function goAsync<E extends Semigroup<E>, A>(
        f: () => AsyncGenerator<readonly [These<E, any>, YieldTkn], A, any>,
    ): Promise<These<E, A>> {
        const nxs = f();
        let nx = await nxs.next();
        let e: E | undefined;

        while (!nx.done) {
            const t = nx.value[0];
            if (t.isSecond()) {
                nx = await nxs.next(t.val);
            } else if (t.isBoth()) {
                e = e !== undefined ? cmb(e, t.fst) : t.fst;
                nx = await nxs.next(t.snd);
            } else {
                return e !== undefined ? first(cmb(e, t.val)) : t;
            }
        }
        return e !== undefined ? both(e, nx.value) : second(nx.value);
    }

    /**
     * The fluent syntax for These.
     */
    export abstract class Syntax {
        /**
         * Test whether this and that These are equal using Eq comparison.
         */
        [Eq.eq]<A extends Eq<A>, B extends Eq<B>>(
            this: These<A, B>,
            that: These<A, B>,
        ): boolean {
            if (this.isFirst()) {
                return that.isFirst() && eq(this.val, that.val);
            }
            if (this.isSecond()) {
                return that.isSecond() && eq(this.val, that.val);
            }
            return (
                that.isBoth() &&
                eq(this.fst, that.fst) &&
                eq(this.snd, that.snd)
            );
        }

        /**
         * Compare this and that These using Ord comparison.
         */
        [Ord.cmp]<A extends Ord<A>, B extends Ord<B>>(
            this: These<A, B>,
            that: These<A, B>,
        ): Ordering {
            if (this.isFirst()) {
                return that.isFirst() ? cmp(this.val, that.val) : Ordering.less;
            }
            if (this.isSecond()) {
                if (that.isSecond()) {
                    return cmp(this.val, that.val);
                }
                return that.isFirst() ? Ordering.greater : Ordering.less;
            }
            if (that.isBoth()) {
                return cmb(cmp(this.fst, that.fst), cmp(this.snd, that.snd));
            }
            return Ordering.greater;
        }

        /**
         * Combine this and that These, accumulating both first and second
         * values using Semigroup combination.
         */
        [Semigroup.cmb]<A extends Semigroup<A>, B extends Semigroup<B>>(
            this: These<A, B>,
            that: These<A, B>,
        ): These<A, B> {
            if (this.isFirst()) {
                if (that.isFirst()) {
                    return first(cmb(this.val, that.val));
                }
                if (that.isSecond()) {
                    return both(this.val, that.val);
                }
                return both(cmb(this.val, that.fst), that.snd);
            }

            if (this.isSecond()) {
                if (that.isFirst()) {
                    return both(that.val, this.val);
                }
                if (that.isSecond()) {
                    return second(cmb(this.val, that.val));
                }
                return both(that.fst, cmb(this.val, that.snd));
            }

            if (that.isFirst()) {
                return both(cmb(this.fst, that.val), this.snd);
            }
            if (that.isSecond()) {
                return both(this.fst, cmb(this.snd, that.val));
            }
            return both(cmb(this.fst, that.fst), cmb(this.snd, that.snd));
        }

        /**
         * Test whether this These is a `First`.
         */
        isFirst<A>(this: These<A, any>): this is First<A> {
            return this.typ === "First";
        }

        /**
         * Test whether this These is a `Second`.
         */
        isSecond<B>(this: These<any, B>): this is Second<B> {
            return this.typ === "Second";
        }

        /**
         * Test whether this These is a `Both`.
         */
        isBoth<A, B>(this: These<A, B>): this is Both<A, B> {
            return this.typ === "Both";
        }

        /**
         * Case analysis for These.
         */
        fold<A, B, C, D, E>(
            this: These<A, B>,
            foldL: (x: A, these: First<A>) => C,
            foldR: (x: B, these: Second<B>) => D,
            foldLR: (x: A, y: B, these: Both<A, B>) => E,
        ): C | D | E {
            if (this.isFirst()) {
                return foldL(this.val, this);
            }
            if (this.isSecond()) {
                return foldR(this.val, this);
            }
            return foldLR(this.fst, this.snd, this);
        }

        /**
         * If this These has a second value, apply a function to the value to
         * produce a new These.
         */
        flatMap<E extends Semigroup<E>, A, B>(
            this: These<E, A>,
            f: (x: A) => These<E, B>,
        ): These<E, B> {
            if (this.isFirst()) {
                return this;
            }
            if (this.isSecond()) {
                return f(this.val);
            }
            return f(this.snd).mapFirst((y) =>
                cmb((this as Both<E, A>).fst, y),
            );
        }

        /**
         * If this These's second value is a These, flatten this These.
         */
        flat<E extends Semigroup<E>, A>(
            this: These<E, These<E, A>>,
        ): These<E, A> {
            return this.flatMap(id);
        }

        /**
         * If this and that These have a second value, apply a function to the
         * values.
         */
        zipWith<E extends Semigroup<E>, A, B, C>(
            this: These<E, A>,
            that: These<E, B>,
            f: (x: A, y: B) => C,
        ): These<E, C> {
            return this.flatMap((x) => that.map((y) => f(x, y)));
        }

        /**
         * If this and that These have a second value keep only this These's
         * value.
         */
        zipFst<E extends Semigroup<E>, A>(
            this: These<E, A>,
            that: These<E, any>,
        ): These<E, A> {
            return this.zipWith(that, id);
        }

        /**
         * If this and that These have a second value keep only that These's
         * value.
         */
        zipSnd<E extends Semigroup<E>, B>(
            this: These<E, any>,
            that: These<E, B>,
        ): These<E, B> {
            return this.flatMap(() => that);
        }

        /**
         * Apply functions to this These's first and second values.
         */
        bimap<A, B, C, D>(
            this: These<A, B>,
            mapL: (x: A) => C,
            mapR: (x: B) => D,
        ): These<C, D> {
            if (this.isFirst()) {
                return first(mapL(this.val));
            }
            if (this.isSecond()) {
                return second(mapR(this.val));
            }
            return both(mapL(this.fst), mapR(this.snd));
        }

        /**
         * If this These is has a first value, apply a function to the value.
         */
        mapFirst<A, B, C>(this: These<A, B>, f: (x: A) => C): These<C, B> {
            if (this.isSecond()) {
                return this;
            }
            if (this.isFirst()) {
                return first(f(this.val));
            }
            return both(f(this.fst), this.snd);
        }

        /**
         * If this These has a second value, apply a function to the value.
         */
        map<A, B, D>(this: These<A, B>, f: (x: B) => D): These<A, D> {
            if (this.isFirst()) {
                return this;
            }
            if (this.isSecond()) {
                return second(f(this.val));
            }
            return both(this.fst, f(this.snd));
        }

        /**
         * If this These has a second value, overwrite the value.
         */
        mapTo<A, D>(this: These<A, any>, value: D): These<A, D> {
            return this.map(() => value);
        }
    }

    /**
     * A These with a first value.
     */
    export class First<out A> extends Syntax {
        /**
         * The property that discriminates These.
         */
        readonly typ = "First";

        /**
         * This These's value.
         */
        readonly val: A;

        constructor(val: A) {
            super();
            this.val = val;
        }

        /**
         * Defining iterable behavior for These allows TypeScript to infer
         * second types when yielding These in generator comprehensions using
         * `yield*`.
         *
         * @hidden
         */
        *[Symbol.iterator](): Iterator<
            readonly [These<A, never>, YieldTkn],
            never,
            unknown
        > {
            return (yield [this, yieldTkn]) as never;
        }
    }

    /**
     * A These with a second value.
     */
    export class Second<out B> extends Syntax {
        /**
         * The property that discriminates These.
         */
        readonly typ = "Second";

        /**
         * This These's value.
         */
        readonly val: B;

        constructor(val: B) {
            super();
            this.val = val;
        }

        /**
         * Defining iterable behavior for These allows TypeScript to infer
         * second types when yielding These in generator comprehensions using
         * `yield*`.
         *
         * @hidden
         */
        *[Symbol.iterator](): Iterator<
            readonly [These<never, B>, YieldTkn],
            B,
            unknown
        > {
            return (yield [this, yieldTkn]) as B;
        }
    }

    /**
     * A These with a first and second value.
     */
    export class Both<out A, out B> extends Syntax {
        /**
         * The property that discriminates These.
         */
        readonly typ = "Both";

        /**
         * This These's first value.
         */
        readonly fst: A;

        /**
         * This These's second value.
         */
        readonly snd: B;

        constructor(fst: A, snd: B) {
            super();
            this.fst = fst;
            this.snd = snd;
        }

        /**
         * Defining iterable behavior for These allows TypeScript to infer
         * second types when yielding These in generator comprehensions using
         * `yield*`.
         *
         * @hidden
         */
        *[Symbol.iterator](): Iterator<
            readonly [These<A, B>, YieldTkn],
            B,
            unknown
        > {
            return (yield [this, yieldTkn]) as B;
        }
    }
}
