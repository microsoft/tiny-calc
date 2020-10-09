/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Heap } from "../src";
import { benchmark, getTestArgs } from "hotloop";

const heap = new Heap<number>((left, right) => left - right);
const { count } = getTestArgs();
let sum = 0;

benchmark(`Heap.push() x ${count} / Heap.pop() x ${count} (Ascending)`, () => {
    for (let i = 0; i < count; i++) {
        heap.push(i);
    }

    let top: number | undefined;

    // eslint-disable-next-line no-cond-assign
    while ((top = heap.pop()) !== undefined) {
        sum += top;
    }

    return sum;
});
