import "mocha";
import { strict as assert } from "assert";
import { Random } from "best-random";
import { IMatrixConsumer, IMatrixReader, IMatrixProducer, IVectorWriter, IMatrixWriter } from "@tiny-calc/nano";
import { DenseVector, RowMajorMatrix } from "../src";

export class ExpectedMatrix<T = any> {
    private _rowCount = 0;
    private _colCount = 0;
    private readonly cells: T[] = [];

    public get rowCount() { this.vetCount(); return this._rowCount; }
    public get colCount() { this.vetCount(); return this._colCount; }

    getCell(row: number, col: number): T {
        return this.cells[this.getRowIndex(row) + col];
    }

    setCell(row: number, col: number, value: T) {
        this.cells[this.getRowIndex(row) + col] = value;
    }

    public insertRows(row: number, rowCount: number) {
        this.cells.splice(this.getRowIndex(row), 0, ...new Array(rowCount * this._colCount));
        this._rowCount += rowCount;
        this.vetCount();
    }

    public removeRows(row: number, rowCount: number) {
        this.cells.splice(this.getRowIndex(row), rowCount * this._colCount);
        this._rowCount -= rowCount;
        this.vetCount();
    }

    public insertCols(col: number, colCount: number) {
        const stride = this._colCount + colCount;
        const max = this._rowCount * stride;

        const emptyCells = new Array(colCount);
        for (let c = col; c < max; c += stride) {
            this.cells.splice(c, 0, ...emptyCells);
        }

        this._colCount = stride;
        this.vetCount();
    }

    public removeCols(col: number, colCount: number) {
        const stride = this._colCount - colCount;

        for (let c = col; c < this.cells.length; c += stride) {
            this.cells.splice(c, colCount);
        }

        this._colCount = stride;
        this.vetCount();
    }

    public extract(): ReadonlyArray<ReadonlyArray<T>> {
        const m: T[][] = [];
        for (let r = 0; r < this._rowCount; r++) {
            const row: T[] = [];
            m.push(row);
            for (let c = 0; c < this._colCount; c++) {
                row.push(this.getCell(r, c));
            }
        }

        return m;
    }

    private getRowIndex(row: number) {
        return row * this._colCount;
    }

    private vetCount() {
        // Vet that `rowCount` & `colCount` are consistent with the `cells` array.
        assert((this._colCount === 0 && this.cells.length === 0)
            || (this._rowCount === this.cells.length / this._colCount));
    }
}

export class TestMatrix<T = any, TRow = never, TCol = never> implements IMatrixConsumer<T> {
    private readonly expected = new ExpectedMatrix();
    private readonly consumed = new ExpectedMatrix();
    private readonly reader: IMatrixReader<T>;
    public readonly log: string[] = [];

    constructor (
        producer: IMatrixProducer<T>,
        private readonly rowWriter: IVectorWriter<TRow>,
        private readonly colWriter: IVectorWriter<TCol>,
        private readonly cellWriter: IMatrixWriter<T>
    ) {
        this.reader = producer.openMatrix(this);
    }

    public get rowCount() { this.vetCounts(); return this.reader.rowCount; }
    public get colCount() { this.vetCounts(); return this.reader.colCount; }

    // #region IMatrixConsumer

    rowsChanged(rowStart: number, removedCount: number, insertedCount: number): void {
        const rowEnd = rowStart + removedCount;
        
        assert(0 <= rowStart && rowStart <= rowEnd && rowEnd <= this.consumed.rowCount);

        if (removedCount > 0) { this.consumed.removeRows(rowStart, removedCount); }
        if (insertedCount > 0) { this.consumed.insertRows(rowStart, insertedCount); }

        this.check();
    }

    colsChanged(colStart: number, removedCount: number, insertedCount: number): void {
        const colEnd = colStart + removedCount;
        assert(0 <= colStart && colStart <= colEnd && colEnd <= this.consumed.colCount);

        if (removedCount > 0) { this.consumed.removeCols(colStart, removedCount); }
        if (insertedCount > 0) { this.consumed.insertCols(colStart, insertedCount); }

        this.check();
    }

