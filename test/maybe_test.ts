import { expect } from "chai";
import * as fc from "fast-check";
import { cmb } from "../src/cmb.js";
import { cmp, eq, Ordering } from "../src/cmp.js";
import { Maybe } from "../src/maybe.js";
import { arbNum, arbStr, Num, Str, tuple } from "./common.js";

function nothing<A>(): Maybe<A> {
    return Maybe.nothing;
}

describe("maybe.js", () => {
    describe("Maybe", () => {
        describe("fromMissing", () => {
            it("returns Nothing if the argument is undefined", () => {
                expect(Maybe.fromMissing<1>(undefined)).to.equal(Maybe.nothing);
            });

            it("returns Nothing if the argument is null", () => {
                expect(Maybe.fromMissing<1>(null)).to.equal(Maybe.nothing);
            });

            it("returns any non-undefined, non-null argument in a Just", () => {
                expect(Maybe.fromMissing<1>(1)).to.deep.equal(Maybe.just(1));
            });
        });

        describe("wrapFn", () => {
            it("adapts a function to return Nothing if it returns undefined", () => {
                const f = Maybe.wrapFn((): 1 | undefined => undefined);
                const result = f();
                expect(result).to.equal(Maybe.nothing);
            });

            it("adapts a function to return Nothing if it returns null", () => {
                const f = Maybe.wrapFn((): 1 | null => null);
                const result = f();
                expect(result).to.equal(Maybe.nothing);
            });

            it("adapts a function to wrap a non-undefined, non-null result in a Just", () => {
                const f = Maybe.wrapFn((): 1 => 1);
                const result = f();
                expect(result).to.deep.equal(Maybe.just(1));
            });
        });

        describe("wrapPred", () => {
            it("adapts a predicate to return Nothing if not satisfied", () => {
                const f = Maybe.wrapPred((x: number) => x === 1);
                const result = f(2);
                expect(result).to.equal(Maybe.nothing);
            });

            it("adapts a predicate to return a result in a Just if satisfied", () => {
                const f = Maybe.wrapPred((x: number) => x === 1);
                const result = f(1);
                expect(result).to.deep.equal(Maybe.just(1));
            });
        });

        describe("go", () => {
            it("short-circuits on the first yielded Nothing", () => {
                const result = Maybe.go(function* () {
                    const x = yield* Maybe.just<1>(1);
                    const [y, z] = yield* nothing<[1, 2]>();
                    return tuple(x, y, z);
                });
                expect(result).to.equal(Maybe.nothing);
            });

            it("completes if all yielded values are Just", () => {
                const result = Maybe.go(function* () {
                    const x = yield* Maybe.just<1>(1);
                    const [y, z] = yield* Maybe.just<[1, 2]>([x, 2]);
                    return tuple(x, y, z);
                });
                expect(result).to.deep.equal(Maybe.just([1, 1, 2]));
            });
        });

        specify("reduce", () => {
            const result = Maybe.reduce(
                ["x", "y"],
                (xs, x) => Maybe.just(xs + x),
                "",
            );
            expect(result).to.deep.equal(Maybe.just("xy"));
        });

        specify("collect", () => {
            const inputs: [Maybe<1>, Maybe<2>] = [Maybe.just(1), Maybe.just(2)];
            const result = Maybe.collect(inputs);
            expect(result).to.deep.equal(Maybe.just([1, 2]));
        });

        specify("gather", () => {
            const result = Maybe.gather({
                x: Maybe.just<1>(1),
                y: Maybe.just<2>(2),
            });
            expect(result).to.deep.equal(Maybe.just({ x: 1, y: 2 }));
        });

        specify("lift", () => {
            const result = Maybe.lift(tuple<[1, 2]>)(
                Maybe.just(1),
                Maybe.just(2),
            );
            expect(result).to.deep.equal(Maybe.just([1, 2]));
        });

        describe("goAsync", async () => {
            it("short-circuits on the first yielded Nothing", async () => {
                const result = await Maybe.goAsync(async function* () {
                    const x = yield* await Promise.resolve(Maybe.just<1>(1));
                    const [y, z] = yield* await Promise.resolve(
                        nothing<[1, 2]>(),
                    );
                    return tuple(x, y, z);
                });
                expect(result).to.equal(Maybe.nothing);
            });

            it("completes if all yielded values are Just", async () => {
                const result = await Maybe.goAsync(async function* () {
                    const x = yield* await Promise.resolve(Maybe.just<1>(1));
                    const [y, z] = yield* await Promise.resolve(
                        Maybe.just<[1, 2]>([x, 2]),
                    );
                    return tuple(x, y, z);
                });
                expect(result).to.deep.equal(Maybe.just([1, 1, 2]));
            });

            it("unwraps Promises in Just variants and in return", async () => {
                const result = await Maybe.goAsync(async function* () {
                    const x = yield* await Promise.resolve(
                        Maybe.just(Promise.resolve<1>(1)),
                    );
                    const [y, z] = yield* await Promise.resolve(
                        Maybe.just(Promise.resolve<[1, 2]>([x, 2])),
                    );
                    return Promise.resolve(tuple(x, y, z));
                });
                expect(result).to.deep.equal(Maybe.just([1, 1, 2]));
            });
        });

        describe("#[Eq.eq]", () => {
            it("compares Nothing and Nothing as equal", () => {
                expect(eq<Maybe<Num>>(Maybe.nothing, Maybe.nothing)).to.be.true;
            });

            it("compares Nothing and a Just as inequal", () => {
                fc.assert(
                    fc.property(arbNum(), (y) => {
                        expect(eq(Maybe.nothing, Maybe.just(y))).to.be.false;
                    }),
                );
            });

            it("compares a Just and Nothing as inequal", () => {
                fc.assert(
                    fc.property(arbNum(), (x) => {
                        expect(eq(Maybe.just(x), Maybe.nothing)).to.be.false;
                    }),
                );
            });

            it("compares a Just and a Just by their values", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), (x, y) => {
                        expect(eq(Maybe.just(x), Maybe.just(y))).to.equal(
                            eq(x, y),
                        );
                    }),
                );
            });
        });

        describe("#[Ord.cmp]", () => {
            it("compares Nothing as equal to Nothing", () => {
                expect(cmp<Maybe<Num>>(Maybe.nothing, Maybe.nothing)).to.equal(
                    Ordering.equal,
                );
            });

            it("compares Nothing as less than a Just", () => {
                fc.assert(
                    fc.property(arbNum(), (y) => {
                        expect(cmp(Maybe.nothing, Maybe.just(y))).to.equal(
                            Ordering.less,
                        );
                    }),
                );
            });

            it("compares a Just as greater than Nothing", () => {
                fc.assert(
                    fc.property(arbNum(), (x) => {
                        expect(cmp(Maybe.just(x), Maybe.nothing)).to.equal(
                            Ordering.greater,
                        );
                    }),
                );
            });

            it("compares a Just and a Just by their values", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), (x, y) => {
                        expect(cmp(Maybe.just(x), Maybe.just(y))).to.equal(
                            cmp(x, y),
                        );
                    }),
                );
            });
        });

        describe("#[Semigroup.cmb]", () => {
            it("returns Nothing if both arguments are Nothing", () => {
                expect(cmb<Maybe<Str>>(Maybe.nothing, Maybe.nothing)).to.equal(
                    Maybe.nothing,
                );
            });

            it("keeps the second Just if the first argument is Nothing", () => {
                fc.assert(
                    fc.property(arbStr(), (y) => {
                        expect(cmb(Maybe.nothing, Maybe.just(y))).to.deep.equal(
                            Maybe.just(y),
                        );
                    }),
                );
            });

            it("keeps the first Just if the second argument is Nothing", () => {
                fc.assert(
                    fc.property(arbStr(), (x) => {
                        expect(cmb(Maybe.just(x), Maybe.nothing)).to.deep.equal(
                            Maybe.just(x),
                        );
                    }),
                );
            });

            it("combines the values in a Just if both arguments are Just", () => {
                fc.assert(
                    fc.property(arbStr(), arbStr(), (x, y) => {
                        expect(cmb(Maybe.just(x), Maybe.just(y))).to.deep.equal(
                            Maybe.just(cmb(x, y)),
                        );
                    }),
                );
            });
        });

        describe("#isNothing", () => {
            it("returns true if the variant is Nothing", () => {
                expect(nothing<1>().isNothing()).to.be.true;
            });

            it("returns false if the variant is Just", () => {
                expect(Maybe.just<1>(1).isNothing()).to.be.false;
            });
        });

        describe("#isJust", () => {
            it("returns false if the variant is Nothing", () => {
                expect(nothing<1>().isJust()).to.be.false;
            });

            it("returns true if the variant is Just", () => {
                expect(Maybe.just<1>(1).isJust()).to.be.true;
            });
        });

        describe("#unwrap", () => {
            it("evaluates the first function if the variant is Nothing", () => {
                const result = nothing<1>().unwrap(
                    (): 2 => 2,
                    (x): [1, 3] => [x, 3],
                );
                expect(result).to.equal(2);
            });

            it("applies the second function if the variant is Just", () => {
                const result = Maybe.just<1>(1).unwrap(
                    (): 2 => 2,
                    (x): [1, 3] => [x, 3],
                );
                expect(result).to.deep.equal([1, 3]);
            });
        });

        describe("#getOr", () => {
            it("returns the fallback value if the variant is Nothing", () => {
                const result = nothing<1>().getOr(2 as const);
                expect(result).to.equal(2);
            });

            it("extracts the value if the variant is Just", () => {
                const result = Maybe.just<1>(1).getOr(2 as const);
                expect(result).to.equal(1);
            });
        });

        describe("#recover", () => {
            it("evaluates the function if the variant is Nothing", () => {
                const result = nothing<1>().recover(() => Maybe.just<2>(2));
                expect(result).to.deep.equal(Maybe.just(2));
            });

            it("returns a Just as is", () => {
                const result = Maybe.just<1>(1).recover(() => Maybe.just<2>(2));
                expect(result).to.deep.equal(Maybe.just(1));
            });
        });

        describe("#flatMap", () => {
            it("does not apply the continuation if the variant is Nothing", () => {
                const result = nothing<1>().flatMap(
                    (x): Maybe<[1, 2]> => Maybe.just([x, 2]),
                );
                expect(result).to.equal(Maybe.nothing);
            });

            it("applies the continuation if the variant is Just", () => {
                const result = Maybe.just<1>(1).flatMap(
                    (x): Maybe<[1, 2]> => Maybe.just([x, 2]),
                );
                expect(result).to.deep.equal(Maybe.just([1, 2]));
            });
        });

        specify("#zipWith", () => {
            const result = Maybe.just<1>(1).zipWith(Maybe.just<2>(2), tuple);
            expect(result).to.deep.equal(Maybe.just([1, 2]));
        });

        specify("#zipFst", () => {
            const result = Maybe.just<1>(1).zipFst(Maybe.just<2>(2));
            expect(result).to.deep.equal(Maybe.just(1));
        });

        specify("#zipSnd", () => {
            const result = Maybe.just<1>(1).zipSnd(Maybe.just<2>(2));
            expect(result).to.deep.equal(Maybe.just(2));
        });

        specify("#map", () => {
            const result = Maybe.just<1>(1).map((x): [1, 2] => tuple(x, 2));
            expect(result).to.deep.equal(Maybe.just([1, 2]));
        });
    });
});
