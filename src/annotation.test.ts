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

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
	Str,
	TestBuilder,
	arbNum,
	arbStr,
	delay,
	expectLawfulEq,
	expectLawfulOrd,
	expectLawfulSemigroup,
} from "./_test/utils.js";
import { Annotation, AsyncAnnotation } from "./annotation.js";
import { cmb } from "./cmb.js";
import { Ordering, cmp, eq } from "./cmp.js";

describe("Annotation", () => {
	function arbAnnotation<T, N>(
		arbVal: fc.Arbitrary<T>,
		arbLog: fc.Arbitrary<N>,
	): fc.Arbitrary<Annotation<T, N>> {
		return fc.oneof(
			arbVal.map(Annotation.value),
			arbVal.chain((val) =>
				arbLog.map((log) => Annotation.note(val, log)),
			),
		);
	}

	describe("value", () => {
		it("constructs a Value variant", () => {
			const anno = Annotation.value<2>(2);
			expect(anno).to.be.an.instanceOf(Annotation.Value);
			expect(anno.kind).to.equal(Annotation.Kind.VALUE);
			expect(anno.val).to.equal(2);
		});
	});

	describe("note", () => {
		it("constructs a Note variant", () => {
			const anno = Annotation.note<2, 1>(2, 1);
			expect(anno).to.be.an.instanceOf(Annotation.Note);
			expect(anno.kind).to.equal(Annotation.Kind.NOTE);
			expect(anno.val).to.equal(2);
			expect((anno as Annotation.Note<2, 1>).log).to.equal(1);
		});
	});

	describe("write", () => {
		it("writes to the log and returns no value", () => {
			const anno = Annotation.write<1>(1);
			expect(anno).to.deep.equal(Annotation.note(undefined, 1));
		});
	});

	describe("go", () => {
		it("completes if all yielded values are Value", () => {
			function* f(): Annotation.Go<[2, 4], never> {
				const two = yield* Annotation.value<2>(2);
				const four = yield* Annotation.value<4>(4);
				return [two, four];
			}
			const anno = Annotation.go(f());
			expect(anno).to.deep.equal(Annotation.value([2, 4]));
		});

		it("completes and retains the log if a Note is yielded after a Value", () => {
			function* f(): Annotation.Go<[2, 4], Str> {
				const two = yield* Annotation.value<2>(2);
				const four = yield* Annotation.note<4, Str>(4, new Str("b"));
				return [two, four];
			}
			const anno = Annotation.go(f());
			expect(anno).to.deep.equal(Annotation.note([2, 4], new Str("b")));
		});

		it("completes and retains the log if a Value is yielded after a Note", () => {
			function* f(): Annotation.Go<[2, 4], Str> {
				const two = yield* Annotation.note<2, Str>(2, new Str("a"));
				const four = yield* Annotation.value<4>(4);
				return [two, four];
			}
			const anno = Annotation.go(f());
			expect(anno).to.deep.equal(Annotation.note([2, 4], new Str("a")));
		});

		it("completes and combines the logs if a Note is yielded after a Note", () => {
			function* f(): Annotation.Go<[2, 4], Str> {
				const two = yield* Annotation.note<2, Str>(2, new Str("a"));
				const four = yield* Annotation.note<4, Str>(4, new Str("b"));
				return [two, four];
			}
			const anno = Annotation.go(f());
			expect(anno).to.deep.equal(Annotation.note([2, 4], new Str("ab")));
		});

		it("combines logs across the try...finally block", () => {
			function* f(): Annotation.Go<[2, 4], Str> {
				try {
					const two = yield* Annotation.note<2, Str>(2, new Str("a"));
					const four = yield* Annotation.note<4, Str>(
						4,
						new Str("b"),
					);
					return [two, four];
				} finally {
					yield* Annotation.note(undefined, new Str("c"));
				}
			}
			const anno = Annotation.go(f());
			expect(anno).to.deep.equal(Annotation.note([2, 4], new Str("abc")));
		});
	});

	describe("wrapGoFn", () => {
		it("adapts the generator function to return an Annotation", () => {
			function* f(two: 2): Annotation.Go<[2, 4], Str> {
				const four = yield* Annotation.note<4, Str>(4, new Str("a"));
				return [two, four];
			}
			const wrapped = Annotation.wrapGoFn(f);
			const anno = wrapped(2);
			expect(anno).to.deep.equal(Annotation.note([2, 4], new Str("a")));
		});
	});

	describe("reduce", () => {
		it("reduces the finite iterable from left to right in the context of Annotation", () => {
			const anno = Annotation.reduce(
				["a", "b"],
				(chars, char, idx) =>
					Annotation.note(chars + char + idx, new Str(char)),
				"",
			);
			expect(anno).to.deep.equal(Annotation.note("a0b1", new Str("ab")));
		});
	});

	describe("traverseInto", () => {
		it("applies the function to the elements and collects the values into the builder", () => {
			const builder = new TestBuilder<[number, string]>();
			const anno = Annotation.traverseInto(
				["a", "b"],
				(char, idx) => Annotation.note([idx, char], new Str(char)),
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
		it("applies the function to the elements and collects the values in an array", () => {
			const anno = Annotation.traverse(["a", "b"], (char, idx) =>
				Annotation.note<[number, string], Str>(
					[idx, char],
					new Str(char),
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
		it("collects the values into the Builder", () => {
			const builder = new TestBuilder<number>();
			const anno = Annotation.allInto(
				[
					Annotation.note<2, Str>(2, new Str("a")),
					Annotation.note<4, Str>(4, new Str("b")),
				],
				builder,
			);
			expect(anno).to.deep.equal(Annotation.note([2, 4], new Str("ab")));
		});
	});

	describe("all", () => {
		it("collects the values into an array", () => {
			const anno = Annotation.all([
				Annotation.note<2, Str>(2, new Str("a")),
				Annotation.note<4, Str>(4, new Str("b")),
			]);
			expect(anno).to.deep.equal(Annotation.note([2, 4], new Str("ab")));
		});
	});

	describe("allProps", () => {
		it("collects the values in an object", () => {
			const anno = Annotation.allProps({
				two: Annotation.note<2, Str>(2, new Str("a")),
				four: Annotation.note<4, Str>(4, new Str("b")),
			});
			expect(anno).to.deep.equal(
				Annotation.note({ two: 2, four: 4 }, new Str("ab")),
			);
		});
	});

	describe("forEach", () => {
		it("applies the function to the elements", () => {
			const results: [number, string][] = [];
			const anno = Annotation.forEach(["a", "b"], (char, idx) => {
				results.push([idx, char]);
				return Annotation.note(undefined, new Str(char));
			});
			expect(anno).to.deep.equal(
				Annotation.note(undefined, new Str("ab")),
			);
		});
	});

	describe("lift", () => {
		it("applies the function to the values", () => {
			function f<A, B>(lhs: A, rhs: B): [A, B] {
				return [lhs, rhs];
			}
			const anno = Annotation.lift(f<2, 4>)(
				Annotation.note(2, new Str("a")),
				Annotation.note(4, new Str("b")),
			);
			expect(anno).to.deep.equal(Annotation.note([2, 4], new Str("ab")));
		});
	});

	describe("#[Eq.eq]", () => {
		it("compares the values if both variants are Value", () => {
			const property = fc.property(arbNum(), arbNum(), (val0, val1) => {
				expect(
					eq(Annotation.value(val0), Annotation.value(val1)),
				).to.equal(eq(val0, val1));
			});
			fc.assert(property);
		});

		it("compares any Value and any Note as unequal", () => {
			const property = fc.property(
				arbNum(),
				arbNum(),
				arbNum(),
				(val0, val1, log1) => {
					expect(
						eq(Annotation.value(val0), Annotation.note(val1, log1)),
					).to.be.false;
				},
			);
			fc.assert(property);
		});

		it("compares any Note and any Value as unequal", () => {
			const property = fc.property(
				arbNum(),
				arbNum(),
				arbNum(),
				(val0, log0, val1) => {
					expect(
						eq(Annotation.note(val0, log0), Annotation.value(val1)),
					).to.be.false;
				},
			);
			fc.assert(property);
		});

		it("compares the values and logs lexicographically if both variants are Note", () => {
			const property = fc.property(
				arbNum(),
				arbNum(),
				arbNum(),
				arbNum(),
				(val0, log0, val1, log1) => {
					expect(
						eq(
							Annotation.note(val0, log0),
							Annotation.note(val1, log1),
						),
					).to.equal(eq(val0, val1) && eq(log0, log1));
				},
			);
			fc.assert(property);
		});

		it("implements a lawful equivalence relation", () => {
			expectLawfulEq(arbAnnotation(arbNum(), arbNum()));
		});
	});

	describe("#[Ord.cmp]", () => {
		it("compares the values if both variants are Value", () => {
			const property = fc.property(arbNum(), arbNum(), (val0, val1) => {
				expect(
					cmp(Annotation.value(val0), Annotation.value(val1)),
				).to.equal(cmp(val0, val1));
			});
			fc.assert(property);
		});

		it("compares any Value as less than any Note", () => {
			const property = fc.property(
				arbNum(),
				arbNum(),
				arbNum(),
				(val0, val1, log1) => {
					expect(
						cmp(
							Annotation.value(val0),
							Annotation.note(val1, log1),
						),
					).to.equal(Ordering.less);
				},
			);
			fc.assert(property);
		});

		it("compares any Note as greater than any Value", () => {
			const property = fc.property(
				arbNum(),
				arbNum(),
				arbNum(),
				(val0, log0, val1) => {
					expect(
						cmp(
							Annotation.note(val0, log0),
							Annotation.value(val1),
						),
					).to.equal(Ordering.greater);
				},
			);
			fc.assert(property);
		});

		it("compares the values and logs lexicographically if both variants are Note", () => {
			const property = fc.property(
				arbNum(),
				arbNum(),
				arbNum(),
				arbNum(),
				(val0, log0, val1, log1) => {
					expect(
						cmp(
							Annotation.note(val0, log0),
							Annotation.note(val1, log1),
						),
					).to.equal(cmb(cmp(val0, val1), cmp(log0, log1)));
				},
			);
			fc.assert(property);
		});

		it("implements a lawful total order", () => {
			expectLawfulOrd(arbAnnotation(arbNum(), arbNum()));
		});
	});

	describe("#[Semigroup.cmb]", () => {
		it("combines the values and the logs", () => {
			const property = fc.property(
				arbStr(),
				arbStr(),
				arbStr(),
				arbStr(),
				(val0, log0, val1, log1) => {
					expect(
						cmb(
							Annotation.note(val0, log0),
							Annotation.note(val1, log1),
						),
					).to.deep.equal(
						Annotation.note(cmb(val0, val1), cmb(log0, log1)),
					);
				},
			);
			fc.assert(property);
		});

		it("implements a lawful semigroup", () => {
			expectLawfulSemigroup(arbAnnotation(arbStr(), arbStr()));
		});
	});

	describe("#isValue", () => {
		it("returns true if the variant is Value", () => {
			expect(Annotation.value<2, 1>(2).isValue()).to.be.true;
		});

		it("returns false if the variant is Note", () => {
			expect(Annotation.note<2, 1>(2, 1).isValue()).to.be.false;
		});
	});

	describe("#isNote", () => {
		it("returns false if the variant is Value", () => {
			expect(Annotation.value<2, 1>(2).isNote()).to.be.false;
		});

		it("returns true if the variant is Note", () => {
			expect(Annotation.note<2, 1>(2, 1).isNote()).to.be.true;
		});
	});

	describe("#match", () => {
		it("applies the first function to the value if the variant is Value", () => {
			const result = Annotation.value<2, 1>(2).match(
				(two): [2, 4] => [two, 4],
				(two, one): [2, 1] => [two, one],
			);
			expect(result).to.deep.equal([2, 4]);
		});

		it("applies the second function to the value and the log if the variant is Note", () => {
			const result = Annotation.note<2, 1>(2, 1).match(
				(two): [2, 4] => [two, 4],
				(two, one): [2, 1] => [two, one],
			);
			expect(result).to.deep.equal([2, 1]);
		});
	});

	describe("#andThen", () => {
		it("applies the continuation to the value if the variant is Value", () => {
			const anno = Annotation.value<2, Str>(2).andThen(
				(two): Annotation<[2, 4], Str> => Annotation.value([two, 4]),
			);
			expect(anno).to.deep.equal(Annotation.value([2, 4]));
		});

		it("retains the log if the continuation on a Value returns a Note", () => {
			const anno = Annotation.value<2, Str>(2).andThen(
				(two): Annotation<[2, 4], Str> =>
					Annotation.note([two, 4], new Str("b")),
			);
			expect(anno).to.deep.equal(Annotation.note([2, 4], new Str("b")));
		});

		it("retains the log if the continuation on a Note returns a value", () => {
			const anno = Annotation.note<2, Str>(2, new Str("a")).andThen(
				(two): Annotation<[2, 4], Str> => Annotation.value([two, 4]),
			);
			expect(anno).to.deep.equal(Annotation.note([2, 4], new Str("a")));
		});

		it("combines the logs if the continuation on a Note returns a Note", () => {
			const anno = Annotation.note<2, Str>(2, new Str("a")).andThen(
				(two): Annotation<[2, 4], Str> =>
					Annotation.note([two, 4], new Str("b")),
			);
			expect(anno).to.deep.equal(Annotation.note([2, 4], new Str("ab")));
		});
	});

	describe("#andThenGo", () => {
		it("combines the logs if the continuation on a Note returns a Note", () => {
			const anno = Annotation.note<2, Str>(2, new Str("a")).andThenGo(
				function* (two): Annotation.Go<[2, 4], Str> {
					const four = yield* Annotation.note<4, Str>(
						4,
						new Str("b"),
					);
					return [two, four];
				},
			);
			expect(anno).to.deep.equal(Annotation.note([2, 4], new Str("ab")));
		});
	});

	describe("#flatten", () => {
		it("removes one level of nesting", () => {
			const anno = Annotation.note<Annotation<2, Str>, Str>(
				Annotation.note(2, new Str("b")),
				new Str("a"),
			).flatten();
			expect(anno).to.deep.equal(Annotation.note(2, new Str("ab")));
		});
	});

	describe("#and", () => {
		it("keeps only the second value", () => {
			const anno = Annotation.note<2, Str>(2, new Str("a")).and(
				Annotation.note<4, Str>(4, new Str("b")),
			);
			expect(anno).to.deep.equal(Annotation.note(4, new Str("ab")));
		});
	});

	describe("#zipWith", () => {
		it("applies the function to the values", () => {
			const anno = Annotation.note<2, Str>(2, new Str("a")).zipWith(
				Annotation.note<4, Str>(4, new Str("b")),
				(two, four): [2, 4] => [two, four],
			);
			expect(anno).to.deep.equal(Annotation.note([2, 4], new Str("ab")));
		});
	});

	describe("#map", () => {
		it("applies the function to the value if the variant is Value", () => {
			const anno = Annotation.value<2, 1>(2).map((two): [2, 4] => [
				two,
				4,
			]);
			expect(anno).to.deep.equal(Annotation.value([2, 4]));
		});

		it("applies the function to the value and retains the log if the variant is Note", () => {
			const anno = Annotation.note<2, 1>(2, 1).map((two): [2, 4] => [
				two,
				4,
			]);
			expect(anno).to.deep.equal(Annotation.note([2, 4], 1));
		});
	});

	describe("#mapLog", () => {
		it("does not apply the function if the variant is Value", () => {
			const anno = Annotation.value<2, 1>(2).mapLog((one): [1, 3] => [
				one,
				3,
			]);
			expect(anno).to.deep.equal(Annotation.value(2));
		});

		it("applies the function to the log if the variant is Note", () => {
			const anno = Annotation.note<2, 1>(2, 1).mapLog((one): [1, 3] => [
				one,
				3,
			]);
			expect(anno).to.deep.equal(Annotation.note(2, [1, 3]));
		});
	});

	describe("#notateWith", () => {
		it("applies the function to the value and writes the result to the log", () => {
			const anno = Annotation.note<2, Str>(2, new Str("a")).notateWith(
				(two) => new Str(two.toString()),
			);
			expect(anno).to.deep.equal(Annotation.note(2, new Str("a2")));
		});
	});

	describe("#notate", () => {
		it("writes to the log", () => {
			const anno = Annotation.note<2, Str>(2, new Str("a")).notate(
				new Str("b"),
			);
			expect(anno).to.deep.equal(Annotation.note(2, new Str("ab")));
		});
	});

	describe("#eraseLog", () => {
		it("does nothing if the variant is Value", () => {
			const anno = Annotation.value<2, 1>(2).eraseLog();
			expect(anno).to.deep.equal(Annotation.value(2));
		});

		it("deletes the log and changes the Note to a Value if the variant is Note", () => {
			const anno = Annotation.note<2, 1>(2, 1).eraseLog();
			expect(anno).to.deep.equal(Annotation.value(2));
		});
	});
});

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
