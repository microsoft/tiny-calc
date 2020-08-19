import { IMatrixWriter, IMatrixReader } from "@tiny-calc/nano/src/types";
import { fill, sumBenchmark } from ".";

export class Array256x256 implements IMatrixWriter<number>, IMatrixReader<number> {
    private readonly cells: number[] = new Array(this.rowCount * this.colCount).fill(0);

    //#region IMatrixReader

    public readonly matrixProducer = undefined as any;

    public get rowCount() { return 256; }
    public get colCount() { return 256; }

    public getCell(row: number, col: number) {
        return this.cells[(row << 8) + col];
    }

    //#endregion IMatrixReader

    //#region IMatrixWriter

    public setCell(row: number, col: number, value: number) {
        this.cells[(row << 8) + col] = value;
    }

    //#endregion IMatrixWriter
}

const matrix = new Array256x256();

fill(matrix, matrix);
sumBenchmark("Baseline", matrix);
