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
	TestBuilder,
	arbNum,
	arbStr,
	delay,
	expectLawfulEq,
	expectLawfulOrd,
	expectLawfulSemigroup,
	type Num,
	type Str,
} from "./_test/utils.js";
import { cmb } from "./cmb.js";
import { Ordering, cmp, eq } from "./cmp.js";
import { AsyncMaybe, Maybe } from "./maybe.js";

describe("Maybe", () => {
	function arbMaybe<T>(arbVal: fc.Arbitrary<T>): fc.Arbitrary<Maybe<T>> {
		return fc.oneof(fc.constant(Maybe.nothing), arbVal.map(Maybe.just));
	}

	describe("nothing", () => {
		it("represents the Nothing variant", () => {
			const maybe: Maybe<1> = Maybe.nothing;
			expect(maybe).to.be.an.instanceOf(Maybe.Nothing);
			expect(maybe.kind).to.equal(Maybe.Kind.NOTHING);
		});
	});

	describe("just", () => {
		it("constructs a Just variant", () => {
			const maybe = Maybe.just<1>(1);
			expect(maybe).to.be.an.instanceOf(Maybe.Just);
			expect(maybe.kind).to.equal(Maybe.Kind.JUST);
			expect((maybe as Maybe.Just<1>).val).to.equal(1);
		});
	});

	describe("unit", () => {
		it("constructs a Just with an undefined value", () => {
			const maybe = Maybe.unit();
			expect(maybe).to.be.an.instanceOf(Maybe.Just);
			expect((maybe as Maybe.Just<void>).val).to.be.undefined;
		});
	});

	describe("fromNullish", () => {
		it("returns Nothing if the argument is undefined", () => {
			expect(Maybe.fromNullish<1>(undefined)).to.equal(Maybe.nothing);
		});

		it("returns Nothing if the argument is null", () => {
			expect(Maybe.fromNullish<1>(null)).to.equal(Maybe.nothing);
		});

		it("returns any non-undefined, non-null argument in a Just", () => {
			expect(Maybe.fromNullish<1>(1)).to.deep.equal(Maybe.just(1));
		});
	});

	describe("wrapNullishFn", () => {
		it("adapts the function to return Nothing if it returns undefined", () => {
			const f = Maybe.wrapNullishFn((): 1 | undefined => undefined);
			const maybe = f();
			expect(maybe).to.equal(Maybe.nothing);
		});

		it("adapts the function to return Nothing if it returns null", () => {
			const f = Maybe.wrapNullishFn((): 1 | null => null);
			const maybe = f();
			expect(maybe).to.equal(Maybe.nothing);
		});

		it("adapts the function to wrap a non-undefined, non-null result in a Just", () => {
			const f = Maybe.wrapNullishFn((): 1 => 1);
			const maybe = f();
			expect(maybe).to.deep.equal(Maybe.just(1));
		});
	});

	describe("wrapPredicateFn", () => {
		it("adapts the predicate to return Nothing if not satisfied", () => {
			const f = Maybe.wrapPredicateFn((num: number) => num === 1);
			const maybe = f(2);
			expect(maybe).to.equal(Maybe.nothing);
		});

		it("adapts the predicate to return its argument in a Just if satisfied", () => {
			const f = Maybe.wrapPredicateFn((num: number) => num === 1);
			const maybe = f(1);
			expect(maybe).to.deep.equal(Maybe.just(1));
		});
	});

	describe("go", () => {
		it("short-circuits on the first yielded Nothing", () => {
			function* f(): Maybe.Go<[1, 2]> {
				const one = yield* Maybe.just<1>(1);
				const two = yield* Maybe.nothing;
				return [one, two];
			}
			const maybe = Maybe.go(f());
			expect(maybe).to.equal(Maybe.nothing);
		});

		it("completes if all yielded values are Just", () => {
			function* f(): Maybe.Go<[1, 2]> {
				const one = yield* Maybe.just<1>(1);
				const two = yield* Maybe.just<2>(2);
				return [one, two];
			}
			const maybe = Maybe.go(f());
			expect(maybe).to.deep.equal(Maybe.just([1, 2]));
		});

		it("executes the finally block if Nothing is yielded in the try block", () => {
			const logs: string[] = [];
			function* f(): Maybe.Go<1> {
				try {
					return yield* Maybe.nothing;
				} finally {
					logs.push("finally");
				}
			}
			const maybe = Maybe.go(f());
			expect(maybe).to.equal(Maybe.nothing);
			expect(logs).to.deep.equal(["finally"]);
		});

		it("returns Nothing if Nothing is yielded in the finally block", () => {
			function* f(): Maybe.Go<1> {
				try {
					return 1;
				} finally {
					yield* Maybe.nothing;
				}
			}
			const maybe = Maybe.go(f());
			expect(maybe).to.equal(Maybe.nothing);
		});
	});

	describe("fromGoFn", () => {
		it("evaluates the generator function to return a Maybe", () => {
			function* f(): Maybe.Go<[1, 2]> {
				const one = yield* Maybe.just<1>(1);
				const two = yield* Maybe.just<2>(2);
				return [one, two];
			}
			const maybe = Maybe.fromGoFn(f);
			expect(maybe).to.deep.equal(Maybe.just([1, 2]));
		});
	});

	describe("wrapGoFn", () => {
		it("adapts the generator function to return a Maybe", () => {
			function* f(two: 2): Maybe.Go<[2, 4]> {
				const four = yield* Maybe.just<4>(4);
				return [two, four];
			}
			const wrapped = Maybe.wrapGoFn(f);
			const maybe = wrapped(2);
			expect(maybe).to.deep.equal(Maybe.just([2, 4]));
		});
	});

	describe("reduce", () => {
		it("reduces the finite iterable from left to right in the context of Maybe", () => {
			const maybe = Maybe.reduce(
				["a", "b"],
				(chars, char, idx) => Maybe.just(chars + char + idx),
				"",
			);
			expect(maybe).to.deep.equal(Maybe.just("a0b1"));
		});
	});

	describe("traverseInto", () => {
		it("applies the function to the elements and collects the present values into the Builder if all results are Just", () => {
			const builder = new TestBuilder<[number, string]>();
			const maybe = Maybe.traverseInto(
				["a", "b"],
				(char, idx) => Maybe.just<[number, string]>([idx, char]),
				builder,
			);
			expect(maybe).to.deep.equal(
				Maybe.just([
					[0, "a"],
					[1, "b"],
				]),
			);
		});
	});

	describe("traverse", () => {
		it("applies the function to the elements and collects the present values in an array if all results are Just", () => {
			const maybe = Maybe.traverse(["a", "b"], (char, idx) =>
				Maybe.just<[number, string]>([idx, char]),
			);
			expect(maybe).to.deep.equal(
				Maybe.just([
					[0, "a"],
					[1, "b"],
				]),
			);
		});
	});

	describe("allInto", () => {
		it("collects the present values into the Builder if all elements are Just", () => {
			const builder = new TestBuilder<number>();
			const maybe = Maybe.allInto(
				[Maybe.just(1), Maybe.just(2)],
				builder,
			);
			expect(maybe).to.deep.equal(Maybe.just([1, 2]));
		});
	});

	describe("all", () => {
		it("collects the present values in an array if all elements are Just", () => {
			const maybe = Maybe.all([Maybe.just<1>(1), Maybe.just<2>(2)]);
			expect(maybe).to.deep.equal(Maybe.just([1, 2]));
		});
	});

	describe("allProps", () => {
		it("collects the present values in an object if all elements are Just", () => {
			const maybe = Maybe.allProps({
				one: Maybe.just<1>(1),
				two: Maybe.just<2>(2),
			});
			expect(maybe).to.deep.equal(Maybe.just({ one: 1, two: 2 }));
		});
	});

	describe("forEach", () => {
		it("applies the function to the elements while the result is Just", () => {
			const results: [number, string][] = [];
			const maybe = Maybe.forEach(["a", "b"], (char, idx) => {
				results.push([idx, char]);
				return Maybe.just(undefined);
			});
			expect(maybe).to.deep.equal(Maybe.just(undefined));
			expect(results).to.deep.equal([
				[0, "a"],
				[1, "b"],
			]);
		});
	});

	describe("lift", () => {
		it("applies the function to the present values if all arguments are Just", () => {
			function f<A, B>(lhs: A, rhs: B): [A, B] {
				return [lhs, rhs];
			}
			const maybe = Maybe.lift(f)(Maybe.just(1), Maybe.just(2));
			expect(maybe).to.deep.equal(Maybe.just([1, 2]));
		});
	});

	describe("#[Eq.eq]", () => {
		it("compares Nothing and Nothing as equal", () => {
			expect(eq<Maybe<Num>>(Maybe.nothing, Maybe.nothing)).to.be.true;
		});

		it("compares Nothing and any Just as inequal", () => {
			const property = fc.property(arbNum(), (rhs) => {
				expect(eq(Maybe.nothing, Maybe.just(rhs))).to.be.false;
			});
			fc.assert(property);
		});

		it("compares any Just and Nothing as inequal", () => {
			const property = fc.property(arbNum(), (lhs) => {
				expect(eq(Maybe.just(lhs), Maybe.nothing)).to.be.false;
			});
			fc.assert(property);
		});

		it("compares the values if both variants are Just", () => {
			const property = fc.property(arbNum(), arbNum(), (lhs, rhs) => {
				expect(eq(Maybe.just(lhs), Maybe.just(rhs))).to.equal(
					eq(lhs, rhs),
				);
			});
			fc.assert(property);
		});

		it("implements a lawful equivalence relation", () => {
			expectLawfulEq(arbMaybe(arbNum()));
		});
	});

	describe("#[Ord.cmp]", () => {
		it("compares Nothing as equal to Nothing", () => {
			expect(cmp<Maybe<Num>>(Maybe.nothing, Maybe.nothing)).to.equal(
				Ordering.equal,
			);
		});

		it("compares Nothing as less than any Just", () => {
			const property = fc.property(arbNum(), (rhs) => {
				expect(cmp(Maybe.nothing, Maybe.just(rhs))).to.equal(
					Ordering.less,
				);
			});
			fc.assert(property);
		});

		it("compares any Just as greater than Nothing", () => {
			const property = fc.property(arbNum(), (lhs) => {
				expect(cmp(Maybe.just(lhs), Maybe.nothing)).to.equal(
					Ordering.greater,
				);
			});
			fc.assert(property);
		});

		it("compares the values if both variants are Just", () => {
			const property = fc.property(arbNum(), arbNum(), (lhs, rhs) => {
				expect(cmp(Maybe.just(lhs), Maybe.just(rhs))).to.equal(
					cmp(lhs, rhs),
				);
			});
			fc.assert(property);
		});

		it("implements a lawful total order", () => {
			expectLawfulOrd(arbMaybe(arbNum()));
		});
	});

	describe("#[Semigroup.cmb]", () => {
		it("returns Nothing if both variants are Nothing", () => {
			expect(cmb<Maybe<Str>>(Maybe.nothing, Maybe.nothing)).to.equal(
				Maybe.nothing,
			);
		});

		it("keeps the second Just if the first variant is Nothing", () => {
			const property = fc.property(arbStr(), (rhs) => {
				expect(cmb(Maybe.nothing, Maybe.just(rhs))).to.deep.equal(
					Maybe.just(rhs),
				);
			});
			fc.assert(property);
		});

		it("keeps the first Just if the second variant is Nothing", () => {
			const property = fc.property(arbStr(), (lhs) => {
				expect(cmb(Maybe.just(lhs), Maybe.nothing)).to.deep.equal(
					Maybe.just(lhs),
				);
			});
			fc.assert(property);
		});

		it("combines the values if both variants are Just", () => {
			const property = fc.property(arbStr(), arbStr(), (lhs, rhs) => {
				expect(cmb(Maybe.just(lhs), Maybe.just(rhs))).to.deep.equal(
					Maybe.just(cmb(lhs, rhs)),
				);
			});
			fc.assert(property);
		});

		it("implements a lawful semigroup", () => {
			expectLawfulSemigroup(arbMaybe(arbStr()));
		});
	});

	describe("#isNothing", () => {
		it("returns true if the variant is Nothing", () => {
			expect(Maybe.nothing.isNothing()).to.be.true;
		});

		it("returns false if the variant is Just", () => {
			expect(Maybe.just<1>(1).isNothing()).to.be.false;
		});
	});

	describe("#isJust", () => {
		it("returns false if the variant is Nothing", () => {
			expect(Maybe.nothing.isJust()).to.be.false;
		});

		it("returns true if the variant is Just", () => {
			expect(Maybe.just<1>(1).isJust()).to.be.true;
		});
	});

	describe("#match", () => {
		it("evaluates the first function if the variant is Nothing", () => {
			const result = (Maybe.nothing as Maybe<1>).match(
				(): 3 => 3,
				(one): [1, 2] => [one, 2],
			);
			expect(result).to.equal(3);
		});

		it("applies the second function to the value if the variant is Just", () => {
			const result = Maybe.just<1>(1).match(
				(): 3 => 3,
				(one): [1, 2] => [one, 2],
			);
			expect(result).to.deep.equal([1, 2]);
		});
	});

	describe("#unwrapOrElse", () => {
		it("evaluates the function if the variant is Nothing", () => {
			const result = (Maybe.nothing as Maybe<1>).unwrapOrElse((): 2 => 2);
			expect(result).to.equal(2);
		});

		it("extracts the value if the variant is Just", () => {
			const result = Maybe.just<1>(1).unwrapOrElse((): 2 => 2);
			expect(result).to.equal(1);
		});
	});

	describe("#unwrapOr", () => {
		it("returns the fallback value if the variant is Nothing", () => {
			const result = (Maybe.nothing as Maybe<1>).unwrapOr(2 as const);
			expect(result).to.equal(2);
		});

		it("extracts the value if the variant is Just", () => {
			const result = Maybe.just<1>(1).unwrapOr(2 as const);
			expect(result).to.equal(1);
		});
	});

	describe("#toNullish", () => {
		it("returns undefined if the variant is Nothing", () => {
			const result = (Maybe.nothing as Maybe<1>).toNullish();
			expect(result).to.be.undefined;
		});

		it("extracts the value if the variant is Just", () => {
			const result = Maybe.just<1>(1).toNullish();
			expect(result).to.equal(1);
		});
	});

	describe("#orElse", () => {
		it("evaluates the function if the variant is Nothing", () => {
			const maybe = (Maybe.nothing as Maybe<1>).orElse(() =>
				Maybe.just<2>(2),
			);
			expect(maybe).to.deep.equal(Maybe.just(2));
		});

		it("does not evaluate the function if the variant is Just", () => {
			const maybe = Maybe.just<1>(1).orElse(() => Maybe.just<2>(2));
			expect(maybe).to.deep.equal(Maybe.just(1));
		});
	});

	describe("#or", () => {
		it("returns the other Maybe if the variant is Nothing", () => {
			const maybe = (Maybe.nothing as Maybe<1>).or(Maybe.just<2>(2));
			expect(maybe).to.deep.equal(Maybe.just(2));
		});

		it("returns the original Maybe if the variant is Just", () => {
			const maybe = Maybe.just<1>(1).or(Maybe.just<2>(2));
			expect(maybe).to.deep.equal(Maybe.just(1));
		});
	});

	describe("#xor", () => {
		it("returns Nothing if both variants are Nothing", () => {
			const maybe = (Maybe.nothing as Maybe<1>).xor(
				Maybe.nothing as Maybe<2>,
			);
			expect(maybe).to.equal(Maybe.nothing);
		});

		it("returns the second Maybe if the first is Nothing and the second is Just", () => {
			const maybe = (Maybe.nothing as Maybe<1>).xor(Maybe.just<2>(2));
			expect(maybe).to.deep.equal(Maybe.just(2));
		});

		it("returns the first Maybe if the first is Just and the second is Nothing", () => {
			const maybe = Maybe.just<1>(1).xor(Maybe.nothing as Maybe<2>);
			expect(maybe).to.deep.equal(Maybe.just(1));
		});

		it("returns Nothing if both variants are Just", () => {
			const maybe = Maybe.just<1>(1).xor(Maybe.just<2>(2));
			expect(maybe).to.equal(Maybe.nothing);
		});
	});

	describe("#andThen", () => {
		it("does not apply the continuation if the variant is Nothing", () => {
			const maybe = (Maybe.nothing as Maybe<1>).andThen(
				(one): Maybe<[1, 2]> => Maybe.just([one, 2]),
			);
			expect(maybe).to.equal(Maybe.nothing);
		});

		it("applies the continuation to the value if the variant is Just", () => {
			const maybe = Maybe.just<1>(1).andThen(
				(one): Maybe<[1, 2]> => Maybe.just([one, 2]),
			);
			expect(maybe).to.deep.equal(Maybe.just([1, 2]));
		});
	});

	describe("#andThenGo", () => {
		it("applies the continuation to the value if the variant is Just", () => {
			const maybe = Maybe.just<1>(1).andThenGo(function* (one): Maybe.Go<
				[1, 2]
			> {
				const two = yield* Maybe.just<2>(2);
				return [one, two];
			});
			expect(maybe).to.deep.equal(Maybe.just([1, 2]));
		});
	});

	describe("#flatten", () => {
		it("removes one level of nesting if the variant is Just", () => {
			const maybe = Maybe.just<Maybe<1>>(Maybe.just(1)).flatten();
			expect(maybe).to.deep.equal(Maybe.just(1));
		});
	});

	describe("#and", () => {
		it("returns the original Maybe if the variant is Nothing", () => {
			const maybe = (Maybe.nothing as Maybe<1>).and(Maybe.just<2>(2));
			expect(maybe).to.deep.equal(Maybe.nothing);
		});

		it("returns the other Maybe if the variant is Just", () => {
			const maybe = Maybe.just<1>(1).and(Maybe.just<2>(2));
			expect(maybe).to.deep.equal(Maybe.just(2));
		});
	});

	describe("#mapNullish", () => {
		it("does not apply the continuation if the variant is Nothing", () => {
			const maybe = (Maybe.nothing as Maybe<1>).mapNullish(
				(one): [1, 2] | null => [one, 2],
			);
			expect(maybe).to.equal(Maybe.nothing);
		});

		it("returns Nothing if the continuation returns null", () => {
			const maybe = Maybe.just<1>(1).mapNullish(
				(): [1, 2] | null => null,
			);
			expect(maybe).to.equal(Maybe.nothing);
		});

		it("returns Nothing if the continuation returns undefined", () => {
			const maybe = Maybe.just<1>(1).mapNullish(
				(): [1, 2] | undefined => undefined,
			);
			expect(maybe).to.equal(Maybe.nothing);
		});

		it("returns the result in a Just if the continuation returns a non-null result", () => {
			const maybe = Maybe.just<1>(1).mapNullish(
				(one): [1, 2] | null | undefined => [one, 2],
			);
			expect(maybe).to.deep.equal(Maybe.just([1, 2]));
		});
	});

	describe("#filter", () => {
		it("does not apply the predicate if the variant is Nothing", () => {
			const maybe = (Maybe.nothing as Maybe<number>).filter(
				(one) => one === 1,
			);
			expect(maybe).to.equal(Maybe.nothing);
		});

		it("returns Nothing if the predicate returns false", () => {
			const maybe = Maybe.just(1).filter((one) => one === 2);
			expect(maybe).to.equal(Maybe.nothing);
		});

		it("returns the value in a Just if the predicate returns true", () => {
			const maybe = Maybe.just(1).filter((one) => one === 1);
			expect(maybe).to.deep.equal(Maybe.just(1));
		});
	});

	describe("#zipWith", () => {
		it("applies the function to the values if both variants are Just", () => {
			const maybe = Maybe.just<1>(1).zipWith(
				Maybe.just<2>(2),
				(one, two): [1, 2] => [one, two],
			);
			expect(maybe).to.deep.equal(Maybe.just([1, 2]));
		});
	});

	describe("#map", () => {
		it("applies the function to the value if the variant is Just", () => {
			const maybe = Maybe.just<1>(1).map((one): [1, 2] => [one, 2]);
			expect(maybe).to.deep.equal(Maybe.just([1, 2]));
		});
	});
});

