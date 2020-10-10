/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import "mocha";
import { TestFixture } from "./testfixture";
import { Monkey } from "../../../test/monkey/src";

function hex(n: number) {
    return n.toString(16).padStart(8, '0');
}

describe("Heap (stress)", () => {
    function stress(seed: number, iterations: number, targetSize: number) {
        it(`(seed=0x${hex(seed)}, iterations=${iterations}, targetSize=${targetSize})`, () => {
            const monkey = new Monkey(seed);

            const heap = new TestFixture<number>(
                (left, right) => left - right,
                new Array(targetSize)
                    .fill(0)
                    .map(() => monkey.chooseInt(0, targetSize))
            );

            while (heap.pop());

            while (iterations--) {
                monkey.choose([{
                    scale: targetSize,
                    action: () => {
                        heap.push(monkey.chooseInt(0, targetSize * 2));
                    }
                }, {
                    scale: Math.max(heap.length - (targetSize - 1), 0),
                    action: () => {
                        heap.pop()
                    }
                }]);
            }

            while (heap.pop());
        });
    }

    stress(/* seed: */ 0xd3ff477c, /* iterations: */ 1000, /* targetSize: */ 10);
    stress(/* seed: */ 0x07607759, /* iterations: */ 1000, /* targetSize: */ 100);
});
