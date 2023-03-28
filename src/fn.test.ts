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
import { constant, id, negatePred, wrapCtor } from "./fn.js";

describe("id", () => {
	it("returns its argument", () => {
		const property = fc.property(fc.anything(), (val) => {
			expect(id(val)).to.deep.equal(val);
		});
		fc.assert(property);
	});
});

describe("constant", () => {
	it("returns a function that returns the original argument regardless of the provided arguments", () => {
		const property = fc.property(
			fc.anything(),
			fc.array(fc.anything()),
			(val, args) => {
				const f = constant(val);
				expect(f(...args)).to.deep.equal(val);
			},
		);
		fc.assert(property);
	});
});

describe("negatePred", () => {
	it("adapts the predicate into an identical predicate that negates its result", () => {
		function isOne(num: number): boolean {
			return num === 1;
		}
		const isNotOne = negatePred(isOne);

		expect(isOne(1)).to.be.true;
		expect(isOne(2)).to.be.false;
		expect(isNotOne(1)).to.be.false;
		expect(isNotOne(2)).to.be.true;
	});
});

describe("wrapCtor", () => {
	it("adapts the constructor into a callable function", () => {
		class Box<T> {
			constructor(readonly val: T) {}
		}
		const f = wrapCtor(Box);
		const box = f<1>(1);
		expect(box).to.deep.equal(new Box(1));
	});
});
