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
 * The Validated type and associated operations.
 *
 * @module
 */

import { type Either, left, right } from "./Either.js";
import { Eq, eq } from "./Eq.js";
import { cmp, greater, less, Ord, type Ordering } from "./Ord.js";
import { combine, Semigroup } from "./Semigroup.js";
import { id } from "./functions.js";

/**
 * A `Validated<E, A>` models an accumulating disputed value `E` or an accepted
 * value `A`.
 *
 * When Validateds are composed, disputed values will accumulate according to
 * thier behavior as a Semigroup. This behavior makes Validated a useful data
 * type for reporting multiple failures within a program.
 */
export type Validated<E, A> = Validated.Disputed<E> | Validated.Accepted<A>;

export namespace Validated {
  /**
   * The unique identifier for Validated.
   */
  export const uid = Symbol("@neotype/prelude/Validated/uid");

  /**
   * The unique identifier for Validated.
   */
  export type Uid = typeof uid;

  /**
   * The unified Syntax for Validated.
   */
  export abstract class Syntax {
    /**
     * Test whether this and that Validated are equal using Eq comparison.
     *
     * ```ts
     * eq (dispute (x), dispute (y)) ≡ eq (x, y)
     * eq (dispute (x), accept  (y)) ≡ false
     * eq (accept  (x), dispute (y)) ≡ false
     * eq (accept  (x), accept  (y)) ≡ eq (x, y)
     * ```
     */
    [Eq.eq]<E extends Eq<E>, A extends Eq<A>>(
      this: Validated<E, A>,
      that: Validated<E, A>,
    ): boolean {
      if (disputed(this)) {
        return disputed(that) && eq(this.value, that.value);
      }
      return accepted(that) && eq(this.value, that.value);
    }

    /**
     * Compare this and that Validated using Ord comparison.
     *
     * cmp (dispute (x), dispute (y)) ≡ cmp (x, y)
     * cmp (dispute (x), accept  (y)) ≡ less
     * cmp (accept  (x), dispute (y)) ≡ greater
     * cmp (accept  (x), accept  (y)) ≡ cmp (x, y)
     */
    [Ord.cmp]<E extends Ord<E>, A extends Ord<A>>(
      this: Validated<E, A>,
      that: Validated<E, A>,
    ): Ordering {
      if (disputed(this)) {
        return disputed(that) ? cmp(this.value, that.value) : less;
      }
      return accepted(that) ? cmp(this.value, that.value) : greater;
    }

    /**
     * If this and that Validated are both accepted and their values are a
     * Semigroup, combine the values.
     *
     * combine (dispute (x), dispute (y)) ≡ dispute (combine (x, y))
     * combine (dispute (x), accept  (y)) ≡ dispute (         x    )
     * combine (accept  (x), dispute (y)) ≡ dispute (            y )
     * combine (accept  (x), accept  (y)) ≡ accept  (combine (x, y))
     */
    [Semigroup.combine]<E extends Semigroup<E>, A extends Semigroup<A>>(
      this: Validated<E, A>,
      that: Validated<E, A>,
    ): Validated<E, A> {
      return this.zipWith(that, combine);
    }

    /**
     * Case analysis for Validated.
     */
    fold<E, A, B, B1>(
      this: Validated<E, A>,
      foldL: (x: E, validated: Disputed<E>) => B,
      foldR: (x: A, validated: Accepted<A>) => B1,
    ): B | B1 {
      return disputed(this) ? foldL(this.value, this) : foldR(this.value, this);
    }

    /**
     * If this Validated is disputed, extract its value; otherwise, apply a
     * function to the accepted value.
     */
    disputedOrFold<E, A, B>(
      this: Validated<E, A>,
      f: (x: A, validated: Accepted<A>) => B,
    ): E | B {
      return this.fold(id, f);
    }

    /**
     * If this Validated is accepted, extract its value; otherwise, apply a
     * function to the disputed value.
     */
    acceptedOrFold<E, A, B>(
      this: Validated<E, A>,
      f: (x: E, validated: Disputed<E>) => B,
    ): A | B {
      return this.fold(f, id);
    }

    /**
     * If this Validated is accepted, apply a function to its value to produce a
     * new Validated.
     */
    bindAccepted<E, A, E1, B>(
      this: Validated<E, A>,
      f: (x: A) => Validated<E1, B>,
    ): Validated<E | E1, B> {
      return disputed(this) ? this : f(this.value);
    }

    /**
     * If this and that Validated are accepted, apply a function to their values.
     */
    zipWith<E extends Semigroup<E>, A, B, C>(
      this: Validated<E, A>,
      that: Validated<E, B>,
      f: (x: A, y: B) => C,
    ): Validated<E, C> {
      if (disputed(this)) {
        return disputed(that) ? dispute(combine(this.value, that.value)) : this;
      }
      return disputed(that) ? that : accept(f(this.value, that.value));
    }

