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
import { id } from "./functions.js";
import { MutStack } from "./internal/mut_stack.js";

/**
 * An `Eval<A>` models a synchronous computation that produces a value `A`. Eval
 * provides control over synchronous execution and can defer, memoize, and
 * compose computations.
 */
export class Eval<out A> {
  /**
   * The unique identifier for Eval.
   */
  static readonly uid = Symbol("@neotype/prelude/Eval/uid");

  /**
   * @internal
   */
  readonly i: Instr;

  /**
   * @internal
   */
  constructor(i: Instr) {
    this.i = i;
  }

  /**
   * Defining iterable behavior for Eval allows TypeScript to infer result
   * types when `yield*`ing Evals in generator comprehensions.
   *
   * @hidden
   */
  *[Symbol.iterator](): Iterator<readonly [Eval<A>, Eval.Uid], A, unknown> {
    return (yield [this, Eval.uid]) as A;
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
    return _flatMap(this, f);
  }

  /**
   * If this Eval's result is an Eval, flatten this Eval.
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
   * Evaluate this Eval then that Eval and keep only this Eval's result.
   */
  zipFst(that: Eval<any>): Eval<A> {
    return this.zipWith(that, id);
  }

  /**
   * Evaluate this Eval then that Eval and keep only that Eval's result.
   */
  zipSnd<B>(that: Eval<B>): Eval<B> {
    return this.flatMap(() => that);
  }

  /**
   * Apply a function to this Eval's result.
   */
  map<B>(f: (a: A) => B): Eval<B> {
    return this.flatMap((x) => evalNow(f(x)));
  }

  /**
   * Overwrite this Eval's result.
   */
  mapTo<B>(value: B): Eval<B> {
    return this.flatMap(() => evalNow(value));
  }
}

