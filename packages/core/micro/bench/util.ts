import { IMatrixConsumer } from "@tiny-calc/nano";
const process = require("process");

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
export function consume(value: any) {
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
