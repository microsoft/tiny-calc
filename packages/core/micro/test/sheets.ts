import { c0ToName } from "@tiny-calc/nano/test/matrix";
import { createSheetlet, ISheetlet } from "../src/sheetlet";
import { Matrix } from "../src/matrix";
import { consume } from "../bench/util";
import { Primitive } from "@tiny-calc/nano";

export function makeBenchmark(size: number) {
    const cells = new Array(size * size);

    for (let r = 1; r < size; r++) {
        cells[r * size] = `=SUM(A1:A${r})`;
    }

    for (let r = 0; r < size; r++) {
        for (let c = 1; c < size; c++) {
            cells[r * size + c] = `=SUM(A1:${c0ToName(c - 1)}${r + 1})`;
        }
    }

    cells[0] = 0;

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
