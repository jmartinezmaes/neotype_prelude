import { expect } from "chai";
import * as fc from "fast-check";
import { id, negatePred, wrapCtor } from "../src/fn.js";

describe("fn.js", () => {
    describe("id", () => {
        it("returns any value as is", () => {
            fc.assert(
                fc.property(fc.anything(), (x) => {
                    expect(id(x)).to.deep.equal(x);
                }),
            );
        });
    });

    describe("negatePred", () => {
        it("adapts a predicate into an identical predicate that negates its result", () => {
            function isOne(x: 1 | 2): boolean {
                return x === 1;
            }
            const isNotOne = negatePred(isOne);

            expect(isOne(1)).to.be.true;
            expect(isOne(2)).to.be.false;
            expect(isNotOne(1)).to.be.false;
            expect(isNotOne(2)).to.be.true;
        });
    });

    describe("wrapCtor", () => {
        it("adapts a constructor into a callable function", () => {
            class Box<A> {
                constructor(readonly val: A) {}
            }
            const f = wrapCtor(Box);
            const box = f<1>(1);
            expect(box).to.deep.equal(new Box(1));
        });
    });
});
