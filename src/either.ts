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
 * Disjoint sums and typed failures.
 *
 * @module
 */

import { cmb, Semigroup } from "./cmb.js";
import { cmp, Eq, eq, greater, less, Ord, type Ordering } from "./cmp.js";
import { id } from "./functions.js";

/**
 * An `Either<A, B>` models an "exclusive or" relationship between two values
 * `A` and `B`. An Either can be a {@link Either.Right Right} containing a value
 * `A`, or a {@link Either.Left Left} containing a value `B`.
 *
 * Either is sometimes used to represent a value which is either correct or an
 * error; convention dictates that the Right constructor is used to hold a
 * correct value, and the Left constructor is used to hold an error value.
 *
 * When composed, Either will "short circuit" on the first encountered Left
 * constructor. This behavior makes Either a useful data type for modelling
 * programs that may fail.
 */
export type Either<A, B> = Either.Left<A> | Either.Right<B>;

export namespace Either {
  /**
   * The unique identifier for Either.
   */
  export const uid = Symbol("@neotype/prelude/Either/uid");

  /**
   * The unique identifier for Either.
   */
  export type Uid = typeof uid;

  /**
   * The unified syntax for Either.
   */
  export abstract class Syntax {
    /**
     * Test whether this and that Either are equal using Eq comparison.
     *
     * ```ts
     * eq (left  (x), left  (y)) ≡ eq (x, y)
     * eq (left  (x), right (y)) ≡ false
     * eq (right (x), left  (y)) ≡ false
     * eq (right (x), right (y)) ≡ eq (x, y)
     * ```
     */
    [Eq.eq]<A extends Eq<A>, B extends Eq<B>>(
      this: Either<A, B>,
      that: Either<A, B>,
    ): boolean {
      if (leftsided(this)) {
        return leftsided(that) && eq(this.value, that.value);
      }
      return rightsided(that) && eq(this.value, that.value);
    }

    /**
     * Compare this and that Either using Ord comparison.
     *
     * ```ts
     * cmp (left  (x), left  (y)) ≡ cmp (x, y)
     * cmp (left  (x), right (y)) ≡ less
     * cmp (right (x), left  (y)) ≡ greater
     * cmp (right (x), right (y)) ≡ cmp (x, y)
     * ```
     */
    [Ord.cmp]<A extends Ord<A>, B extends Ord<B>>(
      this: Either<A, B>,
      that: Either<A, B>,
    ): Ordering {
      if (leftsided(this)) {
        return leftsided(that) ? cmp(this.value, that.value) : less;
      }
      return rightsided(that) ? cmp(this.value, that.value) : greater;
    }

    /**
     * If this and that Either are both rightsided and their values are a
     * Semigroup, combine the values.
     *
     * ```ts
     * cmb (left  (x), left  (y)) ≡ left  (         x    )
     * cmb (left  (x), right (y)) ≡ left  (         x    )
     * cmb (right (x), left  (y)) ≡ left  (            y )
     * cmb (right (x), right (y)) ≡ right (cmb (x, y))
     * ```
     */
    [Semigroup.cmb]<E, A extends Semigroup<A>>(
      this: Either<E, A>,
      that: Either<E, A>,
    ): Either<E, A> {
      return this.zipWith(that, cmb);
    }

    /**
     * Case analysis for Either.
     */
    fold<A, B, C, D>(
      this: Either<A, B>,
      foldL: (x: A, either: Left<A>) => C,
      foldR: (x: B, either: Right<B>) => D,
    ): C | D {
      return leftsided(this)
        ? foldL(this.value, this)
        : foldR(this.value, this);
    }

    /**
     * If this Either is leftsided, extract its value; otherwise, apply a
     * function to the right value.
     */
    leftOrFold<A, B, C>(
      this: Either<A, B>,
      f: (x: B, either: Right<B>) => C,
    ): A | C {
      return this.fold(id, f);
    }

    /**
     * If this Either is rightsided, extract its value; otherwise, apply a
     * function to the left value.
     */
    rightOrFold<A, B, C>(
      this: Either<A, B>,
      f: (x: A, either: Left<A>) => C,
    ): B | C {
      return this.fold(f, id);
    }

