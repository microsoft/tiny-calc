/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { IMatrixProducer, IMatrixReader, IMatrixConsumer } from "@tiny-calc/types";
import { ConsumerSet, addConsumer, removeConsumer, forEachConsumer } from "../consumerset";

export abstract class MatrixProducer<T> implements IMatrixProducer<T>, IMatrixReader<T> {
    private matrixConsumers?: ConsumerSet<IMatrixConsumer<T>>;

    //#region IMatrixProducer

    public openMatrix(consumer: IMatrixConsumer<T>): IMatrixReader<T> {
        this.matrixConsumers = addConsumer(this.matrixConsumers, consumer);
        return this;
    }

    public closeMatrix(consumer: IMatrixConsumer<T>): void {
        this.matrixConsumers = removeConsumer(this.matrixConsumers, consumer);
    }

    //#endregion IMatrixProducer

    //#region IMatrixReader

    public abstract get rowCount(): number;
    public abstract get colCount(): number;
    public abstract getCell(row: number, col: number): T;
    public get matrixProducer(): IMatrixProducer<T> { return this; }

    //#endregion IMatrixReader

    protected invalidateRows(rowStart: number, removedCount: number, insertedCount: number): void {
        forEachConsumer(this.matrixConsumers, (consumer) => {
            consumer.rowsChanged(rowStart, removedCount, insertedCount, /* producer: */ this);
        });
    }

    protected invalidateCols(colStart: number, removedCount: number, insertedCount: number): void {
        forEachConsumer(this.matrixConsumers, (consumer) => {
            consumer.colsChanged(colStart, removedCount, insertedCount, /* producer: */ this);
        });
    }

    protected invalidateCells(rowStart: number, colStart: number, rowCount: number, colCount: number): void {
        forEachConsumer(this.matrixConsumers, (consumer) => {
            consumer.cellsChanged(rowStart, colStart, rowCount, colCount, /* producer: */ this);
        });
    }
}
