# Changelog

All notable changes to this project will be documented in this file. This
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Version 0.8.0 - 2023-02-27

### What's Changed

#### 💥 Breaking Changes

-   Rename discriminator enumerations and properties by
    [@jm4rtinez](https://github.com/jm4rtinez) in
    [#70](https://github.com/jm4rtinez/neotype_prelude/pull/70)
-   For `Maybe`, rename `fromMissing` to `fromNullish` by
    [@jm4rtinez](https://github.com/jm4rtinez) in
    [#81](https://github.com/jm4rtinez/neotype_prelude/pull/81)

#### 🚀 Enhancements

-   Introduce the `goFn` and `goAsyncFn` functions by
    [@jm4rtinez](https://github.com/jm4rtinez) in
    [#71](https://github.com/jm4rtinez/neotype_prelude/pull/71)
-   Improve tuple type inference in functions that accept arrays or tuples by
    [@jm4rtinez](https://github.com/jm4rtinez) in
    [#79](https://github.com/jm4rtinez/neotype_prelude/pull/79)
-   For `Maybe`, introduce the `toNullish` method by
    [@jm4rtinez](https://github.com/jm4rtinez) in
    [#82](https://github.com/jm4rtinez/neotype_prelude/pull/82)

#### 📖 Documentation

-   Add doc comments for all members currently missing them by
    [@jm4rtinez](https://github.com/jm4rtinez) in
    [#74](https://github.com/jm4rtinez/neotype_prelude/pull/74)
-   Fix broken Markdown links in the documentation by
    [@jm4rtinez](https://github.com/jm4rtinez) in
    [#75](https://github.com/jm4rtinez/neotype_prelude/pull/75)
-   Revise the module documentation for `Either` by
    [@jm4rtinez](https://github.com/jm4rtinez) in
    [#77](https://github.com/jm4rtinez/neotype_prelude/pull/77)
-   Fill in more missing documentation by
    [@jm4rtinez](https://github.com/jm4rtinez) in
    [#78](https://github.com/jm4rtinez/neotype_prelude/pull/78)
-   Fix incorrect spelling of "their" in the docs for `maybe` by
    [@jm4rtinez](https://github.com/jm4rtinez) in
    [#80](https://github.com/jm4rtinez/neotype_prelude/pull/80)

**Full Changelog**:
https://github.com/jm4rtinez/neotype_prelude/compare/v0.7.0...v0.8.0

## Version 0.7.0 - 2023-01-22

### What's Changed

#### 💥 Breaking Changes

-   Name enum members using SCREAMING_SNAKE_CASE conventions by
    [@jm4rtinez](https://github.com/jm4rtinez) in
    [#66](https://github.com/jm4rtinez/neotype_prelude/pull/66)

**Full Changelog**:
https://github.com/jm4rtinez/neotype_prelude/compare/v0.6.0...v0.7.0

## Version 0.6.0 - 2022-12-16

### What's Changed

#### 💥 Breaking Changes

-   For `Maybe`, rename the `justOrElse` method to `justOr` by
    [@jm4rtinez](https://github.com/jm4rtinez) in
    [#17](https://github.com/jm4rtinez/neotype_prelude/pull/17)
-   Rename the `validated` module and `Validated` type by
    [@jm4rtinez](https://github.com/jm4rtinez) in
    [#20](https://github.com/jm4rtinez/neotype_prelude/pull/20)
-   Remove the `*OrFold` methods by [@jm4rtinez](https://github.com/jm4rtinez)
    in [#21](https://github.com/jm4rtinez/neotype_prelude/pull/21)
-   Rename the `fold` methods to `unwrap` by
    [@jm4rtinez](https://github.com/jm4rtinez) in
    [#22](https://github.com/jm4rtinez/neotype_prelude/pull/22)
-   Remove the `flat` combinators by [@jm4rtinez](https://github.com/jm4rtinez)
    in [#25](https://github.com/jm4rtinez/neotype_prelude/pull/25)
-   For `Maybe`, rename `getOrFallback` to `getOr` by
    [@jm4rtinez](https://github.com/jm4rtinez) in
    [#26](https://github.com/jm4rtinez/neotype_prelude/pull/26)
-   Remove the semigroup behavior from `Reverse` by
    [@jm4rtinez](https://github.com/jm4rtinez) in
    [#30](https://github.com/jm4rtinez/neotype_prelude/pull/30)
-   Refactor the `guard` and `negate` combinators by
    [@jm4rtinez](https://github.com/jm4rtinez) in
    [#33](https://github.com/jm4rtinez/neotype_prelude/pull/33)
-   Remove the `bimap` combinators by [@jm4rtinez](https://github.com/jm4rtinez)
    in [#41](https://github.com/jm4rtinez/neotype_prelude/pull/41)
-   For `Either`, and `Maybe`, remove the `orElse` combinators by
    [@jm4rtinez](https://github.com/jm4rtinez) in
    [#46](https://github.com/jm4rtinez/neotype_prelude/pull/46)

#### 🚀 Enhancements

-   Introduce the `lift` combinators and `wrapCtor` function by
    [@jm4rtinez](https://github.com/jm4rtinez) in
    [#23](https://github.com/jm4rtinez/neotype_prelude/pull/23)
-   For `Ordering.fromNumber`, allow a `bigint` argument by
    [@jm4rtinez](https://github.com/jm4rtinez) in
    [#31](https://github.com/jm4rtinez/neotype_prelude/pull/31)
-   For `Maybe`, introduce the `wrapFn` combinator by
    [@jm4rtinez](https://github.com/jm4rtinez) in
    [#35](https://github.com/jm4rtinez/neotype_prelude/pull/35)
-   For `Ior`, introduce the `fromValidation` function by
    [@jm4rtinez](https://github.com/jm4rtinez) in
    [#45](https://github.com/jm4rtinez/neotype_prelude/pull/45)
-   For `Maybe`, introduce the `getOrElse` method by
    [@jm4rtinez](https://github.com/jm4rtinez) in
    [#48](https://github.com/jm4rtinez/neotype_prelude/pull/48)

**Full Changelog**:
https://github.com/jm4rtinez/neotype_prelude/compare/v0.5.0...v0.6.0

## Version 0.5.0 - 2022-10-27

### What's Changed

#### 💥 Breaking Changes

-   Refactor internal behavior for generator comprehensions by
    [@jm4rtinez](https://github.com/jm4rtinez) in
    [#11](https://github.com/jm4rtinez/neotype_prelude/pull/11)

**Full Changelog**:
https://github.com/jm4rtinez/neotype_prelude/compare/v0.4.0...v0.5.0

## Version 0.4.0 - 2022-10-22

### What's Changed

#### 💥 Breaking Changes

-   Refactor signatures for the `collect` combinators by
    [@jm4rtinez](https://github.com/jm4rtinez) in
    [#2](https://github.com/jm4rtinez/neotype_prelude/pull/2)
-   Remove the `new` static method from `Pair` by
    [@jm4rtinez](https://github.com/jm4rtinez) in
    [#4](https://github.com/jm4rtinez/neotype_prelude/pull/4)
-   Drop support for Node.js version 14 by
    [@jm4rtinez](https://github.com/jm4rtinez) in
    [#6](https://github.com/jm4rtinez/neotype_prelude/pull/6)

#### 🚀 Enhancements

-   Introduce the `gather` combinators for `Ior` and `Validated` by
    [@jm4rtinez](https://github.com/jm4rtinez) in
    [#3](https://github.com/jm4rtinez/neotype_prelude/pull/3)

### New Contributors

-   [@jm4rtinez](https://github.com/jm4rtinez) made their first contribution in
    [#1](https://github.com/jm4rtinez/neotype_prelude/pull/1)

**Full Changelog**:
https://github.com/jm4rtinez/neotype_prelude/compare/v0.3.0...v0.4.0
