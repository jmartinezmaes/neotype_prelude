import { assert } from "chai";
import * as fc from "fast-check";
import { cmb, Semigroup } from "../src/cmb.js";
import { arb } from "./common.js";

describe("cmb.js", () => {
    specify("cmb", () => {
        fc.assert(
            fc.property(arb.str(), arb.str(), (x, y) =>
                assert.deepEqual(cmb(x, y), x[Semigroup.cmb](y)),
            ),
        );
    });
});
