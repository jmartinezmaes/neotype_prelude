/*
 * Copyright 2022-2023 Josh Martinez
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
	arbNum,
	expectLawfulEq,
	expectLawfulOrd,
	expectLawfulSemigroup,
} from "./_test/utils.js";
import { cmb } from "./cmb.js";
import {
	Eq,
	Ord,
	Ordering,
	Reverse,
	clamp,
	cmp,
	eq,
	ge,
	gt,
	icmp,
	icmpBy,
	ieq,
	ieqBy,
	le,
	lt,
	max,
	min,
	ne,
} from "./cmp.js";

describe("eq", () => {
	it("tests whether the two Eq values are equal", () => {
		fc.assert(
			fc.property(arbNum(), arbNum(), (x, y) => {
				expect(eq(x, y)).to.equal(x[Eq.eq](y));
			}),
		);
	});
});

describe("ne", () => {
	it("tests whether the two Eq values are inequal", () => {
		fc.assert(
			fc.property(arbNum(), arbNum(), (x, y) => {
				expect(ne(x, y)).to.equal(!x[Eq.eq](y));
			}),
		);
	});
});

describe("ieqBy", () => {
	function comparer(x: number, y: number): boolean {
		return x === y;
	}

	it("compares any two empty iterables as equal", () => {
		expect(ieqBy([], [], comparer)).to.be.true;
	});

	it("compares any non-empty iterable and any empty iterable as inequal", () => {
		fc.assert(
			fc.property(fc.float({ noNaN: true }), (a) => {
				expect(ieqBy([a], [], comparer)).to.be.false;
			}),
		);
	});

	it("compares any empty iterable and any non-empty iterable as inequal", () => {
		fc.assert(
			fc.property(fc.float({ noNaN: true }), (b) => {
				expect(ieqBy([], [b], comparer)).to.be.false;
			}),
		);
	});

	it("compares any longer iterable any the shorter iterable as inequal", () => {
		fc.assert(
			fc.property(
				fc.float({ noNaN: true }),
				fc.float({ noNaN: true }),
				fc.float({ noNaN: true }),
				(a, x, b) => {
					expect(ieqBy([a, x], [b], comparer)).to.be.false;
				},
			),
		);
	});

	it("compares any shorter iterable and any longer iterable as inequal", () => {
		fc.assert(
			fc.property(
				fc.float({ noNaN: true }),
				fc.float({ noNaN: true }),
				fc.float({ noNaN: true }),
				(a, b, y) => {
					expect(ieqBy([a], [b, y], comparer)).to.be.false;
				},
			),
		);
	});

	it("compares any two same-length iterables lexicographically", () => {
		fc.assert(
			fc.property(
				fc.float({ noNaN: true }),
				fc.float({ noNaN: true }),
				fc.float({ noNaN: true }),
				fc.float({ noNaN: true }),
				(a, x, b, y) => {
					expect(ieqBy([a, x], [b, y], comparer)).to.equal(
						comparer(a, b) && comparer(x, y),
					);
				},
			),
		);
	});
});

describe("ieq", () => {
	it("compares any two iterables of Eq elements lexicographically", () => {
		fc.assert(
			fc.property(
				arbNum(),
				arbNum(),
				arbNum(),
				arbNum(),
				(a, x, b, y) => {
					expect(ieq([a, x], [b, y])).to.equal(eq(a, b) && eq(x, y));
				},
			),
		);
	});
});

describe("cmp", () => {
	it("compares the first Ord value to the second", () => {
		fc.assert(
			fc.property(arbNum(), arbNum(), (x, y) => {
				expect(cmp(x, y)).to.equal(x[Ord.cmp](y));
			}),
		);
	});
});

describe("icmpBy", () => {
	function comparer(x: number, y: number): Ordering {
		return Ordering.fromNumber(x - y);
	}

	it("compares any two empty iterables as equal", () => {
		expect(icmpBy([], [], comparer)).to.equal(Ordering.equal);
	});

	it("compares any non-empty iterable as greater than any empty iterable", () => {
		fc.assert(
			fc.property(fc.float({ noNaN: true }), (a) => {
				expect(icmpBy([a], [], comparer)).to.equal(Ordering.greater);
			}),
		);
	});

	it("compares any empty iterable as less than any non-empty iterable", () => {
		fc.assert(
			fc.property(fc.float({ noNaN: true }), (b) => {
				expect(icmpBy([], [b], comparer)).to.equal(Ordering.less);
			}),
		);
	});

	it("compares any longer iterable to any shorter iterable lexicographically", () => {
		fc.assert(
			fc.property(
				fc.float({ noNaN: true }),
				fc.float({ noNaN: true }),
				fc.float({ noNaN: true }),
				(a, x, b) => {
					expect(icmpBy([a, x], [b], comparer)).to.equal(
						cmb(comparer(a, b), Ordering.greater),
					);
				},
			),
		);
	});

	it("compares any shorter iterable to any longer iterable lexicographically", () => {
		fc.assert(
			fc.property(
				fc.float({ noNaN: true }),
				fc.float({ noNaN: true }),
				fc.float({ noNaN: true }),
				(a, b, y) => {
					expect(icmpBy([a], [b, y], comparer)).to.equal(
						cmb(comparer(a, b), Ordering.less),
					);
				},
			),
		);
	});

	it("compares any two same-length iterables lexicographically", () => {
		fc.assert(
			fc.property(
				fc.float({ noNaN: true }),
				fc.float({ noNaN: true }),
				fc.float({ noNaN: true }),
				fc.float({ noNaN: true }),
				(a, x, b, y) => {
					expect(icmpBy([a, x], [b, y], comparer)).to.equal(
						cmb(comparer(a, b), comparer(x, y)),
					);
				},
			),
		);
	});
});

describe("icmp", () => {
	it("compares any two iterables of Ord elements lexicographically", () => {
		fc.assert(
			fc.property(
				arbNum(),
				arbNum(),
				arbNum(),
				arbNum(),
				(a, x, b, y) => {
					expect(icmp([a, x], [b, y])).to.equal(
						cmb(cmp(a, b), cmp(x, y)),
					);
				},
			),
		);
	});
});

describe("lt", () => {
	it("tests whether the first Ord value is less than the second", () => {
		fc.assert(
			fc.property(arbNum(), arbNum(), (x, y) => {
				expect(lt(x, y)).to.equal(cmp(x, y).isLt());
			}),
		);
	});
});

describe("gt", () => {
	it("tests whether the first Ord value is greater than the second", () => {
		fc.assert(
			fc.property(arbNum(), arbNum(), (x, y) => {
				expect(gt(x, y)).to.equal(cmp(x, y).isGt());
			}),
		);
	});
});

describe("le", () => {
	it("tests whether the first Ord value is less than or equal to the second", () => {
		fc.assert(
			fc.property(arbNum(), arbNum(), (x, y) => {
				expect(le(x, y)).to.equal(cmp(x, y).isLe());
			}),
		);
	});
});

describe("ge", () => {
	it("tests whether the first Ord value is greater than or equal to the second", () => {
		fc.assert(
			fc.property(arbNum(), arbNum(), (x, y) => {
				expect(ge(x, y)).to.equal(cmp(x, y).isGe());
			}),
		);
	});
});

describe("min", () => {
	it("returns the lesser of the two Ord values", () => {
		fc.assert(
			fc.property(arbNum(), arbNum(), (x, y) => {
				expect(min(x, y)).to.equal(le(x, y) ? x : y);
			}),
		);
	});
});

describe("max", () => {
	it("returns the greater of the two Ord values", () => {
		fc.assert(
			fc.property(arbNum(), arbNum(), (x, y) => {
				expect(max(x, y)).to.equal(ge(x, y) ? x : y);
			}),
		);
	});
});

describe("clamp", () => {
	it("restricts the Ord value to an inclusive bounds", () => {
		fc.assert(
			fc.property(arbNum(), arbNum(), arbNum(), (x, y, z) => {
				expect(clamp(x, y, z)).to.equal(min(max(x, y), z));
			}),
		);
	});
});

describe("Ordering", () => {
	function arbOrdering(): fc.Arbitrary<Ordering> {
		return fc.oneof(
			fc.constant(Ordering.less),
			fc.constant(Ordering.equal),
			fc.constant(Ordering.greater),
		);
	}

	describe("fromNumber", () => {
		it("returns Less if the argument is less than 0", () => {
			fc.assert(
				fc.property(
					fc.float({ min: -Infinity, max: -1, noNaN: true }),
					(x) => {
						expect(Ordering.fromNumber(x)).to.equal(Ordering.less);
					},
				),
			);
		});

		it("returns Greater if the argument is greater than 0", () => {
			fc.assert(
				fc.property(
					fc.float({ min: 1, max: Infinity, noNaN: true }),
					(x) => {
						expect(Ordering.fromNumber(x)).to.equal(
							Ordering.greater,
						);
					},
				),
			);
		});

		it("returns Equal if the argument is 0", () => {
			expect(Ordering.fromNumber(0)).to.equal(Ordering.equal);
		});
	});

	describe("#[Eq.eq]", () => {
		it("compares Less and Less as equal", () => {
			expect(eq(Ordering.less, Ordering.less)).to.be.true;
		});

		it("compares Less and Equal as inequal", () => {
			expect(eq(Ordering.less, Ordering.equal)).to.be.false;
		});

		it("compares Less and Greater as inequal", () => {
			expect(eq(Ordering.less, Ordering.greater)).to.be.false;
		});

		it("compares Equal and Less as inequal", () => {
			expect(eq(Ordering.equal, Ordering.less)).to.be.false;
		});

		it("compares Equal and Equal as equal", () => {
			expect(eq(Ordering.equal, Ordering.equal)).to.be.true;
		});

		it("compares Equal and Greater as inequal", () => {
			expect(eq(Ordering.equal, Ordering.greater)).to.be.false;
		});

		it("compares Greater and Less as inequal", () => {
			expect(eq(Ordering.greater, Ordering.less)).to.be.false;
		});

		it("compares Greater and Equal as inequal", () => {
			expect(eq(Ordering.greater, Ordering.equal)).to.be.false;
		});

		it("compares Greater and Greater as equal", () => {
			expect(eq(Ordering.greater, Ordering.greater)).to.be.true;
		});

		it("implements a lawful equivalence relation", () => {
			expectLawfulEq(arbOrdering());
		});
	});

	describe("#[Ord.cmp]", () => {
		it("compares Less as equal to Less", () => {
			expect(cmp(Ordering.less, Ordering.less)).to.equal(Ordering.equal);
		});

		it("compares Less as less than Equal", () => {
			expect(cmp(Ordering.less, Ordering.equal)).to.equal(Ordering.less);
		});

		it("compares Less as less than Greater", () => {
			expect(cmp(Ordering.less, Ordering.greater)).to.equal(
				Ordering.less,
			);
		});

		it("compares Equal as greater than Less", () => {
			expect(cmp(Ordering.equal, Ordering.less)).to.equal(
				Ordering.greater,
			);
		});

		it("compares Equal as equal to Equal", () => {
			expect(cmp(Ordering.equal, Ordering.equal)).to.equal(
				Ordering.equal,
			);
		});

		it("compares Equal as less than Greater", () => {
			expect(cmp(Ordering.equal, Ordering.greater)).to.equal(
				Ordering.less,
			);
		});

		it("compares Greater as greater than Less", () => {
			expect(cmp(Ordering.greater, Ordering.less)).to.equal(
				Ordering.greater,
			);
		});

		it("compares Greater as greater than Equal", () => {
			expect(cmp(Ordering.greater, Ordering.equal)).to.equal(
				Ordering.greater,
			);
		});

		it("compares Greater as equal to Greater", () => {
			expect(cmp(Ordering.greater, Ordering.greater)).to.equal(
				Ordering.equal,
			);
		});

		it("implements a lawful total order", () => {
			expectLawfulOrd(arbOrdering());
		});
	});

	describe("#[Semigroup.cmb]", () => {
		it("combines Less and Less into Less", () => {
			expect(cmb(Ordering.less, Ordering.less)).to.equal(Ordering.less);
		});

		it("combines Less and Equal into Less", () => {
			expect(cmb(Ordering.less, Ordering.equal)).to.equal(Ordering.less);
		});

		it("combines Less and Greater into Less", () => {
			expect(cmb(Ordering.less, Ordering.greater)).to.equal(
				Ordering.less,
			);
		});

		it("combines Equal and Less into Less", () => {
			expect(cmb(Ordering.equal, Ordering.less)).to.equal(Ordering.less);
		});

		it("combines Equal and Equal into Equal", () => {
			expect(cmb(Ordering.equal, Ordering.equal)).to.equal(
				Ordering.equal,
			);
		});

		it("combines Equal and Greater into Greater", () => {
			expect(cmb(Ordering.equal, Ordering.greater)).to.equal(
				Ordering.greater,
			);
		});

		it("combines Greater and Less into Greater", () => {
			expect(cmb(Ordering.greater, Ordering.less)).to.equal(
				Ordering.greater,
			);
		});

		it("combines Greater and Equal into Greater", () => {
			expect(cmb(Ordering.greater, Ordering.equal)).to.equal(
				Ordering.greater,
			);
		});

		it("combines Greater and Greater into Greater", () => {
			expect(cmb(Ordering.greater, Ordering.greater)).to.equal(
				Ordering.greater,
			);
		});

		it("implements a lawful semigroup", () => {
			expectLawfulSemigroup(arbOrdering());
		});
	});

	describe("#isEq", () => {
		it("returns false if the variant is Less", () => {
			expect(Ordering.less.isEq()).to.be.false;
		});

		it("returns true if the variant is Equal", () => {
			expect(Ordering.equal.isEq()).to.be.true;
		});

		it("returns false if the variant is Greater", () => {
			expect(Ordering.greater.isEq()).to.be.false;
		});
	});

	describe("#isNe", () => {
		it("returns true if the variant is Less", () => {
			expect(Ordering.less.isNe()).to.be.true;
		});

		it("returns false if the variant is Equal", () => {
			expect(Ordering.equal.isNe()).to.be.false;
		});

		it("returns true if the variant is Greater", () => {
			expect(Ordering.greater.isNe()).to.be.true;
		});
	});

	describe("#isLt", () => {
		it("returns true if the variant is Less", () => {
			expect(Ordering.less.isLt()).to.be.true;
		});

		it("returns false if the variant is Equal", () => {
			expect(Ordering.equal.isLt()).to.be.false;
		});

		it("returns false if the variant is Greater", () => {
			expect(Ordering.greater.isLt()).to.be.false;
		});
	});

	describe("#isGt", () => {
		it("returns false if the variant is Less", () => {
			expect(Ordering.less.isGt()).to.be.false;
		});

		it("returns false if the variant is Equal", () => {
			expect(Ordering.equal.isGt()).to.be.false;
		});

		it("returns true if the variant is Greater", () => {
			expect(Ordering.greater.isGt()).to.be.true;
		});
	});

	describe("#isLe", () => {
		it("returns true if the variant is Less", () => {
			expect(Ordering.less.isLe()).to.be.true;
		});

		it("returns true if the variant is Equal", () => {
			expect(Ordering.equal.isLe()).to.be.true;
		});

		it("returns false if the variant is Greater", () => {
			expect(Ordering.greater.isLe()).to.be.false;
		});
	});

	describe("#isGe", () => {
		it("returns false if the variant is Less", () => {
			expect(Ordering.less.isGe()).to.be.false;
		});

		it("returns true if the variant is Equal", () => {
			expect(Ordering.equal.isGe()).to.be.true;
		});

		it("returns true if the variant is Greater", () => {
			expect(Ordering.greater.isGe()).to.be.true;
		});
	});

	describe("#reverse", () => {
		it("returns Greater if the variant is Less", () => {
			expect(Ordering.less.reverse()).to.equal(Ordering.greater);
		});

		it("returns Equal if the variant is Equal", () => {
			expect(Ordering.equal.reverse()).to.equal(Ordering.equal);
		});

		it("returns Less if the variant is Greater", () => {
			expect(Ordering.greater.reverse()).to.equal(Ordering.less);
		});
	});

	describe("#toNumber", () => {
		it("returns -1 if the variant is Less", () => {
			expect(Ordering.less.toNumber()).to.equal(-1);
		});

		it("returns 0 if the variant is Equal", () => {
			expect(Ordering.equal.toNumber()).to.equal(0);
		});

		it("returns 1 if the variant is Greater", () => {
			expect(Ordering.greater.toNumber()).to.equal(1);
		});
	});
});

describe("Reverse", () => {
	function arbReverse<T>(arbVal: fc.Arbitrary<T>): fc.Arbitrary<Reverse<T>> {
		return arbVal.map((val) => new Reverse(val));
	}

	describe("#[Eq.eq]", () => {
		it("compares the underlying values", () => {
			fc.assert(
				fc.property(
					arbReverse(arbNum()),
					arbReverse(arbNum()),
					(x, y) => {
						expect(eq(x, y)).to.equal(eq(x.val, y.val));
					},
				),
			);
		});

		it("implements a lawful equivalence relation", () => {
			expectLawfulEq(arbReverse(arbNum()));
		});
	});

	describe("#[Ord.cmp]", () => {
		it("reverses the Ordering of the underlying values", () => {
			fc.assert(
				fc.property(
					arbReverse(arbNum()),
					arbReverse(arbNum()),
					(x, y) => {
						expect(cmp(x, y)).to.equal(cmp(x.val, y.val).reverse());
					},
				),
			);
		});

		it("implements a lawful total order", () => {
			expectLawfulOrd(arbReverse(arbNum()));
		});
	});
});
