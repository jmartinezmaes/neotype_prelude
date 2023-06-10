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

import { describe, expect, it } from "vitest";
import { Str } from "./_test/utils.js";
import {
	ArrayConcatBuilder,
	ArrayEntryBuilder,
	ArrayPushBuilder,
	ArrayUnshiftBuilder,
	MapEntryBuilder,
	MapUnionBuilder,
	NoOpBuilder,
	RecordEntryBuilder,
	RecordSpreadBuilder,
	SemigroupBuilder,
	SetUnionBuilder,
	SetValueBuilder,
	StringAppendBuilder,
	StringPrependBuilder,
	type Builder,
} from "./builder.js";

describe("StringAppendBuilder", () => {
	it("builds a string by appending elements", () => {
		const builder: Builder<string, string> = new StringAppendBuilder();
		builder.add("a");
		builder.add("b");
		const result = builder.finish();
		expect(result).to.equal("ab");
	});
});

describe("StringPrependBuilder", () => {
	it("builds a string by prepending elements", () => {
		const builder: Builder<string, string> = new StringPrependBuilder();
		builder.add("a");
		builder.add("b");
		const result = builder.finish();
		expect(result).to.equal("ba");
	});
});

describe("ArrayPushBuilder", () => {
	it("builds an array by appending elements", () => {
		const builder: Builder<number, number[]> = new ArrayPushBuilder();
		builder.add(1);
		builder.add(2);
		const result = builder.finish();
		expect(result).to.deep.equal([1, 2]);
	});
});

describe("ArrayUnshiftBuilder", () => {
	it("builds an array by prepending elements", () => {
		const builder: Builder<number, number[]> = new ArrayUnshiftBuilder();
		builder.add(1);
		builder.add(2);
		const result = builder.finish();
		expect(result).to.deep.equal([2, 1]);
	});
});

describe("ArrayEntryBuilder", () => {
	it("builds an array by assigning elements to indices", () => {
		const builder: Builder<[number, string], string[]> =
			new ArrayEntryBuilder();
		builder.add([1, "b"]);
		builder.add([0, "a"]);
		const result = builder.finish();
		expect(result).to.deep.equal(["a", "b"]);
	});
});

describe("ArrayConcatBuilder", () => {
	it("builds an array by concatening arrays left to right", () => {
		const builder: Builder<number[], number[]> = new ArrayConcatBuilder();
		builder.add([1, 2]);
		builder.add([3, 4]);
		const result = builder.finish();
		expect(result).to.deep.equal([1, 2, 3, 4]);
	});
});

describe("RecordEntryBuilder", () => {
	it("builds a record by assigning elements to keys", () => {
		const builder: Builder<
			[string, number],
			Record<string, number>
		> = new RecordEntryBuilder();
		builder.add(["a", 1]);
		builder.add(["b", 2]);
		const result = builder.finish();
		expect(result).to.deep.equal({ a: 1, b: 2 });
	});
});

describe("RecordSpreadBuilder", () => {
	it("builds a record by spreading records left to right", () => {
		const builder: Builder<
			Record<string, number>,
			Record<string, number>
		> = new RecordSpreadBuilder();
		builder.add({ a: 1 });
		builder.add({ b: 2, a: 3 });
		const result = builder.finish();
		expect(result).to.deep.equal({ a: 3, b: 2 });
	});
});

describe("MapEntryBuilder", () => {
	it("builds a Map by assigning values to keys", () => {
		const builder: Builder<
			readonly [string, number],
			Map<string, number>
		> = new MapEntryBuilder();
		builder.add(["a", 1]);
		builder.add(["b", 2]);
		builder.add(["a", 3]);
		const result = builder.finish();
		expect(result).to.deep.equal(
			new Map([
				["a", 3],
				["b", 2],
			]),
		);
	});
});

describe("MapUnionBuilder", () => {
	it("builds a Map by taking the union of maps", () => {
		const builder: Builder<
			Map<string, number>,
			Map<string, number>
		> = new MapUnionBuilder();
		builder.add(new Map([["a", 1]]));
		builder.add(
			new Map([
				["b", 2],
				["a", 3],
			]),
		);
		const result = builder.finish();
		expect(result).to.deep.equal(
			new Map([
				["a", 3],
				["b", 2],
			]),
		);
	});
});

describe("SetValueBuilder", () => {
	it("builds a Set by adding values", () => {
		const builder: Builder<number, Set<number>> = new SetValueBuilder();
		builder.add(1);
		builder.add(2);
		builder.add(1);
		const result = builder.finish();
		expect(result).to.deep.equal(new Set([1, 2]));
	});
});

describe("SetUnionBuilder", () => {
	it("builds a Set by taking the union of sets", () => {
		const builder: Builder<
			Set<number>,
			Set<number>
		> = new SetUnionBuilder();
		builder.add(new Set([1]));
		builder.add(new Set([2, 1]));
		const result = builder.finish();
		expect(result).to.deep.equal(new Set([1, 2]));
	});
});

describe("SemigroupBuilder", () => {
	it("builds a semigroup by combining semigroups from left to right", () => {
		const builder: Builder<Str, Str> = new SemigroupBuilder(new Str(""));
		builder.add(new Str("a"));
		builder.add(new Str("b"));
		const result = builder.finish();
		expect(result).to.deep.equal(new Str("ab"));
	});
});

describe("NoOpBuilder", () => {
	it("does not build anything and ignores all elements", () => {
		const builder: Builder<unknown, void> = new NoOpBuilder();
		builder.add(1);
		builder.add(2);
		const result = builder.finish();
		expect(result).to.be.undefined;
	});
});
