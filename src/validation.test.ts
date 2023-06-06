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
import { Validation } from "./validation.js";

describe("Validation", () => {
	function arbValidation<E, T>(
		arbErr: fc.Arbitrary<E>,
		arbOk: fc.Arbitrary<T>,
	): fc.Arbitrary<Validation<E, T>> {
		return fc.oneof(arbErr.map(Validation.err), arbOk.map(Validation.ok));
	}

	describe("err", () => {
		it("constructs an Err variant", () => {
			const vdn = Validation.err<1, 2>(1);
			expect(vdn).to.be.an.instanceOf(Validation.Err);
			expect(vdn.kind).to.equal(Validation.Kind.ERR);
			expect(vdn.val).to.equal(1);
		});
	});

	describe("ok", () => {
		it("constructs an Ok variant", () => {
			const vdn = Validation.ok<2, 1>(2);
			expect(vdn).to.be.an.instanceOf(Validation.Ok);
			expect(vdn.kind).to.equal(Validation.Kind.OK);
			expect(vdn.val).to.equal(2);
		});
	});

	describe("fromEither", () => {
		it("constructs an Err if the Either is a Left", () => {
			expect(Validation.fromEither(Either.left<1, 2>(1))).to.deep.equal(
				Validation.err(1),
			);
		});

		it("constructs an Ok if the Either is a Right", () => {
			expect(Validation.fromEither(Either.right<2, 1>(2))).to.deep.equal(
				Validation.ok(2),
			);
		});
	});

	describe("traverseInto", () => {
		it("applies the function to the elements and collects the successes into the Builder if all results are Ok", () => {
			const builder = new TestBuilder<[number, string]>();
			const vdn = Validation.traverseInto(
				["a", "b"],
				(char, idx) =>
					Validation.ok<[number, string], Str>([idx, char]),
				builder,
			);
			expect(vdn).to.deep.equal(
				Validation.ok([
					[0, "a"],
					[1, "b"],
				]),
			);
		});
	});

	describe("traverse", () => {
		it("applies the function to the elements and collects the successes in an array if all results are Ok", () => {
			const vdn = Validation.traverse(["a", "b"], (char, idx) =>
				Validation.ok<[number, string], Str>([idx, char]),
			);
			expect(vdn).to.deep.equal(
				Validation.ok([
					[0, "a"],
					[1, "b"],
				]),
			);
		});
	});

	describe("forEach", () => {
		it("applies the function to the elements while the result is Ok", () => {
			const results: [number, string][] = [];
			const vdn = Validation.forEach(["a", "b"], (char, idx) => {
				results.push([idx, char]);
				return Validation.ok<void, Str>(undefined);
			});
			expect(vdn).to.deep.equal(Validation.ok(undefined));
			expect(results).to.deep.equal([
				[0, "a"],
				[1, "b"],
			]);
		});
	});

	describe("collectInto", () => {
		it("collects the successes into the Builder if all results are Ok", () => {
			const builder = new TestBuilder<number>();
			const vdn = Validation.collectInto(
				[Validation.ok<2, Str>(2), Validation.ok<4, Str>(4)],
				builder,
			);
			expect(vdn).to.deep.equal(Validation.ok([2, 4]));
		});
	});

	describe("all", () => {
		it("collects the successes in an array if all elements are Ok", () => {
			const vdn = Validation.all([
				Validation.ok<2, Str>(2),
				Validation.ok<4, Str>(4),
			]);
			expect(vdn).to.deep.equal(Validation.ok([2, 4]));
		});
	});

	describe("allProps", () => {
		it("collects the successes in an object if all results are Ok", () => {
			const vdn = Validation.allProps({
				two: Validation.ok<2, Str>(2),
				four: Validation.ok<4, Str>(4),
			});
			expect(vdn).to.deep.equal(Validation.ok({ two: 2, four: 4 }));
		});
	});

	describe("lift", () => {
		it("applies the function to the succeses if all arguments are Ok", () => {
			function f<A, B>(lhs: A, rhs: B): [A, B] {
				return [lhs, rhs];
			}
			const vdn = Validation.lift(f<2, 4>)(
				Validation.ok(2),
				Validation.ok(4),
			);
			expect(vdn).to.deep.equal(Validation.ok([2, 4]));
		});
	});

	describe("traverseIntoPar", () => {
		it("applies the function to the elements and collects failures in the order Promises resolve", async () => {
			const vdn = await Validation.traverseIntoPar(
				["a", "b"],
				(char, idx) =>
					delay(char === "a" ? 50 : 10).then(() =>
						Validation.err(new Str(idx.toString() + char)),
					),
				new TestBuilder<[number, string]>(),
			);
			expect(vdn).to.deep.equal(Validation.err(new Str("1b0a")));
		});

		it("applies the function to the elements and collects the successes into the Builder if all results are Ok", async () => {
			const builder = new TestBuilder<[number, string]>();
			const vdn = await Validation.traverseIntoPar(
				["a", "b"],
				(char, idx) =>
					delay(char === "a" ? 50 : 10).then(() =>
						Validation.ok<[number, string], Str>([idx, char]),
					),
				builder,
			);
			expect(vdn).to.deep.equal(
				Validation.ok([
					[1, "b"],
					[0, "a"],
				]),
			);
		});
	});

	describe("traversePar", () => {
		it("applies the function to the elements and collects the results in an array if all results are Ok", async () => {
			const vdn = await Validation.traversePar(["a", "b"], (char, idx) =>
				delay(char === "a" ? 50 : 10).then(() =>
					Validation.ok<[number, string], Str>([idx, char]),
				),
			);
			expect(vdn).to.deep.equal(
				Validation.ok([
					[0, "a"],
					[1, "b"],
				]),
			);
		});
	});

	describe("forEachPar", () => {
		it("applies the function to the successes if all arguments are Ok", async () => {
			const results: [number, string][] = [];
			const vdn = await Validation.forEachPar(["a", "b"], (char, idx) =>
				delay(char === "a" ? 50 : 10).then(() => {
					results.push([idx, char]);
					return Validation.ok<void, Str>(undefined);
				}),
			);
			expect(vdn).to.deep.equal(Validation.ok(undefined));
			expect(results).to.deep.equal([
				[1, "b"],
				[0, "a"],
			]);
		});
	});

	describe("collectIntoPar", () => {
		it("collects the successes into the Builder if all elements are Ok", async () => {
			const builder = new TestBuilder<number>();
			const vdn = await Validation.collectIntoPar(
				[
					delay(50).then(() => Validation.ok<2, Str>(2)),
					delay(10).then(() => Validation.ok<4, Str>(4)),
				],
				builder,
			);
			expect(vdn).to.deep.equal(Validation.ok([4, 2]));
		});
	});

	describe("allPar", () => {
		it("collects the successes in an array if all elements are Ok", async () => {
			const vdn = await Validation.allPar([
				delay(50).then<Validation<Str, 2>>(() => Validation.ok(2)),
				delay(10).then<Validation<Str, 4>>(() => Validation.ok(4)),
			]);
			expect(vdn).to.deep.equal(Validation.ok([2, 4]));
		});
	});

	describe("allPropsPar", () => {
		it("collects the successes in an object if all elements are Ok", async () => {
			const vdn = await Validation.allPropsPar({
				two: delay(50).then<Validation<Str, 2>>(() => Validation.ok(2)),
				four: delay(10).then<Validation<Str, 4>>(() =>
					Validation.ok(4),
				),
			});
			expect(vdn).to.deep.equal(Validation.ok({ two: 2, four: 4 }));
		});
	});

	describe("liftPar", () => {
		it("does not apply the function if any argument is Err", async () => {
			async function f<A, B>(lhs: A, rhs: B): Promise<[A, B]> {
				return [lhs, rhs];
			}
			const vdn = await Validation.liftPar(f<2, 4>)(
				delay(50).then<Validation<Str, 2>>(() =>
					Validation.err(new Str("a")),
				),
				delay(10).then<Validation<Str, 4>>(() => Validation.ok(4)),
			);
			expect(vdn).to.deep.equal(Validation.err(new Str("a")));
		});

		it("applies the function to the successes if all arguments are Ok", async () => {
			async function f<A, B>(lhs: A, rhs: B): Promise<[A, B]> {
				return [lhs, rhs];
			}
			const vdn = await Validation.liftPar(f<2, 4>)(
				delay(50).then<Validation<Str, 2>>(() => Validation.ok(2)),
				delay(10).then<Validation<Str, 4>>(() => Validation.ok(4)),
			);
			expect(vdn).to.deep.equal(Validation.ok([2, 4]));
		});
	});

	describe("#[Eq.eq]", () => {
		it("compares the failures if both variants are Err", () => {
			const property = fc.property(arbNum(), arbNum(), (lhs, rhs) => {
				expect(eq(Validation.err(lhs), Validation.err(rhs))).to.equal(
					eq(lhs, rhs),
				);
			});
			fc.assert(property);
		});

		it("compares any Err and any Ok as inequal", () => {
			const property = fc.property(arbNum(), arbNum(), (lhs, rhs) => {
				expect(eq(Validation.err(lhs), Validation.ok(rhs))).to.be.false;
			});
			fc.assert(property);
		});

		it("compares any Ok and any Err as inequal", () => {
			const property = fc.property(arbNum(), arbNum(), (lhs, rhs) => {
				expect(eq(Validation.ok(lhs), Validation.err(rhs))).to.be.false;
			});
			fc.assert(property);
		});

		it("compares the successes if both variants are Ok", () => {
			const property = fc.property(arbNum(), arbNum(), (lhs, rhs) => {
				expect(eq(Validation.ok(lhs), Validation.ok(rhs))).to.equal(
					eq(lhs, rhs),
				);
			});
			fc.assert(property);
		});

		it("implements a lawful equivalence relation", () => {
			expectLawfulEq(arbValidation(arbNum(), arbNum()));
		});
	});

	describe("#[Ord.cmp]", () => {
		it("compares the failures if both variants are Err", () => {
			const property = fc.property(arbNum(), arbNum(), (lhs, rhs) => {
				expect(cmp(Validation.err(lhs), Validation.err(rhs))).to.equal(
					cmp(lhs, rhs),
				);
			});
			fc.assert(property);
		});

		it("compares any Err as less than any Ok", () => {
			const property = fc.property(arbNum(), arbNum(), (lhs, rhs) => {
				expect(cmp(Validation.err(lhs), Validation.ok(rhs))).to.equal(
					Ordering.less,
				);
			});
			fc.assert(property);
		});

		it("compares any Ok as greater than any Err", () => {
			const property = fc.property(arbNum(), arbNum(), (lhs, rhs) => {
				expect(cmp(Validation.ok(lhs), Validation.err(rhs))).to.equal(
					Ordering.greater,
				);
			});
			fc.assert(property);
		});

		it("compares the successes if both variants are Ok", () => {
			const property = fc.property(arbNum(), arbNum(), (lhs, rhs) => {
				expect(cmp(Validation.ok(lhs), Validation.ok(rhs))).to.equal(
					cmp(lhs, rhs),
				);
			});
			fc.assert(property);
		});

		it("implements a lawful total order", () => {
			expectLawfulOrd(arbValidation(arbNum(), arbNum()));
		});
	});

	describe("#[Semigroup.cmb]", () => {
		it("combines the successes if both variants are Ok", () => {
			const property = fc.property(arbStr(), arbStr(), (lhs, rhs) => {
				expect(
					cmb(Validation.ok(lhs), Validation.ok(rhs)),
				).to.deep.equal(Validation.ok(cmb(lhs, rhs)));
			});
			fc.assert(property);
		});

		it("implements a lawful semigroup", () => {
			expectLawfulSemigroup(arbValidation(arbStr(), arbStr()));
		});
	});

	describe("#isErr", () => {
		it("returns true if the variant is Err", () => {
			expect(Validation.err<1, 2>(1).isErr()).to.be.true;
		});

		it("returns false if the variant is Ok", () => {
			expect(Validation.ok<2, 1>(2).isErr()).to.be.false;
		});
	});

	describe("#isOk", () => {
		it("returns false if the variant is Err", () => {
			expect(Validation.err<1, 2>(1).isOk()).to.be.false;
		});

		it("returns true if the variant is Ok", () => {
			expect(Validation.ok<2, 1>(2).isOk()).to.be.true;
		});
	});

	describe("#unwrap", () => {
		it("applies the first function to the failure if the variant is Err", () => {
			const result = Validation.err<1, 2>(1).unwrap(
				(one): [1, 3] => [one, 3],
				(two): [2, 4] => [two, 4],
			);
			expect(result).to.deep.equal([1, 3]);
		});

		it("applies the second function to the success if the variant is Ok", () => {
			const result = Validation.ok<2, 1>(2).unwrap(
				(one): [1, 3] => [one, 3],
				(two): [2, 4] => [two, 4],
			);
			expect(result).to.deep.equal([2, 4]);
		});
	});

	describe("#and", () => {
		it("returns the other Validation if the variant is Ok", () => {
			const vdn = Validation.ok<2, Str>(2).and(Validation.ok<4, Str>(4));
			expect(vdn).to.deep.equal(Validation.ok(4));
		});
	});

	describe("#zipWith", () => {
		it("combines the failures if both variants are Err", () => {
			const vdn = Validation.err<Str, 2>(new Str("a")).zipWith(
				Validation.err<Str, 4>(new Str("b")),
				(two, four): [2, 4] => [two, four],
			);
			expect(vdn).to.deep.equal(Validation.err(new Str("ab")));
		});

		it("returns the first Err if the second variant is Ok", () => {
			const vdn = Validation.err<Str, 2>(new Str("a")).zipWith(
				Validation.ok<4, Str>(4),
				(two, four): [2, 4] => [two, four],
			);
			expect(vdn).to.deep.equal(Validation.err(new Str("a")));
		});

		it("returns the second Err if the first variant is Ok", () => {
			const vdn = Validation.ok<2, Str>(2).zipWith(
				Validation.err<Str, 4>(new Str("b")),
				(two, four): [2, 4] => [two, four],
			);
			expect(vdn).to.deep.equal(Validation.err(new Str("b")));
		});

		it("applies the function to the successes if both variants are Ok", () => {
			const vdn = Validation.ok<2, Str>(2).zipWith(
				Validation.ok<4, Str>(4),
				(two, four): [2, 4] => [two, four],
			);
			expect(vdn).to.deep.equal(Validation.ok([2, 4]));
		});
	});

	describe("#lmap", () => {
		it("applies the function to the failure if the variant is Err", () => {
			const vdn = Validation.err<1, 2>(1).lmap((one): [1, 3] => [one, 3]);
			expect(vdn).to.deep.equal(Validation.err([1, 3]));
		});

		it("does not apply the function if the variant is Ok", () => {
			const vdn = Validation.ok<2, 1>(2).lmap((one): [1, 3] => [one, 3]);
			expect(vdn).to.deep.equal(Validation.ok(2));
		});
	});

	describe("#map", () => {
		it("does not apply the function if the variant is Err", () => {
			const vdn = Validation.err<1, 2>(1).map((two): [2, 4] => [two, 4]);
			expect(vdn).to.deep.equal(Validation.err(1));
		});

		it("applies the function to the success if the variant is Ok", () => {
			const vdn = Validation.ok<2, 1>(2).map((two): [2, 4] => [two, 4]);
			expect(vdn).to.deep.equal(Validation.ok([2, 4]));
		});
	});
});
