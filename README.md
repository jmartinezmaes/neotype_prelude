# neotype_prelude

Functional programming essentials for TypeScript

[![Build and Test](https://github.com/jmartinezmaes/neotype_prelude/actions/workflows/build_and_test.yml/badge.svg)](https://github.com/jmartinezmaes/neotype_prelude/actions/workflows/build_and_test.yml)
[![NPM Version](https://img.shields.io/npm/v/@neotype/prelude?color=33cd56&logo=npm&label=NPM)](https://www.npmjs.com/package/@neotype/prelude)

## Quick links

-   [Documentation](https://jmartinezmaes.github.io/neotype_prelude/)

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

neotype_prelude is available on NPM.

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

-   [Rust](https://www.rust-lang.org/)
-   [Haskell](https://www.haskell.org)
-   [Scala](https://scala-lang.org)
