/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { strict as assert } from "assert";
import { Signedness } from "../src";
import { pretty } from "./pretty";
import { INumericType, types } from "./types";
import { getTestValues } from "./values";

function getMin(type: INumericType) {
    // Int53 is an IEEE 754 double precision floating-point, which can store up to a 53b integer in
    // its significand, plus an additional sign bit.
    if (type.bitSize === 54) {
        return Number.MIN_SAFE_INTEGER;
    }

    switch (type.signedness) {
        case Signedness.agnostic:
        case Signedness.signed:
            return -Math.pow(2, type.bitSize - 1);      // Lower bound of a signed integer is -2^(N-1)
        default:
            assert.equal(type.signedness, Signedness.unsigned);
            return 0;                                   // Lower bound of an unsigned integer is always 0
    }
}

function getMax(type: INumericType) {
    // Int53 is an IEEE 754 double precision floating-point, which can store up to a 53b integer in
    // its significand, plus an additional sign bit.
    if (type.bitSize === 54) {
        return Number.MAX_SAFE_INTEGER;
    }

    switch (type.signedness) {
        case Signedness.agnostic:
        case Signedness.unsigned:
            return Math.pow(2, type.bitSize) - 1;       // Upper bound of an unsigned integer is 2^N - 1.
        default:
            assert.equal(type.signedness, Signedness.signed);
            return Math.pow(2, type.bitSize - 1) - 1;   // Upper bound of a signed integer is 2^(N-1) - 1
    }
}

for (const name of Object.keys(types)) {
    describe(name, () => {
        const type: INumericType = (types as any)[name];
        const min = getMin(type);
        const max = getMax(type);
        const test = (t: INumericType, value: number | boolean) => {
            return t.min <= value && value <= t.max && Math.trunc(value as number) === value;
        }

        // Note: Unsigned and twos-complement integers, testing min/max is also implicitly testing
        //       signedness and bitSize (or at least ensuring they are consistent).
        it(`min = ${pretty(min)}`, () =>  { assert.equal(type.min, min); });
        it(`max = ${pretty(max)}`, () =>  { assert.equal(type.max, max); });
        const values = getTestValues(type);
        describe("test", () => {
            for (const value of values) {
                const expected = test(type, value);
                it(`${pretty(value)} -> ${expected}`, () => {
                    assert.equal(type.test(value), expected);
                });
            }
        });
    });
}
