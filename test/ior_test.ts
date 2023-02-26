import { expect } from "chai";
import * as fc from "fast-check";
import { cmb } from "../src/cmb.js";
import { cmp, eq, Ordering } from "../src/cmp.js";
import { Either } from "../src/either.js";
import { Ior } from "../src/ior.js";
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

describe("ior.js", () => {
    describe("Ior", () => {
        function arbIor<A, B>(
            arbLeft: fc.Arbitrary<A>,
            arbRight: fc.Arbitrary<B>,
        ): fc.Arbitrary<Ior<A, B>> {
            return fc.oneof(
                arbLeft.map(Ior.left),
                arbRight.map(Ior.right),
                arbLeft.chain((x) => arbRight.map((y) => Ior.both(x, y))),
            );
        }

        describe("left", () => {
            it("constucts a Left variant", () => {
                const ior = Ior.left<1, 2>(1);
                expect(ior).to.be.an.instanceOf(Ior.Left);
                expect(ior.kind).to.equal(Ior.Kind.LEFT);
                expect(ior.val).to.equal(1);
            });
        });

        describe("right", () => {
            it("constructs a Right variant", () => {
                const ior = Ior.right<2, 1>(2);
                expect(ior).to.be.an.instanceOf(Ior.Right);
                expect(ior.kind).to.equal(Ior.Kind.RIGHT);
                expect(ior.val).to.equal(2);
            });
        });

        describe("both", () => {
            it("constructs a Both variant", () => {
                const ior = Ior.both<1, 2>(1, 2);
                expect(ior).to.be.an.instanceOf(Ior.Both);
                expect(ior.kind).to.equal(Ior.Kind.BOTH);
                expect((ior as Ior.Both<1, 2>).fst).to.equal(1);
                expect((ior as Ior.Both<1, 2>).snd).to.equal(2);
                expect(ior.val).to.deep.equal([1, 2]);
            });
        });

        describe("fromEither", () => {
            it("constructs a Left if the Either is a Left", () => {
                const ior = Ior.fromEither(Either.left<1, 2>(1));
                expect(ior).to.deep.equal(Ior.left(1));
            });

            it("constructs a Right if the Either is a Right", () => {
                const ior = Ior.fromEither(Either.right<2, 1>(2));
                expect(ior).to.deep.equal(Ior.right(2));
            });
        });

        describe("fromValidation", () => {
            it("constructs a Left if the Validation is an Err", () => {
                const ior = Ior.fromValidation(Validation.err<1, 2>(1));
                expect(ior).to.deep.equal(Ior.left(1));
            });

            it("constructs a Right if the Validation is an Ok", () => {
                const ior = Ior.fromValidation(Validation.ok<2, 1>(2));
                expect(ior).to.deep.equal(Ior.right(2));
            });
        });

        describe("go", () => {
            it("short-circuits on the first yielded Left", () => {
                const ior = Ior.go(function* () {
                    const x = yield* Ior.right<2, Str>(2);
                    expect(x).to.equal(2);
                    const [y, z] = yield* Ior.left<Str, [2, 4]>(new Str("b"));
                    return tuple(x, y, z);
                });
                expect(ior).to.deep.equal(Ior.left(new Str("b")));
            });

            it("completes if all yielded values are Right", () => {
                const ior = Ior.go(function* () {
                    const x = yield* Ior.right<2, Str>(2);
                    const [y, z] = yield* Ior.right<[2, 4], Str>([x, 4]);
                    return tuple(x, y, z);
                });
                expect(ior).to.deep.equal(Ior.right([2, 2, 4]));
            });

            it("completes and retains the left-hand value if a Both is yielded after a Right", () => {
                const ior = Ior.go(function* () {
                    const x = yield* Ior.right<2, Str>(2);
                    const [y, z] = yield* Ior.both(
                        new Str("b"),
                        tuple<[2, 4]>(x, 4),
                    );
                    return tuple(x, y, z);
                });
                expect(ior).to.deep.equal(Ior.both(new Str("b"), [2, 2, 4]));
            });

            it("short-circuits and combines the left-hand values if a Left is yielded after a Both", () => {
                const ior = Ior.go(function* () {
                    const x = yield* Ior.both<Str, 2>(new Str("a"), 2);
                    expect(x).to.equal(2);
                    const [y, z] = yield* Ior.left<Str, [2, 4]>(new Str("b"));
                    return tuple(x, y, z);
                });
                expect(ior).to.deep.equal(Ior.left(new Str("ab")));
            });

            it("completes and retains the left-hand value if a Right is yielded after a Both", () => {
                const ior = Ior.go(function* () {
                    const x = yield* Ior.both<Str, 2>(new Str("a"), 2);
                    const [y, z] = yield* Ior.right<[2, 4], Str>([x, 4]);
                    return tuple(x, y, z);
                });
                expect(ior).to.deep.equal(Ior.both(new Str("a"), [2, 2, 4]));
            });

            it("completes and combines the left-hand values if a Both is yielded after a Both", () => {
                const ior = Ior.go(function* () {
                    const x = yield* Ior.both<Str, 2>(new Str("a"), 2);
                    const [y, z] = yield* Ior.both(
                        new Str("b"),
                        tuple<[2, 4]>(x, 4),
                    );
                    return tuple(x, y, z);
                });
                expect(ior).to.deep.equal(Ior.both(new Str("ab"), [2, 2, 4]));
            });
        });

        describe("goFn", () => {
            it("accesses the parameters of the generator function", () => {
                const f = Ior.goFn(function* <T>(w: T) {
                    const x = yield* Ior.both<Str, 2>(new Str("a"), 2);
                    const [y, z] = yield* Ior.both(
                        new Str("b"),
                        tuple<[2, 4]>(x, 4),
                    );
                    return tuple(w, x, y, z);
                });
                const ior = f<0>(0);
                expect(ior).to.deep.equal(
                    Ior.both(new Str("ab"), [0, 2, 2, 4]),
                );
            });
        });

        describe("reduce", () => {
            it("reduces the finite iterable from left to right in the context of Ior", () => {
                const ior = Ior.reduce(
                    ["x", "y"],
                    (xs, x) => Ior.both(new Str("a"), xs + x),
                    "",
                );
                expect(ior).to.deep.equal(Ior.both(new Str("aa"), "xy"));
            });
        });

        describe("collect", () => {
            it("turns the array or the tuple literal of Ior elements inside out", () => {
                const ior = Ior.collect([
                    Ior.both<Str, 2>(new Str("a"), 2),
                    Ior.both<Str, 4>(new Str("b"), 4),
                ]);
                expect(ior).to.deep.equal(Ior.both(new Str("ab"), [2, 4]));
            });
        });

        describe("gather", () => {
            it("turns the record or the object literal of Ior elements inside out", () => {
                const ior = Ior.gather({
                    x: Ior.both<Str, 2>(new Str("a"), 2),
                    y: Ior.both<Str, 4>(new Str("b"), 4),
                });
                expect(ior).to.deep.equal(
                    Ior.both(new Str("ab"), { x: 2, y: 4 }),
                );
            });
        });

        describe("lift", () => {
            it("lifts the function into the context of Ior", () => {
                const ior = Ior.lift(tuple<[2, 4]>)(
                    Ior.both(new Str("a"), 2),
                    Ior.both(new Str("b"), 4),
                );
                expect(ior).to.deep.equal(Ior.both(new Str("ab"), [2, 4]));
            });
        });

        describe("goAsync", async () => {
            it("short-circuits on the first yielded Left", async () => {
                const ior = await Ior.goAsync(async function* () {
                    const x = yield* await Promise.resolve(
                        Ior.right<2, Str>(2),
                    );
                    expect(x).to.equal(2);
                    const [y, z] = yield* await Promise.resolve(
                        Ior.left<Str, [2, 4]>(new Str("b")),
                    );
                    return tuple(x, y, z);
                });
                expect(ior).to.deep.equal(Ior.left(new Str("b")));
            });

            it("completes if all yielded values are Right", async () => {
                const ior = await Ior.goAsync(async function* () {
                    const x = yield* await Promise.resolve(
                        Ior.right<2, Str>(2),
                    );
                    const [y, z] = yield* await Promise.resolve(
                        Ior.right<[2, 4], Str>([x, 4]),
                    );
                    return tuple(x, y, z);
                });
                expect(ior).to.deep.equal(Ior.right([2, 2, 4]));
            });

            it("completes and retains the left-hand value if a Both is yielded after a Right", async () => {
                const ior = await Ior.goAsync(async function* () {
                    const x = yield* await Promise.resolve(
                        Ior.right<2, Str>(2),
                    );
                    const [y, z] = yield* await Promise.resolve(
                        Ior.both(new Str("b"), tuple<[2, 4]>(x, 4)),
                    );
                    return tuple(x, y, z);
                });
                expect(ior).to.deep.equal(Ior.both(new Str("b"), [2, 2, 4]));
            });

            it("short-circuits and combines the left-hand values if a Left is yielded after a Both", async () => {
                const ior = await Ior.goAsync(async function* () {
                    const x = yield* await Promise.resolve(
                        Ior.both<Str, 2>(new Str("a"), 2),
                    );
                    expect(x).to.equal(2);
                    const [y, z] = yield* await Promise.resolve(
                        Ior.left<Str, [2, 4]>(new Str("b")),
                    );
                    return tuple(x, y, z);
                });
                expect(ior).to.deep.equal(Ior.left(new Str("ab")));
            });

            it("completes and retains the left-hand value if a Right is yielded after a Both", async () => {
                const ior = await Ior.goAsync(async function* () {
                    const x = yield* await Promise.resolve(
                        Ior.both<Str, 2>(new Str("a"), 2),
                    );
                    const [y, z] = yield* await Promise.resolve(
                        Ior.right<[2, 4], Str>([x, 4]),
                    );
                    return tuple(x, y, z);
                });
                expect(ior).to.deep.equal(Ior.both(new Str("a"), [2, 2, 4]));
            });

            it("completes and combines the left-hand values if a Both is yielded after", async () => {
                const ior = await Ior.goAsync(async function* () {
                    const x = yield* await Promise.resolve(
                        Ior.both<Str, 2>(new Str("a"), 2),
                    );
                    const [y, z] = yield* await Promise.resolve(
                        Ior.both(new Str("b"), tuple<[2, 4]>(x, 4)),
                    );
                    return tuple(x, y, z);
                });
                expect(ior).to.deep.equal(Ior.both(new Str("ab"), [2, 2, 4]));
            });

            it("unwraps Promises in right-hand channels and in return", async () => {
                const ior = await Ior.goAsync(async function* () {
                    const x = yield* await Promise.resolve(
                        Ior.both<Str, Promise<2>>(
                            new Str("a"),
                            Promise.resolve(2),
                        ),
                    );
                    const [y, z] = yield* await Promise.resolve(
                        Ior.both(
                            new Str("b"),
                            Promise.resolve(tuple<[2, 4]>(x, 4)),
                        ),
                    );
                    return Promise.resolve(tuple(x, y, z));
                });
                expect(ior).to.deep.equal(Ior.both(new Str("ab"), [2, 2, 4]));
            });
        });

        describe("goAsyncFn", () => {
            it("accesses the parameters of the async generator function", async () => {
                const f = Ior.goAsyncFn(async function* <T>(w: T) {
                    const x = yield* await Promise.resolve(
                        Ior.both<Str, 2>(new Str("a"), 2),
                    );
                    const [y, z] = yield* await Promise.resolve(
                        Ior.both(new Str("b"), tuple<[2, 4]>(x, 4)),
                    );
                    return tuple(w, x, y, z);
                });
                const ior = await f<0>(0);
                expect(ior).to.deep.equal(
                    Ior.both(new Str("ab"), [0, 2, 2, 4]),
                );
            });
        });

        describe("#[Eq.eq]", () => {
            it("compares the values if both variants are Left", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), (a, b) => {
                        expect(eq(Ior.left(a), Ior.left(b))).to.equal(eq(a, b));
                    }),
                );
            });

            it("compares any Left and any Right as inequal", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), (a, y) => {
                        expect(eq(Ior.left(a), Ior.right(y))).to.be.false;
                    }),
                );
            });

            it("compares any Left and any Both as inequal", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), arbNum(), (a, b, y) => {
                        expect(eq(Ior.left(a), Ior.both(b, y))).to.be.false;
                    }),
                );
            });

            it("compares any Right and any Left as inequal", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), (x, b) => {
                        expect(eq(Ior.right(x), Ior.left(b))).to.be.false;
                    }),
                );
            });

            it("compares the values if both variants are Right", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), (x, y) => {
                        expect(eq(Ior.right(x), Ior.right(y))).to.equal(
                            eq(x, y),
                        );
                    }),
                );
            });

            it("compares any Right and any Both as inequal", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), arbNum(), (x, b, y) => {
                        expect(eq(Ior.right(x), Ior.both(b, y))).to.be.false;
                    }),
                );
            });

            it("compares any Both and any Left as inequal", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), arbNum(), (a, x, b) => {
                        expect(eq(Ior.both(a, x), Ior.left(b))).to.be.false;
                    }),
                );
            });

            it("compares any Both and any Right as inequal", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), arbNum(), (a, x, y) => {
                        expect(eq(Ior.both(a, x), Ior.right(y))).to.be.false;
                    }),
                );
            });

            it("compares the left-hand values and the right-hand values lexicographically if both variants are Both", () => {
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

            it("implements a lawful equivalence relation", () => {
                expectLawfulEq(arbIor(arbNum(), arbNum()));
            });
        });

        describe("#[Ord.cmp]", () => {
            it("compares the values if both variants are Left", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), (a, b) => {
                        expect(cmp(Ior.left(a), Ior.left(b))).to.equal(
                            cmp(a, b),
                        );
                    }),
                );
            });

            it("compares any Left as less than any Right", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), (a, y) => {
                        expect(cmp(Ior.left(a), Ior.right(y))).to.equal(
                            Ordering.less,
                        );
                    }),
                );
            });

            it("compares any Left as less than any Both", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), arbNum(), (a, b, y) => {
                        expect(cmp(Ior.left(a), Ior.both(b, y))).to.equal(
                            Ordering.less,
                        );
                    }),
                );
            });

            it("compares any Right as greater than any Left", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), (x, b) => {
                        expect(cmp(Ior.right(x), Ior.left(b))).to.equal(
                            Ordering.greater,
                        );
                    }),
                );
            });

            it("compares the values if both variants are Right", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), (x, y) => {
                        expect(cmp(Ior.right(x), Ior.right(y))).to.equal(
                            cmp(x, y),
                        );
                    }),
                );
            });

            it("compares any Right as less than any Both", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), arbNum(), (x, b, y) => {
                        expect(cmp(Ior.right(x), Ior.both(b, y))).to.equal(
                            Ordering.less,
                        );
                    }),
                );
            });

            it("compares any Both as greater than any Left", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), arbNum(), (a, x, b) => {
                        expect(cmp(Ior.both(a, x), Ior.left(b))).to.equal(
                            Ordering.greater,
                        );
                    }),
                );
            });

            it("compares any Both as greater than any Right", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), arbNum(), (a, x, y) => {
                        expect(cmp(Ior.both(a, x), Ior.right(y))).to.equal(
                            Ordering.greater,
                        );
                    }),
                );
            });

            it("compares the left-hand values and the right-hand values lexicographically if both variants are Both", () => {
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

            it("implements a lawful total order", () => {
                expectLawfulOrd(arbIor(arbNum(), arbNum()));
            });
        });

        describe("#[Semigroup.cmb]", () => {
            it("combines the values if both variants are Left", () => {
                fc.assert(
                    fc.property(arbStr(), arbStr(), (a, b) => {
                        expect(cmb(Ior.left(a), Ior.left(b))).to.deep.equal(
                            Ior.left(cmb(a, b)),
                        );
                    }),
                );
            });

            it("merges the values into a Both if the variants are Left and Right", () => {
                fc.assert(
                    fc.property(arbStr(), arbStr(), (a, y) => {
                        expect(cmb(Ior.left(a), Ior.right(y))).to.deep.equal(
                            Ior.both(a, y),
                        );
                    }),
                );
            });

            it("combines the left-hand values and retains the right-hand value if the variants are Left and Both", () => {
                fc.assert(
                    fc.property(arbStr(), arbStr(), arbStr(), (a, b, y) => {
                        expect(cmb(Ior.left(a), Ior.both(b, y))).to.deep.equal(
                            Ior.both(cmb(a, b), y),
                        );
                    }),
                );
            });

            it("merges the values into a Both if the variants are Right and Left", () => {
                fc.assert(
                    fc.property(arbStr(), arbStr(), (x, b) => {
                        expect(cmb(Ior.right(x), Ior.left(b))).to.deep.equal(
                            Ior.both(b, x),
                        );
                    }),
                );
            });

            it("combines the values if both variants are Right", () => {
                fc.assert(
                    fc.property(arbStr(), arbStr(), (x, y) => {
                        expect(cmb(Ior.right(x), Ior.right(y))).to.deep.equal(
                            Ior.right(cmb(x, y)),
                        );
                    }),
                );
            });

            it("retains the left-hand value and combines the right-hand values if the variants are Right and Both", () => {
                fc.assert(
                    fc.property(arbStr(), arbStr(), arbStr(), (x, b, y) => {
                        expect(cmb(Ior.right(x), Ior.both(b, y))).to.deep.equal(
                            Ior.both(b, cmb(x, y)),
                        );
                    }),
                );
            });

            it("combines the left-hand values and retains the right-hand value if the variants are Both and Left", () => {
                fc.assert(
                    fc.property(arbStr(), arbStr(), arbStr(), (a, x, b) => {
                        expect(cmb(Ior.both(a, x), Ior.left(b))).to.deep.equal(
                            Ior.both(cmb(a, b), x),
                        );
                    }),
                );
            });

            it("retains the left-hand value and combines the right-hand values if the variants are Both and Right", () => {
                fc.assert(
                    fc.property(arbStr(), arbStr(), arbStr(), (a, x, y) => {
                        expect(cmb(Ior.both(a, x), Ior.right(y))).to.deep.equal(
                            Ior.both(a, cmb(x, y)),
                        );
                    }),
                );
            });

            it("combines the left-hand values and the right-hand values pairwise if both variants are Both", () => {
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

            it("implements a lawful semigroup", () => {
                expectLawfulSemigroup(arbIor(arbStr(), arbStr()));
            });
        });

        describe("#unwrap", () => {
            it("applies the first function to the value if the variant is Left", () => {
                const ior = Ior.left<1, 2>(1).unwrap(
                    (x): [1, 3] => [x, 3],
                    (x): [2, 4] => [x, 4],
                    tuple,
                );
                expect(ior).to.deep.equal([1, 3]);
            });

            it("applies the second function to the value if the variant is Right", () => {
                const ior = Ior.right<2, 1>(2).unwrap(
                    (x): [1, 3] => [x, 3],
                    (x): [2, 4] => [x, 4],
                    tuple,
                );
                expect(ior).to.deep.equal([2, 4]);
            });

            it("applies the third function to the left-hand value and the right-hand value if the variant is Both", () => {
                const ior = Ior.both<1, 2>(1, 2).unwrap(
                    (x): [1, 3] => [x, 3],
                    (x): [2, 4] => [x, 4],
                    tuple,
                );
                expect(ior).to.deep.equal([1, 2]);
            });
        });

        describe("#isLeft", () => {
            it("returns true if the variant is Left", () => {
                const ior = Ior.left<1, 2>(1).isLeft();
                expect(ior).to.be.true;
            });

            it("returns false if the variant is Right", () => {
                const ior = Ior.right<2, 1>(2).isLeft();
                expect(ior).to.be.false;
            });

            it("returns false if the variant is Both", () => {
                const ior = Ior.both<1, 2>(1, 2).isLeft();
                expect(ior).to.be.false;
            });
        });

        describe("#isRight", () => {
            it("returns false if the variant is Left", () => {
                const ior = Ior.left<1, 2>(1).isRight();
                expect(ior).to.be.false;
            });

            it("returns true if the variant is Right", () => {
                const ior = Ior.right<2, 1>(2).isRight();
                expect(ior).to.be.true;
            });

            it("returns false if the variant is Both", () => {
                const ior = Ior.both<1, 2>(1, 2).isRight();
                expect(ior).to.be.false;
            });
        });

        describe("#isBoth", () => {
            it("returns false if the variant is Left", () => {
                const ior = Ior.left<1, 2>(1).isBoth();
                expect(ior).to.be.false;
            });

            it("returns false if the variant is Right", () => {
                const ior = Ior.right<2, 1>(2).isBoth();
                expect(ior).to.be.false;
            });

            it("returns true if the variant is Both", () => {
                const ior = Ior.both<1, 2>(1, 2).isBoth();
                expect(ior).to.be.true;
            });
        });

        describe("#flatMap", () => {
            it("does not apply the continuation if the variant is Left", () => {
                const ior = Ior.left<Str, 2>(new Str("a")).flatMap(
                    (x): Ior<Str, [2, 4]> => Ior.both(new Str("b"), [x, 4]),
                );
                expect(ior).to.deep.equal(Ior.left(new Str("a")));
            });

            it("applies the continuation to the value if the variant is Right", () => {
                const ior = Ior.right<2, Str>(2).flatMap(
                    (x): Ior<Str, [2, 4]> => Ior.right([x, 4]),
                );
                expect(ior).to.deep.equal(Ior.right([2, 4]));
            });

            it("retains the left-hand value if the continuation on a Right returns a Both", () => {
                const ior = Ior.right<2, Str>(2).flatMap(
                    (x): Ior<Str, [2, 4]> => Ior.both(new Str("b"), [x, 4]),
                );
                expect(ior).to.deep.equal(Ior.both(new Str("b"), [2, 4]));
            });

            it("combines the left-hand values if the continuation on a Both returns a Left", () => {
                const ior = Ior.both<Str, 2>(new Str("a"), 2).flatMap(
                    (x): Ior<Str, [2, 4]> => {
                        expect(x).to.equal(2);
                        return Ior.left(new Str("b"));
                    },
                );
                expect(ior).to.deep.equal(Ior.left(new Str("ab")));
            });

            it("retains the left-hand value if the continuation on a Both returns a Right", () => {
                const ior = Ior.both<Str, 2>(new Str("a"), 2).flatMap((x) =>
                    Ior.right<[2, 4], Str>([x, 4]),
                );
                expect(ior).to.deep.equal(Ior.both(new Str("a"), [2, 4]));
            });

            it("combines the left-hand values if the continuation on a Both returns a Both", () => {
                const ior = Ior.both<Str, 2>(new Str("a"), 2).flatMap(
                    (x): Ior<Str, [2, 4]> => Ior.both(new Str("b"), [x, 4]),
                );
                expect(ior).to.deep.equal(Ior.both(new Str("ab"), [2, 4]));
            });
        });

        describe("#zipWith", () => {
            it("applies the function to the right-hand values if both variants have right-hand values", () => {
                const ior = Ior.both<Str, 2>(new Str("a"), 2).zipWith(
                    Ior.both<Str, 4>(new Str("b"), 4),
                    tuple,
                );
                expect(ior).to.deep.equal(Ior.both(new Str("ab"), [2, 4]));
            });
        });

        describe("#zipFst", () => {
            it("keeps only the first right-hand value if both variants have right-hand values", () => {
                const ior = Ior.both<Str, 2>(new Str("a"), 2).zipFst(
                    Ior.both<Str, 4>(new Str("b"), 4),
                );
                expect(ior).to.deep.equal(Ior.both(new Str("ab"), 2));
            });
        });

        describe("#zipSnd", () => {
            it("keeps only the second right-hand value if both variants have right-hand values", () => {
                const ior = Ior.both<Str, 2>(new Str("a"), 2).zipSnd(
                    Ior.both<Str, 4>(new Str("b"), 4),
                );
                expect(ior).to.deep.equal(Ior.both(new Str("ab"), 4));
            });
        });

        describe("#lmap", () => {
            it("applies the function to the value if the variant is Left", () => {
                const ior = Ior.left<1, 2>(1).lmap((x): [1, 3] => [x, 3]);
                expect(ior).to.deep.equal(Ior.left([1, 3]));
            });

            it("does not apply the function if the variant is Right", () => {
                const ior = Ior.right<2, 1>(2).lmap((x): [1, 3] => [x, 3]);
                expect(ior).to.deep.equal(Ior.right(2));
            });

            it("applies the function to the left-hand value if the variant is Both", () => {
                const ior = Ior.both<1, 2>(1, 2).lmap((x): [1, 3] => [x, 3]);
                expect(ior).to.deep.equal(Ior.both([1, 3], 2));
            });
        });

        describe("#map", () => {
            it("does not apply the function if the variant is Left", () => {
                const ior = Ior.left<1, 2>(1).map((x): [2, 4] => [x, 4]);
                expect(ior).to.deep.equal(Ior.left(1));
            });

            it("applies the function to the value if the variant is Right", () => {
                const ior = Ior.right<2, 1>(2).map((x): [2, 4] => [x, 4]);
                expect(ior).to.deep.equal(Ior.right([2, 4]));
            });

            it("applies the function to the right-hand value if the variant is Both", () => {
                const ior = Ior.both<1, 2>(1, 2).map((x): [2, 4] => [x, 4]);
                expect(ior).to.deep.equal(Ior.both(1, [2, 4]));
            });
        });
    });
});
