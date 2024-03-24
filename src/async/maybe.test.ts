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
import { TestBuilder } from "../_test/utils.js";
import { Maybe } from "../maybe.js";
import { delay } from "./_test/utils.js";
import { AsyncMaybe, type AsyncMaybeLike } from "./maybe.js";

describe("AsyncMaybe", () => {
	describe("go", async () => {
		it("short-circuits on the first yielded Nothing", async () => {
			async function* f(): AsyncMaybe.Go<[1, 2]> {
				const one = yield* await Promise.resolve(Maybe.just<1>(1));
				const two = yield* await Promise.resolve(Maybe.nothing);
				return [one, two];
			}
			const maybe = await AsyncMaybe.go(f());
			expectTypeOf(maybe).toEqualTypeOf<Maybe<[1, 2]>>();
			expect(maybe).to.equal(Maybe.nothing);
		});

		it("completes if all yielded values are Just", async () => {
			async function* f(): AsyncMaybe.Go<[1, 2]> {
				const one = yield* await Promise.resolve(Maybe.just<1>(1));
				const two = yield* await Promise.resolve(Maybe.just<2>(2));
				return [one, two];
			}
			const maybe = await AsyncMaybe.go(f());
			expectTypeOf(maybe).toEqualTypeOf<Maybe<[1, 2]>>();
			expect(maybe).to.deep.equal(Maybe.just([1, 2]));
		});

		it("unwraps Promises in Just variants and in return", async () => {
			async function* f(): AsyncMaybe.Go<[1, 2]> {
				const one = yield* await Promise.resolve(
					Maybe.just(Promise.resolve<1>(1)),
				);
				const two = yield* await Promise.resolve(
					Maybe.just(Promise.resolve<2>(2)),
				);
				return Promise.resolve([one, two]);
			}
			const maybe = await AsyncMaybe.go(f());
			expectTypeOf(maybe).toEqualTypeOf<Maybe<[1, 2]>>();
			expect(maybe).to.deep.equal(Maybe.just([1, 2]));
		});

		it("executes the finally block if Nothing is yielded in the try block", async () => {
			const logs: string[] = [];
			async function* f(): AsyncMaybe.Go<1> {
				try {
					return yield* await Promise.resolve(Maybe.nothing);
				} finally {
					logs.push("finally");
				}
			}
			const maybe = await AsyncMaybe.go(f());
			expectTypeOf(maybe).toEqualTypeOf<Maybe<1>>();
			expect(maybe).to.equal(Maybe.nothing);
			expect(logs).to.deep.equal(["finally"]);
		});

		it("returns Nothing if Nothing is yielded in the finally block", async () => {
			async function* f(): AsyncMaybe.Go<1> {
				try {
					return yield* await Promise.resolve(Maybe.just<1>(1));
				} finally {
					yield* await Promise.resolve(Maybe.nothing);
				}
			}
			const maybe = await AsyncMaybe.go(f());
			expectTypeOf(maybe).toEqualTypeOf<Maybe<1>>();
			expect(maybe).to.equal(Maybe.nothing);
		});
	});

	describe("fromGoFn", () => {
		it("evaluates the async generator function to return an AsyncMaybe", async () => {
			async function* f(): AsyncMaybe.Go<[1, 2]> {
				const one = yield* await Promise.resolve(Maybe.just<1>(1));
				const two = yield* await Promise.resolve(Maybe.just<2>(2));
				return [one, two];
			}
			const maybe = await AsyncMaybe.fromGoFn(f);
			expectTypeOf(maybe).toEqualTypeOf<Maybe<[1, 2]>>();
			expect(maybe).to.deep.equal(Maybe.just([1, 2]));
		});
	});

	describe("wrapGoFn", () => {
		it("adapts the async generator function to return an AsyncMaybe", async () => {
			async function* f(one: 1): AsyncMaybe.Go<[1, 2]> {
				const two = yield* await Promise.resolve(Maybe.just<2>(2));
				return [one, two];
			}
			const wrapped = AsyncMaybe.wrapGoFn(f);
			expectTypeOf(wrapped).toEqualTypeOf<
				(one: 1) => AsyncMaybe<[1, 2]>
			>();

			const maybe = await wrapped(1);
			expectTypeOf(maybe).toEqualTypeOf<Maybe<[1, 2]>>();
			expect(maybe).to.deep.equal(Maybe.just([1, 2]));
		});
	});

	describe("reduce", () => {
		it("reduces the finite async iterable from left to right in the context of Maybe", async () => {
			async function* gen(): AsyncGenerator<string> {
				yield delay(50).then(() => "a");
				yield delay(10).then(() => "b");
			}
			const maybe = await AsyncMaybe.reduce(
				gen(),
				(chars, char, idx) =>
					delay(1).then(() =>
						Maybe.just(chars + char + idx.toString()),
					),
				"",
			);
			expectTypeOf(maybe).toEqualTypeOf<Maybe<string>>();
			expect(maybe).to.deep.equal(Maybe.just("a0b1"));
		});
	});

	describe("traverseInto", () => {
		it("applies the function to the elements and collects the present values into the Builder if all results are Just", async () => {
			async function* gen(): AsyncGenerator<string> {
				yield delay(50).then(() => "a");
				yield delay(10).then(() => "b");
			}
			const builder = new TestBuilder<[number, string]>();
			const maybe = await AsyncMaybe.traverseInto(
				gen(),
				(char, idx) =>
					delay(1).then(() =>
						Maybe.just<[number, string]>([idx, char]),
					),
				builder,
			);
			expectTypeOf(maybe).toEqualTypeOf<Maybe<[number, string][]>>();
			expect(maybe).to.deep.equal(
				Maybe.just([
					[0, "a"],
					[1, "b"],
				]),
			);
		});
	});

	describe("traverse", () => {
		it("applies the function to the elements and collects the present values in an array if all results are Just", async () => {
			async function* gen(): AsyncGenerator<string> {
				yield delay(50).then(() => "a");
				yield delay(10).then(() => "b");
			}
			const maybe = await AsyncMaybe.traverse(gen(), (char, idx) =>
				delay(1).then(() => Maybe.just<[number, string]>([idx, char])),
			);
			expectTypeOf(maybe).toEqualTypeOf<Maybe<[number, string][]>>();
			expect(maybe).to.deep.equal(
				Maybe.just([
					[0, "a"],
					[1, "b"],
				]),
			);
		});
	});

	describe("allInto", () => {
		it("collects the present values into the Builder if all elements are Just", async () => {
			async function* gen(): AsyncGenerator<Maybe<number>> {
				yield delay(50).then(() => Maybe.just(1));
				yield delay(10).then(() => Maybe.just(2));
			}
			const builder = new TestBuilder<number>();
			const maybe = await AsyncMaybe.allInto(gen(), builder);
			expectTypeOf(maybe).toEqualTypeOf<Maybe<number[]>>();
			expect(maybe).to.deep.equal(Maybe.just([1, 2]));
		});
	});

	describe("all", () => {
		it("collects the present values in an array if all elements are Just", async () => {
			async function* gen(): AsyncGenerator<Maybe<number>> {
				yield delay(50).then(() => Maybe.just(1));
				yield delay(10).then(() => Maybe.just(2));
			}
			const maybe = await AsyncMaybe.all(gen());
			expectTypeOf(maybe).toEqualTypeOf<Maybe<number[]>>();
			expect(maybe).to.deep.equal(Maybe.just([1, 2]));
		});
	});

	describe("forEach", () => {
		it("applies the function to the elements while the result is Just", async () => {
			async function* gen(): AsyncGenerator<string> {
				yield delay(50).then(() => "a");
				yield delay(10).then(() => "b");
			}
			const results: [number, string][] = [];
			const maybe = await AsyncMaybe.forEach(gen(), (char, idx) =>
				delay(1).then((): Maybe<void> => {
					results.push([idx, char]);
					return Maybe.just(undefined);
				}),
			);
			expectTypeOf(maybe).toEqualTypeOf<Maybe<void>>();
			expect(maybe).to.deep.equal(Maybe.just(undefined));
			expect(results).to.deep.equal([
				[0, "a"],
				[1, "b"],
			]);
		});
	});

	describe("traverseIntoPar", () => {
		it("applies the function to the elements and short-cicruits on the first Nothing", async () => {
			const maybe = await AsyncMaybe.traverseIntoPar(
				["a", "b"],
				(char, idx) =>
					delay(char === "a" ? 50 : 10).then(
						(): Maybe<[number, string]> =>
							char === "a"
								? Maybe.nothing
								: Maybe.just([idx, char]),
					),
				new TestBuilder<[number, string]>(),
			);
			expectTypeOf(maybe).toEqualTypeOf<Maybe<[number, string][]>>();
			expect(maybe).to.equal(Maybe.nothing);
		});

		it("applies the function to the elements and collects the present values into the Builder if all results are Just", async () => {
			const builder = new TestBuilder<[number, string]>();
			const maybe = await AsyncMaybe.traverseIntoPar(
				["a", "b"],
				(char, idx) =>
					delay(char === "a" ? 50 : 10).then(
						(): Maybe<[number, string]> => Maybe.just([idx, char]),
					),
				builder,
			);
			expectTypeOf(maybe).toEqualTypeOf<Maybe<[number, string][]>>();
			expect(maybe).to.deep.equal(
				Maybe.just([
					[1, "b"],
					[0, "a"],
				]),
			);
		});
	});

	describe("traversePar", () => {
		it("applies the function to the elements and collects the present values in an array if all results are Just", async () => {
			const maybe = await AsyncMaybe.traversePar(
				["a", "b"],
				(char, idx) =>
					delay(char === "a" ? 50 : 10).then(
						(): Maybe<[number, string]> => Maybe.just([idx, char]),
					),
			);
			expectTypeOf(maybe).toEqualTypeOf<Maybe<[number, string][]>>();
			expect(maybe).to.deep.equal(
				Maybe.just([
					[0, "a"],
					[1, "b"],
				]),
			);
		});
	});

	describe("allIntoPar", () => {
		it("collects the present values into the Builder if all elements are Just", async () => {
			const builder = new TestBuilder<number>();
			const maybe = await AsyncMaybe.allIntoPar(
				[
					delay(50).then(() => Maybe.just(1)),
					delay(10).then(() => Maybe.just(2)),
				],
				builder,
			);
			expectTypeOf(maybe).toEqualTypeOf<Maybe<number[]>>();
			expect(maybe).to.deep.equal(Maybe.just([2, 1]));
		});
	});

	describe("allPar", () => {
		it("collects the present values in an array if all elements are Just", async () => {
			const maybe = await AsyncMaybe.allPar([
				delay(50).then<Maybe<1>>(() => Maybe.just(1)),
				delay(10).then<Maybe<2>>(() => Maybe.just(2)),
			]);
			expectTypeOf(maybe).toEqualTypeOf<Maybe<[1, 2]>>();
			expect(maybe).to.deep.equal(Maybe.just([1, 2]));
		});
	});

	describe("allPropsPar", () => {
		it("collects the present values in an object if all elements are Just", async () => {
			const maybe = await AsyncMaybe.allPropsPar({
				one: delay(50).then<Maybe<1>>(() => Maybe.just(1)),
				two: delay(10).then<Maybe<2>>(() => Maybe.just(2)),
			});
			expectTypeOf(maybe).toEqualTypeOf<Maybe<{ one: 1; two: 2 }>>();
			expect(maybe).to.deep.equal(Maybe.just({ one: 1, two: 2 }));
		});
	});

	describe("forEachPar", () => {
		it("applies the function to the elements and continues while the result is Just", async () => {
			const results: [number, string][] = [];
			const maybe = await AsyncMaybe.forEachPar(["a", "b"], (char, idx) =>
				delay(char === "a" ? 50 : 10).then((): Maybe<void> => {
					results.push([idx, char]);
					return Maybe.just(undefined);
				}),
			);
			expectTypeOf(maybe).toEqualTypeOf<Maybe<void>>();
			expect(maybe).to.deep.equal(Maybe.just(undefined));
			expect(results).to.deep.equal([
				[1, "b"],
				[0, "a"],
			]);
		});
	});

	describe("liftPar", () => {
		it("applies the function to the present values if all arguments are Just", async () => {
			async function f<A, B>(lhs: A, rhs: B): Promise<[A, B]> {
				return [lhs, rhs];
			}
			const lifted = AsyncMaybe.liftPar(f);
			expectTypeOf(lifted).toEqualTypeOf<
				<A, B>(
					lhs: Maybe<A> | AsyncMaybeLike<A>,
					rhs: Maybe<B> | AsyncMaybeLike<B>,
				) => AsyncMaybe<[A, B]>
			>();

			const maybe = await lifted(
				delay(50).then(() => Maybe.just<1>(1)),
				delay(10).then(() => Maybe.just<2>(2)),
			);
			expectTypeOf(maybe).toEqualTypeOf<Maybe<[1, 2]>>();
			expect(maybe).to.deep.equal(Maybe.just([1, 2]));
		});
	});
});
