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
import { expect } from "vitest";
import { Semigroup, cmb } from "../cmb.js";
import { Eq, Ord, Ordering, eq, le } from "../cmp.js";
import type { Builder } from "../builder.js";

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

export function arbNum(): Fc.Arbitrary<Num> {
	return Fc.float({ noNaN: true }).map((val) => new Num(val));
}

export function arbStr(): Fc.Arbitrary<Str> {
	return Fc.string().map((val) => new Str(val));
}

export class TestBuilder<in out T> implements Builder<T, T[]> {
	output: T[] = [];

	add(input: T): void {
		this.output.push(input);
	}

	finish(): T[] {
		return this.output;
	}
}

export function expectLawfulEq<T extends Eq<T>>(arb: Fc.Arbitrary<T>): void {
	const reflexivity = Fc.property(arb, (val) => {
		expect(eq(val, val), "reflexivity").to.be.true;
	});

	const symmetry = Fc.property(arb, arb, (lhs, rhs) => {
		expect(eq(lhs, rhs), "symmetry").to.equal(eq(rhs, lhs));
	});

	const transitivity = Fc.property(arb, arb, arb, (first, second, third) => {
		if (eq(first, second) && eq(second, third)) {
			expect(eq(first, third), "transitivity").to.be.true;
		}
	});

	Fc.assert(reflexivity);
	Fc.assert(symmetry);
	Fc.assert(transitivity);
}

export function expectLawfulOrd<T extends Ord<T>>(arb: Fc.Arbitrary<T>): void {
	const reflexivity = Fc.property(arb, (val) => {
		expect(le(val, val), "reflexivity").to.be.true;
	});

	const antisymmetry = Fc.property(arb, arb, (lhs, rhs) => {
		expect(le(lhs, rhs) && le(rhs, lhs), "antisymmetry").to.equal(
			eq(lhs, rhs),
		);
	});

	const transitivity = Fc.property(arb, arb, arb, (first, second, third) => {
		if (le(first, second) && le(second, third)) {
			expect(le(first, third), "transitivity").to.be.true;
		}
	});

	const comparability = Fc.property(arb, arb, (lhs, rhs) => {
		expect(le(lhs, rhs) || le(rhs, lhs), "comparability").to.be.true;
	});

	Fc.assert(reflexivity);
	Fc.assert(antisymmetry);
	Fc.assert(transitivity);
	Fc.assert(comparability);
}

export function expectLawfulSemigroup<T extends Semigroup<T> & Eq<T>>(
	arb: Fc.Arbitrary<T>,
): void {
	const associativity = Fc.property(arb, arb, arb, (first, second, third) => {
		expect(
			eq(cmb(first, cmb(second, third)), cmb(cmb(first, second), third)),
			"associativity",
		).to.be.true;
	});
	Fc.assert(associativity);
}
