/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

// Note that the exponents sum to 2^53, which fully utilizes the exact integer range of a Float64.
export const maxRows = 0x100000000 as const;    // 2^32 = x4096 Excel maximum of 1,048,576 rows
export const maxCols = 0x200000 as const;       // 2^21 =  x128 Excel maximum of 16,384 columns
const colMask = 0x1FFFFF as const;

/** Encode the given RC0 `row`/`col` as a 53b integer key. */
export function pointToKey(row: number, col: number) {
    // Note: Can not replace multiply with shift as product exceeds 32b.
    return row * maxCols + col;
}

/** Decode the given `key` to it's RC0 row/col. */
export function keyToPoint(position: number) {
    // Note: Can not replace division with shift as numerator exceeds 32b.
    const row = (position / maxCols) >>> 0;
    const col = position & colMask;
    return [ row, col ];
}
