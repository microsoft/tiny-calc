import { CalcValue, Primitive, IMatrixReader } from "@tiny-calc/nano";
import { strict as assert } from "assert";
import "mocha";
import { createMatrix, matrixProducer } from "../src/matrix";
import { createSheetlet, Sheetlet } from "../src/sheetlet";
import { Value } from "../src/types";
import { makeBenchmark } from "./sheets";

describe("Sheetlet", () => {
    function evalCellTest(sheet: IMatrixReader<Value>, row: number, col: number, expected: Primitive) {
        it(`[${row},${col}] -> ${JSON.stringify(expected)}`, () => {
            assert.deepEqual(sheet.read(row, col), expected);
        });
    }

    function evalFormulaTest(sheet: Sheetlet, expression: string, expected: CalcValue<any>) {
        it(`'${expression}' -> ${JSON.stringify(expected)}`, () => {
            assert.deepEqual(sheet.evaluateFormula(expression), expected);
        });
    }

    function extract(sheet: IMatrixReader<Value>, numRows: number, numCols: number) {
        let matrix = [];
        for (let r = 0; r < numRows; r++) {
            let row: (Primitive | undefined)[] = [];
            matrix.push(row);
            for (let c = 0; c < numCols; c++) {
                row.push(sheet.read(r, c));
            }
        }
        return matrix;
    }

    describe("constant", () => {
        const matrix = matrixProducer<Value>([
            [0, 1, 2, "Hello"],
            [3, 4, 5, " world"]
        ]);

        const sheet = createSheetlet(matrix, createMatrix());
        sheet.openMatrix(undefined as any);

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
                { formula: "CONCAT(D1:D2)", expected: "Hello world" },
                { formula: "CONCAT(D1, D2)", expected: "Hello world" },
            ];

            for (const { formula, expected } of evalCases) {
                evalFormulaTest(sheet, formula, expected);
            }
        });
    });

    describe("sums 3x3 benchmark", () => {
        const { sheet, setAt } = makeBenchmark(3);
        const reader = sheet.openMatrix(undefined as any);

        it("initially zero", () => {
            assert.deepEqual(
                extract(reader, 3, 3), [
                [0, 0, 0],
                [0, 0, 0],
                [0, 0, 0],
            ]);
        });

        it("recalculated", () => {
            setAt(0, 0, 1);
            assert.deepEqual(
                extract(reader, 3, 3), [
                [1, 1, 2],
                [1, 3, 8],
                [2, 8, 26],
            ]);
        });
    });
});
