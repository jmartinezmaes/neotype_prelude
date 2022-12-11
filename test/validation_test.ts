import { expect } from "chai";
import * as fc from "fast-check";
import { cmb } from "../src/cmb.js";
import { cmp, eq, Ordering } from "../src/cmp.js";
import { Either } from "../src/either.js";
import { Validation } from "../src/validation.js";
import { arbNum, arbStr, Str, tuple } from "./common.js";

describe("validation.js", () => {
    describe("Validation", () => {
        describe("fromEither", () => {
            it("returns an Err if the input is a Left", () => {
                expect(
                    Validation.fromEither(Either.left<1, 2>(1)),
                ).to.deep.equal(Validation.err(1));
            });

            it("returns an Ok if the input is a Right", () => {
                expect(
                    Validation.fromEither(Either.right<2, 1>(2)),
                ).to.deep.equal(Validation.ok(2));
            });
        });

        specify("collect", () => {
            const inputs: [Validation<Str, 2>, Validation<Str, 4>] = [
                Validation.ok(2),
                Validation.ok(4),
            ];
            const result = Validation.collect(inputs);
            expect(result).to.deep.equal(Validation.ok([2, 4]));
        });

        specify("gather", () => {
            const result = Validation.gather({
                x: Validation.ok<2, Str>(2),
                y: Validation.ok<4, Str>(4),
            });
            expect(result).to.deep.equal(Validation.ok({ x: 2, y: 4 }));
        });

        specify("lift", () => {
            const result = Validation.lift(tuple<[2, 4]>)(
                Validation.ok(2),
                Validation.ok(4),
            );
            expect(result).to.deep.equal(Validation.ok([2, 4]));
        });

        describe("#[Eq.eq]", () => {
            it("compares an Err and an Err by their failures", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), (x, y) => {
                        expect(
                            eq(Validation.err(x), Validation.err(y)),
                        ).to.equal(eq(x, y));
                    }),
                );
            });

            it("compares an Err and an Ok as inequal", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), (x, y) => {
                        expect(eq(Validation.err(x), Validation.ok(y))).to.be
                            .false;
                    }),
                );
            });

            it("compares an Ok and an Err as inequal", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), (x, y) => {
                        expect(eq(Validation.ok(x), Validation.err(y))).to.be
                            .false;
                    }),
                );
            });

            it("compares an Ok and an Ok by their successes", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), (x, y) => {
                        expect(eq(Validation.ok(x), Validation.ok(y))).to.equal(
                            eq(x, y),
                        );
                    }),
                );
            });
        });

        describe("#[Ord.cmp]", () => {
            it("compares an Err and an Err by their failures", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), (x, y) => {
                        expect(
                            cmp(Validation.err(x), Validation.err(y)),
                        ).to.equal(cmp(x, y));
                    }),
                );
            });

            it("compares an Err as less than an Ok", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), (x, y) => {
                        expect(
                            cmp(Validation.err(x), Validation.ok(y)),
                        ).to.equal(Ordering.less);
                    }),
                );
            });

            it("compares an Ok as greater than an Err", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), (x, y) => {
                        expect(
                            cmp(Validation.ok(x), Validation.err(y)),
                        ).to.equal(Ordering.greater);
                    }),
                );
            });

            it("compares an Ok and an Ok by their successes", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), (x, y) => {
                        expect(
                            cmp(Validation.ok(x), Validation.ok(y)),
                        ).to.equal(cmp(x, y));
                    }),
                );
            });
        });

        specify("#[Semigroup.cmb]", () => {
            fc.assert(
                fc.property(arbStr(), arbStr(), (x, y) => {
                    expect(
                        cmb(Validation.ok(x), Validation.ok(y)),
                    ).to.deep.equal(Validation.ok(cmb(x, y)));
                }),
            );
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
            it("applies the first function if the variant is Err", () => {
                const result = Validation.err<1, 2>(1).unwrap(
                    (x): [1, 3] => [x, 3],
                    (x): [2, 4] => [x, 4],
                );
                expect(result).to.deep.equal([1, 3]);
            });

            it("applies the second function if the variant is Ok", () => {
                const result = Validation.ok<2, 1>(2).unwrap(
                    (x): [1, 3] => [x, 3],
                    (x): [2, 4] => [x, 4],
                );
                expect(result).to.deep.equal([2, 4]);
            });
        });

        describe("#zipWith", () => {
            it("combines the failures in a new Err if both values are Err", () => {
                fc.assert(
                    fc.property(arbStr(), arbStr(), (x, y) => {
                        const result = Validation.err<Str, 2>(x).zipWith(
                            Validation.err<Str, 4>(y),
                            tuple,
                        );
                        expect(result).to.deep.equal(Validation.err(cmb(x, y)));
                    }),
                );
            });

            it("returns the first Err if the second value is an Ok", () => {
                fc.assert(
                    fc.property(arbStr(), (x) => {
                        const result = Validation.err<Str, 2>(x).zipWith(
                            Validation.ok<4, Str>(4),
                            tuple,
                        );
                        expect(result).to.deep.equal(Validation.err(x));
                    }),
                );
            });

            it("returns the second Err if the first value is an Ok", () => {
                fc.assert(
                    fc.property(arbStr(), (y) => {
                        const result = Validation.ok<2, Str>(2).zipWith(
                            Validation.err<Str, 4>(y),
                            tuple,
                        );
                        expect(result).to.deep.equal(Validation.err(y));
                    }),
                );
            });

            it("applies the function to the successes if both values are Ok", () => {
                const result = Validation.ok<2, Str>(2).zipWith(
                    Validation.ok<4, Str>(4),
                    tuple,
                );
                expect(result).to.deep.equal(Validation.ok([2, 4]));
            });
        });

        specify("#zipFst", () => {
            const result = Validation.ok<2, Str>(2).zipFst(
                Validation.ok<4, Str>(4),
            );
            expect(result).to.deep.equal(Validation.ok(2));
        });

        specify("#zipSnd", () => {
            const result = Validation.ok<2, Str>(2).zipSnd(
                Validation.ok<4, Str>(4),
            );
            expect(result).to.deep.equal(Validation.ok(4));
        });

        describe("#lmap", () => {
            it("applies the function if the variant is Err", () => {
                const result = Validation.err<1, 2>(1).lmap((x): [1, 3] => [
                    x,
                    3,
                ]);
                expect(result).to.deep.equal(Validation.err([1, 3]));
            });

            it("does not apply the function if the variant is Ok", () => {
                const result = Validation.ok<2, 1>(2).lmap((x): [1, 3] => [
                    x,
                    3,
                ]);
                expect(result).to.deep.equal(Validation.ok(2));
            });
        });

        describe("#map", () => {
            it("does not apply the function if the variant is Err", () => {
                const result = Validation.err<1, 2>(1).map((x): [2, 4] => [
                    x,
                    4,
                ]);
                expect(result).to.deep.equal(Validation.err(1));
            });

            it("applies the function if the variant is Ok", () => {
                const result = Validation.ok<2, 1>(2).map((x): [2, 4] => [
                    x,
                    4,
                ]);
                expect(result).to.deep.equal(Validation.ok([2, 4]));
            });
        });
    });
});
