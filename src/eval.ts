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
 * Control over synchronous evaluation.
 *
 * @module
 */

import { cmb, Semigroup } from "./cmb.js";
import { id } from "./fn.js";
import { MutStack } from "./internal/mut_stack.js";

/**
 * A type that models a synchronous computation.
 */
export class Eval<out A> {
    /**
     * A unique symbol used in Eval generator comprehensions.
     *
     * @hidden
     */
    static readonly yieldTkn = Symbol();

    /**
     * Construct an Eval with an immediately known value.
     */
    static now<A>(x: A): Eval<A> {
        return new Eval(Instr.now(x));
    }

    /**
     * Construct an Eval from a thunk. The thunk will be called at most once,
     * and all evaluations after the first will return a memoized value.
     */
    static once<A>(f: () => A): Eval<A> {
        return new Eval(Instr.once(f));
    }

    /**
     * Construct an Eval from a thunk. The thunk will be called on every
     * evaluation.
     */
    static always<A>(f: () => A): Eval<A> {
        return new Eval(Instr.always(f));
    }

    /**
     * Construct an Eval from function that produces an Eval.
     */
    static defer<A>(f: () => Eval<A>): Eval<A> {
        return Eval.now(undefined).flatMap(f);
    }

    static #step<A>(
        nxs: Iterator<readonly [Eval<any>, Eval.YieldTkn], A>,
        nx: IteratorResult<readonly [Eval<any>, Eval.YieldTkn], A>,
    ): Eval<A> {
        if (nx.done) {
            return Eval.now(nx.value);
        }
        return nx.value[0].flatMap((x) => Eval.#step(nxs, nxs.next(x)));
    }

    static #stepGen<A>(
        nxs: Generator<readonly [Eval<any>, Eval.YieldTkn], A, any>,
    ): Eval<A> {
        return Eval.#step(nxs, nxs.next());
    }

    /**
     * Construct an Eval using a generator comprehension.
     */
    static go<A>(
        f: () => Generator<readonly [Eval<any>, Eval.YieldTkn], A, any>,
    ): Eval<A> {
        return Eval.defer(() => Eval.#stepGen(f()));
    }

    /**
     * Reduce a finite iterable from left to right in the context of Eval.
     */
    static reduce<A, B>(
        xs: Iterable<A>,
        f: (acc: B, x: A) => Eval<B>,
        z: B,
    ): Eval<B> {
        return Eval.go(function* () {
            let acc = z;
            for (const x of xs) {
                acc = yield* f(acc, x);
            }
            return acc;
        });
    }

    /**
     * Evaluate the Evals in an array or a tuple literal from left to right and
     * collect the results in an array or a tuple literal, respectively.
     */
    static collect<T extends readonly Eval<any>[]>(
        xs: T,
    ): Eval<Eval.ResultsT<T>> {
        return Eval.go(function* () {
            const l = xs.length;
            const ys = new Array(l);
            for (let ix = 0; ix < l; ix++) {
                ys[ix] = yield* xs[ix];
            }
            return ys as unknown as Eval.ResultsT<T>;
        });
    }

    /**
     * Evaluate a series of Evals from left to right and collect the results in
     * a tuple literal.
     */
    static tupled<T extends [Eval<any>, Eval<any>, ...Eval<any>[]]>(
        ...xs: T
    ): Eval<Eval.ResultsT<T>> {
        return Eval.collect(xs);
    }

    /**
     * Evaluate the Evals in an object literal and collect the results in an
     * object literal.
     */
    static gather<T extends Record<any, Eval<any>>>(
        xs: T,
    ): Eval<{ readonly [K in keyof T]: Eval.ResultT<T[K]> }> {
        return Eval.go(function* () {
            const ys: Record<any, unknown> = {};
            for (const [kx, x] of Object.entries(xs)) {
                ys[kx] = yield* x;
            }
            return ys as Eval.ResultsT<T>;
        });
    }

    /**
     * An instruction that builds an evaluation tree for Eval.
     */
    readonly #i: Instr;

    private constructor(i: Instr) {
        this.#i = i;
    }

    /**
     * Defining iterable behavior for Eval allows TypeScript to infer result
     * types when yielding Eithers in generator comprehensions using `yield*`.
     *
     * @hidden
     */
    *[Symbol.iterator](): Iterator<
        readonly [Eval<A>, Eval.YieldTkn],
        A,
        unknown
    > {
        return (yield [this, Eval.yieldTkn]) as A;
    }

    /**
     * If this and that Eval's results are a Semigroup, combine the results.
     */
    [Semigroup.cmb]<A extends Semigroup<A>>(
        this: Eval<A>,
        that: Eval<A>,
    ): Eval<A> {
        return this.zipWith(that, cmb);
    }

    /**
     * Apply a function to this Eval's result to produce a new Eval.
     */
    flatMap<B>(f: (x: A) => Eval<B>): Eval<B> {
        return new Eval(Instr.flatMap(this, f));
    }

    /**
     * If this Eval's result is an Eval, return the inner Eval.
     */
    flat<A>(this: Eval<Eval<A>>): Eval<A> {
        return this.flatMap(id);
    }

    /**
     * Apply a function to this and that Eval's results.
     */
    zipWith<B, C>(that: Eval<B>, f: (x: A, y: B) => C): Eval<C> {
        return this.flatMap((x) => that.map((y) => f(x, y)));
    }

    /**
     * Evaluate this Eval then that Eval, then keep only this Eval's result.
     */
    zipFst(that: Eval<any>): Eval<A> {
        return this.zipWith(that, id);
    }

    /**
     * Evaluate this Eval then that Eval, then keep only that Eval's result.
     */
    zipSnd<B>(that: Eval<B>): Eval<B> {
        return this.flatMap(() => that);
    }

    /**
     * Apply a function to this Eval's result.
     */
    map<B>(f: (a: A) => B): Eval<B> {
        return this.flatMap((x) => Eval.now(f(x)));
    }

    /**
     * Overwrite this Eval's result.
     */
    mapTo<B>(value: B): Eval<B> {
        return this.flatMap(() => Eval.now(value));
    }

    /**
     * Evaluate this Eval to produce a result.
     */
    run(): A {
        type Bind = (x: any) => Eval<any>;
        const ks = new MutStack<Bind>();
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        let c: Eval<any> = this;

        // eslint-disable-next-line no-constant-condition
        while (true) {
            // prettier-ignore
            switch (c.#i.t) {
                case Instr.Tag.Now: {
                    const k = ks.pop();
                    if (!k) {
                        return c.#i.x;
                    }
                    c = k(c.#i.x);
                } break;

                case Instr.Tag.FlatMap: {
                    ks.push(c.#i.f);
                    c = c.#i.eff;
                } break;

                case Instr.Tag.Once: {
                    if (!c.#i.d) {
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        c.#i.x = c.#i.f!();
                        delete c.#i.f;
                        c.#i.d = true;
                    }
                    c = Eval.now(c.#i.x);
                } break;

                case Instr.Tag.Always: {
                    c = Eval.now(c.#i.f());
                } break;
            }
        }
    }
}

export namespace Eval {
    /**
     * A unique symbol used in Eval generator comprehensions.
     *
     * @hidden
     */
    export type YieldTkn = typeof Eval.yieldTkn;

    /**
     * Extract the result type `A` from the type `Eval<A>`.
     */
    // prettier-ignore
    export type ResultT<T extends Eval<any>> = 
        T extends Eval<infer A> ? A : never;

    /**
     * Given a tuple literal or an object literal of Eval types, map over the
     * structure to produce a tuple literal or an object literal of the result
     * types.
     *
     * ```ts
     * type T0 = [Eval<1>, Eval<2>, Eval<3>];
     * type T1 = Eval.ResultsT<T0>; // [1, 2, 3]
     *
     * type T2 = { x: Eval<1>, y: Eval<2>, z: Eval<3> };
     * type T3 = Eval.ResultsT<T2>; // { x: 1, y: 2, z: 3 }
     * ```
     */
    export type ResultsT<
        T extends readonly Eval<any>[] | Record<any, Eval<any>>,
    > = { [K in keyof T]: T[K] extends Eval<infer A> ? A : never };
}

type Instr = Instr.Now | Instr.FlatMap | Instr.Once | Instr.Always;

namespace Instr {
    export const enum Tag {
        Now,
        FlatMap,
        Once,
        Always,
    }

    export interface Now {
        readonly t: Tag.Now;
        readonly x: any;
    }

    export interface FlatMap {
        readonly t: Tag.FlatMap;
        readonly eff: Eval<any>;
        readonly f: (x: any) => Eval<any>;
    }

    export interface Once {
        readonly t: Tag.Once;
        d: boolean;
        f?: () => any;
        x?: any;
    }

    export interface Always {
        readonly t: Tag.Always;
        readonly f: () => any;
    }

    export function now<A>(x: A): Now {
        return { t: Tag.Now, x };
    }

    export function flatMap<A, B>(eff: Eval<A>, f: (x: A) => Eval<B>): FlatMap {
        return { t: Tag.FlatMap, eff, f };
    }

    export function once<A>(f: () => A): Once {
        return { t: Tag.Once, f, d: false };
    }

    export function always<A>(f: () => A): Always {
        return { t: Tag.Always, f };
    }
}
