/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { createSheetletProducer, Sheetlet } from "../src/sheetlet";
import { createGrid, matrixProducer } from "../src/matrix";
import { consume } from "../bench/util";
import { Primitive } from "@tiny-calc/nano";
import { IMatrixReader } from "@tiny-calc/types";
import { Value } from "../src/types";

/** Convert a 0-based column index into an Excel-like column name (e.g., 0 -> 'A') */
function c0ToName(colIndex: number) {
    let name = "";

    do {
        const mod = colIndex % 26;
        name = `${String.fromCharCode(65 + mod)}${name}`;
        // tslint:disable-next-line:no-parameter-reassignment
        colIndex = Math.trunc(colIndex / 26) - 1;
    } while (colIndex >= 0);

    return name;
}

export function makeBenchmark(size: number): { sheet: Sheetlet, setAt: (row: number, col: number, value: Primitive) => void } {
    const cells = new Array(size).fill(undefined).map(() => { return new Array(size) });

    cells[0][0] = 0;

    // Cells in column 0 sum all cells above.
    for (let r = 1; r < size; r++) {
        cells[r][0] = `=SUM(A1:A${r})`;
    }

    // Cells in row 0 sum all cells to the left.
    for (let c = 1; c < size; c++) {
        cells[0][c] = `=SUM(A1:${c0ToName(c - 1)}1)`;
    }

    // Interior cells sum all cells above and/or to the left.
    for (let r = 1; r < size; r++) {
        for (let c = 1; c < size; c++) {
            const col = c0ToName(c);
            cells[r][c] = `=SUM(${col}1:${col}${r}) + SUM(A1:${c0ToName(c - 1)}${r + 1})`;
        }
    }

    const matrix = matrixProducer<Value>(cells);
    const sheet = createSheetletProducer(matrix, createGrid());

    return {
        sheet,
        setAt: (row: number, col: number, value: Primitive) => {
            matrix.write(row, col, value);
            sheet.invalidate(row, col);
        }
    };
}

export function evalSheet(sheet: IMatrixReader<Value>, size: number) {
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            consume(sheet.getCell(r, c));
        }
    }
    return sheet;
}