    /**
     * If this and that Validated are accepted, keep only this Validated's value.
     */
    zipFst<E extends Semigroup<E>, A>(
      this: Validated<E, A>,
      that: Validated<E, any>,
    ): Validated<E, A> {
      return this.zipWith(that, id);
    }

    /**
     * If this and that Validated are accepted, keep only that Validated's value.
     */
    zipSnd<E extends Semigroup<E>, B>(
      this: Validated<E, any>,
      that: Validated<E, B>,
    ): Validated<E, B> {
      return this.zipWith(that, (_, y) => y);
    }

    /**
     * Apply one of two functions to this Validated's value if this is disputed
     * or accepted, respectively.
     */
    bimap<E, A, E1, B>(
      this: Validated<E, A>,
      mapL: (x: E) => E1,
      mapR: (x: A) => B,
    ): Validated<E1, B> {
      return disputed(this)
        ? dispute(mapL(this.value))
        : accept(mapR(this.value));
    }

    /**
     * If this Validated is disputed, apply a function to its value.
     */
    mapDisputed<E, A, E1>(
      this: Validated<E, A>,
      f: (x: E) => E1,
    ): Validated<E1, A> {
      return disputed(this) ? dispute(f(this.value)) : this;
    }

    /**
     * If this Validated is accepted, apply a function to its value.
     */
    map<E, A, B>(this: Validated<E, A>, f: (x: A) => B): Validated<E, B> {
      return disputed(this) ? this : accept(f(this.value));
    }

    /**
     * If this Validated is accepted, overwrite its value.
     */
    mapTo<E, B>(this: Validated<E, any>, value: B): Validated<E, B> {
      return this.map(() => value);
    }
  }

  /**
   * A disputed Validated.
   */
  export class Disputed<out E> extends Syntax {
    /**
     * The property that discriminates Validated.
     */
    readonly type = "Disputed";

    /**
     * Construct an instance of `Validated.Disputed`.
     *
     * Explicit use of this constructor should be avoided; use the
     * {@link dispute} function instead.
     */
    constructor(readonly value: E) {
      super();
    }
  }

  /**
   * An accepted Validated.
   */
  export class Accepted<out A> extends Syntax {
    /**
     * The property that discriminates Validated.
     */
    readonly type = "Accepted";

    /**
     * Construct an instance of `Validated.Accepted`.
     *
     * Explicit use of this constructor should be avoided; use the
     * {@link accept} function instead.
     */
    constructor(readonly value: A) {
      super();
    }
  }
}

/**
 * Construct a disputed Validated.
 */
export function dispute<E, A = never>(x: E): Validated<E, A> {
  return new Validated.Disputed(x);
}

/**
 * Construct an accepted Validated.
 */
export function accept<A, E = never>(x: A): Validated<E, A> {
  return new Validated.Accepted(x);
}

/**
 * Test whether a Validated is disputed.
 */
export function disputed<E>(
  validated: Validated<E, any>,
): validated is Validated.Disputed<E> {
  return validated.type === "Disputed";
}

/**
 * Test whether a Validated is accepted.
 */
export function accepted<A>(
  validated: Validated<any, A>,
): validated is Validated.Accepted<A> {
  return validated.type === "Accepted";
}

/**
 * Convert an Either to a Validated.
 */
export function validated<E, A>(either: Either<E, A>): Validated<E, A> {
  return either.fold(dispute, accept);
}

/**
 * Convert a Validated to an Either.
 */
export function unvalidated<E, A>(validated: Validated<E, A>): Either<E, A> {
  return validated.fold(left, right);
}

/**
 * Map each element of an iterable to a Validated, then evaluate the Validateds
 * from left to right and collect the accepted values in an array.
 *
 * The iterable must be finite.
 */
export function traverseValidated<A, E extends Semigroup<E>, B>(
  xs: Iterable<A>,
  f: (x: A) => Validated<E, B>,
): Validated<E, readonly B[]> {
  function ireduce<A, B>(xs: Iterable<A>, f: (acc: B, x: A) => B, z: B): B {
    let acc = z;
    for (const x of xs) {
      acc = f(acc, x);
    }
    return acc;
  }
  return ireduce(
    xs,
    (acc, v) => {
      return acc.zipWith(f(v), (ys, y) => {
        ys.push(y);
        return ys;
      });
    },
    accept<B[], E>([]),
  );
}

/**
 * Evaluate the Validateds in an array or a tuple literal from left to right and
 * collect the accepted values in an array or a tuple literal, respectively.
 */
