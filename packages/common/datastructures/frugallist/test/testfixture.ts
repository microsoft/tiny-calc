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
    FrugalList_forEach
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
        const actual: FrugalListItem<T>[] = [];
        FrugalList_forEach(this.actual, (item) => {
            actual.push(item);
        })

        assert.deepEqual(actual, this.expected);
    }
}
