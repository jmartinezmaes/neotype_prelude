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
 * ## Chaining `Eval`
 *
 * These methods act on the outcome of an `Eval` to produce another `Eval`:
 *
 * -   `andThen` applies a function to the outcome to return another `Eval`.
 * -   `andThenGo` applies a synchronous generator comprehension function to the
 *     outcome and evaluates the generator to return another `Eval`.
 * -   `and` ignores the outcome and returns another `Eval`.
 * -   `zipWith` evaluates another `Eval` and applies a function to both
 *     outcomes.
 *
 * ## Generator comprehenshions
 *
 * Generator comprehensions provide an imperative syntax for chaining together
 * synchronous computations that return `Eval` values.
 *
 * ### Writing comprehensions
 *
 * Comprehensions are written using `function*` declarations. Generator
 * functions should use the `Eval.Go` type alias as their return type. A
 * generator function that returns an `Eval.Go<T>` may `yield*` zero or more
 * `Eval<any>` values and must return a result of type `T`. Comprehensions may
 * also `yield*` other `Eval.Go` generators directly.
 *
 * Each `yield*` expression may bind a variable of the outcome value type of the
 * yielded `Eval`. Comprehensions should always use `yield*` instead of `yield`.
 * Using `yield*` allows TypeScript to accurately infer the outcome value type
 * of the yielded `Eval` when binding the value of each `yield*` expression.
 *
 * ### Evaluating comprehensions
 *
 * `Eval.Go` generators must be evaluated before accessing their results. The
 * `go` function evaluates an `Eval.Go<T>` generator to return an `Eval<T>`.
 *
 * ## Collecting into `Eval`
 *
 * These static methods turn a container of `Eval` elements "inside out" into an
 * `Eval` that contains an equivalent container of outcomes:
 *
 * -   `all` turns an array or a tuple literal of `Eval` elements inside out.
 *     For example:
 *     -   `Eval<T>[]` becomes `Eval<T[]>`
 *     -   `[Eval<T1>, Eval<T2>]` becomes `Eval<[T1, T2]>`
 * -   `allProps` turns a string-keyed record or object literal of `Eval`
 *     elements inside out. For example:
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
 *         foldTree(tree.lst, ifEmpty, foldBranch).andThen((lhs) =>
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
 *     return Eval.all([
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
 *     return Eval.allProps({
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
 * @module
 */

import { Semigroup, cmb } from "./cmb.js";

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
		return Eval.now(undefined).andThen(f);
	}

	static #step<TReturn>(
		gen: Iterator<Eval<any>, TReturn>,
		nxt: IteratorResult<Eval<any>, TReturn>,
	): Eval<TReturn> {
		if (nxt.done) {
			return Eval.now(nxt.value);
		}
		return nxt.value.andThen((val) => Eval.#step(gen, gen.next(val)));
	}

	/**
	 * Evaluate an `Eval.Go` generator to return an `Eval`.
	 */
	static go<TReturn>(gen: Eval.Go<TReturn>): Eval<TReturn> {
		return Eval.defer(() => Eval.#step(gen, gen.next()));
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
		return Eval.go(
			(function* () {
				let acc = initial;
				for (const val of vals) {
					acc = yield* accum(acc, val);
				}
				return acc;
			})(),
		);
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
	static all<TEvals extends readonly Eval<any>[] | []>(
		evals: TEvals,
	): Eval<{ -readonly [K in keyof TEvals]: Eval.ResultT<TEvals[K]> }> {
		return Eval.go(
			(function* () {
				const results = new Array(evals.length);
				for (const [idx, ev] of evals.entries()) {
					results[idx] = yield* ev;
				}
				return results as any;
			})(),
		);
	}

	/**
	 * Turn a string-keyed record or object literal of `Eval` elements "inside
	 * out".
	 *
	 * @remarks
	 *
	 * Enumerate an object's own enumerable, string-keyed property key-`Eval`
	 * pairs. Return an `Eval` that contains an object of the keys and their
	 * associated outcomes.
	 *
	 * For example:
	 *
	 * -   `Record<string, Eval<T>>` becomes `Eval<Record<string, T>>`
	 * -   `{ x: Eval<T1>, y: Eval<T2> }` becomes `Eval<{ x: T1, y: T2 }>`
	 */
	static allProps<TEvals extends Record<string, Eval<any>>>(
		evals: TEvals,
	): Eval<{ -readonly [K in keyof TEvals]: Eval.ResultT<TEvals[K]> }> {
		return Eval.go(
			(function* () {
				const results: Record<string, any> = {};
				for (const [key, ev] of Object.entries(evals)) {
					results[key] = yield* ev;
				}
				return results as any;
			})(),
		);
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
		return (...evals) => Eval.all(evals).map((args) => f(...args));
	}

	/**
	 * An instruction that builds an evaluation tree for `Eval`.
	 */
	readonly #ixn: Ixn;

	private constructor(ixn: Ixn) {
		this.#ixn = ixn;
	}

	/**
	 * Return an `Eval.Go` generator that yields this `Eval` and returns its
	 * its outcome. This allows `Eval` values to be yielded directly in `Eval`
	 * generator comprehensions using `yield*`.
	 */
	*[Symbol.iterator](): Generator<Eval<T>, T, unknown> {
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
	andThen<T1>(f: (val: T) => Eval<T1>): Eval<T1> {
		return new Eval(Ixn.andThen(this, f));
	}

	/**
	 * Apply a generator comprehension function to the outcome of this `Eval`
	 * and evaluate the `Eval.Go` generator to return another `Eval`.
	 */
	andThenGo<T1>(f: (val: T) => Eval.Go<T1>): Eval<T1> {
		return this.andThen((val) => Eval.go(f(val)));
	}

	/**
	 * Keep only the second outcome of this and that `Eval`, and return it in an
	 * `Eval`.
	 */
	and<T1>(that: Eval<T1>): Eval<T1> {
		return this.andThen(() => that);
	}

	/**
	 * Apply a function to the outcomes of this and that `Eval` and return the
	 * result in an `Eval`.
	 */
	zipWith<T1, T2>(that: Eval<T1>, f: (lhs: T, rhs: T1) => T2): Eval<T2> {
		return this.andThen((lhs) => that.map((rhs) => f(lhs, rhs)));
	}

	/**
	 * Apply a function to the outcome of this `Eval` and return the result
	 * in an `Eval`.
	 */
	map<T1>(f: (val: T) => T1): Eval<T1> {
		return this.andThen((val) => Eval.now(f(val)));
	}

	/**
	 * Evaluate this `Eval` to return its outcome.
	 */
	run(): T {
		type Cont = (val: any) => Eval<any>;
		type Stack = [Cont, Stack] | undefined;
		let stack: Stack;
		// eslint-disable-next-line @typescript-eslint/no-this-alias
		let currentEval: Eval<any> = this;

		for (;;) {
			switch (currentEval.#ixn.kind) {
				case Ixn.Kind.NOW: {
					if (!stack) {
						return currentEval.#ixn.val;
					}
					const [cont, rest] = stack;
					currentEval = cont(currentEval.#ixn.val);
					stack = rest;
					break;
				}

				case Ixn.Kind.AND_THEN:
					stack = [currentEval.#ixn.cont, stack];
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
	 * A generator that yields `Eval` values and returns a result.
	 *
	 * @remarks
	 *
	 * `Eval` generator comprehensions should use this type alias as their
	 * return type. A generator function that returns an `Eval.Go<T>` may
	 * `yield*` zero or more `Eval<any>` values and must return a result of type
	 * `T`. Comprehensions may also `yield*` other `Eval.Go` generators
	 * directly.
	 */
	export type Go<TReturn> = Generator<Eval<unknown>, TReturn, unknown>;

	/**
	 * Extract the outcome type `T` from the type `Eval<T>`.
	 */
	export type ResultT<TEval extends Eval<any>> = TEval extends Eval<infer T>
		? T
		: never;
}

type Ixn = Ixn.Now | Ixn.AndThen | Ixn.Once | Ixn.Always;

namespace Ixn {
	export const enum Kind {
		NOW,
		AND_THEN,
		ONCE,
		ALWAYS,
	}

	export interface Now {
		readonly kind: Kind.NOW;
		readonly val: any;
	}

	export interface AndThen {
		readonly kind: Kind.AND_THEN;
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

	export function andThen<T, T1>(
		ev: Eval<T>,
		cont: (val: T) => Eval<T1>,
	): AndThen {
		return { kind: Kind.AND_THEN, ev, cont };
	}

	export function once<T>(f: () => T): Once {
		return { kind: Kind.ONCE, f, isMemoized: false };
	}

	export function always<T>(f: () => T): Always {
		return { kind: Kind.ALWAYS, f };
	}
}
