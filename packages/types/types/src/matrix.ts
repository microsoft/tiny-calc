/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

/** An observable 2D numerically indexed collection. */
export interface IMatrixShapeProducer {
    /**
     * Acquire a reader for this matrix's values and implicitly subscribe the consumer
     * to value change notifications.
     *
     * @param consumer - The consumer to be notified of matrix changes.
     */
    openMatrix(consumer: IMatrixShapeConsumer): IMatrixShapeReader;

    /**
     * Unsubscribe the consumer from this matrix's change notifications.
     *
     * @param consumer - The consumer to unregister from the matrix.
     */
    closeMatrix(consumer: IMatrixShapeConsumer): void;
}

/** A consumer of change notifications for a matrix. */
export interface IMatrixShapeConsumer {
    /** Notification that rows have been inserted, removed, and/or replaced in the given matrix. */
    rowsChanged(rowStart: number, removedCount: number, insertedCount: number, producer: IMatrixShapeProducer): void;

    /** Notification that cols have been inserted, removed, and/or replaced in the given matrix. */
    colsChanged(colStart: number, removedCount: number, insertedCount: number, producer: IMatrixShapeProducer): void;
}

/** Capability to read cells in a matrix. */
export interface IMatrixShapeReader {
    readonly rowCount: number;
    readonly colCount: number;

    /**
     * A reference to the underlying producer that provides values for this reader,
     * or undefined if the producer is immutable.
     */
    readonly matrixProducer?: IMatrixShapeProducer;
}

/** Capability to write cells in a matrix. */
export interface IMatrixShapeWriter {
    spliceRows(rowStart: number, deleteCount: number, insertCount: number): void;
    spliceCols(colStart: number, deleteCount: number, insertCount: number): void;
}

/** An observable 2D numerically indexed collection. */
export interface IMatrixProducer<T> extends IMatrixShapeProducer {
    /**
     * Acquire a reader for this matrix's values and implicitly subscribe the consumer
     * to value change notifications.
     *
     * @param consumer - The consumer to be notified of matrix changes.
     */
    openMatrix(consumer: IMatrixConsumer<T>): IMatrixReader<T>;

    /**
     * Unsubscribe the consumer from this matrix's change notifications.
     *
     * @param consumer - The consumer to unregister from the matrix.
     */
    closeMatrix(consumer: IMatrixConsumer<T>): void;
}

/** A consumer of change notifications for a matrix. */
export interface IMatrixConsumer<T> extends IMatrixShapeConsumer {
    /**
     * Notification that a range of cells have been replaced in the given matrix.  If the source
     * matrix has the new cell values already in an array, it may optionally pass these to consumers
     * as an optimization.
     */
    cellsChanged(rowStart: number, colStart: number, rowCount: number, colCount: number, producer: IMatrixProducer<T>): void;
}

/** Capability to read cells in a matrix. */
export interface IMatrixReader<T> extends IMatrixShapeReader {
    getCell(row: number, col: number): T;

    /**
     * A reference to the underlying producer that provides values for this reader,
     * or undefined if the producer is immutable.
     */
    readonly matrixProducer?: IMatrixProducer<T>;
}

/** Capability to write cells in a matrix. */
export interface IMatrixWriter<T> {
    setCell(row: number, col: number, value: T): void;
}
