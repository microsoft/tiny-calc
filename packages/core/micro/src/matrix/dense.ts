/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { MatrixProducer } from "./producer";

/**
 * A row/col-major agnostic base class 
 */
export abstract class DenseMatrix<T> extends MatrixProducer<T> {
    protected cells: T[] = [];
    protected abstract get majorCount(): number;
    protected abstract get stride(): number;
    
    protected getCellCore(major: number, minor: number): T {
        return this.cells[this.getMajorIndex(major) + minor];
    }

    protected setCellCore(major: number, minor: number, value: T) {
        this.cells[this.getMajorIndex(major) + minor] = value;
    }

    protected spliceMajor(start: number, removedCount: number, insertedCount: number) {
        // TODO: Using the spread operator with `.splice()` can exhaust the stack (node v12 x64)
        this.cells.splice(
            this.getMajorIndex(start),
            removedCount * this.stride,
            ...new Array(insertedCount * this.stride));
    }

    protected spliceMinor(start: number, removedCount: number, insertedCount: number) {
        const emptyCells = new Array(insertedCount);
        const stride = this.stride;
        for (let r = this.majorCount, c = start; r > 0; r--, c += stride) {
            // TODO: Using the spread operator with `.splice()` can exhaust the stack (node v12 x64)
            this.cells.splice(c, removedCount, ...emptyCells);
        }
    }

    private getMajorIndex(major: number) {
        return major * this.stride;
    }
}
