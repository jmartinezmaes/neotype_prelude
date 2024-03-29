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
import { constant, id, negatePredicateFn, wrapCtor } from "./fn.js";

describe("id", () => {
	it("returns its argument", () => {
		const property = Fc.property(Fc.anything(), (val) => {
			expect(id(val)).to.deep.equal(val);
		});
		Fc.assert(property);
	});
});

describe("constant", () => {
	it("returns a function that returns the original argument regardless of the provided arguments", () => {
		const property = Fc.property(
			Fc.anything(),
			Fc.array(Fc.anything()),
			(val, args) => {
				const f = constant(val);
				expectTypeOf(f).toEqualTypeOf<(...args: any[]) => unknown>();
				expect(f(...args)).to.deep.equal(val);
			},
		);
		Fc.assert(property);
	});
});

describe("negatePredicateFn", () => {
	it("adapts the predicate into an identical predicate that negates its result", () => {
		function isOne(num: number): boolean {
			return num === 1;
		}
		const isNotOne = negatePredicateFn(isOne);

		expect(isOne(1)).to.be.true;
		expect(isOne(2)).to.be.false;
		expect(isNotOne(1)).to.be.false;
		expect(isNotOne(2)).to.be.true;
	});

	it("negates refining predicates", () => {
		function isOne(num: 1 | 2): num is 1 {
			return num === 1;
		}
		const isNotOne = negatePredicateFn(isOne);
		expectTypeOf(isNotOne).toEqualTypeOf<(num: 1 | 2) => num is 2>();
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
