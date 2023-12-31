/*
 * Copyright 2022-2023 Joshua Martinez-Maes
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
	expectLawfulEq,
	expectLawfulOrd,
} from "./_test/utils.js";
import { Annotation } from "./annotation.js";
import { cmb } from "./cmb.js";
import { Ordering, cmp, eq } from "./cmp.js";

describe("Annotation", () => {
	function arbAnnotation<T, N>(
		arbData: fc.Arbitrary<T>,
		arbNote: fc.Arbitrary<N>,
	): fc.Arbitrary<Annotation<T, N>> {
		return fc.oneof(
			arbData.map(Annotation.data),
			arbData.chain((data) =>
				arbNote.map((note) => Annotation.note(data, note)),
			),
		);
	}

	describe("data", () => {
		it("constructs a Data variant", () => {
			const anno = Annotation.data<2>(2);
			expect(anno).to.be.an.instanceOf(Annotation.Data);
			expect(anno.kind).to.equal(Annotation.Kind.DATA);
			expect(anno.data).to.equal(2);
		});
	});

	describe("note", () => {
		it("constructs a Note variant", () => {
			const anno = Annotation.note<2, 1>(2, 1);
			expect(anno).to.be.an.instanceOf(Annotation.Note);
			expect(anno.kind).to.equal(Annotation.Kind.NOTE);
			expect(anno.data).to.equal(2);
			expect((anno as Annotation.Note<2, 1>).note).to.equal(1);
		});
	});

	describe("go", () => {
		it("completes if all yielded values are Data", () => {
			function* f(): Annotation.Go<[2, 4], never> {
				const two = yield* Annotation.data<2>(2);
				const four = yield* Annotation.data<4>(4);
				return [two, four];
			}
			const anno = Annotation.go(f());
			expect(anno).to.deep.equal(Annotation.data([2, 4]));
		});

		it("completes and retains the note if a Note is yielded after a Data", () => {
			function* f(): Annotation.Go<[2, 4], Str> {
				const two = yield* Annotation.data<2>(2);
				const four = yield* Annotation.note<4, Str>(4, new Str("a"));
				return [two, four];
			}
			const anno = Annotation.go(f());
			expect(anno).to.deep.equal(Annotation.note([2, 4], new Str("a")));
		});

		it("completes and retains the note if a Data is yielded after a Note", () => {
			function* f(): Annotation.Go<[2, 4], Str> {
				const two = yield* Annotation.note<2, Str>(2, new Str("a"));
				const four = yield* Annotation.data<4>(4);
				return [two, four];
			}
			const anno = Annotation.go(f());
			expect(anno).to.deep.equal(Annotation.note([2, 4], new Str("a")));
		});

		it("complets and combines the notes if a Note is yielded after a Note", () => {
			function* f(): Annotation.Go<[2, 4], Str> {
				const two = yield* Annotation.note<2, Str>(2, new Str("a"));
				const four = yield* Annotation.note<4, Str>(4, new Str("b"));
				return [two, four];
			}
			const anno = Annotation.go(f());
			expect(anno).to.deep.equal(Annotation.note([2, 4], new Str("ab")));
		});

		it("combines notes across the try...finally block", () => {
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
		it("applies the function to the elements and collects the data into the builder", () => {
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
		it("applies the function to the elements and collects the data in an array", () => {
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
		it("collects the data into the Builder", () => {
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
		it("collects the data into an array", () => {
			const anno = Annotation.all([
				Annotation.note<2, Str>(2, new Str("a")),
				Annotation.note<4, Str>(4, new Str("b")),
			]);
			expect(anno).to.deep.equal(Annotation.note([2, 4], new Str("ab")));
		});
	});

	describe("allProps", () => {
		it("collects the data in an object", () => {
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
		it("applies the function to the data", () => {
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
		it("compares the values if both variants are Data", () => {
			const property = fc.property(arbNum(), arbNum(), (data0, data1) => {
				expect(
					eq(Annotation.data(data0), Annotation.data(data1)),
				).to.equal(eq(data0, data1));
			});
			fc.assert(property);
		});

		it("compares any Data and any Note as unequal", () => {
			const property = fc.property(
				arbNum(),
				arbNum(),
				arbNum(),
				(data0, data1, note1) => {
					expect(
						eq(
							Annotation.data(data0),
							Annotation.note(data1, note1),
						),
					).to.be.false;
				},
			);
			fc.assert(property);
		});

		it("compares any Note and any Data as unequal", () => {
			const property = fc.property(
				arbNum(),
				arbNum(),
				arbNum(),
				(data0, note0, data1) => {
					expect(
						eq(
							Annotation.note(data0, note0),
							Annotation.data(data1),
						),
					).to.be.false;
				},
			);
			fc.assert(property);
		});

		it("compares the data and notes lexicographically if both variants are Note", () => {
			const property = fc.property(
				arbNum(),
				arbNum(),
				arbNum(),
				arbNum(),
				(data0, note0, data1, note1) => {
					expect(
						eq(
							Annotation.note(data0, note0),
							Annotation.note(data1, note1),
						),
					).to.equal(eq(data0, data1) && eq(note0, note1));
				},
			);
			fc.assert(property);
		});

		it("implements a lawful equivalence relation", () => {
			expectLawfulEq(arbAnnotation(arbNum(), arbNum()));
		});
	});

	describe("#[Ord.cmp]", () => {
		it("compares the values if both variants are Data", () => {
			const property = fc.property(arbNum(), arbNum(), (data0, data1) => {
				expect(
					cmp(Annotation.data(data0), Annotation.data(data1)),
				).to.equal(cmp(data0, data1));
			});
			fc.assert(property);
		});

		it("compares any Data as less than any Note", () => {
			const property = fc.property(
				arbNum(),
				arbNum(),
				arbNum(),
				(data0, data1, note1) => {
					expect(
						cmp(
							Annotation.data(data0),
							Annotation.note(data1, note1),
						),
					).to.equal(Ordering.less);
				},
			);
			fc.assert(property);
		});

		it("compares any Note as greater than any Data", () => {
			const property = fc.property(
				arbNum(),
				arbNum(),
				arbNum(),
				(data0, note0, data1) => {
					expect(
						cmp(
							Annotation.note(data0, note0),
							Annotation.data(data1),
						),
					).to.equal(Ordering.greater);
				},
			);
			fc.assert(property);
		});

		it("compares the data and notes lexicographically if both variants are Note", () => {
			const property = fc.property(
				arbNum(),
				arbNum(),
				arbNum(),
				arbNum(),
				(data0, note0, data1, note1) => {
					expect(
						cmp(
							Annotation.note(data0, note0),
							Annotation.note(data1, note1),
						),
					).to.equal(cmb(cmp(data0, data1), cmp(note0, note1)));
				},
			);
			fc.assert(property);
		});

		it("implements a lawful total order", () => {
			expectLawfulOrd(arbAnnotation(arbNum(), arbNum()));
		});
	});

	// describe("#[Semigroup.cmb]");

	// describe("#isData");

	// describe("#isNote");

	// describe("#match");

	// describe("#unwrap");

	// describe("#getNote");

	// describe("#andThen");

	// describe("#andThenGo");

	// describe("#flatten");

	// describe("#and");

	// describe("#zipWith");

	// describe("#map");

	// describe("#mapNote");

	// describe("#notate");

	// describe("#erase");

	// describe("#review");
});

// describe("AsyncAnnotation", () => {
// 	describe("go");

// 	describe("wrapGoFn");

// 	describe("reduce");

// 	describe("traverseInto");

// 	describe("traverse");

// 	describe("allInto");

// 	describe("all");

// 	describe("forEach");

// 	describe("traverseIntoPar");

// 	describe("traversePar");

// 	describe("allIntoPar");

// 	describe("allPar");

// 	describe("allPropsPar");

// 	describe("forEachPar");

// 	describe("liftPar");
// });