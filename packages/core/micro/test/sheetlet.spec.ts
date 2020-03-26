import { CalcValue, Primitive, IMatrixConsumer, IMatrixReader } from "@tiny-calc/nano";
import { strict as assert } from "assert";
import "mocha";
import { createGrid, matrixProducer } from "../src/matrix";
import { createSheetletProducer, Sheetlet } from "../src/sheetlet";
import { makeBenchmark } from "./sheets";

type Value = Primitive | undefined;

const nullConsumer: IMatrixConsumer<unknown> = {
    rowsChanged() { },
    colsChanged() { },
    cellsChanged() { },
}

const testConsumer = (values: Primitive[][]): IMatrixConsumer<Primitive> & { notifications: () => number } => {
    let notifications = 0;
    return {
        notifications: () => notifications,
        rowsChanged() { },
        colsChanged() { },
        cellsChanged(row, col, numRows, numCols, _, producer) {
            notifications++;
            const reader = producer.openMatrix(nullConsumer);
            const endR = row + numRows;
            const endC = col + numCols;
            for (let i = row; i < endR; i++) {
                for (let j = col; j < endC; j++) {
                    assert.deepEqual(reader.read(i, j), values[i][j]);
                }
            }
        }
    }
}

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

    function initTest(values: Primitive[][]) {
        const matrix = matrixProducer<Value>(values);
        return [matrix, createSheetletProducer(matrix, createGrid())] as const;
    }

    describe("constant", () => {
        const matrix = matrixProducer<Value>([
            [0, 1, 2, "Hello"],
            [3, 4, 5, " world"]
        ]);

        const sheet = createSheetletProducer(matrix, createGrid());
        sheet.openMatrix(nullConsumer);

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
        const reader = sheet.openMatrix(nullConsumer);

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

    describe("interactive tests", () => {
        it("should run a simple backward chain", () => {
            const [data, sheet] = initTest([
                [1, 2, 3, 4, 5]
            ]);

            const reader = sheet.openMatrix(nullConsumer);

            assert.deepEqual(
                extract(reader, 1, 5), [
                [1, 2, 3, 4, 5]
            ]);

            data.write(0, 0, "=PRODUCT(B1:E1)");
            data.write(0, 1, "=PRODUCT(C1:E1)");
            data.write(0, 2, "=PRODUCT(D1:E1)");

            sheet.invalidate(0, 0);

            assert.deepEqual(
                extract(reader, 1, 5), [
                [120, 2, 3, 4, 5]
            ]);

            sheet.invalidate(0, 1);

            assert.deepEqual(
                extract(reader, 1, 5), [
                [3600, 60, 3, 4, 5]
            ]);

            sheet.invalidate(0, 2);

            assert.deepEqual(
                extract(reader, 1, 5), [
                [160000, 400, 20, 4, 5]
            ]);

            data.write(0, 0, 10);
            data.write(0, 4, "=A1+1");

            sheet.invalidate(0, 0);
            sheet.invalidate(0, 4);

            assert.deepEqual(
                extract(reader, 1, 5), [
                [10, 1936, 44, 4, 11]
            ]);

        });

        it("invalid in aggregation repro", () => {
            const [data, sheet] = initTest([
                [1, 2, 3, 4, 5]
            ]);

            const reader = sheet.openMatrix(nullConsumer);

            assert.deepEqual(
                extract(reader, 1, 5), [
                [1, 2, 3, 4, 5]
            ]);

            data.write(0, 1, "=42");
            sheet.invalidate(0, 1);

            assert.deepEqual(
                extract(reader, 1, 5), [
                [1, 42, 3, 4, 5]
            ]);

            data.write(0, 1, "=-42");
            data.write(0, 0, "=SUM(B1:E1)+E1");
            sheet.invalidate(0, 1);
            sheet.invalidate(0, 0);

            assert.deepEqual(
                extract(reader, 1, 5), [
                [-25, -42, 3, 4, 5]
            ]);
        })
        
        it("should handle conditional trickery", () => {
            const [data, sheet] = initTest([
                [1,
                    "=IF(A1 = 1, A1 + 1, C1 + 1)",
                    "=IF(A1 = 1, B1 + 1, D1 + 1)",
                    "=IF(A1 = 1, C1 + 1, E1 + 1)",
                    "=IF(A1 = 1, D1 + 1, 10)"
                ]
            ]);

            const reader = sheet.openMatrix(nullConsumer);

            assert.deepEqual(
                extract(reader, 1, 5), [
                [1, 2, 3, 4, 5]
            ]);

            data.write(0, 0, 2);
            sheet.invalidate(0, 0);

            assert.deepEqual(
                extract(reader, 1, 5), [
                [2, 13, 12, 11, 10]
            ]);

            data.write(0, 1, "=C1 + D1 + E1");
            data.write(0, 4, 11);
            sheet.invalidate(0, 1);
            sheet.invalidate(0, 4);

            assert.deepEqual(
                extract(reader, 1, 5), [
                [2, 36, 13, 12, 11]
            ]);
        });

        it("should handle conditional trickery with aggregations", () => {
            const [data, sheet] = initTest([
                [1,
                    "=IF(A1 = 1, 10, SUM(C1:E1)+1)",
                    "=IF(A1 = 1, 11, SUM(D1:E1)+1)",
                    "=IF(A1 = 1, 12, SUM(E1:E1)+1)",
                    "=IF(A1 = 1, 13, 100)",
                ]
            ]);

            const reader = sheet.openMatrix(nullConsumer);

            assert.deepEqual(
                extract(reader, 1, 5), [
                [1, 10, 11, 12, 13]
            ]);

            data.write(0, 0, 55);
            sheet.invalidate(0, 0);

            assert.deepEqual(
                extract(reader, 1, 5), [
                [55, 404, 202, 101, 100]
            ]);
        });

        it("should handle switching", () => {
            const [data, sheet] = initTest([
                ["=COLUMN",
                    "=IF(A1 = 1, C1, D1)",
                    "=IF(A1 = 1, D1, B1)",
                    "=COLUMN",
                ]
            ]);

            const reader = sheet.openMatrix(nullConsumer);

            assert.deepEqual(
                extract(reader, 1, 4), [
                [1, 4, 4, 4]
            ]);

            data.write(0, 0, "=1+1+1+1");
            sheet.invalidate(0, 0);

            assert.deepEqual(
                extract(reader, 1, 4), [
                [4, 4, 4, 4]
            ]);
        });
    });

    describe("producer tests", () => {
        it("simple push", () => {
            const [data, sheet] = initTest([
                [1, 2, 3, 4, "=A1 + B1 + C1 + D1"]
            ]);
            const consumer = testConsumer([[1, 2, 3, 4, 10]])
            sheet.openMatrix(consumer);
            sheet.cellsChanged(0, 0, 1, 5);
            assert.strictEqual(consumer.notifications(), 1);

            sheet.removeMatrixConsumer(consumer);
            data.write(0, 0, 20);
            
            const consumer2 = testConsumer([[20, 2, 3, 4, 29]])
            sheet.openMatrix(consumer2);
            sheet.cellsChanged(0, 0, 1, 1);
            assert.strictEqual(consumer2.notifications(), 2);
            
        })
    });
});
