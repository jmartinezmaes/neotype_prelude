import { expect } from "chai";
import * as fc from "fast-check";
import { cmb } from "../src/cmb.js";
import { cmp, eq, Ordering } from "../src/cmp.js";
import { Either } from "../src/either.js";
import { Validation } from "../src/validation.js";
import {
    arbNum,
    arbStr,
    expectLawfulEq,
    expectLawfulOrd,
    expectLawfulSemigroup,
    Str,
    tuple,
} from "./util.js";

describe("validation.js", () => {
    describe("Validation", () => {
        function arbValidation<E, A>(
            arbErr: fc.Arbitrary<E>,
            arbOk: fc.Arbitrary<A>,
        ): fc.Arbitrary<Validation<E, A>> {
            return fc.oneof(
                arbErr.map(Validation.err),
                arbOk.map(Validation.ok),
            );
        }

        describe("err", () => {
            it("constructs an Err variant", () => {
                const vdn = Validation.err<1, 2>(1);
                expect(vdn).to.be.an.instanceOf(Validation.Err);
                expect(vdn.typ).to.equal(Validation.Typ.ERR);
                expect(vdn.val).to.equal(1);
            });
        });

        describe("ok", () => {
            it("constructs an Ok variant", () => {
                const vdn = Validation.ok<2, 1>(2);
                expect(vdn).to.be.an.instanceOf(Validation.Ok);
                expect(vdn.typ).to.equal(Validation.Typ.OK);
                expect(vdn.val).to.equal(2);
            });
        });

        describe("fromEither", () => {
            it("constructs an Err if the Either is a Left", () => {
                expect(
                    Validation.fromEither(Either.left<1, 2>(1)),
                ).to.deep.equal(Validation.err(1));
            });

            it("constructs an Ok if the Either is a Right", () => {
                expect(
                    Validation.fromEither(Either.right<2, 1>(2)),
                ).to.deep.equal(Validation.ok(2));
            });
        });

        describe("collect", () => {
            it("turns the array or the tuple literal of Validation elements inside out", () => {
                const inputs: [Validation<Str, 2>, Validation<Str, 4>] = [
                    Validation.ok(2),
                    Validation.ok(4),
                ];
                const vdn = Validation.collect(inputs);
                expect(vdn).to.deep.equal(Validation.ok([2, 4]));
            });
        });

        describe("gather", () => {
            it("turns the record or the object literal of Validation elements inside out", () => {
                const vdn = Validation.gather({
                    x: Validation.ok<2, Str>(2),
                    y: Validation.ok<4, Str>(4),
                });
                expect(vdn).to.deep.equal(Validation.ok({ x: 2, y: 4 }));
            });
        });

        describe("lift", () => {
            it("lifts the function into the context of Validation", () => {
                const vdn = Validation.lift(tuple<[2, 4]>)(
                    Validation.ok(2),
                    Validation.ok(4),
                );
                expect(vdn).to.deep.equal(Validation.ok([2, 4]));
            });
        });

        describe("#[Eq.eq]", () => {
            it("compares the failures if both variants are Err", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), (x, y) => {
                        expect(
                            eq(Validation.err(x), Validation.err(y)),
                        ).to.equal(eq(x, y));
                    }),
                );
            });

            it("compares any Err and any Ok as inequal", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), (x, y) => {
                        expect(eq(Validation.err(x), Validation.ok(y))).to.be
                            .false;
                    }),
                );
            });

            it("compares any Ok and any Err as inequal", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), (x, y) => {
                        expect(eq(Validation.ok(x), Validation.err(y))).to.be
                            .false;
                    }),
                );
            });

            it("compares the successes if both variants are Ok", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), (x, y) => {
                        expect(eq(Validation.ok(x), Validation.ok(y))).to.equal(
                            eq(x, y),
                        );
                    }),
                );
            });

            it("implements a lawful equivalence relation", () => {
                expectLawfulEq(arbValidation(arbNum(), arbNum()));
            });
        });

        describe("#[Ord.cmp]", () => {
            it("compares the failures if both variants are Err", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), (x, y) => {
                        expect(
                            cmp(Validation.err(x), Validation.err(y)),
                        ).to.equal(cmp(x, y));
                    }),
                );
            });

            it("compares any Err as less than any Ok", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), (x, y) => {
                        expect(
                            cmp(Validation.err(x), Validation.ok(y)),
                        ).to.equal(Ordering.less);
                    }),
                );
            });

            it("compares any Ok as greater than any Err", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), (x, y) => {
                        expect(
                            cmp(Validation.ok(x), Validation.err(y)),
                        ).to.equal(Ordering.greater);
                    }),
                );
            });

            it("compares the successes if both variants are Ok", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), (x, y) => {
                        expect(
                            cmp(Validation.ok(x), Validation.ok(y)),
                        ).to.equal(cmp(x, y));
                    }),
                );
            });

            it("implements a lawful total order", () => {
                expectLawfulOrd(arbValidation(arbNum(), arbNum()));
            });
        });

        describe("#[Semigroup.cmb]", () => {
            it("combines the successes if both variants are Ok", () => {
                fc.assert(
                    fc.property(arbStr(), arbStr(), (x, y) => {
                        expect(
                            cmb(Validation.ok(x), Validation.ok(y)),
                        ).to.deep.equal(Validation.ok(cmb(x, y)));
                    }),
                );
            });

            it("implements a lawful semigroup", () => {
                expectLawfulSemigroup(arbValidation(arbStr(), arbStr()));
            });
        });

        describe("#isErr", () => {
            it("returns true if the variant is Err", () => {
                expect(Validation.err<1, 2>(1).isErr()).to.be.true;
            });

            it("returns false if the variant is Ok", () => {
                expect(Validation.ok<2, 1>(2).isErr()).to.be.false;
            });
        });

        describe("#isOk", () => {
            it("returns false if the variant is Err", () => {
                expect(Validation.err<1, 2>(1).isOk()).to.be.false;
            });

            it("returns true if the variant is Ok", () => {
                expect(Validation.ok<2, 1>(2).isOk()).to.be.true;
            });
        });

        describe("#unwrap", () => {
            it("applies the first function to the failure if the variant is Err", () => {
                const vdn = Validation.err<1, 2>(1).unwrap(
                    (x): [1, 3] => [x, 3],
                    (x): [2, 4] => [x, 4],
                );
                expect(vdn).to.deep.equal([1, 3]);
            });

            it("applies the second function to the success if the variant is Ok", () => {
                const vdn = Validation.ok<2, 1>(2).unwrap(
                    (x): [1, 3] => [x, 3],
                    (x): [2, 4] => [x, 4],
                );
                expect(vdn).to.deep.equal([2, 4]);
            });
        });

        describe("#zipWith", () => {
            it("combines the failures if both variants are Err", () => {
                const vdn = Validation.err<Str, 2>(new Str("a")).zipWith(
                    Validation.err<Str, 4>(new Str("b")),
                    tuple,
                );
                expect(vdn).to.deep.equal(Validation.err(new Str("ab")));
            });

            it("returns the first Err if the second variant is Ok", () => {
                const vdn = Validation.err<Str, 2>(new Str("a")).zipWith(
                    Validation.ok<4, Str>(4),
                    tuple,
                );
                expect(vdn).to.deep.equal(Validation.err(new Str("a")));
            });

            it("returns the second Err if the first variant is Ok", () => {
                const vdn = Validation.ok<2, Str>(2).zipWith(
                    Validation.err<Str, 4>(new Str("b")),
                    tuple,
                );
                expect(vdn).to.deep.equal(Validation.err(new Str("b")));
            });

            it("applies the function to the successes if both variants are Ok", () => {
                const vdn = Validation.ok<2, Str>(2).zipWith(
                    Validation.ok<4, Str>(4),
                    tuple,
                );
                expect(vdn).to.deep.equal(Validation.ok([2, 4]));
            });
        });

        describe("#zipFst", () => {
            it("keeps only the first success if both variants are Ok", () => {
                const vdn = Validation.ok<2, Str>(2).zipFst(
                    Validation.ok<4, Str>(4),
                );
                expect(vdn).to.deep.equal(Validation.ok(2));
            });
        });

        describe("#zipSnd", () => {
            it("keeps only the second success if both variants are Ok", () => {
                const vdn = Validation.ok<2, Str>(2).zipSnd(
                    Validation.ok<4, Str>(4),
                );
                expect(vdn).to.deep.equal(Validation.ok(4));
            });
        });

        describe("#lmap", () => {
            it("applies the function to the failure if the variant is Err", () => {
                const vdn = Validation.err<1, 2>(1).lmap((x): [1, 3] => [x, 3]);
                expect(vdn).to.deep.equal(Validation.err([1, 3]));
            });

            it("does not apply the function if the variant is Ok", () => {
                const vdn = Validation.ok<2, 1>(2).lmap((x): [1, 3] => [x, 3]);
                expect(vdn).to.deep.equal(Validation.ok(2));
            });
        });

        describe("#map", () => {
            it("does not apply the function if the variant is Err", () => {
                const vdn = Validation.err<1, 2>(1).map((x): [2, 4] => [x, 4]);
                expect(vdn).to.deep.equal(Validation.err(1));
            });

            it("applies the function to the success if the variant is Ok", () => {
                const vdn = Validation.ok<2, 1>(2).map((x): [2, 4] => [x, 4]);
                expect(vdn).to.deep.equal(Validation.ok([2, 4]));
            });
        });
    });
});