    cellsChanged(rowStart: number, colStart: number, rowCount: number, colCount: number): void {
        this.vetCounts();

        const rowEnd = rowStart + rowCount;
        const colEnd = colStart + colCount;

        assert(0 <= rowStart && rowStart <= rowEnd && rowEnd <= this.consumed.rowCount);
        assert(0 <= colStart && colStart <= colEnd && colEnd <= this.consumed.colCount);

        for (let row = rowStart; row < rowEnd; row++) {
            for (let col = colStart; col < colEnd; col++) {
                this.consumed.setCell(row, col, this.reader.getCell(row, col));
            }
        }

        this.check();
    }

    // #endregion IMatrixConsumer

    getCell(row: number, col: number): T {
        assert(0 <= row && row < this.rowCount
            && 0 <= col && col < this.colCount);

        const actual = this.reader.getCell(row, col);
        const expected = this.expected.getCell(row, col);
        
        assert.equal(actual, expected);
        assert.equal(this.consumed.getCell(row, col), expected);

        return actual;
    }

    public get matrixProducer() { return this; }

    setCell(row: number, col: number, value: T) {
        this.log.push(`matrix.setCell(/* row: */ ${row}, /* col: */ ${col}, ${JSON.stringify(value)});    // rowCount: ${this.rowCount} colCount: ${this.colCount}`);

        this.setCellCore(row, col, value);
    }

    private setCellCore(row: number, col: number, value: T) {
        assert(0 <= row && row < this.rowCount
            && 0 <= col && col < this.colCount);

        this.expected.setCell(row, col, value);
        this.cellWriter.setCell(row, col, value);
        
        assert.equal(this.getCell(row, col), value,
            `Writer.setCell(${row},${col}) must update matrix value.`);
    }

    setCells(rowStart: number, colStart: number, colCount: number, values: T[]) {
        this.log.push(`matrix.setCells(/* rowStart: */ ${rowStart}, /* colStart: */ ${colStart}, /* colCount: */ ${colCount}, ${JSON.stringify(values)});    // rowCount: ${this.rowCount} colCount: ${this.colCount} length: ${values.length}`);

        const rowCount = Math.ceil(values.length / colCount);

        assert((0 <= rowStart && rowStart < this.rowCount)
            && (0 <= colStart && colStart < this.colCount)
            && (1 <= colCount && colCount <= (this.colCount - colStart))
            && (rowCount <= (this.rowCount - rowStart)));

        const endCol = colStart + colCount;
        let r = rowStart;
        let c = colStart;

        for (const value of values) {
            this.setCellCore(r, c, value);

            if (++c === endCol) {
                c = colStart;
                r++;
            }
        }
    }

    public insertRows(rowStart: number, rowCount: number) {
        this.log.push(`matrix.insertRows(${rowStart},${rowCount});    // rowCount: ${this.rowCount} -> ${this.rowCount + rowCount}, colCount: ${this.colCount}`);

        this.expected.insertRows(rowStart, rowCount);
        this.rowWriter.splice(rowStart, /* deleteCount: */ 0, /* insertCount: */ rowCount);

        this.check();
    }

    public removeRows(rowStart: number, rowCount: number) {
        this.log.push(`matrix.removeRows(${rowStart},${rowCount});    // rowCount: ${this.rowCount} -> ${this.rowCount - rowCount}, colCount: ${this.colCount}`);

        this.expected.removeRows(rowStart, rowCount);
        this.rowWriter.splice(rowStart, /* deleteCount: */ rowCount, /* insertCount: */ 0);

        this.check();
    }

    public insertCols(colStart: number, colCount: number) {
        this.log.push(`matrix.insertCols(${colStart},${colCount});    // colCount: ${this.colCount} -> ${this.colCount + colCount}, colCount: ${this.colCount}`);

        this.expected.insertCols(colStart, colCount);
        this.colWriter.splice(colStart, /* deleteCount: */ 0, /* insertCount: */ colCount);

        this.check();
    }

