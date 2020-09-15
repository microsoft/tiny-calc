/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    IConsumer,
    IProducer,
    IVectorConsumer,
    IMatrixConsumer,
    IVectorProducer,
    IMatrixProducer
} from "@tiny-calc/types";

import { strict as assert } from "assert";

export type AnyProducer = IProducer<unknown> | IVectorProducer<unknown> | IMatrixProducer<unknown>

const idSym = Symbol("AnyProducer.id");

export class LoggingConsumer<T> implements IConsumer<T>, IVectorConsumer<T>, IMatrixConsumer<T> {
    public readonly log: unknown[] = [];

    public static setProducerId(producer: AnyProducer, value: string): void {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (producer as any)[idSym] = value;
    }

    private getProducerId(producer: AnyProducer): string {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (producer as any)[idSym] ?? "Error: Missing call to LoggingConsumer.setProducerId(..)";
    }

    // #region IConsumer<T>
    public keyChanged<U extends T, K extends keyof U>(property: K, producer: IProducer<U>): void {
        this.log.push({ property, producer: this.getProducerId(producer) });
    }
    // #endregion IConsumer<T>

    // #region IVectorConsumer<T>
    public itemsChanged(start: number, removedCount: number, insertedCount: number, producer: IVectorProducer<T>): void {
        this.log.push({ start, removedCount, insertedCount, producer: this.getProducerId(producer) });
    }
    // #endregion IVectorConsumer<T>

    // #region IMatrixConsumer<T>
    public rowsChanged(rowStart: number, removedCount: number, insertedCount: number, producer: IMatrixProducer<T>): void {
        this.log.push({ rowStart, removedCount, insertedCount, producer: this.getProducerId(producer) });
    }

    public colsChanged(colStart: number, removedCount: number, insertedCount: number, producer: IMatrixProducer<T>): void {
        this.log.push({ colStart, removedCount, insertedCount, producer: this.getProducerId(producer) });
    }

    public cellsChanged(rowStart: number, colStart: number, rowCount: number, colCount: number, producer: IMatrixProducer<T>): void {
        this.log.push({ rowStart, colStart, rowCount, colCount, producer: this.getProducerId(producer) });
    }
    // #endregion IMatrixConsumer<T>

    public toString(): string { return JSON.stringify(this.log, undefined, 2); }

    public expect(expected: {}[]): void {
        assert.deepEqual(this.log, expected);
    }
}
