import { expect } from "chai";
import * as fc from "fast-check";
import { cmb } from "../src/cmb.js";
import { cmp, eq, Ordering } from "../src/cmp.js";
import { Either } from "../src/either.js";
import { Validation } from "../src/validation.js";
import { arbNum, arbStr, tuple } from "./common.js";

describe("either.js", () => {
    describe("Either", () => {
        describe("fromValidation", () => {
            it("returns a Left if the input is an Err", () => {
                const result = Either.fromValidation(Validation.err<1, 2>(1));
                expect(result).to.deep.equal(Either.left(1));
            });

            it("returns a Right if the input is an Ok", () => {
                const result = Either.fromValidation(Validation.ok<2, 1>(2));
                expect(result).to.deep.equal(Either.right(2));
            });
        });

        describe("go", () => {
            it("short-cicruits on the first yielded Left", () => {
                const result = Either.go(function* () {
                    const x = yield* Either.right<2, 1>(2);
                    const y = yield* Either.left<[2, 3], 4>([x, 3]);
                    return tuple(x, y);
                });
                expect(result).to.deep.equal(Either.left([2, 3]));
            });

            it("completes if all yielded values are Right", () => {
                const result = Either.go(function* () {
                    const x = yield* Either.right<2, 1>(2);
                    const [y, z] = yield* Either.right<[2, 4], 3>([x, 4]);
                    return tuple(x, y, z);
                });
                expect(result).to.deep.equal(Either.right([2, 2, 4]));
            });
        });

        specify("reduce", () => {
            const result = Either.reduce(
                ["x", "y"],
                (xs, x) => Either.right<string, 1>(xs + x),
                "",
            );
            expect(result).to.deep.equal(Either.right("xy"));
        });

        specify("collect", () => {
            const inputs: [Either<1, 2>, Either<3, 4>] = [
                Either.right(2),
                Either.right(4),
            ];
            const result = Either.collect(inputs);
            expect(result).to.deep.equal(Either.right([2, 4]));
        });

        specify("gather", () => {
            const result = Either.gather({
                x: Either.right<2, 1>(2),
                y: Either.right<4, 3>(4),
            });
            expect(result).to.deep.equal(Either.right({ x: 2, y: 4 }));
        });

        specify("lift", () => {
            const result = Either.lift(tuple<[2, 4]>)(
                Either.right<2, 1>(2),
                Either.right<4, 3>(4),
            );
            expect(result).to.deep.equal(Either.right([2, 4]));
        });

        describe("goAsync", () => {
            it("short-circuits on the first yielded Left", async () => {
                const result = await Either.goAsync(async function* () {
                    const x = yield* await Promise.resolve(
                        Either.right<2, 1>(2),
                    );
                    const y = yield* await Promise.resolve(
                        Either.left<[2, 3], 4>([x, 3]),
                    );
                    return tuple(x, y);
                });
                expect(result).to.deep.equal(Either.left([2, 3]));
            });

            it("completes and returns if all yielded values are Right", async () => {
                const result = await Either.goAsync(async function* () {
                    const x = yield* await Promise.resolve(
                        Either.right<2, 1>(2),
                    );
                    const [y, z] = yield* await Promise.resolve(
                        Either.right<[2, 4], 3>([x, 4]),
                    );
                    return tuple(x, y, z);
                });
                expect(result).to.deep.equal(Either.right([2, 2, 4]));
            });

            it("unwraps Promises in Right variants and in return", async () => {
                const result = await Either.goAsync(async function* () {
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
                expect(result).to.deep.equal(Either.right([2, 2, 4]));
            });
        });

        describe("#[Eq.eq]", () => {
            it("compares a Left and a Left by their values", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), (x, y) => {
                        expect(eq(Either.left(x), Either.left(y))).to.equal(
                            eq(x, y),
                        );
                    }),
                );
            });

            it("compares a Left and a Right as inequal", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), (x, y) => {
                        expect(eq(Either.left(x), Either.right(y))).to.be.false;
                    }),
                );
            });

            it("compares a Right and a Left as inequal", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), (x, y) => {
                        expect(eq(Either.right(x), Either.left(y))).to.be.false;
                    }),
                );
            });

            it("compares a Right and a Right by their values", () => {
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
            it("compares a Left and a Left by their values", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), (x, y) => {
                        expect(cmp(Either.left(x), Either.left(y))).to.equal(
                            cmp(x, y),
                        );
                    }),
                );
            });

            it("compares a Left as less than a Right", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), (x, y) => {
                        expect(cmp(Either.left(x), Either.right(y))).to.equal(
                            Ordering.less,
                        );
                    }),
                );
            });

            it("compares a Right as greater than a Left", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), (x, y) => {
                        expect(cmp(Either.right(x), Either.left(y))).to.equal(
                            Ordering.greater,
                        );
                    }),
                );
            });

            it("compares a Right and a Right by thier values", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), (x, y) => {
                        expect(cmp(Either.right(x), Either.right(y))).to.equal(
                            cmp(x, y),
                        );
                    }),
                );
            });
        });

        specify("#[Semigroup.cmb]", () => {
            fc.assert(
                fc.property(arbStr(), arbStr(), (x, y) => {
                    expect(cmb(Either.right(x), Either.right(y))).to.deep.equal(
                        Either.right(cmb(x, y)),
                    );
                }),
            );
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
            it("applies the first function if the variant is Left", () => {
                const result = Either.left<1, 2>(1).unwrap(
                    (x): [1, 3] => [x, 3],
                    (x): [2, 4] => [x, 4],
                );
                expect(result).to.deep.equal([1, 3]);
            });

            it("applies the second function if the variant is Right", () => {
                const result = Either.right<2, 1>(2).unwrap(
                    (x): [1, 3] => [x, 3],
                    (x): [2, 4] => [x, 4],
                );
                expect(result).to.deep.equal([2, 4]);
            });
        });

        describe("#recover", () => {
            it("applies the continuation if the variant is Left", () => {
                const result = Either.left<1, 2>(1).recover(
                    (x): Either<[1, 3], 4> => Either.left([x, 3]),
                );
                expect(result).to.deep.equal(Either.left([1, 3]));
            });

            it("does not apply the continuation if the variant is Right", () => {
                const result = Either.right<2, 1>(2).recover(
                    (x): Either<[1, 3], 4> => Either.left([x, 3]),
                );
                expect(result).to.deep.equal(Either.right(2));
            });
        });

        describe("#flatMap", () => {
            it("does not apply the continuation if the variant is Left", () => {
                const result = Either.left<1, 2>(1).flatMap(
                    (x): Either<3, [2, 4]> => Either.right([x, 4]),
                );
                expect(result).to.deep.equal(Either.left(1));
            });

            it("applies the continuation if the variant is Right", () => {
                const result = Either.right<2, 1>(2).flatMap(
                    (x): Either<3, [2, 4]> => Either.right([x, 4]),
                );
                expect(result).to.deep.equal(Either.right([2, 4]));
            });
        });

        specify("#zipWith", () => {
            const result = Either.right<2, 1>(2).zipWith(
                Either.right<4, 3>(4),
                tuple,
            );
            expect(result).to.deep.equal(Either.right([2, 4]));
        });

        specify("#zipFst", () => {
            const result = Either.right<2, 1>(2).zipFst(Either.right<4, 3>(4));
            expect(result).to.deep.equal(Either.right(2));
        });

        specify("#zipSnd", () => {
            const result = Either.right<2, 1>(2).zipSnd(Either.right<4, 3>(4));
            expect(result).to.deep.equal(Either.right(4));
        });

        specify("#lmap", () => {
            const result = Either.left<1, 2>(1).lmap((x): [1, 3] => [x, 3]);
            expect(result).to.deep.equal(Either.left([1, 3]));
        });

        specify("#map", () => {
            const result = Either.right<2, 1>(2).map((x): [2, 4] => [x, 4]);
            expect(result).to.deep.equal(Either.right([2, 4]));
        });
    });
});
