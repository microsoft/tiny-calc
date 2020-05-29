import { DenseMatrix } from "./dense";
import { IVectorConsumer, IVectorProducer, IMatrixWriter, IVectorReader } from "@tiny-calc/nano";

export class RowMajorMatrix<T, TRow = unknown, TCol = unknown> extends DenseMatrix<T> implements IMatrixWriter<T>, IVectorConsumer<TRow | TCol> {
    private readonly rowReader: IVectorReader<TRow>;
    private readonly colReader: IVectorReader<TCol>;

    constructor(rows: IVectorProducer<TRow>, cols: IVectorProducer<TCol>) {
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

    public setCell(row: number, col: number, value: T) {
        this.setCellCore(/* major: */ row, /* minor: */ col, value);
        this.invalidateCells(row, col, /* rowCount: */ 1, /* colCount: */ 1);
    }

    //#endregion IMatrixReader

    //#region IVectorConsumer

    itemsChanged(start: number, removedCount: number, insertedCount: number, producer: IVectorProducer<TRow | TCol>): void {
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

    protected get majorCount() { return this.rowCount; }
    protected get stride() { return this.colCount; }

    //#endregion DenseMatrix
}
