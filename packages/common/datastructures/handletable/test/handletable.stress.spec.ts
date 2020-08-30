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

describe("HandleTable (stress)", () => {
    function stress(seed: number, iterations: number, targetSize: number) {
        it(`(seed=0x${hex(seed)}, iterations=${iterations}, targetSize=${targetSize})`, () => {
            const table = new TestFixture();
            const monkey = new Monkey(seed);
    
            for (let i = 0; i < iterations; i++) {
                monkey.choose([{
                    scale: targetSize,
                    action: () => {
                        table.add(monkey.chooseString(4));
                    }
                }, {
                    scale: Math.max(table.usedCount - (targetSize - 1), 0),
                    action: () => { 
                        table.delete(monkey.chooseItem(table.usedHandles));
                    }
                }])
            }
        });
    }

    stress(/* seed: */ 0xd3ff477c, /* iterations: */ 1000, /* targetSize: */ 1);
    stress(/* seed: */ 0x07607759, /* iterations: */ 1000, /* targetSize: */ 10);
    stress(/* seed: */ 0x8d7dc8d7, /* iterations: */ 1000, /* targetSize: */ 100);
});
