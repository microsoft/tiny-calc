/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { getTestArgs } from "hotloop";
import { forEachBench } from "./foreach";

const { count } = getTestArgs();
const list: number[] = new Array(count).fill(0).map((value, index) => index);

forEachBench(
    "Array",
    count,
    list,
    (array, callback) => {
        for (let i = 0; i < array.length; i++) {
            callback(array[i]);
        }
    }
)
