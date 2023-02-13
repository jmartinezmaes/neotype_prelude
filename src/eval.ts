/*
 * Copyright 2022-2023 Josh Martinez
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
 * Control of synchronous execution.
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
 * -   `zipWith` applies a function to their outcomes.
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
 * The `go` static method evaluates a generator to return an `Eval`. Within the
 * generator, `Eval` values are yielded using the `yield*` keyword, allowing
 * their outcomes to be bound to specified variables. When the computation is
 * complete, the generator may return a final result and `go` returns the result
 * in an `Eval`.
 *
 * `Eval` is automatically deferred in its implementation of `go`. The body of
 * the provided generator does not execute until the `Eval` is evaluated using
 * `run`. This behavior helps ensure stack safety, especially for recursive
 * programs.
 *
 * ## Collecting into `Eval`
 *
 * These static methods turn a container of `Eval` elements "inside out" into an
 * `Eval` that contains an equivalent container of outcomes:
 *
 * -   `collect` turns an array or a tuple literal of `Eval` elements inside
 *     out. For example:
 *     -   `Eval<A>[]` becomes `Eval<A[]>`
 *     -   `[Eval<A>, Eval<B>]` becomes `Eval<[A, B]>`
 * -   `gather` turns a record or an object literal of `Eval` elements inside
 *     out. For example:
 *     -   `Record<string, Eval<A>>` becomes `Eval<Record<string, A>>`
 *     -   `{ x: Eval<A>, y: Eval<B> }` becomes `Eval<{ x: A, y: B }>`
 *
 * The `reduce` static method reduces a finite iterable from left to right in
 * the context of `Eval`. This is useful for mapping, filtering, and
 * accumulating values using `Eval`.
 *
 * ## Lifting functions to work with `Eval`
 *
 * The `lift` static method receives a function that accepts arbitrary
 * arguments, and returns an adapted function that accepts `Eval` values as
 * arguments instead. The arguments are evaluated from left to right, and then
 * the original function is applied to their outcomes and the result is returned
 * in an `Eval`.
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
 * type Tree<A> = Emtpty | Branch<A>;
 *
 * interface Empty {
 *     readonly kind: "EMPTY";
 * }
 *
 * interface Branch<out A> {
 *     readonly kind: "BRANCH";
 *     readonly val: A;       // value
 *     readonly lst: Tree<A>; // left subtree
 *     readonly rst: Tree<A>; // right subtree
 * }
 *
 * const empty: Tree<never> = { kind: "EMPTY" };
 *
 * function branch<A>(val: A, lst: Tree<A>, rst: Tree<A>): Tree<A> {
 *     return { kind: "BRANCH", val, lst, rst };
 * }
 *
 * function foldTree<A, B>(
 *     xs: Tree<A>,
 *     onEmpty: B,
 *     foldBranch: (val: A, l: B, r: B) => B
 * ): Eval<B> {
 *     if (xs.kind === "EMPTY") {
 *         return Eval.now(onEmpty);
 *     }
 *     // Challenge for the reader: why is `defer` needed here?
 *     // Hint: it pertains to stack safety and eager evaluation.
 *     return Eval.defer(() =>
 *         foldTree(xs.lst, onEmpty, foldBranch).flatMap((l) =>
 *             foldTree(xs.rst, onEmpty, foldBranch).map((r) =>
 *                 foldBranch(xs.val, l, r),
 *             ),
 *         ),
 *     );
 * }
 *
 * function inOrder<A>(xs: Tree<A>): Eval<A[]> {
 *     return foldTree(xs, [] as A[], (x, lxs, rxs) => [...lxs, x, ...rxs]);
 * }
 *
 * const oneToSeven: Tree<number> = branch(
 *     4,
 *     branch(2, branch(1, empty, empty), branch(3, empty, empty)),
 *     branch(6, branch(5, empty, empty), branch(7, empty, empty)),
 * );
 *
 * console.log(JSON.stringify(inOrder(oneToSeven).run()));
 *
 * // [1,2,3,4,5,6,7]
 * ```
 *
 * We can refactor the `foldTree` function to use a generator comprehension
 * instead:
 *
 * ```ts
 * function foldTree<A, B>(
 *     xs: Tree<A>,
 *     onEmpty: B,
 *     foldBranch: (val: A, l: B, r: B) => B
 * ): Eval<B> {
 *     return Eval.go(function* () {
 *         if (xs.kind === "EMPTY") {
 *             return onEmpty;
 *         }
 *         // Challenge for the reader: why is `defer` not needed here?
 *         // Hint: it pertains to the behavior of `go`.
 *         const l = yield* foldTree(xs.lst, onEmpty, foldBranch);
 *         const r = yield* foldTree(xs.rst, onEmpty, foldBranch);
 *         return foldBranch(xs.val, l, r);
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
        return new Eval(Ixn.now(x));
    }

    /**
     * Construct an `Eval` lazily from a thunk, and memoize the value upon the
     * first evaluation.
     */
    static once<A>(f: () => A): Eval<A> {
        return new Eval(Ixn.once(f));
    }

    /**
     * Construct an `Eval` lazily from a thunk, and re-compute the value upon
     * every evaluation.
     */
    static always<A>(f: () => A): Eval<A> {
        return new Eval(Ixn.always(f));
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
     *     never `yield` (without the `*`). Omitting the `*` inhibits proper
     *     type inference and may cause undefined behavior.
     * -   A `yield*` statement may bind a variable provided by the caller. The
     *     variable inherits the type of the outcome of the yielded `Eval`.
     * -   The `return` statement of the generator may return a final result,
     *     which is returned from `go` in an `Eval`.
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
     * Construct a function that returns an `Eval` using a generator
     * comprehension.
     *
     * @remarks
     *
     * This is the higher-order function variant of `go`.
     */
    static goFn<T extends unknown[], A>(
        f: (...args: T) => Generator<Eval<any>, A, unknown>,
    ): (...args: T) => Eval<A> {
        return (...args) =>
            Eval.defer(() => {
                const gen = f(...args);
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
     * remaining, and then return the final accumulator in an `Eval`.
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
     * Turn an array or a tuple literal of `Eval` elements "inside out".
     *
     * @remarks
     *
     * Evaluate the `Eval` elements in an array or a tuple literal from left to
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
            return results as any;
        });
    }

    /**
     * Turn a record or an object literal of `Eval` elements "inside out".
     *
     * @remarks
     *
     * Evaluate the `Eval` elements in a record or an object literal. Collect
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
            return results as any;
        });
    }

    /**
     * Lift a function into the context of `Eval`.
     *
     * @remarks
     *
     * Given a function that accepts arbitrary arguments, return an adapted
     * function that accepts `Eval` values as arguments. When applied, evaluate
     * the arguments from left to right, and then apply the original function to
     * their outcomes and return the result in an `Eval`.
     */
    static lift<T extends unknown[], A>(
        f: (...args: T) => A,
    ): (...evals: { [K in keyof T]: Eval<T[K]> }) => Eval<A> {
        return (...evals) => Eval.collect(evals).map((args) => f(...args));
    }

    /**
     * An instruction that builds an evaluation tree for `Eval`.
     */
    readonly #ixn: Ixn;

    private constructor(ixn: Ixn) {
        this.#ixn = ixn;
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
        return new Eval(Ixn.flatMap(this, f));
    }

    /**
     * Apply a function to the outcomes of this and that `Eval` and return the
     * result in an `Eval`.
     */
    zipWith<B, C>(that: Eval<B>, f: (x: A, y: B) => C): Eval<C> {
        return this.flatMap((x) => that.map((y) => f(x, y)));
    }

    /**
     * Keep only the first outcome of this and that `Eval`, and return it in an
     * `Eval`.
     */
    zipFst(that: Eval<any>): Eval<A> {
        return this.zipWith(that, id);
    }

    /**
     * Keep only the second outcome of this and that `Eval`, and return it in an
     * `Eval`.
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
        const conts = new MutStack<(x: any) => Eval<any>>();
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        let currentEval: Eval<any> = this;

        for (;;) {
            switch (currentEval.#ixn.kind) {
                case Ixn.Kind.NOW: {
                    const k = conts.pop();
                    if (!k) {
                        return currentEval.#ixn.val;
                    }
                    currentEval = k(currentEval.#ixn.val);
                    break;
                }

                case Ixn.Kind.FLAT_MAP:
                    conts.push(currentEval.#ixn.cont);
                    currentEval = currentEval.#ixn.ev;
                    break;

                case Ixn.Kind.ONCE:
                    if (!currentEval.#ixn.isMemoized) {
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        currentEval.#ixn.val = currentEval.#ixn.f!();
                        delete currentEval.#ixn.f;
                        currentEval.#ixn.isMemoized = true;
                    }
                    currentEval = Eval.now(currentEval.#ixn.val);
                    break;

                case Ixn.Kind.ALWAYS:
                    currentEval = Eval.now(currentEval.#ixn.f());
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

type Ixn = Ixn.Now | Ixn.FlatMap | Ixn.Once | Ixn.Always;

namespace Ixn {
    export const enum Kind {
        NOW,
        FLAT_MAP,
        ONCE,
        ALWAYS,
    }

    export interface Now {
        readonly kind: Kind.NOW;
        readonly val: any;
    }

    export interface FlatMap {
        readonly kind: Kind.FLAT_MAP;
        readonly ev: Eval<any>;
        readonly cont: (x: any) => Eval<any>;
    }

    export interface Once {
        readonly kind: Kind.ONCE;
        isMemoized: boolean;
        f?: () => any;
        val?: any;
    }

    export interface Always {
        readonly kind: Kind.ALWAYS;
        readonly f: () => any;
    }

    export function now<A>(val: A): Now {
        return { kind: Kind.NOW, val };
    }

    export function flatMap<A, B>(
        ev: Eval<A>,
        cont: (x: A) => Eval<B>,
    ): FlatMap {
        return { kind: Kind.FLAT_MAP, ev, cont };
    }

    export function once<A>(f: () => A): Once {
        return { kind: Kind.ONCE, f, isMemoized: false };
    }

    export function always<A>(f: () => A): Always {
        return { kind: Kind.ALWAYS, f };
    }
}
