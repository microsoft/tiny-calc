/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import "mocha";
import { strict as assert } from "assert";
import { HandleTable, Handle } from "../src";

export class TestFixture<T> {
    private readonly used = new Map<Handle, T>();
    private readonly avail = new Set<Handle>();
    private readonly actual = new HandleTable<T>();

    public add(value: T): Handle {
        const handle = this.actual.add(value);
        
        assert(handle > Handle.none,
            "Handle allocation must return a valid handle.");
        assert(!this.used.has(handle),
            "Handle allocation must not return a handle that is currently in use.");
        assert(this.avail.size === 0 || this.avail.has(handle),
            "Handle allocation must recycle available handles before creating new ones.");
        
        this.used.set(handle, value);
        this.avail.delete(handle);

        this.vet();

        return handle;
    }

    public delete(handle: Handle): void {
        this.actual.delete(handle);

        const wasDeleted = this.used.delete(handle);
        assert(wasDeleted,
            "Test Error: Caller must ensure handle is currently allocated before deleting.");

        this.avail.add(handle);

        this.vet();
    }

    public set(handle: Handle, value: T): void {
        assert(this.used.has(handle),
            "Test Error: Caller must ensure handle is currently allocated before setting.");

        this.actual.set(handle, value);
        this.used.set(handle, value);

        this.vet();
    }

    public get(handle: Handle): T {
        const actualValue = this.actual.get(handle);
        assert.equal(actualValue, this.used.get(handle));
        return actualValue;
    }

    public get usedCount(): number { return this.used.size; }
    public get usedHandles(): Handle[] { return [...this.used.keys()]; }

    public toJSON(): (T | number)[] { return this.actual.toJSON(); }

    private vet() {
        for (const [handle, value] of this.used.entries()) {
            assert.equal(value, this.actual.get(handle),
                "HandleTable.get() must return last added/set value.");
            assert(!this.avail.has(handle),
                "Test Error: Available set must not contained used handles.");
        }

        for (const handle of this.avail) {
            assert(!this.used.has(handle),
                "Test Error: Used set must not contained available handles.");

            const value = this.actual.get(handle);
            const type = typeof value;
            assert(type === "number" || type === undefined,
                `Expected recycled slot '${handle}' to contain the next free slot, but found ${JSON.stringify(value)}.`);
        }

        // The '+1' below is because we store the head of the free list in slot #0.
        assert.equal(this.actual.toJSON().length, this.used.size + this.avail.size + 1,
            "Size of handle table must be equal to number of used slots + number of available slots.");
    }
}