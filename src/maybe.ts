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
 * Optional values.
 *
 * @module
 */

import { cmb, Semigroup } from "./cmb.js";
import {
  cmp,
  Eq,
  eq,
  equal,
  greater,
  less,
  Ord,
  type Ordering,
} from "./cmp.js";
import { id } from "./fn.js";

/**
 * A `Maybe<A>` models an optional value `A`. A Maybe can be a
 * {@link Maybe.Just Just} containing a value `A` or the singleton `Nothing`.
 *
 * When composed, Maybe will "short circuit" on the first encountered Nothing.
 */
export type Maybe<A> = Maybe.Nothing | Maybe.Just<A>;

export namespace Maybe {
  /**
   * The unique idenifier for Maybe.
   */
  export const uid = Symbol("@neotype/prelude/Maybe/uid");

  /**
   * The unique idenifier for Maybe.
   */
  export type Uid = typeof uid;

  /**
   * The unified syntax for Maybe.
   */
  export abstract class Syntax {
    /**
     * Test whether this and that Maybe are equal using Eq comparison.
     *
     * ```ts
     * eq (nothing , nothing ) ≡ true
     * eq (nothing , just (x)) ≡ false
     * eq (just (x), nothing ) ≡ false
     * eq (just (x), just (y)) ≡ eq (x, y)
     * ```
     */
    [Eq.eq]<A extends Eq<A>>(this: Maybe<A>, that: Maybe<A>): boolean {
      if (absent(this)) {
        return absent(that);
      }
      return present(that) && eq(this.value, that.value);
    }

    /**
     * Compare this and that Maybe using Ord comparison.
     *
     * ```ts
     * cmp (nothing , nothing ) ≡ equal
     * cmp (nothing , just (y)) ≡ less
     * cmp (just (x), nothing ) ≡ greater
     * cmp (just (x), just (y)) ≡ cmp (x, y)
     * ```
     */
    [Ord.cmp]<A extends Ord<A>>(this: Maybe<A>, that: Maybe<A>): Ordering {
      if (absent(this)) {
        return absent(that) ? equal : less;
      }
      return absent(that) ? greater : cmp(this.value, that.value);
    }

    /**
     * If this or that Maybe is absent, return the first non-absent Maybe. If
     * this and that are both present and their values are a Semigroup, combine
     * the values.
     *
     * ```ts
     * cmb (nothing , nothing ) ≡ nothing
     * cmb (nothing , just (y)) ≡ just (            y )
     * cmb (just (x), nothing ) ≡ just (         x    )
     * cmb (just (x), just (y)) ≡ just (cmb (x, y))
     * ```
     */
    [Semigroup.cmb]<A extends Semigroup<A>>(
      this: Maybe<A>,
      that: Maybe<A>,
    ): Maybe<A> {
      if (present(this)) {
        return present(that) ? just(cmb(this.value, that.value)) : this;
      }
      return that;
    }

    /**
     * Case analysis for Maybe.
     */
    fold<A, B, C>(
      this: Maybe<A>,
      foldL: () => B,
      foldR: (x: A, maybe: Just<A>) => C,
    ): B | C {
      return absent(this) ? foldL() : foldR(this.value, this);
    }

    /**
     * If this Maybe is present, extract its value; otherwise, produce a
     * fallback value.
     */
    getOrFold<A, B>(this: Maybe<A>, f: () => B): A | B {
      return this.fold(f, id);
    }

    /**
     * If this Maybe is present, extract its value; otherwise, return a fallback
     * value.
     */
    getOrElse<A, B>(this: Maybe<A>, fallback: B): A | B {
      return this.fold(() => fallback, id);
    }

    /**
     * If this Maybe is absent, return a fallback Maybe.
     */
    orElse<A, B>(this: Maybe<A>, that: Maybe<B>): Maybe<A | B> {
      return absent(this) ? that : this;
    }

    /**
     * If this Maybe is present, apply a function to its value to produce a new
     * Maybe.
     */
    flatMap<A, B>(this: Maybe<A>, f: (x: A) => Maybe<B>): Maybe<B> {
      return absent(this) ? this : f(this.value);
    }

    /**
     * If this Maybe contains another Maybe, flatten this Maybe.
     */
    flat<A>(this: Maybe<Maybe<A>>): Maybe<A> {
      return this.flatMap(id);
    }

    /**
     * If this and that Maybe are present, apply a function to thier values.
     */
    zipWith<A, B, C>(
      this: Maybe<A>,
      that: Maybe<B>,
      f: (x: A, y: B) => C,
    ): Maybe<C> {
      return this.flatMap((x) => that.map((y) => f(x, y)));
    }

    /**
     * If this and that Maybe are present, keep only this Maybe's value.
     */
    zipFst<A>(this: Maybe<A>, that: Maybe<any>): Maybe<A> {
      return this.zipWith(that, id);
    }

