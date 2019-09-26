import { createSheetlet, ISheetlet } from "../src/sheetlet";
import { c0ToName, Matrix } from "../src/matrix";
import { consume } from "../bench/util";
import { Primitive } from "@tiny-calc/nano";

export function makeBenchmark(size: number): { sheet: ISheetlet, setAt: (row: number, col: number, value: Primitive) => void } {
    const cells = new Array(size * size);

    cells[0] = 0;

    // Cells in column 0 sum all cells above.
    for (let r = 1; r < size; r++) {
        cells[r * size] = `=SUM(A1:A${r})`;
    }

    // Cells in row 0 sum all cells to the left.
    for (let c = 1; c < size; c++) {
        cells[c] = `=SUM(A1:${c0ToName(c - 1)}1)`;
    }

    // Interior cells sum all cells above and/or to the left.
    for (let r = 1; r < size; r++) {
        for (let c = 1; c < size; c++) {
            const col = c0ToName(c);
            cells[r * size + c] = `=SUM(${col}1:${col}${r}) + SUM(A1:${c0ToName(c - 1)}${r + 1})`;
        }
    }

    const matrix = new Matrix(size, size, cells);
    const sheet = createSheetlet(matrix);

    return {
        sheet,
        setAt: (row: number, col: number, value: Primitive) => {
            matrix.storeCellText(row, col, value);
            sheet.refreshFromModel(row, col);
        }
    };
}

export function evalSheet(sheet: ISheetlet, size: number) {
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            consume(sheet.evaluateCell(r, c));
        }
    }
    return sheet;
}