    /**
     * If this Either is leftsided, apply a function to its value to produce a
     * new Either.
     *
     * The equivalent of {@link flatMap} for leftsided values.
     */
    bindLeft<E, A, E1, B>(
      this: Either<E, A>,
      f: (x: E) => Either<E1, B>,
    ): Either<E1, A | B> {
      return leftsided(this) ? f(this.value) : this;
    }

    /**
     * If this Either is leftsided, return a fallback Either.
     */
    orElse<A, E1, B>(
      this: Either<any, A>,
      that: Either<E1, B>,
    ): Either<E1, A | B> {
      return this.bindLeft(() => that);
    }

    /**
     * If this Either is rightsided, apply a function to its value to produce a
     * new Either.
     */
    flatMap<E, A, E1, B>(
      this: Either<E, A>,
      f: (x: A) => Either<E1, B>,
    ): Either<E | E1, B> {
      return leftsided(this) ? this : f(this.value);
    }

    /**
     * If this Either's right value is an Either, flatten this Either.
     */
    flat<E, E1, A>(this: Either<E, Either<E1, A>>): Either<E | E1, A> {
      return this.flatMap(id);
    }

    /**
     * If this and that Either are rightsided, apply a function to their values.
     */
    zipWith<E, A, E1, B, C>(
      this: Either<E, A>,
      that: Either<E1, B>,
      f: (x: A, y: B) => C,
    ): Either<E | E1, C> {
      return this.flatMap((x) => that.map((y) => f(x, y)));
    }

    /**
     * If this and that Either are rightsided, keep only this Either's value.
     */
    zipFst<E, A, E1>(
      this: Either<E, A>,
      that: Either<E1, any>,
    ): Either<E | E1, A> {
      return this.zipWith(that, id);
    }

    /**
     * If this and that Either are rightsided, keep only that Either's value.
     */
    zipSnd<E, E1, B>(
      this: Either<E, any>,
      that: Either<E1, B>,
    ): Either<E | E1, B> {
      return this.flatMap(() => that);
    }

    /**
     * Apply one of two functions to this Either's value if this is leftsided
     * or rightsided, respectively.
     */
    bimap<A, B, C, D>(
      this: Either<A, B>,
      mapL: (x: A) => C,
      mapR: (x: B) => D,
    ): Either<C, D> {
      return leftsided(this) ? left(mapL(this.value)) : right(mapR(this.value));
    }

    /**
     * If this Either is leftsided, apply a function to its value.
     */
    mapLeft<A, B, C>(this: Either<A, B>, f: (x: A) => C): Either<C, B> {
      return this.bindLeft((x) => left(f(x)));
    }

    /**
     * If this Either is rightsided, apply a function to its value.
     */
    map<A, B, D>(this: Either<A, B>, f: (x: B) => D): Either<A, D> {
      return this.flatMap((x) => right(f(x)));
    }

    /**
     * If this Either is rightsided, overwrite its value.
     */
    mapTo<A, D>(this: Either<A, any>, value: D): Either<A, D> {
      return this.flatMap(() => right(value));
    }
  }

  /**
   * A leftsided Either.
   */
  export class Left<out A> extends Syntax {
    /**
     * The property that discriminates Either.
     */
    readonly type = "Left";

    /**
     * Construct an instance of `Either.Left`.
     *
     * Explicit use of this constructor should be avoided; use the {@link left}
     * function instead.
     */
    constructor(readonly value: A) {
      super();
    }

    /**
     * Defining iterable behavior for Either allows TypeScript to infer
     * rightsided value types when `yield*`ing Eithers in generator
     * comprehensions.
     *
     * @hidden
     */
    *[Symbol.iterator](): Iterator<
      readonly [Either<A, never>, Uid],
      never,
      unknown
    > {
      return (yield [this, uid]) as never;
    }
  }

  /**
   * A rightsided Either.
   */
  export class Right<out B> extends Syntax {
    /**
     * The property that discriminates Either.
     */
    readonly type = "Right";