describe("AsyncMaybe", () => {
	describe("go", async () => {
		it("short-circuits on the first yielded Nothing", async () => {
			async function* f(): AsyncMaybe.Go<[1, 2]> {
				const one = yield* await Promise.resolve(Maybe.just<1>(1));
				const two = yield* await Promise.resolve(Maybe.nothing);
				return [one, two];
			}
			const maybe = await AsyncMaybe.go(f());
			expect(maybe).to.equal(Maybe.nothing);
		});

		it("completes if all yielded values are Just", async () => {
			async function* f(): AsyncMaybe.Go<[1, 2]> {
				const one = yield* await Promise.resolve(Maybe.just<1>(1));
				const two = yield* await Promise.resolve(Maybe.just<2>(2));
				return [one, two];
			}
			const maybe = await AsyncMaybe.go(f());
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
			expect(maybe).to.deep.equal(Maybe.just([1, 2]));
		});
	});

	describe("wrapGoFn", () => {
		it("adapts the async generator function to return an AsyncMaybe", async () => {
			async function* f(two: 2): AsyncMaybe.Go<[2, 4]> {
				const four = yield* await Promise.resolve(Maybe.just<4>(4));
				return [two, four];
			}
			const wrapped = AsyncMaybe.wrapGoFn(f);
			const maybe = await wrapped(2);
			expect(maybe).to.deep.equal(Maybe.just([2, 4]));
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
					delay(1).then(() => Maybe.just(chars + char + idx)),
				"",
			);
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
				delay(1).then(() => {
					results.push([idx, char]);
					return Maybe.just(undefined);
				}),
			);
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
					delay(char === "a" ? 50 : 10).then(() =>
						char === "a" ? Maybe.nothing : Maybe.just([idx, char]),
					),
				new TestBuilder<[number, string]>(),
			);
			expect(maybe).to.equal(Maybe.nothing);
		});

		it("applies the function to the elements and collects the present values into the Builder if all results are Just", async () => {
			const builder = new TestBuilder<[number, string]>();
			const maybe = await AsyncMaybe.traverseIntoPar(
				["a", "b"],
				(char, idx) =>
					delay(char === "a" ? 50 : 10).then(() =>
						Maybe.just([idx, char]),
					),
				builder,
			);
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
					delay(char === "a" ? 50 : 10).then(() =>
						Maybe.just<[number, string]>([idx, char]),
					),
			);
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
			expect(maybe).to.deep.equal(Maybe.just([2, 1]));
		});
	});

	describe("allPar", () => {
		it("collects the present values in an array if all elements are Just", async () => {
			const maybe = await AsyncMaybe.allPar([
				delay(50).then<Maybe<1>>(() => Maybe.just(1)),
				delay(10).then<Maybe<2>>(() => Maybe.just(2)),
			]);
			expect(maybe).to.deep.equal(Maybe.just([1, 2]));
		});
	});

	describe("allPropsPar", () => {
		it("collects the present values in an object if all elements are Just", async () => {
			const maybe = await AsyncMaybe.allPropsPar({
				one: delay(50).then<Maybe<1>>(() => Maybe.just(1)),
				two: delay(10).then<Maybe<2>>(() => Maybe.just(2)),
			});
			expect(maybe).to.deep.equal(Maybe.just({ one: 1, two: 2 }));
		});
	});

	describe("forEachPar", () => {
		it("applies the function to the elements and continues while the result is Just", async () => {
			const results: [number, string][] = [];
			const maybe = await AsyncMaybe.forEachPar(["a", "b"], (char, idx) =>
				delay(char === "a" ? 50 : 10).then(() => {
					results.push([idx, char]);
					return Maybe.just(undefined);
				}),
			);
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
			const maybe = await AsyncMaybe.liftPar(f)(
				delay(50).then(() => Maybe.just<1>(1)),
				delay(10).then(() => Maybe.just<2>(2)),
			);
			expect(maybe).to.deep.equal(Maybe.just([1, 2]));
		});
	});
});
