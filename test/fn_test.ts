import { expect } from "chai";
import * as fc from "fast-check";
import { id, negatePred, wrapCtor } from "../src/fn.js";

describe("fn.js", () => {
    specify("id", () => {
        fc.assert(
            fc.property(
                fc.anything().filter((x) => !Number.isNaN(x)),
                (x) => {
                    expect(id(x)).to.equal(x);
                },
            ),
        );
    });

    specify("negatePred", () => {
        function isOne(x: 1 | 2): boolean {
            return x === 1;
        }
        const isNotOne = negatePred(isOne);

        expect(isOne(1)).to.be.true;
        expect(isOne(2)).to.be.false;
        expect(isNotOne(1)).to.be.false;
        expect(isNotOne(2)).to.be.true;
    });

    specify("wrapCtor", () => {
        class Box<A> {
            constructor(readonly val: A) {}
        }
        const f = wrapCtor(Box);

        const result = f<1>(1);
        expect(result).to.deep.equal(new Box(1));
    });
});
