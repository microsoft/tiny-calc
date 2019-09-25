import { CalcValue, Primitive } from "@tiny-calc/nano";
import { strict as assert } from "assert";
import "mocha";
import { Matrix } from "../src/matrix";
import { createSheetlet, ISheetlet } from "../src/sheetlet";
import { makeBenchmark } from "./sheets";

describe("Sheetlet", () => {
    function evalCellTest(sheet: ISheetlet, row: number, col: number, expected: CalcValue<any>) {
        it(`[${row},${col}] -> ${JSON.stringify(expected)}`, () => {
            assert.deepEqual(sheet.evaluateCell(row, col), expected);
        });
    }

    function evalFormulaTest(sheet: ISheetlet, expression: string, expected: CalcValue<any>) {
        it(`'${expression}' -> ${JSON.stringify(expected)}`, () => {
            assert.deepEqual(sheet.evaluateFormula(expression), expected);
        });
    }

    function extract(sheet: ISheetlet, numRows: number, numCols: number) {
        let matrix = [];
        for (let r = 0; r < numRows; r++) {
            let row: (Primitive | undefined)[] = [];
            matrix.push(row);
            for (let c = 0; c < numCols; c++) {
                row.push(sheet.evaluateCell(r, c));
            }
        }
        return matrix;
    }

    describe("constant", () => {
        const matrix = new Matrix(/* numRows: */ 2, /* numCols: */ 3,
            [0, 1, 2,
             3, 4, 5]);

        const sheet = createSheetlet(matrix);
        
        describe("evaluate cell", () => {
            const evalCases = [
                { row: 0, col: 2, expected: 2 },
                { row: 1, col: 0, expected: 3 },
            ];
    
            for (const { row, col, expected } of evalCases) {
                evalCellTest(sheet, row, col, expected);
            }
        });
    
        describe("evaluate formula", () => {
            const evalCases = [
                { formula: "C1", expected: 2 },
                { formula: "A2", expected: 3 },
            ];
    
            for (const { formula, expected } of evalCases) {
                evalFormulaTest(sheet, formula, expected);
            }
        });
    });

    describe("sums 3x3 benchmark", () => {
        const { sheet, setAt } = makeBenchmark(3);

        it("initially zero", () => {
            assert.deepEqual(
                extract(sheet, 3, 3), [
                    [0, 0, 0],
                    [0, 0, 0],
                    [0, 0, 0],
                ]);
        });

        it("recalculated", () => {
            setAt(0, 0, 1);
            assert.deepEqual(
                extract(sheet, 3, 3), [
                    [1, 1, 2],
                    [1, 2, 5],
                    [2, 4, 11],
                ]);
        });
    });
});
