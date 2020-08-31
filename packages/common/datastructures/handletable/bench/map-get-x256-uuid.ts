/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { benchmark } from "hotloop";
import { uuid } from "./uuid";

const map = new Map<string, number>();
const keys: string[] = [];

for (let i = 0; i < 256; i++) {
    const key = uuid();
    keys.push(key);
    map.set(key, i);
}

benchmark(`Map<uuid, int>.get() x256`, () => {
    let sum = 0;

    for (const key of keys) {
        sum += map.get(key) as number;
    }

    return sum;
});