    /**
     * Construct an instance of `Either.Right`.
     *
     * Explicit use of this constructor should be avoided; use the {@link right}
     * function instead.
     */
    constructor(readonly value: B) {
      super();
    }

    /**
     * Defining iterable behavior for Either allows TypeScript to infer
     * rightsided value types when `yield*`ing Eithers in generator
     * comprehensions.
     *
     * @hidden
     */
    *[Symbol.iterator](): Iterator<
      readonly [Either<never, B>, Uid],
      B,
      unknown
    > {
      return (yield [this, uid]) as B;
    }
  }

  /**
   * Extract the leftsided type `A` from the type `Either<A, B>`.
   */
  // prettier-ignore
  export type LeftT<T extends Either<any, any>> = 
    [T] extends [Either<infer A, any>] ? A : never;

  /**
   * Extract the rightsided type `B` from the type `Either<A, B>`.
   */
  // prettier-ignore
  export type RightT<T extends Either<any, any>> = 
    [T] extends [Either<any, infer B>] ? B : never;

  /**
   * Given a tuple literal or an object literal of Either types, map over the
   * structure to produce a tuple literal or an object literal of the rightsided
   * types.
   *
   * ```ts
   * type T0 = [Either<1, 2>, Either<3, 4>, Either<5, 6>];
   * type T1 = Either.RightsT<T0>; // [2, 4, 6]
   *
   * type T2 = { x: Either<1, 2>, y: Either<3, 4>, z: Either<5, 6> };
   * type T3 = Either.RightsT<T0>; // { x: 2, y: 4, z: 6 }
   * ```
   */
  export type RightsT<
    T extends readonly Either<any, any>[] | Record<any, Either<any, any>>,
  > = { [K in keyof T]: [T[K]] extends [Either<any, infer B>] ? B : never };
}

/**
 * Construct a leftsided Either with an optional type witness for the
 * rightsided value.
 */
export function left<A, B = never>(x: A): Either<A, B> {
  return new Either.Left(x);
}

/**
 * Construct a rightsided Either with an optional type witness for the
 * leftsided value.
 */
export function right<B, A = never>(x: B): Either<A, B> {
  return new Either.Right(x);
}

/**
 * Apply a predicate function to a value. If the predicate returns true, return
 * a Right containing the value; otherwise, return a Left containing the value.
 */
export function guardEither<A, A1 extends A>(
  x: A,
  f: (x: A) => x is A1,
): Either<Exclude<A, A1>, A1>;

export function guardEither<A>(x: A, f: (x: A) => boolean): Either<A, A>;

export function guardEither<A>(x: A, f: (x: A) => boolean): Either<A, A> {
  return f(x) ? right(x) : left(x);
}

/**
 * Test whether an Either is leftsided.
 */
export function leftsided<A>(either: Either<A, any>): either is Either.Left<A> {
  return either.type === "Left";
}

/**
 * Test whether an Either is rightsided.
 */
export function rightsided<B>(
  either: Either<any, B>,
): either is Either.Right<B> {
  return either.type === "Right";
}

function doImpl<T extends readonly [Either<any, any>, Either.Uid], A>(
  nxs: Generator<T, A, any>,
): Either<Either.LeftT<T[0]>, A> {
  let nx = nxs.next();
  while (!nx.done) {
    const x = nx.value[0];
    if (rightsided(x)) {
      nx = nxs.next(x.value);
    } else {
      return x;
    }
  }
  return right(nx.value);
}

/**
 * Construct an Either using a generator comprehension.
 */
export function doEither<T extends readonly [Either<any, any>, Either.Uid], A>(
  f: () => Generator<T, A, any>,
): Either<Either.LeftT<T[0]>, A> {
  return doImpl(f());
}

/**
 * Reduce an iterable from left to right in the context of Either.
 *
 * The iterable must be finite.
 */
export function reduceEither<A, B, E>(
  xs: Iterable<A>,
  f: (acc: B, x: A) => Either<E, B>,
  z: B,
): Either<E, B> {
  return doEither(function* () {
    let acc = z;
    for (const x of xs) {
      acc = yield* f(acc, x);
    }
    return acc;
  });
}

