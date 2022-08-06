import * as fc from "fast-check";
import { assert } from "chai";
import { arbStr } from "./common.js";
import { cmb, Semigroup } from "../src/cmb.js";

describe("Semigroup", () => {
    specify("cmb", () => {
        fc.assert(
            fc.property(arbStr(), arbStr(), (x, y) => {
                assert.deepEqual(cmb(x, y), x[Semigroup.cmb](y));
            }),
        );
    });
});
