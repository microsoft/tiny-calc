/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import "mocha";
import { strict as assert } from "assert";
import { CompareFunction } from "../src";

describe("CompareFunction", () => {
    it("must be compatible with Array.sort()", () => {
        const fn: CompareFunction<number> = (left, right) => left - right;

        assert.deepEqual(
            [0, 3, 1, 2].sort(fn),
            [0, 1, 2, 3]
        )
    });
});
