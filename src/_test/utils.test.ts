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
import { cmb } from "../cmb.js";
import { Ordering, cmp, eq } from "../cmp.js";
import {
	Str,
	arbNum,
	arbStr,
	expectLawfulEq,
	expectLawfulOrd,
	expectLawfulSemigroup,
} from "./utils.js";

describe("Num", () => {
	describe("#[Eq.eq]", () => {
		it("compares the values strictly", () => {
			const property = fc.property(arbNum(), arbNum(), (lhs, rhs) => {
				expect(eq(lhs, rhs)).to.equal(lhs.val === rhs.val);
			});
			fc.assert(property);
		});

		it("implements a lawful equivalence relation", () => {
			expectLawfulEq(arbNum());
		});
	});

	describe("#[Ord.cmp]", () => {
		it("compares the values as ordered from least to greatest", () => {
			const property = fc.property(arbNum(), arbNum(), (lhs, rhs) => {
				expect(cmp(lhs, rhs)).to.equal(
					Ordering.fromNumber(lhs.val - rhs.val),
				);
			});
			fc.assert(property);
		});

		it("implements a lawful total order", () => {
			expectLawfulOrd(arbNum());
		});
	});
});

describe("Str", () => {
	describe("#[Eq.eq]", () => {
		it("compares the values strictly", () => {
			const property = fc.property(arbStr(), arbStr(), (lhs, rhs) => {
				expect(eq(lhs, rhs)).to.equal(lhs.val === rhs.val);
			});
			fc.assert(property);
		});

		it("implements a lawful equivalence relation", () => {
			expectLawfulEq(arbStr());
		});
	});

	describe("#[Semigroup.cmb]", () => {
		it("concatenates the values", () => {
			const property = fc.property(arbStr(), arbStr(), (lhs, rhs) => {
				expect(cmb(lhs, rhs)).to.deep.equal(new Str(lhs.val + rhs.val));
			});
			fc.assert(property);
		});

		it("implements a lawful semigroup", () => {
			expectLawfulSemigroup(arbStr());
		});
	});
});
