/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * Function used to determine the relative order of the given values. Returns a negative
 * value if the left argument is less than right argument, zero if they're equal, and a
 * positive value if the left argument is greater than the right.
 *
 * If the left and right values can not be compared, a CompareFunction should return NaN
 * and a stable sort algorithm should preserve the original relative ordering of the
 * left/right arguments.
 *
 * When comparing numeric values, `left - right` orders the numbers in ascending order
 * while `right - left' orders numbers in descending order.
 */
export type CompareFunction<T> = (left: T, right: T) => number;
