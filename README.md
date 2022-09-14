<h1 align="center">Neotype Prelude</h1>

<p align="center">
    <strong>Functional programming essentials for TypeScript</strong>
</p>

## Features

-   **Tools for comparing values**: use the contracts provided by the `Eq` and
    `Ord` interfaces to implement equivalence relations and total orderings.
-   **Tools for combining values**: use the contract provided by the `Semigroup`
    interface to implement semigroups.
-   **Algebraic data types**:
    -   Model optional values with `Maybe`.
    -   Handle failures with `Either`.
    -   Validate forms and user input with `Validated`.
    -   Implement stack-safe recursion with `Eval`.
    -   Get creative with more exotic types like `These`.
-   **Generator comprehensions**: simplify working with monads by writing
    imperative style code blocks using a coroutine syntax.
-   **Async generator comprehensions**: take generator comprehensions to the
    next level using the power of Promises and `async/await` syntax.

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

[es6 modules]: https://exploringjs.com/es6/ch_modules.html#sec_basics-of-es6-modules
