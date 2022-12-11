import { expect } from "chai";
import * as fc from "fast-check";
import { cmb } from "../src/cmb.js";
import { Eval } from "../src/eval.js";
import { arbStr, tuple } from "./common.js";

describe("eval.js", () => {
    describe("Eval", () => {
        specify("once", () => {
            function f(): 1 {
                f.counter++;
                return 1;
            }
            f.counter = 0;

            const evOnce = Eval.once(f);

            const result = evOnce.zipWith(evOnce, tuple);
            expect(result.run()).to.deep.equal([1, 1]);
            expect(f.counter).to.equal(1);
        });

        specify("always", () => {
            function f(): 1 {
                f.counter++;
                return 1;
            }
            f.counter = 0;

            const evAlways = Eval.always(f);

            const result = evAlways.zipWith(evAlways, tuple);
            expect(result.run()).to.deep.equal([1, 1]);
            expect(f.counter).to.equal(2);
        });

        specify("go", () => {
            const result = Eval.go(function* () {
                const x = yield* Eval.now<1>(1);
                const [y, z] = yield* Eval.now(tuple<[1, 2]>(x, 2));
                return tuple(x, y, z);
            });
            expect(result.run()).to.deep.equal([1, 1, 2]);
        });

        specify("reduce", () => {
            const result = Eval.reduce(
                ["x", "y"],
                (xs, x) => Eval.now(xs + x),
                "",
            );
            expect(result.run()).to.equal("xy");
        });

        specify("collect", () => {
            const inputs: [Eval<1>, Eval<2>] = [Eval.now(1), Eval.now(2)];
            const result = Eval.collect(inputs);
            expect(result.run()).to.deep.equal([1, 2]);
        });

        specify("gather", () => {
            const result = Eval.gather({
                x: Eval.now<1>(1),
                y: Eval.now<2>(2),
            });
            expect(result.run()).to.deep.equal({ x: 1, y: 2 });
        });

        specify("lift", () => {
            const result = Eval.lift(tuple)(Eval.now<1>(1), Eval.now<2>(2));
            expect(result.run()).to.deep.equal([1, 2]);
        });

        specify("#[Semigroup.cmb]", () => {
            fc.assert(
                fc.property(arbStr(), arbStr(), (x, y) => {
                    expect(cmb(Eval.now(x), Eval.now(y)).run()).to.deep.equal(
                        cmb(x, y),
                    );
                }),
            );
        });

        specify("#flatMap", () => {
            const result = Eval.now<1>(1).flatMap(
                (x): Eval<[1, 2]> => Eval.now([x, 2]),
            );
            expect(result.run()).to.deep.equal([1, 2]);
        });

        specify("#zipWith", () => {
            const result = Eval.now<1>(1).zipWith(Eval.now<2>(2), tuple);
            expect(result.run()).to.deep.equal([1, 2]);
        });

        specify("#zipFst", () => {
            const result = Eval.now<1>(1).zipFst(Eval.now<2>(2));
            expect(result.run()).to.equal(1);
        });

        specify("#zipSnd", () => {
            const result = Eval.now<1>(1).zipSnd(Eval.now<2>(2));
            expect(result.run()).to.equal(2);
        });

        specify("#map", () => {
            const result = Eval.now<1>(1).map((x): [1, 2] => tuple(x, 2));
            expect(result.run()).to.deep.equal([1, 2]);
        });
    });
});
