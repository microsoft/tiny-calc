/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import "mocha";
import { strict as assert } from "assert";
import { Tuple } from "../src";

describe("Tuple", () => {
    describe("construction", () => {
        it("can construct Tuple<T, 1>", () => {
            const t1: Tuple<number, 1> = [0];
            assert.equal(Array.isArray(t1), true);
        });

        it("can construct Tuple<T, 2>", () => {
            const t2: Tuple<number, 2> = [0, 1];
            assert.equal(Array.isArray(t2), true);
        });
    });

    it("is compatible with ReadonlyArray<T>", () => {
        const tuple: Tuple<number, 3> = [1, 2, 3];
        const array: ReadonlyArray<number> = tuple;

        assert.equal(array.length, 3);
        assert.equal(array[2], 3);
        assert.equal(
            array.reduce(
                (accumulator, value) => value + accumulator,
                0),
            6);
    });
});
