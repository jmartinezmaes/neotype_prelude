import { expect } from "chai";
import * as fc from "fast-check";
import { cmb } from "../src/cmb.js";
import { cmp, eq, Ordering } from "../src/cmp.js";
import { Maybe } from "../src/maybe.js";
import {
    arbNum,
    arbStr,
    expectLawfulEq,
    expectLawfulOrd,
    expectLawfulSemigroup,
    Num,
    Str,
    tuple,
} from "./util.js";

function nothing<T>(): Maybe<T> {
    return Maybe.nothing;
}

describe("maybe.js", () => {
    describe("Maybe", () => {
        function arbMaybe<T>(arbVal: fc.Arbitrary<T>): fc.Arbitrary<Maybe<T>> {
            return fc.oneof(fc.constant(Maybe.nothing), arbVal.map(Maybe.just));
        }

        describe("nothing", () => {
            it("represents the Nothing variant", () => {
                const maybe: Maybe<1> = Maybe.nothing;
                expect(maybe).to.be.an.instanceOf(Maybe.Nothing);
                expect(maybe.kind).to.equal(Maybe.Kind.NOTHING);
            });
        });

        describe("just", () => {
            it("constructs a Just variant", () => {
                const maybe = Maybe.just<1>(1);
                expect(maybe).to.be.an.instanceOf(Maybe.Just);
                expect(maybe.kind).to.equal(Maybe.Kind.JUST);
                expect((maybe as Maybe.Just<1>).val).to.equal(1);
            });
        });

        describe("fromNullish", () => {
            it("returns Nothing if the argument is undefined", () => {
                expect(Maybe.fromNullish<1>(undefined)).to.equal(Maybe.nothing);
            });

            it("returns Nothing if the argument is null", () => {
                expect(Maybe.fromNullish<1>(null)).to.equal(Maybe.nothing);
            });

            it("returns any non-undefined, non-null argument in a Just", () => {
                expect(Maybe.fromNullish<1>(1)).to.deep.equal(Maybe.just(1));
            });
        });

        describe("wrapFn", () => {
            it("adapts the function to return Nothing if it returns undefined", () => {
                const f = Maybe.wrapFn((): 1 | undefined => undefined);
                const maybe = f();
                expect(maybe).to.equal(Maybe.nothing);
            });

            it("adapts the function to return Nothing if it returns null", () => {
                const f = Maybe.wrapFn((): 1 | null => null);
                const maybe = f();
                expect(maybe).to.equal(Maybe.nothing);
            });

            it("adapts the function to wrap a non-undefined, non-null result in a Just", () => {
                const f = Maybe.wrapFn((): 1 => 1);
                const maybe = f();
                expect(maybe).to.deep.equal(Maybe.just(1));
            });
        });

        describe("wrapPred", () => {
            it("adapts the predicate to return Nothing if not satisfied", () => {
                const f = Maybe.wrapPred((x: number) => x === 1);
                const maybe = f(2);
                expect(maybe).to.equal(Maybe.nothing);
            });

            it("adapts the predicate to return its argument in a Just if satisfied", () => {
                const f = Maybe.wrapPred((x: number) => x === 1);
                const maybe = f(1);
                expect(maybe).to.deep.equal(Maybe.just(1));
            });
        });

        describe("go", () => {
            it("short-circuits on the first yielded Nothing", () => {
                const maybe = Maybe.go(function* () {
                    const x = yield* Maybe.just<1>(1);
                    const [y, z] = yield* nothing<[1, 2]>();
                    return tuple(x, y, z);
                });
                expect(maybe).to.equal(Maybe.nothing);
            });

            it("completes if all yielded values are Just", () => {
                const maybe = Maybe.go(function* () {
                    const x = yield* Maybe.just<1>(1);
                    const [y, z] = yield* Maybe.just<[1, 2]>([x, 2]);
                    return tuple(x, y, z);
                });
                expect(maybe).to.deep.equal(Maybe.just([1, 1, 2]));
            });
        });

        describe("goFn", () => {
            it("accesses the parameters of the generator function", () => {
                const f = Maybe.goFn(function* <T>(w: T) {
                    const x = yield* Maybe.just<1>(1);
                    const [y, z] = yield* Maybe.just<[1, 2]>([x, 2]);
                    return tuple(w, x, y, z);
                });
                const maybe = f<0>(0);
                expect(maybe).to.deep.equal(Maybe.just([0, 1, 1, 2]));
            });
        });

        describe("reduce", () => {
            it("reduces the finite iterable from left to right in the context of Maybe", () => {
                const maybe = Maybe.reduce(
                    ["x", "y"],
                    (xs, x) => Maybe.just(xs + x),
                    "",
                );
                expect(maybe).to.deep.equal(Maybe.just("xy"));
            });
        });

        describe("collect", () => {
            it("turns the array or the tuple literal of Maybe elements inside out", () => {
                const maybe = Maybe.collect([
                    Maybe.just<1>(1),
                    Maybe.just<2>(2),
                ]);
                expect(maybe).to.deep.equal(Maybe.just([1, 2]));
            });
        });

        describe("gather", () => {
            it("turns the record or the object literal of Maybe elements inside out", () => {
                const maybe = Maybe.gather({
                    x: Maybe.just<1>(1),
                    y: Maybe.just<2>(2),
                });
                expect(maybe).to.deep.equal(Maybe.just({ x: 1, y: 2 }));
            });
        });

        describe("lift", () => {
            it("lifts the function into the context of Maybe", () => {
                const maybe = Maybe.lift(tuple<[1, 2]>)(
                    Maybe.just(1),
                    Maybe.just(2),
                );
                expect(maybe).to.deep.equal(Maybe.just([1, 2]));
            });
        });

        describe("goAsync", async () => {
            it("short-circuits on the first yielded Nothing", async () => {
                const maybe = await Maybe.goAsync(async function* () {
                    const x = yield* await Promise.resolve(Maybe.just<1>(1));
                    const [y, z] = yield* await Promise.resolve(
                        nothing<[1, 2]>(),
                    );
                    return tuple(x, y, z);
                });
                expect(maybe).to.equal(Maybe.nothing);
            });

            it("completes if all yielded values are Just", async () => {
                const maybe = await Maybe.goAsync(async function* () {
                    const x = yield* await Promise.resolve(Maybe.just<1>(1));
                    const [y, z] = yield* await Promise.resolve(
                        Maybe.just<[1, 2]>([x, 2]),
                    );
                    return tuple(x, y, z);
                });
                expect(maybe).to.deep.equal(Maybe.just([1, 1, 2]));
            });

            it("unwraps Promises in Just variants and in return", async () => {
                const maybe = await Maybe.goAsync(async function* () {
                    const x = yield* await Promise.resolve(
                        Maybe.just(Promise.resolve<1>(1)),
                    );
                    const [y, z] = yield* await Promise.resolve(
                        Maybe.just(Promise.resolve<[1, 2]>([x, 2])),
                    );
                    return Promise.resolve(tuple(x, y, z));
                });
                expect(maybe).to.deep.equal(Maybe.just([1, 1, 2]));
            });
        });

        describe("goAsyncFn", () => {
            it("accesses the parameters of the async generator function", async () => {
                const f = Maybe.goAsyncFn(async function* <T>(w: T) {
                    const x = yield* await Promise.resolve(Maybe.just<1>(1));
                    const [y, z] = yield* await Promise.resolve(
                        Maybe.just<[1, 2]>([x, 2]),
                    );
                    return tuple(w, x, y, z);
                });
                const maybe = await f<0>(0);
                expect(maybe).to.deep.equal(Maybe.just([0, 1, 1, 2]));
            });
        });

        describe("#[Eq.eq]", () => {
            it("compares Nothing and Nothing as equal", () => {
                expect(eq<Maybe<Num>>(Maybe.nothing, Maybe.nothing)).to.be.true;
            });

            it("compares Nothing and any Just as inequal", () => {
                fc.assert(
                    fc.property(arbNum(), (y) => {
                        expect(eq(Maybe.nothing, Maybe.just(y))).to.be.false;
                    }),
                );
            });

            it("compares any Just and Nothing as inequal", () => {
                fc.assert(
                    fc.property(arbNum(), (x) => {
                        expect(eq(Maybe.just(x), Maybe.nothing)).to.be.false;
                    }),
                );
            });

            it("compares the values if both variants are Just", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), (x, y) => {
                        expect(eq(Maybe.just(x), Maybe.just(y))).to.equal(
                            eq(x, y),
                        );
                    }),
                );
            });

            it("implements a lawful equivalence relation", () => {
                expectLawfulEq(arbMaybe(arbNum()));
            });
        });

        describe("#[Ord.cmp]", () => {
            it("compares Nothing as equal to Nothing", () => {
                expect(cmp<Maybe<Num>>(Maybe.nothing, Maybe.nothing)).to.equal(
                    Ordering.equal,
                );
            });

            it("compares Nothing as less than any Just", () => {
                fc.assert(
                    fc.property(arbNum(), (y) => {
                        expect(cmp(Maybe.nothing, Maybe.just(y))).to.equal(
                            Ordering.less,
                        );
                    }),
                );
            });

            it("compares any Just as greater than Nothing", () => {
                fc.assert(
                    fc.property(arbNum(), (x) => {
                        expect(cmp(Maybe.just(x), Maybe.nothing)).to.equal(
                            Ordering.greater,
                        );
                    }),
                );
            });

            it("compares the values if both variants are Just", () => {
                fc.assert(
                    fc.property(arbNum(), arbNum(), (x, y) => {
                        expect(cmp(Maybe.just(x), Maybe.just(y))).to.equal(
                            cmp(x, y),
                        );
                    }),
                );
            });

            it("implements a lawful total order", () => {
                expectLawfulOrd(arbMaybe(arbNum()));
            });
        });

        describe("#[Semigroup.cmb]", () => {
            it("returns Nothing if both variants are Nothing", () => {
                expect(cmb<Maybe<Str>>(Maybe.nothing, Maybe.nothing)).to.equal(
                    Maybe.nothing,
                );
            });

            it("keeps the second Just if the first variant is Nothing", () => {
                fc.assert(
                    fc.property(arbStr(), (y) => {
                        expect(cmb(Maybe.nothing, Maybe.just(y))).to.deep.equal(
                            Maybe.just(y),
                        );
                    }),
                );
            });

            it("keeps the first Just if the second variant is Nothing", () => {
                fc.assert(
                    fc.property(arbStr(), (x) => {
                        expect(cmb(Maybe.just(x), Maybe.nothing)).to.deep.equal(
                            Maybe.just(x),
                        );
                    }),
                );
            });

            it("combines the values if both variants are Just", () => {
                fc.assert(
                    fc.property(arbStr(), arbStr(), (x, y) => {
                        expect(cmb(Maybe.just(x), Maybe.just(y))).to.deep.equal(
                            Maybe.just(cmb(x, y)),
                        );
                    }),
                );
            });

            it("implements a lawful semigroup", () => {
                expectLawfulSemigroup(arbMaybe(arbStr()));
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

            it("applies the second function to the value if the variant is Just", () => {
                const result = Maybe.just<1>(1).unwrap(
                    (): 2 => 2,
                    (x): [1, 3] => [x, 3],
                );
                expect(result).to.deep.equal([1, 3]);
            });
        });

        describe("getOrElse", () => {
            it("evaluates the function if the variant is Nothing", () => {
                const result = nothing<1>().getOrElse((): 2 => 2);
                expect(result).to.equal(2);
            });

            it("extracts the value if the variant is Just", () => {
                const result = Maybe.just<1>(1).getOrElse((): 2 => 2);
                expect(result).to.equal(1);
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

        describe("#toNullish", () => {
            it("returns undefined if the variant is Nothing", () => {
                const result = nothing<1>().toNullish();
                expect(result).to.be.undefined;
            });

            it("extracts the value if the variant is Just", () => {
                const result = Maybe.just<1>(1).toNullish();
                expect(result).to.equal(1);
            });
        });

        describe("#recover", () => {
            it("evaluates the function if the variant is Nothing", () => {
                const maybe = nothing<1>().recover(() => Maybe.just<2>(2));
                expect(maybe).to.deep.equal(Maybe.just(2));
            });

            it("does not evaluate the function if the variant is Just", () => {
                const maybe = Maybe.just<1>(1).recover(() => Maybe.just<2>(2));
                expect(maybe).to.deep.equal(Maybe.just(1));
            });
        });

        describe("#flatMap", () => {
            it("does not apply the continuation if the variant is Nothing", () => {
                const maybe = nothing<1>().flatMap(
                    (x): Maybe<[1, 2]> => Maybe.just([x, 2]),
                );
                expect(maybe).to.equal(Maybe.nothing);
            });

            it("applies the continuation to the value if the variant is Just", () => {
                const maybe = Maybe.just<1>(1).flatMap(
                    (x): Maybe<[1, 2]> => Maybe.just([x, 2]),
                );
                expect(maybe).to.deep.equal(Maybe.just([1, 2]));
            });
        });

        describe("#zipWith", () => {
            it("applies the function to the values if both variants are Just", () => {
                const maybe = Maybe.just<1>(1).zipWith(Maybe.just<2>(2), tuple);
                expect(maybe).to.deep.equal(Maybe.just([1, 2]));
            });
        });

        describe("#zipFst", () => {
            it("keeps only the first value if both variants are Just", () => {
                const maybe = Maybe.just<1>(1).zipFst(Maybe.just<2>(2));
                expect(maybe).to.deep.equal(Maybe.just(1));
            });
        });

        describe("#zipSnd", () => {
            it("keeps only the second value if both variants are Just", () => {
                const maybe = Maybe.just<1>(1).zipSnd(Maybe.just<2>(2));
                expect(maybe).to.deep.equal(Maybe.just(2));
            });
        });

        describe("#map", () => {
            it("applies the function to the value if the variant is Just", () => {
                const maybe = Maybe.just<1>(1).map((x): [1, 2] => tuple(x, 2));
                expect(maybe).to.deep.equal(Maybe.just([1, 2]));
            });
        });
    });
});
