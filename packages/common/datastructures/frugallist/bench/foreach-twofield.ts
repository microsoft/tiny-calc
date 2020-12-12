/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { getTestArgs } from "hotloop";
import { TwoField, TwoField_push, TwoField_forEach } from "./impl/twofield";
import { forEachBench } from "./foreach";

const { count } = getTestArgs();

const list: TwoField<number> = {};
for (let i = 0; i < count; i++) {
    TwoField_push(list, i);
}

forEachBench(
    "TwoField",
    count,
    list,
    TwoField_forEach
)
