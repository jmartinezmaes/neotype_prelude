# Neotype Prelude

_Functional programming essentials for TypeScript_

## Quick links

-   [Documentation](https://jm4rtinez.github.io/neotype_prelude/)

## Features

-   **Tools for comparing values**: use the contracts provided by the `Eq` and
    `Ord` interfaces to implement equivalence relations and total orders.
-   **Tools for combining values**: use the contract provided by the `Semigroup`
    interface to implement semigroups.
-   **Algebraic data types**:
    -   Model optional values with `Maybe`.
    -   Handle failures with `Either`.
    -   Validate forms and user input with `Validation`.
    -   Get creative with more types like `Ior` and `Pair`.
-   **Generator comprehensions**: chain computations together by writing
    imperative style code blocks using a coroutine syntax.
-   **Async generator comprehensions**: work with `Promise` values inside of
    generator comprehensions using `async`/`await` syntax.

## Install

Neotype Prelude is available on NPM.

```sh
npm install @neotype/prelude
```

## Working with modules

This library provides a suite of [ES6 modules]. A `.js` suffix is required in
all import statements. All modules provide named exports.

```ts
import { cmb, Semigroup } from "@neotype/prelude/cmb.js";
import { cmp, eq, Eq, Ord } from "@neotype/prelude/cmp.js";
import { Either } from "@neotype/prelude/either.js";
import { Maybe } from "@neotype/prelude/maybe.js";
// etc.
```

See each module's documentation for recommended import practices and available
exports.

[es6 modules]:
	https://exploringjs.com/es6/ch_modules.html#sec_basics-of-es6-modules

## Inspiration

This library takes inspiration from many existing functional programming
languages and libraries, including:

-   [Haskell](https://www.haskell.org)
-   [Scala](https://scala-lang.org) and [Cats](https://typelevel.org/cats/)
-   [Rust](https://www.rust-lang.org/)
-   [fp-ts](https://github.com/gcanti/fp-ts)
-   [true-myth](https://github.com/true-myth/true-myth)
