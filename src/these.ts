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
import { cmp, Eq, eq, greater, less, Ord, type Ordering } from "./cmp.js";
import { id } from "./fn.js";

/**
 * A type that represents an "inclusive-or" relationship between two values
 * ({@link These.First First}, {@link These.Second Second}, or
 * {@link These.Both Both}).
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
            if (here(this)) {
                return here(that) && eq(this.val, that.val);
            }
            if (there(this)) {
                return there(that) && eq(this.val, that.val);
            }
            return (
                paired(that) && eq(this.fst, that.fst) && eq(this.snd, that.snd)
            );
        }

        /**
         * Compare this and that These using Ord comparison.
         */
        [Ord.cmp]<A extends Ord<A>, B extends Ord<B>>(
            this: These<A, B>,
            that: These<A, B>,
        ): Ordering {
            if (here(this)) {
                return here(that) ? cmp(this.val, that.val) : less;
            }
            if (there(this)) {
                if (there(that)) {
                    return cmp(this.val, that.val);
                }
                return here(that) ? greater : less;
            }
            if (paired(that)) {
                return cmb(cmp(this.fst, that.fst), cmp(this.snd, that.snd));
            }
            return greater;
        }

        /**
         * Combine this and that These, accumulating both first and second
         * values using Semigroup combination.
         */
        [Semigroup.cmb]<A extends Semigroup<A>, B extends Semigroup<B>>(
            this: These<A, B>,
            that: These<A, B>,
        ): These<A, B> {
            if (here(this)) {
                if (here(that)) {
                    return first(cmb(this.val, that.val));
                }
                if (there(that)) {
                    return both(this.val, that.val);
                }
                return both(cmb(this.val, that.fst), that.snd);
            }

            if (there(this)) {
                if (here(that)) {
                    return both(that.val, this.val);
                }
                if (there(that)) {
                    return second(cmb(this.val, that.val));
                }
                return both(that.fst, cmb(this.val, that.snd));
            }

            if (here(that)) {
                return both(cmb(this.fst, that.val), this.snd);
            }
            if (there(that)) {
                return both(this.fst, cmb(this.snd, that.val));
            }
            return both(cmb(this.fst, that.fst), cmb(this.snd, that.snd));
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
            if (here(this)) {
                return foldL(this.val, this);
            }
            if (there(this)) {
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
            if (here(this)) {
                return this;
            }
            if (there(this)) {
                return f(this.val);
            }
            return f(this.snd).mapFirst((y) => {
                return cmb((this as Both<E, A>).fst, y);
            });
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
            if (here(this)) {
                return first(mapL(this.val));
            }
            if (there(this)) {
                return second(mapR(this.val));
            }
            return both(mapL(this.fst), mapR(this.snd));
        }

        /**
         * If this These is has a first value, apply a function to the value.
         */
        mapFirst<A, B, C>(this: These<A, B>, f: (x: A) => C): These<C, B> {
            if (there(this)) {
                return this;
            }
            if (here(this)) {
                return first(f(this.val));
            }
            return both(f(this.fst), this.snd);
        }

        /**
         * If this These has a second value, apply a function to the value.
         */
        map<A, B, D>(this: These<A, B>, f: (x: B) => D): These<A, D> {
            if (here(this)) {
                return this;
            }
            if (there(this)) {
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
        readonly type = "First";

        /**
         * Construct an instance of `These.First`.
         *
         * Explicit use of this constructor should be avoided; use the
         * {@link first} function instead.
         */
        constructor(readonly val: A) {
            super();
        }

        /**
         * Defining iterable behavior for These allows TypeScript to infer
         * second value types when yielding These in generator comprehensions
         * via `yield*`.
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
        readonly type = "Second";

        /**
         * Construct an instance of `These.Second`.
         *
         * Explicit use of this constructor should be avoided; use the
         * {@link second} function instead.
         */
        constructor(readonly val: B) {
            super();
        }

        /**
         * Defining iterable behavior for These allows TypeScript to infer
         * second value types when yielding These in generator comprehensions
         * via `yield*`.
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
        readonly type = "Both";

        /**
         * Construct an instance of `These.Both`.
         *
         * Explicit use of this constructor should be avoided; use the
         * {@link both} function instead.
         */
        constructor(readonly fst: A, readonly snd: B) {
            super();
        }

        /**
         * Defining iterable behavior for These allows TypeScript to infer
         * second value types when yielding These in generator comprehensions
         * via `yield*`.
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

/**
 * Construct a These with only a first value, with an optional type witness for
 * the second value.
 */
export function first<A, B = never>(x: A): These<A, B> {
    return new These.First(x);
}

/**
 * Construct a These with only a second value, with an optional type witness for
 * the first value.
 */
export function second<B, A = never>(x: B): These<A, B> {
    return new These.Second(x);
}

/**
 * Construct a These with a first and second value.
 */
export function both<A, B>(x: A, y: B): These<A, B> {
    return new These.Both(x, y);
}

/**
 * Test whether a These has only a first value.
 */
export function here<A>(these: These<A, any>): these is These.First<A> {
    return these.type === "First";
}

/**
 * Test whether a These has only a second value.
 */
export function there<B>(these: These<any, B>): these is These.Second<B> {
    return these.type === "Second";
}

/**
 * Test whether a These has both a first and second value.
 */
export function paired<A, B>(these: These<A, B>): these is These.Both<A, B> {
    return these.type === "Both";
}

/**
 * Construct a These using a generator comprehension.
 */
export function doThese<E extends Semigroup<E>, A>(
    f: () => Generator<readonly [These<E, any>, These.YieldTkn], A, any>,
): These<E, A> {
    const nxs = f();
    let nx = nxs.next();
    let e: E | undefined;

    while (!nx.done) {
        const t = nx.value[0];
        if (there(t)) {
            nx = nxs.next(t.val);
        } else if (paired(t)) {
            e = e ? cmb(e, t.fst) : t.fst;
            nx = nxs.next(t.snd);
        } else {
            return e ? first(cmb(e, t.val)) : t;
        }
    }
    return e ? both(e, nx.value) : second(nx.value);
}

/**
 * Reduce a finite iterable from left to right in the context of These.
 */
export function reduceThese<A, B, E extends Semigroup<E>>(
    xs: Iterable<A>,
    f: (acc: B, x: A) => These<E, B>,
    z: B,
): These<E, B> {
    return doThese(function* () {
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
export function collectThese<E extends Semigroup<E>, A0, A1>(
    xs: readonly [These<E, A0>, These<E, A1>],
): These<E, readonly [A0, A1]>;

export function collectThese<E extends Semigroup<E>, A0, A1, A2>(
    xs: readonly [These<E, A0>, These<E, A1>, These<E, A2>],
): These<E, readonly [A0, A1, A2]>;

export function collectThese<E extends Semigroup<E>, A0, A1, A2, A3>(
    xs: readonly [These<E, A0>, These<E, A1>, These<E, A2>, These<E, A3>],
): These<E, readonly [A0, A1, A2, A3]>;

export function collectThese<E extends Semigroup<E>, A0, A1, A2, A3, A4>(
    xs: readonly [
        These<E, A0>,
        These<E, A1>,
        These<E, A2>,
        These<E, A3>,
        These<E, A4>,
    ],
): These<E, readonly [A0, A1, A2, A3, A4]>;

export function collectThese<E extends Semigroup<E>, A0, A1, A2, A3, A4, A5>(
    xs: readonly [
        These<E, A0>,
        These<E, A1>,
        These<E, A2>,
        These<E, A3>,
        These<E, A4>,
        These<E, A5>,
    ],
): These<E, readonly [A0, A1, A2, A3, A4, A5]>;

// prettier-ignore
export function collectThese<E extends Semigroup<E>, A0, A1, A2, A3, A4, A5, A6>(
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
export function collectThese<E extends Semigroup<E>, A0, A1, A2, A3, A4, A5, A6, A7>(
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
export function collectThese<E extends Semigroup<E>, A0, A1, A2, A3, A4, A5, A6, A7, A8>(
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
export function collectThese<E extends Semigroup<E>, A0, A1, A2, A3, A4, A5, A6, A7, A8, A9>(
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

export function collectThese<E extends Semigroup<E>, A>(
    xs: readonly These<E, A>[],
): These<E, readonly A[]>;

export function collectThese<E extends Semigroup<E>, A>(
    xs: readonly These<E, A>[],
): These<E, readonly A[]> {
    return doThese(function* () {
        const l = xs.length;
        const ys: A[] = new Array(l);
        for (let ix = 0; ix < l; ix++) {
            ys[ix] = yield* xs[ix];
        }
        return ys;
    });
}

/**
 * Evaluate a series of These from left to right and collect the second values
 * in a tuple literal.
 */
export function tupledThese<E extends Semigroup<E>, A0, A1>(
    ...xs: [These<E, A0>, These<E, A1>]
): These<E, readonly [A0, A1]>;

export function tupledThese<E extends Semigroup<E>, A0, A1, A2>(
    ...xs: [These<E, A0>, These<E, A1>, These<E, A2>]
): These<E, readonly [A0, A1, A2]>;

export function tupledThese<E extends Semigroup<E>, A0, A1, A2, A3>(
    ...xs: [These<E, A0>, These<E, A1>, These<E, A2>, These<E, A3>]
): These<E, readonly [A0, A1, A2, A3]>;

export function tupledThese<E extends Semigroup<E>, A0, A1, A2, A3, A4>(
    ...xs: [
        These<E, A0>,
        These<E, A1>,
        These<E, A2>,
        These<E, A3>,
        These<E, A4>,
    ]
): These<E, readonly [A0, A1, A2, A3, A4]>;

export function tupledThese<E extends Semigroup<E>, A0, A1, A2, A3, A4, A5>(
    ...xs: [
        These<E, A0>,
        These<E, A1>,
        These<E, A2>,
        These<E, A3>,
        These<E, A4>,
        These<E, A5>,
    ]
): These<E, readonly [A0, A1, A2, A3, A4, A5]>;

export function tupledThese<E extends Semigroup<E>, A0, A1, A2, A3, A4, A5, A6>(
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
export function tupledThese<E extends Semigroup<E>, A0, A1, A2, A3, A4, A5, A6, A7>(
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
export function tupledThese<E extends Semigroup<E>, A0, A1, A2, A3, A4, A5, A6, A7, A8>(
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
export function tupledThese<E extends Semigroup<E>, A0, A1, A2, A3, A4, A5, A6, A7, A8, A9>(
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

export function tupledThese<E extends Semigroup<E>, A>(
    ...xs: These<E, A>[]
): These<E, readonly A[]> {
    return collectThese(xs);
}

/**
 * Lift a function of any arity into the context of These.
 */
export function liftThese<T extends unknown[], A>(
    f: (...args: T) => A,
): <E extends Semigroup<E>>(
    ...args: { [K in keyof T]: These<E, T[K]> }
) => These<E, A> {
    return (...args) => collectThese(args).map((xs) => f(...(xs as T)));
}

/**
 * Lift a function that accepts an object literal of named arguments into the
 * context of These.
 */
// prettier-ignore
export function liftNamedThese<T extends Record<any, unknown>, A = T>(
    f: (args: T) => A,
): <E extends Semigroup<E>>(
     args: { [K in keyof T]: These<E, T[K]> }
) => These<E, A> {
    return (args) => doThese(function* () {
        const xs: Record<any, unknown> = {};
        for (const [kx, x] of Object.entries(args)) {
            xs[kx] = yield* x;
        }
        return f(xs as T);
    });
}

/**
 * Lift a constructor function of any arity into the contet of These.
 */
export function liftNewThese<T extends unknown[], A>(
    ctor: new (...args: T) => A,
): <E extends Semigroup<E>>(
    ...args: { [K in keyof T]: These<E, T[K]> }
) => These<E, A> {
    return (...args) => collectThese(args).map((xs) => new ctor(...(xs as T)));
}

/**
 * Construct a Promise that fulfills with a These using an async generator
 * comprehension.
 */
export async function doTheseAsync<E extends Semigroup<E>, A>(
    f: () => AsyncGenerator<readonly [These<E, any>, These.YieldTkn], A, any>,
): Promise<These<E, A>> {
    const nxs = f();
    let nx = await nxs.next();
    let e: E | undefined;

    while (!nx.done) {
        const t = nx.value[0];
        if (there(t)) {
            nx = await nxs.next(t.val);
        } else if (paired(t)) {
            e = e ? cmb(e, t.fst) : t.fst;
            nx = await nxs.next(t.snd);
        } else {
            return e ? first(cmb(e, t.val)) : t;
        }
    }
    return e ? both(e, nx.value) : second(nx.value);
}
