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

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
	Str,
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
import { Either } from "./either.js";
import { AsyncIor, Ior } from "./ior.js";
import { Validation } from "./validation.js";

describe("Ior", () => {
	function arbIor<A, B>(
		arbLeft: fc.Arbitrary<A>,
		arbRight: fc.Arbitrary<B>,
	): fc.Arbitrary<Ior<A, B>> {
		return fc.oneof(
			arbLeft.map(Ior.left),
			arbRight.map(Ior.right),
			arbLeft.chain((fst) => arbRight.map((snd) => Ior.both(fst, snd))),
		);
	}

	describe("left", () => {
		it("constucts a Left variant", () => {
			const ior = Ior.left<1, 2>(1);
			expect(ior).to.be.an.instanceOf(Ior.Left);
			expect(ior.kind).to.equal(Ior.Kind.LEFT);
			expect(ior.val).to.equal(1);
		});
	});

	describe("right", () => {
		it("constructs a Right variant", () => {
			const ior = Ior.right<2, 1>(2);
			expect(ior).to.be.an.instanceOf(Ior.Right);
			expect(ior.kind).to.equal(Ior.Kind.RIGHT);
			expect(ior.val).to.equal(2);
		});
	});

	describe("both", () => {
		it("constructs a Both variant", () => {
			const ior = Ior.both<1, 2>(1, 2);
			expect(ior).to.be.an.instanceOf(Ior.Both);
			expect(ior.kind).to.equal(Ior.Kind.BOTH);
			expect((ior as Ior.Both<1, 2>).fst).to.equal(1);
			expect((ior as Ior.Both<1, 2>).snd).to.equal(2);
			expect(ior.val).to.deep.equal([1, 2]);
		});
	});

	describe("fromEither", () => {
		it("constructs a Left if the Either is a Left", () => {
			const ior = Ior.fromEither(Either.left<1, 2>(1));
			expect(ior).to.deep.equal(Ior.left(1));
		});

		it("constructs a Right if the Either is a Right", () => {
			const ior = Ior.fromEither(Either.right<2, 1>(2));
			expect(ior).to.deep.equal(Ior.right(2));
		});
	});

	describe("fromValidation", () => {
		it("constructs a Left if the Validation is an Err", () => {
			const ior = Ior.fromValidation(Validation.err<1, 2>(1));
			expect(ior).to.deep.equal(Ior.left(1));
		});

		it("constructs a Right if the Validation is an Ok", () => {
			const ior = Ior.fromValidation(Validation.ok<2, 1>(2));
			expect(ior).to.deep.equal(Ior.right(2));
		});
	});

	describe("fromTuple", () => {
		it("constructs a Both from a 2-tuple of values", () => {
			const ior = Ior.fromTuple([1, 2] as [1, 2]);
			expect(ior).to.deep.equal(Ior.both(1, 2));
		});
	});

	describe("go", () => {
		it("short-circuits on the first yielded Left", () => {
			function* f(): Ior.Go<Str, [2, 4]> {
				const two = yield* Ior.right<2, Str>(2);
				const four = yield* Ior.left<Str, 4>(new Str("b"));
				return [two, four];
			}
			const ior = Ior.go(f());
			expect(ior).to.deep.equal(Ior.left(new Str("b")));
		});

		it("completes if all yielded values are Right", () => {
			function* f(): Ior.Go<Str, [2, 4]> {
				const two = yield* Ior.right<2, Str>(2);
				const four = yield* Ior.right<4, Str>(4);
				return [two, four];
			}
			const ior = Ior.go(f());
			expect(ior).to.deep.equal(Ior.right([2, 4]));
		});

		it("completes and retains the left-hand value if a Both is yielded after a Right", () => {
			function* f(): Ior.Go<Str, [2, 4]> {
				const two = yield* Ior.right<2, Str>(2);
				const four = yield* Ior.both<Str, 4>(new Str("b"), 4);
				return [two, four];
			}
			const ior = Ior.go(f());
			expect(ior).to.deep.equal(Ior.both(new Str("b"), [2, 4]));
		});

		it("short-circuits and combines the left-hand values if a Left is yielded after a Both", () => {
			function* f(): Ior.Go<Str, [2, 4]> {
				const two = yield* Ior.both<Str, 2>(new Str("a"), 2);
				const four = yield* Ior.left<Str, 4>(new Str("b"));
				return [two, four];
			}
			const ior = Ior.go(f());
			expect(ior).to.deep.equal(Ior.left(new Str("ab")));
		});

		it("completes and retains the left-hand value if a Right is yielded after a Both", () => {
			function* f(): Ior.Go<Str, [2, 4]> {
				const two = yield* Ior.both<Str, 2>(new Str("a"), 2);
				const four = yield* Ior.right<4, Str>(4);
				return [two, four];
			}
			const ior = Ior.go(f());
			expect(ior).to.deep.equal(Ior.both(new Str("a"), [2, 4]));
		});

		it("completes and combines the left-hand values if a Both is yielded after a Both", () => {
			function* f(): Ior.Go<Str, [2, 4]> {
				const two = yield* Ior.both<Str, 2>(new Str("a"), 2);
				const four = yield* Ior.both<Str, 4>(new Str("b"), 4);
				return [two, four];
			}
			const ior = Ior.go(f());
			expect(ior).to.deep.equal(Ior.both(new Str("ab"), [2, 4]));
		});

		it("executes the finally block if a Left is yielded in the try block", () => {
			const logs: string[] = [];
			function* f(): Ior.Go<Str, 2> {
				try {
					return yield* Ior.left<Str, 2>(new Str("a"));
				} finally {
					logs.push("finally");
				}
			}
			const ior = Ior.go(f());
			expect(ior).to.deep.equal(Ior.left(new Str("a")));
			expect(logs).to.deep.equal(["finally"]);
		});

		it("combines the left-hand values of two Left variants across the try...finally block", () => {
			function* f(): Ior.Go<Str, 2> {
				try {
					return yield* Ior.left<Str, 2>(new Str("a"));
				} finally {
					yield* Ior.left<Str, 4>(new Str("b"));
				}
			}
			const ior = Ior.go(f());
			expect(ior).to.deep.equal(Ior.left(new Str("ab")));
		});

		it("combines the left-hand values of a Left variant and a Both variant across the try...finally block", () => {
			function* f(): Ior.Go<Str, 2> {
				try {
					return yield* Ior.left<Str, 2>(new Str("a"));
				} finally {
					yield* Ior.both<Str, 4>(new Str("b"), 4);
				}
			}
			const ior = Ior.go(f());
			expect(ior).to.deep.equal(Ior.left(new Str("ab")));
		});
	});

	describe("wrapGoFn", () => {
		it("adapts the generator function to return an Ior", () => {
			function* f(two: 2): Ior.Go<Str, [2, 4]> {
				const four = yield* Ior.both<Str, 4>(new Str("a"), 4);
				return [two, four];
			}
			const wrapped = Ior.wrapGoFn(f);
			const ior = wrapped(2);
			expect(ior).to.deep.equal(Ior.both(new Str("a"), [2, 4]));
		});
	});

	describe("reduce", () => {
		it("reduces the finite iterable from left to right in the context of Ior", () => {
			const ior = Ior.reduce(
				["x", "y"],
				(chars, char, idx) =>
					Ior.both(new Str("a"), chars + char + idx),
				"",
			);
			expect(ior).to.deep.equal(Ior.both(new Str("aa"), "x0y1"));
		});
	});

	describe("traverseInto", () => {
		it("applies the function to the elements and collects the right-hand values into the Builder if no results are Left", () => {
			const builder = new TestBuilder<[number, string]>();
			const ior = Ior.traverseInto(
				["a", "b"],
				(char, idx) => Ior.both(new Str(char), [idx, char]),
				builder,
			);
			expect(ior).to.deep.equal(
				Ior.both(new Str("ab"), [
					[0, "a"],
					[1, "b"],
				]),
			);
		});
	});

	describe("traverse", () => {
		it("applies the function to the elements and collects the right-hand values in an array if no results are Left", () => {
			const ior = Ior.traverse(["a", "b"], (char, idx) =>
				Ior.both<Str, [number, string]>(new Str(char), [idx, char]),
			);
			expect(ior).to.deep.equal(
				Ior.both(new Str("ab"), [
					[0, "a"],
					[1, "b"],
				]),
			);
		});
	});

	describe("allInto", () => {
		it("collects the right-hand values into the Builder if no elements are Left", () => {
			const builder = new TestBuilder<number>();
			const ior = Ior.allInto(
				[Ior.both(new Str("a"), 2), Ior.both(new Str("b"), 4)],
				builder,
			);
			expect(ior).to.deep.equal(Ior.both(new Str("ab"), [2, 4]));
		});
	});

	describe("all", () => {
		it("collects the right-hand values in an array if no elements are Left", () => {
			const ior = Ior.all([
				Ior.both<Str, 2>(new Str("a"), 2),
				Ior.both<Str, 4>(new Str("b"), 4),
			]);
			expect(ior).to.deep.equal(Ior.both(new Str("ab"), [2, 4]));
		});
	});

	describe("allProps", () => {
		it("collects the right-hand values in an object if no elements are Left", () => {
			const ior = Ior.allProps({
				two: Ior.both<Str, 2>(new Str("a"), 2),
				four: Ior.both<Str, 4>(new Str("b"), 4),
			});
			expect(ior).to.deep.equal(
				Ior.both(new Str("ab"), { two: 2, four: 4 }),
			);
		});
	});

	describe("forEach", () => {
		it("applies the function to the elements while the result is not Left", () => {
			const results: [number, string][] = [];
			const ior = Ior.forEach(["a", "b"], (char, idx) => {
				results.push([idx, char]);
				return Ior.both(new Str(char), undefined);
			});
			expect(ior).to.deep.equal(Ior.both(new Str("ab"), undefined));
			expect(results).to.deep.equal([
				[0, "a"],
				[1, "b"],
			]);
		});
	});

	describe("lift", () => {
		it("applies the function to the right-hand values if no arguments are Left", () => {
			function f<A, B>(lhs: A, rhs: B): [A, B] {
				return [lhs, rhs];
			}
			const ior = Ior.lift(f<2, 4>)(
				Ior.both(new Str("a"), 2),
				Ior.both(new Str("b"), 4),
			);
			expect(ior).to.deep.equal(Ior.both(new Str("ab"), [2, 4]));
		});
	});

	describe("#[Eq.eq]", () => {
		it("compares the values if both variants are Left", () => {
			const property = fc.property(arbNum(), arbNum(), (lhs0, rhs0) => {
				expect(eq(Ior.left(lhs0), Ior.left(rhs0))).to.equal(
					eq(lhs0, rhs0),
				);
			});
			fc.assert(property);
		});

		it("compares any Left and any Right as inequal", () => {
			const property = fc.property(arbNum(), arbNum(), (lhs0, rhs1) => {
				expect(eq(Ior.left(lhs0), Ior.right(rhs1))).to.be.false;
			});
			fc.assert(property);
		});

		it("compares any Left and any Both as inequal", () => {
			const property = fc.property(
				arbNum(),
				arbNum(),
				arbNum(),
				(lhs0, rhs0, rhs1) => {
					expect(eq(Ior.left(lhs0), Ior.both(rhs0, rhs1))).to.be
						.false;
				},
			);
			fc.assert(property);
		});

		it("compares any Right and any Left as inequal", () => {
			const property = fc.property(arbNum(), arbNum(), (lhs1, rhs0) => {
				expect(eq(Ior.right(lhs1), Ior.left(rhs0))).to.be.false;
			});
			fc.assert(property);
		});

		it("compares the values if both variants are Right", () => {
			const property = fc.property(arbNum(), arbNum(), (lhs1, rhs1) => {
				expect(eq(Ior.right(lhs1), Ior.right(rhs1))).to.equal(
					eq(lhs1, rhs1),
				);
			});
			fc.assert(property);
		});

		it("compares any Right and any Both as inequal", () => {
			const property = fc.property(
				arbNum(),
				arbNum(),
				arbNum(),
				(lhs1, rhs0, rhs1) => {
					expect(eq(Ior.right(lhs1), Ior.both(rhs0, rhs1))).to.be
						.false;
				},
			);
			fc.assert(property);
		});

		it("compares any Both and any Left as inequal", () => {
			const property = fc.property(
				arbNum(),
				arbNum(),
				arbNum(),
				(lhs0, lhs1, rhs0) => {
					expect(eq(Ior.both(lhs0, lhs1), Ior.left(rhs0))).to.be
						.false;
				},
			);
			fc.assert(property);
		});

		it("compares any Both and any Right as inequal", () => {
			const property = fc.property(
				arbNum(),
				arbNum(),
				arbNum(),
				(lhs0, lhs1, rhs1) => {
					expect(eq(Ior.both(lhs0, lhs1), Ior.right(rhs1))).to.be
						.false;
				},
			);
			fc.assert(property);
		});

		it("compares the left-hand values and the right-hand values lexicographically if both variants are Both", () => {
			const property = fc.property(
				arbNum(),
				arbNum(),
				arbNum(),
				arbNum(),
				(lhs0, lhs1, rhs0, rhs1) => {
					expect(
						eq(Ior.both(lhs0, lhs1), Ior.both(rhs0, rhs1)),
					).to.equal(eq(lhs0, rhs0) && eq(lhs1, rhs1));
				},
			);
			fc.assert(property);
		});

		it("implements a lawful equivalence relation", () => {
			expectLawfulEq(arbIor(arbNum(), arbNum()));
		});
	});

	describe("#[Ord.cmp]", () => {
		it("compares the values if both variants are Left", () => {
			const property = fc.property(arbNum(), arbNum(), (lhs0, rhs0) => {
				expect(cmp(Ior.left(lhs0), Ior.left(rhs0))).to.equal(
					cmp(lhs0, rhs0),
				);
			});
			fc.assert(property);
		});

		it("compares any Left as less than any Right", () => {
			const property = fc.property(arbNum(), arbNum(), (lhs0, rhs1) => {
				expect(cmp(Ior.left(lhs0), Ior.right(rhs1))).to.equal(
					Ordering.less,
				);
			});
			fc.assert(property);
		});

		it("compares any Left as less than any Both", () => {
			const property = fc.property(
				arbNum(),
				arbNum(),
				arbNum(),
				(lhs0, rhs0, rhs1) => {
					expect(cmp(Ior.left(lhs0), Ior.both(rhs0, rhs1))).to.equal(
						Ordering.less,
					);
				},
			);
			fc.assert(property);
		});

		it("compares any Right as greater than any Left", () => {
			const property = fc.property(arbNum(), arbNum(), (lhs1, rhs0) => {
				expect(cmp(Ior.right(lhs1), Ior.left(rhs0))).to.equal(
					Ordering.greater,
				);
			});
			fc.assert(property);
		});

		it("compares the values if both variants are Right", () => {
			const property = fc.property(arbNum(), arbNum(), (lhs1, rhs1) => {
				expect(cmp(Ior.right(lhs1), Ior.right(rhs1))).to.equal(
					cmp(lhs1, rhs1),
				);
			});
			fc.assert(property);
		});

		it("compares any Right as less than any Both", () => {
			const property = fc.property(
				arbNum(),
				arbNum(),
				arbNum(),
				(lhs1, rhs0, rhs1) => {
					expect(cmp(Ior.right(lhs1), Ior.both(rhs0, rhs1))).to.equal(
						Ordering.less,
					);
				},
			);
			fc.assert(property);
		});

		it("compares any Both as greater than any Left", () => {
			const property = fc.property(
				arbNum(),
				arbNum(),
				arbNum(),
				(lhs0, lhs1, rhs0) => {
					expect(cmp(Ior.both(lhs0, lhs1), Ior.left(rhs0))).to.equal(
						Ordering.greater,
					);
				},
			);
			fc.assert(property);
		});

		it("compares any Both as greater than any Right", () => {
			const property = fc.property(
				arbNum(),
				arbNum(),
				arbNum(),
				(lhs0, lhs1, rhs1) => {
					expect(cmp(Ior.both(lhs0, lhs1), Ior.right(rhs1))).to.equal(
						Ordering.greater,
					);
				},
			);
			fc.assert(property);
		});

		it("compares the left-hand values and the right-hand values lexicographically if both variants are Both", () => {
			const property = fc.property(
				arbNum(),
				arbNum(),
				arbNum(),
				arbNum(),
				(lhs0, lhs1, rhs0, rhs1) => {
					expect(
						cmp(Ior.both(lhs0, lhs1), Ior.both(rhs0, rhs1)),
					).to.equal(cmb(cmp(lhs0, rhs0), cmp(lhs1, rhs1)));
				},
			);
			fc.assert(property);
		});

		it("implements a lawful total order", () => {
			expectLawfulOrd(arbIor(arbNum(), arbNum()));
		});
	});

	describe("#[Semigroup.cmb]", () => {
		it("combines the values if both variants are Left", () => {
			const property = fc.property(arbStr(), arbStr(), (lhs0, rhs0) => {
				expect(cmb(Ior.left(lhs0), Ior.left(rhs0))).to.deep.equal(
					Ior.left(cmb(lhs0, rhs0)),
				);
			});
			fc.assert(property);
		});

		it("merges the values into a Both if the variants are Left and Right", () => {
			const property = fc.property(arbStr(), arbStr(), (lhs0, rhs1) => {
				expect(cmb(Ior.left(lhs0), Ior.right(rhs1))).to.deep.equal(
					Ior.both(lhs0, rhs1),
				);
			});
			fc.assert(property);
		});

		it("combines the left-hand values and retains the right-hand value if the variants are Left and Both", () => {
			const property = fc.property(
				arbStr(),
				arbStr(),
				arbStr(),
				(lhs0, rhs0, rhs1) => {
					expect(
						cmb(Ior.left(lhs0), Ior.both(rhs0, rhs1)),
					).to.deep.equal(Ior.both(cmb(lhs0, rhs0), rhs1));
				},
			);
			fc.assert(property);
		});

		it("merges the values into a Both if the variants are Right and Left", () => {
			const property = fc.property(arbStr(), arbStr(), (lhs1, rhs0) => {
				expect(cmb(Ior.right(lhs1), Ior.left(rhs0))).to.deep.equal(
					Ior.both(rhs0, lhs1),
				);
			});
			fc.assert(property);
		});

		it("combines the values if both variants are Right", () => {
			const property = fc.property(arbStr(), arbStr(), (lhs1, rhs1) => {
				expect(cmb(Ior.right(lhs1), Ior.right(rhs1))).to.deep.equal(
					Ior.right(cmb(lhs1, rhs1)),
				);
			});
			fc.assert(property);
		});

		it("retains the left-hand value and combines the right-hand values if the variants are Right and Both", () => {
			const property = fc.property(
				arbStr(),
				arbStr(),
				arbStr(),
				(lhs1, rhs0, rhs1) => {
					expect(
						cmb(Ior.right(lhs1), Ior.both(rhs0, rhs1)),
					).to.deep.equal(Ior.both(rhs0, cmb(lhs1, rhs1)));
				},
			);
			fc.assert(property);
		});

		it("combines the left-hand values and retains the right-hand value if the variants are Both and Left", () => {
			const property = fc.property(
				arbStr(),
				arbStr(),
				arbStr(),
				(lhs0, lhs1, rhs0) => {
					expect(
						cmb(Ior.both(lhs0, lhs1), Ior.left(rhs0)),
					).to.deep.equal(Ior.both(cmb(lhs0, rhs0), lhs1));
				},
			);
			fc.assert(property);
		});

		it("retains the left-hand value and combines the right-hand values if the variants are Both and Right", () => {
			const property = fc.property(
				arbStr(),
				arbStr(),
				arbStr(),
				(lhs0, lhs1, rhs1) => {
					expect(
						cmb(Ior.both(lhs0, lhs1), Ior.right(rhs1)),
					).to.deep.equal(Ior.both(lhs0, cmb(lhs1, rhs1)));
				},
			);
			fc.assert(property);
		});

		it("combines the left-hand values and the right-hand values pairwise if both variants are Both", () => {
			const property = fc.property(
				arbStr(),
				arbStr(),
				arbStr(),
				arbStr(),
				(lhs0, lhs1, rhs0, rhs1) => {
					expect(
						cmb(Ior.both(lhs0, lhs1), Ior.both(rhs0, rhs1)),
					).to.deep.equal(Ior.both(cmb(lhs0, rhs0), cmb(lhs1, rhs1)));
				},
			);
			fc.assert(property);
		});

		it("implements a lawful semigroup", () => {
			expectLawfulSemigroup(arbIor(arbStr(), arbStr()));
		});
	});

	describe("#match", () => {
		it("applies the first function to the value if the variant is Left", () => {
			const result = Ior.left<1, 2>(1).match(
				(one): [1, 3] => [one, 3],
				(two): [2, 4] => [two, 4],
				(one, two): [1, 2] => [one, two],
			);
			expect(result).to.deep.equal([1, 3]);
		});

		it("applies the second function to the value if the variant is Right", () => {
			const result = Ior.right<2, 1>(2).match(
				(one): [1, 3] => [one, 3],
				(two): [2, 4] => [two, 4],
				(one, two): [1, 2] => [one, two],
			);
			expect(result).to.deep.equal([2, 4]);
		});

		it("applies the third function to the left-hand value and the right-hand value if the variant is Both", () => {
			const result = Ior.both<1, 2>(1, 2).match(
				(one): [1, 3] => [one, 3],
				(two): [2, 4] => [two, 4],
				(one, two): [1, 2] => [one, two],
			);
			expect(result).to.deep.equal([1, 2]);
		});
	});

	describe("#isLeft", () => {
		it("returns true if the variant is Left", () => {
			expect(Ior.left<1, 2>(1).isLeft()).to.be.true;
		});

		it("returns false if the variant is Right", () => {
			expect(Ior.right<2, 1>(2).isLeft()).to.be.false;
		});

		it("returns false if the variant is Both", () => {
			expect(Ior.both<1, 2>(1, 2).isLeft()).to.be.false;
		});
	});

	describe("#isRight", () => {
		it("returns false if the variant is Left", () => {
			expect(Ior.left<1, 2>(1).isRight()).to.be.false;
		});

		it("returns true if the variant is Right", () => {
			expect(Ior.right<2, 1>(2).isRight()).to.be.true;
		});

		it("returns false if the variant is Both", () => {
			expect(Ior.both<1, 2>(1, 2).isRight()).to.be.false;
		});
	});

	describe("#isBoth", () => {
		it("returns false if the variant is Left", () => {
			expect(Ior.left<1, 2>(1).isBoth()).to.be.false;
		});

		it("returns false if the variant is Right", () => {
			expect(Ior.right<2, 1>(2).isBoth()).to.be.false;
		});

		it("returns true if the variant is Both", () => {
			expect(Ior.both<1, 2>(1, 2).isBoth()).to.be.true;
		});
	});

	describe("#andThen", () => {
		it("does not apply the continuation if the variant is Left", () => {
			const ior = Ior.left<Str, 2>(new Str("a")).andThen(
				(two): Ior<Str, [2, 4]> => Ior.both(new Str("b"), [two, 4]),
			);
			expect(ior).to.deep.equal(Ior.left(new Str("a")));
		});

		it("applies the continuation to the value if the variant is Right", () => {
			const ior = Ior.right<2, Str>(2).andThen(
				(two): Ior<Str, [2, 4]> => Ior.right([two, 4]),
			);
			expect(ior).to.deep.equal(Ior.right([2, 4]));
		});

		it("retains the left-hand value if the continuation on a Right returns a Both", () => {
			const ior = Ior.right<2, Str>(2).andThen(
				(two): Ior<Str, [2, 4]> => Ior.both(new Str("b"), [two, 4]),
			);
			expect(ior).to.deep.equal(Ior.both(new Str("b"), [2, 4]));
		});

		it("combines the left-hand values if the continuation on a Both returns a Left", () => {
			const ior = Ior.both<Str, 2>(new Str("a"), 2).andThen(
				(): Ior<Str, [2, 4]> => Ior.left(new Str("b")),
			);
			expect(ior).to.deep.equal(Ior.left(new Str("ab")));
		});

		it("retains the left-hand value if the continuation on a Both returns a Right", () => {
			const ior = Ior.both<Str, 2>(new Str("a"), 2).andThen(
				(two): Ior<Str, [2, 4]> => Ior.right([two, 4]),
			);
			expect(ior).to.deep.equal(Ior.both(new Str("a"), [2, 4]));
		});

		it("combines the left-hand values if the continuation on a Both returns a Both", () => {
			const ior = Ior.both<Str, 2>(new Str("a"), 2).andThen(
				(two): Ior<Str, [2, 4]> => Ior.both(new Str("b"), [two, 4]),
			);
			expect(ior).to.deep.equal(Ior.both(new Str("ab"), [2, 4]));
		});
	});

	describe("#andThenGo", () => {
		it("combines the left-hand values if the continuation on a Both returns a Both", () => {
			const ior = Ior.both<Str, 2>(new Str("a"), 2).andThenGo(
				function* (two): Ior.Go<Str, [2, 4]> {
					const four = yield* Ior.both<Str, 4>(new Str("b"), 4);
					return [two, four];
				},
			);
			expect(ior).to.deep.equal(Ior.both(new Str("ab"), [2, 4]));
		});
	});

	describe("#flatten", () => {
		it("removes one level of nesting and combines the left-hand values if the variants are Both", () => {
			const ior = Ior.both<Str, Ior<Str, 2>>(
				new Str("a"),
				Ior.both(new Str("b"), 2),
			).flatten();
			expect(ior).to.deep.equal(Ior.both(new Str("ab"), 2));
		});
	});

	describe("#and", () => {
		it("keeps only the second right-hand value if both variants have right-hand values", () => {
			const ior = Ior.both<Str, 2>(new Str("a"), 2).and(
				Ior.both<Str, 4>(new Str("b"), 4),
			);
			expect(ior).to.deep.equal(Ior.both(new Str("ab"), 4));
		});
	});

	describe("#zipWith", () => {
		it("applies the function to the right-hand values if both variants have right-hand values", () => {
			const ior = Ior.both<Str, 2>(new Str("a"), 2).zipWith(
				Ior.both<Str, 4>(new Str("b"), 4),
				(two, four): [2, 4] => [two, four],
			);
			expect(ior).to.deep.equal(Ior.both(new Str("ab"), [2, 4]));
		});
	});

	describe("#mapLeft", () => {
		it("applies the function to the value if the variant is Left", () => {
			const ior = Ior.left<1, 2>(1).mapLeft((one): [1, 3] => [one, 3]);
			expect(ior).to.deep.equal(Ior.left([1, 3]));
		});

		it("does not apply the function if the variant is Right", () => {
			const ior = Ior.right<2, 1>(2).mapLeft((one): [1, 3] => [one, 3]);
			expect(ior).to.deep.equal(Ior.right(2));
		});

		it("applies the function to the left-hand value if the variant is Both", () => {
			const ior = Ior.both<1, 2>(1, 2).mapLeft((one): [1, 3] => [one, 3]);
			expect(ior).to.deep.equal(Ior.both([1, 3], 2));
		});
	});

	describe("#map", () => {
		it("does not apply the function if the variant is Left", () => {
			const ior = Ior.left<1, 2>(1).map((two): [2, 4] => [two, 4]);
			expect(ior).to.deep.equal(Ior.left(1));
		});

		it("applies the function to the value if the variant is Right", () => {
			const ior = Ior.right<2, 1>(2).map((two): [2, 4] => [two, 4]);
			expect(ior).to.deep.equal(Ior.right([2, 4]));
		});

		it("applies the function to the right-hand value if the variant is Both", () => {
			const ior = Ior.both<1, 2>(1, 2).map((two): [2, 4] => [two, 4]);
			expect(ior).to.deep.equal(Ior.both(1, [2, 4]));
		});
	});
});

