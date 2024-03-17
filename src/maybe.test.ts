/*
 * Copyright 2022-2024 Joshua Martinez-Maes
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

import * as Fc from "fast-check";
import { describe, expect, expectTypeOf, it } from "vitest";
import {
	TestBuilder,
	arbNum,
	arbStr,
	expectLawfulEq,
	expectLawfulOrd,
	expectLawfulSemigroup,
	type Num,
	type Str,
} from "./_test/utils.js";
import { cmb } from "./cmb.js";
import { Ordering, cmp, eq } from "./cmp.js";
import { Maybe } from "./maybe.js";

describe("Maybe", () => {
	function arbMaybe<T>(arbVal: Fc.Arbitrary<T>): Fc.Arbitrary<Maybe<T>> {
		return Fc.oneof(Fc.constant(Maybe.nothing), arbVal.map(Maybe.just));
	}

	describe("nothing", () => {
		it("represents the Nothing variant", () => {
			const maybe: Maybe<1> = Maybe.nothing;

			expectTypeOf(maybe).toEqualTypeOf<Maybe<1>>();
			expectTypeOf(maybe.kind).toEqualTypeOf<Maybe.Kind>();

			expect(maybe).to.be.an.instanceOf(Maybe.Nothing);
			expect(maybe.kind).to.equal(Maybe.Kind.NOTHING);
		});
	});

	describe("just", () => {
		it("constructs a Just variant", () => {
			const maybe = Maybe.just<1>(1);

			expectTypeOf(maybe).toEqualTypeOf<Maybe<1>>();
			expectTypeOf(maybe.kind).toEqualTypeOf<Maybe.Kind>();
			expectTypeOf((maybe as Maybe.Just<1>).val).toEqualTypeOf<1>();

			expect(maybe).to.be.an.instanceOf(Maybe.Just);
			expect(maybe.kind).to.equal(Maybe.Kind.JUST);
			expect((maybe as Maybe.Just<1>).val).to.equal(1);
		});
	});

	describe("unit", () => {
		it("constructs a Just with an undefined value", () => {
			const maybe = Maybe.unit();
			expectTypeOf(maybe).toEqualTypeOf<Maybe<void>>();
			expect(maybe).to.deep.equal(Maybe.just(undefined));
		});
	});

	describe("fromNullish", () => {
		it("returns Nothing if the argument is undefined", () => {
			const maybe = Maybe.fromNullish(undefined as 1 | undefined);
			expectTypeOf(maybe).toEqualTypeOf<Maybe<1>>();
			expect(maybe).to.equal(Maybe.nothing);
		});

		it("returns Nothing if the argument is null", () => {
			const maybe = Maybe.fromNullish(null as 1 | null);
			expectTypeOf(maybe).toEqualTypeOf<Maybe<1>>();
			expect(maybe).to.equal(Maybe.nothing);
		});

		it("returns any non-undefined, non-null argument in a Just", () => {
			const maybe = Maybe.fromNullish(1 as 1 | undefined | null);
			expectTypeOf(maybe).toEqualTypeOf<Maybe<1>>();
			expect(maybe).to.deep.equal(Maybe.just(1));
		});
	});

	describe("wrapNullishFn", () => {
		it("adapts the function to return Nothing if it returns undefined", () => {
			const f = Maybe.wrapNullishFn((): 1 | undefined => undefined);
			expectTypeOf(f).toEqualTypeOf<() => Maybe<1>>();

			const maybe = f();
			expectTypeOf(maybe).toEqualTypeOf<Maybe<1>>();
			expect(maybe).to.equal(Maybe.nothing);
		});

		it("adapts the function to return Nothing if it returns null", () => {
			const f = Maybe.wrapNullishFn((): 1 | null => null);
			expectTypeOf(f).toEqualTypeOf<() => Maybe<1>>();

			const maybe = f();
			expectTypeOf(maybe).toEqualTypeOf<Maybe<1>>();
			expect(maybe).to.equal(Maybe.nothing);
		});

		it("adapts the function to wrap a non-undefined, non-null result in a Just", () => {
			const f = Maybe.wrapNullishFn((): 1 => 1);
			expectTypeOf(f).toEqualTypeOf<() => Maybe<1>>();

			const maybe = f();
			expectTypeOf(maybe).toEqualTypeOf<Maybe<1>>();
			expect(maybe).to.deep.equal(Maybe.just(1));
		});
	});

	describe("wrapPredicateFn", () => {
		it("adapts the predicate to return Nothing if not satisfied", () => {
			const f = Maybe.wrapPredicateFn(
				(num: number): boolean => num === 1,
			);
			expectTypeOf(f).toEqualTypeOf<(num: number) => Maybe<number>>();

			const maybe = f(2);
			expectTypeOf(maybe).toEqualTypeOf<Maybe<number>>();
			expect(maybe).to.equal(Maybe.nothing);
		});

		it("adapts the predicate to return its argument in a Just if satisfied", () => {
			const f = Maybe.wrapPredicateFn(
				(num: number): boolean => num === 1,
			);
			expectTypeOf(f).toEqualTypeOf<(num: number) => Maybe<number>>();

			const maybe = f(1);
			expectTypeOf(maybe).toEqualTypeOf<Maybe<number>>();
			expect(maybe).to.deep.equal(Maybe.just(1));
		});

		it("properly narrows the result when adapting a refining predicate", () => {
			const f = Maybe.wrapPredicateFn(
				(num: number): num is 1 => num === 1,
			);
			expectTypeOf(f).toEqualTypeOf<(num: number) => Maybe<1>>();
		});
	});

	describe("go", () => {
		it("short-circuits on the first yielded Nothing", () => {
			function* f(): Maybe.Go<[1, 2]> {
				const one = yield* Maybe.just<1>(1);
				const two = yield* Maybe.nothing;
				return [one, two];
			}
			const maybe = Maybe.go(f());
			expectTypeOf(maybe).toEqualTypeOf<Maybe<[1, 2]>>();
			expect(maybe).to.equal(Maybe.nothing);
		});

		it("completes if all yielded values are Just", () => {
			function* f(): Maybe.Go<[1, 2]> {
				const one = yield* Maybe.just<1>(1);
				const two = yield* Maybe.just<2>(2);
				return [one, two];
			}
			const maybe = Maybe.go(f());
			expectTypeOf(maybe).toEqualTypeOf<Maybe<[1, 2]>>();
			expect(maybe).to.deep.equal(Maybe.just([1, 2]));
		});

		it("executes the finally block if Nothing is yielded in the try block", () => {
			const logs: string[] = [];
			function* f(): Maybe.Go<1> {
				try {
					return yield* Maybe.nothing;
				} finally {
					logs.push("finally");
				}
			}
			const maybe = Maybe.go(f());
			expectTypeOf(maybe).toEqualTypeOf<Maybe<1>>();
			expect(maybe).to.equal(Maybe.nothing);
			expect(logs).to.deep.equal(["finally"]);
		});

		it("returns Nothing if Nothing is yielded in the finally block", () => {
			function* f(): Maybe.Go<1> {
				try {
					return 1;
				} finally {
					yield* Maybe.nothing;
				}
			}
			const maybe = Maybe.go(f());
			expectTypeOf(maybe).toEqualTypeOf<Maybe<1>>();
			expect(maybe).to.equal(Maybe.nothing);
		});
	});

	describe("fromGoFn", () => {
		it("evaluates the generator function to return a Maybe", () => {
			function* f(): Maybe.Go<[1, 2]> {
				const one = yield* Maybe.just<1>(1);
				const two = yield* Maybe.just<2>(2);
				return [one, two];
			}
			const maybe = Maybe.fromGoFn(f);
			expectTypeOf(maybe).toEqualTypeOf<Maybe<[1, 2]>>();
			expect(maybe).to.deep.equal(Maybe.just([1, 2]));
		});
	});

	describe("wrapGoFn", () => {
		it("adapts the generator function to return a Maybe", () => {
			function* f(one: 1): Maybe.Go<[1, 2]> {
				const two = yield* Maybe.just<2>(2);
				return [one, two];
			}
			const wrapped = Maybe.wrapGoFn(f);
			expectTypeOf(wrapped).toEqualTypeOf<(one: 1) => Maybe<[1, 2]>>();

			const maybe = wrapped(1);
			expectTypeOf(maybe).toEqualTypeOf<Maybe<[1, 2]>>();
			expect(maybe).to.deep.equal(Maybe.just([1, 2]));
		});
	});

	describe("reduce", () => {
		it("reduces the finite iterable from left to right in the context of Maybe", () => {
			const maybe = Maybe.reduce(
				["a", "b"],
				(chars, char, idx) => Maybe.just(chars + char + idx),
				"",
			);
			expectTypeOf(maybe).toEqualTypeOf<Maybe<string>>();
			expect(maybe).to.deep.equal(Maybe.just("a0b1"));
		});
	});

	describe("traverseInto", () => {
		it("applies the function to the elements and collects the present values into the Builder if all results are Just", () => {
			const builder = new TestBuilder<[number, string]>();
			const maybe = Maybe.traverseInto(
				["a", "b"],
				(char, idx) => Maybe.just<[number, string]>([idx, char]),
				builder,
			);
			expectTypeOf(maybe).toEqualTypeOf<Maybe<[number, string][]>>();
			expect(maybe).to.deep.equal(
				Maybe.just([
					[0, "a"],
					[1, "b"],
				]),
			);
		});
	});

	describe("traverse", () => {
		it("applies the function to the elements and collects the present values in an array if all results are Just", () => {
			const maybe = Maybe.traverse(["a", "b"], (char, idx) =>
				Maybe.just<[number, string]>([idx, char]),
			);
			expectTypeOf(maybe).toEqualTypeOf<Maybe<[number, string][]>>();
			expect(maybe).to.deep.equal(
				Maybe.just([
					[0, "a"],
					[1, "b"],
				]),
			);
		});
	});

	describe("allInto", () => {
		it("collects the present values into the Builder if all elements are Just", () => {
			const builder = new TestBuilder<number>();
			const maybe = Maybe.allInto(
				[Maybe.just(1), Maybe.just(2)],
				builder,
			);
			expectTypeOf(maybe).toEqualTypeOf<Maybe<number[]>>();
			expect(maybe).to.deep.equal(Maybe.just([1, 2]));
		});
	});

	describe("all", () => {
		it("collects the present values in an array if all elements are Just", () => {
			const maybe = Maybe.all([Maybe.just<1>(1), Maybe.just<2>(2)]);
			expectTypeOf(maybe).toEqualTypeOf<Maybe<[1, 2]>>();
			expect(maybe).to.deep.equal(Maybe.just([1, 2]));
		});
	});

	describe("allProps", () => {
		it("collects the present values in an object if all elements are Just", () => {
			const maybe = Maybe.allProps({
				one: Maybe.just<1>(1),
				two: Maybe.just<2>(2),
			});
			expectTypeOf(maybe).toEqualTypeOf<Maybe<{ one: 1; two: 2 }>>();
			expect(maybe).to.deep.equal(Maybe.just({ one: 1, two: 2 }));
		});
	});

	describe("forEach", () => {
		it("applies the function to the elements while the result is Just", () => {
			const results: [number, string][] = [];
			const maybe = Maybe.forEach(["a", "b"], (char, idx) => {
				results.push([idx, char]);
				return Maybe.just(undefined);
			});
			expectTypeOf(maybe).toEqualTypeOf<Maybe<void>>();
			expect(maybe).to.deep.equal(Maybe.just(undefined));
			expect(results).to.deep.equal([
				[0, "a"],
				[1, "b"],
			]);
		});
	});

	describe("lift", () => {
		it("applies the function to the present values if all arguments are Just", () => {
			function f<A, B>(lhs: A, rhs: B): [A, B] {
				return [lhs, rhs];
			}
			const lifted = Maybe.lift(f);
			expectTypeOf(lifted).toEqualTypeOf<
				<A, B>(lhs: Maybe<A>, rhs: Maybe<B>) => Maybe<[A, B]>
			>();

			const maybe = lifted(Maybe.just<1>(1), Maybe.just<2>(2));
			expectTypeOf(maybe).toEqualTypeOf<Maybe<[1, 2]>>();
			expect(maybe).to.deep.equal(Maybe.just([1, 2]));
		});
	});

	describe("#[Eq.eq]", () => {
		it("compares Nothing and Nothing as equal", () => {
			expect(eq<Maybe<Num>>(Maybe.nothing, Maybe.nothing)).to.be.true;
		});

		it("compares Nothing and any Just as inequal", () => {
			const property = Fc.property(arbNum(), (rhs) => {
				expect(eq(Maybe.nothing, Maybe.just(rhs))).to.be.false;
			});
			Fc.assert(property);
		});

		it("compares any Just and Nothing as inequal", () => {
			const property = Fc.property(arbNum(), (lhs) => {
				expect(eq(Maybe.just(lhs), Maybe.nothing)).to.be.false;
			});
			Fc.assert(property);
		});

		it("compares the values if both variants are Just", () => {
			const property = Fc.property(arbNum(), arbNum(), (lhs, rhs) => {
				expect(eq(Maybe.just(lhs), Maybe.just(rhs))).to.equal(
					eq(lhs, rhs),
				);
			});
			Fc.assert(property);
		});

		it("implements a lawful equivalence relation", () => {
			expectLawfulEq(arbMaybe(arbNum()));
		});
	});

	describe("#[Ord.cmp]", () => {
		it("compares Nothing as equal to Nothing", () => {
			expect(cmp<Maybe<Num>>(Maybe.nothing, Maybe.nothing)).to.equal(
				Ordering.equal,
			);
		});

		it("compares Nothing as less than any Just", () => {
			const property = Fc.property(arbNum(), (rhs) => {
				expect(cmp(Maybe.nothing, Maybe.just(rhs))).to.equal(
					Ordering.less,
				);
			});
			Fc.assert(property);
		});

		it("compares any Just as greater than Nothing", () => {
			const property = Fc.property(arbNum(), (lhs) => {
				expect(cmp(Maybe.just(lhs), Maybe.nothing)).to.equal(
					Ordering.greater,
				);
			});
			Fc.assert(property);
		});

		it("compares the values if both variants are Just", () => {
			const property = Fc.property(arbNum(), arbNum(), (lhs, rhs) => {
				expect(cmp(Maybe.just(lhs), Maybe.just(rhs))).to.equal(
					cmp(lhs, rhs),
				);
			});
			Fc.assert(property);
		});

		it("implements a lawful total order", () => {
			expectLawfulOrd(arbMaybe(arbNum()));
		});
	});

	describe("#[Semigroup.cmb]", () => {
		it("returns Nothing if both variants are Nothing", () => {
			expect(cmb<Maybe<Str>>(Maybe.nothing, Maybe.nothing)).to.equal(
				Maybe.nothing,
			);
		});

		it("keeps the second Just if the first variant is Nothing", () => {
			const property = Fc.property(arbStr(), (rhs) => {
				expect(cmb(Maybe.nothing, Maybe.just(rhs))).to.deep.equal(
					Maybe.just(rhs),
				);
			});
			Fc.assert(property);
		});

		it("keeps the first Just if the second variant is Nothing", () => {
			const property = Fc.property(arbStr(), (lhs) => {
				expect(cmb(Maybe.just(lhs), Maybe.nothing)).to.deep.equal(
					Maybe.just(lhs),
				);
			});
			Fc.assert(property);
		});

		it("combines the values if both variants are Just", () => {
			const property = Fc.property(arbStr(), arbStr(), (lhs, rhs) => {
				expect(cmb(Maybe.just(lhs), Maybe.just(rhs))).to.deep.equal(
					Maybe.just(cmb(lhs, rhs)),
				);
			});
			Fc.assert(property);
		});

		it("implements a lawful semigroup", () => {
			expectLawfulSemigroup(arbMaybe(arbStr()));
		});
	});

	describe("#isNothing", () => {
		it("returns true if the variant is Nothing", () => {
			expect(Maybe.nothing.isNothing()).to.be.true;
		});

		it("returns false if the variant is Just", () => {
			expect(Maybe.just<1>(1).isNothing()).to.be.false;
		});
	});

	describe("#isJust", () => {
		it("returns false if the variant is Nothing", () => {
			expect(Maybe.nothing.isJust()).to.be.false;
		});

		it("returns true if the variant is Just", () => {
			expect(Maybe.just<1>(1).isJust()).to.be.true;
		});
	});

	describe("#match", () => {
		it("evaluates the first function if the variant is Nothing", () => {
			const result = (Maybe.nothing as Maybe<1>).match(
				(): 3 => 3,
				(one): [1, 2] => [one, 2],
			);
			expectTypeOf(result).toEqualTypeOf<[1, 2] | 3>();
			expect(result).to.equal(3);
		});

		it("applies the second function to the value if the variant is Just", () => {
			const result = Maybe.just<1>(1).match(
				(): 3 => 3,
				(one): [1, 2] => [one, 2],
			);
			expectTypeOf(result).toEqualTypeOf<[1, 2] | 3>();
			expect(result).to.deep.equal([1, 2]);
		});
	});

	describe("#unwrapOrElse", () => {
		it("evaluates the function if the variant is Nothing", () => {
			const result = (Maybe.nothing as Maybe<1>).unwrapOrElse((): 2 => 2);
			expectTypeOf(result).toEqualTypeOf<1 | 2>();
			expect(result).to.equal(2);
		});

		it("extracts the value if the variant is Just", () => {
			const result = Maybe.just<1>(1).unwrapOrElse((): 2 => 2);
			expectTypeOf(result).toEqualTypeOf<1 | 2>();
			expect(result).to.equal(1);
		});
	});

	describe("#unwrapOr", () => {
		it("returns the fallback value if the variant is Nothing", () => {
			const result = (Maybe.nothing as Maybe<1>).unwrapOr(2 as const);
			expectTypeOf(result).toEqualTypeOf<1 | 2>();
			expect(result).to.equal(2);
		});

		it("extracts the value if the variant is Just", () => {
			const result = Maybe.just<1>(1).unwrapOr(2 as const);
			expectTypeOf(result).toEqualTypeOf<1 | 2>();
			expect(result).to.equal(1);
		});
	});

	describe("#toNullish", () => {
		it("returns undefined if the variant is Nothing", () => {
			const result = (Maybe.nothing as Maybe<1>).toNullish();
			expectTypeOf(result).toEqualTypeOf<1 | undefined>();
			expect(result).to.be.undefined;
		});

		it("extracts the value if the variant is Just", () => {
			const result = Maybe.just<1>(1).toNullish();
			expectTypeOf(result).toEqualTypeOf<1 | undefined>();
			expect(result).to.equal(1);
		});
	});

	describe("#orElse", () => {
		it("evaluates the function if the variant is Nothing", () => {
			const maybe = (Maybe.nothing as Maybe<1>).orElse(() =>
				Maybe.just<2>(2),
			);
			expectTypeOf(maybe).toEqualTypeOf<Maybe<1 | 2>>();
			expect(maybe).to.deep.equal(Maybe.just(2));
		});

		it("does not evaluate the function if the variant is Just", () => {
			const maybe = Maybe.just<1>(1).orElse(() => Maybe.just<2>(2));
			expectTypeOf(maybe).toEqualTypeOf<Maybe<1 | 2>>();
			expect(maybe).to.deep.equal(Maybe.just(1));
		});
	});

	describe("#or", () => {
		it("returns the other Maybe if the variant is Nothing", () => {
			const maybe = (Maybe.nothing as Maybe<1>).or(Maybe.just<2>(2));
			expectTypeOf(maybe).toEqualTypeOf<Maybe<1 | 2>>();
			expect(maybe).to.deep.equal(Maybe.just(2));
		});

		it("returns the original Maybe if the variant is Just", () => {
			const maybe = Maybe.just<1>(1).or(Maybe.just<2>(2));
			expectTypeOf(maybe).toEqualTypeOf<Maybe<1 | 2>>();
			expect(maybe).to.deep.equal(Maybe.just(1));
		});
	});

	describe("#xor", () => {
		it("returns Nothing if both variants are Nothing", () => {
			const maybe = (Maybe.nothing as Maybe<1>).xor(
				Maybe.nothing as Maybe<2>,
			);
			expectTypeOf(maybe).toEqualTypeOf<Maybe<1 | 2>>();
			expect(maybe).to.equal(Maybe.nothing);
		});

		it("returns the second Maybe if the first is Nothing and the second is Just", () => {
			const maybe = (Maybe.nothing as Maybe<1>).xor(Maybe.just<2>(2));
			expectTypeOf(maybe).toEqualTypeOf<Maybe<1 | 2>>();
			expect(maybe).to.deep.equal(Maybe.just(2));
		});

		it("returns the first Maybe if the first is Just and the second is Nothing", () => {
			const maybe = Maybe.just<1>(1).xor(Maybe.nothing as Maybe<2>);
			expectTypeOf(maybe).toEqualTypeOf<Maybe<1 | 2>>();
			expect(maybe).to.deep.equal(Maybe.just(1));
		});

		it("returns Nothing if both variants are Just", () => {
			const maybe = Maybe.just<1>(1).xor(Maybe.just<2>(2));
			expectTypeOf(maybe).toEqualTypeOf<Maybe<1 | 2>>();
			expect(maybe).to.equal(Maybe.nothing);
		});
	});

	describe("#andThen", () => {
		it("does not apply the continuation if the variant is Nothing", () => {
			const maybe = (Maybe.nothing as Maybe<1>).andThen(
				(one): Maybe<[1, 2]> => Maybe.just([one, 2]),
			);
			expectTypeOf(maybe).toEqualTypeOf<Maybe<[1, 2]>>();
			expect(maybe).to.equal(Maybe.nothing);
		});

		it("applies the continuation to the value if the variant is Just", () => {
			const maybe = Maybe.just<1>(1).andThen(
				(one): Maybe<[1, 2]> => Maybe.just([one, 2]),
			);
			expectTypeOf(maybe).toEqualTypeOf<Maybe<[1, 2]>>();
			expect(maybe).to.deep.equal(Maybe.just([1, 2]));
		});
	});

	describe("#andThenGo", () => {
		it("applies the continuation to the value if the variant is Just", () => {
			const maybe = Maybe.just<1>(1).andThenGo(function* (one): Maybe.Go<
				[1, 2]
			> {
				const two = yield* Maybe.just<2>(2);
				return [one, two];
			});
			expectTypeOf(maybe).toEqualTypeOf<Maybe<[1, 2]>>();
			expect(maybe).to.deep.equal(Maybe.just([1, 2]));
		});
	});

	describe("#flatten", () => {
		it("removes one level of nesting if the variant is Just", () => {
			const maybe = Maybe.just<Maybe<1>>(Maybe.just(1)).flatten();
			expectTypeOf(maybe).toEqualTypeOf<Maybe<1>>();
			expect(maybe).to.deep.equal(Maybe.just(1));
		});
	});

	describe("#and", () => {
		it("returns the other Maybe if the variant is Just", () => {
			const maybe = Maybe.just<1>(1).and(Maybe.just<2>(2));
			expectTypeOf(maybe).toEqualTypeOf<Maybe<2>>();
			expect(maybe).to.deep.equal(Maybe.just(2));
		});
	});

	describe("#mapNullish", () => {
		it("does not apply the continuation if the variant is Nothing", () => {
			const maybe = (Maybe.nothing as Maybe<1>).mapNullish(
				(one): [1, 2] | null => [one, 2],
			);
			expectTypeOf(maybe).toEqualTypeOf<Maybe<[1, 2]>>();
			expect(maybe).to.equal(Maybe.nothing);
		});

		it("returns Nothing if the continuation returns null", () => {
			const maybe = Maybe.just<1>(1).mapNullish(
				(): [1, 2] | null => null,
			);
			expectTypeOf(maybe).toEqualTypeOf<Maybe<[1, 2]>>();
			expect(maybe).to.equal(Maybe.nothing);
		});

		it("returns Nothing if the continuation returns undefined", () => {
			const maybe = Maybe.just<1>(1).mapNullish(
				(): [1, 2] | undefined => undefined,
			);
			expectTypeOf(maybe).toEqualTypeOf<Maybe<[1, 2]>>();
			expect(maybe).to.equal(Maybe.nothing);
		});

		it("returns the result in a Just if the continuation returns a non-null result", () => {
			const maybe = Maybe.just<1>(1).mapNullish(
				(one): [1, 2] | null | undefined => [one, 2],
			);
			expectTypeOf(maybe).toEqualTypeOf<Maybe<[1, 2]>>();
			expect(maybe).to.deep.equal(Maybe.just([1, 2]));
		});
	});

	describe("#filter", () => {
		it("returns Nothing if the predicate returns false", () => {
			const maybe = Maybe.just(1).filter((num): boolean => num === 2);
			expectTypeOf(maybe).toEqualTypeOf<Maybe<number>>();
			expect(maybe).to.equal(Maybe.nothing);
		});

		it("returns the value in a Just if the predicate returns true", () => {
			const maybe = Maybe.just(1).filter((num): boolean => num === 1);
			expectTypeOf(maybe).toEqualTypeOf<Maybe<number>>();
			expect(maybe).to.deep.equal(Maybe.just(1));
		});

		it("properly narrows the result when adapting a refining predicate", () => {
			const maybe = Maybe.just(1).filter((num): num is 1 => num === 1);
			expectTypeOf(maybe).toEqualTypeOf<Maybe<1>>();
		});
	});

	describe("#zipWith", () => {
		it("applies the function to the values if both variants are Just", () => {
			const maybe = Maybe.just<1>(1).zipWith(
				Maybe.just<2>(2),
				(one, two): [1, 2] => [one, two],
			);
			expectTypeOf(maybe).toEqualTypeOf<Maybe<[1, 2]>>();
			expect(maybe).to.deep.equal(Maybe.just([1, 2]));
		});
	});

	describe("#map", () => {
		it("applies the function to the value if the variant is Just", () => {
			const maybe = Maybe.just<1>(1).map((one): [1, 2] => [one, 2]);
			expectTypeOf(maybe).toEqualTypeOf<Maybe<[1, 2]>>();
			expect(maybe).to.deep.equal(Maybe.just([1, 2]));
		});
	});
});
