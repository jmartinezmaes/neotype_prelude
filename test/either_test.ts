import { expect } from "chai";
import * as fc from "fast-check";
import { cmb } from "../src/cmb.js";
import { cmp, eq, Ordering } from "../src/cmp.js";
import { Either } from "../src/either.js";
import { Validation } from "../src/validation.js";
import { arbNum, arbStr, tuple } from "./util.js";

describe("either.js", () => {
    describe("Either", () => {
        describe("left", () => {
            it("constructs a Left variant", () => {
                const either = Either.left<1, 2>(1);
                expect(either).to.be.an.instanceOf(Either.Left);
                expect(either.typ).to.equal(Either.Typ.Left);
                expect(either.val).to.equal(1);
            });
        });

        describe("right", () => {
            it("constructs a Right variant", () => {
                const either = Either.right<2, 1>(2);
                expect(either).to.be.an.instanceOf(Either.Right);
                expect(either.typ).to.equal(Either.Typ.Right);
                expect(either.val).to.equal(2);
            });
        });

        describe("fromValidation", () => {
            it("constructs a Left if the Validation is an Err", () => {
                const either = Either.fromValidation(Validation.err<1, 2>(1));
                expect(either).to.deep.equal(Either.left(1));
            });

            it("constructs a Right if the Validation is an Ok", () => {
                const either = Either.fromValidation(Validation.ok<2, 1>(2));
                expect(either).to.deep.equal(Either.right(2));
            });
        });

        describe("go", () => {
            it("short-cicruits on the first yielded Left", () => {
                const either = Either.go(function* () {
                    const x = yield* Either.right<2, 1>(2);
                    const y = yield* Either.left<[2, 3], 4>([x, 3]);
                    return tuple(x, y);
                });
                expect(either).to.deep.equal(Either.left([2, 3]));
            });

            it("completes if all yielded values are Right", () => {
                const either = Either.go(function* () {
                    const x = yield* Either.right<2, 1>(2);
                    const [y, z] = yield* Either.right<[2, 4], 3>([x, 4]);
                    return tuple(x, y, z);
                });
                expect(either).to.deep.equal(Either.right([2, 2, 4]));
            });
        });

        describe("reduce", () => {
            it("reduces the finite iterable from left to right in the context of Either", () => {
                const either = Either.reduce(
                    ["x", "y"],
                    (xs, x) => Either.right<string, 1>(xs + x),
                    "",
                );
                expect(either).to.deep.equal(Either.right("xy"));
            });
        });

        describe("collect", () => {
            it("turns the array or the tuple literal of Either elements inside out", () => {
                const inputs: [Either<1, 2>, Either<3, 4>] = [
                    Either.right(2),
                    Either.right(4),
                ];
                const either = Either.collect(inputs);
                expect(either).to.deep.equal(Either.right([2, 4]));
            });
        });

        describe("gather", () => {
            it("turns the record or the object literal of Either elements inside out", () => {
                const either = Either.gather({
                    x: Either.right<2, 1>(2),
                    y: Either.right<4, 3>(4),
                });
                expect(either).to.deep.equal(Either.right({ x: 2, y: 4 }));
            });
        });

        describe("lift", () => {
            it("lifts the function into the context of Either", () => {
                const either = Either.lift(tuple<[2, 4]>)(
                    Either.right<2, 1>(2),
                    Either.right<4, 3>(4),
                );
                expect(either).to.deep.equal(Either.right([2, 4]));
            });
        });

        describe("goAsync", () => {
            it("short-circuits on the first yielded Left", async () => {
                const either = await Either.goAsync(async function* () {
                    const x = yield* await Promise.resolve(
                        Either.right<2, 1>(2),
                    );
                    const y = yield* await Promise.resolve(
                        Either.left<[2, 3], 4>([x, 3]),
                    );
                    return tuple(x, y);
                });
                expect(either).to.deep.equal(Either.left([2, 3]));
            });

            it("completes and returns if all yielded values are Right", async () => {
                const either = await Either.goAsync(async function* () {
                    const x = yield* await Promise.resolve(
                        Either.right<2, 1>(2),
                    );
                    const [y, z] = yield* await Promise.resolve(
                        Either.right<[2, 4], 3>([x, 4]),
                    );
                    return tuple(x, y, z);
                });
                expect(either).to.deep.equal(Either.right([2, 2, 4]));
            });

            it("unwraps Promises in Right variants and in return", async () => {
                const either = await Either.goAsync(async function* () {
                    const x = yield* await Promise.resolve(
                        Either.right<Promise<2>, 1>(Promise.resolve(2)),
                    );
                    const [y, z] = yield* await Promise.resolve(
                        Either.right<Promise<[2, 4]>, 3>(
                            Promise.resolve([x, 4]),
                        ),
                    );
                    return Promise.resolve(tuple(x, y, z));
                });
                expect(either).to.deep.equal(Either.right([2, 2, 4]));
            });
        });

        describe("#[Eq.eq]", () => {
            it("compares the values if both variants are Left", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), (x, y) => {
                        expect(eq(Either.left(x), Either.left(y))).to.equal(
                            eq(x, y),
                        );
                    }),
                );
            });

            it("compares any Left and any Right as inequal", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), (x, y) => {
                        expect(eq(Either.left(x), Either.right(y))).to.be.false;
                    }),
                );
            });

            it("compares any Right and any Left as inequal", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), (x, y) => {
                        expect(eq(Either.right(x), Either.left(y))).to.be.false;
                    }),
                );
            });

            it("compares the values if both variants are Right", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), (x, y) => {
                        expect(eq(Either.right(x), Either.right(y))).to.equal(
                            eq(x, y),
                        );
                    }),
                );
            });
        });

        describe("#[Ord.cmp]", () => {
            it("compares the values if both variants are Left", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), (x, y) => {
                        expect(cmp(Either.left(x), Either.left(y))).to.equal(
                            cmp(x, y),
                        );
                    }),
                );
            });

            it("compares any Left as less than any Right", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), (x, y) => {
                        expect(cmp(Either.left(x), Either.right(y))).to.equal(
                            Ordering.less,
                        );
                    }),
                );
            });

            it("compares any Right as greater than any Left", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), (x, y) => {
                        expect(cmp(Either.right(x), Either.left(y))).to.equal(
                            Ordering.greater,
                        );
                    }),
                );
            });

            it("compares the values if both variants are Right", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), (x, y) => {
                        expect(cmp(Either.right(x), Either.right(y))).to.equal(
                            cmp(x, y),
                        );
                    }),
                );
            });
        });

        describe("#[Semigroup.cmb]", () => {
            it("combines the values if both variants are Right", () => {
                fc.assert(
                    fc.property(arbStr(), arbStr(), (x, y) => {
                        expect(
                            cmb(Either.right(x), Either.right(y)),
                        ).to.deep.equal(Either.right(cmb(x, y)));
                    }),
                );
            });
        });

        describe("#isLeft", () => {
            it("returns true if the variant is Left", () => {
                expect(Either.left<1, 2>(1).isLeft()).to.be.true;
            });

            it("returns false if the variant is Right", () => {
                expect(Either.right<2, 1>(2).isLeft()).to.be.false;
            });
        });

        describe("#isRight", () => {
            it("returns false if the variant is Left", () => {
                expect(Either.left<1, 2>(1).isRight()).to.be.false;
            });

            it("returns true if the variant is Right", () => {
                expect(Either.right<2, 1>(2).isRight()).to.be.true;
            });
        });

        describe("#unwrap", () => {
            it("applies the first function to the value if the variant is Left", () => {
                const either = Either.left<1, 2>(1).unwrap(
                    (x): [1, 3] => [x, 3],
                    (x): [2, 4] => [x, 4],
                );
                expect(either).to.deep.equal([1, 3]);
            });

            it("applies the second function to the value if the variant is Right", () => {
                const either = Either.right<2, 1>(2).unwrap(
                    (x): [1, 3] => [x, 3],
                    (x): [2, 4] => [x, 4],
                );
                expect(either).to.deep.equal([2, 4]);
            });
        });

        describe("#recover", () => {
            it("applies the continuation to the failure if the variant is Left", () => {
                const either = Either.left<1, 2>(1).recover(
                    (x): Either<[1, 3], 4> => Either.left([x, 3]),
                );
                expect(either).to.deep.equal(Either.left([1, 3]));
            });

            it("does not apply the continuation if the variant is Right", () => {
                const either = Either.right<2, 1>(2).recover(
                    (x): Either<[1, 3], 4> => Either.left([x, 3]),
                );
                expect(either).to.deep.equal(Either.right(2));
            });
        });

        describe("#flatMap", () => {
            it("does not apply the continuation if the variant is Left", () => {
                const either = Either.left<1, 2>(1).flatMap(
                    (x): Either<3, [2, 4]> => Either.right([x, 4]),
                );
                expect(either).to.deep.equal(Either.left(1));
            });

            it("applies the continuation to the success if the variant is Right", () => {
                const either = Either.right<2, 1>(2).flatMap(
                    (x): Either<3, [2, 4]> => Either.right([x, 4]),
                );
                expect(either).to.deep.equal(Either.right([2, 4]));
            });
        });

        describe("#zipWith", () => {
            it("applies the function to the successes if both variants are Right", () => {
                const either = Either.right<2, 1>(2).zipWith(
                    Either.right<4, 3>(4),
                    tuple,
                );
                expect(either).to.deep.equal(Either.right([2, 4]));
            });
        });

        describe("#zipFst", () => {
            it("keeps only the first success if both variants are Right", () => {
                const either = Either.right<2, 1>(2).zipFst(
                    Either.right<4, 3>(4),
                );
                expect(either).to.deep.equal(Either.right(2));
            });
        });

        describe("#zipSnd", () => {
            it("keeps only the second success if both variants are Right", () => {
                const either = Either.right<2, 1>(2).zipSnd(
                    Either.right<4, 3>(4),
                );
                expect(either).to.deep.equal(Either.right(4));
            });
        });

        describe("#lmap", () => {
            it("applies the function to the value if the variant is Left", () => {
                const either = Either.left<1, 2>(1).lmap((x): [1, 3] => [x, 3]);
                expect(either).to.deep.equal(Either.left([1, 3]));
            });
        });

        describe("#map", () => {
            it("applies the function to the value if the variant is Right", () => {
                const either = Either.right<2, 1>(2).map((x): [2, 4] => [x, 4]);
                expect(either).to.deep.equal(Either.right([2, 4]));
            });
        });
    });
});
