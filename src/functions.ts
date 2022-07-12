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
 * Utility functions.
 *
 * @module
 */

/**
 * The identity function.
 */
export function id<A>(x: A): A {
  return x;
}

/**
 * Retrieve the first element in a pair-like structure.
 */
export function fst<A>(pair: [A, any]): A {
  return pair[0];
}

/**
 * Retrieve the second argument in a pair-like structure.
 */
export function snd<B>(pair: [any, B]): B {
  return pair[1];
}

/**
 * Reverse a refinement function or a predicate function.
 */
export function negate<A, A1 extends A>(
  f: (x: A) => x is A1,
): (x: A) => x is Exclude<A, A1>;

export function negate<A>(f: (x: A) => boolean): (x: A) => boolean;

export function negate<A>(f: (x: A) => boolean): (x: A) => boolean {
  return (x) => !f(x);
}

/**
 * Apply a series of functions from left to right.
 */
export function pipe<A0, A1>(x: A0, f0: (x: A0) => A1): A1;

export function pipe<A0, A1, A2>(
  x: A0,
  f0: (x: A0) => A1,
  f1: (x: A1) => A2,
): A2;

export function pipe<A0, A1, A2, A3>(
  x: A0,
  f0: (x: A0) => A1,
  f1: (x: A1) => A2,
  f2: (x: A2) => A3,
): A3;

export function pipe<A0, A1, A2, A3, A4>(
  x: A0,
  f0: (x: A0) => A1,
  f1: (x: A1) => A2,
  f2: (x: A2) => A3,
  f3: (x: A3) => A4,
): A4;

export function pipe<A0, A1, A2, A3, A4, A5>(
  x: A0,
  f0: (x: A0) => A1,
  f1: (x: A1) => A2,
  f2: (x: A2) => A3,
  f3: (x: A3) => A4,
  f4: (x: A4) => A5,
): A5;

export function pipe<A0, A1, A2, A3, A4, A5, A6>(
  x: A0,
  f0: (x: A0) => A1,
  f1: (x: A1) => A2,
  f2: (x: A2) => A3,
  f3: (x: A3) => A4,
  f4: (x: A4) => A5,
  f5: (x: A5) => A6,
): A6;

export function pipe<A0, A1, A2, A3, A4, A5, A6, A7>(
  x: A0,
  f0: (x: A0) => A1,
  f1: (x: A1) => A2,
  f2: (x: A2) => A3,
  f3: (x: A3) => A4,
  f4: (x: A4) => A5,
  f5: (x: A5) => A6,
  f6: (x: A6) => A7,
): A7;

export function pipe<A0, A1, A2, A3, A4, A5, A6, A7, A8>(
  x: A0,
  f0: (x: A0) => A1,
  f1: (x: A1) => A2,
  f2: (x: A2) => A3,
  f3: (x: A3) => A4,
  f4: (x: A4) => A5,
  f5: (x: A5) => A6,
  f6: (x: A6) => A7,
  f7: (x: A7) => A8,
): A8;

export function pipe<A0, A1, A2, A3, A4, A5, A6, A7, A8, A9>(
  x: A0,
  f0: (x: A0) => A1,
  f1: (x: A1) => A2,
  f2: (x: A2) => A3,
  f3: (x: A3) => A4,
  f4: (x: A4) => A5,
  f5: (x: A5) => A6,
  f6: (x: A6) => A7,
  f7: (x: A7) => A8,
  f8: (x: A8) => A9,
): A9;

export function pipe<A0, A1, A2, A3, A4, A5, A6, A7, A8, A9, A10>(
  x: A0,
  f0: (x: A0) => A1,
  f1: (x: A1) => A2,
  f2: (x: A2) => A3,
  f3: (x: A3) => A4,
  f4: (x: A4) => A5,
  f5: (x: A5) => A6,
  f6: (x: A6) => A7,
  f7: (x: A7) => A8,
  f8: (x: A8) => A9,
  f9: (x: A9) => A10,
): A10;

export function pipe<A>(x: A, ...fs: ((x: A) => A)[]): A;

// prettier-ignore
export function pipe<A>(x: A, ...fs: ((x: A) => A)[]): A {
  const l = fs.length;
  switch (l) {
    case 1:
      return fs[0](x);
    case 2:
      return fs[1](fs[0](x));
    case 3:
      return fs[2](fs[1](fs[0](x)));
    case 4:
      return fs[3](fs[2](fs[1](fs[0](x))));
    case 5:
      return fs[4](fs[3](fs[2](fs[1](fs[0](x)))));
    case 6:
      return fs[5](fs[4](fs[3](fs[2](fs[1](fs[0](x))))));
    case 7:
      return fs[6](fs[5](fs[4](fs[3](fs[2](fs[1](fs[0](x)))))));
    case 8:
      return fs[7](fs[6](fs[5](fs[4](fs[3](fs[2](fs[1](fs[0](x))))))));
    case 9:
      return fs[8](fs[7](fs[6](fs[5](fs[4](fs[3](fs[2](fs[1](fs[0](x)))))))));
    case 10:
      return fs[9](fs[8](fs[7](fs[6](fs[5](fs[4](fs[3](fs[2](fs[1](fs[0](x))))))))));
    default: {
      let acc = x;
      for (let ix = 0; ix < l; ix++) {
        acc = fs[ix](acc);
      }
      return acc;
    }
  }
}

