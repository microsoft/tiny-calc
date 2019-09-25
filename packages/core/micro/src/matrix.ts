import { Primitive } from "@tiny-calc/nano";

export interface IMatrix {
   readonly numRows: number;
   readonly numCols: number;
   loadCellText: (row: number, col: number) => Primitive | undefined;
   storeCellText: (row: number, col: number, value: Primitive | undefined) => void;
   loadCellData: (row: number, col: number) => object | undefined;
   storeCellData: (row: number, col: number, value: object | undefined) => void;
}

/** Convert a 0-based column index into an Excel-like column name (e.g., 0 -> 'A') */
export function c0ToName(colIndex: number) {
    let name = "";

    do {
        const mod = colIndex % 26;
        name = `${String.fromCharCode(65 + mod)}${name}`;
        // tslint:disable-next-line:no-parameter-reassignment
        colIndex = Math.trunc(colIndex / 26) - 1;
    } while (colIndex >= 0);

    return name;
}

export class Matrix implements IMatrix {
    private readonly cells: { text?: Primitive, data?: object }[];

    constructor(
        public readonly numRows: number,
        public readonly numCols: number,
        cells = new Array(numRows * numCols),
    ) { 
        this.cells = cells.map(text => { return { text }});
    }

    loadCellText(row: number, col: number) {
        this.vetPoint(row, col);
        return this.cells[this.rc0ToIndex(row, col)].text
    }
    
    storeCellText(row: number, col: number, value: Primitive | undefined) {
        this.vetPoint(row, col);
        this.cells[this.rc0ToIndex(row, col)].text = value;
    }
    
    loadCellData(row: number, col: number) {
        this.vetPoint(row, col);
        return this.cells[this.rc0ToIndex(row, col)].data;
    }

    storeCellData(row: number, col: number, value: object | undefined) {
        this.vetPoint(row, col);
        this.cells[this.rc0ToIndex(row, col)].data = value;
    }

    private rc0ToIndex(row: number, col: number) {
        return row * this.numCols + col;
    }

    private vetPoint(row: number, col: number) {
        if (!(0 <= row && row < this.numRows && 0 <= col && col <= this.numCols)) { throw new Error(); }
    }
}
