/*
 * Copyright 2022-2023 Joshua Martinez-Maes
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

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
	TestBuilder,
	arbNum,
	arbStr,
	delay,
	expectLawfulEq,
	expectLawfulOrd,
	expectLawfulSemigroup,
} from "./_test/utils.js";
import { cmb } from "./cmb.js";
import { Ordering, cmp, eq } from "./cmp.js";
import { AsyncEither, Either } from "./either.js";
import { Validation } from "./validation.js";

describe("Either", () => {
	function arbEither<A, B>(
		arbLeft: fc.Arbitrary<A>,
		arbRight: fc.Arbitrary<B>,
	): fc.Arbitrary<Either<A, B>> {
		return fc.oneof(arbLeft.map(Either.left), arbRight.map(Either.right));
	}

	describe("left", () => {
		it("constructs a Left variant", () => {
			const either = Either.left<1, 2>(1);
			expect(either).to.be.an.instanceOf(Either.Left);
			expect(either.kind).to.equal(Either.Kind.LEFT);
			expect(either.val).to.equal(1);
		});
	});

	describe("right", () => {
		it("constructs a Right variant", () => {
			const either = Either.right<2, 1>(2);
			expect(either).to.be.an.instanceOf(Either.Right);
			expect(either.kind).to.equal(Either.Kind.RIGHT);
			expect(either.val).to.equal(2);
		});
	});

	describe("fromValidation", () => {
		it("constructs a Left if the Validation is an Err", () => {
			const either = Either.fromValidation(Validation.err<1, 2>(1));
			expect(either).to.deep.equal(Either.left(1));
		});

		it("constructs a Right if the Validation is an Ok", () => {
			const either = Either.fromValidation(Validation.ok<2, 1>(2));
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
			expect(either).to.deep.equal(Either.left(3));
		});

		it("completes if all yielded values are Right", () => {
			function* f(): Either.Go<1 | 3, [2, 4]> {
				const two = yield* Either.right<2, 1>(2);
				const four = yield* Either.right<4, 3>(4);
				return [two, four];
			}
			const either = Either.go(f());
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
			expect(either).to.deep.equal(Either.left(3));
		});
	});

	describe("wrapGo", () => {
		it("adapts the generator function to return an Either", () => {
			function* f(two: 2): Either.Go<never, [2, 4]> {
				const four = yield* Either.right<4>(4);
				return [two, four];
			}
			const wrapped = Either.wrapGo(f);
			const either = wrapped(2);
			expect(either).to.deep.equal(Either.right([2, 4]));
		});
	});

	describe("reduce", () => {
		it("reduces the finite iterable from left to right in the context of Either", () => {
			const either = Either.reduce(
				["x", "y"],
				(chars, char) => Either.right<string, 1>(chars + char),
				"",
			);
			expect(either).to.deep.equal(Either.right("xy"));
		});
	});

	describe("traverseInto", () => {
		it("applies the function to the elements and collects the successes into the Builder if all results are Right", () => {
			const builder = new TestBuilder<[number, string]>();
			const either = Either.traverseInto(
				["a", "b"],
				(char, idx) => Either.right<[number, string]>([idx, char]),
				builder,
			);
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
			const either = Either.traverse(["a", "b"], (char, idx) =>
				Either.right<[number, string]>([idx, char]),
			);
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
			expect(either).to.deep.equal(Either.right([2, 4]));
		});
	});

	describe("all", () => {
		it("collects the successes in an array if all elements are Right", () => {
			const either = Either.all([
				Either.right<2, 1>(2),
				Either.right<4, 3>(4),
			]);
			expect(either).to.deep.equal(Either.right([2, 4]));
		});
	});

	describe("allProps", () => {
		it("collects the successes in an object if all elements are Right", () => {
			const either = Either.allProps({
				two: Either.right<2, 1>(2),
				four: Either.right<4, 3>(4),
			});
			expect(either).to.deep.equal(Either.right({ two: 2, four: 4 }));
		});
	});

	describe("forEach", () => {
		it("applies the function to the elements while the result is Right", () => {
			const results: [number, string][] = [];
			const either = Either.forEach(["a", "b"], (char, idx) => {
				results.push([idx, char]);
				return Either.right(undefined);
			});
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
			const either = Either.lift(f<2, 4>)(
				Either.right<2, 1>(2),
				Either.right<4, 3>(4),
			);
			expect(either).to.deep.equal(Either.right([2, 4]));
		});
	});

	describe("#[Eq.eq]", () => {
		it("compares the values if both variants are Left", () => {
			const property = fc.property(arbNum(), arbNum(), (lhs, rhs) => {
				expect(eq(Either.left(lhs), Either.left(rhs))).to.equal(
					eq(lhs, rhs),
				);
			});
			fc.assert(property);
		});

		it("compares any Left and any Right as inequal", () => {
			const property = fc.property(arbNum(), arbNum(), (lhs, rhs) => {
				expect(eq(Either.left(lhs), Either.right(rhs))).to.be.false;
			});
			fc.assert(property);
		});

		it("compares any Right and any Left as inequal", () => {
			const property = fc.property(arbNum(), arbNum(), (lhs, rhs) => {
				expect(eq(Either.right(lhs), Either.left(rhs))).to.be.false;
			});
			fc.assert(property);
		});

		it("compares the values if both variants are Right", () => {
			const property = fc.property(arbNum(), arbNum(), (lhs, rhs) => {
				expect(eq(Either.right(lhs), Either.right(rhs))).to.equal(
					eq(lhs, rhs),
				);
			});
			fc.assert(property);
		});

		it("implements a lawful equivalence relation", () => {
			expectLawfulEq(arbEither(arbNum(), arbNum()));
		});
	});

	describe("#[Ord.cmp]", () => {
		it("compares the values if both variants are Left", () => {
			const property = fc.property(arbNum(), arbNum(), (lhs, rhs) => {
				expect(cmp(Either.left(lhs), Either.left(rhs))).to.equal(
					cmp(lhs, rhs),
				);
			});
			fc.assert(property);
		});

		it("compares any Left as less than any Right", () => {
			const property = fc.property(arbNum(), arbNum(), (lhs, rhs) => {
				expect(cmp(Either.left(lhs), Either.right(rhs))).to.equal(
					Ordering.less,
				);
			});
			fc.assert(property);
		});

		it("compares any Right as greater than any Left", () => {
			const property = fc.property(arbNum(), arbNum(), (lhs, rhs) => {
				expect(cmp(Either.right(lhs), Either.left(rhs))).to.equal(
					Ordering.greater,
				);
			});
			fc.assert(property);
		});

		it("compares the values if both variants are Right", () => {
			const property = fc.property(arbNum(), arbNum(), (lhs, rhs) => {
				expect(cmp(Either.right(lhs), Either.right(rhs))).to.equal(
					cmp(lhs, rhs),
				);
			});
			fc.assert(property);
		});

		it("implements a lawful total order", () => {
			expectLawfulOrd(arbEither(arbNum(), arbNum()));
		});
	});

	describe("#[Semigroup.cmb]", () => {
		it("combines the values if both variants are Right", () => {
			const property = fc.property(arbStr(), arbStr(), (lhs, rhs) => {
				expect(cmb(Either.right(lhs), Either.right(rhs))).to.deep.equal(
					Either.right(cmb(lhs, rhs)),
				);
			});
			fc.assert(property);
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

	describe("#unwrap", () => {
		it("applies the first function to the value if the variant is Left", () => {
			const result = Either.left<1, 2>(1).unwrap(
				(one): [1, 3] => [one, 3],
				(two): [2, 4] => [two, 4],
			);
			expect(result).to.deep.equal([1, 3]);
		});

		it("applies the second function to the value if the variant is Right", () => {
			const result = Either.right<2, 1>(2).unwrap(
				(one): [1, 3] => [one, 3],
				(two): [2, 4] => [two, 4],
			);
			expect(result).to.deep.equal([2, 4]);
		});
	});

	describe("#orElse", () => {
		it("applies the continuation to the failure if the variant is Left", () => {
			const either = Either.left<1, 2>(1).orElse(
				(one): Either<[1, 3], 4> => Either.left([one, 3]),
			);
			expect(either).to.deep.equal(Either.left([1, 3]));
		});

		it("does not apply the continuation if the variant is Right", () => {
			const either = Either.right<2, 1>(2).orElse(
				(one): Either<[1, 3], 4> => Either.left([one, 3]),
			);
			expect(either).to.deep.equal(Either.right(2));
		});
	});

	describe("#or", () => {
		it("returns the fallback Either if the variant is Left", () => {
			const either = Either.left<1, 2>(1).or(Either.right<4, 3>(4));
			expect(either).to.deep.equal(Either.right(4));
		});

		it("returns the original Either if the variant is Right", () => {
			const either = Either.right<2, 1>(2).or(Either.right<4, 3>(4));
			expect(either).to.deep.equal(Either.right(2));
		});
	});

	describe("#andThen", () => {
		it("does not apply the continuation if the variant is Left", () => {
			const either = Either.left<1, 2>(1).andThen(
				(two): Either<3, [2, 4]> => Either.right([two, 4]),
			);
			expect(either).to.deep.equal(Either.left(1));
		});

		it("applies the continuation to the success if the variant is Right", () => {
			const either = Either.right<2, 1>(2).andThen(
				(two): Either<3, [2, 4]> => Either.right([two, 4]),
			);
			expect(either).to.deep.equal(Either.right([2, 4]));
		});
	});

	describe("#andThenGo", () => {
		it("does not apply the continuation if the variant is Left", () => {
			const either = Either.left<1, 2>(1).andThenGo(
				function* (two): Either.Go<3, [2, 4]> {
					const four = yield* Either.right<4, 3>(4);
					return [two, four];
				},
			);
			expect(either).to.deep.equal(Either.left(1));
		});

		it("applies the continuation to the success if the variant is Right", () => {
			const either = Either.right<2, 1>(2).andThenGo(
				function* (two): Either.Go<3, [2, 4]> {
					const four = yield* Either.right<4, 3>(4);
					return [two, four];
				},
			);
			expect(either).to.deep.equal(Either.right([2, 4]));
		});
	});

	describe("#and", () => {
		it("returns the original Either if the variant is Left", () => {
			const either = Either.left<1, 2>(1).and(Either.right<4, 3>(4));
			expect(either).to.deep.equal(Either.left(1));
		});

		it("returns the other Either if the variant is Right", () => {
			const either = Either.right<2, 1>(2).and(Either.right<4, 3>(4));
			expect(either).to.deep.equal(Either.right(4));
		});
	});

	describe("#zipWith", () => {
		it("applies the function to the successes if both variants are Right", () => {
			const either = Either.right<2, 1>(2).zipWith(
				Either.right<4, 3>(4),
				(two, four): [2, 4] => [two, four],
			);
			expect(either).to.deep.equal(Either.right([2, 4]));
		});
	});

	describe("#lmap", () => {
		it("applies the function to the value if the variant is Left", () => {
			const either = Either.left<1, 2>(1).lmap((one): [1, 3] => [one, 3]);
			expect(either).to.deep.equal(Either.left([1, 3]));
		});
	});

	describe("#map", () => {
		it("applies the function to the value if the variant is Right", () => {
			const either = Either.right<2, 1>(2).map((two): [2, 4] => [two, 4]);
			expect(either).to.deep.equal(Either.right([2, 4]));
		});
	});
});

describe("AsyncEither", () => {
	describe("go", () => {
		it("short-circuits on the first yielded Left", async () => {
			async function* f(): AsyncEither.Go<1 | 3, [2, 4]> {
				const two = yield* await Promise.resolve(Either.right<2, 1>(2));
				const four = yield* await Promise.resolve(Either.left<3, 4>(3));
				return [two, four];
			}
			const either = await AsyncEither.go(f());
			expect(either).to.deep.equal(Either.left(3));
		});

		it("completes and returns if all yielded values are Right", async () => {
			async function* f(): AsyncEither.Go<1 | 3, [2, 4]> {
				const two = yield* await Promise.resolve(Either.right<2, 1>(2));
				const four = yield* await Promise.resolve(
					Either.right<4, 3>(4),
				);
				return [two, four];
			}
			const either = await AsyncEither.go(f());
			expect(either).to.deep.equal(Either.right([2, 4]));
		});

		it("unwraps Promises in Right variants and in return", async () => {
			async function* f(): AsyncEither.Go<1 | 3, [2, 4]> {
				const two = yield* await Promise.resolve(
					Either.right<Promise<2>, 1>(Promise.resolve(2)),
				);
				const four = yield* await Promise.resolve(
					Either.right<Promise<4>, 3>(Promise.resolve(4)),
				);
				return Promise.resolve([two, four]);
			}
			const either = await AsyncEither.go(f());
			expect(either).to.deep.equal(Either.right([2, 4]));
		});

		it("executes the finally block if a Left is yielded in the try block", async () => {
			const logs: string[] = [];
			async function* f(): AsyncEither.Go<1, 2> {
				try {
					return yield* await Promise.resolve(Either.left<1, 2>(1));
				} finally {
					logs.push("finally");
				}
			}
			const either = await AsyncEither.go(f());
			expect(either).to.deep.equal(Either.left(1));
			expect(logs).to.deep.equal(["finally"]);
		});

		it("keeps the most recent yielded Left when using try and finally blocks", async () => {
			async function* f(): AsyncEither.Go<1 | 3, 2> {
				try {
					return yield* await Promise.resolve(Either.left<1, 2>(1));
				} finally {
					yield* await Promise.resolve(Either.left<3, 4>(3));
				}
			}
			const either = await AsyncEither.go(f());
			expect(either).to.deep.equal(Either.left(3));
		});
	});

	describe("wrapGo", () => {
		it("adapts the async generator function to return an AsyncEither", async () => {
			async function* f(two: 2): AsyncEither.Go<never, [2, 4]> {
				const four = yield* await Promise.resolve(Either.right<4>(4));
				return [two, four];
			}
			const wrapped = AsyncEither.wrapGo(f);
			const either = await wrapped(2);
			expect(either).to.deep.equal(Either.right([2, 4]));
		});
	});

	describe("reduce", () => {
		it("reduces the finite async iterable from left to right in the context of Either", async () => {
			async function* gen(): AsyncGenerator<string> {
				yield delay(50).then(() => "x");
				yield delay(10).then(() => "y");
			}
			const either = await AsyncEither.reduce(
				gen(),
				(chars, char) =>
					delay(1).then(() => Either.right(chars + char)),
				"",
			);
			expect(either).to.deep.equal(Either.right("xy"));
		});
	});

	describe("traverseInto", () => {
		it("applies the function to the elements and collects the successes into the Builder if all results are Right", async () => {
			async function* gen(): AsyncGenerator<string> {
				yield delay(50).then(() => "a");
				yield delay(10).then(() => "b");
			}
			const builder = new TestBuilder<[number, string]>();
			const either = await AsyncEither.traverseInto(
				gen(),
				(char, idx) =>
					delay(1).then(() =>
						Either.right<[number, string]>([idx, char]),
					),
				builder,
			);
			expect(either).to.deep.equal(
				Either.right([
					[0, "a"],
					[1, "b"],
				]),
			);
		});
	});

	describe("traverse", () => {
		it("applies the function to the elements and collects the successes in an array if all results are Right", async () => {
			async function* gen(): AsyncGenerator<string> {
				yield delay(50).then(() => "a");
				yield delay(10).then(() => "b");
			}
			const either = await AsyncEither.traverse(gen(), (char, idx) =>
				delay(1).then(() =>
					Either.right<[number, string]>([idx, char]),
				),
			);
			expect(either).to.deep.equal(
				Either.right([
					[0, "a"],
					[1, "b"],
				]),
			);
		});
	});

	describe("allInto", () => {
		it("collects the successes into the Builder if all elements are Right", async () => {
			async function* gen(): AsyncGenerator<Either<never, number>> {
				yield delay(50).then(() => Either.right(2));
				yield delay(10).then(() => Either.right(4));
			}
			const builder = new TestBuilder<number>();
			const either = await AsyncEither.allInto(gen(), builder);
			expect(either).to.deep.equal(Either.right([2, 4]));
		});
	});

	describe("all", () => {
		it("collects the successes in an array if all elements are Right", async () => {
			async function* gen(): AsyncGenerator<Either<never, number>> {
				yield delay(50).then(() => Either.right(2));
				yield delay(10).then(() => Either.right(4));
			}
			const either = await AsyncEither.all(gen());
			expect(either).to.deep.equal(Either.right([2, 4]));
		});
	});

	describe("forEach", () => {
		it("applies the function to the elements while the result is Right", async () => {
			async function* gen(): AsyncGenerator<string> {
				yield delay(50).then(() => "a");
				yield delay(10).then(() => "b");
			}
			const results: [number, string][] = [];
			const either = await AsyncEither.forEach(gen(), (char, idx) =>
				delay(1).then(() => {
					results.push([idx, char]);
					return Either.right(undefined);
				}),
			);
			expect(either).to.deep.equal(Either.right(undefined));
			expect(results).to.deep.equal([
				[0, "a"],
				[1, "b"],
			]);
		});
	});

	describe("traverseIntoPar", () => {
		it("applies the function to the elements and short-circuits on the first Left result", async () => {
			const either = await AsyncEither.traverseIntoPar(
				["a", "b"],
				(char, idx) =>
					delay(char === "a" ? 50 : 10).then(() =>
						char === "b"
							? Either.left<[number, string]>([idx, char])
							: Either.right([idx, char]),
					),
				new TestBuilder<[number, string]>(),
			);
			expect(either).to.deep.equal(Either.left([1, "b"]));
		});

		it("applies the function to the elements and collects the successes into the Builder if all results are Right", async () => {
			const builder = new TestBuilder<[number, string]>();
			const either = await AsyncEither.traverseIntoPar(
				["a", "b"],
				(char, idx) =>
					delay(char === "a" ? 50 : 10).then(() =>
						Either.right([idx, char]),
					),
				builder,
			);
			expect(either).to.deep.equal(
				Either.right([
					[1, "b"],
					[0, "a"],
				]),
			);
		});
	});

	describe("traversePar", () => {
		it("applies the function to the elements and collects the successes in an array if all results are Right", async () => {
			const either = await AsyncEither.traversePar(
				["a", "b"],
				(char, idx) =>
					delay(char === "a" ? 50 : 10).then(() =>
						Either.right<[number, string]>([idx, char]),
					),
			);
			expect(either).to.deep.equal(
				Either.right([
					[0, "a"],
					[1, "b"],
				]),
			);
		});
	});

	describe("allIntoPar", () => {
		it("collects the successes into the Builder if all elements are Right", async () => {
			const builder = new TestBuilder<number>();
			const either = await AsyncEither.allIntoPar(
				[
					delay(50).then(() => Either.right<2, 1>(2)),
					delay(10).then(() => Either.right<4, 3>(4)),
				],
				builder,
			);
			expect(either).to.deep.equal(Either.right([4, 2]));
		});
	});

	describe("allPar", () => {
		it("collects the successes in an array if all elements are Right", async () => {
			const either = await AsyncEither.allPar([
				delay(50).then<Either<1, 2>>(() => Either.right(2)),
				delay(10).then<Either<3, 4>>(() => Either.right(4)),
			]);
			expect(either).to.deep.equal(Either.right([2, 4]));
		});
	});

	describe("allPropsPar", () => {
		it("collects the successes in an object if all elements are Right", async () => {
			const either = await AsyncEither.allPropsPar({
				two: delay(50).then<Either<1, 2>>(() => Either.right(2)),
				four: delay(10).then<Either<3, 4>>(() => Either.right(4)),
			});
			expect(either).to.deep.equal(Either.right({ two: 2, four: 4 }));
		});
	});

	describe("forEachPar", () => {
		it("applies the function to the elements while the result is Right", async () => {
			const results: [number, string][] = [];
			const either = await AsyncEither.forEachPar(
				["a", "b"],
				(char, idx) =>
					delay(char === "a" ? 50 : 10).then(() => {
						results.push([idx, char]);
						return Either.right(undefined);
					}),
			);
			expect(either).to.deep.equal(Either.right(undefined));
			expect(results).to.deep.equal([
				[1, "b"],
				[0, "a"],
			]);
		});
	});

	describe("liftPar", () => {
		it("applies the function to the successes if all arguments are Right", async () => {
			async function f<A, B>(lhs: A, rhs: B): Promise<[A, B]> {
				return [lhs, rhs];
			}
			const either = await AsyncEither.liftPar(f<2, 4>)(
				delay(50).then(() => Either.right<2, 1>(2)),
				delay(10).then(() => Either.right<4, 3>(4)),
			);
			expect(either).to.deep.equal(Either.right([2, 4]));
		});
	});
});
