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
import { describe, expect, it } from "vitest";
import {
	arbNum,
	arbStr,
	expectLawfulEq,
	expectLawfulOrd,
	expectLawfulSemigroup,
} from "./_test/utils.js";
import { cmb } from "./cmb.js";
import { cmp, eq } from "./cmp.js";
import { Pair } from "./pair.js";

describe("Pair", () => {
	function arbPair<A, B>(
		arbFst: Fc.Arbitrary<A>,
		arbSnd: Fc.Arbitrary<B>,
	): Fc.Arbitrary<Pair<A, B>> {
		return arbFst.chain((fst) => arbSnd.map((snd) => new Pair(fst, snd)));
	}

	describe("constructor", () => {
		it("constructs a new Pair", () => {
			const pair = new Pair<1, 2>(1, 2);
			expect(pair).to.be.an.instanceOf(Pair);
			expect(pair.fst).to.equal(1);
			expect(pair.snd).to.equal(2);
			expect(pair.val).to.deep.equal([1, 2]);
		});
	});

	describe("fromTuple", () => {
		it("constructs a Pair from a 2-tuple of values", () => {
			const pair = Pair.fromTuple<1, 2>([1, 2]);
			expect(pair).to.deep.equal(new Pair(1, 2));
		});
	});

	describe("#[Eq.eq]", () => {
		it("compares the first values and the second values lexicographically", () => {
			const property = Fc.property(
				arbNum(),
				arbNum(),
				arbNum(),
				arbNum(),
				(lhs0, lhs1, rhs0, rhs1) => {
					expect(
						eq(new Pair(lhs0, lhs1), new Pair(rhs0, rhs1)),
					).to.equal(eq(lhs0, rhs0) && eq(lhs1, rhs1));
				},
			);
			Fc.assert(property);
		});

		it("implements a lawful equivalence relation", () => {
			expectLawfulEq(arbPair(arbNum(), arbNum()));
		});
	});

	describe("#[Ord.cmp]", () => {
		it("compares the first values and the second values lexicographically", () => {
			const property = Fc.property(
				arbNum(),
				arbNum(),
				arbNum(),
				arbNum(),
				(lhs0, lhs1, rhs0, rhs1) => {
					expect(
						cmp(new Pair(lhs0, lhs1), new Pair(rhs0, rhs1)),
					).to.equal(cmb(cmp(lhs0, rhs0), cmp(lhs1, rhs1)));
				},
			);
			Fc.assert(property);
		});

		it("implements a lawful total order", () => {
			expectLawfulOrd(arbPair(arbNum(), arbNum()));
		});
	});

	describe("#[Semigroup.cmb]", () => {
		it("combines the first values and the second values pairwise", () => {
			const property = Fc.property(
				arbStr(),
				arbStr(),
				arbStr(),
				arbStr(),
				(lhs0, lhs1, rhs0, rhs1) => {
					expect(
						cmb(new Pair(lhs0, lhs1), new Pair(rhs0, rhs1)),
					).to.deep.equal(new Pair(cmb(lhs0, rhs0), cmb(lhs1, rhs1)));
				},
			);
			Fc.assert(property);
		});

		it("implements a lawful semigroup", () => {
			expectLawfulSemigroup(arbPair(arbStr(), arbStr()));
		});
	});

	describe("#unwrap", () => {
		it("applies the function to the first value and the second value", () => {
			const result = new Pair<1, 2>(1, 2).unwrap((one, two): [1, 2] => [
				one,
				two,
			]);
			expect(result).to.deep.equal([1, 2]);
		});
	});

	describe("#mapFst", () => {
		it("applies the function to the first value", () => {
			const pair = new Pair<1, 2>(1, 2).mapFst((one): [1, 3] => [one, 3]);
			expect(pair).to.deep.equal(new Pair([1, 3], 2));
		});
	});

	describe("#mapSnd", () => {
		it("applies the function to the second value", () => {
			const pair = new Pair<1, 2>(1, 2).mapSnd((two): [2, 4] => [two, 4]);
			expect(pair).to.deep.equal(new Pair(1, [2, 4]));
		});
	});
});
