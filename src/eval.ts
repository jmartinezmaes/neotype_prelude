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
 * @remarks
 *
 * `Eval<A>` is a type that controls the execution of a synchronous computation
 * that returns an *outcome* `A`. `Eval` can suspend and memoize evaluation for
 * a variety of use cases, and it provides stack-safe execution for recursive
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
 * There are four static methods for constructing an `Eval`:
 *
 * -   `now` for eager, memoized evaluation of a value;
 * -   `once` for lazy, memoized evaluation of a value;
 * -   `always` for lazy, non-memoized evaluation of a value; and
 * -   `defer` for suspended evaluation of another `Eval`.
 *
 * ## Running computations
 *
 * The `run` method evaluates an `Eval` and returns its outcome.
 *
 * ## `Eval` as a semigroup
 *
 * `Eval` has the following behavior as a semigroup:
 *
 * -   An `Eval<A>` implements `Semigroup` when `A` implements `Semigroup`.
 * -   When combined, their outcomes are combined and the result is returned
 *     in an `Eval`.
 *
 * ## Transforming values
 *
 * The `map` method applies a function to outcome of an `Eval` and returns the
 * result in an `Eval`.
 *
 * These methods combine the outcomes of two `Eval` values and return the result
 * in an `Eval`:
 *
 * -   `zipWith` applies a function to the outcomes.
 * -   `zipFst` keeps only the first outcome, and discards the second.
 * -   `zipSnd` keeps only the second outcome, and discards the first.
 *
 * ## Chaining `Eval`
 *
 * The `flatMap` method chains together computations that return `Eval`. A
 * function is applied to the outcome of one `Eval` to return another `Eval`.
 * Composition with `flatMap` is stack safe, even for recursive programs.
 *
 * ### Generator comprehensions
 *
 * Generator comprehensions provide an imperative syntax for chaining together
 * computations that return `Eval`. Instead of `flatMap`, a generator is used
 * to apply functions to the the outcomes of `Eval` values.
 *
 * The `go` function evaluates a generator to return an `Eval`. Within the
 * generator, `Eval` values are yielded using the `yield*` keyword, allowing
 * their outcomes to be bound to specified variables. When the computation is
 * complete, a final result can be computed and returned from the generator and
 * is wrapped in an `Eval`.
 *
 * `Eval` is automatically deferred in its implementation of `go`. The body of
 * the provided generator will not run until the `Eval` is evaluated using
 * `run`. This behavior helps ensure stack safety, especially for recursive
 * programs.
 *
 * ## Collecting into `Eval`
 *
 * Sometimes, a collection of `Eval` values must be turned "inside out" into an
 * `Eval` that contains an equivalent collection of outcomes.
 *
 * These methods will traverse a collection of `Eval` values to extract their
 * outcomes:
 *
 * -   `collect` turns an array or a tuple literal of `Eval` values inside out.
 *     For example:
 *     -   `Eval<A>[]` becomes `Eval<A[]>`
 *     -   `[Eval<A>, Eval<B>]` becomes `Eval<[A, B]>`
 * -   `gather` turns a record or an object literal of `Eval` values inside out.
 *     For example:
 *     -   `Record<string, Eval<A>>` becomes `Eval<Record<string, A>>`
 *     -   `{ x: Eval<A>, y: Eval<B> }` becomes `Eval<{ x: A, y: B }>`
 *
 * The `reduce` function reduces a finite iterable from left to right in the
 * context of `Eval`. This is useful for mapping, filtering, and accumulating
 * values using `Eval`.
 *
 * ## Lifting functions to work with `Eval`
 *
 * The `lift` function receives a function that accepts arbitrary arguments, and
 * returns an adapted function that accepts `Eval` values as arguments instead.
 * The arguments are evaluated from left to right, then the original function is
 * applied to their outcomes and the result is returned in an `Eval`.
 *
 * @example Recursive folds with `Eval`
 *
 * First, the necessary imports:
 *
 * ```ts
 * import { Eval } from "@neotype/prelude/eval.js";
 * ```
 *
 * Now, consider a program that uses `Eval` to fold and traverse a recursive
 * `Tree` data structure:
 *
 * ```ts
 * type Tree<A> = Tip | Bin<A>;
 * type Tip = { typ: "Tip" };
 * type Bin<A> = {
 *     typ: "Bin",
 *     val: A,       // value
 *     lst: Tree<A>, // left subtree
 *     rst: Tree<A>, // right subtree
 * };
 *
 * const tip: Tree<never> = { typ: "Tip" };
 *
 * function bin<A>(val: A, lst: Tree<A>, rst: Tree<A>): Tree<A> {
 *     return { typ: "Bin", val, lst, rst };
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
 *         foldTree(xs.lst, onTip, foldBin).flatMap((l) =>
 *             foldTree(xs.rst, onTip, foldBin).map((r) =>
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
 *         const l = yield* foldTree(xs.lst, onTip, foldBin);
 *         const r = yield* foldTree(xs.rst, onTip, foldBin);
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
 * Or, perhaps we want to return a `Map` instead:
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
     * Construct an `Eval` eagerly from a value.
     */
    static now<A>(x: A): Eval<A> {
        return new Eval(Instr.now(x));
    }

    /**
     * Construct an `Eval` lazily from a thunk, and memoize the value upon the
     * first evaluation.
     */
    static once<A>(f: () => A): Eval<A> {
        return new Eval(Instr.once(f));
    }

    /**
     * Construct an `Eval` lazily from a thunk, and re-compute the value upon
     * every evaluation.
     */
    static always<A>(f: () => A): Eval<A> {
        return new Eval(Instr.always(f));
    }

    /**
     * Construct an `Eval` from a function that returns another `Eval`.
     */
    static defer<A>(f: () => Eval<A>): Eval<A> {
        return Eval.now(undefined).flatMap(f);
    }

    static #step<A>(
        gen: Iterator<Eval<any>, A>,
        nxt: IteratorResult<Eval<any>, A>,
    ): Eval<A> {
        if (nxt.done) {
            return Eval.now(nxt.value);
        }
        return nxt.value.flatMap((x) => Eval.#step(gen, gen.next(x)));
    }

    /**
     * Construct an `Eval` using a generator comprehension.
     *
     * @remarks
     *
     * The contract for generator comprehensions is as follows:
     *
     * -   The generator provided to `go` must only yield `Eval` values.
     * -   `Eval` values must only be yielded using the `yield*` keyword, and
     *     never `yield` (without the `*`). Omitting the `*` will result in poor
     *     type inference and undefined behavior.
     * -   A `yield*` statement may bind a variable provided by the caller. The
     *     variable inherits the type of the outcome of the yielded `Eval`.
     * -   The `return` statement of the generator may return a final computed
     *     value, which is returned from `go` in an `Eval`.
     * -   All syntax normally permitted in generators (statements, loops,
     *     declarations, etc.) is permitted within generator comprehensions.
     *
     * @example Basic yielding and returning
     *
     * Consider a comprehension that sums the outcomes of three `Eval` values:
     *
     * ```ts
     * import { Eval } from "@neotype/prelude/eval.js";
     *
     * const arg0: Eval<number> = Eval.now(1);
     * const arg1: Eval<number> = Eval.now(2);
     * const arg2: Eval<number> = Eval.now(3);
     *
     * const summed: Eval<number> = Eval.go(function* () {
     *     const x = yield* arg0;
     *     const y = yield* arg1;
     *     const z = yield* arg2;
     *
     *     return x + y + z;
     * });
     *
     * console.log(summed.run()); // 6
     * ```
     */
    static go<A>(f: () => Generator<Eval<any>, A, unknown>): Eval<A> {
        return Eval.defer(() => {
            const gen = f();
            return Eval.#step(gen, gen.next());
        });
    }

    /**
     * Reduce a finite iterable from left to right in the context of `Eval`.
     *
     * @remarks
     *
     * Start with an initial accumulator and reduce the elements of an iterable
     * using a reducer function that returns an `Eval`. Use the outcome of the
     * returned `Eval` as the new accumulator until there are no elements
     * remaining, then return the final accumulator in an `Eval`.
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
     * Turn an array or a tuple literal of `Eval` values "inside out".
     *
     * @remarks
     *
     * Evaluate the `Eval` values in an array or a tuple literal from left to
     * right. Collect their outcomes in an array or a tuple literal,
     * respectively, and return the result in an `Eval`.
     *
     * For example:
     *
     * -   `Eval<A>[]` becomes `Eval<A[]>`
     * -   `[Eval<A>, Eval<B>]` becomes `Eval<[A, B]>`
     */
    static collect<T extends readonly Eval<any>[]>(
        evals: T,
    ): Eval<{ [K in keyof T]: Eval.ResultT<T[K]> }> {
        return Eval.go(function* () {
            const results: unknown[] = new Array(evals.length);
            for (const [idx, ev] of evals.entries()) {
                results[idx] = yield* ev;
            }
            return results as { [K in keyof T]: Eval.ResultT<T[K]> };
        });
    }

    /**
     * Turn a record or an object literal of `Eval` values "inside out".
     *
     * @remarks
     *
     * Evaluate the `Eval` values in a record or an object literal. Collect
     * their outcomes in a record or an object literal, respectively, and return
     * the result in an `Eval`.
     *
     * For example:
     *
     * -   `Record<string, Eval<A>>` becomes `Eval<Record<string, A>>`
     * -   `{ x: Eval<A>, y: Eval<B> }` becomes `Eval<{ x: A, y: B }>`
     */
    static gather<T extends Record<any, Eval<any>>>(
        evals: T,
    ): Eval<{ [K in keyof T]: Eval.ResultT<T[K]> }> {
        return Eval.go(function* () {
            const results: Record<any, unknown> = {};
            for (const [key, ev] of Object.entries(evals)) {
                results[key] = yield* ev;
            }
            return results as { [K in keyof T]: Eval.ResultT<T[K]> };
        });
    }

    /**
     * Lift a function of any arity into the context of `Eval`.
     *
     * @remarks
     *
     * Given a function that accepts arbitrary arguments, return an adapted
     * function that accepts `Eval` values as arguments. When applied, evaluate
     * the arguments from left to right, then apply the original function to
     * their outcomes and return the result in an `Eval`
     */
    static lift<T extends readonly unknown[], A>(
        f: (...args: T) => A,
    ): (...evals: { [K in keyof T]: Eval<T[K]> }) => Eval<A> {
        return (...evals) => Eval.collect(evals).map((args) => f(...args));
    }

    /**
     * An instruction that builds an evaluation tree for `Eval`.
     */
    readonly #i: Instr;

    private constructor(i: Instr) {
        this.#i = i;
    }

    /**
     * Defining iterable behavior for `Eval` allows TypeScript to infer outcome
     * types when yielding `Eval` values in generator comprehensions using
     * `yield*`.
     *
     * @hidden
     */
    *[Symbol.iterator](): Iterator<Eval<A>, A, unknown> {
        return (yield this) as A;
    }

    [Semigroup.cmb]<A extends Semigroup<A>>(
        this: Eval<A>,
        that: Eval<A>,
    ): Eval<A> {
        return this.zipWith(that, cmb);
    }

    /**
     * Apply a function to the outcome of this `Eval` to return another `Eval`.
     */
    flatMap<B>(f: (x: A) => Eval<B>): Eval<B> {
        return new Eval(Instr.flatMap(this, f));
    }

    /**
     * If the outcome of this `Eval` is another `Eval`, return the inner `Eval`.
     */
    flat<A>(this: Eval<Eval<A>>): Eval<A> {
        return this.flatMap(id);
    }

    /**
     * Apply a function to the outcomes of this and that `Eval` and return the
     * result in an `Eval`.
     */
    zipWith<B, C>(that: Eval<B>, f: (x: A, y: B) => C): Eval<C> {
        return this.flatMap((x) => that.map((y) => f(x, y)));
    }

    /**
     * Evaluate this `Eval` and keep the outcome, then evaluate that `Eval` and
     * discard that outcome.
     */
    zipFst(that: Eval<any>): Eval<A> {
        return this.zipWith(that, id);
    }

    /**
     * Evaluate this `Eval` and discard the outcome, then evaluate that `Eval`
     * and keep that outcome.
     */
    zipSnd<B>(that: Eval<B>): Eval<B> {
        return this.flatMap(() => that);
    }

    /**
     * Apply a function to the outcome of this `Eval` and return the result
     * in an `Eval`.
     */
    map<B>(f: (a: A) => B): Eval<B> {
        return this.flatMap((x) => Eval.now(f(x)));
    }

    /**
     * Evaluate this `Eval` to return its outcome.
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

/**
 * The companion namespace for the `Eval` class.
 */
export namespace Eval {
    /**
     * Extract the outcome type `A` from the type `Eval<A>`.
     */
    // prettier-ignore
    export type ResultT<T extends Eval<any>> = 
        T extends Eval<infer A> ? A : never;
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
