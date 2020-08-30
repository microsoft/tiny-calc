/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { HandleTable, Handle } from "../src";
import { benchmark } from "hotloop";

const table = new HandleTable<number>();
const handles: Handle[] = [];

for (let i = 0; i < 256; i++) {
    handles.push(table.add(i));
}

benchmark(`HandleTable<int>.get() x256`, () => {
    let sum = 0;

    for (const handle of handles) {
        sum += table.get(handle);
    }

    return sum;
});
