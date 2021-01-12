/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import "mocha";
import { strict as assert } from "assert";
import {
    FrugalList,
    FrugalList_push,
    FrugalListItem,
    FrugalList_removeFirst,
    FrugalList_forEach,
    FrugalList_length,
    FrugalList_get
} from "../src";

export class TestFixture<T> {
    private actual: FrugalList<T>;
    private expected: FrugalListItem<T>[] = [];

    public push(item: FrugalListItem<T>): void {
        this.actual = FrugalList_push(this.actual, item);
        this.expected.push(item);

        this.vet();
    }

    public removeFirst(item: FrugalListItem<T>): void {
        this.actual = FrugalList_removeFirst(this.actual, item);
        const index = this.expected.indexOf(item);
        if (index >= 0) {
            this.expected.splice(/* start: */ index, /* deleteCount: */ 1);
        }

        this.vet();
    }

    private vet() {
        const actualLen = FrugalList_length(this.actual);
        assert.equal(actualLen, this.expected.length,
            "FrugalList_length() must return number of contained items.");

        for (let i = 0; i < actualLen; i++) {
            assert.deepEqual(FrugalList_get(this.actual, i), this.expected[i],
                "FrugalList_get() must return item at specified 'index'.");
        }

        const actual: FrugalListItem<T>[] = [];

        FrugalList_forEach(this.actual, (item) => {
            actual.push(item);
        });

        assert.deepEqual(actual, this.expected,
            "FrugalList_forEach() must enumerate contained items in order.");
    }
}
