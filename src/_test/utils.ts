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
import { expect } from "vitest";
import { Semigroup, cmb } from "../cmb.js";
import { Eq, Ord, Ordering, cmp, eq, le } from "../cmp.js";

export class Num implements Ord<Num> {
	constructor(readonly val: number) {}

	[Eq.eq](that: Num): boolean {
		return this.val === that.val;
	}

	[Ord.cmp](that: Num): Ordering {
		return Ordering.fromNumber(this.val - that.val);
	}
}

export class Str implements Semigroup<Str> {
	constructor(readonly val: string) {}

	[Eq.eq](that: Str): boolean {
		return this.val === that.val;
	}

	[Semigroup.cmb](that: Str): Str {
		return new Str(this.val + that.val);
	}
}

export function arbNum(): fc.Arbitrary<Num> {
	return fc.float({ noNaN: true }).map((val) => new Num(val));
}

export function arbStr(): fc.Arbitrary<Str> {
	return fc.string().map((val) => new Str(val));
}

export function expectLawfulEq<T extends Eq<T>>(arb: fc.Arbitrary<T>): void {
	fc.assert(
		fc.property(arb, (x) => {
			expect(eq(x, x), "reflexivity").to.be.true;
		}),
	);

	fc.assert(
		fc.property(arb, arb, (x, y) => {
			expect(eq(x, y), "symmetry").to.equal(eq(y, x));
		}),
	);

	fc.assert(
		fc.property(arb, (x) => {
			const y = x,
				z = x;
			expect(eq(x, y) && eq(y, z) && eq(x, z), "transitivity").to.be.true;
		}),
	);
}

export function expectLawfulOrd<T extends Ord<T>>(arb: fc.Arbitrary<T>): void {
	fc.assert(
		fc.property(arb, (x) => {
			expect(le(x, x), "reflexivity").to.be.true;
		}),
	);

	fc.assert(
		fc.property(arb, arb, (x, y) => {
			expect(le(x, y) && le(y, x), "antisymmetry").to.equal(eq(x, y));
		}),
	);

	fc.assert(
		fc.property(arb, arb, arb, (x, y, z) => {
			const [x1, y1, z1] = [x, y, z].sort((a, b) =>
				cmp(a, b).toNumber(),
			) as [T, T, T];
			expect(le(x1, y1) && le(y1, z1) && le(x1, z1), "transitivity").to.be
				.true;
		}),
	);

	fc.assert(
		fc.property(arb, arb, (x, y) => {
			expect(le(x, y) || le(y, x), "comparability").to.be.true;
		}),
	);
}

export function expectLawfulSemigroup<T extends Semigroup<T> & Eq<T>>(
	arb: fc.Arbitrary<T>,
): void {
	fc.assert(
		fc.property(arb, arb, arb, (x, y, z) => {
			expect(eq(cmb(x, cmb(y, z)), cmb(cmb(x, y), z)), "associativity").to
				.be.true;
		}),
	);
}
