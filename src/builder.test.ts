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
import { Str, TestBuilder } from "./_test/utils.js";
import {
	AddManyBuilder,
	ArrayAssignBuilder,
	ArrayPushBuilder,
	ArrayUnshiftBuilder,
	MapSetBuilder,
	NoOpBuilder,
	ObjectAssignBuilder,
	SemigroupCmbBuilder,
	SetAddBuilder,
	StringAppendBuilder,
	StringPrependBuilder,
	type Builder,
} from "./builder.js";

describe("AddManyBuilder", () => {
	it("wraps another builder to add many elements at once", () => {
		const builder: Builder<Iterable<string>, string[]> = new AddManyBuilder(
			new TestBuilder(),
		);
		builder.add(["a", "b"]);
		builder.add([]);
		builder.add(["c"]);
		const output = builder.finish();
		expect(output).to.deep.equal(["a", "b", "c"]);
	});
});

describe("StringAppendBuilder", () => {
	it("builds a string by appending elements", () => {
		const builder: Builder<string, string> = new StringAppendBuilder();
		builder.add("a");
		builder.add("b");
		const output = builder.finish();
		expect(output).to.equal("ab");
	});
});

describe("StringPrependBuilder", () => {
	it("builds a string by prepending elements", () => {
		const builder: Builder<string, string> = new StringPrependBuilder();
		builder.add("a");
		builder.add("b");
		const output = builder.finish();
		expect(output).to.equal("ba");
	});
});

describe("ArrayPushBuilder", () => {
	it("builds an array by appending elements", () => {
		const builder: Builder<number, number[]> = new ArrayPushBuilder();
		builder.add(1);
		builder.add(2);
		const output = builder.finish();
		expect(output).to.deep.equal([1, 2]);
	});
});

describe("ArrayUnshiftBuilder", () => {
	it("builds an array by prepending elements", () => {
		const builder: Builder<number, number[]> = new ArrayUnshiftBuilder();
		builder.add(1);
		builder.add(2);
		const output = builder.finish();
		expect(output).to.deep.equal([2, 1]);
	});
});

describe("ArrayAssignBuilder", () => {
	it("builds an array by assigning elements to indices", () => {
		const builder: Builder<readonly [number, string], string[]> =
			new ArrayAssignBuilder();
		builder.add([1, "b"]);
		builder.add([0, "a"]);
		const output = builder.finish();
		expect(output).to.deep.equal(["a", "b"]);
	});
});

describe("ObjectAssignBuilder", () => {
	it("builds a record by assigning elements to keys", () => {
		const builder: Builder<
			readonly [string, number],
			Record<string, number>
		> = new ObjectAssignBuilder();
		builder.add(["a", 1]);
		builder.add(["b", 2]);
		const output = builder.finish();
		expect(output).to.deep.equal({ a: 1, b: 2 });
	});
});

describe("MapSetBuilder", () => {
	it("builds a map by assigning values to keys", () => {
		const builder: Builder<
			readonly [string, number],
			Map<string, number>
		> = new MapSetBuilder();
		builder.add(["a", 1]);
		builder.add(["b", 2]);
		builder.add(["a", 3]);
		const output = builder.finish();
		expect(output).to.deep.equal(
			new Map([
				["a", 3],
				["b", 2],
			]),
		);
	});
});

describe("SetAddBuilder", () => {
	it("builds a set by adding values", () => {
		const builder: Builder<number, Set<number>> = new SetAddBuilder();
		builder.add(1);
		builder.add(2);
		builder.add(1);
		const output = builder.finish();
		expect(output).to.deep.equal(new Set([1, 2]));
	});
});

describe("SemigroupCmbBuilder", () => {
	it("builds a semigroup by combining semigroups from left to right", () => {
		const builder: Builder<Str, Str> = new SemigroupCmbBuilder(new Str(""));
		builder.add(new Str("a"));
		builder.add(new Str("b"));
		const output = builder.finish();
		expect(output).to.deep.equal(new Str("ab"));
	});
});

describe("NoOpBuilder", () => {
	it("does not build anything and ignores all elements", () => {
		const builder: Builder<unknown, unknown> = new NoOpBuilder();
		builder.add(1);
		builder.add(2);
		const output = builder.finish();
		expect(output).to.be.undefined;
	});
});
