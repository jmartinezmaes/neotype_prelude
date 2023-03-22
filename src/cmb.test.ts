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

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { cmb, Semigroup } from "./cmb.js";
import { arbStr } from "./_test/utils.js";

describe("cmb", () => {
    it("combines the two Semigroup values", () => {
        fc.assert(
            fc.property(arbStr(), arbStr(), (x, y) => {
                expect(cmb(x, y)).to.deep.equal(x[Semigroup.cmb](y));
            }),
        );
    });
});