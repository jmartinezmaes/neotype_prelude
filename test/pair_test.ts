import { expect } from "chai";
import * as fc from "fast-check";
import { cmb } from "../src/cmb.js";
import { cmp, eq } from "../src/cmp.js";
import { Pair } from "../src/pair.js";
import { arbNum, arbStr, tuple } from "./common.js";

describe("pair.js", () => {
    describe("Pair", () => {
        specify("fromTuple", () => {
            const result = Pair.fromTuple<1, 2>([1, 2]);
            expect(result).to.deep.equal(new Pair(1, 2));
        });

        specify("get#val", () => {
            const result = new Pair<1, 2>(1, 2).val;
            expect(result).to.deep.equal([1, 2]);
        });

        specify("#[Eq.eq]", () => {
            fc.assert(
                fc.property(
                    arbNum(),
                    arbNum(),
                    arbNum(),
                    arbNum(),
                    (a, x, b, y) => {
                        expect(eq(new Pair(a, x), new Pair(b, y))).to.equal(
                            eq(a, b) && eq(x, y),
                        );
                    },
                ),
            );
        });

        specify("#[Ord.cmp]", () => {
            fc.assert(
                fc.property(
                    arbNum(),
                    arbNum(),
                    arbNum(),
                    arbNum(),
                    (a, x, b, y) => {
                        expect(cmp(new Pair(a, x), new Pair(b, y))).to.equal(
                            cmb(cmp(a, b), cmp(x, y)),
                        );
                    },
                ),
            );
        });

        specify("#[Semigroup.cmb]", () => {
            fc.assert(
                fc.property(
                    arbStr(),
                    arbStr(),
                    arbStr(),
                    arbStr(),
                    (a, x, b, y) => {
                        expect(
                            cmb(new Pair(a, x), new Pair(b, y)),
                        ).to.deep.equal(new Pair(cmb(a, b), cmb(x, y)));
                    },
                ),
            );
        });

        specify("#unwrap", () => {
            const result = new Pair<1, 2>(1, 2).unwrap(tuple);
            expect(result).to.deep.equal([1, 2]);
        });

        specify("#lmap", () => {
            const result = new Pair<1, 2>(1, 2).lmap((x): [1, 3] => [x, 3]);
            expect(result).to.deep.equal(new Pair([1, 3], 2));
        });

        specify("#map", () => {
            const result = new Pair<1, 2>(1, 2).map((x): [2, 4] => [x, 4]);
            expect(result).to.deep.equal(new Pair(1, [2, 4]));
        });
    });
});