    /**
     * If this and that Maybe are present, keep only that Maybe's value.
     */
    zipSnd<B>(this: Maybe<any>, that: Maybe<B>): Maybe<B> {
      return this.flatMap(() => that);
    }

    /**
     * If this Maybe is present, apply a function to its value.
     */
    map<A, B>(this: Maybe<A>, f: (x: A) => B): Maybe<B> {
      return this.flatMap((x) => just(f(x)));
    }

    /**
     * If this Maybe is present, overwrite its value.
     */
    mapTo<B>(this: Maybe<any>, value: B): Maybe<B> {
      return this.flatMap(() => just(value));
    }
  }

  /**
   * An absent Maybe.
   */
  export class Nothing extends Syntax {
    /**
     * The property that discriminates Maybe.
     */
    readonly type = "Nothing";

    /**
     * The singleton instance of the absent Maybe.
     */
    static readonly singleton = new Nothing();

    /**
     * `Nothing` is not constructable; use the {@link nothing} constant instead.
     */
    private constructor() {
      super();
    }

    /**
     * Defining iterable behavior for Maybe allows TypeScript to infer present
     * value types when `yield*`ing Maybes in generator comprehensions.
     *
     * @hidden
     */
    *[Symbol.iterator](): Iterator<
      readonly [Maybe<never>, Uid],
      never,
      unknown
    > {
      return (yield [this, uid]) as never;
    }
  }

  /**
   * A present Maybe.
   */
  export class Just<out A> extends Syntax {
    /**
     * The property that discriminates Maybe.
     */
    readonly type = "Just";

    /**
     * Construct an instance of `Maybe.Just`.
     *
     * Explicit use of this constructor should be avoided; use the {@link just}
     * function instead.
     */
    constructor(readonly value: A) {
      super();
    }

    /**
     * Defining iterable behavior for Maybe allows TypeScript to infer present
     * value types when `yield*`ing Maybes in generator comprehensions.
     *
     * @hidden
     */
    *[Symbol.iterator](): Iterator<readonly [Maybe<A>, Uid], A, unknown> {
      return (yield [this, uid]) as A;
    }
  }

  /**
   * Extract the present type `A` from the type `Maybe<A>`.
   */
  // prettier-ignore
  export type JustT<T extends Maybe<any>> =
    T extends Maybe<infer A> ? A : never;

  /**
   * Given a tuple literal or an object literal of Maybe types, map over the
   * structure to produce a tuple literal or an object literal of the present
   * types.
   *
   * ```ts
   * type T0 = [Maybe<1>, Maybe<2>, Maybe<3>];
   * type T1 = Maybe.JustsT<T0>; // readonly [1, 2, 3]
   *
   * type T2 = { x: Maybe<1>, y: Maybe<2>, z: Maybe<3> };
   * type T3 = Maybe.JustsT<T2>; // { x: 1, y: 2, z: 3 }
   * ```
   */
  export type JustsT<
    T extends readonly Maybe<any>[] | Record<any, Maybe<any>>,
  > = { [K in keyof T]: T[K] extends Maybe<infer A> ? A : never };
}

/**
 * The absent Maybe.
 */
export const nothing = Maybe.Nothing.singleton as Maybe<never>;

/**
 * Construct a present Maybe.
 */
export function just<A>(x: A): Maybe<A> {
  return new Maybe.Just(x);
}

/**
 * Consruct a Maybe, converting null and undefined to nothing.
 */
export function fromMissing<A>(x: A | null | undefined): Maybe<A> {
  return x === null || x === undefined ? nothing : just(x);
}

/**
 * Adapt a function that may return null or undefined into a function that
 * returns a Maybe, converting null and undefined to nothing.
 */
export function maybeMissing<T extends unknown[], A>(
  f: (...args: T) => A | null | undefined,
): (...args: T) => Maybe<A> {
  return (...args) => fromMissing(f(...args));
}

/**
 * Apply a predicate function to a value. If the predicate returns true, return
 * a Just containing the value; otherwise return nothing.
 */
export function guardMaybe<A, A1 extends A>(
  x: A,
  f: (x: A) => x is A1,
): Maybe<A1>;

export function guardMaybe<A>(x: A, f: (x: A) => boolean): Maybe<A>;

export function guardMaybe<A>(x: A, f: (x: A) => boolean): Maybe<A> {
  return f(x) ? just(x) : nothing;
}

/**
 * Test whether a Maybe is absent.
 */
export function absent(maybe: Maybe<any>): maybe is Maybe.Nothing {
  return maybe.type === "Nothing";
}

/**
 * Test whether a Maybe is present.
 */
export function present<A>(maybe: Maybe<A>): maybe is Maybe.Just<A> {
  return maybe.type === "Just";
}

