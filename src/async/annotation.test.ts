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
import { Str, TestBuilder, delay } from "../_test/utils.js";
import { Annotation } from "../annotation.js";
import { AsyncAnnotation } from "./annotation.js";

describe("AsyncAnnotation", () => {
	describe("go", () => {
		it("completes if all yielded values are Value", async () => {
			async function* f(): AsyncAnnotation.Go<[2, 4], never> {
				const two = yield* await Promise.resolve(
					Annotation.value<2>(2),
				);
				const four = yield* await Promise.resolve(
					Annotation.value<4>(4),
				);
				return [two, four];
			}
			const anno = await AsyncAnnotation.go(f());
			expect(anno).to.deep.equal(Annotation.value([2, 4]));
		});

		it("completes and retains the log if a Note is yielded after a Value", async () => {
			async function* f(): AsyncAnnotation.Go<[2, 4], Str> {
				const two = yield* await Promise.resolve(
					Annotation.value<2>(2),
				);
				const four = yield* await Promise.resolve(
					Annotation.note<4, Str>(4, new Str("b")),
				);
				return [two, four];
			}
			const anno = await AsyncAnnotation.go(f());
			expect(anno).to.deep.equal(Annotation.note([2, 4], new Str("b")));
		});

		it("completes and retains the log if a Value is yielded after a Note", async () => {
			async function* f(): AsyncAnnotation.Go<[2, 4], Str> {
				const two = yield* await Promise.resolve(
					Annotation.note<2, Str>(2, new Str("a")),
				);
				const four = yield* await Promise.resolve(
					Annotation.value<4>(4),
				);
				return [two, four];
			}
			const anno = await AsyncAnnotation.go(f());
			expect(anno).to.deep.equal(Annotation.note([2, 4], new Str("a")));
		});

		it("completes and combines the logs if a Note is yielded after a Note", async () => {
			async function* f(): AsyncAnnotation.Go<[2, 4], Str> {
				const two = yield* await Promise.resolve(
					Annotation.note<2, Str>(2, new Str("a")),
				);
				const four = yield* await Promise.resolve(
					Annotation.note<4, Str>(4, new Str("b")),
				);
				return [two, four];
			}
			const anno = await AsyncAnnotation.go(f());
			expect(anno).to.deep.equal(Annotation.note([2, 4], new Str("ab")));
		});

		it("unwraps promises in value channels and in return", async () => {
			async function* f(): AsyncAnnotation.Go<[2, 4], Str> {
				const two = yield* await Promise.resolve(
					Annotation.note(Promise.resolve<2>(2), new Str("a")),
				);
				const four = yield* await Promise.resolve(
					Annotation.note(Promise.resolve<4>(4), new Str("b")),
				);
				return Promise.resolve([two, four]);
			}
			const anno = await AsyncAnnotation.go(f());
			expect(anno).to.deep.equal(Annotation.note([2, 4], new Str("ab")));
		});

		it("combines logs across the try...finally block", async () => {
			async function* f(): AsyncAnnotation.Go<[2, 4], Str> {
				try {
					const two = yield* await Promise.resolve(
						Annotation.note<2, Str>(2, new Str("a")),
					);
					const four = yield* await Promise.resolve(
						Annotation.note<4, Str>(4, new Str("b")),
					);
					return [two, four];
				} finally {
					yield* await Promise.resolve(
						Annotation.note(undefined, new Str("c")),
					);
				}
			}
			const anno = await AsyncAnnotation.go(f());
			expect(anno).to.deep.equal(Annotation.note([2, 4], new Str("abc")));
		});
	});

	describe("fromGoFn", () => {
		it("evaluates the async generator function to return an AsyncAnnotation", async () => {
			async function* f(): AsyncAnnotation.Go<[2, 4], Str> {
				const two = yield* await Promise.resolve(
					Annotation.note<2, Str>(2, new Str("a")),
				);
				const four = yield* await Promise.resolve(
					Annotation.note<4, Str>(4, new Str("b")),
				);
				return [two, four];
			}
			const anno = await AsyncAnnotation.fromGoFn(f);
			expect(anno).to.deep.equal(Annotation.note([2, 4], new Str("ab")));
		});
	});

	describe("wrapGoFn", () => {
		describe("wrapGoFn", () => {
			it("adapts the async generator function to return an Annotation", async () => {
				async function* f(two: 2): AsyncAnnotation.Go<[2, 4], Str> {
					const four = yield* await Promise.resolve(
						Annotation.note<4, Str>(4, new Str("a")),
					);
					return [two, four];
				}
				const wrapped = AsyncAnnotation.wrapGoFn(f);
				const anno = await wrapped(2);
				expect(anno).to.deep.equal(
					Annotation.note([2, 4], new Str("a")),
				);
			});
		});
	});

	describe("reduce", () => {
		it("reduces the finite async iterable from left to right in the context of Annotation", async () => {
			async function* gen(): AsyncGenerator<string> {
				yield delay(50).then(() => "a");
				yield delay(10).then(() => "b");
			}
			const anno = await AsyncAnnotation.reduce(
				gen(),
				(chars, char, idx) =>
					delay(1).then(() =>
						Annotation.note(chars + char + idx, new Str(char)),
					),
				"",
			);
			expect(anno).to.deep.equal(Annotation.note("a0b1", new Str("ab")));
		});
	});

	describe("traverseInto", () => {
		it("applies the function to the elements and collects the values into a Builder", async () => {
			async function* gen(): AsyncGenerator<string> {
				yield delay(50).then(() => "a");
				yield delay(10).then(() => "b");
			}
			const builder = new TestBuilder<[number, string]>();
			const anno = await AsyncAnnotation.traverseInto(
				gen(),
				(char, idx) =>
					delay(1).then(() =>
						Annotation.note([idx, char], new Str(char)),
					),
				builder,
			);
			expect(anno).to.deep.equal(
				Annotation.note(
					[
						[0, "a"],
						[1, "b"],
					],
					new Str("ab"),
				),
			);
		});
	});

	describe("traverse", () => {
		it("applies the function to the elements and collects the values in an array", async () => {
			async function* gen(): AsyncGenerator<string> {
				yield delay(50).then(() => "a");
				yield delay(10).then(() => "b");
			}
			const anno = await AsyncAnnotation.traverse(gen(), (char, idx) =>
				delay(1).then(() =>
					Annotation.note<[number, string], Str>(
						[idx, char],
						new Str(char),
					),
				),
			);
			expect(anno).to.deep.equal(
				Annotation.note(
					[
						[0, "a"],
						[1, "b"],
					],
					new Str("ab"),
				),
			);
		});
	});

	describe("allInto", () => {
		it("collects the values into a Builder", async () => {
			async function* gen(): AsyncGenerator<Annotation<number, Str>> {
				yield delay(50).then(() => Annotation.note(2, new Str("a")));
				yield delay(10).then(() => Annotation.note(4, new Str("b")));
			}
			const builder = new TestBuilder();
			const anno = await AsyncAnnotation.allInto(gen(), builder);
			expect(anno).to.deep.equal(Annotation.note([2, 4], new Str("ab")));
		});
	});

	describe("all", () => {
		it("collects the values in an array", async () => {
			async function* gen(): AsyncGenerator<Annotation<number, Str>> {
				yield delay(50).then(() => Annotation.note(2, new Str("a")));
				yield delay(10).then(() => Annotation.note(4, new Str("b")));
			}
			const anno = await AsyncAnnotation.all(gen());
			expect(anno).to.deep.equal(Annotation.note([2, 4], new Str("ab")));
		});
	});

	describe("forEach", () => {
		it("applies the function to the elements", async () => {
			async function* gen(): AsyncGenerator<string> {
				yield delay(50).then(() => "a");
				yield delay(10).then(() => "b");
			}
			const results: [number, string][] = [];
			const anno = await AsyncAnnotation.forEach(gen(), (char, idx) =>
				delay(1).then(() => {
					results.push([idx, char]);
					return Annotation.write(new Str(char));
				}),
			);
			expect(anno).to.deep.equal(
				Annotation.note(undefined, new Str("ab")),
			);
			expect(results).to.deep.equal([
				[0, "a"],
				[1, "b"],
			]);
		});
	});

	describe("traverseIntoPar", () => {
		it("applies the function to the elements and collects the values into a Builder", async () => {
			const builder = new TestBuilder<[number, string]>();
			const anno = await AsyncAnnotation.traverseIntoPar(
				["a", "b"],
				(char, idx) =>
					delay(char === "a" ? 50 : 10).then(() =>
						Annotation.value([idx, char]),
					),
				builder,
			);
			expect(anno).to.deep.equal(
				Annotation.value([
					[1, "b"],
					[0, "a"],
				]),
			);
		});

		it("retains the log if a Note resolves after a Value", async () => {
			const builder = new TestBuilder<[number, string]>();
			const anno = await AsyncAnnotation.traverseIntoPar(
				["a", "b"],
				(char, idx) =>
					delay(char === "a" ? 50 : 10).then(() =>
						char === "a"
							? Annotation.note([idx, char], new Str(char))
							: Annotation.value([idx, char]),
					),
				builder,
			);
			expect(anno).to.deep.equal(
				Annotation.note(
					[
						[1, "b"],
						[0, "a"],
					],
					new Str("a"),
				),
			);
		});

		it("retains the log if a Value resolves after a Note", async () => {
			const builder = new TestBuilder<[number, string]>();
			const anno = await AsyncAnnotation.traverseIntoPar(
				["a", "b"],
				(char, idx) =>
					delay(char === "a" ? 50 : 10).then(() =>
						char === "a"
							? Annotation.value([idx, char])
							: Annotation.note([idx, char], new Str(char)),
					),
				builder,
			);
			expect(anno).to.deep.equal(
				Annotation.note(
					[
						[1, "b"],
						[0, "a"],
					],
					new Str("b"),
				),
			);
		});

		it("combines the logs if a Note resolves after a Note", async () => {
			const builder = new TestBuilder<[number, string]>();
			const anno = await AsyncAnnotation.traverseIntoPar(
				["a", "b"],
				(char, idx) =>
					delay(char === "a" ? 50 : 10).then(() =>
						Annotation.note([idx, char], new Str(char)),
					),
				builder,
			);
			expect(anno).to.deep.equal(
				Annotation.note(
					[
						[1, "b"],
						[0, "a"],
					],
					new Str("ba"),
				),
			);
		});
	});

	describe("traversePar", () => {
		it("applies the function to the elements and collects the values in an array", async () => {
			const anno = await AsyncAnnotation.traversePar(
				["a", "b"],
				(char, idx) =>
					delay(char === "a" ? 50 : 10).then(() =>
						Annotation.note([idx, char], new Str(char)),
					),
			);
			expect(anno).to.deep.equal(
				Annotation.note(
					[
						[0, "a"],
						[1, "b"],
					],
					new Str("ba"),
				),
			);
		});
	});

	describe("allIntoPar", () => {
		it("collects the values into a Builder", async () => {
			const builder = new TestBuilder<number>();
			const anno = await AsyncAnnotation.allIntoPar(
				[
					delay(50).then(() => Annotation.note(2, new Str("a"))),
					delay(10).then(() => Annotation.note(4, new Str("b"))),
				],
				builder,
			);
			expect(anno).to.deep.equal(Annotation.note([4, 2], new Str("ba")));
		});
	});

	describe("allPar", () => {
		it("collects the values in an array", async () => {
			const anno = await AsyncAnnotation.allPar([
				delay(50).then<Annotation<2, Str>>(() =>
					Annotation.note(2, new Str("a")),
				),
				delay(10).then<Annotation<4, Str>>(() =>
					Annotation.note(4, new Str("b")),
				),
			]);
			expect(anno).to.deep.equal(Annotation.note([2, 4], new Str("ba")));
		});
	});

	describe("allPropsPar", () => {
		it("collects the values in an object", async () => {
			const anno = await AsyncAnnotation.allPropsPar({
				two: delay(50).then<Annotation<2, Str>>(() =>
					Annotation.note(2, new Str("a")),
				),
				four: delay(10).then<Annotation<4, Str>>(() =>
					Annotation.note(4, new Str("b")),
				),
			});
			expect(anno).to.deep.equal(
				Annotation.note({ two: 2, four: 4 }, new Str("ba")),
			);
		});
	});

	describe("forEachPar", () => {
		it("applies the function to the elements", async () => {
			const results: [number, string][] = [];
			const anno = await AsyncAnnotation.forEachPar(
				["a", "b"],
				(char, idx) =>
					delay(char === "a" ? 50 : 10).then(() => {
						results.push([idx, char]);
						return Annotation.write(new Str(char));
					}),
			);
			expect(anno).to.deep.equal(
				Annotation.note(undefined, new Str("ba")),
			);
			expect(results).to.deep.equal([
				[1, "b"],
				[0, "a"],
			]);
		});
	});

	describe("liftPar", () => {
		it("applies the function to the values", async () => {
			async function f<A, B>(lhs: A, rhs: B): Promise<[A, B]> {
				return [lhs, rhs];
			}
			const anno = await AsyncAnnotation.liftPar(f<2, 4>)(
				delay(50).then(() => Annotation.note(2, new Str("a"))),
				delay(10).then(() => Annotation.note(4, new Str("b"))),
			);
			expect(anno).to.deep.equal(Annotation.note([2, 4], new Str("ba")));
		});
	});
});
