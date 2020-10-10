/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Heap } from "../src";
import { benchmark, getTestArgs } from "hotloop";

const heap = new Heap<number>((left, right) => left - right);
const { count } = getTestArgs();

benchmark(`Heap.push() x ${count} (Descending)`, () => {
    for (let i = count; i > 0; i--) {
        heap.push(i);
    }

    heap.clear();
});
