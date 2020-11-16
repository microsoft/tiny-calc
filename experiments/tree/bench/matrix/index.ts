import { benchmark } from "hotloop";
import { IMatrixReader, IMatrixWriter } from "@tiny-calc/nano/src/types";

export function sumBenchmark(name: string, reader: IMatrixReader<number>) {
    const { rowCount, colCount } = reader;

    benchmark(`Matrix (${name} ${rowCount}x${colCount}): sum row-wise`, () => {
        let sum = 0;
        
        for (let row = 0; row < rowCount; row++) {
            for (let col = 0; col < colCount; col++) {
                sum += reader.getCell(row, col);
            }
        }

        consume(sum);
    });
}

export function fill(
    reader: IMatrixReader<number>,
    writer: IMatrixWriter<number>,
    rowStart = 0,
    colStart = 0,
    rowCount = reader.rowCount - rowStart,
    colCount = reader.colCount - colStart,
    value = (row: number, col: number) => row * rowCount + col
) {
    const rowEnd = rowStart + rowCount;
    const colEnd = colStart + colCount;

    for (let row = rowStart; row < rowEnd; row++) {
        for (let col = colStart; col < colEnd; col++) {
            writer.setCell(row, col, value(row, col) as any);
        }
    }
}
