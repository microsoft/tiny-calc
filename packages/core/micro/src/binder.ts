/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { pointToKey } from "./key";
import { createGrid } from "./matrix";
import { Binder } from "./types";

const newSet = () => new Set<number>();

export function initBinder(): Binder {
    let grid = createGrid<Set<number>>();
    const volatile = new Set<number>();
    return {
        getVolatile: () => volatile,
        bindCell(fromRow: number, fromCol: number, toRow: number, toCol: number) {
            const s = grid.readOrWrite(fromRow, fromCol, newSet)
            if (s) {
                s.add(pointToKey(toRow, toCol));
            }
        },
        getDependents(row: number, col: number) {
            return grid.read(row, col);
        },
        clearDependents(row: number, col: number) {
            const s = grid.read(row, col);
            if (s) {
                s.clear();
            }
        },
        clear: () => {
            grid = createGrid();
        },
    };
}
