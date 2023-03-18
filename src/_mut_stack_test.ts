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

import { expect } from "chai";
import { MutStack } from "./_mut_stack.js";

describe("_mut_stack.js", () => {
    describe("MutStack", () => {
        describe("#pop", () => {
            it("returns undefined if the stack is empty", () => {
                const stack = new MutStack<number>();
                const elem = stack.pop();
                expect(elem).to.be.undefined;
            });

            it("returns elements in LIFO order if the stack is non-empty", () => {
                const stack = new MutStack<number>();
                stack.push(1);
                stack.push(2);

                const fstPop = stack.pop();
                const sndPop = stack.pop();

                expect(fstPop).to.equal(2);
                expect(sndPop).to.equal(1);
            });
        });
    });
});
