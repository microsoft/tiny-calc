/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { IMatrixConsumer } from "@tiny-calc/types";
import process from "process";

export const nullConsumer: IMatrixConsumer<unknown> = {
    rowsChanged() { },
    colsChanged() { },
    cellsChanged() { },
}

let count = 0;
let cached: any;

/**
 * Paranoid defense against dead code elimination.
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
export function consume(value: any): void {
    count++;
    if (count === 0) {
        cached = value;
    }
}

// Prevent v8's optimizer from identifying 'cached' as an unused value.
process.on('exit', () => {
    if ((count >>> 0) === 0) {
        console.log(`Ignore this: ${cached}`);
    }
});
