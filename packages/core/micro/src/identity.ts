/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as assert from "assert";

interface Operation {
    index: number;
    removed: number;
    inserted: number;
    idBound: number;
}

export class IdManager {
    private nextFreshId = 0;

    // maps ids to indexes
    private cache: Record<number, number> = {};
    private cacheIndex: number = 0;

    private ops: Operation[] = [];

    update(index: number, removed: number, inserted: number) {
        this.ops.push({
            index, removed, inserted, idBound: this.nextFreshId += inserted
        });
        this.refreshCache();
    }

    getIndex(id: number): number | undefined {
        assert(id >= 0);
        if (id < this.nextFreshId) {
            let value: number | undefined = this.cache[id];
            if (value === undefined) {
                const creation = findPrecursor(this.ops, id);
                this.cache[id] = value = transformID(this.ops, id, creation);
            }
            return value;
        }
        return undefined;
    }

    refreshCache() {
        console.time('refresh');
        const { ops, cacheIndex, cache } = this;
        if (cacheIndex === ops.length) {
            return;
        }
        const newCache: Record<number, number> = {}
        for (const k in cache) {
            newCache[k] = transformIndex(ops, cache[k], cacheIndex);
        }
        this.cache = newCache;
        this.cacheIndex = ops.length;
        console.timeEnd('refresh');
    }
}

function findPrecursor(ops: Operation[], id: number) {
    let start = 0;
    let end = ops.length;
    while (start < end) {
        const mid = Math.floor((start + end) / 2);
        const { idBound } = ops[mid];
        if (idBound > id) {
            end = mid;
        }
        else {
            start = mid + 1;
        }
    }
    if (start > 0) {
        const { idBound } = ops[start - 1];
        assert(id >= idBound);
    }
    if (start === 0) {
        const { idBound } = ops[0];
        assert(id < idBound);
    }
    assert(start < ops.length);
    return start;
}

function transformID(ops: Operation[], id: number, start: number) {
    assert(start < ops.length);
    const baseID = start === 0 ? 0 : ops[start - 1].idBound;
    assert(id >= baseID);
    const diff = id - baseID;
    const { index, inserted } = ops[start];
    assert(diff < inserted);
    return transformIndex(ops, index + diff, start + 1);
}

function transformIndex(ops: Operation[], index: number, start: number) {
    let newIndex = index;
    for (let i = start; i < ops.length; i++) {
        const { index, inserted, removed } = ops[i];
        if (newIndex < index) {
            continue;
        }
        if (newIndex < index + removed) {
            return -1
        }
        newIndex += (inserted - removed)
    }
    return newIndex;
}
