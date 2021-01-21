/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import "mocha";
import { strict as assert } from "assert";
import { ObjectGraph } from "../src";

const int32        = [ -0x80000000, 0x7FFFFFFF ];
const uint32       = [ 0, 0xFFFFFFFF ];
const int53        = [ Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER ];

// TODO: Oops..  Array encoding conflicts w/storing 'undefined' as a value.
// const undefinedTests = {
//     value: [undefined],
// }

const booleanTests = {
    values: [true, false]
}

const numberTests = {
    int32,
    uint32,
    int53,
    finite:         [ ...uint32, ...int32, ...int53, 5e-324, 1.7976931348623157e+308, -1.7976931348623157e+308 ],
    negativeZero:   [ -0 ],
    nonfinite:      [ Infinity, -Infinity, NaN ],
}

const stringTests = {
    empty: [""],
    space: [" "],
    quote: ["\""],
    backslash: ["\\"],
    slash: ["\"/ & \\/\""],
    control: ["\b\f\n\r\t"],
    nonunicode: ["&#34; %22 0x22 034 &#x22;"],
    unicode: ["\u0022"],
    surrogate: ["\"😀\""],
}

const arrayTests = {
    empty: [[]],

    // TODO: Oops..  Array encoding conflicts w/storing 'undefined' as a value.
    falsy: [[false], [0, -0, NaN], [""], /* [undefined], */ [null]],
    mixed: [[true, -Infinity, "mixed", { mixed: true }]],
    nested: [["depth 0", ["depth 1", ["depth 2"]]]],
}

const objectTests = {
    null: [null],
    empty: [{}],
    simple: [{ b: false, n: NaN, a: [], s: "simple" }],
    nested: [{ depth0: { depth1: { depth2: {  }}} }],
}

describe("Json", () => {
    let graph: ObjectGraph;

    beforeEach(() => { graph = new ObjectGraph(); });

    describe("from()", () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        function check(tests: { [index: string]: any[] }) {
            for (const name of Object.keys(tests)) {
                describe(name, () => {
                    for (const value of tests[name]) {
                        it(`${typeof value}: ${typeof value === "number" ? value : JSON.stringify(value)}`, () => {
                            const root = graph.from(value);
                            const snapshot = graph.get(root);
                            assert.deepEqual(snapshot, value);
                        });
                    }
                });
            }
        }

        describe("scalars", () => {
            // TODO: Oops..  Array encoding conflicts w/storing 'undefined' as a value.
            // describe("undefined", () => {
            //     testScalar(undefinedTests);
            // });

            describe("boolean", () => {
                check(booleanTests);
            });

            describe("number", () => {
                check(numberTests);
            });

            describe("strings", () => {
                check(stringTests);
            });
        });

        describe("arrays", () => {
            check(arrayTests);
        });

        describe("objects", () => {
            check(objectTests);
        });
    });
});