/**
 * Map each element of an iterable to an Either, then evaluate the Eithers from
 * left to right and collect the rightsided values in an array.
 *
 * The iterable must be finite.
 */
export function traverseEither<A, E, B>(
  xs: Iterable<A>,
  f: (x: A) => Either<E, B>,
): Either<E, readonly B[]> {
  return doEither(function* () {
    const ys: B[] = [];
    for (const x of xs) {
      ys.push(yield* f(x));
    }
    return ys;
  });
}

/**
 * Evaluate the Eithers in an array or a tuple literal from left to right and
 * collect the rightsided values in an array or a tuple literal, respectively.
 */
export function zipEither<T extends readonly Either<any, any>[]>(
  xs: T,
): Either<Either.LeftT<T[number]>, Readonly<Either.RightsT<T>>> {
  return doEither(function* () {
    const l = xs.length;
    const ys = new Array(l);
    for (let ix = 0; ix < l; ix++) {
      ys[ix] = yield* xs[ix];
    }
    return ys as unknown as Either.RightsT<T>;
  });
}

/**
 * Evaluate a series of Eithers from left to right and collect the rightsided
 * values in a tuple literal.
 */
export function tupledEither<
  T extends [Either<any, any>, Either<any, any>, ...Either<any, any>[]],
>(...xs: T): Either<Either.LeftT<T[number]>, Readonly<Either.RightsT<T>>> {
  return zipEither(xs);
}

/**
 * Evaluate the Eithers in an object literal and collect the rightsided values
 * in an object literal.
 */
export function gatherEither<T extends Record<any, Either<any, any>>>(
  xs: T,
): Either<
  Either.LeftT<T[keyof T]>,
  { readonly [K in keyof T]: Either.RightT<T[K]> }
> {
  return doEither(function* () {
    const ys: Record<any, unknown> = {};
    for (const [kx, x] of Object.entries(xs)) {
      ys[kx] = yield* x;
    }
    return ys as Either.RightsT<T>;
  });
}

/**
 * Lift a function of any arity into the context of Either.
 */
export function liftEither<T extends unknown[], A>(
  f: (...args: T) => A,
): <T1 extends { [K in keyof T]: Either<any, T[K]> }>(
  ...args: T1
) => Either<Either.LeftT<T1[number]>, A> {
  return (...args) => zipEither(args).map((xs) => f(...(xs as T)));
}

/**
 * Lift a function that accepts an object literal of named arguments into the
 * context of Either.
 */
export function liftNamedEither<T extends Record<any, unknown>, A = T>(
  f: (args: T) => A,
): <T1 extends { [K in keyof T]: Either<any, T[K]> }>(
  args: T1,
) => Either<Either.LeftT<T1[keyof T1]>, A> {
  return (args) => gatherEither(args).map((xs) => f(xs as T));
}

/**
 * Lift a constructor function of any arity into the context of Either.
 */
export function liftNewEither<T extends unknown[], A>(
  ctor: new (...args: T) => A,
): <T1 extends { [K in keyof T]: Either<any, T[K]> }>(
  ...args: T1
) => Either<Either.LeftT<T1[number]>, A> {
  return (...args) => zipEither(args).map((xs) => new ctor(...(xs as T)));
}

async function doAsyncImpl<
  T extends readonly [Either<any, any>, Either.Uid],
  A,
>(nxs: AsyncGenerator<T, A, any>): Promise<Either<Either.LeftT<T[0]>, A>> {
  let nx = await nxs.next();
  while (!nx.done) {
    const x = nx.value[0];
    if (rightsided(x)) {
      nx = await nxs.next(x.value);
    } else {
      return x;
    }
  }
  return right(nx.value);
}

/**
 * Construct a Promise that fulfills with an Either using an async generator
 * comprehension.
 */
export function doAsyncEither<
  T extends readonly [Either<any, any>, Either.Uid],
  A,
>(f: () => AsyncGenerator<T, A, any>): Promise<Either<Either.LeftT<T[0]>, A>> {
  return doAsyncImpl(f());
}
