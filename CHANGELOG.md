# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> Tags:
> 
> - `Added` for new features.
> - `Changed` for changes in existing functionality.
> - `Deprecated` for soon-to-be removed features.
> - `Removed` for now removed features.
> - `Fixed` for any bug fixes.
> - `Security` in case of vulnerabilities.

## [Unreleased]

## [0.2.0] - 2022-09-29

### Added

- Module `cmp`
    - Introduce the `ieqBy` and `icmpBy` functions

### Changed

- Module `cmp`
    - Do not throw Error on `NaN` when constructing Orderings, defer
      responsibility to the user instead

## [0.1.0] - 2022-09-25

### Added

- Module `cmb`
- Module `cmp`
- Module `either`
- Module `eval`
- Module `fn`
- Module `ior`
- Module `maybe`
- Module `tuple`
- Module `validated`

[unreleased]: https://www.github.com/jm4rtinez/neotype_prelude/compare/v0.2.0...HEAD
[0.2.0]: https://www.github.com/jm4rtinez/neotype_prelude/releases/tag/v0.2.0
[0.1.0]: https://www.github.com/jm4rtinez/neotype_prelude/releases/tag/v0.1.0
