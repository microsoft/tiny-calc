/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { strict as assert } from "assert";
import { bigEndian, littleEndian, nativeEndian } from "../src";

describe("Endianness", () => {
    it("'nativeEndian' must match host machine endianness", () => {
        const buffer = new ArrayBuffer(2);
        new DataView(buffer).setInt16(0, 0xff, /* littleEndian: */ true);
        const expected = new Int16Array(buffer)[0] === 0xff;

        assert.equal(nativeEndian, expected);
    });

    describe("DataView compatibility", () => {
        it("'littleEndian' must be assigned the value true", () => {
            assert.equal(littleEndian, true);
        });

        it("'bigEndian' must be assigned the value false", () => {
            assert.equal(bigEndian, false);
        });
    });
});
