/*
 * Copyright 2022-2024 Joshua Martinez-Maes
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
		const property = fc.property(arbNum(), arbNum(), (lhs, rhs) => {
			expect(eq(lhs, rhs)).to.equal(lhs[Eq.eq](rhs));
		});
		fc.assert(property);
	});
});

describe("ne", () => {
	it("tests whether the two Eq values are inequal", () => {
		const property = fc.property(arbNum(), arbNum(), (lhs, rhs) => {
			expect(ne(lhs, rhs)).to.equal(!lhs[Eq.eq](rhs));
		});
		fc.assert(property);
	});
});

describe("ieqBy", () => {
	function comparer(lhs: number, rhs: number): boolean {
		return lhs === rhs;
	}

	it("compares any two empty iterables as equal", () => {
		expect(ieqBy([], [], comparer)).to.be.true;
	});

	it("compares any non-empty iterable and any empty iterable as inequal", () => {
		const property = fc.property(fc.float({ noNaN: true }), (lhs0) => {
			expect(ieqBy([lhs0], [], comparer)).to.be.false;
		});
		fc.assert(property);
	});

	it("compares any empty iterable and any non-empty iterable as inequal", () => {
		const property = fc.property(fc.float({ noNaN: true }), (rhs0) => {
			expect(ieqBy([], [rhs0], comparer)).to.be.false;
		});
		fc.assert(property);
	});

	it("compares any longer iterable any the shorter iterable as inequal", () => {
		const property = fc.property(
			fc.float({ noNaN: true }),
			fc.float({ noNaN: true }),
			fc.float({ noNaN: true }),
			(lhs0, lhs1, rhs0) => {
				expect(ieqBy([lhs0, lhs1], [rhs0], comparer)).to.be.false;
			},
		);
		fc.assert(property);
	});

	it("compares any shorter iterable and any longer iterable as inequal", () => {
		const property = fc.property(
			fc.float({ noNaN: true }),
			fc.float({ noNaN: true }),
			fc.float({ noNaN: true }),
			(lhs0, rhs0, rhs1) => {
				expect(ieqBy([lhs0], [rhs0, rhs1], comparer)).to.be.false;
			},
		);
		fc.assert(property);
	});

	it("compares any two same-length iterables lexicographically", () => {
		const property = fc.property(
			fc.float({ noNaN: true }),
			fc.float({ noNaN: true }),
			fc.float({ noNaN: true }),
			fc.float({ noNaN: true }),
			(lhs0, lhs1, rhs0, rhs1) => {
				expect(ieqBy([lhs0, lhs1], [rhs0, rhs1], comparer)).to.equal(
					comparer(lhs0, rhs0) && comparer(lhs1, rhs1),
				);
			},
		);
		fc.assert(property);
	});
});

describe("ieq", () => {
	it("compares any two iterables of Eq elements lexicographically", () => {
		const property = fc.property(
			arbNum(),
			arbNum(),
			arbNum(),
			arbNum(),
			(lhs0, lhs1, rhs0, rhs1) => {
				expect(ieq([lhs0, lhs1], [rhs0, rhs1])).to.equal(
					eq(lhs0, rhs0) && eq(lhs1, rhs1),
				);
			},
		);
		fc.assert(property);
	});
});

describe("cmp", () => {
	it("compares the first Ord value to the second", () => {
		const property = fc.property(arbNum(), arbNum(), (lhs, rhs) => {
			expect(cmp(lhs, rhs)).to.equal(lhs[Ord.cmp](rhs));
		});
		fc.assert(property);
	});
});

describe("icmpBy", () => {
	function comparer(lhs: number, rhs: number): Ordering {
		return Ordering.fromNumber(lhs - rhs);
	}

	it("compares any two empty iterables as equal", () => {
		expect(icmpBy([], [], comparer)).to.equal(Ordering.equal);
	});

	it("compares any non-empty iterable as greater than any empty iterable", () => {
		const property = fc.property(fc.float({ noNaN: true }), (lhs0) => {
			expect(icmpBy([lhs0], [], comparer)).to.equal(Ordering.greater);
		});
		fc.assert(property);
	});

	it("compares any empty iterable as less than any non-empty iterable", () => {
		const property = fc.property(fc.float({ noNaN: true }), (rhs0) => {
			expect(icmpBy([], [rhs0], comparer)).to.equal(Ordering.less);
		});
		fc.assert(property);
	});

	it("compares any longer iterable to any shorter iterable lexicographically", () => {
		const property = fc.property(
			fc.float({ noNaN: true }),
			fc.float({ noNaN: true }),
			fc.float({ noNaN: true }),
			(lhs0, lhs1, rhs0) => {
				expect(icmpBy([lhs0, lhs1], [rhs0], comparer)).to.equal(
					cmb(comparer(lhs0, rhs0), Ordering.greater),
				);
			},
		);
		fc.assert(property);
	});

	it("compares any shorter iterable to any longer iterable lexicographically", () => {
		const property = fc.property(
			fc.float({ noNaN: true }),
			fc.float({ noNaN: true }),
			fc.float({ noNaN: true }),
			(lhs0, rhs0, rhs1) => {
				expect(icmpBy([lhs0], [rhs0, rhs1], comparer)).to.equal(
					cmb(comparer(lhs0, rhs0), Ordering.less),
				);
			},
		);
		fc.assert(property);
	});

	it("compares any two same-length iterables lexicographically", () => {
		const property = fc.property(
			fc.float({ noNaN: true }),
			fc.float({ noNaN: true }),
			fc.float({ noNaN: true }),
			fc.float({ noNaN: true }),
			(lhs0, lhs1, rhs0, rhs1) => {
				expect(icmpBy([lhs0, lhs1], [rhs0, rhs1], comparer)).to.equal(
					cmb(comparer(lhs0, rhs0), comparer(lhs1, rhs1)),
				);
			},
		);
		fc.assert(property);
	});
});

describe("icmp", () => {
	it("compares any two iterables of Ord elements lexicographically", () => {
		const property = fc.property(
			arbNum(),
			arbNum(),
			arbNum(),
			arbNum(),
			(lhs0, lhs1, rhs0, rhs1) => {
				expect(icmp([lhs0, lhs1], [rhs0, rhs1])).to.equal(
					cmb(cmp(lhs0, rhs0), cmp(lhs1, rhs1)),
				);
			},
		);
		fc.assert(property);
	});
});

describe("lt", () => {
	it("tests whether the first Ord value is less than the second", () => {
		const property = fc.property(arbNum(), arbNum(), (lhs, rhs) => {
			expect(lt(lhs, rhs)).to.equal(cmp(lhs, rhs).isLt());
		});
		fc.assert(property);
	});
});

describe("gt", () => {
	it("tests whether the first Ord value is greater than the second", () => {
		const property = fc.property(arbNum(), arbNum(), (lhs, rhs) => {
			expect(gt(lhs, rhs)).to.equal(cmp(lhs, rhs).isGt());
		});
		fc.assert(property);
	});
});

describe("le", () => {
	it("tests whether the first Ord value is less than or equal to the second", () => {
		const property = fc.property(arbNum(), arbNum(), (lhs, rhs) => {
			expect(le(lhs, rhs)).to.equal(cmp(lhs, rhs).isLe());
		});
		fc.assert(property);
	});
});

describe("ge", () => {
	it("tests whether the first Ord value is greater than or equal to the second", () => {
		const property = fc.property(arbNum(), arbNum(), (lhs, rhs) => {
			expect(ge(lhs, rhs)).to.equal(cmp(lhs, rhs).isGe());
		});
		fc.assert(property);
	});
});

describe("min", () => {
	it("returns the lesser of the two Ord values", () => {
		const property = fc.property(arbNum(), arbNum(), (lhs, rhs) => {
			expect(min(lhs, rhs)).to.equal(le(lhs, rhs) ? lhs : rhs);
		});
		fc.assert(property);
	});
});

describe("max", () => {
	it("returns the greater of the two Ord values", () => {
		const property = fc.property(arbNum(), arbNum(), (lhs, rhs) => {
			expect(max(lhs, rhs)).to.equal(ge(lhs, rhs) ? lhs : rhs);
		});
		fc.assert(property);
	});
});

describe("clamp", () => {
	it("restricts the Ord value to an inclusive bounds", () => {
		const property = fc.property(
			arbNum(),
			arbNum(),
			arbNum(),
			(val, lo, hi) => {
				expect(clamp(val, lo, hi)).to.equal(min(max(val, lo), hi));
			},
		);
		fc.assert(property);
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
			const property = fc.property(
				fc.oneof(
					fc.float({ max: -1, noNaN: true }),
					fc.bigInt({ max: -1n }),
				),
				(input) => {
					expect(Ordering.fromNumber(input)).to.equal(Ordering.less);
				},
			);
			fc.assert(property);
		});

		it("returns Greater if the argument is greater than 0", () => {
			const property = fc.property(
				fc.oneof(
					fc.float({ min: 1, noNaN: true }),
					fc.bigInt({ min: 1n }),
				),
				(input) => {
					expect(Ordering.fromNumber(input)).to.equal(
						Ordering.greater,
					);
				},
			);
			fc.assert(property);
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
			const property = fc.property(
				arbReverse(arbNum()),
				arbReverse(arbNum()),
				(lhs, rhs) => {
					expect(eq(lhs, rhs)).to.equal(eq(lhs.val, rhs.val));
				},
			);
			fc.assert(property);
		});

		it("implements a lawful equivalence relation", () => {
			expectLawfulEq(arbReverse(arbNum()));
		});
	});

	describe("#[Ord.cmp]", () => {
		it("reverses the Ordering of the underlying values", () => {
			const property = fc.property(
				arbReverse(arbNum()),
				arbReverse(arbNum()),
				(lhs, rhs) => {
					expect(cmp(lhs, rhs)).to.equal(
						cmp(lhs.val, rhs.val).reverse(),
					);
				},
			);
			fc.assert(property);
		});

		it("implements a lawful total order", () => {
			expectLawfulOrd(arbReverse(arbNum()));
		});
	});
});
