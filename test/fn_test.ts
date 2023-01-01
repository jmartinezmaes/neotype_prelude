import { expect } from "chai";
import * as fc from "fast-check";
import { constant, id, negatePred, wrapCtor } from "../src/fn.js";

describe("fn.js", () => {
    describe("id", () => {
        it("returns its argument", () => {
            fc.assert(
                fc.property(fc.anything(), (x) => {
                    expect(id(x)).to.deep.equal(x);
                }),
            );
        });
    });

    describe("constant", () => {
        it("returns a function that returns the original argument regardless of the provided arguments", () => {
            fc.assert(
                fc.property(
                    fc.anything(),
                    fc.array(fc.anything()),
                    (x, args) => {
                        const f = constant(x);
                        expect(f(...args)).to.deep.equal(x);
                    },
                ),
            );
        });
    });

    describe("negatePred", () => {
        it("adapts the predicate into an identical predicate that negates its result", () => {
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
        it("adapts the constructor into a callable function", () => {
            class Box<A> {
                constructor(readonly val: A) {}
            }
            const f = wrapCtor(Box);
            const box = f<1>(1);
            expect(box).to.deep.equal(new Box(1));
        });
    });
});
