import { expect } from "chai";
import * as fc from "fast-check";
import { cmb, Semigroup } from "../src/cmb.js";
import { Eq, eq } from "../src/cmp.js";
import { Eval } from "../src/eval.js";
import { arbStr, expectLawfulSemigroup, tuple } from "./util.js";

describe("eval.js", () => {
    describe("Eval", () => {
        describe("now", () => {
            it("constructs an Eval eagerly from the the value", () => {
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

        describe("defer", () => {
            it("constructs an Eval lazily from the function", () => {
                const ev = Eval.defer(() => Eval.now<1>(1));
                const outcome = ev.run();
                expect(outcome).to.equal(1);
            });
        });

        describe("go", () => {
            it("constructs an Eval using the generator comprehension", () => {
                const ev = Eval.go(function* () {
                    const x = yield* Eval.now<1>(1);
                    const [y, z] = yield* Eval.now(tuple<[1, 2]>(x, 2));
                    return tuple(x, y, z);
                });
                const outcome = ev.run();
                expect(outcome).to.deep.equal([1, 1, 2]);
            });
        });

        describe("goFn", () => {
            it("accesses the parameters of the generator function", () => {
                const f = Eval.goFn(function* <A>(w: A) {
                    const x = yield* Eval.now<1>(1);
                    const [y, z] = yield* Eval.now(tuple<[1, 2]>(x, 2));
                    return tuple(w, x, y, z);
                });
                const ev = f<0>(0);
                const outcome = ev.run();
                expect(outcome).to.deep.equal([0, 1, 1, 2]);
            });
        });

        describe("reduce", () => {
            it("reduces the finite iterable from left to right in the context of Eval", () => {
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
            it("turns the array or the tuple literal of Eval elements inside out", () => {
                const inputs: [Eval<1>, Eval<2>] = [Eval.now(1), Eval.now(2)];
                const ev = Eval.collect(inputs);
                const outcome = ev.run();
                expect(outcome).to.deep.equal([1, 2]);
            });
        });

        describe("gather", () => {
            it("turns the record or the object literal of Eval elements inside out", () => {
                const ev = Eval.gather({
                    x: Eval.now<1>(1),
                    y: Eval.now<2>(2),
                });
                const outcome = ev.run();
                expect(outcome).to.deep.equal({ x: 1, y: 2 });
            });
        });

        describe("lift", () => {
            it("lifts the function into the context of Eval", () => {
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

            it("implements a lawful semigroup", () => {
                class RunEval<out A> {
                    constructor(readonly val: Eval<A>) {}

                    [Eq.eq]<A extends Eq<A>>(
                        this: RunEval<A>,
                        that: RunEval<A>,
                    ): boolean {
                        return eq(this.val.run(), that.val.run());
                    }

                    [Semigroup.cmb]<A extends Semigroup<A>>(
                        this: RunEval<A>,
                        that: RunEval<A>,
                    ): RunEval<A> {
                        return new RunEval(cmb(this.val, that.val));
                    }
                }

                function arbRunEval<A>(
                    arb: fc.Arbitrary<A>,
                ): fc.Arbitrary<RunEval<A>> {
                    return arb.chain((x) =>
                        fc
                            .oneof(
                                fc.constant(Eval.now(x)),
                                fc.constant(Eval.once(() => x)),
                                fc.constant(Eval.always(() => x)),
                            )
                            .map((ev) => new RunEval(ev)),
                    );
                }

                expectLawfulSemigroup(arbRunEval(arbStr()));
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
            it("applies the function to the outcomes", () => {
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
