import { expect } from "chai";
import * as fc from "fast-check";
import { cmb } from "../src/cmb.js";
import { cmp, eq, Ordering } from "../src/cmp.js";
import {
    arbNum,
    arbStr,
    expectLawfulEq,
    expectLawfulOrd,
    expectLawfulSemigroup,
    Str,
} from "./util.js";

describe("util.js", () => {
    describe("Num", () => {
        describe("#[Eq.eq]", () => {
            it("compares the values using strict equality", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), (x, y) => {
                        expect(eq(x, y)).to.equal(x.val === y.val);
                    }),
                );
            });

            it("implements a lawful equivalence relation", () => {
                expectLawfulEq(arbNum());
            });
        });

        describe("#[Ord.cmp]", () => {
            it("compares the values as ordered from least to greatest", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), (x, y) => {
                        expect(cmp(x, y)).to.equal(
                            Ordering.fromNumber(x.val - y.val),
                        );
                    }),
                );
            });

            it("implements a lawful total order", () => {
                expectLawfulOrd(arbNum());
            });
        });
    });

    describe("Str", () => {
        describe("#[Semigroup.cmb]", () => {
            it("combines the values using concatenation", () => {
                fc.assert(
                    fc.property(arbStr(), arbStr(), (x, y) => {
                        expect(cmb(x, y)).to.deep.equal(new Str(x.val + y.val));
                    }),
                );
            });

            it("implements a lawful semigroup", () => {
                expectLawfulSemigroup(arbStr());
            });
        });
    });
});
