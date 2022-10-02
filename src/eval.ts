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
 * Control over synchronous execution.
 *
 * `Eval<A>` is a type that controls the execution of a synchronous computation
 * that returns a result `A`. `Eval` can suspend and memoize evaluation for a
 * variety of use cases, and it provides stack-safe execution for recursive
 * programs.
 *
 * ## Importing from this module
 *
 * This module exports `Eval` as a class. The class can be imported as named:
 *
 * ```ts
 * import { Eval } from "@neotype/prelude/eval.js";
 * ```
 *
 * Or, the type and class can be imported and aliased separately:
 *
 * ```ts
 * import { type Eval, Eval as Ev } from "@neotype/prelude/eval.js";
 * ```
 *
 * ## Constructing `Eval`
 *
 * `Eval` has four static methods for constructing Evals:
 *
 * - `now` for eager, memoized evaluation;
 * - `once` for lazy, memoized evaluation;
 * - `always` for lazy, non-memoized evaluation; and
 * - `defer` for suspended evaluation of another Eval.
 *
 * ## Running computations
 *
 * The `run` method evaluates an Eval and returns its result.
 *
 * ## `Eval` as a semigroup
 *
 * `Eval` implements `Semigroup` when its generic type implements `Semigroup`.
 * When combined, the Evals are evaluated from left to right, then their results
 * are combined.
 *
 * In other words, `cmb(x, y)` is equivalent to `x.zipWith(y, cmb)` for all
 * Evals `x` and `y`.
 *
 * ## Transforming values
 *
 * The `map` method applies a function to an Eval's result.
 *
 * These methods combine the results of two Evals:
 *
 * - `zipWith` applies a function to the results.
 * - `zipFst` keeps only the first result, and discards the second.
 * - `zipSnd` keeps only the second result, and discards the first.
 *
 * ## Chaining `Eval`
 *
 * The `flatMap` method chains together computations that return `Eval`. Upon
 * calling `flatMap`, a function is applied to an Eval's result and evaluated to
 * return another Eval. Composing Evals with `flatMap` is stack safe, even for
 * recursive programs.
 *
 * ### Generator comprehensions
 *
 * Generator comprehensions provide an imperative syntax for chaining together
 * computations that return `Eval`. Instead of `flatMap`, a Generator is used
 * to unwrap Evals' results and apply functions to their values.
 *
 * The `go` static method evaluates a Generator to return an Eval. Within the
 * Generator, Evals are yielded using the `yield*` keyword. This binds the
 * results to specified variables. When the computation is complete, a final
 * value can be computed and returned from the Generator.
 *
 * Generator comprehensions may contain:
 *
 * - Variable declarations, assignments, and mutations
 * - Function and class declarations
 * - `for` loops
 * - `while` and `do...while` loops
 * - `if`/`else if`/`else` blocks
 * - `switch` blocks
 * - `try`/`catch` blocks
 *
 * `Eval` is automatically deferred in its implementation of `go`. The body of
 * the provided Generator will not run until the Eval is evaluated using `run`.
 * This behavior helps ensure stack safety, especially for recursive programs.
 *
 * ## Collecting into `Eval`
 *
 * `Eval` provides several functions for working with collections of Evals.
 * Sometimes, a collection of Evals must be turned "inside out" into an Eval
 * that contains an equivalent collection of results.
 *
 * These methods will traverse a collection of Evals to extract the results.
 *
 * - `collect` turns an Array or a tuple literal of Evals inside out.
 * - `gather` turns a Record or an object literal of Evals inside out.
 *
 * Additionally, the `reduce` function reduces a finite Iterable from left to
 * right in the context of `Eval`. This is useful for mapping, filtering, and
 * accumulating values using `Eval`.
 *
 * ## Examples
 *
 * These examples assume the following imports:
 *
 * ```ts
 * import { Eval } from "@neotype/prelude/eval.js";
 * ```
 *
 * ### Recursive folds with `Eval`
 *
 * Consider a program that uses `Eval` to fold over and traverse a recursive
 * `Tree` data structure:
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
 * function inOrder<A>(xs: Tree<A>): Eval<A[]> {
 *     return foldTree(xs, [] as A[], (x, lxs, rxs) => [...lxs, x, ...rxs]);
 * }
 *
 * const oneToSeven: Tree<number> = bin(
 *     4,
 *     bin(2, bin(1, tip, tip), bin(3, tip, tip)),
 *     bin(6, bin(5, tip, tip), bin(7, tip, tip)),
 * );
 *
 * console.log(JSON.stringify(inOrder(oneToSeven).run()));
 *
 * // [1,2,3,4,5,6,7]
 * ```
 *
 * We may refactor the `foldTree` function to use a generator comprehension
 * instead:
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
 * Suppose we wanted to traverse a tree in multiple ways and collect the results
 * of each traversal. We may write the following:
 *
 * ```ts
 * function preOrder<A>(tree: Tree<A>): Eval<A[]> {
 *     return foldTree(tree, [] as A[], (x, lxs, rxs) => [x, ...lxs, ...rxs]);
 * }
 *
 * function postOrder<A>(tree: Tree<A>): Eval<A[]> {
 *     return foldTree(tree, [] as A[], (x, lxs, rxs) => [...lxs, ...rxs, x]);
 * }
 *
 * type Traversals<A> = readonly [in: A[], pre: A[], post: A[]];
 *
 * function traversals<A>(tree: Tree<A>): Eval<Traversals<A>> {
 *     return Eval.collect([
 *         inOrder(tree),
 *         preOrder(tree),
 *         postOrder(tree),
 *     ] as const);
 * }
 *
 * console.log(JSON.stringify(traversals(oneToSeven).run()));
 *
 * // [[1,2,3,4,5,6,7],[4,2,1,3,6,5,7],[1,3,2,5,7,6,4]]
 * ```
 *
 * Perhaps we want to return an object instead, where the keys indicate the type
 * of each traversal:
 *
 * ```ts
 * interface TraversalsObj<A> {
 *     readonly in: A[];
 *     readonly pre: A[];
 *     readonly post: A[];
 * }
 *
 * function traversalsKeyed<A>(tree: Tree<A>): Eval<TraversalsObj<A>> {
 *     return Eval.gather({
 *         in: inOrder(tree),
 *         pre: preOrder(tree),
 *         post: postOrder(tree),
 *     });
 * }
 *
 * console.log(JSON.stringify(traversalsKeyed(oneToSeven).run()));
 *
 * // {"in":[1,2,3,4,5,6,7],"pre":[4,2,1,3,6,5,7],"post":[1,3,2,5,7,6,4]}
 * ```
 *
 * Or, perhaps we want to return a Map instead:
 *
 * ```ts
 * function traversalsMap(tree: Tree<A>): Eval<Map<string, A[]>> {
 *     return Eval.go(function* () {
 *         const results = new Map<string, A[]>();
 *
 *         results.set("in", yield* inOrder(tree));
 *         results.set("pre", yield* preOrder(tree));
 *         results.set("post", yield* postOrder(tree));
 *
 *         return results;
 *     });
 * }
 *
 * console.log(JSON.stringify(traversalsMap(oneToSeven).map(Array.from).run()));
 *
 * // [["in",[1,2,3,4,5,6,7]],["pre",[4,2,1,3,6,5,7]],["post",[1,3,2,5,7,6,4]]]
 * ```
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
        gen: Iterator<[Eval<any>], A>,
        nxt: IteratorResult<[Eval<any>], A>,
    ): Eval<A> {
        if (nxt.done) {
            return Eval.now(nxt.value);
        }
        return nxt.value[0].flatMap((x) => Eval.#step(gen, gen.next(x)));
    }

    /**
     * Construct an Eval using a generator comprehension.
     */
    static go<A>(f: () => Generator<[Eval<any>], A, any>): Eval<A> {
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
            return results as Eval.ResultsT<T>;
        });
    }

    /**
     * Evaluate the Evals in a Record or an object literal and collect the
     * results in a Record or an object literal, respectively.
     */
    static gather<T extends Record<any, Eval<any>>>(
        evals: T,
    ): Eval<{ [K in keyof T]: Eval.ResultT<T[K]> }> {
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
    *[Symbol.iterator](): Iterator<[Eval<A>], A, unknown> {
        return (yield [this]) as A;
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
            }
        }
    }
}

export namespace Eval {
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
