/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { CompareFunction } from "@tiny-calc/types";

export class Heap<T> {
    public constructor(
        private readonly compareFn: CompareFunction<T>,
        private readonly items: T[] = []
    ) {
        // Convert the given array in-place into a binary heap by sifting each
        // layer in bottom-up order such that the parent is <= it's children.
        for (let i = (this.length >>> 1) - 1; i >= 0; i--) {
            this.down(/* parent: */ i);
        }
    }

    /** Returns the number of items in the heap. */
    public get length(): number { return this.items.length; }

    /** Returns the item currently at the top of the heap  */
    public peek(): T | undefined { return this.items[0]; }

    /** Removes the item current at the top of the heap and returns it. */
    public pop(): T | undefined {
        const top = this.peek();            // Item to be returned
        const bottom = this.items.pop();    // Item to re-insert

        // If the heap was non-empty, replace the top item with the bottom item
        // and sift the former bottom item downwards until it is >= its parent.
        if (this.length > 0) {
            this.items[0] = bottom!;
            this.down(/* parent: */ 0);
        }

        return top;
    }

    /** Inserts the item in to the heap. */
    public push(item: T): void {
        // Insert the new item at the bottom of the heap and sift it upwards
        // until we find a parent that is <= the new item.
        this.items.push(item);
        this.up(/* child: */ this.items.length - 1);
    }

    /** Removes all items from the heap in O(1) time. */
    public clear(): void { this.items.length = 0; }

    /**
     * Sift the child upwards by swapping with its current parent until the parent is
     * <= the child.
     */
    private up(child: number) {
        while (child > 0) {
            const parent = (child - 1) >>> 1;   // Calculate parent index

            if (this.compareFn(this.items[child], this.items[parent]) >= 0) {
                break;
            }

            // Perf: Traditional swap idiom ~5x faster than destructuring assignment (Node v12 x64).
            const tmp = this.items[parent];
            this.items[parent] = this.items[child];
            this.items[child] = tmp;

            child = parent;
        }
    }

    /**
     * Sift the parent downwards by swapping with its minimum child until the parent
     * is <= its children.
     */
    private down(parent: number) {
        while (parent < (this.length >>> 1)) {
            let child = (parent << 1) + 1;      // Calculate left child index

            if (
                ((child + 1) < this.length)     // If right child exists..
                && (this.compareFn(             // ..and right child < left child
                    this.items[child],
                    this.items[child + 1]
                ) > 0)
            ) {
                child++;                        // choose right child
            }

            // Stop when children are >= parent
            if (this.compareFn(this.items[parent], this.items[child]) <= 0) {
                break;
            }

            // Perf: Traditional swap idiom ~5x faster than destructuring assignment (Node v12 x64).
            const tmp = this.items[parent];
            this.items[parent] = this.items[child];
            this.items[child] = tmp;

            parent = child;
        }
    }
}
