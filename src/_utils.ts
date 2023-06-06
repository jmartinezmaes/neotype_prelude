/*
 * Copyright 2022-2023 Josh Martinez
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

import type { Builder } from "./builder.js";

export class ArrayPushBuilder<in out T> implements Builder<T, T[]> {
	readonly #elems: T[] = [];

	add(elem: T): void {
		this.#elems.push(elem);
	}

	finish(): T[] {
		return this.#elems;
	}
}

export class ArrayIdxBuilder<in out T>
	implements Builder<readonly [number, T], T[]>
{
	readonly #elems: T[] = [];

	add([idx, elem]: readonly [number, T]): void {
		this.#elems[idx] = elem;
	}

	finish(): T[] {
		return this.#elems;
	}
}

export class RecordBuilder<in out T>
	implements Builder<readonly [string, T], Record<string, T>>
{
	readonly #elems: Record<string, T> = {};

	add([key, elem]: readonly [string, T]): void {
		this.#elems[key] = elem;
	}

	finish(): Record<string, T> {
		return this.#elems;
	}
}

export class NoOpBuilder implements Builder<unknown, void> {
	add(): void {
		return;
	}

	finish(): void {
		return;
	}
}