describe("AsyncIor", () => {
	describe("go", async () => {
		it("short-circuits on the first yielded Left", async () => {
			async function* f(): AsyncIor.Go<Str, [2, 4]> {
				const two = yield* await Promise.resolve(Ior.right<2, Str>(2));
				const four = yield* await Promise.resolve(
					Ior.left<Str, 4>(new Str("b")),
				);
				return [two, four];
			}
			const ior = await AsyncIor.go(f());
			expect(ior).to.deep.equal(Ior.left(new Str("b")));
		});

		it("completes if all yielded values are Right", async () => {
			async function* f(): AsyncIor.Go<Str, [2, 4]> {
				const two = yield* await Promise.resolve(Ior.right<2, Str>(2));
				const four = yield* await Promise.resolve(Ior.right<4, Str>(4));
				return [two, four];
			}
			const ior = await AsyncIor.go(f());
			expect(ior).to.deep.equal(Ior.right([2, 4]));
		});

		it("completes and retains the left-hand value if a Both is yielded after a Right", async () => {
			async function* f(): AsyncIor.Go<Str, [2, 4]> {
				const two = yield* await Promise.resolve(Ior.right<2, Str>(2));
				const four = yield* await Promise.resolve(
					Ior.both<Str, 4>(new Str("b"), 4),
				);
				return [two, four];
			}
			const ior = await AsyncIor.go(f());
			expect(ior).to.deep.equal(Ior.both(new Str("b"), [2, 4]));
		});

		it("short-circuits and combines the left-hand values if a Left is yielded after a Both", async () => {
			async function* f(): AsyncIor.Go<Str, [2, 4]> {
				const two = yield* await Promise.resolve(
					Ior.both<Str, 2>(new Str("a"), 2),
				);
				const four = yield* await Promise.resolve(
					Ior.left<Str, 4>(new Str("b")),
				);
				return [two, four];
			}
			const ior = await AsyncIor.go(f());
			expect(ior).to.deep.equal(Ior.left(new Str("ab")));
		});

		it("completes and retains the left-hand value if a Right is yielded after a Both", async () => {
			async function* f(): AsyncIor.Go<Str, [2, 4]> {
				const two = yield* await Promise.resolve(
					Ior.both<Str, 2>(new Str("a"), 2),
				);
				const four = yield* await Promise.resolve(Ior.right<4, Str>(4));
				return [two, four];
			}
			const ior = await AsyncIor.go(f());
			expect(ior).to.deep.equal(Ior.both(new Str("a"), [2, 4]));
		});

		it("completes and combines the left-hand values if a Both is yielded after a Both", async () => {
			async function* f(): AsyncIor.Go<Str, [2, 4]> {
				const two = yield* await Promise.resolve(
					Ior.both<Str, 2>(new Str("a"), 2),
				);
				const four = yield* await Promise.resolve(
					Ior.both<Str, 4>(new Str("b"), 4),
				);
				return [two, four];
			}
			const ior = await AsyncIor.go(f());
			expect(ior).to.deep.equal(Ior.both(new Str("ab"), [2, 4]));
		});

		it("unwraps Promises in right-hand channels and in return", async () => {
			async function* f(): AsyncIor.Go<Str, [2, 4]> {
				const two = yield* await Promise.resolve(
					Ior.both(new Str("a"), Promise.resolve<2>(2)),
				);
				const four = yield* await Promise.resolve(
					Ior.both(new Str("b"), Promise.resolve<4>(4)),
				);
				return Promise.resolve([two, four]);
			}
			const ior = await AsyncIor.go(f());
			expect(ior).to.deep.equal(Ior.both(new Str("ab"), [2, 4]));
		});

		it("executes the finally block if a Left is yielded in the try block", async () => {
			const logs: string[] = [];
			async function* f(): AsyncIor.Go<Str, 2> {
				try {
					return yield* await Promise.resolve(
						Ior.left<Str, 2>(new Str("a")),
					);
				} finally {
					logs.push("finally");
				}
			}
			const ior = await AsyncIor.go(f());
			expect(ior).to.deep.equal(Ior.left(new Str("a")));
			expect(logs).to.deep.equal(["finally"]);
		});

		it("combines the left-hand values of two Left variants across the try...finally block", async () => {
			async function* f(): AsyncIor.Go<Str, 2> {
				try {
					return yield* await Promise.resolve(
						Ior.left<Str, 2>(new Str("a")),
					);
				} finally {
					yield* Ior.left<Str, 4>(new Str("b"));
				}
			}
			const ior = await AsyncIor.go(f());
			expect(ior).to.deep.equal(Ior.left(new Str("ab")));
		});

		it("combines the left-hand values of a Left variant and a Both variant across the try...finally block", async () => {
			async function* f(): AsyncIor.Go<Str, 2> {
				try {
					return yield* await Promise.resolve(
						Ior.left<Str, 2>(new Str("a")),
					);
				} finally {
					yield* await Promise.resolve(
						Ior.both<Str, 4>(new Str("b"), 4),
					);
				}
			}
			const ior = await AsyncIor.go(f());
			expect(ior).to.deep.equal(Ior.left(new Str("ab")));
		});
	});

	describe("wrapGoFn", () => {
		it("adapts the async generator function to return an AsyncIor", async () => {
			async function* f(two: 2): AsyncIor.Go<Str, [2, 4]> {
				const four = yield* await Promise.resolve(
					Ior.both<Str, 4>(new Str("a"), 4),
				);
				return [two, four];
			}
			const wrapped = AsyncIor.wrapGoFn(f);
			const ior = await wrapped(2);
			expect(ior).to.deep.equal(Ior.both(new Str("a"), [2, 4]));
		});
	});

	describe("reduce", () => {
		it("reduces the finite async iterable from left to right in the context of Ior", async () => {
			async function* gen(): AsyncGenerator<string> {
				yield delay(50).then(() => "x");
				yield delay(10).then(() => "y");
			}
			const ior = await AsyncIor.reduce(
				gen(),
				(chars, char, idx) =>
					delay(1).then(() =>
						Ior.both(new Str("a"), chars + char + idx),
					),
				"",
			);
			expect(ior).to.deep.equal(Ior.both(new Str("aa"), "x0y1"));
		});
	});

	describe("traverseInto", () => {
		it("applies the function to the elements and collects the right-hand values into the Builder if no results are Left", async () => {
			async function* gen(): AsyncGenerator<string> {
				yield delay(50).then(() => "a");
				yield delay(10).then(() => "b");
			}
			const builder = new TestBuilder<[number, string]>();
			const ior = await AsyncIor.traverseInto(
				gen(),
				(char, idx) =>
					delay(1).then(() => Ior.both(new Str(char), [idx, char])),
				builder,
			);
			expect(ior).to.deep.equal(
				Ior.both(new Str("ab"), [
					[0, "a"],
					[1, "b"],
				]),
			);
		});
	});

	describe("traverse", () => {
		it("applies the function to the elements and collects the right-hand values in an array if no results are Left", async () => {
			async function* gen(): AsyncGenerator<string> {
				yield delay(50).then(() => "a");
				yield delay(10).then(() => "b");
			}
			const ior = await AsyncIor.traverse(gen(), (char, idx) =>
				delay(1).then(() =>
					Ior.both<Str, [number, string]>(new Str(char), [idx, char]),
				),
			);
			expect(ior).to.deep.equal(
				Ior.both(new Str("ab"), [
					[0, "a"],
					[1, "b"],
				]),
			);
		});
	});

	describe("allInto", () => {
		it("collects the right-hand values into the Builder if no elements are Left", async () => {
			async function* gen(): AsyncGenerator<Ior<Str, number>> {
				yield delay(50).then(() => Ior.both(new Str("a"), 2));
				yield delay(10).then(() => Ior.both(new Str("b"), 4));
			}
			const builder = new TestBuilder<number>();
			const ior = await AsyncIor.allInto(gen(), builder);
			expect(ior).to.deep.equal(Ior.both(new Str("ab"), [2, 4]));
		});
	});

	describe("all", () => {
		it("collects the right-hand values in an array if no elements are Left", async () => {
			async function* gen(): AsyncGenerator<Ior<Str, number>> {
				yield delay(50).then(() => Ior.both(new Str("a"), 2));
				yield delay(10).then(() => Ior.both(new Str("b"), 4));
			}
			const ior = await AsyncIor.all(gen());
			expect(ior).to.deep.equal(Ior.both(new Str("ab"), [2, 4]));
		});
	});

	describe("forEach", () => {
		it("applies the function to the elements while the result is not Left", async () => {
			async function* gen(): AsyncGenerator<string> {
				yield delay(50).then(() => "a");
				yield delay(10).then(() => "b");
			}
			const results: [number, string][] = [];
			const ior = await AsyncIor.forEach(gen(), (char, idx) =>
				delay(1).then(() => {
					results.push([idx, char]);
					return Ior.both(new Str(char), undefined);
				}),
			);
			expect(ior).to.deep.equal(Ior.both(new Str("ab"), undefined));
			expect(results).to.deep.equal([
				[0, "a"],
				[1, "b"],
			]);
		});
	});

	describe("traverseIntoPar", () => {
		it("applies the function to the elements and short circuits on the first Left result", async () => {
			const ior = await AsyncIor.traverseIntoPar(
				["a", "b"],
				(char, idx) =>
					delay(char === "a" ? 50 : 10).then(() =>
						char === "a"
							? Ior.both(new Str(char), [idx, char])
							: Ior.left(new Str(idx.toString() + char)),
					),
				new TestBuilder<[number, string]>(),
			);
			expect(ior).to.deep.equal(Ior.left(new Str("1b")));
		});

		it("applies the function to the elements and collects the right-hand values into the Builder if no results are Left", async () => {
			const builder = new TestBuilder<[number, string]>();
			const ior = await AsyncIor.traverseIntoPar(
				["a", "b"],
				(char, idx) =>
					delay(char === "a" ? 50 : 10).then(() =>
						Ior.right([idx, char]),
					),
				builder,
			);
			expect(ior).to.deep.equal(
				Ior.right([
					[1, "b"],
					[0, "a"],
				]),
			);
		});

		it("retains the left-hand value if a Both resolves after a Right", async () => {
			const builder = new TestBuilder<[number, string]>();
			const ior = await AsyncIor.traverseIntoPar(
				["a", "b"],
				(char, idx) =>
					delay(char === "a" ? 50 : 10).then(() =>
						char === "a"
							? Ior.both(new Str(char), [idx, char])
							: Ior.right([idx, char]),
					),
				builder,
			);
			expect(ior).to.deep.equal(
				Ior.both(new Str("a"), [
					[1, "b"],
					[0, "a"],
				]),
			);
		});

		it("combines the left-hand values if a Left resolves after a Both", async () => {
			const ior = await AsyncIor.traverseIntoPar(
				["a", "b"],
				(char, idx) =>
					delay(char === "a" ? 50 : 10).then(() =>
						char === "a"
							? Ior.left(new Str(idx.toString() + char))
							: Ior.both(new Str(char), [idx, char]),
					),
				new TestBuilder<[number, string]>(),
			);
			expect(ior).to.deep.equal(Ior.left(new Str("b0a")));
		});

		it("retains the left-hand value if a Right resolves after a Both", async () => {
			const builder = new TestBuilder<[number, string]>();
			const ior = await AsyncIor.traverseIntoPar(
				["a", "b"],
				(char, idx) =>
					delay(char === "a" ? 50 : 10).then(() =>
						char === "a"
							? Ior.right([idx, char])
							: Ior.both(new Str(char), [idx, char]),
					),
				builder,
			);
			expect(ior).to.deep.equal(
				Ior.both(new Str("b"), [
					[1, "b"],
					[0, "a"],
				]),
			);
		});

		it("combines the left-hand values if a Both resolves after a Both ", async () => {
			const builder = new TestBuilder<[number, string]>();
			const ior = await AsyncIor.traverseIntoPar(
				["a", "b"],
				(char, idx) =>
					delay(char === "a" ? 50 : 10).then(() =>
						Ior.both(new Str(char), [idx, char]),
					),
				builder,
			);
			expect(ior).to.deep.equal(
				Ior.both(new Str("ba"), [
					[1, "b"],
					[0, "a"],
				]),
			);
		});
	});

	describe("traversePar", () => {
		it("applies the function to the elements and collects the right-hand values in an array if no results are Left", async () => {
			const ior = await AsyncIor.traversePar(["a", "b"], (char, idx) =>
				delay(char === "a" ? 50 : 10).then(() =>
					Ior.both<Str, [number, string]>(new Str(char), [idx, char]),
				),
			);
			expect(ior).to.deep.equal(
				Ior.both(new Str("ba"), [
					[0, "a"],
					[1, "b"],
				]),
			);
		});
	});

	describe("allIntoPar", () => {
		it("collects the right-hand values into the Builder if no elements are Left", async () => {
			const builder = new TestBuilder<number>();
			const ior = await AsyncIor.allIntoPar(
				[
					delay(50).then(() => Ior.both(new Str("a"), 2)),
					delay(10).then(() => Ior.both(new Str("b"), 4)),
				],
				builder,
			);
			expect(ior).to.deep.equal(Ior.both(new Str("ba"), [4, 2]));
		});
	});

	describe("allPar", () => {
		it("collects the right-hand values in an array if no elements are Left", async () => {
			const ior = await AsyncIor.allPar([
				delay(50).then<Ior<Str, 2>>(() => Ior.both(new Str("a"), 2)),
				delay(10).then<Ior<Str, 4>>(() => Ior.both(new Str("b"), 4)),
			]);
			expect(ior).to.deep.equal(Ior.both(new Str("ba"), [2, 4]));
		});
	});

	describe("allPropsPar", () => {
		it("collects the right-hand values in an object if no elements are Left", async () => {
			const ior = await AsyncIor.allPropsPar({
				two: delay(50).then<Ior<Str, 2>>(() =>
					Ior.both(new Str("a"), 2),
				),
				four: delay(10).then<Ior<Str, 4>>(() =>
					Ior.both(new Str("b"), 4),
				),
			});
			expect(ior).to.deep.equal(
				Ior.both(new Str("ba"), { two: 2, four: 4 }),
			);
		});
	});

	describe("forEachPar", () => {
		it("applies the function to the elements while the result is not Left", async () => {
			const results: [number, string][] = [];
			const ior = await AsyncIor.forEachPar(["a", "b"], (char, idx) =>
				delay(char === "a" ? 50 : 10).then(() => {
					results.push([idx, char]);
					return Ior.both(new Str(char), undefined);
				}),
			);
			expect(ior).to.deep.equal(Ior.both(new Str("ba"), undefined));
			expect(results).to.deep.equal([
				[1, "b"],
				[0, "a"],
			]);
		});
	});

	describe("liftPar", () => {
		it("applies the function to the right-hand values if no arguments are Left", async () => {
			async function f<A, B>(lhs: A, rhs: B): Promise<[A, B]> {
				return [lhs, rhs];
			}
			const ior = await AsyncIor.liftPar(f<2, 4>)(
				delay(50).then(() => Ior.both(new Str("a"), 2)),
				delay(10).then(() => Ior.both(new Str("b"), 4)),
			);
			expect(ior).to.deep.equal(Ior.both(new Str("ba"), [2, 4]));
		});
	});
});