    public removeCols(colStart: number, colCount: number) {
        this.log.push(`matrix.removeCols(${colStart},${colCount});    // colCount: ${this.colCount} -> ${this.colCount - colCount}, colCount: ${this.colCount}`);

        this.expected.removeCols(colStart, colCount);
        this.colWriter.splice(colStart, /* deleteCount: */ colCount, /* insertCount: */ 0);

        this.check();
    }

    public extract(): ReadonlyArray<ReadonlyArray<T>> {
        const m: T[][] = [];      
        for (let r = 0; r < this.rowCount; r++) {
            const row: T[] = [];
            m.push(row);
            for (let c = 0; c < this.colCount; c++) {
                row.push(this.getCell(r, c));
            }
        }

        return m;
    }

    private vetCounts() {
        assert.equal(this.reader.rowCount, this.expected.rowCount);
        assert.equal(this.consumed.rowCount, this.expected.rowCount);
        assert.equal(this.reader.colCount, this.expected.colCount);
        assert.equal(this.consumed.colCount, this.expected.colCount);
    }

    public check() {
        this.vetCounts();
        return this.extract();
    }

    public expectSize(rowCount: number, colCount: number) {
        this.check();
        
        assert.equal(this.rowCount, rowCount);
        assert.equal(this.colCount, colCount);
    }

    public expect(expected: T[][]) {
        assert.deepEqual(this.extract(), this.check());
    }

    public toString() {
        return JSON.stringify(this.extract());
    }
}

