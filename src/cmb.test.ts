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
import { describe, expect, it } from "vitest";
import { arbStr } from "./_test/utils.js";
import { Semigroup, cmb } from "./cmb.js";

describe("cmb", () => {
	it("combines the two Semigroup values", () => {
		const property = Fc.property(arbStr(), arbStr(), (lhs, rhs) => {
			expect(cmb(lhs, rhs)).to.deep.equal(lhs[Semigroup.cmb](rhs));
		});
		Fc.assert(property);
	});
});
