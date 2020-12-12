/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { strict as assert } from "assert";
import { benchmark } from "hotloop";

let consumedCount = 0;
let consumedCache: any;

export function forEachBench<TSelf, TConsumer>(
    name: string,
    count: number,
    self: TSelf,
    forEach: (self: TSelf, callback: (consumer: TConsumer) => void) => void
): void {
    // Sanity check that list was initialized correctly.
    let sum = 0;
    forEach(self, () => {
        sum++;
    });
    assert.equal(sum, count);

    benchmark(`${name}: ForEach(length=${count})`, () => {
        forEach(self, (item) => {
            // Paranoid defense against dead code elimination.
            consumedCount++;
            consumedCount |= 0;

            if (consumedCount === 0) {
                consumedCache = item;
            }
        });
    });
}

// Prevent v8's optimizer from identifying 'cached' as an unused value.
process.on('exit', () => {
    if (consumedCount === -1) {
        console.log(`Ignore this: ${consumedCache}`);
    }
});
