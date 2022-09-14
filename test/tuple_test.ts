import * as fc from "fast-check";
import { assert } from "chai";
import { arbNum, arbStr } from "./common.js";
import { cmp, eq } from "../src/cmp.js";
import { cmb } from "../src/cmb.js";
import { Tuple } from "../src/tuple.js";

describe("Tuple", () => {
    specify("#[Eq.eq]", () => {
        fc.assert(
            fc.property(
                arbNum(),
                arbNum(),
                arbNum(),
                arbNum(),
                (a, x, b, y) => {
                    const t0 = eq(new Tuple([a, x]), new Tuple([b, y]));
                    assert.strictEqual(t0, eq(a, b) && eq(x, y));
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
                    const t0 = cmp(new Tuple([a, x]), new Tuple([b, y]));
                    assert.strictEqual(t0, cmb(cmp(a, b), cmp(x, y)));
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
                    const t0 = cmb(
                        new Tuple([a, x] as const),
                        new Tuple([b, y]),
                    );
                    assert.deepEqual(t0, new Tuple([cmb(a, b), cmb(x, y)]));
                },
            ),
        );
    });
});