export function zipValidated<E extends Semigroup<E>, A0, A1>(
  xs: readonly [Validated<E, A0>, Validated<E, A1>],
): Validated<E, readonly [A0, A1]>;

export function zipValidated<E extends Semigroup<E>, A0, A1, A2>(
  xs: readonly [Validated<E, A0>, Validated<E, A1>, Validated<E, A2>],
): Validated<E, readonly [A0, A1, A2]>;

export function zipValidated<E extends Semigroup<E>, A0, A1, A2, A3>(
  xs: readonly [
    Validated<E, A0>,
    Validated<E, A1>,
    Validated<E, A2>,
    Validated<E, A3>,
  ],
): Validated<E, readonly [A0, A1, A2, A3]>;

export function zipValidated<E extends Semigroup<E>, A0, A1, A2, A3, A4>(
  xs: readonly [
    Validated<E, A0>,
    Validated<E, A1>,
    Validated<E, A2>,
    Validated<E, A3>,
    Validated<E, A4>,
  ],
): Validated<E, readonly [A0, A1, A2, A3, A4]>;

export function zipValidated<E extends Semigroup<E>, A0, A1, A2, A3, A4, A5>(
  xs: readonly [
    Validated<E, A0>,
    Validated<E, A1>,
    Validated<E, A2>,
    Validated<E, A3>,
    Validated<E, A4>,
    Validated<E, A5>,
  ],
): Validated<E, readonly [A0, A1, A2, A3, A4, A5]>;

// prettier-ignore
export function zipValidated<E extends Semigroup<E>, A0, A1, A2, A3, A4, A5, A6>(
  xs: readonly [
    Validated<E, A0>,
    Validated<E, A1>,
    Validated<E, A2>,
    Validated<E, A3>,
    Validated<E, A4>,
    Validated<E, A5>,
    Validated<E, A6>,
  ],
): Validated<E, readonly [A0, A1, A2, A3, A4, A5, A6]>;

// prettier-ignore
export function zipValidated<E extends Semigroup<E>, A0, A1, A2, A3, A4, A5, A6, A7>(
  xs: readonly [
    Validated<E, A0>,
    Validated<E, A1>,
    Validated<E, A2>,
    Validated<E, A3>,
    Validated<E, A4>,
    Validated<E, A5>,
    Validated<E, A6>,
    Validated<E, A7>,
  ],
): Validated<E, readonly [A0, A1, A2, A3, A4, A5, A6, A7]>;

// prettier-ignore
export function zipValidated<E extends Semigroup<E>, A0, A1, A2, A3, A4, A5, A6, A7, A8>(
  xs: readonly [
    Validated<E, A0>,
    Validated<E, A1>,
    Validated<E, A2>,
    Validated<E, A3>,
    Validated<E, A4>,
    Validated<E, A5>,
    Validated<E, A6>,
    Validated<E, A7>,
    Validated<E, A8>,
  ],
): Validated<E, readonly [A0, A1, A2, A3, A4, A5, A6, A7, A8]>;

// prettier-ignore
export function zipValidated<E extends Semigroup<E>, A0, A1, A2, A3, A4, A5, A6, A7, A8, A9>(
  xs: readonly [
    Validated<E, A0>,
    Validated<E, A1>,
    Validated<E, A2>,
    Validated<E, A3>,
    Validated<E, A4>,
    Validated<E, A5>,
    Validated<E, A6>,
    Validated<E, A7>,
    Validated<E, A8>,
    Validated<E, A9>,
  ],
): Validated<E, readonly [A0, A1, A2, A3, A4, A5, A6, A7, A8, A9]>;

export function zipValidated<E extends Semigroup<E>, A>(
  xs: readonly Validated<E, A>[],
): Validated<E, readonly A[]>;

export function zipValidated<E extends Semigroup<E>, A>(
  xs: readonly Validated<E, A>[],
): Validated<E, readonly A[]> {
  return xs.reduce((acc, v, iv) => {
    return acc.zipWith(v, (ys, x) => {
      ys[iv] = x;
      return ys;
    });
  }, accept<A[], E>(new Array(xs.length)));
}

/**
 * Evaluate a series of Validateds from left to right and collect the accepted
 * values in a tuple literal.
 */
export function tupledValidated<E extends Semigroup<E>, A0, A1>(
  ...xs: [Validated<E, A0>, Validated<E, A1>]
): Validated<E, readonly [A0, A1]>;

export function tupledValidated<E extends Semigroup<E>, A0, A1, A2>(
  ...xs: [Validated<E, A0>, Validated<E, A1>, Validated<E, A2>]
): Validated<E, readonly [A0, A1, A2]>;

