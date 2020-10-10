/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import "mocha";
import { strict as assert } from "assert";
import { Heap } from "../src";
import { CompareFunction } from "@tiny-calc/types";

export class TestFixture<T> {
    private readonly actual: Heap<T>;
    private readonly expected: T[] = [];

    public constructor(
        private readonly compareFn: CompareFunction<T>,
        items: T[] = []
    ) {
        this.actual = new Heap(compareFn, items);
        this.expected = items.slice().sort(this.compareFn);

        this.vet();
    }

    public push(value: T): void {
        this.actual.push(value);
        this.expected.push(value);
        this.expected.sort(this.compareFn);

        this.vet();
    }

    public peek(): T | undefined {
        const actual = this.actual.peek();
        const expected = this.expected[0];

        assert.equal(actual, expected);
        this.vet();

        return actual;
    }

    public pop(): T | undefined {
        const actual = this.actual.pop();
        const expected = this.expected.shift();

        assert.equal(actual, expected);
        this.vet();

        return actual;
    }

    public get length(): number {
        const actual = this.actual.length;
        const expected = this.expected.length;

        assert.equal(actual, expected);
        this.vet();

        return actual;
    }

    private vet() {
        assert.equal(this.actual.length, this.expected.length);
        assert.equal(this.actual.peek(), this.expected[0]);
    }
}
