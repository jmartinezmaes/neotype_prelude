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
import { arbStr, expectLawfulSemigroup } from "./_test/utils.js";
import { Semigroup, cmb } from "./cmb.js";
import { Eq, eq } from "./cmp.js";
import { Eval } from "./eval.js";

describe("Eval", () => {
	describe("now", () => {
		it("constructs an Eval eagerly from the the value", () => {
			const ev = Eval.now<1>(1);
			const outcome = ev.run();
			expect(outcome).to.equal(1);
		});
	});

	describe("once", () => {
		it("constructs an Eval that evaluates the thunk at most once", () => {
			function f(): 1 {
				f.counter++;
				return 1;
			}
			f.counter = 0;

			const once = Eval.once(f);
			const ev = once.zipWith(once, (lhs, rhs): [1, 1] => [lhs, rhs]);
			const outcome = ev.run();
			expect(outcome).to.deep.equal([1, 1]);
			expect(f.counter).to.equal(1);
		});
	});

	describe("always", () => {
		it("constructs an Eval that evaluates the thunk on every reference", () => {
			function f(): 1 {
				f.counter++;
				return 1;
			}
			f.counter = 0;

			const always = Eval.always(f);
			const ev = always.zipWith(always, (lhs, rhs): [1, 1] => [lhs, rhs]);
			const outcome = ev.run();
			expect(outcome).to.deep.equal([1, 1]);
			expect(f.counter).to.equal(2);
		});
	});

	describe("defer", () => {
		it("constructs an Eval lazily from the function", () => {
			const ev = Eval.defer(() => Eval.now<1>(1));
			const outcome = ev.run();
			expect(outcome).to.equal(1);
		});
	});

	describe("go", () => {
		it("constructs an Eval using the generator comprehension", () => {
			function* f(): Eval.Go<[1, 2]> {
				const one = yield* Eval.now<1>(1);
				const two = yield* Eval.now<2>(2);
				return [one, two];
			}
			const ev = Eval.go(f());
			const outcome = ev.run();
			expect(outcome).to.deep.equal([1, 2]);
		});
	});

	describe("reduce", () => {
		it("reduces the finite iterable from left to right in the context of Eval", () => {
			const ev = Eval.reduce(
				["x", "y"],
				(chars, char) => Eval.now(chars + char),
				"",
			);
			const outcome = ev.run();
			expect(outcome).to.equal("xy");
		});
	});

	describe("all", () => {
		it("turns the array or the tuple literal of Eval elements inside out", () => {
			const ev = Eval.all([Eval.now<1>(1), Eval.now<2>(2)]);
			const outcome = ev.run();
			expect(outcome).to.deep.equal([1, 2]);
		});
	});

	describe("allProps", () => {
		it("turns the record or the object literal of Eval elements inside out", () => {
			const ev = Eval.allProps({
				one: Eval.now<1>(1),
				two: Eval.now<2>(2),
			});
			const outcome = ev.run();
			expect(outcome).to.deep.equal({ one: 1, two: 2 });
		});
	});

	describe("lift", () => {
		it("lifts the function into the context of Eval", () => {
			function f<A, B>(lhs: A, rhs: B): [A, B] {
				return [lhs, rhs];
			}
			const ev = Eval.lift(f)(Eval.now<1>(1), Eval.now<2>(2));
			const outcome = ev.run();
			expect(outcome).to.deep.equal([1, 2]);
		});
	});

	describe("#[Semigroup.cmb]", () => {
		it("combines the outcomes", () => {
			const property = fc.property(arbStr(), arbStr(), (lhs, rhs) => {
				expect(cmb(Eval.now(lhs), Eval.now(rhs)).run()).to.deep.equal(
					cmb(lhs, rhs),
				);
			});
			fc.assert(property);
		});

		it("implements a lawful semigroup", () => {
			class RunEval<out T> {
				constructor(readonly val: Eval<T>) {}

				[Eq.eq]<T extends Eq<T>>(
					this: RunEval<T>,
					that: RunEval<T>,
				): boolean {
					return eq(this.val.run(), that.val.run());
				}

				[Semigroup.cmb]<T extends Semigroup<T>>(
					this: RunEval<T>,
					that: RunEval<T>,
				): RunEval<T> {
					return new RunEval(cmb(this.val, that.val));
				}
			}

			function arbRunEval<T>(
				arb: fc.Arbitrary<T>,
			): fc.Arbitrary<RunEval<T>> {
				return arb.chain((val) =>
					fc
						.oneof(
							fc.constant(Eval.now(val)),
							fc.constant(Eval.once(() => val)),
							fc.constant(Eval.always(() => val)),
						)
						.map((ev) => new RunEval(ev)),
				);
			}

			expectLawfulSemigroup(arbRunEval(arbStr()));
		});
	});

	describe("#flatMap", () => {
		it("applies the continuation to the outcome", () => {
			const ev = Eval.now<1>(1).flatMap(
				(one): Eval<[1, 2]> => Eval.now([one, 2]),
			);
			const outcome = ev.run();
			expect(outcome).to.deep.equal([1, 2]);
		});
	});

	describe("#goMap", () => {
		it("applies the continuation to the outcome", () => {
			const ev = Eval.now<1>(1).goMap(function* (one): Eval.Go<[1, 2]> {
				const two = yield* Eval.now<2>(2);
				return [one, two];
			});
			const outcome = ev.run();
			expect(outcome).to.deep.equal([1, 2]);
		});
	});

	describe("#zipWith", () => {
		it("applies the function to the outcomes", () => {
			const ev = Eval.now<1>(1).zipWith(
				Eval.now<2>(2),
				(one, two): [1, 2] => [one, two],
			);
			const outcome = ev.run();
			expect(outcome).to.deep.equal([1, 2]);
		});
	});

	describe("#and", () => {
		it("keeps only the second outcome", () => {
			const ev = Eval.now<1>(1).and(Eval.now<2>(2));
			const outcome = ev.run();
			expect(outcome).to.equal(2);
		});
	});

	describe("#map", () => {
		it("applies the function to the outcome", () => {
			const ev = Eval.now<1>(1).map((one): [1, 2] => [one, 2]);
			const outcome = ev.run();
			expect(outcome).to.deep.equal([1, 2]);
		});
	});
});
