import { assert } from "chai";
import * as fc from "fast-check";
import { cmb, Semigroup } from "../src/cmb.js";
import { arbStr } from "./common.js";

describe("Semigroup", () => {
    specify("cmb", () => {
        fc.assert(
            fc.property(arbStr(), arbStr(), (x, y) =>
                assert.deepEqual(cmb(x, y), x[Semigroup.cmb](y)),
            ),
        );
    });
});
