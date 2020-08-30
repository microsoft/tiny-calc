/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { benchmark } from "hotloop";

const map = new Map<number, number>();
const keys: number[] = [];

for (let i = 0; i < 256; i++) {
    keys.push(i);
    map.set(i, i);
}

benchmark(`Map<int, int>.get() x256`, () => {
    let sum = 0;

    for (const key of keys) {
        sum += map.get(key) as number;
    }

    return sum;
});
