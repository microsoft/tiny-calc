/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { strict as assert } from "assert";
import "mocha";
import { ConsumerSet, addConsumer, removeConsumer, forEachConsumer } from "../src/consumerset";

class TestFixture<T> {
    private readonly expected = new Map<T, number>();
    private actual: ConsumerSet<T> = undefined;

    public add(value: T) {
        const count = this.expected.get(value);
        this.expected.set(value,
            count === undefined
                ? 1
                : count + 1);
        
        this.actual = addConsumer(this.actual, value);

        this.check();
    }

    public remove(value: T) {
        const count = this.expected.get(value);

        if (count === 1) {
            this.expected.delete(value);
        } else if (count !== undefined) {
            this.expected.set(value, count - 1);
        }

        this.actual = removeConsumer(this.actual, value);

        this.check();
    }

    private check() {
        const actual: [T, number][] = [];
        
        forEachConsumer<T>(this.actual, (consumer, count) => {
            actual.push([consumer, count]);
            return true;
        });

        assert.deepEqual(new Map(actual), this.expected);
        assert.equal(this.actual === undefined, this.expected.size === 0);
    }
}

describe("ConsumerSet", () => {
    let set: TestFixture<string>

    beforeEach(() => {
        set = new TestFixture();
    });

    it("insert 1 into empty", () => {
        set.add("one");
    });

    it("insert 2 into empty", () => {
        set.add("one");
        set.add("two");
    });

    it("insert duplicate into 1", () => {
        set.add("one");
        set.add("one");
    });

    it("insert duplicates into 2", () => {
        set.add("one");
        set.add("two");
        set.add("one");
        set.add("two");
    });

    it("remove 1 from empty", () => {
        set.remove("one");
    });

    it("remove 1 from 1", () => {
        set.add("one");
        set.remove("one");
    });

    it("remove 2 from 2", () => {
        set.add("one");
        set.add("two");
        set.remove("one");
        set.remove("two");
    });
});
