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

/**
 * Async compatibiltiy for functional data types.
 *
 * @remarks
 *
 * This module exports the following async data types:
 *
 * -   {@link AsyncAnnotation:type | `AsyncAnnotation<T, W>`} for working with
 *     `Promise<Annotation<T, W>>`
 * -   {@link AsyncEither:type | `AsyncEither<A, B>`} for working with
 *     `Promise<Either<A, B>>`
 * -   {@link AsyncIor:type | `AsyncIor<A, B>`} for working with `Promise<Ior<A,
 *     B>>`
 * -   {@link AsyncMaybe:type | `AsyncMaybe<T>`} for working with
 *     `Promise<Maybe<T>>`
 * -   {@link AsyncValidation:type | `AsyncValidation<E, T>`} for working with
 *     `Promise<Validation<E, T>>`
 *
 * All async data type alises have a companion namespace exported under the same
 * identifier. Each namespace provides utilities for working with its associated
 * data type.
 *
 * There are also type alises for working with promise-like values:
 *
 * -   {@link AsyncAnnotationLike | `AsyncAnnotationLike<T, W>`}
 * -   {@link AsyncEitherLike | `AsyncEitherLike<A, B>`}
 * -   {@link AsyncIorLike | `AsyncIorLike<A, B>`}
 * -   {@link AsyncMaybeLike | `AsyncMaybeLike<T>`}
 * -   {@link AsyncValidationLike | `AsyncValidationLike<E, T>`}
 *
 * ## Importing from this module
 *
 * The async data types and companion namespaces from this module can be
 * imported under the same aliases:
 *
 * ```ts
 * import {
 *     AsyncAnnotation,
 *     AsyncEither,
 *     AsyncIor,
 *     AsyncMaybe,
 *     AsyncValidation
 * } from "@neotype/prelude/async.js";
 * ```
 *
 * Or, they can be imported and aliased separately:
 *
 * ```ts
 * import {
 *     type AsyncAnnotation,
 *     type AsyncEither,
 *     type AsyncIor,
 *     type AsyncMaybe,
 *     type AsyncValidation,
 *     AsyncAnnotation as AA,
 *     AsyncEither as AE,
 *     AsyncIor as AI,
 *     AsyncMaybe as AM,
 *     AsyncValidation as AV
 * } from "@neotype/prelude/async.js";
 * ```
 *
 * Promise-like type aliases can be imported as named or aliased as needed:
 *
 * ```ts
 * import type {
 *     AsyncAnnotationLike,
 *     AsyncEitherLike,
 *     AsyncIorLike,
 *     AsyncMaybeLike,
 *     AsyncValidationLike,
 * } from "@neotype/prelude/async.js";
 * ```
 *
 * @module
 */

export { AsyncAnnotation, AsyncAnnotationLike } from "./async/annotation.js";
export { AsyncEither, AsyncEitherLike } from "./async/either.js";
export { AsyncIor, AsyncIorLike } from "./async/ior.js";
export { AsyncMaybe, AsyncMaybeLike } from "./async/maybe.js";
export { AsyncValidation, AsyncValidationLike } from "./async/validation.js";
