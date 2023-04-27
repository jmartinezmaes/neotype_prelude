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

export class ArrayBuilder<in out T> implements Builder<T, T[]> {
	elems: T[] = [];

	add(val: T): void {
		this.elems.push(val);
	}

	finish(): T[] {
		return this.elems;
	}
}

export class IndexableBuilder<
	in out T extends { [key: string | number | symbol]: any },
> implements Builder<readonly [keyof T, T[keyof T]], T>
{
	elems: T;

	constructor(initial: T) {
		this.elems = initial;
	}

	add([key, val]: readonly [keyof T, T[keyof T]]): void {
		this.elems[key] = val;
	}

	finish(): T {
		return this.elems;
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
