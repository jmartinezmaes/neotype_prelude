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

import { describe, expect, expectTypeOf, it } from "vitest";
import { Str, TestBuilder } from "../_test/utils.js";
import { Validation } from "../validation.js";
import { delay } from "./_test/utils.js";
import { AsyncValidation, type AsyncValidationLike } from "./validation.js";
import type { Semigroup } from "../cmb.js";

describe("AsyncValidation", () => {
	describe("traverseInto", () => {
		it("applies the function to the elements and collects the successes into the Builder if all results are Ok", async () => {
			async function* gen(): AsyncGenerator<string> {
				yield delay(50).then(() => "a");
				yield delay(10).then(() => "b");
			}
			const builder = new TestBuilder<[number, string]>();
			const vdn = await AsyncValidation.traverseInto(
				gen(),
				(char, idx) =>
					delay(1).then(
						(): Validation<Str, [number, string]> =>
							Validation.ok([idx, char]),
					),
				builder,
			);
			expectTypeOf(vdn).toEqualTypeOf<
				Validation<Str, [number, string][]>
			>();
			expect(vdn).to.deep.equal(
				Validation.ok([
					[0, "a"],
					[1, "b"],
				]),
			);
		});
	});

	describe("traverse", () => {
		it("applies the function to the elements and collects the successes in an array if all results are Ok", async () => {
			async function* gen(): AsyncGenerator<string> {
				yield delay(50).then(() => "a");
				yield delay(10).then(() => "b");
			}
			const vdn = await AsyncValidation.traverse(gen(), (char, idx) =>
				delay(1).then(
					(): Validation<Str, [number, string]> =>
						Validation.ok([idx, char]),
				),
			);
			expectTypeOf(vdn).toEqualTypeOf<
				Validation<Str, [number, string][]>
			>();
			expect(vdn).to.deep.equal(
				Validation.ok([
					[0, "a"],
					[1, "b"],
				]),
			);
		});
	});

	describe("allInto", () => {
		it("collects the successes into the Builder if all results are Ok", async () => {
			async function* gen(): AsyncGenerator<Validation<Str, number>> {
				yield delay(50).then(() => Validation.ok(2));
				yield delay(50).then(() => Validation.ok(4));
			}
			const builder = new TestBuilder<number>();
			const vdn = await AsyncValidation.allInto(gen(), builder);
			expectTypeOf(vdn).toEqualTypeOf<Validation<Str, number[]>>();
			expect(vdn).to.deep.equal(Validation.ok([2, 4]));
		});
	});

	describe("all", () => {
		it("collects the successes in an array if all elements are Ok", async () => {
			async function* gen(): AsyncGenerator<Validation<Str, number>> {
				yield delay(50).then(() => Validation.ok(2));
				yield delay(50).then(() => Validation.ok(4));
			}
			const vdn = await AsyncValidation.all(gen());
			expectTypeOf(vdn).toEqualTypeOf<Validation<Str, number[]>>();
			expect(vdn).to.deep.equal(Validation.ok([2, 4]));
		});
	});

	describe("forEach", () => {
		it("applies the function to the elements while the result is Ok", async () => {
			async function* gen(): AsyncGenerator<string> {
				yield delay(50).then(() => "a");
				yield delay(10).then(() => "b");
			}
			const results: [number, string][] = [];
			const vdn = await AsyncValidation.forEach(gen(), (char, idx) =>
				delay(1).then((): Validation<Str, void> => {
					results.push([idx, char]);
					return Validation.ok(undefined);
				}),
			);
			expectTypeOf(vdn).toEqualTypeOf<Validation<Str, void>>();
			expect(vdn).to.deep.equal(Validation.ok(undefined));
			expect(results).to.deep.equal([
				[0, "a"],
				[1, "b"],
			]);
		});
	});

	describe("traverseIntoPar", () => {
		it("applies the function to the elements and collects failures in the order Promises resolve", async () => {
			const vdn = await AsyncValidation.traverseIntoPar(
				["a", "b"],
				(char, idx) =>
					delay(char === "a" ? 50 : 10).then(
						(): Validation<Str, [number, string]> =>
							Validation.err(new Str(idx.toString() + char)),
					),
				new TestBuilder<[number, string]>(),
			);
			expectTypeOf(vdn).toEqualTypeOf<
				Validation<Str, [number, string][]>
			>();
			expect(vdn).to.deep.equal(Validation.err(new Str("1b0a")));
		});

		it("applies the function to the elements and collects the successes into the Builder if all results are Ok", async () => {
			const builder = new TestBuilder<[number, string]>();
			const vdn = await AsyncValidation.traverseIntoPar(
				["a", "b"],
				(char, idx) =>
					delay(char === "a" ? 50 : 10).then(
						(): Validation<Str, [number, string]> =>
							Validation.ok([idx, char]),
					),
				builder,
			);
			expectTypeOf(vdn).toEqualTypeOf<
				Validation<Str, [number, string][]>
			>();
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
			const vdn = await AsyncValidation.traversePar(
				["a", "b"],
				(char, idx) =>
					delay(char === "a" ? 50 : 10).then(
						(): Validation<Str, [number, string]> =>
							Validation.ok([idx, char]),
					),
			);
			expectTypeOf(vdn).toEqualTypeOf<
				Validation<Str, [number, string][]>
			>();
			expect(vdn).to.deep.equal(
				Validation.ok([
					[0, "a"],
					[1, "b"],
				]),
			);
		});
	});

	describe("allIntoPar", () => {
		it("collects the successes into the Builder if all elements are Ok", async () => {
			const builder = new TestBuilder<number>();
			const vdn = await AsyncValidation.allIntoPar(
				[
					delay(50).then(() => Validation.ok<2, Str>(2)),
					delay(10).then(() => Validation.ok<4, Str>(4)),
				],
				builder,
			);
			expectTypeOf(vdn).toEqualTypeOf<Validation<Str, number[]>>();
			expect(vdn).to.deep.equal(Validation.ok([4, 2]));
		});
	});

	describe("allPar", () => {
		it("collects the successes in an array if all elements are Ok", async () => {
			const vdn = await AsyncValidation.allPar([
				delay(50).then<Validation<Str, 2>>(() => Validation.ok(2)),
				delay(10).then<Validation<Str, 4>>(() => Validation.ok(4)),
			]);
			expectTypeOf(vdn).toEqualTypeOf<Validation<Str, [2, 4]>>();
			expect(vdn).to.deep.equal(Validation.ok([2, 4]));
		});
	});

	describe("allPropsPar", () => {
		it("collects the successes in an object if all elements are Ok", async () => {
			const vdn = await AsyncValidation.allPropsPar({
				two: delay(50).then<Validation<Str, 2>>(() => Validation.ok(2)),
				four: delay(10).then<Validation<Str, 4>>(() =>
					Validation.ok(4),
				),
			});
			expectTypeOf(vdn).toEqualTypeOf<
				Validation<Str, { two: 2; four: 4 }>
			>();
			expect(vdn).to.deep.equal(Validation.ok({ two: 2, four: 4 }));
		});
	});

	describe("forEachPar", () => {
		it("applies the function to the successes if all arguments are Ok", async () => {
			const results: [number, string][] = [];
			const vdn = await AsyncValidation.forEachPar(
				["a", "b"],
				(char, idx) =>
					delay(char === "a" ? 50 : 10).then(
						(): Validation<Str, void> => {
							results.push([idx, char]);
							return Validation.ok(undefined);
						},
					),
			);
			expectTypeOf(vdn).toEqualTypeOf<Validation<Str, void>>();
			expect(vdn).to.deep.equal(Validation.ok(undefined));
			expect(results).to.deep.equal([
				[1, "b"],
				[0, "a"],
			]);
		});
	});

	describe("liftPar", () => {
		it("does not apply the function if any argument is Err", async () => {
			async function f<A, B>(lhs: A, rhs: B): Promise<[A, B]> {
				return [lhs, rhs];
			}
			const lifted = AsyncValidation.liftPar(f<2, 4>);
			expectTypeOf(lifted).toEqualTypeOf<
				<E extends Semigroup<E>>(
					lhs: Validation<E, 2> | AsyncValidationLike<E, 2>,
					rhs: Validation<E, 4> | AsyncValidationLike<E, 4>,
				) => AsyncValidation<E, [2, 4]>
			>();

			const vdn = await lifted(
				delay(50).then(
					(): Validation<Str, 2> => Validation.err(new Str("a")),
				),
				delay(10).then((): Validation<Str, 4> => Validation.ok(4)),
			);
			expectTypeOf(vdn).toEqualTypeOf<Validation<Str, [2, 4]>>();
			expect(vdn).to.deep.equal(Validation.err(new Str("a")));
		});

		it("applies the function to the successes if all arguments are Ok", async () => {
			async function f<A, B>(lhs: A, rhs: B): Promise<[A, B]> {
				return [lhs, rhs];
			}
			const vdn = await AsyncValidation.liftPar(f<2, 4>)(
				delay(50).then((): Validation<Str, 2> => Validation.ok(2)),
				delay(10).then((): Validation<Str, 4> => Validation.ok(4)),
			);
			expect(vdn).to.deep.equal(Validation.ok([2, 4]));
		});
	});
});