function doImpl<A>(
  nxs: Generator<readonly [Maybe<any>, Maybe.Uid], A, any>,
): Maybe<A> {
  let nx = nxs.next();
  while (!nx.done) {
    const x = nx.value[0];
    if (present(x)) {
      nx = nxs.next(x.value);
    } else {
      return x;
    }
  }
  return just(nx.value);
}

/**
 * Construct a Maybe using a generator comprehension.
 */
export function doMaybe<A>(
  f: () => Generator<readonly [Maybe<any>, Maybe.Uid], A, any>,
): Maybe<A> {
  return doImpl(f());
}

/**
 * Reduce an iterable from left to right in the context of Maybe.
 *
 * The iterable must be finite.
 */
export function reduceMaybe<A, B>(
  xs: Iterable<A>,
  f: (acc: B, x: A) => Maybe<B>,
  z: B,
): Maybe<B> {
  return doMaybe(function* () {
    let acc = z;
    for (const x of xs) {
      acc = yield* f(acc, x);
    }
    return acc;
  });
}

/**
 * Map each element of an iterable to a Maybe, then evaluate the Maybes from
 * left to right and collect the results in an array.
 *
 * The iterable must be finite.
 */
export function traverseMaybe<A, B>(
  xs: Iterable<A>,
  f: (x: A) => Maybe<B>,
): Maybe<readonly B[]> {
  return doMaybe(function* () {
    const ys: B[] = [];
    for (const x of xs) {
      ys.push(yield* f(x));
    }
    return ys;
  });
}

/**
 * Evaluate the Maybes in an array or a tuple literal from left to right and
 * collect the present values in an array or a tuple literal, respectively.
 */
export function zipMaybe<T extends readonly Maybe<any>[]>(
  xs: T,
): Maybe<Readonly<Maybe.JustsT<T>>> {
  return doMaybe(function* () {
    const l = xs.length;
    const ys = new Array(l);
    for (let ix = 0; ix < l; ix++) {
      ys[ix] = yield* xs[ix];
    }
    return ys as unknown as Maybe.JustsT<T>;
  });
}

/**
 * Evaluate a series of Maybes from left to right and collect the present values
 * in a tuple literal.
 */
export function tupledMaybe<
  T extends [Maybe<any>, Maybe<any>, ...Maybe<any>[]],
>(...xs: T): Maybe<Readonly<Maybe.JustsT<T>>> {
  return zipMaybe(xs);
}

/**
 * Evaluate the Maybes in an object literal and collect the present values in an
 * object literal.
 */
export function gatherMaybe<T extends Record<any, Maybe<any>>>(
  xs: T,
): Maybe<{ readonly [K in keyof T]: Maybe.JustT<T[K]> }> {
  return doMaybe(function* () {
    const ys: Record<any, unknown> = {};
    for (const [kx, x] of Object.entries(xs)) {
      ys[kx] = yield* x;
    }
    return ys as Maybe.JustsT<T>;
  });
}

/**
 * Lift a function of any arity into the context of Maybe.
 */
export function liftMaybe<T extends unknown[], A>(
  f: (...args: T) => A,
): (...args: { [K in keyof T]: Maybe<T[K]> }) => Maybe<A> {
  return (...args) => zipMaybe(args).map((xs) => f(...(xs as T)));
}

/**
 * Lift a function that accepts an object literal of named arguments into the
 * context of Maybe.
 */
export function liftNamedMaybe<T extends Record<any, unknown>, A = T>(
  f: (args: T) => A,
): (args: { [K in keyof T]: Maybe<T[K]> }) => Maybe<A> {
  return (args) => gatherMaybe(args).map((xs) => f(xs as T));
}

/**
 * Lift a constructor function of any arity into the context of Maybe.
 */
export function liftNewMaybe<T extends unknown[], A>(
  ctor: new (...args: T) => A,
): (...args: { [K in keyof T]: Maybe<T[K]> }) => Maybe<A> {
  return (...args) => zipMaybe(args).map((xs) => new ctor(...(xs as T)));
}

async function doAsyncImpl<A>(
  nxs: AsyncGenerator<readonly [Maybe<any>, Maybe.Uid], A, any>,
): Promise<Maybe<A>> {
  let nx = await nxs.next();
  while (!nx.done) {
    const x = nx.value[0];
    if (present(x)) {
      nx = await nxs.next(x.value);
    } else {
      return x;
    }
  }
  return just(nx.value);
}

/**
 * Construct a Promise that fulfills with a Maybe using an async generator
 * comprehension.
 */
export function doAsyncMaybe<A>(
  f: () => AsyncGenerator<readonly [Maybe<any>, Maybe.Uid], A, any>,
): Promise<Maybe<A>> {
  return doAsyncImpl(f());
}
