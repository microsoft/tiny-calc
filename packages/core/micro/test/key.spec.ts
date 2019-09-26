/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { strict as assert } from "assert";
import "mocha";
import { maxRows, maxCols, pointToKey, keyToPoint } from "../src/key";

describe("Matrix Key", () => {
    const valid = [
        [0, 0],                     // Trivial
        [0, 1],
        [1, 0],
        [maxRows - 1, 0],           // Limits
        [0, maxCols - 1],
        [maxRows - 1, maxCols - 1],
    ];

    for (const expected of valid) {
        it(`[${expected[0]},${expected[1]}]`, () => {
            const key = pointToKey(expected[0], expected[1]);
            const actual = keyToPoint(key);
            assert.deepEqual(actual, expected);
        });
    }

    it("Key mapping should fully utilize, but not exceed, the safe integer range", () => {
        assert(pointToKey(maxRows - 1, maxCols - 1) === Number.MAX_SAFE_INTEGER);
    });
});
