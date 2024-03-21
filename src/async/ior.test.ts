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
import { Ior } from "../ior.js";
import { delay } from "./_test/utils.js";
import { AsyncIor, type AsyncIorLike } from "./ior.js";
import type { Semigroup } from "../cmb.js";

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
			expectTypeOf(ior).toEqualTypeOf<Ior<Str, [2, 4]>>();
			expect(ior).to.deep.equal(Ior.left(new Str("b")));
		});

		it("completes if all yielded values are Right", async () => {
			async function* f(): AsyncIor.Go<Str, [2, 4]> {
				const two = yield* await Promise.resolve(Ior.right<2, Str>(2));
				const four = yield* await Promise.resolve(Ior.right<4, Str>(4));
				return [two, four];
			}
			const ior = await AsyncIor.go(f());
			expectTypeOf(ior).toEqualTypeOf<Ior<Str, [2, 4]>>();
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
			expectTypeOf(ior).toEqualTypeOf<Ior<Str, [2, 4]>>();
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
			expectTypeOf(ior).toEqualTypeOf<Ior<Str, [2, 4]>>();
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
			expectTypeOf(ior).toEqualTypeOf<Ior<Str, [2, 4]>>();
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
			expectTypeOf(ior).toEqualTypeOf<Ior<Str, [2, 4]>>();
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
			expectTypeOf(ior).toEqualTypeOf<Ior<Str, [2, 4]>>();
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
			expectTypeOf(ior).toEqualTypeOf<Ior<Str, 2>>();
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
					yield* await Promise.resolve(
						Ior.left<Str, 4>(new Str("b")),
					);
				}
			}
			const ior = await AsyncIor.go(f());
			expectTypeOf(ior).toEqualTypeOf<Ior<Str, 2>>();
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
			expectTypeOf(ior).toEqualTypeOf<Ior<Str, 2>>();
			expect(ior).to.deep.equal(Ior.left(new Str("ab")));
		});
	});

	describe("fromGoFn", () => {
		it("evaluates the async generator function to return an AsyncIor", async () => {
			async function* f(): AsyncIor.Go<Str, [2, 4]> {
				const two = yield* await Promise.resolve(
					Ior.both<Str, 2>(new Str("a"), 2),
				);
				const four = yield* await Promise.resolve(
					Ior.both<Str, 4>(new Str("b"), 4),
				);
				return [two, four];
			}
			const ior = await AsyncIor.fromGoFn(f);
			expectTypeOf(ior).toEqualTypeOf<Ior<Str, [2, 4]>>();
			expect(ior).to.deep.equal(Ior.both(new Str("ab"), [2, 4]));
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
			expectTypeOf(wrapped).toEqualTypeOf<
				(two: 2) => AsyncIor<Str, [2, 4]>
			>();

			const ior = await wrapped(2);
			expectTypeOf(ior).toEqualTypeOf<Ior<Str, [2, 4]>>();
			expect(ior).to.deep.equal(Ior.both(new Str("a"), [2, 4]));
		});
	});

	describe("reduce", () => {
		it("reduces the finite async iterable from left to right in the context of Ior", async () => {
			async function* gen(): AsyncGenerator<string> {
				yield delay(50).then(() => "a");
				yield delay(10).then(() => "b");
			}
			const ior = await AsyncIor.reduce(
				gen(),
				(chars, char, idx) =>
					delay(1).then(() =>
						Ior.both(new Str(char), chars + char + idx),
					),
				"",
			);
			expectTypeOf(ior).toEqualTypeOf<Ior<Str, string>>();
			expect(ior).to.deep.equal(Ior.both(new Str("ab"), "a0b1"));
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
					delay(1).then(
						(): Ior<Str, [number, string]> =>
							Ior.both(new Str(char), [idx, char]),
					),
				builder,
			);
			expectTypeOf(ior).toEqualTypeOf<Ior<Str, [number, string][]>>();
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
				delay(1).then(
					(): Ior<Str, [number, string]> =>
						Ior.both(new Str(char), [idx, char]),
				),
			);
			expectTypeOf(ior).toEqualTypeOf<Ior<Str, [number, string][]>>();
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
			expectTypeOf(ior).toEqualTypeOf<Ior<Str, number[]>>();
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
			expectTypeOf(ior).toEqualTypeOf<Ior<Str, number[]>>();
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
				delay(1).then((): Ior<Str, void> => {
					results.push([idx, char]);
					return Ior.both(new Str(char), undefined);
				}),
			);
			expectTypeOf(ior).toEqualTypeOf<Ior<Str, void>>();
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
					delay(char === "a" ? 50 : 10).then(
						(): Ior<Str, [number, string]> =>
							char === "a"
								? Ior.both(new Str(char), [idx, char])
								: Ior.left(new Str(idx.toString() + char)),
					),
				new TestBuilder<[number, string]>(),
			);
			expectTypeOf(ior).toEqualTypeOf<Ior<Str, [number, string][]>>();
			expect(ior).to.deep.equal(Ior.left(new Str("1b")));
		});

		it("applies the function to the elements and collects the right-hand values into the Builder if no results are Left", async () => {
			const builder = new TestBuilder<[number, string]>();
			const ior = await AsyncIor.traverseIntoPar(
				["a", "b"],
				(char, idx) =>
					delay(char === "a" ? 50 : 10).then(
						(): Ior<Str, [number, string]> =>
							Ior.right([idx, char]),
					),
				builder,
			);
			expectTypeOf(ior).toEqualTypeOf<Ior<Str, [number, string][]>>();
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
					delay(char === "a" ? 50 : 10).then(
						(): Ior<Str, [number, string]> =>
							char === "a"
								? Ior.both(new Str(char), [idx, char])
								: Ior.right([idx, char]),
					),
				builder,
			);
			expectTypeOf(ior).toEqualTypeOf<Ior<Str, [number, string][]>>();
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
					delay(char === "a" ? 50 : 10).then(
						(): Ior<Str, [number, string]> =>
							char === "a"
								? Ior.left(new Str(idx.toString() + char))
								: Ior.both(new Str(char), [idx, char]),
					),
				new TestBuilder<[number, string]>(),
			);
			expectTypeOf(ior).toEqualTypeOf<Ior<Str, [number, string][]>>();
			expect(ior).to.deep.equal(Ior.left(new Str("b0a")));
		});

		it("retains the left-hand value if a Right resolves after a Both", async () => {
			const builder = new TestBuilder<[number, string]>();
			const ior = await AsyncIor.traverseIntoPar(
				["a", "b"],
				(char, idx) =>
					delay(char === "a" ? 50 : 10).then(
						(): Ior<Str, [number, string]> =>
							char === "a"
								? Ior.right([idx, char])
								: Ior.both(new Str(char), [idx, char]),
					),
				builder,
			);
			expectTypeOf(ior).toEqualTypeOf<Ior<Str, [number, string][]>>();
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
					delay(char === "a" ? 50 : 10).then(
						(): Ior<Str, [number, string]> =>
							Ior.both(new Str(char), [idx, char]),
					),
				builder,
			);
			expectTypeOf(ior).toEqualTypeOf<Ior<Str, [number, string][]>>();
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
				delay(char === "a" ? 50 : 10).then(
					(): Ior<Str, [number, string]> =>
						Ior.both(new Str(char), [idx, char]),
				),
			);
			expectTypeOf(ior).toEqualTypeOf<Ior<Str, [number, string][]>>();
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
			expectTypeOf(ior).toEqualTypeOf<Ior<Str, number[]>>();
			expect(ior).to.deep.equal(Ior.both(new Str("ba"), [4, 2]));
		});
	});

	describe("allPar", () => {
		it("collects the right-hand values in an array if no elements are Left", async () => {
			const ior = await AsyncIor.allPar([
				delay(50).then<Ior<Str, 2>>(() => Ior.both(new Str("a"), 2)),
				delay(10).then<Ior<Str, 4>>(() => Ior.both(new Str("b"), 4)),
			]);
			expectTypeOf(ior).toEqualTypeOf<Ior<Str, [2, 4]>>();
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
			expectTypeOf(ior).toEqualTypeOf<Ior<Str, { two: 2; four: 4 }>>();
			expect(ior).to.deep.equal(
				Ior.both(new Str("ba"), { two: 2, four: 4 }),
			);
		});
	});

	describe("forEachPar", () => {
		it("applies the function to the elements while the result is not Left", async () => {
			const results: [number, string][] = [];
			const ior = await AsyncIor.forEachPar(["a", "b"], (char, idx) =>
				delay(char === "a" ? 50 : 10).then((): Ior<Str, void> => {
					results.push([idx, char]);
					return Ior.both(new Str(char), undefined);
				}),
			);
			expectTypeOf(ior).toEqualTypeOf<Ior<Str, void>>();
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
			const lifted = AsyncIor.liftPar(f<2, 4>);
			expectTypeOf(lifted).toEqualTypeOf<
				<A extends Semigroup<A>>(
					lhs: Ior<A, 2> | AsyncIorLike<A, 2>,
					rhs: Ior<A, 4> | AsyncIorLike<A, 4>,
				) => AsyncIor<A, [2, 4]>
			>();

			const ior = await lifted(
				delay(50).then(() => Ior.both(new Str("a"), 2)),
				delay(10).then(() => Ior.both(new Str("b"), 4)),
			);
			expectTypeOf(ior).toEqualTypeOf<Ior<Str, [2, 4]>>();
			expect(ior).to.deep.equal(Ior.both(new Str("ba"), [2, 4]));
		});
	});
});
