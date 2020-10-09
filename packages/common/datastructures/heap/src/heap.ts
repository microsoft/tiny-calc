/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { CompareFunction } from "@tiny-calc/types";

export class Heap<T> {
    private readonly items: T[];
    private readonly compareFn: CompareFunction<T>;

    public constructor(
        comp: CompareFunction<T>,
        items: T[] = []
    ) {
        this.compareFn = comp;
        this.items = new Array(1);

        for (let i = 0, len = items.length; i < len; i++) {
            this.push(items[i]);
        }
    }

    public get length(): number { return this.items.length - 1; }

    public peek(): T | undefined { return this.items[1]; }

    public pop(): T | undefined {
        const x = this.items[1];
        this.items[1] = this.items[this.length];
        this.items.pop();
        this.down(1);
        return x;
    }

    public push(item: T): void {
        this.items.push(item);
        this.up(this.length);
    }

    public clear(): void { this.items.length = 1; }

    private up(k: number) {
        while (k > 1 && (this.compareFn(this.items[k >> 1], this.items[k]) > 0)) {
            const tmp = this.items[k >> 1];
            this.items[k >> 1] = this.items[k];
            this.items[k] = tmp;
            k = k >> 1;
        }
    }

    private down(k: number) {
        while ((k << 1) <= (this.length)) {
            let j = k << 1;
            if ((j < this.length) && (this.compareFn(this.items[j], this.items[j + 1]) > 0)) {
                j++;
            }
            if (this.compareFn(this.items[k], this.items[j]) <= 0) {
                break;
            }
            const tmp = this.items[k];
            this.items[k] = this.items[j];
            this.items[j] = tmp;
            k = j;
        }
    }
}
