/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { getTestArgs } from "hotloop";
import { FrugalList, FrugalList_push, FrugalList_forEach } from "../src";
import { forEachBench } from "./foreach";

const { count } = getTestArgs();

let list: FrugalList<number> = undefined;
for (let i = 0; i < count; i++) {
    list = FrugalList_push(list, i);
}

forEachBench(
    "FrugalList",
    count,
    list,
    FrugalList_forEach
)
