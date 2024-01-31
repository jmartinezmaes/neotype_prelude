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

import { describe, expect, it } from "vitest";
import { TestBuilder } from "../_test/utils.js";
import { Either } from "../either.js";
import { delay } from "./_test/utils.js";
import { AsyncEither } from "./either.js";

describe("AsyncEither", () => {
	describe("go", () => {
		it("short-circuits on the first yielded Left", async () => {
			async function* f(): AsyncEither.Go<1 | 3, [2, 4]> {
				const two = yield* await Promise.resolve(Either.right<2, 1>(2));
				const four = yield* await Promise.resolve(Either.left<3, 4>(3));
				return [two, four];
			}
			const either = await AsyncEither.go(f());
			expect(either).to.deep.equal(Either.left(3));
		});

		it("completes and returns if all yielded values are Right", async () => {
			async function* f(): AsyncEither.Go<1 | 3, [2, 4]> {
				const two = yield* await Promise.resolve(Either.right<2, 1>(2));
				const four = yield* await Promise.resolve(
					Either.right<4, 3>(4),
				);
				return [two, four];
			}
			const either = await AsyncEither.go(f());
			expect(either).to.deep.equal(Either.right([2, 4]));
		});

		it("unwraps Promises in Right variants and in return", async () => {
			async function* f(): AsyncEither.Go<1 | 3, [2, 4]> {
				const two = yield* await Promise.resolve(
					Either.right<Promise<2>, 1>(Promise.resolve(2)),
				);
				const four = yield* await Promise.resolve(
					Either.right<Promise<4>, 3>(Promise.resolve(4)),
				);
				return Promise.resolve([two, four]);
			}
			const either = await AsyncEither.go(f());
			expect(either).to.deep.equal(Either.right([2, 4]));
		});

		it("executes the finally block if a Left is yielded in the try block", async () => {
			const logs: string[] = [];
			async function* f(): AsyncEither.Go<1, 2> {
				try {
					return yield* await Promise.resolve(Either.left<1, 2>(1));
				} finally {
					logs.push("finally");
				}
			}
			const either = await AsyncEither.go(f());
			expect(either).to.deep.equal(Either.left(1));
			expect(logs).to.deep.equal(["finally"]);
		});

		it("keeps the most recent yielded Left when using try and finally blocks", async () => {
			async function* f(): AsyncEither.Go<1 | 3, 2> {
				try {
					return yield* await Promise.resolve(Either.left<1, 2>(1));
				} finally {
					yield* await Promise.resolve(Either.left<3, 4>(3));
				}
			}
			const either = await AsyncEither.go(f());
			expect(either).to.deep.equal(Either.left(3));
		});
	});

	describe("fromGoFn", () => {
		it("evaluates the async generator function to return an AsyncEither", async () => {
			async function* f(): AsyncEither.Go<1 | 3, [2, 4]> {
				const two = yield* await Promise.resolve(Either.right<2, 1>(2));
				const four = yield* await Promise.resolve(
					Either.right<4, 3>(4),
				);
				return [two, four];
			}
			const either = await AsyncEither.fromGoFn(f);
			expect(either).to.deep.equal(Either.right([2, 4]));
		});
	});

	describe("wrapGoFn", () => {
		it("adapts the async generator function to return an AsyncEither", async () => {
			async function* f(two: 2): AsyncEither.Go<never, [2, 4]> {
				const four = yield* await Promise.resolve(Either.right<4>(4));
				return [two, four];
			}
			const wrapped = AsyncEither.wrapGoFn(f);
			const either = await wrapped(2);
			expect(either).to.deep.equal(Either.right([2, 4]));
		});
	});

	describe("reduce", () => {
		it("reduces the finite async iterable from left to right in the context of Either", async () => {
			async function* gen(): AsyncGenerator<string> {
				yield delay(50).then(() => "a");
				yield delay(10).then(() => "b");
			}
			const either = await AsyncEither.reduce(
				gen(),
				(chars, char, idx) =>
					delay(1).then(() => Either.right(chars + char + idx)),
				"",
			);
			expect(either).to.deep.equal(Either.right("a0b1"));
		});
	});

	describe("traverseInto", () => {
		it("applies the function to the elements and collects the successes into the Builder if all results are Right", async () => {
			async function* gen(): AsyncGenerator<string> {
				yield delay(50).then(() => "a");
				yield delay(10).then(() => "b");
			}
			const builder = new TestBuilder<[number, string]>();
			const either = await AsyncEither.traverseInto(
				gen(),
				(char, idx) =>
					delay(1).then(() =>
						Either.right<[number, string]>([idx, char]),
					),
				builder,
			);
			expect(either).to.deep.equal(
				Either.right([
					[0, "a"],
					[1, "b"],
				]),
			);
		});
	});

	describe("traverse", () => {
		it("applies the function to the elements and collects the successes in an array if all results are Right", async () => {
			async function* gen(): AsyncGenerator<string> {
				yield delay(50).then(() => "a");
				yield delay(10).then(() => "b");
			}
			const either = await AsyncEither.traverse(gen(), (char, idx) =>
				delay(1).then(() =>
					Either.right<[number, string]>([idx, char]),
				),
			);
			expect(either).to.deep.equal(
				Either.right([
					[0, "a"],
					[1, "b"],
				]),
			);
		});
	});

	describe("allInto", () => {
		it("collects the successes into the Builder if all elements are Right", async () => {
			async function* gen(): AsyncGenerator<Either<never, number>> {
				yield delay(50).then(() => Either.right(2));
				yield delay(10).then(() => Either.right(4));
			}
			const builder = new TestBuilder<number>();
			const either = await AsyncEither.allInto(gen(), builder);
			expect(either).to.deep.equal(Either.right([2, 4]));
		});
	});

	describe("all", () => {
		it("collects the successes in an array if all elements are Right", async () => {
			async function* gen(): AsyncGenerator<Either<never, number>> {
				yield delay(50).then(() => Either.right(2));
				yield delay(10).then(() => Either.right(4));
			}
			const either = await AsyncEither.all(gen());
			expect(either).to.deep.equal(Either.right([2, 4]));
		});
	});

	describe("forEach", () => {
		it("applies the function to the elements while the result is Right", async () => {
			async function* gen(): AsyncGenerator<string> {
				yield delay(50).then(() => "a");
				yield delay(10).then(() => "b");
			}
			const results: [number, string][] = [];
			const either = await AsyncEither.forEach(gen(), (char, idx) =>
				delay(1).then(() => {
					results.push([idx, char]);
					return Either.right(undefined);
				}),
			);
			expect(either).to.deep.equal(Either.right(undefined));
			expect(results).to.deep.equal([
				[0, "a"],
				[1, "b"],
			]);
		});
	});

	describe("traverseIntoPar", () => {
		it("applies the function to the elements and short-circuits on the first Left result", async () => {
			const either = await AsyncEither.traverseIntoPar(
				["a", "b"],
				(char, idx) =>
					delay(char === "a" ? 50 : 10).then(() =>
						char === "b"
							? Either.left<[number, string]>([idx, char])
							: Either.right([idx, char]),
					),
				new TestBuilder<[number, string]>(),
			);
			expect(either).to.deep.equal(Either.left([1, "b"]));
		});

		it("applies the function to the elements and collects the successes into the Builder if all results are Right", async () => {
			const builder = new TestBuilder<[number, string]>();
			const either = await AsyncEither.traverseIntoPar(
				["a", "b"],
				(char, idx) =>
					delay(char === "a" ? 50 : 10).then(() =>
						Either.right([idx, char]),
					),
				builder,
			);
			expect(either).to.deep.equal(
				Either.right([
					[1, "b"],
					[0, "a"],
				]),
			);
		});
	});

	describe("traversePar", () => {
		it("applies the function to the elements and collects the successes in an array if all results are Right", async () => {
			const either = await AsyncEither.traversePar(
				["a", "b"],
				(char, idx) =>
					delay(char === "a" ? 50 : 10).then(() =>
						Either.right<[number, string]>([idx, char]),
					),
			);
			expect(either).to.deep.equal(
				Either.right([
					[0, "a"],
					[1, "b"],
				]),
			);
		});
	});

	describe("allIntoPar", () => {
		it("collects the successes into the Builder if all elements are Right", async () => {
			const builder = new TestBuilder<number>();
			const either = await AsyncEither.allIntoPar(
				[
					delay(50).then(() => Either.right<2, 1>(2)),
					delay(10).then(() => Either.right<4, 3>(4)),
				],
				builder,
			);
			expect(either).to.deep.equal(Either.right([4, 2]));
		});
	});

	describe("allPar", () => {
		it("collects the successes in an array if all elements are Right", async () => {
			const either = await AsyncEither.allPar([
				delay(50).then<Either<1, 2>>(() => Either.right(2)),
				delay(10).then<Either<3, 4>>(() => Either.right(4)),
			]);
			expect(either).to.deep.equal(Either.right([2, 4]));
		});
	});

	describe("allPropsPar", () => {
		it("collects the successes in an object if all elements are Right", async () => {
			const either = await AsyncEither.allPropsPar({
				two: delay(50).then<Either<1, 2>>(() => Either.right(2)),
				four: delay(10).then<Either<3, 4>>(() => Either.right(4)),
			});
			expect(either).to.deep.equal(Either.right({ two: 2, four: 4 }));
		});
	});

	describe("forEachPar", () => {
		it("applies the function to the elements while the result is Right", async () => {
			const results: [number, string][] = [];
			const either = await AsyncEither.forEachPar(
				["a", "b"],
				(char, idx) =>
					delay(char === "a" ? 50 : 10).then(() => {
						results.push([idx, char]);
						return Either.right(undefined);
					}),
			);
			expect(either).to.deep.equal(Either.right(undefined));
			expect(results).to.deep.equal([
				[1, "b"],
				[0, "a"],
			]);
		});
	});

	describe("liftPar", () => {
		it("applies the function to the successes if all arguments are Right", async () => {
			async function f<A, B>(lhs: A, rhs: B): Promise<[A, B]> {
				return [lhs, rhs];
			}
			const either = await AsyncEither.liftPar(f<2, 4>)(
				delay(50).then(() => Either.right<2, 1>(2)),
				delay(10).then(() => Either.right<4, 3>(4)),
			);
			expect(either).to.deep.equal(Either.right([2, 4]));
		});
	});
});