export function tupledValidated<E extends Semigroup<E>, A0, A1, A2, A3>(
  ...xs: [
    Validated<E, A0>,
    Validated<E, A1>,
    Validated<E, A2>,
    Validated<E, A3>,
  ]
): Validated<E, readonly [A0, A1, A2, A3]>;

export function tupledValidated<E extends Semigroup<E>, A0, A1, A2, A3, A4>(
  ...xs: [
    Validated<E, A0>,
    Validated<E, A1>,
    Validated<E, A2>,
    Validated<E, A3>,
    Validated<E, A4>,
  ]
): Validated<E, readonly [A0, A1, A2, A3, A4]>;

export function tupledValidated<E extends Semigroup<E>, A0, A1, A2, A3, A4, A5>(
  ...xs: [
    Validated<E, A0>,
    Validated<E, A1>,
    Validated<E, A2>,
    Validated<E, A3>,
    Validated<E, A4>,
    Validated<E, A5>,
  ]
): Validated<E, readonly [A0, A1, A2, A3, A4, A5]>;

// prettier-ignore
export function tupledValidated<E extends Semigroup<E>, A0, A1, A2, A3, A4, A5, A6>(
  ...xs: [
    Validated<E, A0>,
    Validated<E, A1>,
    Validated<E, A2>,
    Validated<E, A3>,
    Validated<E, A4>,
    Validated<E, A5>,
    Validated<E, A6>,
  ]
): Validated<E, readonly [A0, A1, A2, A3, A4, A5, A6]>;

// prettier-ignore
export function tupledValidated<E extends Semigroup<E>, A0, A1, A2, A3, A4, A5, A6, A7>(
  ...xs: [
    Validated<E, A0>,
    Validated<E, A1>,
    Validated<E, A2>,
    Validated<E, A3>,
    Validated<E, A4>,
    Validated<E, A5>,
    Validated<E, A6>,
    Validated<E, A7>,
  ]
): Validated<E, readonly [A0, A1, A2, A3, A4, A5, A6, A7]>;

// prettier-ignore
export function tupledValidated<E extends Semigroup<E>, A0, A1, A2, A3, A4, A5, A6, A7, A8>(
  ...xs: [
    Validated<E, A0>,
    Validated<E, A1>,
    Validated<E, A2>,
    Validated<E, A3>,
    Validated<E, A4>,
    Validated<E, A5>,
    Validated<E, A6>,
    Validated<E, A7>,
    Validated<E, A8>,
  ]
): Validated<E, readonly [A0, A1, A2, A3, A4, A5, A6, A7, A8]>;

// prettier-ignore
export function tupledValidated<E extends Semigroup<E>, A0, A1, A2, A3, A4, A5, A6, A7, A8, A9>(
  ...xs: [
    Validated<E, A0>,
    Validated<E, A1>,
    Validated<E, A2>,
    Validated<E, A3>,
    Validated<E, A4>,
    Validated<E, A5>,
    Validated<E, A6>,
    Validated<E, A7>,
    Validated<E, A8>,
    Validated<E, A9>,
  ]
): Validated<E, readonly [A0, A1, A2, A3, A4, A5, A6, A7, A8, A9]>;

export function tupledValidated<E extends Semigroup<E>, A>(
  ...xs: Validated<E, A>[]
): Validated<E, readonly A[]> {
  return zipValidated(xs);
}

/**
 * Lift a function of any arity into the context of Validated.
 */
export function liftValidated<T extends unknown[], A>(
  f: (...args: T) => A,
): <E extends Semigroup<E>>(
  ...args: { [K in keyof T]: Validated<E, T[K]> }
) => Validated<E, A> {
  return (...args) => zipValidated(args).map((xs) => f(...(xs as T)));
}

/**
 * Lift a function that accepts an object literal of named values into the
 * context of Validated.
 */
// prettier-ignore
export function liftNamedValidated<T extends Record<any, unknown>, A = T>(
  f: (args: T) => A,
): <E extends Semigroup<E>>(
  args: { [K in keyof T]: Validated<E, T[K]> }
) => Validated<E, A> {
  return (args) => Object.entries(args).reduce((acc, [kv, v]) => {
    return acc.zipWith(v, (xs, x) => {
      xs[kv] = x;
      return xs;
    });
  }, accept<Record<any, any>>({})).map(f);
}

/**
 * Lift a constructor function of any arity into the context of Validated.
 */
export function liftNewValidated<T extends unknown[], A>(
  ctor: new (...args: T) => A,
): <E extends Semigroup<E>>(
  ...args: { [K in keyof T]: Validated<E, T[K]> }
) => Validated<E, A> {
  return (...args) => zipValidated(args).map((xs) => new ctor(...(xs as T)));
}