describe("Matrix", () => {
    let matrix: TestMatrix;

    beforeEach(() => {
        const rows = new DenseVector();
        const cols = new DenseVector();
        const cells = new RowMajorMatrix(rows, cols);
        matrix = new TestMatrix(/* producer: */ cells, /* rowWriter: */ rows, /*: colWriter: */ cols, /* cellWriter: */ cells);
    });

    afterEach(() => {
        matrix.check();
    });

    // Vet our three variants of an empty matrix (no rows, no cols, and both no rows and no cols).
    describe("empty matrices", () => {
        // Note: We check the num rows/cols explicitly in these tests to differentiate between
        //       matrices that are 0 length in one or both dimensions.
        it("0x0", async () => {
            matrix.expectSize(/* rowCount: */ 0, /* colCount: */ 0);
        });

        it("0x1", async () => {
            matrix.insertCols(/* start: */ 0, /* count: */ 1);
            matrix.expectSize(/* rowCount: */ 0, /* colCount: */ 1);
        });

        it("1x0", async () => {
            matrix.insertRows(/* start: */ 0, /* count: */ 1);
            matrix.expectSize(/* rowCount: */ 1, /* colCount: */ 0);
        });
    });

    // Vet that we can set and read back the cell in a 1x1 matrix.
    it("get/set cell", async () => {
        matrix.insertRows(/* start: */ 0, /* count: */ 1);
        matrix.insertCols(/* start: */ 0, /* count: */ 1);
        matrix.expect([[undefined]]);

        matrix.setCell(/* row: */ 0, /* col: */ 0, 1);
        matrix.expect([[1]]);
    });

    // Vet that we can set a range of cells with `setCells()`.
    it("get/set cells", async () => {
        matrix.insertRows(/* start: */ 0, /* count: */ 4);
        matrix.insertCols(/* start: */ 0, /* count: */ 4);

        matrix.expect([
            [undefined, undefined, undefined, undefined],
            [undefined, undefined, undefined, undefined],
            [undefined, undefined, undefined, undefined],
            [undefined, undefined, undefined, undefined],
        ]);

        // Note: It's valid to leave the last row incomplete.
        matrix.setCells(/* row: */ 1, /* col: */ 1, /* colCount: */ 2, [
            1, 2,
            3, 4,
            5
        ]);

        matrix.expect([
            [undefined, undefined, undefined, undefined],
            [undefined,         1,         2, undefined],
            [undefined,         3,         4, undefined],
            [undefined,         5, undefined, undefined],
        ]);
    });

    describe("column insertion", () => {
        beforeEach(() => {
            matrix.insertRows(0, 2);
            matrix.insertCols(0, 2);
            matrix.setCells(/* row: */ 0, /* col: */ 0, /* colCount: */ 2, [
                1, 2,
                3, 4,
            ]);
            matrix.expect([
                [1, 2],
                [3, 4],
            ]);
        });

        it("before", async () => {
            matrix.insertCols(/* colStart: */ 0, /* colCount: */ 1);
            matrix.expect([
                [undefined, 1, 2],
                [undefined, 3, 4],
            ]);
        });

        it("after", async () => {
            matrix.insertCols(/* colStart: */ 2, /* colCount: */ 1);
            matrix.expect([
                [1, 2, undefined],
                [3, 4, undefined],
            ]);
        });

        it("middle", async () => {
            matrix.insertCols(/* colStart: */ 1, /* colCount: */ 2);
            matrix.expect([
                [1, undefined, undefined, 2],
                [3, undefined, undefined, 4],
            ]);
        });
    });

    describe("column removal", () => {
        beforeEach(() => {
            matrix.insertRows(0, 2);
            matrix.insertCols(0, 2);
            matrix.setCells(/* row: */ 0, /* col: */ 0, /* colCount: */ 2, [
                1, 2,
                3, 4,
            ]);
            matrix.expect([
                [1, 2],
                [3, 4],
            ]);
        });

        it("first", async () => {
            matrix.removeCols(/* colStart: */ 0, /* colCount: */ 1);
            matrix.expect([
                [2],
                [4],
            ]);
        });

        it("last", async () => {
            matrix.removeCols(/* colStart: */ 1, /* colCount: */ 1);
            matrix.expect([
                [1],
                [3],
            ]);
        });

        it("all", async () => {
            matrix.removeCols(/* colStart: */ 0, /* colCount: */ 2);
            matrix.expect([
                [],
                [],
            ]);
        });
    });

    describe("row insertion", () => {
        beforeEach(() => {
            matrix.insertRows(0, 2);
            matrix.insertCols(0, 2);
            matrix.setCells(/* row: */ 0, /* col: */ 0, /* colCount: */ 2, [
                1, 2,
                3, 4,
            ]);
            matrix.expect([
                [1, 2],
                [3, 4],
            ]);
        });

        it("before", async () => {
            matrix.insertRows(/* rowStart: */ 0, /* rowCount: */ 1);
            matrix.expect([
                [undefined, undefined],
                [        1,         2],
                [        3,         4],
            ]);
        });

        it("after", async () => {
            matrix.insertRows(/* rowStart: */ 2, /* rowCount: */ 1);
            matrix.expect([
                [        1,         2],
                [        3,         4],
                [undefined, undefined],
            ]);
        });

        it("middle", async () => {
            matrix.insertRows(/* rowStart: */ 1, /* rowCount: */ 2);
            matrix.expect([
                [        1,         2],
                [undefined, undefined],
                [undefined, undefined],
                [        3,         4],
            ]);
        });
    });

    describe("row removal", () => {
        beforeEach(() => {
            matrix.insertRows(0, 2);
            matrix.insertCols(0, 2);
            matrix.setCells(/* row: */ 0, /* col: */ 0, /* colCount: */ 2, [
                1, 2,
                3, 4,
            ]);
            matrix.expect([
                [1, 2],
                [3, 4],
            ]);
        });

        it("first", async () => {
            matrix.removeRows(/* rowStart: */ 0, /* rowCount: */ 1);
            matrix.expect([
                [3, 4],
            ]);
        });

        it("last", async () => {
            matrix.removeRows(/* rowStart: */ 1, /* rowCount: */ 1);
            matrix.expect([
                [1, 2],
            ]);
        });

        it("all", async () => {
            matrix.removeRows(/* rowStart: */ 0, /* rowCount: */ 2);
            matrix.expectSize(0, 2);
        });
    });

    // Vet that we can insert a row in a 2x1 matrix.
    it("row insertion", async () => {
        matrix.insertRows(0, 2);
        matrix.insertCols(0, 1);
        matrix.expect([[undefined], [undefined]]);

        matrix.setCell(0, 0, 0);
        matrix.setCell(1, 0, 1);
        matrix.expect([
            [0],
            [1]
        ]);

        matrix.insertRows(1, 1);
        matrix.expect([
            [0],
            [undefined],
            [1]
        ]);
    });

    it("fail", () => {
        matrix.insertRows(0,3);                                     // rowCount: 0 -> 3, colCount: 0
        matrix.insertCols(0,5);                                     // colCount: 0 -> 5, colCount: 0
        matrix.setCell(/* row: */ 2, /* col: */ 3, 1378344049);     // rowCount: 3 colCount: 5
        matrix.removeCols(0,5);                                     // colCount: 5 -> 0, colCount: 5
        matrix.insertCols(0,2);                                     // colCount: 0 -> 2, colCount: 0
    });

    function stress(iterations: number, seed: number) {
        it(`stress (iterations=${iterations}, seed=${seed})`, () => {
            assert.equal(matrix.log.length, 0);

            // Initialize PRNG with given seed.
            const float64 = new Random(seed).float64;

            // Returns a pseudorandom 32b integer in the range [0 .. max].
            const int32 = (max = 0x7FFFFFFF) => (float64() * (max + 1)) | 0;

            // Returns an array with 'n' random values, each in the range [0 .. 99].
            const values = (n: number) => new Array(n)
                .fill(0)
                .map(() => int32(99));

            try {
                for (let i = 0; i < iterations; i++) {
                    switch (int32(2)) {
                        case 0:
                            if (matrix.rowCount > 0 && matrix.colCount > 0) {
                                const row = int32(matrix.rowCount - 1);
                                const col = int32(matrix.colCount - 1);
                                matrix.setCell(row, col, int32());
                            }
                            break;
                        case 1: {
                            const deleteCount = int32(matrix.rowCount);
                            const start = int32(matrix.rowCount - deleteCount);
                            const insertCount = int32(5);

                            matrix.removeRows(start, deleteCount);
                            matrix.insertRows(start, insertCount);

                            // 90% probability of filling the newly inserted row with values.
                            if (float64() < 0.9) {
                                const colCount = matrix.colCount;
                                if (colCount > 0 && insertCount > 0) {
                                    matrix.setCells(/* rowStart: */ start, /* colStart: */ 0, colCount, values(insertCount * colCount));
                                }
                            }
                            break;
                        }
                        case 2: {
                            const deleteCount = int32(matrix.colCount);
                            const start = int32(matrix.colCount - deleteCount);
                            const insertCount = int32(5);

                            matrix.removeCols(start, deleteCount);
                            matrix.insertCols(start, insertCount);

                            // 90% probability of filling the newly inserted row with values.
                            if (float64() < 0.9) {
                                const rowCount = matrix.rowCount;
                                if (rowCount > 0 && insertCount > 0) {
                                    matrix.setCells(/* rowStart: */ 0, /* colStart: */ start, insertCount, values(rowCount * insertCount));
                                }
                            }
                            break;
                        }
                    }
                }
            } catch (error) {
                // If an error occurs, dump the repro instructions.
                for (const s of matrix.log) {
                    console.log(s);
                }

                // Also dump the current state of the matrix.
                console.log(matrix.toString());

                // Finally, rethrow the original error.
                throw error;
            }
        });
    }

    describe("stress", () => {
        for (let i = 0; i < 10; i++) {
            stress(/* iterations: */ 100, /* seed: */ Math.random() * 0x100000000 | 0);
        }
    });
});
