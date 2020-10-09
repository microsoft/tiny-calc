/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import "mocha";
import { strict as assert } from "assert";
import { TestFixture } from "./testfixture";

describe("Heap", () => {
    const v = new Array(8)
        .fill(undefined)
        .map((value, index) => {
            return { value: index }
        });

    const compareFn = (left: { value: number }, right: { value: number }) => left.value - right.value;

    let heap: TestFixture<{ value: number}>;

    beforeEach(() => {
        heap = new TestFixture<{ value: number }>(compareFn);
    })

    it("peek empty", () => {
        assert.equal(heap.peek(), undefined);
    });

    describe("push/pop", () => {
        function test(order: number[]) {
            const input = order.map((value) => v[value].value);
            const output = order.sort((left, right) => left - right);

            it(`${JSON.stringify(input)} -> ${JSON.stringify(output)}`, () => {
                for (const index of order) {
                    heap.push(v[index]);
                }

                for (const expected of output) {
                    assert.equal(heap.peek()!.value, expected);
                    assert.equal(heap.pop()!.value, expected);
                }

                assert.equal(heap.peek(), undefined);
                assert.equal(heap.pop(), undefined);
            });
        }

        test([0]);
        test([0, 1]);
        test([1, 0]);
        test([0, 1, 2, 3, 4, 5, 6]);
        test([6, 5, 4, 3, 2, 1, 0]);
    });

    it("orders initial items", () => {
        heap = new TestFixture<{ value: number }>(compareFn, [
            v[6], v[5], v[6], v[5], v[4], v[3], v[0], v[4], v[3], v[2], v[2], v[1], v[1], v[0]
        ]);
        for (let i = 0; i < 6; i++) {
            assert.equal(heap.pop(), v[i]);
            assert.equal(heap.pop(), v[i]);
        }
    });
});
