import { assert } from "chai";
import * as fc from "fast-check";
import { cmb } from "../src/cmb.js";
import { cmp, eq } from "../src/cmp.js";
import { Pair } from "../src/pair.js";
import { arbNum, arbStr, tuple } from "./common.js";

const _1 = 1 as const;
const _2 = 2 as const;
const _3 = 3 as const;
const _4 = 4 as const;

describe("Pair", () => {
    specify("get#val", () => {
        const t0 = new Pair(_1, _2).val;
        assert.deepEqual(t0, [_1, _2]);
    });

    specify("#[Eq.eq]", () => {
        fc.assert(
            fc.property(
                arbNum(),
                arbNum(),
                arbNum(),
                arbNum(),
                (a, x, b, y) => {
                    const t0 = eq(new Pair(a, x), new Pair(b, y));
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
                    const t0 = cmp(new Pair(a, x), new Pair(b, y));
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
                    const t0 = cmb(new Pair(a, x), new Pair(b, y));
                    assert.deepEqual(t0, new Pair(cmb(a, b), cmb(x, y)));
                },
            ),
        );
    });

    specify("#bimap", () => {
        const t0 = new Pair(_1, _2).bimap(
            (x) => tuple(x, _3),
            (x) => tuple(x, _4),
        );
        assert.deepEqual(t0, new Pair([_1, _3] as const, [_2, _4] as const));
    });

    specify("#lmap", () => {
        const t0 = new Pair(_1, _2).lmap((x) => tuple(x, _3));
        assert.deepEqual(t0, new Pair([_1, _3] as const, _2));
    });

    specify("#map", () => {
        const t0 = new Pair(_1, _2).map((x) => tuple(x, _4));
        assert.deepEqual(t0, new Pair(_1, [_2, _4] as const));
    });
});
