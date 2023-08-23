# Changelog

All notable changes to this project will be documented in this file. This
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Version 0.9.0 - 2023-04-22

### What's Changed

#### 💥 Breaking Changes

-   Refactor generator comprehensions by
    [@jmartinezmaes](https://github.com/jmartinezmaes) in
    [#93](https://github.com/jmartinezmaes/neotype_prelude/pull/93)
-   Rename the `collect` combinators to `all` by
    [@jmartinezmaes](https://github.com/jmartinezmaes) in
    [#94](https://github.com/jmartinezmaes/neotype_prelude/pull/94)
-   Rename the `gather` combinators to `allProps` by
    [@jmartinezmaes](https://github.com/jmartinezmaes) in
    [#95](https://github.com/jmartinezmaes/neotype_prelude/pull/95)
-   Remove `zipFst` methods; rename `zipSnd` methods to `and` by
    [@jmartinezmaes](https://github.com/jmartinezmaes) in
    [#97](https://github.com/jmartinezmaes/neotype_prelude/pull/97)
-   Refactor methods for chaining and recovery by
    [@jmartinezmaes](https://github.com/jmartinezmaes) in
    [#99](https://github.com/jmartinezmaes/neotype_prelude/pull/99)
-   Remove the `eval` module by
    [@jmartinezmaes](https://github.com/jmartinezmaes) in
    [#103](https://github.com/jmartinezmaes/neotype_prelude/pull/103)

#### 🚀 Enhancements

-   Introduce support for TypeScript 5.0 by
    [@jmartinezmaes](https://github.com/jmartinezmaes) in
    [#91](https://github.com/jmartinezmaes/neotype_prelude/pull/91)
-   For `Ior`, introduce the `fromTuple` function by
    [@jmartinezmaes](https://github.com/jmartinezmaes) in
    [#100](https://github.com/jmartinezmaes/neotype_prelude/pull/100)
-   Introduce asynchronous combinators for collecting into data types by
    [@jmartinezmaes](https://github.com/jmartinezmaes) in
    [#101](https://github.com/jmartinezmaes/neotype_prelude/pull/101)
-   Allow `all` and `allAsync` to accept any iterable by
    [@jmartinezmaes](https://github.com/jmartinezmaes) in
    [#102](https://github.com/jmartinezmaes/neotype_prelude/pull/102)

#### 🐛 Bug Fixes

-   Always return non-readonly types from `collect` and `gather` functions by
    [@jmartinezmaes](https://github.com/jmartinezmaes) in
    [#90](https://github.com/jmartinezmaes/neotype_prelude/pull/90)

**Full Changelog**:
https://github.com/jmartinezmaes/neotype_prelude/compare/v0.8.1...v0.9.0

## Version 0.8.1 - 2023-03-13

### What's Changed

#### 🚀 Enhancements

-   For `Maybe`, introduce the `mapNullish` method by
    [@jmartinezmaes](https://github.com/jmartinezmaes) in
    [#84](https://github.com/jmartinezmaes/neotype_prelude/pull/84)
-   For `Maybe`, introduce the `filter` method by
    [@jmartinezmaes](https://github.com/jmartinezmaes) in
    [#85](https://github.com/jmartinezmaes/neotype_prelude/pull/85)
-   Allow `finally` blocks to execute in generator comprehensions by
    [@jmartinezmaes](https://github.com/jmartinezmaes) in
    [#86](https://github.com/jmartinezmaes/neotype_prelude/pull/86)

**Full Changelog**:
https://github.com/jmartinezmaes/neotype_prelude/compare/v0.8.0...v0.8.1

## Version 0.8.0 - 2023-02-27

### What's Changed

#### 💥 Breaking Changes

-   Rename discriminator enumerations and properties by
    [@jmartinezmaes](https://github.com/jmartinezmaes) in
    [#70](https://github.com/jmartinezmaes/neotype_prelude/pull/70)
-   For `Maybe`, rename `fromMissing` to `fromNullish` by
    [@jmartinezmaes](https://github.com/jmartinezmaes) in
    [#81](https://github.com/jmartinezmaes/neotype_prelude/pull/81)

#### 🚀 Enhancements

-   Introduce the `goFn` and `goAsyncFn` functions by
    [@jmartinezmaes](https://github.com/jmartinezmaes) in
    [#71](https://github.com/jmartinezmaes/neotype_prelude/pull/71)
-   Improve tuple type inference in functions that accept arrays or tuples by
    [@jmartinezmaes](https://github.com/jmartinezmaes) in
    [#79](https://github.com/jmartinezmaes/neotype_prelude/pull/79)
-   For `Maybe`, introduce the `toNullish` method by
    [@jmartinezmaes](https://github.com/jmartinezmaes) in
    [#82](https://github.com/jmartinezmaes/neotype_prelude/pull/82)

#### 📖 Documentation

-   Add doc comments for all members currently missing them by
    [@jmartinezmaes](https://github.com/jmartinezmaes) in
    [#74](https://github.com/jmartinezmaes/neotype_prelude/pull/74)
-   Fix broken Markdown links in the documentation by
    [@jmartinezmaes](https://github.com/jmartinezmaes) in
    [#75](https://github.com/jmartinezmaes/neotype_prelude/pull/75)
-   Revise the module documentation for `Either` by
    [@jmartinezmaes](https://github.com/jmartinezmaes) in
    [#77](https://github.com/jmartinezmaes/neotype_prelude/pull/77)
-   Fill in more missing documentation by
    [@jmartinezmaes](https://github.com/jmartinezmaes) in
    [#78](https://github.com/jmartinezmaes/neotype_prelude/pull/78)
-   Fix incorrect spelling of "their" in the docs for `maybe` by
    [@jmartinezmaes](https://github.com/jmartinezmaes) in
    [#80](https://github.com/jmartinezmaes/neotype_prelude/pull/80)

**Full Changelog**:
https://github.com/jmartinezmaes/neotype_prelude/compare/v0.7.0...v0.8.0

## Version 0.7.0 - 2023-01-22

### What's Changed

#### 💥 Breaking Changes

-   Name enum members using SCREAMING_SNAKE_CASE conventions by
    [@jmartinezmaes](https://github.com/jmartinezmaes) in
    [#66](https://github.com/jmartinezmaes/neotype_prelude/pull/66)

**Full Changelog**:
https://github.com/jmartinezmaes/neotype_prelude/compare/v0.6.0...v0.7.0

## Version 0.6.0 - 2022-12-16

### What's Changed

#### 💥 Breaking Changes

-   For `Maybe`, rename the `justOrElse` method to `justOr` by
    [@jmartinezmaes](https://github.com/jmartinezmaes) in
    [#17](https://github.com/jmartinezmaes/neotype_prelude/pull/17)
-   Rename the `validated` module and `Validated` type by
    [@jmartinezmaes](https://github.com/jmartinezmaes) in
    [#20](https://github.com/jmartinezmaes/neotype_prelude/pull/20)
-   Remove the `*OrFold` methods by
    [@jmartinezmaes](https://github.com/jmartinezmaes) in
    [#21](https://github.com/jmartinezmaes/neotype_prelude/pull/21)
-   Rename the `fold` methods to `unwrap` by
    [@jmartinezmaes](https://github.com/jmartinezmaes) in
    [#22](https://github.com/jmartinezmaes/neotype_prelude/pull/22)
-   Remove the `flat` combinators by
    [@jmartinezmaes](https://github.com/jmartinezmaes) in
    [#25](https://github.com/jmartinezmaes/neotype_prelude/pull/25)
-   For `Maybe`, rename `getOrFallback` to `getOr` by
    [@jmartinezmaes](https://github.com/jmartinezmaes) in
    [#26](https://github.com/jmartinezmaes/neotype_prelude/pull/26)
-   Remove the semigroup behavior from `Reverse` by
    [@jmartinezmaes](https://github.com/jmartinezmaes) in
    [#30](https://github.com/jmartinezmaes/neotype_prelude/pull/30)
-   Refactor the `guard` and `negate` combinators by
    [@jmartinezmaes](https://github.com/jmartinezmaes) in
    [#33](https://github.com/jmartinezmaes/neotype_prelude/pull/33)
-   Remove the `bimap` combinators by
    [@jmartinezmaes](https://github.com/jmartinezmaes) in
    [#41](https://github.com/jmartinezmaes/neotype_prelude/pull/41)
-   For `Either`, and `Maybe`, remove the `orElse` combinators by
    [@jmartinezmaes](https://github.com/jmartinezmaes) in
    [#46](https://github.com/jmartinezmaes/neotype_prelude/pull/46)

#### 🚀 Enhancements

-   Introduce the `lift` combinators and `wrapCtor` function by
    [@jmartinezmaes](https://github.com/jmartinezmaes) in
    [#23](https://github.com/jmartinezmaes/neotype_prelude/pull/23)
-   For `Ordering.fromNumber`, allow a `bigint` argument by
    [@jmartinezmaes](https://github.com/jmartinezmaes) in
    [#31](https://github.com/jmartinezmaes/neotype_prelude/pull/31)
-   For `Maybe`, introduce the `wrapFn` combinator by
    [@jmartinezmaes](https://github.com/jmartinezmaes) in
    [#35](https://github.com/jmartinezmaes/neotype_prelude/pull/35)
-   For `Ior`, introduce the `fromValidation` function by
    [@jmartinezmaes](https://github.com/jmartinezmaes) in
    [#45](https://github.com/jmartinezmaes/neotype_prelude/pull/45)
-   For `Maybe`, introduce the `getOrElse` method by
    [@jmartinezmaes](https://github.com/jmartinezmaes) in
    [#48](https://github.com/jmartinezmaes/neotype_prelude/pull/48)

**Full Changelog**:
https://github.com/jmartinezmaes/neotype_prelude/compare/v0.5.0...v0.6.0

## Version 0.5.0 - 2022-10-27

### What's Changed

#### 💥 Breaking Changes

-   Refactor internal behavior for generator comprehensions by
    [@jmartinezmaes](https://github.com/jmartinezmaes) in
    [#11](https://github.com/jmartinezmaes/neotype_prelude/pull/11)

**Full Changelog**:
https://github.com/jmartinezmaes/neotype_prelude/compare/v0.4.0...v0.5.0

## Version 0.4.0 - 2022-10-22

### What's Changed

#### 💥 Breaking Changes

-   Refactor signatures for the `collect` combinators by
    [@jmartinezmaes](https://github.com/jmartinezmaes) in
    [#2](https://github.com/jmartinezmaes/neotype_prelude/pull/2)
-   Remove the `new` static method from `Pair` by
    [@jmartinezmaes](https://github.com/jmartinezmaes) in
    [#4](https://github.com/jmartinezmaes/neotype_prelude/pull/4)
-   Drop support for Node.js version 14 by
    [@jmartinezmaes](https://github.com/jmartinezmaes) in
    [#6](https://github.com/jmartinezmaes/neotype_prelude/pull/6)

#### 🚀 Enhancements

-   Introduce the `gather` combinators for `Ior` and `Validated` by
    [@jmartinezmaes](https://github.com/jmartinezmaes) in
    [#3](https://github.com/jmartinezmaes/neotype_prelude/pull/3)

### New Contributors

-   [@jmartinezmaes](https://github.com/jmartinezmaes) made their first
    contribution in
    [#1](https://github.com/jmartinezmaes/neotype_prelude/pull/1)

**Full Changelog**:
https://github.com/jmartinezmaes/neotype_prelude/compare/v0.3.0...v0.4.0
