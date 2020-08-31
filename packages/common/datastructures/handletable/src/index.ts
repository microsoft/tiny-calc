/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

export const enum Handle {
    none = 0,
}

/**
 * A handle table provides a fast mapping from an integer `handle` to a value `T`.
 */
export class HandleTable<T, THandle extends Handle = Handle> {
    // Note: the first slot of the 'handles' array is reserved to store the pointer to the first
    //       free handle.  We initialize this slot with a pointer to slot '1', which will cause
    //       us to delay allocate the following slot in the array on the first allocation.
    public constructor(private readonly handles: (T | number)[] = [1]) { }

    public clear(): void {
        // Restore the HandleTable's initial state by deleting all items in the handles array
        // and then re-inserting the value '1' in the 0th slot.  (See comment at `handles` decl
        // for explanation.)
        this.handles.splice(0, this.handles.length, 1);
    }

    /**
     * Allocate a slot in the handle table, set the slot to the given 'value', and
     * return the associated handle.
     * 
     * Call 'delete()' when you are finished with the slot to recycle the handle.
     */
    public add(value: T): THandle {
        const free = this.next;
        this.next = (this.handles[free] as THandle) ?? (free + 1);
        this.handles[free] = value;
        return free;
    }

    /**
     * Returns the given handle to the free list.
     */
    public delete(handle: THandle): void {
        this.handles[handle] = this.next;
        this.next = handle;
    }

    /**
     * Get the value `T` associated with the given handle, if any.
     */
    public get(handle: THandle): T {
        return this.handles[handle] as T;
    }

    /**
     * Set the value `T` associated with the given handle.
     */
    public set(handle: THandle, value: T): void {
        this.handles[handle] = value;
    }

    // Private helpers to get/set the head of the free list, which is stored in the 0th slot
    // of the handle array.
    private get next() { return this.handles[0] as THandle; }
    private set next(handle: THandle) { this.handles[0] = handle; }

    public toJSON(): (T | number)[] { return this.handles; }
}
