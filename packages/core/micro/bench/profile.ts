/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

// Runs RecalcTest in a tight loop outside of the Benchmark suite to make profiling
// analysis a bit easier.

import { makeBenchmark, evalSheet } from "../test/sheets";

function recalcTest(size: number) {
    const { sheet, setAt } = makeBenchmark(size);
    evalSheet(sheet, size);
    console.time("profile");
    for (let i = 0; i < 1000; i++) {
        setAt(0, 0, i);
        evalSheet(sheet, size);
    }
    console.timeEnd("profile");
}

recalcTest(10);
