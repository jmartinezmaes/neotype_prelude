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
 * `Eval<T>` is a type that controls the execution of a synchronous computation
 * that returns an *outcome* `T`. `Eval` can suspend and memoize evaluation for
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
 * -   An `Eval<T>` implements `Semigroup` when `T` implements `Semigroup`.
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
 *     -   `Eval<T>[]` becomes `Eval<T[]>`
 *     -   `[Eval<T1>, Eval<T2>]` becomes `Eval<[T1, T2]>`
 * -   `gather` turns a record or an object literal of `Eval` elements inside
 *     out. For example:
 *     -   `Record<string, Eval<T>>` becomes `Eval<Record<string, T>>`
 *     -   `{ x: Eval<T1>, y: Eval<T2> }` becomes `Eval<{ x: T1, y: T2 }>`
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
 * type Tree<T> = Emtpty | Branch<T>;
 *
 * interface Empty {
 *     readonly kind: "EMPTY";
 * }
 *
 * interface Branch<out T> {
 *     readonly kind: "BRANCH";
 *     readonly val: T;       // value
 *     readonly lst: Tree<T>; // left subtree
 *     readonly rst: Tree<T>; // right subtree
 * }
 *
 * const empty: Tree<never> = { kind: "EMPTY" };
 *
 * function branch<T>(val: T, lst: Tree<T>, rst: Tree<T>): Tree<T> {
 *     return { kind: "BRANCH", val, lst, rst };
 * }
 *
 * function foldTree<T, TAcc>(
 *     tree: Tree<T>,
 *     ifEmpty: TAcc,
 *     foldBranch: (val: T, lhs: TAcc, rhs: TAcc) => TAcc
 * ): Eval<TAcc> {
 *     if (tree.kind === "EMPTY") {
 *         return Eval.now(ifEmpty);
 *     }
 *     // Challenge for the reader: why is `defer` needed here?
 *     // Hint: it pertains to stack safety and eager evaluation.
 *     return Eval.defer(() =>
 *         foldTree(tree.lst, ifEmpty, foldBranch).flatMap((lhs) =>
 *             foldTree(tree.rst, ifEmpty, foldBranch).map((rhs) =>
 *                 foldBranch(tree.val, lhs, rhs),
 *             ),
 *         ),
 *     );
 * }
 *
 * function inOrder<T>(tree: Tree<T>): Eval<T[]> {
 *     return foldTree(
 *         tree,
 *         [] as T[],
 *         (val, lhs, rhs) => [...lhs, val, ...rhs],
 *     );
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
 * function foldTree<T, TAcc>(
 *     tree: Tree<T>,
 *     ifEmpty: TAcc,
 *     foldBranch: (val: T, lhs: TAcc, rhs: TAcc) => TAcc
 * ): Eval<TAcc> {
 *     return Eval.go(function* () {
 *         if (tree.kind === "EMPTY") {
 *             return ifEmpty;
 *         }
 *         // Challenge for the reader: why is `defer` not needed here?
 *         // Hint: it pertains to the behavior of `go`.
 *         const lhs = yield* foldTree(tree.lst, ifEmpty, foldBranch);
 *         const rhs = yield* foldTree(tree.rst, ifEmpty, foldBranch);
 *         return foldBranch(tree.val, lhs, rhs);
 *     });
 * }
 * ```
 *
 * Suppose we wanted to traverse a tree in multiple ways and collect the results
 * of each traversal. We may write the following:
 *
 * ```ts
 * function preOrder<T>(tree: Tree<T>): Eval<T[]> {
 *     return foldTree(
 *         tree,
 *         [] as T[],
 *         (val, lhs, rhs) => [val, ...lhs, ...rhs],
 *     );
 * }
 *
 * function postOrder<T>(tree: Tree<T>): Eval<T[]> {
 *     return foldTree(
 *         tree,
 *         [] as T[],
 *         (val, lhs, rhs) => [...lhs, ...rhs, val],
 *     );
 * }
 *
 * type Traversals<T> = [in: T[], pre: T[], post: T[]];
 *
 * function traversals<T>(tree: Tree<T>): Eval<Traversals<T>> {
 *     return Eval.collect([
 *         inOrder(tree),
 *         preOrder(tree),
 *         postOrder(tree),
 *     ]);
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
 * interface TraversalsObj<T> {
 *     in: T[];
 *     pre: T[];
 *     post: T[];
 * }
 *
 * function traversalsKeyed<T>(tree: Tree<T>): Eval<TraversalsObj<T>> {
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
 * function traversalsMap(tree: Tree<T>): Eval<Map<string, T[]>> {
 *     return Eval.go(function* () {
 *         const results = new Map<string, T[]>();
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

import { MutStack } from "./_mut_stack.js";
import { cmb, Semigroup } from "./cmb.js";
import { id } from "./fn.js";

/**
 * A type that models a synchronous computation.
 */
export class Eval<out T> {
    /**
     * Construct an `Eval` eagerly from a value.
     */
    static now<T>(val: T): Eval<T> {
        return new Eval(Ixn.now(val));
    }

    /**
     * Construct an `Eval` lazily from a thunk, and memoize the value upon the
     * first evaluation.
     */
    static once<T>(f: () => T): Eval<T> {
        return new Eval(Ixn.once(f));
    }

    /**
     * Construct an `Eval` lazily from a thunk, and re-compute the value upon
     * every evaluation.
     */
    static always<T>(f: () => T): Eval<T> {
        return new Eval(Ixn.always(f));
    }

    /**
     * Construct an `Eval` from a function that returns another `Eval`.
     */
    static defer<T>(f: () => Eval<T>): Eval<T> {
        return Eval.now(undefined).flatMap(f);
    }

    static #step<TReturn>(
        gen: Iterator<Eval<any>, TReturn>,
        nxt: IteratorResult<Eval<any>, TReturn>,
    ): Eval<TReturn> {
        if (nxt.done) {
            return Eval.now(nxt.value);
        }
        return nxt.value.flatMap((val) => Eval.#step(gen, gen.next(val)));
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
     * const evalOne: Eval<number> = Eval.now(1);
     * const evalTimeMs: Eval<number> = Eval.always(() => Date.now());
     * const evalRand: Eval<number> = Eval.always(() => Math.random());
     *
     * const summed: Eval<number> = Eval.go(function* () {
     *     const one = yield* evalOne;
     *     const timeMs = yield* evalTimeMs;
     *     const rand = yield* evalRand;
     *
     *     return one + timeMs + rand;
     * });
     *
     * console.log(summed.run());
     * ```
     */
    static go<TReturn>(
        f: () => Generator<Eval<any>, TReturn, unknown>,
    ): Eval<TReturn> {
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
    static goFn<TArgs extends unknown[], TReturn>(
        f: (...args: TArgs) => Generator<Eval<any>, TReturn, unknown>,
    ): (...args: TArgs) => Eval<TReturn> {
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
    static reduce<T, TAcc>(
        vals: Iterable<T>,
        accum: (acc: TAcc, val: T) => Eval<TAcc>,
        initial: TAcc,
    ): Eval<TAcc> {
        return Eval.go(function* () {
            let acc = initial;
            for (const val of vals) {
                acc = yield* accum(acc, val);
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
     * -   `Eval<T>[]` becomes `Eval<T[]>`
     * -   `[Eval<T1>, Eval<T2>]` becomes `Eval<[T1, T2]>`
     */
    static collect<TEvals extends readonly Eval<any>[] | []>(
        evals: TEvals,
    ): Eval<{ [K in keyof TEvals]: Eval.ResultT<TEvals[K]> }> {
        return Eval.go(function* () {
            const results = new Array(evals.length);
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
     * -   `Record<string, Eval<T>>` becomes `Eval<Record<string, T>>`
     * -   `{ x: Eval<T1>, y: Eval<T2> }` becomes `Eval<{ x: T1, y: T2 }>`
     */
    static gather<TEvals extends Record<any, Eval<any>>>(
        evals: TEvals,
    ): Eval<{ [K in keyof TEvals]: Eval.ResultT<TEvals[K]> }> {
        return Eval.go(function* () {
            const results: Record<any, any> = {};
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
    static lift<TArgs extends unknown[], T>(
        f: (...args: TArgs) => T,
    ): (...evals: { [K in keyof TArgs]: Eval<TArgs[K]> }) => Eval<T> {
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
    *[Symbol.iterator](): Iterator<Eval<T>, T, unknown> {
        return (yield this) as T;
    }

    /**
     * Combine the outcomes of this and that `Eval` and return the result in an
     * `Eval`.
     */
    [Semigroup.cmb]<T extends Semigroup<T>>(
        this: Eval<T>,
        that: Eval<T>,
    ): Eval<T> {
        return this.zipWith(that, cmb);
    }

    /**
     * Apply a function to the outcome of this `Eval` to return another `Eval`.
     */
    flatMap<T1>(f: (val: T) => Eval<T1>): Eval<T1> {
        return new Eval(Ixn.flatMap(this, f));
    }

    /**
     * Apply a function to the outcomes of this and that `Eval` and return the
     * result in an `Eval`.
     */
    zipWith<T1, T2>(that: Eval<T1>, f: (lhs: T, rhs: T1) => T2): Eval<T2> {
        return this.flatMap((lhs) => that.map((rhs) => f(lhs, rhs)));
    }

    /**
     * Keep only the first outcome of this and that `Eval`, and return it in an
     * `Eval`.
     */
    zipFst(that: Eval<any>): Eval<T> {
        return this.zipWith(that, id);
    }

    /**
     * Keep only the second outcome of this and that `Eval`, and return it in an
     * `Eval`.
     */
    zipSnd<T1>(that: Eval<T1>): Eval<T1> {
        return this.flatMap(() => that);
    }

    /**
     * Apply a function to the outcome of this `Eval` and return the result
     * in an `Eval`.
     */
    map<T1>(f: (val: T) => T1): Eval<T1> {
        return this.flatMap((val) => Eval.now(f(val)));
    }

    /**
     * Evaluate this `Eval` to return its outcome.
     */
    run(): T {
        const conts = new MutStack<(val: any) => Eval<any>>();
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        let currentEval: Eval<any> = this;

        for (;;) {
            switch (currentEval.#ixn.kind) {
                case Ixn.Kind.NOW: {
                    const cont = conts.pop();
                    if (!cont) {
                        return currentEval.#ixn.val;
                    }
                    currentEval = cont(currentEval.#ixn.val);
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
     * Extract the outcome type `T` from the type `Eval<T>`.
     */
    // prettier-ignore
    export type ResultT<TEval extends Eval<any>> = 
        TEval extends Eval<infer T> ? T : never;
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
        readonly cont: (val: any) => Eval<any>;
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

    export function now<T>(val: T): Now {
        return { kind: Kind.NOW, val };
    }

    export function flatMap<T, T1>(
        ev: Eval<T>,
        cont: (val: T) => Eval<T1>,
    ): FlatMap {
        return { kind: Kind.FLAT_MAP, ev, cont };
    }

    export function once<T>(f: () => T): Once {
        return { kind: Kind.ONCE, f, isMemoized: false };
    }

    export function always<T>(f: () => T): Always {
        return { kind: Kind.ALWAYS, f };
    }
}
