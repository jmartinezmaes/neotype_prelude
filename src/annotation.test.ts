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
import {
	Str,
	TestBuilder,
	arbNum,
	arbStr,
	expectLawfulEq,
	expectLawfulOrd,
	expectLawfulSemigroup,
} from "./_test/utils.js";
import { Annotation } from "./annotation.js";
import { type Semigroup, cmb } from "./cmb.js";
import { Ordering, cmp, eq } from "./cmp.js";

describe("Annotation", () => {
	function arbAnnotation<T, N>(
		arbVal: Fc.Arbitrary<T>,
		arbLog: Fc.Arbitrary<N>,
	): Fc.Arbitrary<Annotation<T, N>> {
		return Fc.oneof(
			arbVal.map(Annotation.value),
			arbVal.chain((val) =>
				arbLog.map((log) => Annotation.note(val, log)),
			),
		);
	}

	describe("value", () => {
		it("constructs a Value variant", () => {
			const anno = Annotation.value<2, 1>(2);

			expectTypeOf(anno).toEqualTypeOf<Annotation<2, 1>>();
			expectTypeOf(anno.kind).toEqualTypeOf<Annotation.Kind>();
			expectTypeOf(anno.val).toEqualTypeOf<2>();

			expect(anno).to.be.an.instanceOf(Annotation.Value);
			expect(anno.kind).to.equal(Annotation.Kind.VALUE);
			expect(anno.val).to.equal(2);
		});
	});

	describe("unit", () => {
		it("contructs a Value variant with an undefined value", () => {
			const anno = Annotation.unit<1>();
			expectTypeOf(anno).toEqualTypeOf<Annotation<void, 1>>();
			expect(anno).to.deep.equal(Annotation.value(undefined));
		});
	});

	describe("note", () => {
		it("constructs a Note variant", () => {
			const anno = Annotation.note<2, 1>(2, 1);

			expectTypeOf(anno).toEqualTypeOf<Annotation<2, 1>>();
			expectTypeOf(anno.kind).toEqualTypeOf<Annotation.Kind>();
			expectTypeOf(anno.val).toEqualTypeOf<2>();
			expectTypeOf(
				(anno as Annotation.Note<2, 1>).log,
			).toEqualTypeOf<1>();

			expect(anno).to.be.an.instanceOf(Annotation.Note);
			expect(anno.kind).to.equal(Annotation.Kind.NOTE);
			expect(anno.val).to.equal(2);
			expect((anno as Annotation.Note<2, 1>).log).to.equal(1);
		});
	});

	describe("write", () => {
		it("writes to the log and returns no value", () => {
			const anno = Annotation.write<1>(1);
			expectTypeOf(anno).toEqualTypeOf<Annotation<void, 1>>();
			expect(anno).to.deep.equal(Annotation.note(undefined, 1));
		});
	});

	describe("go", () => {
		it("completes if all yielded values are Value", () => {
			function* f(): Annotation.Go<[2, 4], Str> {
				const two = yield* Annotation.value<2>(2);
				const four = yield* Annotation.value<4>(4);
				return [two, four];
			}
			const anno = Annotation.go(f());
			expectTypeOf(anno).toEqualTypeOf<Annotation<[2, 4], Str>>();
			expect(anno).to.deep.equal(Annotation.value([2, 4]));
		});

		it("completes and retains the log if a Note is yielded after a Value", () => {
			function* f(): Annotation.Go<[2, 4], Str> {
				const two = yield* Annotation.value<2>(2);
				const four = yield* Annotation.note<4, Str>(4, new Str("b"));
				return [two, four];
			}
			const anno = Annotation.go(f());
			expectTypeOf(anno).toEqualTypeOf<Annotation<[2, 4], Str>>();
			expect(anno).to.deep.equal(Annotation.note([2, 4], new Str("b")));
		});

		it("completes and retains the log if a Value is yielded after a Note", () => {
			function* f(): Annotation.Go<[2, 4], Str> {
				const two = yield* Annotation.note<2, Str>(2, new Str("a"));
				const four = yield* Annotation.value<4>(4);
				return [two, four];
			}
			const anno = Annotation.go(f());
			expectTypeOf(anno).toEqualTypeOf<Annotation<[2, 4], Str>>();
			expect(anno).to.deep.equal(Annotation.note([2, 4], new Str("a")));
		});

		it("completes and combines the logs if a Note is yielded after a Note", () => {
			function* f(): Annotation.Go<[2, 4], Str> {
				const two = yield* Annotation.note<2, Str>(2, new Str("a"));
				const four = yield* Annotation.note<4, Str>(4, new Str("b"));
				return [two, four];
			}
			const anno = Annotation.go(f());
			expectTypeOf(anno).toEqualTypeOf<Annotation<[2, 4], Str>>();
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
			expectTypeOf(anno).toEqualTypeOf<Annotation<[2, 4], Str>>();
			expect(anno).to.deep.equal(Annotation.note([2, 4], new Str("abc")));
		});
	});

	describe("fromGoFn", () => {
		it("evaluates the generator function to return an Annotation", () => {
			function* f(): Annotation.Go<[2, 4], Str> {
				const two = yield* Annotation.note<2, Str>(2, new Str("a"));
				const four = yield* Annotation.note<4, Str>(4, new Str("b"));
				return [two, four];
			}
			const anno = Annotation.fromGoFn(f);
			expectTypeOf(anno).toEqualTypeOf<Annotation<[2, 4], Str>>();
			expect(anno).to.deep.equal(Annotation.note([2, 4], new Str("ab")));
		});
	});

	describe("wrapGoFn", () => {
		it("adapts the generator function to return an Annotation", () => {
			function* f(two: 2): Annotation.Go<[2, 4], Str> {
				const four = yield* Annotation.note<4, Str>(4, new Str("a"));
				return [two, four];
			}
			const wrapped = Annotation.wrapGoFn(f);
			expectTypeOf(wrapped).toEqualTypeOf<
				(two: 2) => Annotation<[2, 4], Str>
			>();

			const anno = wrapped(2);
			expectTypeOf(anno).toEqualTypeOf<Annotation<[2, 4], Str>>();
			expect(anno).to.deep.equal(Annotation.note([2, 4], new Str("a")));
		});
	});

	describe("reduce", () => {
		it("reduces the finite iterable from left to right in the context of Annotation", () => {
			const anno = Annotation.reduce(
				["a", "b"],
				(chars, char, idx) =>
					Annotation.note(
						chars + char + idx.toString(),
						new Str(char),
					),
				"",
			);
			expectTypeOf(anno).toEqualTypeOf<Annotation<string, Str>>();
			expect(anno).to.deep.equal(Annotation.note("a0b1", new Str("ab")));
		});
	});

	describe("traverseInto", () => {
		it("applies the function to the elements and collects the values into the builder", () => {
			const builder = new TestBuilder<[number, string]>();
			const anno = Annotation.traverseInto(
				["a", "b"],
				(char, idx): Annotation<[number, string], Str> =>
					Annotation.note([idx, char], new Str(char)),
				builder,
			);
			expectTypeOf(anno).toEqualTypeOf<
				Annotation<[number, string][], Str>
			>();
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
			const anno = Annotation.traverse(
				["a", "b"],
				(char, idx): Annotation<[number, string], Str> =>
					Annotation.note([idx, char], new Str(char)),
			);
			expectTypeOf(anno).toEqualTypeOf<
				Annotation<[number, string][], Str>
			>();
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
			expectTypeOf(anno).toEqualTypeOf<Annotation<number[], Str>>();
			expect(anno).to.deep.equal(Annotation.note([2, 4], new Str("ab")));
		});
	});

	describe("all", () => {
		it("collects the values into an array", () => {
			const anno = Annotation.all([
				Annotation.note<2, Str>(2, new Str("a")),
				Annotation.note<4, Str>(4, new Str("b")),
			]);
			expectTypeOf(anno).toEqualTypeOf<Annotation<[2, 4], Str>>();
			expect(anno).to.deep.equal(Annotation.note([2, 4], new Str("ab")));
		});
	});

	describe("allProps", () => {
		it("collects the values in an object", () => {
			const anno = Annotation.allProps({
				two: Annotation.note<2, Str>(2, new Str("a")),
				four: Annotation.note<4, Str>(4, new Str("b")),
			});
			expectTypeOf(anno).toEqualTypeOf<
				Annotation<{ two: 2; four: 4 }, Str>
			>();
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
			expectTypeOf(anno).toEqualTypeOf<Annotation<void, Str>>();
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
			const lifted = Annotation.lift(f<2, 4>);
			expectTypeOf(lifted).toEqualTypeOf<
				<W extends Semigroup<W>>(
					lhs: Annotation<2, W>,
					rhs: Annotation<4, W>,
				) => Annotation<[2, 4], W>
			>();

			const anno = lifted(
				Annotation.note(2, new Str("a")),
				Annotation.note(4, new Str("b")),
			);
			expectTypeOf(anno).toEqualTypeOf<Annotation<[2, 4], Str>>();
			expect(anno).to.deep.equal(Annotation.note([2, 4], new Str("ab")));
		});
	});

	describe("#[Eq.eq]", () => {
		it("compares the values if both variants are Value", () => {
			const property = Fc.property(arbNum(), arbNum(), (val0, val1) => {
				expect(
					eq(Annotation.value(val0), Annotation.value(val1)),
				).to.equal(eq(val0, val1));
			});
			Fc.assert(property);
		});

		it("compares any Value and any Note as unequal", () => {
			const property = Fc.property(
				arbNum(),
				arbNum(),
				arbNum(),
				(val0, val1, log1) => {
					expect(
						eq(Annotation.value(val0), Annotation.note(val1, log1)),
					).to.be.false;
				},
			);
			Fc.assert(property);
		});

		it("compares any Note and any Value as unequal", () => {
			const property = Fc.property(
				arbNum(),
				arbNum(),
				arbNum(),
				(val0, log0, val1) => {
					expect(
						eq(Annotation.note(val0, log0), Annotation.value(val1)),
					).to.be.false;
				},
			);
			Fc.assert(property);
		});

		it("compares the values and logs lexicographically if both variants are Note", () => {
			const property = Fc.property(
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
			Fc.assert(property);
		});

		it("implements a lawful equivalence relation", () => {
			expectLawfulEq(arbAnnotation(arbNum(), arbNum()));
		});
	});

	describe("#[Ord.cmp]", () => {
		it("compares the values if both variants are Value", () => {
			const property = Fc.property(arbNum(), arbNum(), (val0, val1) => {
				expect(
					cmp(Annotation.value(val0), Annotation.value(val1)),
				).to.equal(cmp(val0, val1));
			});
			Fc.assert(property);
		});

		it("compares any Value as less than any Note", () => {
			const property = Fc.property(
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
			Fc.assert(property);
		});

		it("compares any Note as greater than any Value", () => {
			const property = Fc.property(
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
			Fc.assert(property);
		});

		it("compares the values and logs lexicographically if both variants are Note", () => {
			const property = Fc.property(
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
			Fc.assert(property);
		});

		it("implements a lawful total order", () => {
			expectLawfulOrd(arbAnnotation(arbNum(), arbNum()));
		});
	});

	describe("#[Semigroup.cmb]", () => {
		it("combines the values and the logs", () => {
			const property = Fc.property(
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
			Fc.assert(property);
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
			expectTypeOf(result).toEqualTypeOf<[2, 4] | [2, 1]>();
			expect(result).to.deep.equal([2, 4]);
		});

		it("applies the second function to the value and the log if the variant is Note", () => {
			const result = Annotation.note<2, 1>(2, 1).match(
				(two): [2, 4] => [two, 4],
				(two, one): [2, 1] => [two, one],
			);
			expectTypeOf(result).toEqualTypeOf<[2, 4] | [2, 1]>();
			expect(result).to.deep.equal([2, 1]);
		});
	});

	describe("#andThen", () => {
		it("applies the continuation to the value if the variant is Value", () => {
			const anno = Annotation.value<2, Str>(2).andThen(
				(two): Annotation<[2, 4], Str> => Annotation.value([two, 4]),
			);
			expectTypeOf(anno).toEqualTypeOf<Annotation<[2, 4], Str>>();
			expect(anno).to.deep.equal(Annotation.value([2, 4]));
		});

		it("retains the log if the continuation on a Value returns a Note", () => {
			const anno = Annotation.value<2, Str>(2).andThen(
				(two): Annotation<[2, 4], Str> =>
					Annotation.note([two, 4], new Str("b")),
			);
			expectTypeOf(anno).toEqualTypeOf<Annotation<[2, 4], Str>>();
			expect(anno).to.deep.equal(Annotation.note([2, 4], new Str("b")));
		});

		it("retains the log if the continuation on a Note returns a value", () => {
			const anno = Annotation.note<2, Str>(2, new Str("a")).andThen(
				(two): Annotation<[2, 4], Str> => Annotation.value([two, 4]),
			);
			expectTypeOf(anno).toEqualTypeOf<Annotation<[2, 4], Str>>();
			expect(anno).to.deep.equal(Annotation.note([2, 4], new Str("a")));
		});

		it("combines the logs if the continuation on a Note returns a Note", () => {
			const anno = Annotation.note<2, Str>(2, new Str("a")).andThen(
				(two): Annotation<[2, 4], Str> =>
					Annotation.note([two, 4], new Str("b")),
			);
			expectTypeOf(anno).toEqualTypeOf<Annotation<[2, 4], Str>>();
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
			expectTypeOf(anno).toEqualTypeOf<Annotation<[2, 4], Str>>();
			expect(anno).to.deep.equal(Annotation.note([2, 4], new Str("ab")));
		});
	});

	describe("#flatten", () => {
		it("removes one level of nesting", () => {
			const anno = Annotation.note<Annotation<2, Str>, Str>(
				Annotation.note(2, new Str("b")),
				new Str("a"),
			).flatten();
			expectTypeOf(anno).toEqualTypeOf<Annotation<2, Str>>();
			expect(anno).to.deep.equal(Annotation.note(2, new Str("ab")));
		});
	});

	describe("#and", () => {
		it("keeps only the second value", () => {
			const anno = Annotation.note<2, Str>(2, new Str("a")).and(
				Annotation.note<4, Str>(4, new Str("b")),
			);
			expectTypeOf(anno).toEqualTypeOf<Annotation<4, Str>>();
			expect(anno).to.deep.equal(Annotation.note(4, new Str("ab")));
		});
	});

	describe("#zipWith", () => {
		it("applies the function to the values", () => {
			const anno = Annotation.note<2, Str>(2, new Str("a")).zipWith(
				Annotation.note<4, Str>(4, new Str("b")),
				(two, four): [2, 4] => [two, four],
			);
			expectTypeOf(anno).toEqualTypeOf<Annotation<[2, 4], Str>>();
			expect(anno).to.deep.equal(Annotation.note([2, 4], new Str("ab")));
		});
	});

	describe("#map", () => {
		it("applies the function to the value if the variant is Value", () => {
			const anno = Annotation.value<2, 1>(2).map((two): [2, 4] => [
				two,
				4,
			]);
			expectTypeOf(anno).toEqualTypeOf<Annotation<[2, 4], 1>>();
			expect(anno).to.deep.equal(Annotation.value([2, 4]));
		});

		it("applies the function to the value and retains the log if the variant is Note", () => {
			const anno = Annotation.note<2, 1>(2, 1).map((two): [2, 4] => [
				two,
				4,
			]);
			expectTypeOf(anno).toEqualTypeOf<Annotation<[2, 4], 1>>();
			expect(anno).to.deep.equal(Annotation.note([2, 4], 1));
		});
	});

	describe("#mapLog", () => {
		it("does not apply the function if the variant is Value", () => {
			const anno = Annotation.value<2, 1>(2).mapLog((one): [1, 3] => [
				one,
				3,
			]);
			expectTypeOf(anno).toEqualTypeOf<Annotation<2, [1, 3]>>();
			expect(anno).to.deep.equal(Annotation.value(2));
		});

		it("applies the function to the log if the variant is Note", () => {
			const anno = Annotation.note<2, 1>(2, 1).mapLog((one): [1, 3] => [
				one,
				3,
			]);
			expectTypeOf(anno).toEqualTypeOf<Annotation<2, [1, 3]>>();
			expect(anno).to.deep.equal(Annotation.note(2, [1, 3]));
		});
	});

	describe("#notateWith", () => {
		it("applies the function to the value and writes the result to the log", () => {
			const anno = Annotation.note<2, Str>(2, new Str("a")).notateWith(
				(two) => new Str(two.toString()),
			);
			expectTypeOf(anno).toEqualTypeOf<Annotation<2, Str>>();
			expect(anno).to.deep.equal(Annotation.note(2, new Str("a2")));
		});
	});

	describe("#notate", () => {
		it("writes to the log", () => {
			const anno = Annotation.note<2, Str>(2, new Str("a")).notate(
				new Str("b"),
			);
			expectTypeOf(anno).toEqualTypeOf<Annotation<2, Str>>();
			expect(anno).to.deep.equal(Annotation.note(2, new Str("ab")));
		});
	});

	describe("#eraseLog", () => {
		it("does nothing if the variant is Value", () => {
			const anno = Annotation.value<2, 1>(2).eraseLog();
			expectTypeOf(anno).toEqualTypeOf<Annotation<2, never>>();
			expect(anno).to.deep.equal(Annotation.value(2));
		});

		it("deletes the log and changes the Note to a Value if the variant is Note", () => {
			const anno = Annotation.note<2, 1>(2, 1).eraseLog();
			expectTypeOf(anno).toEqualTypeOf<Annotation<2, never>>();
			expect(anno).to.deep.equal(Annotation.value(2));
		});
	});
});
