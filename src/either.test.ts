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
} from "./_test/utils.js";
import { cmb } from "./cmb.js";
import { Ordering, cmp, eq } from "./cmp.js";
import { Either } from "./either.js";
import { Validation } from "./validation.js";

describe("Either", () => {
	function arbEither<A, B>(
		arbLeft: Fc.Arbitrary<A>,
		arbRight: Fc.Arbitrary<B>,
	): Fc.Arbitrary<Either<A, B>> {
		return Fc.oneof(arbLeft.map(Either.left), arbRight.map(Either.right));
	}

	describe("left", () => {
		it("constructs a Left variant", () => {
			const either = Either.left<1, 2>(1);

			expectTypeOf(either).toEqualTypeOf<Either<1, 2>>();
			expectTypeOf(either.kind).toEqualTypeOf<Either.Kind>();
			expectTypeOf(either.val).toEqualTypeOf<1 | 2>();

			expect(either).to.be.an.instanceOf(Either.Left);
			expect(either.kind).to.equal(Either.Kind.LEFT);
			expect(either.val).to.equal(1);
		});
	});

	describe("right", () => {
		it("constructs a Right variant", () => {
			const either = Either.right<2, 1>(2);

			expectTypeOf(either).toEqualTypeOf<Either<1, 2>>();
			expectTypeOf(either.kind).toEqualTypeOf<Either.Kind>();
			expectTypeOf(either.val).toEqualTypeOf<1 | 2>();

			expect(either).to.be.an.instanceOf(Either.Right);
			expect(either.kind).to.equal(Either.Kind.RIGHT);
			expect(either.val).to.equal(2);
		});
	});

	describe("unit", () => {
		it("constructs a Right variant with an undefined value", () => {
			const either = Either.unit<1>();
			expectTypeOf(either).toEqualTypeOf<Either<1, void>>();
			expect(either).to.deep.equal(Either.right(undefined));
		});
	});

	describe("fromValidation", () => {
		it("constructs a Left if the Validation is an Err", () => {
			const either = Either.fromValidation(Validation.err<1, 2>(1));
			expectTypeOf(either).toEqualTypeOf<Either<1, 2>>();
			expect(either).to.deep.equal(Either.left(1));
		});

		it("constructs a Right if the Validation is an Ok", () => {
			const either = Either.fromValidation(Validation.ok<2, 1>(2));
			expectTypeOf(either).toEqualTypeOf<Either<1, 2>>();
			expect(either).to.deep.equal(Either.right(2));
		});
	});

	describe("go", () => {
		it("short-cicruits on the first yielded Left", () => {
			function* f(): Either.Go<1 | 3, [2, 4]> {
				const two = yield* Either.right<2, 1>(2);
				const four = yield* Either.left<3, 4>(3);
				return [two, four];
			}
			const either = Either.go(f());
			expectTypeOf(either).toEqualTypeOf<Either<1 | 3, [2, 4]>>();
			expect(either).to.deep.equal(Either.left(3));
		});

		it("completes if all yielded values are Right", () => {
			function* f(): Either.Go<1 | 3, [2, 4]> {
				const two = yield* Either.right<2, 1>(2);
				const four = yield* Either.right<4, 3>(4);
				return [two, four];
			}
			const either = Either.go(f());
			expectTypeOf(either).toEqualTypeOf<Either<1 | 3, [2, 4]>>();
			expect(either).to.deep.equal(Either.right([2, 4]));
		});

		it("executes the finally block if a Left is yielded in the try block", () => {
			const logs: string[] = [];
			function* f(): Either.Go<1, 2> {
				try {
					return yield* Either.left<1, 2>(1);
				} finally {
					logs.push("finally");
				}
			}
			const either = Either.go(f());
			expectTypeOf(either).toEqualTypeOf<Either<1, 2>>();
			expect(either).to.deep.equal(Either.left(1));
			expect(logs).to.deep.equal(["finally"]);
		});

		it("keeps the most recent yielded Left when using try and finally blocks", () => {
			function* f(): Either.Go<1 | 3, 2> {
				try {
					return yield* Either.left<1, 2>(1);
				} finally {
					yield* Either.left<3, 4>(3);
				}
			}
			const either = Either.go(f());
			expectTypeOf(either).toEqualTypeOf<Either<1 | 3, 2>>();
			expect(either).to.deep.equal(Either.left(3));
		});
	});

	describe("fromGoFn", () => {
		it("evaluates the generator function to return an Either", () => {
			function* f(): Either.Go<1 | 3, [2, 4]> {
				const two = yield* Either.right<2, 1>(2);
				const four = yield* Either.right<4, 3>(4);
				return [two, four];
			}
			const either = Either.fromGoFn(f);
			expectTypeOf(either).toEqualTypeOf<Either<1 | 3, [2, 4]>>();
			expect(either).to.deep.equal(Either.right([2, 4]));
		});
	});

	describe("wrapGoFn", () => {
		it("adapts the generator function to return an Either", () => {
			function* f(two: 2): Either.Go<3, [2, 4]> {
				const four = yield* Either.right<4, 3>(4);
				return [two, four];
			}
			const wrapped = Either.wrapGoFn(f);
			expectTypeOf(wrapped).toEqualTypeOf<
				(two: 2) => Either<3, [2, 4]>
			>();

			const either = wrapped(2);
			expectTypeOf(either).toEqualTypeOf<Either<3, [2, 4]>>();
			expect(either).to.deep.equal(Either.right([2, 4]));
		});
	});

	describe("reduce", () => {
		it("reduces the finite iterable from left to right in the context of Either", () => {
			const either = Either.reduce(
				["a", "b"],
				(chars, char, idx): Either<1, string> =>
					Either.right(chars + char + idx.toString()),
				"",
			);
			expectTypeOf(either).toEqualTypeOf<Either<1, string>>();
			expect(either).to.deep.equal(Either.right("a0b1"));
		});
	});

	describe("traverseInto", () => {
		it("applies the function to the elements and collects the successes into the Builder if all results are Right", () => {
			const builder = new TestBuilder<[number, string]>();
			const either = Either.traverseInto(
				["a", "b"],
				(char, idx): Either<1, [number, string]> =>
					Either.right([idx, char]),
				builder,
			);
			expectTypeOf(either).toEqualTypeOf<Either<1, [number, string][]>>();
			expect(either).to.deep.equal(
				Either.right([
					[0, "a"],
					[1, "b"],
				]),
			);
		});
	});

	describe("traverse", () => {
		it("applies the function to the elements and collects the successes in an array if all results are Right", () => {
			const either = Either.traverse(
				["a", "b"],
				(char, idx): Either<1, [number, string]> =>
					Either.right([idx, char]),
			);
			expectTypeOf(either).toEqualTypeOf<Either<1, [number, string][]>>();
			expect(either).to.deep.equal(
				Either.right([
					[0, "a"],
					[1, "b"],
				]),
			);
		});
	});

	describe("allInto", () => {
		it("collects the successes into the Builder if all elements are Right", () => {
			const builder = new TestBuilder<number>();
			const either = Either.allInto(
				[Either.right<2, 1>(2), Either.right<4, 3>(4)],
				builder,
			);
			expectTypeOf(either).toEqualTypeOf<Either<1 | 3, number[]>>();
			expect(either).to.deep.equal(Either.right([2, 4]));
		});
	});

	describe("all", () => {
		it("collects the successes in an array if all elements are Right", () => {
			const either = Either.all([
				Either.right<2, 1>(2),
				Either.right<4, 3>(4),
			]);
			expectTypeOf(either).toEqualTypeOf<Either<1 | 3, [2, 4]>>();
			expect(either).to.deep.equal(Either.right([2, 4]));
		});
	});

	describe("allProps", () => {
		it("collects the successes in an object if all elements are Right", () => {
			const either = Either.allProps({
				two: Either.right<2, 1>(2),
				four: Either.right<4, 3>(4),
			});
			expectTypeOf(either).toEqualTypeOf<
				Either<1 | 3, { two: 2; four: 4 }>
			>();
			expect(either).to.deep.equal(Either.right({ two: 2, four: 4 }));
		});
	});

	describe("forEach", () => {
		it("applies the function to the elements while the result is Right", () => {
			const results: [number, string][] = [];
			const either = Either.forEach(
				["a", "b"],
				(char, idx): Either<1, void> => {
					results.push([idx, char]);
					return Either.right(undefined);
				},
			);
			expectTypeOf(either).toEqualTypeOf<Either<1, void>>();
			expect(either).to.deep.equal(Either.right(undefined));
			expect(results).to.deep.equal([
				[0, "a"],
				[1, "b"],
			]);
		});
	});

	describe("lift", () => {
		it("applies the function to the successes if all arguments are Right", () => {
			function f<A, B>(lhs: A, rhs: B): [A, B] {
				return [lhs, rhs];
			}
			const lifted = Either.lift(f<2, 4>);
			expectTypeOf(lifted).toEqualTypeOf<
				<E>(lhs: Either<E, 2>, rhs: Either<E, 4>) => Either<E, [2, 4]>
			>();

			const either = lifted(Either.right<2, 1>(2), Either.right<4, 3>(4));
			expectTypeOf(either).toEqualTypeOf<Either<1 | 3, [2, 4]>>();
			expect(either).to.deep.equal(Either.right([2, 4]));
		});
	});

	describe("#[Eq.eq]", () => {
		it("compares the values if both variants are Left", () => {
			const property = Fc.property(arbNum(), arbNum(), (lhs, rhs) => {
				expect(eq(Either.left(lhs), Either.left(rhs))).to.equal(
					eq(lhs, rhs),
				);
			});
			Fc.assert(property);
		});

		it("compares any Left and any Right as inequal", () => {
			const property = Fc.property(arbNum(), arbNum(), (lhs, rhs) => {
				expect(eq(Either.left(lhs), Either.right(rhs))).to.be.false;
			});
			Fc.assert(property);
		});

		it("compares any Right and any Left as inequal", () => {
			const property = Fc.property(arbNum(), arbNum(), (lhs, rhs) => {
				expect(eq(Either.right(lhs), Either.left(rhs))).to.be.false;
			});
			Fc.assert(property);
		});

		it("compares the values if both variants are Right", () => {
			const property = Fc.property(arbNum(), arbNum(), (lhs, rhs) => {
				expect(eq(Either.right(lhs), Either.right(rhs))).to.equal(
					eq(lhs, rhs),
				);
			});
			Fc.assert(property);
		});

		it("implements a lawful equivalence relation", () => {
			expectLawfulEq(arbEither(arbNum(), arbNum()));
		});
	});

	describe("#[Ord.cmp]", () => {
		it("compares the values if both variants are Left", () => {
			const property = Fc.property(arbNum(), arbNum(), (lhs, rhs) => {
				expect(cmp(Either.left(lhs), Either.left(rhs))).to.equal(
					cmp(lhs, rhs),
				);
			});
			Fc.assert(property);
		});

		it("compares any Left as less than any Right", () => {
			const property = Fc.property(arbNum(), arbNum(), (lhs, rhs) => {
				expect(cmp(Either.left(lhs), Either.right(rhs))).to.equal(
					Ordering.less,
				);
			});
			Fc.assert(property);
		});

		it("compares any Right as greater than any Left", () => {
			const property = Fc.property(arbNum(), arbNum(), (lhs, rhs) => {
				expect(cmp(Either.right(lhs), Either.left(rhs))).to.equal(
					Ordering.greater,
				);
			});
			Fc.assert(property);
		});

		it("compares the values if both variants are Right", () => {
			const property = Fc.property(arbNum(), arbNum(), (lhs, rhs) => {
				expect(cmp(Either.right(lhs), Either.right(rhs))).to.equal(
					cmp(lhs, rhs),
				);
			});
			Fc.assert(property);
		});

		it("implements a lawful total order", () => {
			expectLawfulOrd(arbEither(arbNum(), arbNum()));
		});
	});

	describe("#[Semigroup.cmb]", () => {
		it("combines the values if both variants are Right", () => {
			const property = Fc.property(arbStr(), arbStr(), (lhs, rhs) => {
				expect(cmb(Either.right(lhs), Either.right(rhs))).to.deep.equal(
					Either.right(cmb(lhs, rhs)),
				);
			});
			Fc.assert(property);
		});

		it("implements a lawful semigroup", () => {
			expectLawfulSemigroup(arbEither(arbStr(), arbStr()));
		});
	});

	describe("#isLeft", () => {
		it("returns true if the variant is Left", () => {
			expect(Either.left<1, 2>(1).isLeft()).to.be.true;
		});

		it("returns false if the variant is Right", () => {
			expect(Either.right<2, 1>(2).isLeft()).to.be.false;
		});
	});

	describe("#isRight", () => {
		it("returns false if the variant is Left", () => {
			expect(Either.left<1, 2>(1).isRight()).to.be.false;
		});

		it("returns true if the variant is Right", () => {
			expect(Either.right<2, 1>(2).isRight()).to.be.true;
		});
	});

	describe("#match", () => {
		it("applies the first function to the value if the variant is Left", () => {
			const result = Either.left<1, 2>(1).match(
				(one): [1, 3] => [one, 3],
				(two): [2, 4] => [two, 4],
			);
			expectTypeOf(result).toEqualTypeOf<[1, 3] | [2, 4]>();
			expect(result).to.deep.equal([1, 3]);
		});

		it("applies the second function to the value if the variant is Right", () => {
			const result = Either.right<2, 1>(2).match(
				(one): [1, 3] => [one, 3],
				(two): [2, 4] => [two, 4],
			);
			expectTypeOf(result).toEqualTypeOf<[1, 3] | [2, 4]>();
			expect(result).to.deep.equal([2, 4]);
		});
	});

	describe("#unwrapLeftOrElse", () => {
		it("extracts the value if the variant is Left", () => {
			const result = Either.left<1, 2>(1).unwrapLeftOrElse(
				(two): [2, 4] => [two, 4],
			);
			expectTypeOf(result).toEqualTypeOf<1 | [2, 4]>();
			expect(result).to.deep.equal(1);
		});

		it("applies the second function to the value if the variant is Right", () => {
			const result = Either.right<2, 1>(2).unwrapLeftOrElse(
				(two): [2, 4] => [two, 4],
			);
			expectTypeOf(result).toEqualTypeOf<1 | [2, 4]>();
			expect(result).to.deep.equal([2, 4]);
		});
	});

	describe("#unwrapRightOrElse", () => {
		it("applies the first function to the value if the variant is Left", () => {
			const result = Either.left<1, 2>(1).unwrapRightOrElse(
				(one): [1, 3] => [one, 3],
			);
			expectTypeOf(result).toEqualTypeOf<[1, 3] | 2>();
			expect(result).to.deep.equal([1, 3]);
		});

		it("extracts the value if the variant is Right", () => {
			const result = Either.right<2, 1>(2).unwrapRightOrElse(
				(one): [1, 3] => [one, 3],
			);
			expectTypeOf(result).toEqualTypeOf<[1, 3] | 2>();
			expect(result).to.deep.equal(2);
		});
	});

	describe("#orElse", () => {
		it("applies the continuation to the failure if the variant is Left", () => {
			const either = Either.left<1, 2>(1).orElse(
				(one): Either<[1, 3], 4> => Either.left([one, 3]),
			);
			expectTypeOf(either).toEqualTypeOf<Either<[1, 3], 2 | 4>>();
			expect(either).to.deep.equal(Either.left([1, 3]));
		});

		it("does not apply the continuation if the variant is Right", () => {
			const either = Either.right<2, 1>(2).orElse(
				(one): Either<[1, 3], 4> => Either.left([one, 3]),
			);
			expectTypeOf(either).toEqualTypeOf<Either<[1, 3], 2 | 4>>();
			expect(either).to.deep.equal(Either.right(2));
		});
	});

	describe("#or", () => {
		it("returns the fallback Either if the variant is Left", () => {
			const either = Either.left<1, 2>(1).or(Either.right<4, 3>(4));
			expectTypeOf(either).toEqualTypeOf<Either<3, 2 | 4>>();
			expect(either).to.deep.equal(Either.right(4));
		});

		it("returns the original Either if the variant is Right", () => {
			const either = Either.right<2, 1>(2).or(Either.right<4, 3>(4));
			expectTypeOf(either).toEqualTypeOf<Either<3, 2 | 4>>();
			expect(either).to.deep.equal(Either.right(2));
		});
	});

	describe("#andThen", () => {
		it("does not apply the continuation if the variant is Left", () => {
			const either = Either.left<1, 2>(1).andThen(
				(two): Either<3, [2, 4]> => Either.right([two, 4]),
			);
			expectTypeOf(either).toEqualTypeOf<Either<1 | 3, [2, 4]>>();
			expect(either).to.deep.equal(Either.left(1));
		});

		it("applies the continuation to the success if the variant is Right", () => {
			const either = Either.right<2, 1>(2).andThen(
				(two): Either<3, [2, 4]> => Either.right([two, 4]),
			);
			expectTypeOf(either).toEqualTypeOf<Either<1 | 3, [2, 4]>>();
			expect(either).to.deep.equal(Either.right([2, 4]));
		});
	});

	describe("#andThenGo", () => {
		it("applies the continuation to the success if the variant is Right", () => {
			const either = Either.right<2, 1>(2).andThenGo(
				function* (two): Either.Go<3, [2, 4]> {
					const four = yield* Either.right<4, 3>(4);
					return [two, four];
				},
			);
			expectTypeOf(either).toEqualTypeOf<Either<1 | 3, [2, 4]>>();
			expect(either).to.deep.equal(Either.right([2, 4]));
		});
	});

	describe("#flatten", () => {
		it("removes one level of nesting if the variant is Right", () => {
			const either = Either.right<Either<3, 2>, 1>(
				Either.right(2),
			).flatten();
			expectTypeOf(either).toEqualTypeOf<Either<1 | 3, 2>>();
			expect(either).to.deep.equal(Either.right(2));
		});
	});

	describe("#and", () => {
		it("returns the other Either if the variant is Right", () => {
			const either = Either.right<2, 1>(2).and(Either.right<4, 3>(4));
			expectTypeOf(either).toEqualTypeOf<Either<1 | 3, 4>>();
			expect(either).to.deep.equal(Either.right(4));
		});
	});

	describe("#zipWith", () => {
		it("applies the function to the successes if both variants are Right", () => {
			const either = Either.right<2, 1>(2).zipWith(
				Either.right<4, 3>(4),
				(two, four): [2, 4] => [two, four],
			);
			expectTypeOf(either).toEqualTypeOf<Either<1 | 3, [2, 4]>>();
			expect(either).to.deep.equal(Either.right([2, 4]));
		});
	});

	describe("#mapLeft", () => {
		it("applies the function to the value if the variant is Left", () => {
			const either = Either.left<1, 2>(1).mapLeft((one): [1, 3] => [
				one,
				3,
			]);
			expectTypeOf(either).toEqualTypeOf<Either<[1, 3], 2>>();
			expect(either).to.deep.equal(Either.left([1, 3]));
		});
	});

	describe("#map", () => {
		it("applies the function to the value if the variant is Right", () => {
			const either = Either.right<2, 1>(2).map((two): [2, 4] => [two, 4]);
			expectTypeOf(either).toEqualTypeOf<Either<1, [2, 4]>>();
			expect(either).to.deep.equal(Either.right([2, 4]));
		});
	});
});
