/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import "mocha";
import { strict as assert } from "assert";
import { TestFixture } from "./testfixture";

describe("HandleTable", () => {
    const testValues = ["1", "2", "3"];
    let table: TestFixture<string>;

    beforeEach(() => {
        table = new TestFixture();
    })

    it("add x 1 / get x 1", () => {
        const h1 = table.add("1");

        assert.equal(table.get(h1), "1");
    });

    for (let count = 1; count <= testValues.length; count++) {
        const values = testValues.slice(count);

        it(`add / get / delete x ${count}`, () => {
            for (const value of values) {
                const handle = table.add(value);
                assert.equal(table.get(handle), value);
                table.delete(handle);
            }
        });
    }

    for (let count = 2; count <= testValues.length; count++) {
        const values = testValues.slice(count);

        it(`add x ${count} / get x ${count} / delete x ${count}`, () => {
            let handles = [];

            for (const value of values) {
                const handle = table.add(value);
                handles.push(handle);
                assert.equal(table.get(handle), value);
            }
            
            for (let i = 0; i < handles.length; i++) {
                assert.equal(table.get(handles[i]), values[i]);
            }
    
            for (let i = handles.length - 1; i >= 0; i--) {
                const handle = handles[i];
                assert.equal(table.get(handle), values[i]);
                table.delete(handle);
            }
        });    
    }
});
