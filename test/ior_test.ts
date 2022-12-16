import { expect } from "chai";
import * as fc from "fast-check";
import { cmb } from "../src/cmb.js";
import { cmp, eq, Ordering } from "../src/cmp.js";
import { Either } from "../src/either.js";
import { Ior } from "../src/ior.js";
import { Validation } from "../src/validation.js";
import { arbNum, arbStr, Str, tuple } from "./common.js";

describe("ior.js", () => {
    describe("Ior", () => {
        describe("fromEither", () => {
            it("returns a Left if the input is a Left", () => {
                const result = Ior.fromEither(Either.left<1, 2>(1));
                expect(result).to.deep.equal(Ior.left(1));
            });

            it("returns a Right if the input is a Right", () => {
                const result = Ior.fromEither(Either.right<2, 1>(2));
                expect(result).to.deep.equal(Ior.right(2));
            });
        });

        describe("fromValidation", () => {
            it("returns a Left if the input is an Err", () => {
                const result = Ior.fromValidation(Validation.err<1, 2>(1));
                expect(result).to.deep.equal(Ior.left(1));
            });

            it("returns a Right if the input is an Ok", () => {
                const result = Ior.fromValidation(Validation.ok<2, 1>(2));
                expect(result).to.deep.equal(Ior.right(2));
            });
        });

        describe("go", () => {
            it("short-circuits on the first yielded Left", () => {
                fc.assert(
                    fc.property(arbStr(), (b) => {
                        const result = Ior.go(function* () {
                            const x = yield* Ior.right<2, Str>(2);
                            expect(x).to.equal(2);
                            const [y, z] = yield* Ior.left<Str, [2, 4]>(b);
                            return tuple(x, y, z);
                        });
                        expect(result).to.deep.equal(Ior.left(b));
                    }),
                );
            });

            it("completes if all yielded values are Right", () => {
                const result = Ior.go(function* () {
                    const x = yield* Ior.right<2, Str>(2);
                    const [y, z] = yield* Ior.right<[2, 4], Str>([x, 4]);
                    return tuple(x, y, z);
                });
                expect(result).to.deep.equal(Ior.right([2, 2, 4]));
            });

            it("completes and retains the left-hand value if a Both is yielded after a Right", () => {
                fc.assert(
                    fc.property(arbStr(), (b) => {
                        const result = Ior.go(function* () {
                            const x = yield* Ior.right<2, Str>(2);
                            const [y, z] = yield* Ior.both(
                                b,
                                tuple<[2, 4]>(x, 4),
                            );
                            return tuple(x, y, z);
                        });
                        expect(result).to.deep.equal(Ior.both(b, [2, 2, 4]));
                    }),
                );
            });

            it("short-circuits and combines the left-hand values if a Left is yielded after a Both", () => {
                fc.assert(
                    fc.property(arbStr(), arbStr(), (a, b) => {
                        const result = Ior.go(function* () {
                            const x = yield* Ior.both<Str, 2>(a, 2);
                            expect(x).to.equal(2);
                            const [y, z] = yield* Ior.left<Str, [2, 4]>(b);
                            return tuple(x, y, z);
                        });
                        expect(result).to.deep.equal(Ior.left(cmb(a, b)));
                    }),
                );
            });

            it("completes and retains the left-hand value if a Right is yielded after a Both", () => {
                fc.assert(
                    fc.property(arbStr(), (a) => {
                        const result = Ior.go(function* () {
                            const x = yield* Ior.both<Str, 2>(a, 2);
                            const [y, z] = yield* Ior.right<[2, 4], Str>([
                                x,
                                4,
                            ]);
                            return tuple(x, y, z);
                        });
                        expect(result).to.deep.equal(Ior.both(a, [2, 2, 4]));
                    }),
                );
            });

            it("completes and combines the left-hand values if a Both is yielded after a Both", () => {
                fc.assert(
                    fc.property(arbStr(), arbStr(), (a, b) => {
                        const result = Ior.go(function* () {
                            const x = yield* Ior.both<Str, 2>(a, 2);
                            const [y, z] = yield* Ior.both(
                                b,
                                tuple<[2, 4]>(x, 4),
                            );
                            return tuple(x, y, z);
                        });
                        expect(result).to.deep.equal(
                            Ior.both(cmb(a, b), [2, 2, 4]),
                        );
                    }),
                );
            });
        });

        specify("reduce", () => {
            fc.assert(
                fc.property(arbStr(), (a) => {
                    const result = Ior.reduce(
                        ["x", "y"],
                        (xs, x) => Ior.both(a, xs + x),
                        "",
                    );
                    expect(result).to.deep.equal(Ior.both(cmb(a, a), "xy"));
                }),
            );
        });

        specify("collect", () => {
            fc.assert(
                fc.property(arbStr(), arbStr(), (a, b) => {
                    const inputs: [Ior<Str, 2>, Ior<Str, 4>] = [
                        Ior.both(a, 2),
                        Ior.both(b, 4),
                    ];
                    const result = Ior.collect(inputs);
                    expect(result).to.deep.equal(Ior.both(cmb(a, b), [2, 4]));
                }),
            );
        });

        specify("gather", () => {
            fc.assert(
                fc.property(arbStr(), arbStr(), (a, b) => {
                    const result = Ior.gather({
                        x: Ior.both<Str, 2>(a, 2),
                        y: Ior.both<Str, 4>(b, 4),
                    });
                    expect(result).to.deep.equal(
                        Ior.both(cmb(a, b), { x: 2, y: 4 }),
                    );
                }),
            );
        });

        specify("lift", () => {
            fc.assert(
                fc.property(arbStr(), arbStr(), (a, b) => {
                    const result = Ior.lift(tuple<[2, 4]>)(
                        Ior.both(a, 2),
                        Ior.both(b, 4),
                    );
                    expect(result).to.deep.equal(Ior.both(cmb(a, b), [2, 4]));
                }),
            );
        });

        describe("goAsync", async () => {
            it("short-circuits on the first yielded Left", async () => {
                await fc.assert(
                    fc.asyncProperty(arbStr(), async (b) => {
                        const result = await Ior.goAsync(async function* () {
                            const x = yield* await Promise.resolve(
                                Ior.right<2, Str>(2),
                            );
                            expect(x).to.equal(2);
                            const [y, z] = yield* await Promise.resolve(
                                Ior.left<Str, [2, 4]>(b),
                            );
                            return tuple(x, y, z);
                        });
                        expect(result).to.deep.equal(Ior.left(b));
                    }),
                );
            });

            it("completes if all yielded values are Right", async () => {
                const result = await Ior.goAsync(async function* () {
                    const x = yield* await Promise.resolve(
                        Ior.right<2, Str>(2),
                    );
                    const [y, z] = yield* await Promise.resolve(
                        Ior.right<[2, 4], Str>([x, 4]),
                    );
                    return tuple(x, y, z);
                });
                expect(result).to.deep.equal(Ior.right([2, 2, 4]));
            });

            it("completes and retains the left-hand value if a Both is yielded after a Right", async () => {
                await fc.assert(
                    fc.asyncProperty(arbStr(), async (b) => {
                        const result = await Ior.goAsync(async function* () {
                            const x = yield* await Promise.resolve(
                                Ior.right<2, Str>(2),
                            );
                            const [y, z] = yield* await Promise.resolve(
                                Ior.both(b, tuple<[2, 4]>(x, 4)),
                            );
                            return tuple(x, y, z);
                        });
                        expect(result).to.deep.equal(Ior.both(b, [2, 2, 4]));
                    }),
                );
            });

            it("short-circuits and combines the left-hand values if a Left is yielded after a Both", async () => {
                await fc.assert(
                    fc.asyncProperty(arbStr(), arbStr(), async (a, b) => {
                        const result = await Ior.goAsync(async function* () {
                            const x = yield* await Promise.resolve(
                                Ior.both<Str, 2>(a, 2),
                            );
                            expect(x).to.equal(2);
                            const [y, z] = yield* await Promise.resolve(
                                Ior.left<Str, [2, 4]>(b),
                            );
                            return tuple(x, y, z);
                        });
                        expect(result).to.deep.equal(Ior.left(cmb(a, b)));
                    }),
                );
            });

            it("completes and retains the left-hand value if a Right is yielded after a Both", async () => {
                await fc.assert(
                    fc.asyncProperty(arbStr(), async (a) => {
                        const result = await Ior.goAsync(async function* () {
                            const x = yield* await Promise.resolve(
                                Ior.both<Str, 2>(a, 2),
                            );
                            const [y, z] = yield* await Promise.resolve(
                                Ior.right<[2, 4], Str>([x, 4]),
                            );
                            return tuple(x, y, z);
                        });
                        expect(result).to.deep.equal(Ior.both(a, [2, 2, 4]));
                    }),
                );
            });

            it("completes and combines the left-hand values if a Both is yielded after", async () => {
                await fc.assert(
                    fc.asyncProperty(arbStr(), arbStr(), async (a, b) => {
                        const result = await Ior.goAsync(async function* () {
                            const x = yield* await Promise.resolve(
                                Ior.both<Str, 2>(a, 2),
                            );
                            const [y, z] = yield* await Promise.resolve(
                                Ior.both(b, tuple<[2, 4]>(x, 4)),
                            );
                            return tuple(x, y, z);
                        });
                        expect(result).to.deep.equal(
                            Ior.both(cmb(a, b), [2, 2, 4]),
                        );
                    }),
                );
            });

            it("unwraps Promises in right-hand channels and in return", async () => {
                await fc.assert(
                    fc.asyncProperty(arbStr(), arbStr(), async (a, b) => {
                        const result = await Ior.goAsync(async function* () {
                            const x = yield* await Promise.resolve(
                                Ior.both<Str, Promise<2>>(
                                    a,
                                    Promise.resolve(2),
                                ),
                            );
                            const [y, z] = yield* await Promise.resolve(
                                Ior.both(
                                    b,
                                    Promise.resolve(tuple<[2, 4]>(x, 4)),
                                ),
                            );
                            return Promise.resolve(tuple(x, y, z));
                        });
                        expect(result).to.deep.equal(
                            Ior.both(cmb(a, b), [2, 2, 4]),
                        );
                    }),
                );
            });
        });

        describe("#[Eq.eq]", () => {
            it("compares a Left and a Left by their values", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), (a, b) => {
                        expect(eq(Ior.left(a), Ior.left(b))).to.equal(eq(a, b));
                    }),
                );
            });

            it("compares a Left and a Right as inequal", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), (a, y) => {
                        expect(eq(Ior.left(a), Ior.right(y))).to.be.false;
                    }),
                );
            });

            it("compares a Left and a Both as inequal", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), arbNum(), (a, b, y) => {
                        expect(eq(Ior.left(a), Ior.both(b, y))).to.be.false;
                    }),
                );
            });

            it("compares a Right and a Left as inequal", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), (x, b) => {
                        expect(eq(Ior.right(x), Ior.left(b))).to.be.false;
                    }),
                );
            });

            it("compares a Right and a Right by their values", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), (x, y) => {
                        expect(eq(Ior.right(x), Ior.right(y))).to.equal(
                            eq(x, y),
                        );
                    }),
                );
            });

            it("compares a Right and a Both as inequal", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), arbNum(), (x, b, y) => {
                        expect(eq(Ior.right(x), Ior.both(b, y))).to.be.false;
                    }),
                );
            });

            it("compares a Both and a Left as inequal", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), arbNum(), (a, x, b) => {
                        expect(eq(Ior.both(a, x), Ior.left(b))).to.be.false;
                    }),
                );
            });

            it("compares a Both and a Right as inequal", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), arbNum(), (a, x, y) => {
                        expect(eq(Ior.both(a, x), Ior.right(y))).to.be.false;
                    }),
                );
            });

            it("compares a Both and a Both by their values", () => {
                fc.assert(
                    fc.property(
                        arbNum(),
                        arbNum(),
                        arbNum(),
                        arbNum(),
                        (a, x, b, y) => {
                            expect(eq(Ior.both(a, x), Ior.both(b, y))).to.equal(
                                eq(a, b) && eq(x, y),
                            );
                        },
                    ),
                );
            });
        });

        describe("#[Ord.cmp]", () => {
            it("compares a Left and a Left by their values", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), (a, b) => {
                        expect(cmp(Ior.left(a), Ior.left(b))).to.equal(
                            cmp(a, b),
                        );
                    }),
                );
            });

            it("compares a Left as less than a Right", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), (a, y) => {
                        expect(cmp(Ior.left(a), Ior.right(y))).to.equal(
                            Ordering.less,
                        );
                    }),
                );
            });

            it("compares a Left as less than a Both", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), arbNum(), (a, b, y) => {
                        expect(cmp(Ior.left(a), Ior.both(b, y))).to.equal(
                            Ordering.less,
                        );
                    }),
                );
            });

            it("compares a Right as greater than a Left", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), (x, b) => {
                        expect(cmp(Ior.right(x), Ior.left(b))).to.equal(
                            Ordering.greater,
                        );
                    }),
                );
            });

            it("compares a Right and a Right by their values", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), (x, y) => {
                        expect(cmp(Ior.right(x), Ior.right(y))).to.equal(
                            cmp(x, y),
                        );
                    }),
                );
            });

            it("compares a Right as less than a Both", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), arbNum(), (x, b, y) => {
                        expect(cmp(Ior.right(x), Ior.both(b, y))).to.equal(
                            Ordering.less,
                        );
                    }),
                );
            });

            it("compares a Both as greater than a Left", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), arbNum(), (a, x, b) => {
                        expect(cmp(Ior.both(a, x), Ior.left(b))).to.equal(
                            Ordering.greater,
                        );
                    }),
                );
            });

            it("compares a Both as greater than a Right", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), arbNum(), (a, x, y) => {
                        expect(cmp(Ior.both(a, x), Ior.right(y))).to.equal(
                            Ordering.greater,
                        );
                    }),
                );
            });

            it("compares a Both and a Both by their values lexicographically", () => {
                fc.assert(
                    fc.property(
                        arbNum(),
                        arbNum(),
                        arbNum(),
                        arbNum(),
                        (a, x, b, y) => {
                            expect(
                                cmp(Ior.both(a, x), Ior.both(b, y)),
                            ).to.equal(cmb(cmp(a, b), cmp(x, y)));
                        },
                    ),
                );
            });
        });

        describe("#[Semigroup.cmb]", () => {
            it("combines a Left and a Left into a Left", () => {
                fc.assert(
                    fc.property(arbStr(), arbStr(), (a, b) => {
                        expect(cmb(Ior.left(a), Ior.left(b))).to.deep.equal(
                            Ior.left(cmb(a, b)),
                        );
                    }),
                );
            });

            it("combines a Left and a Right into a Both", () => {
                fc.assert(
                    fc.property(arbStr(), arbStr(), (a, y) => {
                        expect(cmb(Ior.left(a), Ior.right(y))).to.deep.equal(
                            Ior.both(a, y),
                        );
                    }),
                );
            });

            it("combines a Left and a Both into a Both", () => {
                fc.assert(
                    fc.property(arbStr(), arbStr(), arbStr(), (a, b, y) => {
                        expect(cmb(Ior.left(a), Ior.both(b, y))).to.deep.equal(
                            Ior.both(cmb(a, b), y),
                        );
                    }),
                );
            });

            it("combines a Right and a Left into a Both", () => {
                fc.assert(
                    fc.property(arbStr(), arbStr(), (x, b) => {
                        expect(cmb(Ior.right(x), Ior.left(b))).to.deep.equal(
                            Ior.both(b, x),
                        );
                    }),
                );
            });

            it("combines a Right and a Right into a Right", () => {
                fc.assert(
                    fc.property(arbStr(), arbStr(), (x, y) => {
                        expect(cmb(Ior.right(x), Ior.right(y))).to.deep.equal(
                            Ior.right(cmb(x, y)),
                        );
                    }),
                );
            });

            it("combines a Right and a Both into a Both", () => {
                fc.assert(
                    fc.property(arbStr(), arbStr(), arbStr(), (x, b, y) => {
                        expect(cmb(Ior.right(x), Ior.both(b, y))).to.deep.equal(
                            Ior.both(b, cmb(x, y)),
                        );
                    }),
                );
            });

            it("combines a Both and a Left into a Both", () => {
                fc.assert(
                    fc.property(arbStr(), arbStr(), arbStr(), (a, x, b) => {
                        expect(cmb(Ior.both(a, x), Ior.left(b))).to.deep.equal(
                            Ior.both(cmb(a, b), x),
                        );
                    }),
                );
            });

            it("combines a Both and a Right into a Both", () => {
                fc.assert(
                    fc.property(arbStr(), arbStr(), arbStr(), (a, x, y) => {
                        expect(cmb(Ior.both(a, x), Ior.right(y))).to.deep.equal(
                            Ior.both(a, cmb(x, y)),
                        );
                    }),
                );
            });

            it("combines a Both and a Both into a Both", () => {
                fc.assert(
                    fc.property(
                        arbStr(),
                        arbStr(),
                        arbStr(),
                        arbStr(),
                        (a, x, b, y) => {
                            expect(
                                cmb(Ior.both(a, x), Ior.both(b, y)),
                            ).to.deep.equal(Ior.both(cmb(a, b), cmb(x, y)));
                        },
                    ),
                );
            });
        });

        describe("#unwrap", () => {
            it("applies the first function if the variant is Left", () => {
                const result = Ior.left<1, 2>(1).unwrap(
                    (x): [1, 3] => [x, 3],
                    (x): [2, 4] => [x, 4],
                    tuple,
                );
                expect(result).to.deep.equal([1, 3]);
            });

            it("applies the second function if the variant is Right", () => {
                const result = Ior.right<2, 1>(2).unwrap(
                    (x): [1, 3] => [x, 3],
                    (x): [2, 4] => [x, 4],
                    tuple,
                );
                expect(result).to.deep.equal([2, 4]);
            });

            it("applies the third function if the variant is Both", () => {
                const result = Ior.both<1, 2>(1, 2).unwrap(
                    (x): [1, 3] => [x, 3],
                    (x): [2, 4] => [x, 4],
                    tuple,
                );
                expect(result).to.deep.equal([1, 2]);
            });
        });

        describe("#isLeft", () => {
            it("returns true if the variant is Left", () => {
                const result = Ior.left<1, 2>(1).isLeft();
                expect(result).to.be.true;
            });

            it("returns false if the variant is Right", () => {
                const result = Ior.right<2, 1>(2).isLeft();
                expect(result).to.be.false;
            });

            it("returns false if the variant is Both", () => {
                const result = Ior.both<1, 2>(1, 2).isLeft();
                expect(result).to.be.false;
            });
        });

        describe("#isRight", () => {
            it("returns false if the variant is Left", () => {
                const result = Ior.left<1, 2>(1).isRight();
                expect(result).to.be.false;
            });

            it("returns true if the variant is Right", () => {
                const result = Ior.right<2, 1>(2).isRight();
                expect(result).to.be.true;
            });

            it("returns false if the variant is Both", () => {
                const result = Ior.both<1, 2>(1, 2).isRight();
                expect(result).to.be.false;
            });
        });

        describe("#isBoth", () => {
            it("returns false if the variant is Left", () => {
                const result = Ior.left<1, 2>(1).isBoth();
                expect(result).to.be.false;
            });

            it("returns false if the variant is Right", () => {
                const result = Ior.right<2, 1>(2).isBoth();
                expect(result).to.be.false;
            });

            it("returns true if the variant is Both", () => {
                const result = Ior.both<1, 2>(1, 2).isBoth();
                expect(result).to.be.true;
            });
        });

        describe("#flatMap", () => {
            it("does not apply the continuation if the variant is Left", () => {
                fc.assert(
                    fc.property(arbStr(), arbStr(), (a, b) => {
                        const result = Ior.left<Str, 2>(a).flatMap(
                            (x): Ior<Str, [2, 4]> => Ior.both(b, [x, 4]),
                        );
                        expect(result).to.deep.equal(Ior.left(a));
                    }),
                );
            });

            it("applies the continuation if the variant is Right", () => {
                const result = Ior.right<2, Str>(2).flatMap(
                    (x): Ior<Str, [2, 4]> => Ior.right([x, 4]),
                );
                expect(result).to.deep.equal(Ior.right([2, 4]));
            });

            it("retains the left-hand value if a continuation on a Right returns a Both", () => {
                fc.assert(
                    fc.property(arbStr(), (b) => {
                        const result = Ior.right<2, Str>(2).flatMap(
                            (x): Ior<Str, [2, 4]> => Ior.both(b, [x, 4]),
                        );
                        expect(result).to.deep.equal(Ior.both(b, [2, 4]));
                    }),
                );
            });

            it("combines the left-hand values if a continuation on a Both returns a Left", () => {
                fc.assert(
                    fc.property(arbStr(), arbStr(), (a, b) => {
                        const result = Ior.both<Str, 2>(a, 2).flatMap(
                            (x): Ior<Str, [2, 4]> => {
                                expect(x).to.equal(2);
                                return Ior.left(b);
                            },
                        );
                        expect(result).to.deep.equal(Ior.left(cmb(a, b)));
                    }),
                );
            });

            it("retains the left-hand value if a continuation on a Both returns a Right", () => {
                fc.assert(
                    fc.property(arbStr(), (a) => {
                        const result = Ior.both<Str, 2>(a, 2).flatMap((x) =>
                            Ior.right<[2, 4], Str>([x, 4]),
                        );
                        expect(result).to.deep.equal(Ior.both(a, [2, 4]));
                    }),
                );
            });

            it("combines the left-hand values if a continuation on a Both returns a Both", () => {
                fc.assert(
                    fc.property(arbStr(), arbStr(), (a, b) => {
                        const result = Ior.both<Str, 2>(a, 2).flatMap(
                            (x): Ior<Str, [2, 4]> => Ior.both(b, [x, 4]),
                        );
                        expect(result).to.deep.equal(
                            Ior.both(cmb(a, b), [2, 4]),
                        );
                    }),
                );
            });
        });

        specify("#zipWith", () => {
            fc.assert(
                fc.property(arbStr(), arbStr(), (a, b) => {
                    const result = Ior.both<Str, 2>(a, 2).zipWith(
                        Ior.both<Str, 4>(b, 4),
                        tuple,
                    );
                    expect(result).to.deep.equal(Ior.both(cmb(a, b), [2, 4]));
                }),
            );
        });

        specify("#zipFst", () => {
            fc.assert(
                fc.property(arbStr(), arbStr(), (a, b) => {
                    const result = Ior.both<Str, 2>(a, 2).zipFst(
                        Ior.both<Str, 4>(b, 4),
                    );
                    expect(result).to.deep.equal(Ior.both(cmb(a, b), 2));
                }),
            );
        });

        specify("#zipSnd", () => {
            fc.assert(
                fc.property(arbStr(), arbStr(), (a, b) => {
                    const result = Ior.both<Str, 2>(a, 2).zipSnd(
                        Ior.both<Str, 4>(b, 4),
                    );
                    expect(result).to.deep.equal(Ior.both(cmb(a, b), 4));
                }),
            );
        });

        describe("#lmap", () => {
            it("applies the function to the value if the variant is Left", () => {
                const result = Ior.left<1, 2>(1).lmap((x): [1, 3] => [x, 3]);
                expect(result).to.deep.equal(Ior.left([1, 3]));
            });

            it("does not apply the function if the variant is Right", () => {
                const result = Ior.right<2, 1>(2).lmap((x): [1, 3] => [x, 3]);
                expect(result).to.deep.equal(Ior.right(2));
            });

            it("applies a function to the first value if the variant is Both", () => {
                const result = Ior.both<1, 2>(1, 2).lmap((x): [1, 3] => [x, 3]);
                expect(result).to.deep.equal(Ior.both([1, 3], 2));
            });
        });

        describe("#map", () => {
            it("does not apply the function if the variant is Left", () => {
                const result = Ior.left<1, 2>(1).map((x): [2, 4] => [x, 4]);
                expect(result).to.deep.equal(Ior.left(1));
            });

            it("applies the function to the value if the variant is Right", () => {
                const result = Ior.right<2, 1>(2).map((x): [2, 4] => [x, 4]);
                expect(result).to.deep.equal(Ior.right([2, 4]));
            });

            it("applies the function to the second value if the variant is Both", () => {
                const result = Ior.both<1, 2>(1, 2).map((x): [2, 4] => [x, 4]);
                expect(result).to.deep.equal(Ior.both(1, [2, 4]));
            });
        });
    });
});
