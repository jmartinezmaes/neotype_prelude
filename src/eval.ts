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
 * This module provides the `Eval` type and associated operations.
 *
 * `Eval<A>` is a type that controls the execution of a synchronous computation
 * that returns a result `A`. `Eval` can suspend and memoize evaluation for a
 * variety of use cases, and it provides stack-safe execution for recursive
 * programs.
 *
 * ## Importing from this module
 *
 * This module exposes `Eval` as a class. It can be imported as a single alias:
 *
 * ```ts
 * import { Eval } from "@neotype/prelude/eval.js";
 *
 * const example: Eval<number> = Eval.now(1);
 * ```
 *
 * Or, the type and class can be imported and aliased separately:
 *
 * ```ts
 * import { type Eval, Eval as Ev } from "@neotype/prelude/eval.js";
 *
 * const example: Eval<number> = Ev.now(1);
 * ```
 *
 * ## Constructing `Eval`
 *
 * `Eval` has three static methods for constructing computations from values:
 *
 * -   `now` for eager, memoized evaluation;
 * -   `once` for lazy, memoized evaluation; and
 * -   `always` for lazy, non-memoized evaluation.
 *
 * Additionally, `defer` suspends the evaluation of any Eval, and is useful for
 * implementing mutual and self-referential recursion.
 *
 * ## Running computations
 *
 * The `run` method evaluates an Eval and returns its result.
 *
 * ```ts
 * const tuple3 = Eval.tupled(
 *     Eval.now(1),
 *     Eval.once(() => 2),
 *     Eval.always(() => 3),
 * );
 * console.log(tuple3.run());
 * ```
 *
 * ## `Eval` as a semigroup
 *
 * `Eval` implements `Semigroup` when its result type parameter implements
 * `Semigroup`. When combined, the Evals will be evaluated from left to right,
 * then their results will be combined.
 *
 * In other words, `cmb(x, y)` is equivalent to `x.zipWith(y, cmb)` for all
 * Evals `x` and `y`.
 *
 * ## Transforming values
 *
 * These methods transform an Eval's result:
 *
 * -   `map` applies a function to the result.
 * -   `mapTo` overwrites the result.
 *
 * ## Chaining `Eval`
 *
 * The `flatMap` method chains together computations that return `Eval`. Upon
 * calling `flatMap`, a function is applied to an Eval's result and evaluated to
 * return another Eval. Composing Evals with `flatMap` is stack safe, even for
 * recursive programs.
 *
 * Consider a program that uses `Eval` to fold over a recursive `Tree` data
 * structure:
 *
 * ```ts
 * type Tree<A> = Tip | Bin<A>;
 * type Tip = { typ: "Tip" };
 * type Bin<A> = { typ: "Bin", val: A, ltree: Tree<A>, rtree: Tree<A> };
 *
 * const tip: Tree<never> = { typ: "Tip" };
 *
 * function bin<A>(val: A, ltree: Tree<A>, rtree: Tree<A>): Tree<A> {
 *     return { typ: "Bin", val, ltree, rtree };
 * }
 *
 * function foldTree<A, B>(
 *     xs: Tree<A>,
 *     onTip: B,
 *     foldBin: (val: A, l: B, r: B) => B
 * ): Eval<B> {
 *     if (xs.typ === "Tip") {
 *         return Eval.now(onTip);
 *     }
 *     // Challenge for the reader: why is `defer` needed here?
 *     // Hint: it pertains to stack safety and eager evaluation.
 *     return Eval.defer(() =>
 *         foldTree(xs.ltree, onTip, foldBin).flatMap((l) =>
 *             foldTree(xs.rtree, onTip, foldBin).map((r) =>
 *                 foldBin(xs.val, l, r),
 *             ),
 *         ),
 *     );
 * }
 *
 * function traverseInOrder(xs: Tree<A>): A[] {
 *     return foldTree(xs, [], (x, lxs, rxs) => [...lxs, x, ...rxs]).run();
 * }
 *
 * const oneToSeven: Tree<number> = bin(
 *     4,
 *     bin(2, bin(1, tip, tip), bin(3, tip, tip)),
 *     bin(6, bin(5, tip, tip), bin(7, tip, tip)),
 * );
 *
 * console.log(traverseInOrder(oneToSeven));
 * ```
 *
 * ### Generator comprehensions
 *
 * Generator comprehensions provide an alternative syntax for chaining together
 * computations that return `Eval`. Instead of `flatMap`, a generator is used
 * to unwrap Evals' results and apply functions to their values.
 *
 * The `go` static method evaluates a generator to return an Eval. Within the
 * generator, Evals are yielded using the `yield*` keyword. This binds the
 * results to specified variables. When the computation is complete, a final
 * value can be computed and returned from the generator.
 *
 * Generator comprehensions support all syntax that would otherwise be valid
 * within a generator, including:
 *
 * -   Variable declarations, assignment, and mutation
 * -   Function declarations
 * -   `for` loops
 * -   `while` and `do...while` loops
 * -   `if`/`else if`/`else` blocks
 * -   `switch` blocks
 * -   `try`/`catch` blocks
 *
 * `Eval` is "suspended" in its implementation of `go`, which means that the
 * body of the provided generator function will not run until the Eval is
 * evaluated using `run`. This behavior helps ensure stack safety, especially
 * for recursive programs.
 *
 * Consider the generator comprehension equivalent of the `foldTree` function
 * above:
 *
 * ```ts
 * function foldTree<A, B>(
 *     xs: Tree<A>,
 *     onTip: B,
 *     foldBin: (val: A, l: B, r: B) => B
 * ): Eval<B> {
 *     return Eval.go(function* () {
 *         if (xs.typ === "Tip") {
 *             return onTip;
 *         }
 *         // Challenge for the reader: why is `defer` not needed here?
 *         // Hint: it pertains to the behavior of `go`.
 *         const l = yield* foldTree(xs.ltree, onTip, foldBin);
 *         const r = yield* foldTree(xs.rtree, onTip, foldBin);
 *         return foldBin(xs.val, l, r);
 *     });
 * }
 * ```
 *
 * ## Collecting into `Eval`
 *
 * `Eval` provides several functions for working with collections of Evals.
 * Sometimes, a collection of Evals must be turned "inside out" into an Eval
 * that contains a "mapped" collection of results.
 *
 * These methods will traverse a collection of Evals to extract the results.
 *
 * -   `collect` turns an Array or a tuple literal of Evals inside out.
 * -   `tupled` turns a series of two or more individual Evals inside out.
 * -   `gather` turns a Record or an object literal of Evals inside out.
 *
 * ```ts
 * console.log(Eval.collect([Eval.now(42), Eval.once(() => "ok")]));
 * console.log(Eval.tupled(Eval.always(() => 42), Eval.now("ok")));
 * console.log(Eval.gather({ x: Eval.once(42), y: Eval.always(() => "ok") }));
 * ```
 *
 * Additionally, the `reduce` function reduces a finite Iterable from left to
 * right in the context of `Eval`. This is useful for mapping, filtering, and
 * accumulating values using `Eval`.
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
     * Construct an Eval from function that returns an Eval.
     */
    static defer<A>(f: () => Eval<A>): Eval<A> {
        return Eval.now(undefined).flatMap(f);
    }

    static #step<A>(
        gen: Iterator<readonly [Eval<any>, Eval.YieldTkn], A>,
        nxt: IteratorResult<readonly [Eval<any>, Eval.YieldTkn], A>,
    ): Eval<A> {
        if (nxt.done) {
            return Eval.now(nxt.value);
        }
        return nxt.value[0].flatMap((x) => Eval.#step(gen, gen.next(x)));
    }

    /**
     * Construct an Eval using a generator comprehension.
     */
    static go<A>(
        f: () => Generator<readonly [Eval<any>, Eval.YieldTkn], A, any>,
    ): Eval<A> {
        return Eval.defer(() => {
            const gen = f();
            return Eval.#step(gen, gen.next());
        });
    }

    /**
     * Reduce a finite Iterable from left to right in the context of Eval.
     */
    static reduce<A, B>(
        xs: Iterable<A>,
        f: (acc: B, x: A) => Eval<B>,
        initial: B,
    ): Eval<B> {
        return Eval.go(function* () {
            let acc = initial;
            for (const x of xs) {
                acc = yield* f(acc, x);
            }
            return acc;
        });
    }

    /**
     * Evaluate the Evals in an Array or a tuple literal from left to right and
     * collect the results in an Array or a tuple literal, respectively.
     */
    static collect<T extends readonly Eval<any>[]>(
        evals: T,
    ): Eval<Eval.ResultsT<T>> {
        return Eval.go(function* () {
            const results = new Array(evals.length);
            for (const [idx, ev] of evals.entries()) {
                results[idx] = yield* ev;
            }
            return results as unknown as Eval.ResultsT<T>;
        });
    }

    /**
     * Evaluate a series of Evals from left to right and collect the results in
     * a tuple literal.
     */
    static tupled<T extends [Eval<any>, Eval<any>, ...Eval<any>[]]>(
        ...evals: T
    ): Eval<Eval.ResultsT<T>> {
        return Eval.collect(evals);
    }

    /**
     * Evaluate the Evals in a Record or an object literal and collect the
     * results in a Record or an object literal, respectively.
     */
    static gather<T extends Record<any, Eval<any>>>(
        evals: T,
    ): Eval<{ readonly [K in keyof T]: Eval.ResultT<T[K]> }> {
        return Eval.go(function* () {
            const results: Record<any, unknown> = {};
            for (const [key, ev] of Object.entries(evals)) {
                results[key] = yield* ev;
            }
            return results as Eval.ResultsT<T>;
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
     * Defining Iterable behavior for Eval allows TypeScript to infer result
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
     * Apply a function to this Eval's result to return a new Eval.
     */
    flatMap<B>(f: (x: A) => Eval<B>): Eval<B> {
        return new Eval(Instr.flatMap(this, f));
    }

    /**
     * If this Eval's result is another Eval, return the inner Eval.
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
     * Evaluate this Eval to return a result.
     */
    run(): A {
        const ks = new MutStack<(x: any) => Eval<any>>();
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        let c: Eval<any> = this;

        // eslint-disable-next-line no-constant-condition
        while (true) {
            switch (c.#i.t) {
                case Instr.Tag.Now: {
                    const k = ks.pop();
                    if (!k) {
                        return c.#i.x;
                    }
                    c = k(c.#i.x);
                    break;
                }

                case Instr.Tag.FlatMap:
                    ks.push(c.#i.f);
                    c = c.#i.ev;
                    break;

                case Instr.Tag.Once:
                    if (!c.#i.d) {
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        c.#i.x = c.#i.f!();
                        delete c.#i.f;
                        c.#i.d = true;
                    }
                    c = Eval.now(c.#i.x);
                    break;

                case Instr.Tag.Always:
                    c = Eval.now(c.#i.f());
                    break;
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
     * Given an Array, a tuple literal, a Record, or an object literal of Eval
     * types, map over the structure to return an equivalent structure of the
     * result types.
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
    > = {
        [K in keyof T]: T[K] extends Eval<infer A> ? A : never;
    };
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
        readonly ev: Eval<any>;
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

    export function flatMap<A, B>(ev: Eval<A>, f: (x: A) => Eval<B>): FlatMap {
        return { t: Tag.FlatMap, ev, f };
    }

    export function once<A>(f: () => A): Once {
        return { t: Tag.Once, f, d: false };
    }

    export function always<A>(f: () => A): Always {
        return { t: Tag.Always, f };
    }
}
