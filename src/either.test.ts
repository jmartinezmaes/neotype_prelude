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

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
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
			function* f(): Either.Go<1 | [2, 3], [2, 4]> {
				const x = yield* Either.right<2, 1>(2);
				const y = yield* Either.left<[2, 3], 4>([x, 3]);
				return [x, y];
			}
			const either = Either.go(f());
			expect(either).to.deep.equal(Either.left([2, 3]));
		});

		it("completes if all yielded values are Right", () => {
			function* f(): Either.Go<1 | 3, [2, 2, 4]> {
				const x = yield* Either.right<2, 1>(2);
				const [y, z] = yield* Either.right<[2, 4], 3>([x, 4]);
				return [x, y, z];
			}
			const either = Either.go(f());
			expect(either).to.deep.equal(Either.right([2, 2, 4]));
		});

		it("executes the finally block if a Left is yielded in the try block", () => {
			const logs: string[] = [];
			function* f(): Either.Go<1, number[]> {
				try {
					const results = [];
					const x = yield* Either.left<1, 2>(1);
					results.push(x);
					return results;
				} finally {
					logs.push("finally");
				}
			}
			const either = Either.go(f());
			expect(either).to.deep.equal(Either.left(1));
			expect(logs).to.deep.equal(["finally"]);
		});

		it("keeps the most recent yielded Left when using try and finally blocks", () => {
			function* f(): Either.Go<1 | 3, number[]> {
				try {
					const results = [];
					const x = yield* Either.left<1, 2>(1);
					results.push(x);
					return results;
				} finally {
					yield* Either.left<3, 4>(3);
				}
			}
			const either = Either.go(f());
			expect(either).to.deep.equal(Either.left(3));
		});
	});

	describe("reduce", () => {
		it("reduces the finite iterable from left to right in the context of Either", () => {
			const either = Either.reduce(
				["x", "y"],
				(xs, x) => Either.right<string, 1>(xs + x),
				"",
			);
			expect(either).to.deep.equal(Either.right("xy"));
		});
	});

	describe("collect", () => {
		it("turns the array or the tuple literal of Either elements inside out", () => {
			const either = Either.collect([
				Either.right<2, 1>(2),
				Either.right<4, 3>(4),
			]);
			expect(either).to.deep.equal(Either.right([2, 4]));
		});
	});

	describe("gather", () => {
		it("turns the record or the object literal of Either elements inside out", () => {
			const either = Either.gather({
				x: Either.right<2, 1>(2),
				y: Either.right<4, 3>(4),
			});
			expect(either).to.deep.equal(Either.right({ x: 2, y: 4 }));
		});
	});

	describe("lift", () => {
		it("lifts the function into the context of Either", () => {
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

	describe("goAsync", () => {
		it("short-circuits on the first yielded Left", async () => {
			async function* f(): Either.GoAsync<1 | [2, 3], [2, 4]> {
				const x = yield* await Promise.resolve(Either.right<2, 1>(2));
				const y = yield* await Promise.resolve(
					Either.left<[2, 3], 4>([x, 3]),
				);
				return [x, y];
			}
			const either = await Either.goAsync(f());
			expect(either).to.deep.equal(Either.left([2, 3]));
		});

		it("completes and returns if all yielded values are Right", async () => {
			async function* f(): Either.GoAsync<1 | 3, [2, 2, 4]> {
				const x = yield* await Promise.resolve(Either.right<2, 1>(2));
				const [y, z] = yield* await Promise.resolve(
					Either.right<[2, 4], 3>([x, 4]),
				);
				return [x, y, z];
			}
			const either = await Either.goAsync(f());
			expect(either).to.deep.equal(Either.right([2, 2, 4]));
		});

		it("unwraps Promises in Right variants and in return", async () => {
			async function* f(): Either.GoAsync<1 | 3, [2, 2, 4]> {
				const x = yield* await Promise.resolve(
					Either.right<Promise<2>, 1>(Promise.resolve(2)),
				);
				const [y, z] = yield* await Promise.resolve(
					Either.right<Promise<[2, 4]>, 3>(Promise.resolve([x, 4])),
				);
				return Promise.resolve([x, y, z]);
			}
			const either = await Either.goAsync(f());
			expect(either).to.deep.equal(Either.right([2, 2, 4]));
		});

		it("executes the finally block if a Left is yielded in the try block", async () => {
			const logs: string[] = [];
			async function* f(): Either.GoAsync<1, number[]> {
				try {
					const results = [];
					const x = yield* await Promise.resolve(
						Either.left<1, 2>(1),
					);
					results.push(x);
					return results;
				} finally {
					logs.push("finally");
				}
			}
			const either = await Either.goAsync(f());
			expect(either).to.deep.equal(Either.left(1));
			expect(logs).to.deep.equal(["finally"]);
		});

		it("keeps the most recent yielded Left when using try and finally blocks", async () => {
			async function* f(): Either.GoAsync<1 | 3, number[]> {
				try {
					const results = [];
					const x = yield* await Promise.resolve(
						Either.left<1, 2>(1),
					);
					results.push(x);
					return results;
				} finally {
					yield* await Promise.resolve(Either.left<3, 4>(3));
				}
			}
			const either = await Either.goAsync(f());
			expect(either).to.deep.equal(Either.left(3));
		});
	});

	describe("#[Eq.eq]", () => {
		it("compares the values if both variants are Left", () => {
			fc.assert(
				fc.property(arbNum(), arbNum(), (x, y) => {
					expect(eq(Either.left(x), Either.left(y))).to.equal(
						eq(x, y),
					);
				}),
			);
		});

		it("compares any Left and any Right as inequal", () => {
			fc.assert(
				fc.property(arbNum(), arbNum(), (x, y) => {
					expect(eq(Either.left(x), Either.right(y))).to.be.false;
				}),
			);
		});

		it("compares any Right and any Left as inequal", () => {
			fc.assert(
				fc.property(arbNum(), arbNum(), (x, y) => {
					expect(eq(Either.right(x), Either.left(y))).to.be.false;
				}),
			);
		});

		it("compares the values if both variants are Right", () => {
			fc.assert(
				fc.property(arbNum(), arbNum(), (x, y) => {
					expect(eq(Either.right(x), Either.right(y))).to.equal(
						eq(x, y),
					);
				}),
			);
		});

		it("implements a lawful equivalence relation", () => {
			expectLawfulEq(arbEither(arbNum(), arbNum()));
		});
	});

	describe("#[Ord.cmp]", () => {
		it("compares the values if both variants are Left", () => {
			fc.assert(
				fc.property(arbNum(), arbNum(), (x, y) => {
					expect(cmp(Either.left(x), Either.left(y))).to.equal(
						cmp(x, y),
					);
				}),
			);
		});

		it("compares any Left as less than any Right", () => {
			fc.assert(
				fc.property(arbNum(), arbNum(), (x, y) => {
					expect(cmp(Either.left(x), Either.right(y))).to.equal(
						Ordering.less,
					);
				}),
			);
		});

		it("compares any Right as greater than any Left", () => {
			fc.assert(
				fc.property(arbNum(), arbNum(), (x, y) => {
					expect(cmp(Either.right(x), Either.left(y))).to.equal(
						Ordering.greater,
					);
				}),
			);
		});

		it("compares the values if both variants are Right", () => {
			fc.assert(
				fc.property(arbNum(), arbNum(), (x, y) => {
					expect(cmp(Either.right(x), Either.right(y))).to.equal(
						cmp(x, y),
					);
				}),
			);
		});

		it("implements a lawful total order", () => {
			expectLawfulOrd(arbEither(arbNum(), arbNum()));
		});
	});

	describe("#[Semigroup.cmb]", () => {
		it("combines the values if both variants are Right", () => {
			fc.assert(
				fc.property(arbStr(), arbStr(), (x, y) => {
					expect(cmb(Either.right(x), Either.right(y))).to.deep.equal(
						Either.right(cmb(x, y)),
					);
				}),
			);
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
				(x): [1, 3] => [x, 3],
				(x): [2, 4] => [x, 4],
			);
			expect(result).to.deep.equal([1, 3]);
		});

		it("applies the second function to the value if the variant is Right", () => {
			const result = Either.right<2, 1>(2).unwrap(
				(x): [1, 3] => [x, 3],
				(x): [2, 4] => [x, 4],
			);
			expect(result).to.deep.equal([2, 4]);
		});
	});

	describe("#recover", () => {
		it("applies the continuation to the failure if the variant is Left", () => {
			const either = Either.left<1, 2>(1).recover(
				(x): Either<[1, 3], 4> => Either.left([x, 3]),
			);
			expect(either).to.deep.equal(Either.left([1, 3]));
		});

		it("does not apply the continuation if the variant is Right", () => {
			const either = Either.right<2, 1>(2).recover(
				(x): Either<[1, 3], 4> => Either.left([x, 3]),
			);
			expect(either).to.deep.equal(Either.right(2));
		});
	});

	describe("#flatMap", () => {
		it("does not apply the continuation if the variant is Left", () => {
			const either = Either.left<1, 2>(1).flatMap(
				(x): Either<3, [2, 4]> => Either.right([x, 4]),
			);
			expect(either).to.deep.equal(Either.left(1));
		});

		it("applies the continuation to the success if the variant is Right", () => {
			const either = Either.right<2, 1>(2).flatMap(
				(x): Either<3, [2, 4]> => Either.right([x, 4]),
			);
			expect(either).to.deep.equal(Either.right([2, 4]));
		});
	});

	describe("#zipWith", () => {
		it("applies the function to the successes if both variants are Right", () => {
			const either = Either.right<2, 1>(2).zipWith(
				Either.right<4, 3>(4),
				(lhs, rhs): [2, 4] => [lhs, rhs],
			);
			expect(either).to.deep.equal(Either.right([2, 4]));
		});
	});

	describe("#zipFst", () => {
		it("keeps only the first success if both variants are Right", () => {
			const either = Either.right<2, 1>(2).zipFst(Either.right<4, 3>(4));
			expect(either).to.deep.equal(Either.right(2));
		});
	});

	describe("#zipSnd", () => {
		it("keeps only the second success if both variants are Right", () => {
			const either = Either.right<2, 1>(2).zipSnd(Either.right<4, 3>(4));
			expect(either).to.deep.equal(Either.right(4));
		});
	});

	describe("#lmap", () => {
		it("applies the function to the value if the variant is Left", () => {
			const either = Either.left<1, 2>(1).lmap((x): [1, 3] => [x, 3]);
			expect(either).to.deep.equal(Either.left([1, 3]));
		});
	});

	describe("#map", () => {
		it("applies the function to the value if the variant is Right", () => {
			const either = Either.right<2, 1>(2).map((x): [2, 4] => [x, 4]);
			expect(either).to.deep.equal(Either.right([2, 4]));
		});
	});
});
