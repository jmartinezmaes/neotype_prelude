import { expect } from "chai";
import * as fc from "fast-check";
import { cmb } from "../src/cmb.js";
import { Eval } from "../src/eval.js";
import { arbStr, tuple } from "./util.js";

describe("eval.js", () => {
    describe("Eval", () => {
        describe("now", () => {
            it("constructs an Eval from an eager value", () => {
                const ev = Eval.now<1>(1);
                const outcome = ev.run();
                expect(outcome).to.equal(1);
            });
        });

        describe("once", () => {
            it("constructs an Eval that evaluates the thunk at most once", () => {
                function f(): 1 {
                    f.counter++;
                    return 1;
                }
                f.counter = 0;

                const once = Eval.once(f);
                const ev = once.zipWith(once, tuple);
                const outcome = ev.run();
                expect(outcome).to.deep.equal([1, 1]);
                expect(f.counter).to.equal(1);
            });
        });

        describe("always", () => {
            it("constructs an Eval that evaluates the thunk on every reference", () => {
                function f(): 1 {
                    f.counter++;
                    return 1;
                }
                f.counter = 0;

                const always = Eval.always(f);
                const ev = always.zipWith(always, tuple);
                const outcome = ev.run();
                expect(outcome).to.deep.equal([1, 1]);
                expect(f.counter).to.equal(2);
            });
        });

        describe("go", () => {
            it("constructs an Eval using a generator comprehension", () => {
                const ev = Eval.go(function* () {
                    const x = yield* Eval.now<1>(1);
                    const [y, z] = yield* Eval.now(tuple<[1, 2]>(x, 2));
                    return tuple(x, y, z);
                });
                const outcome = ev.run();
                expect(outcome).to.deep.equal([1, 1, 2]);
            });
        });

        describe("reduce", () => {
            it("reduces a finite iterable from left to right in the context of Eval", () => {
                const ev = Eval.reduce(
                    ["x", "y"],
                    (xs, x) => Eval.now(xs + x),
                    "",
                );
                const outcome = ev.run();
                expect(outcome).to.equal("xy");
            });
        });

        describe("collect", () => {
            it("turns an array or a tuple literal of Eval elements inside out", () => {
                const inputs: [Eval<1>, Eval<2>] = [Eval.now(1), Eval.now(2)];
                const ev = Eval.collect(inputs);
                const outcome = ev.run();
                expect(outcome).to.deep.equal([1, 2]);
            });
        });

        describe("gather", () => {
            it("turns a record or an object literal of Eval elements inside out", () => {
                const ev = Eval.gather({
                    x: Eval.now<1>(1),
                    y: Eval.now<2>(2),
                });
                const outcome = ev.run();
                expect(outcome).to.deep.equal({ x: 1, y: 2 });
            });
        });

        describe("lift", () => {
            it("lifts a function into the context of Eval", () => {
                const ev = Eval.lift(tuple)(Eval.now<1>(1), Eval.now<2>(2));
                const outcome = ev.run();
                expect(outcome).to.deep.equal([1, 2]);
            });
        });

        describe("#[Semigroup.cmb]", () => {
            it("combines the outcomes", () => {
                fc.assert(
                    fc.property(arbStr(), arbStr(), (x, y) => {
                        expect(
                            cmb(Eval.now(x), Eval.now(y)).run(),
                        ).to.deep.equal(cmb(x, y));
                    }),
                );
            });
        });

        describe("#flatMap", () => {
            it("applies the continuation to the outcome", () => {
                const ev = Eval.now<1>(1).flatMap(
                    (x): Eval<[1, 2]> => Eval.now([x, 2]),
                );
                const outcome = ev.run();
                expect(outcome).to.deep.equal([1, 2]);
            });
        });

        describe("#zipWith", () => {
            it("appies the function to the outcomes", () => {
                const ev = Eval.now<1>(1).zipWith(Eval.now<2>(2), tuple);
                const outcome = ev.run();
                expect(outcome).to.deep.equal([1, 2]);
            });
        });

        describe("#zipFst", () => {
            it("keeps only the first outcome", () => {
                const ev = Eval.now<1>(1).zipFst(Eval.now<2>(2));
                const outcome = ev.run();
                expect(outcome).to.equal(1);
            });
        });

        describe("#zipSnd", () => {
            it("keeps only the second outcome", () => {
                const ev = Eval.now<1>(1).zipSnd(Eval.now<2>(2));
                const outcome = ev.run();
                expect(outcome).to.equal(2);
            });
        });

        describe("#map", () => {
            it("applies the function to the outcome", () => {
                const ev = Eval.now<1>(1).map((x): [1, 2] => tuple(x, 2));
                const outcome = ev.run();
                expect(outcome).to.deep.equal([1, 2]);
            });
        });
    });
});
