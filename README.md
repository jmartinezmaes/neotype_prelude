# Neotype Prelude

Functional programming essentials for TypeScript

[![Build and Test](https://github.com/jmartinezmaes/neotype_prelude/actions/workflows/build_and_test.yml/badge.svg)](https://github.com/jmartinezmaes/neotype_prelude/actions/workflows/build_and_test.yml)
[![NPM Version](https://img.shields.io/npm/v/@neotype/prelude?color=33cd56&logo=npm&label=NPM)](https://www.npmjs.com/package/@neotype/prelude)

## Quick links

-   [Documentation](https://jmartinezmaes.github.io/neotype_prelude/)

## Features

### Lightweight functional abstractions

Neotype Prelude provides several contracts that each describe a structure and a
set of laws for which data types can define their own implementation.

-   `Eq` for modelling equivalence relations.
-   `Ord` for modelling total orders.
-   `Semigroup` for modelling associative combination.

### Functional data types

Neotype Prelude supplies a collection of data types for solving common problems
in both syncrhonous and asynchronous contexts:

-   `Annotation` and `AsyncAnnotation` for logging and accumulating information
    in a non-error state
-   `Either` and `AsyncEither` for modelling failure or unions of values
-   `Ior` and `AsyncIor` for modelling failure with logging or inclusive unions
    of values
-   `Maybe` and `AsyncMaybe` for modelling optional values
-   `Pair` for modelling pairs of values
-   `Validation` and `AsyncValidation` for modelling accumulating failures, like
    when validating data

### Generator comprehensions

**Generator comprehensions** are reusable, composable generator functions that
compose functional data types in an imperative style. They support all native
syntax (conditional statements, loops and iteration, try/catch/finally, etc.).

```ts
import { Maybe } from "@neotype/prelude/maybe.js";

declare function parseInteger(input: string): Maybe<number>;
declare function checkEven(input: number): Maybe<number>;

function* goParseEvenInteger(input: string): Maybe.Go<number> {
	const int = yield* parseInteger(input);
	const evenInt = yield* checkEven(int);
	return evenInt;
}

const maybeEvenInt = Maybe.go(goParseEvenInteger(42));
console.log(maybeEvenInt);
```

Generator comprehension syntax is available for the `Annotation`, `Either`,
`Ior`, and `Maybe` data types.

**Async generator comprehensions** add the power of promises and `async`/`await`
syntax to their synchronous counterparts for working seamlessly with async data
types.

```ts
import { AsyncMaybe } from "@neotype/prelude/async/maybe.js";

declare function fetchAuthorIdByEmail(email: string): AsyncMaybe<number>;
declare function fetchPostsByAuthorId(id: number): AsyncMaybe<string[]>;

async function* goFetchPostsByAuthorEmail(
	email: string,
): AsyncMaybe.Go<string[]> {
	const authorId = yield* await fetchAuthorIdByEmail(email);
	const posts = yield* await fetchPostsByAuthorId(authorId);
	return posts;
}

AsyncMaybe.go(goFetchPostsByAuthorEmail("test@example.com"))
	.then(console.log)
	.catch(console.error);
```

Async generator comprehension syntax is available for the `AsyncAnnotation`,
`AsyncEither`,`AsyncIor`, and `AsyncMaybe` data types.

## Design philosophy

Neotype Prelude strives to:

-   promote a fluent functional programming style via a chainable method-based
    API
-   utilize idiomatic JavaScript and TypeScript programming patterns
-   provide seamless interoperability with asynchronous workflows (native
    promises, `async`/`await`, async iteration, etc.) by avoiding wrapper types
    and relying instead on existing language features.

## Installation

Neotype Prelude is available on NPM.

```sh
npm install @neotype/prelude
```

## Working with modules

This library provides a suite of [ES6 modules]. A `.js` suffix is required in
all import statements. See each module's documentation for recommended import
practices and available exports.

[es6 modules]:
	https://exploringjs.com/es6/ch_modules.html#sec_basics-of-es6-modules

## Inspiration

This library takes inspiration from many existing functional programming
languages and libraries, including:

-   [Rust](https://www.rust-lang.org/)
-   [Haskell](https://www.haskell.org)
-   [Scala](https://scala-lang.org)
