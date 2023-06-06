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
import {
	ArrayIdxBuilder,
	ArrayPushBuilder,
	NoOpBuilder,
	RecordBuilder,
} from "./_utils.js";
import type { Builder } from "./builder.js";

describe("ArrayPushBuilder", () => {
	it("builds an array by appending elements", () => {
		const builder: Builder<number, number[]> =
			new ArrayPushBuilder<number>();
		builder.add(1);
		builder.add(2);
		const result = builder.finish();
		expect(result).to.deep.equal([1, 2]);
	});
});

describe("ArrayIdxBuilder", () => {
	it("builds an array by assigning elements to indices", () => {
		const builder: Builder<[number, string], string[]> =
			new ArrayIdxBuilder<string>();
		builder.add([1, "b"]);
		builder.add([0, "a"]);
		const result = builder.finish();
		expect(result).to.deep.equal(["a", "b"]);
	});
});

describe("RecordBuilder", () => {
	it("builds a record by assigning elements to keys", () => {
		const builder: Builder<
			[string, number],
			Record<string, number>
		> = new RecordBuilder<number>();
		builder.add(["a", 1]);
		builder.add(["b", 2]);
		const result = builder.finish();
		expect(result).to.deep.equal({ a: 1, b: 2 });
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
