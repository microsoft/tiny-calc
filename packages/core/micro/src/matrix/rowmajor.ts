/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { DenseMatrix } from "./dense";
import { IVectorConsumer, IVectorProducer, IVectorReader } from "@tiny-calc/types";
import { IMatrixWriter } from "@tiny-calc/nano";

export class RowMajorMatrix<T, TRow = unknown, TCol = unknown> extends DenseMatrix<T> implements IMatrixWriter<T>, IVectorConsumer<TRow | TCol> {
    private readonly rowReader: IVectorReader<TRow>;
    private readonly colReader: IVectorReader<TCol>;

    public constructor(rows: IVectorProducer<TRow>, cols: IVectorProducer<TCol>) {
        super();

        this.rowReader = rows.openVector(this);
        this.colReader = cols.openVector(this);

        this.cells = new Array(this.rowCount * this.colCount).fill(undefined);
    }

    //#region IMatrixReader

    public get rowCount(): number { return this.rowReader.length; }
    public get colCount(): number { return this.colReader.length; }

    public getCell(row: number, col: number): T {
        return this.getCellCore(/* major: */ row, /* minor: */ col);
    }

    //#endregion IMatrixReader

    //#region IMatrixWriter

    public setCell(row: number, col: number, value: T): void {
        this.setCellCore(/* major: */ row, /* minor: */ col, value);
        this.invalidateCells(row, col, /* rowCount: */ 1, /* colCount: */ 1);
    }

    //#endregion IMatrixReader

    //#region IVectorConsumer

    public itemsChanged(start: number, removedCount: number, insertedCount: number, producer: IVectorProducer<TRow | TCol>): void {
        if (producer === this.rowReader.vectorProducer) {
            this.spliceMajor(start, removedCount, insertedCount);
            this.invalidateRows(start, removedCount, insertedCount);
        } else {
            this.spliceMinor(start, removedCount, insertedCount);
            this.invalidateCols(start, removedCount, insertedCount);
        }
    }

    //#endregion IVectorConsumer

    //#region DenseMatrix

    protected get majorCount(): number { return this.rowCount; }
    protected get stride(): number { return this.colCount; }

    //#endregion DenseMatrix
}
