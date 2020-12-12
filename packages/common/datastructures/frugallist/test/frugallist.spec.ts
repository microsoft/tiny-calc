/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import "mocha";
import { TestFixture } from "./testfixture";

describe("FrugalList", () => {
    const values = [0, 1, 2];
    let list: TestFixture<number>;

    beforeEach(() => {
        list = new TestFixture<number>();
    });

    it("push", () => {
        for (const value of values) {
            list.push(value);
        }
    });

    it("remove in order", () => {
        for (const value of values) {
            list.push(value);
        }

        for (const value of values) {
            list.removeFirst(value);
        }
    });

    it("remove in reverse order", () => {
        for (const value of values) {
            list.push(value);
        }

        const reversed = values.slice(0).reverse();
        for (const value of reversed) {
            list.removeFirst(value);
        }
    });

    it("remove with duplicates", () => {
        for (const value of values) {
            list.push(value);
        }

        for (const value of values) {
            list.push(value);
        }

        for (const value of values) {
            list.removeFirst(value);
        }
    });
});
