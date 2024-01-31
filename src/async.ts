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
 * -   `AsyncAnnotation<T, W>` for working with `Promise<Annotation<T, W>>`
 * -   `AsyncEither<A, B>` for working with `Promise<Either<A, B>>`
 * -   `AsyncIor<A, B>` for working with `Promise<Ior<A, B>>`
 * -   `AsyncMaybe<T>` for working with `Promise<Maybe<T>>`
 * -   `AsyncValidation<E, T>` for working with `Promise<Validation<E, T>>`
 *
 * All async data type alises have a companion namespace exported under the same
 * idetifier. Each namespace provides utilities for working with its associated
 * data type.
 *
 * ## Importing from this module
 *
 * The types and namespaces from this module can be imported under the same
 * aliases:
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
 * @module
 */

export * from "./async/annotation.js";
export * from "./async/either.js";
export * from "./async/ior.js";
export * from "./async/maybe.js";
export * from "./async/validation.js";