export namespace Eval {
  /**
   * The unique identifier for Eval.
   */
  export type Uid = typeof Eval.uid;

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
   * type T3 = Eval.ResultsT<T0>; // { x: 1, y: 2, z: 3 }
   * ```
   */
  export type ResultsT<
    T extends readonly Eval<any>[] | Record<any, Eval<any>>,
  > = { [K in keyof T]: T[K] extends Eval<infer A> ? A : never };
}

/**
 * Construct an Eval whose value is resolved immediately.
 */
export function evalNow<A>(x: A): Eval<A> {
  return new Eval({ t: Instr.Tag.Now, x });
}

/**
 * Construct an Eval from a thunk; the produced value will be memoized upon
 * first evaluation.
 */
export function evalOnce<A>(f: () => A): Eval<A> {
  return new Eval({ t: Instr.Tag.Once, f, d: false });
}

/**
 * Construct an eval from a thunk; the value will be reproduced on every
 * evaluation.
 */
export function evalAlways<A>(f: () => A): Eval<A> {
  return new Eval({ t: Instr.Tag.Always, f });
}

/**
 * Construct an Eval from a function that produces an Eval.
 */
export function deferEval<A>(f: () => Eval<A>): Eval<A> {
  return evalNow(undefined).flatMap(f);
}

/**
 * Run an Eval to extract its result.
 */
export function runEval<A>(ev: Eval<A>): A {
  type Bind = (x: any) => Eval<any>;
  const ks = new MutStack<Bind>();
  let c: Eval<any> = ev;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    // prettier-ignore
    switch (c.i.t) {
       case Instr.Tag.Now: {
         const k = ks.pop();
         if (!k) {
           return c.i.x;
         }
         c = k(c.i.x);
       } break;
 
       case Instr.Tag.FlatMap: {
         ks.push(c.i.f);
         c = c.i.eff;
       } break;
 
       case Instr.Tag.Once: {
         if (!c.i.d) {
           // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
           c.i.x = c.i.f!();
           delete c.i.f;
           c.i.d = true;
         }
         c = evalNow(c.i.x);
       } break;
 
       case Instr.Tag.Always: {
         c = evalNow(c.i.f());
       } break;
     }
  }
}

function step<A>(
  nxs: Iterator<readonly [Eval<any>, Eval.Uid], A>,
  nx: IteratorResult<readonly [Eval<any>, Eval.Uid], A>,
): Eval<A> {
  if (nx.done) {
    return evalNow(nx.value);
  }
  return nx.value[0].flatMap((x) => step(nxs, nxs.next(x)));
}

function doImpl<A>(
  nxs: Generator<readonly [Eval<any>, Eval.Uid], A, any>,
): Eval<A> {
  return step(nxs, nxs.next());
}

/**
 * Construct an Eval using a generator comprehension.
 */
export function doEval<A>(
  f: () => Generator<readonly [Eval<any>, Eval.Uid], A, any>,
): Eval<A> {
  return deferEval(() => doImpl(f()));
}

/**
 * Reduce an iterable from left to right in the context of Eval.
 *
 * The iterable must be finite.
 */
export function reduceEval<A, B>(
  xs: Iterable<A>,
  f: (acc: B, x: A) => Eval<B>,
  z: B,
): Eval<B> {
  return doEval(function* () {
    let acc = z;
    for (const x of xs) {
      acc = yield* f(acc, x);
    }
    return acc;
  });
}

/**
 * Map each element of an iterable to an Eval, then evaluate the Evals from left
 * to right and collect the results in an array.
 *
 * The iterable must be finite.
 */
export function traverseEval<A, B>(
  xs: Iterable<A>,
  f: (x: A) => Eval<B>,
): Eval<readonly B[]> {
  return doEval(function* () {
    const ys: B[] = [];
    for (const x of xs) {
      ys.push(yield* f(x));
    }
    return ys;
  });
}

/**
 * Evaluate the evals in an array or a tuple literal from left to right and
 * collect the results in an array or a tuple literal, respectively.
 */
export function zipEval<T extends readonly Eval<any>[]>(
  xs: T,
): Eval<Eval.ResultsT<T>> {
  return doEval(function* () {
    const l = xs.length;
    const ys = new Array(l);
    for (let ix = 0; ix < l; ix++) {
      ys[ix] = yield* xs[ix];
    }
    return ys as unknown as Eval.ResultsT<T>;
  });
}

/**
 * Evaluate a series of Evals from left to right and collect the results in a
 * tuple literal.
 */
export function tupledEval<T extends [Eval<any>, Eval<any>, ...Eval<any>[]]>(
  ...xs: T
): Eval<Eval.ResultsT<T>> {
  return zipEval(xs);
}

/**
 * Evalute the Evals in an object literal and collect the results in an object
 * literal.
 */
export function gatherEval<T extends Record<any, Eval<any>>>(
  xs: T,
): Eval<{ readonly [K in keyof T]: Eval.ResultT<T[K]> }> {
  return doEval(function* () {
    const ys: Record<any, unknown> = {};
    for (const [kx, x] of Object.entries(xs)) {
      ys[kx] = yield* x;
    }
    return ys as Eval.ResultsT<T>;
  });
}

/**
 * Lift a function of any arity into the context of Eval.
 */
export function liftEval<T extends unknown[], A>(
  f: (...args: T) => A,
): (...args: { [K in keyof T]: Eval<T[K]> }) => Eval<A> {
  return (...args) => zipEval(args).map((xs) => f(...(xs as T)));
}

/**
 * Lift a function that accepts an object literal of named arguments into the
 * context of Eval.
 */
export function liftNamedEval<T extends Record<any, unknown>, A = T>(
  f: (args: T) => A,
): (args: { [K in keyof T]: Eval<T[K]> }) => Eval<A> {
  return (args) => gatherEval(args).map((xs) => f(xs));
}

/**
 * Lift a constructor function of any arity into the context of Eval.
 */
export function liftNewEval<T extends unknown[], A>(
  ctor: new (...args: T) => A,
): (...args: { [K in keyof T]: Eval<T[K]> }) => Eval<A> {
  return (...args) => zipEval(args).map((xs) => new ctor(...(xs as T)));
}

function _flatMap<A, B>(eff: Eval<A>, f: (x: A) => Eval<B>): Eval<B> {
  return new Eval({ t: Instr.Tag.FlatMap, eff, f });
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
}