/**
 * Compose a series of functions from left to right.
 */
export function flow<A0 extends unknown[], A1, A2>(
  f0: (...args: A0) => A1,
  f1: (x: A1) => A2,
): (...args: A0) => A2;

export function flow<A0 extends unknown[], A1, A2, A3>(
  f0: (...args: A0) => A1,
  f1: (x: A1) => A2,
  f2: (x: A2) => A3,
): (...args: A0) => A3;

export function flow<A0 extends unknown[], A1, A2, A3, A4>(
  f0: (...args: A0) => A1,
  f1: (x: A1) => A2,
  f2: (x: A2) => A3,
  f3: (x: A3) => A4,
): (...args: A0) => A4;

export function flow<A0 extends unknown[], A1, A2, A3, A4, A5>(
  f0: (...args: A0) => A1,
  f1: (x: A1) => A2,
  f2: (x: A2) => A3,
  f3: (x: A3) => A4,
  f4: (x: A4) => A5,
): (...args: A0) => A5;

export function flow<A0 extends unknown[], A1, A2, A3, A4, A5, A6>(
  f0: (...args: A0) => A1,
  f1: (x: A1) => A2,
  f2: (x: A2) => A3,
  f3: (x: A3) => A4,
  f4: (x: A4) => A5,
  f5: (x: A5) => A6,
): (...args: A0) => A6;

export function flow<A0 extends unknown[], A1, A2, A3, A4, A5, A6, A7>(
  f0: (...args: A0) => A1,
  f1: (x: A1) => A2,
  f2: (x: A2) => A3,
  f3: (x: A3) => A4,
  f4: (x: A4) => A5,
  f5: (x: A5) => A6,
  f6: (x: A6) => A7,
): (...args: A0) => A7;

export function flow<A0 extends unknown[], A1, A2, A3, A4, A5, A6, A7, A8>(
  f0: (...args: A0) => A1,
  f1: (x: A1) => A2,
  f2: (x: A2) => A3,
  f3: (x: A3) => A4,
  f4: (x: A4) => A5,
  f5: (x: A5) => A6,
  f6: (x: A6) => A7,
  f7: (x: A7) => A8,
): (...args: A0) => A8;

export function flow<A0 extends unknown[], A1, A2, A3, A4, A5, A6, A7, A8, A9>(
  f0: (...args: A0) => A1,
  f1: (x: A1) => A2,
  f2: (x: A2) => A3,
  f3: (x: A3) => A4,
  f4: (x: A4) => A5,
  f5: (x: A5) => A6,
  f6: (x: A6) => A7,
  f7: (x: A7) => A8,
  f8: (x: A8) => A9,
): (...args: A0) => A9;

// prettier-ignore
export function flow<A0 extends unknown[], A1, A2, A3, A4, A5, A6, A7, A8, A9, A10>(
  f0: (...args: A0) => A1,
  f1: (x: A1) => A2,
  f2: (x: A2) => A3,
  f3: (x: A3) => A4,
  f4: (x: A4) => A5,
  f5: (x: A5) => A6,
  f6: (x: A6) => A7,
  f7: (x: A7) => A8,
  f8: (x: A8) => A9,
  f9: (x: A9) => A10,
): (...args: A0) => A10;

export function flow<A>(
  ...fs: [(...args: A[]) => A, ...((x: A) => A)[]]
): (...args: A[]) => A;

export function flow<A>(...fs: ((x: A) => A)[]): (x: A) => A;

// prettier-ignore
export function flow<A>(
  ...fs: [(...args: A[]) => A, ...((x: A) => A)[]]
): (...args: A[]) => A {
  const l = fs.length;
  switch (l) {
    case 2:
      return (...args) => fs[1](fs[0](...args));
    case 3:
      return (...args) => fs[2](fs[1](fs[0](...args)));
    case 4:
      return (...args) => fs[3](fs[2](fs[1](fs[0](...args))));
    case 5:
      return (...args) => fs[4](fs[3](fs[2](fs[1](fs[0](...args)))));
    case 6:
      return (...args) => fs[5](fs[4](fs[3](fs[2](fs[1](fs[0](...args))))));
    case 7:
      return (...args) => fs[6](fs[5](fs[4](fs[3](fs[2](fs[1](fs[0](...args)))))));
    case 8:
      return (...args) => fs[7](fs[6](fs[5](fs[4](fs[3](fs[2](fs[1](fs[0](...args))))))));
    case 9:
      return (...args) => fs[8](fs[7](fs[6](fs[5](fs[4](fs[3](fs[2](fs[1](fs[0](...args)))))))));
    case 10:
      return (...args) => fs[9](fs[8](fs[7](fs[6](fs[5](fs[4](fs[3](fs[2](fs[1](fs[0](...args))))))))));
    default: {
      return (...args) => {
        let acc = fs[0](...args);
        for (let ix = 1; ix < l; ix++) {
          acc = fs[ix](acc);
        }
        return acc;
      };
    }
  }
}
