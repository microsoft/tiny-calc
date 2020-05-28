import { CalcValue, Primitive, IMatrixConsumer, IMatrixReader } from "@tiny-calc/nano";
import { strict as assert } from "assert";
import "mocha";
import { createGrid, matrixProducer } from "../src/matrix";
import { createSheetletProducer, Sheetlet } from "../src/sheetlet";
import { makeBenchmark } from "./sheets";
import { LoggingConsumer } from "@tiny-calc/nano/test/util/loggingConsumer";

type Value = Primitive | undefined;

const nullConsumer: IMatrixConsumer<unknown> = {
    rowsChanged() { },
    colsChanged() { },
    cellsChanged() { },
}

describe("Sheetlet", () => {
    function evalCellTest(sheet: IMatrixReader<Value>, row: number, col: number, expected: Primitive) {
        it(`[${row},${col}] -> ${JSON.stringify(expected)}`, () => {
            assert.deepEqual(sheet.getCell(row, col), expected);
        });
    }

    function evalFormulaTest(sheet: Sheetlet, expression: string, expected: CalcValue<any>) {
        it(`'${expression}' -> ${JSON.stringify(expected)}`, () => {
            assert.deepEqual(sheet.evaluateFormula(expression), expected);
        });
    }

    function extract(sheet: IMatrixReader<Value>, rowCount: number, colCount: number) {
        let matrix = [];
        for (let r = 0; r < rowCount; r++) {
            let row: (Primitive | undefined)[] = [];
            matrix.push(row);
            for (let c = 0; c < colCount; c++) {
                row.push(sheet.getCell(r, c));
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

        it("should compute mixed averages", () => {
            const [data, sheet] = initTest([
                [1, 2, 3, 5, 5]
            ]);

            const reader = sheet.openMatrix(nullConsumer);

            assert.deepEqual(
                extract(reader, 1, 5), [
                    [1, 2, 3, 5, 5]
                ]);

            data.write(0, 4, "=AVERAGE(A1:D1, 10, C1:C3)");

            sheet.invalidate(0, 4);

            assert.deepEqual(
                extract(reader, 1, 5), [
                    [1, 2, 3, 5, 4]
                ]);

            data.write(0, 4, "=AVERAGE(A2)");

            sheet.invalidate(0, 4);

            assert.deepEqual(
                extract(reader, 1, 5), [
                    [1, 2, 3, 5, "#DIV/0!"]
                ]);
        });
    });

    describe("producer tests", () => {
        it("simple push", () => {
            const [data, sheet] = initTest([
                [1, 2, 3, 4, "=A1 + B1 + C1 + D1"]
            ]);

            LoggingConsumer.setProducerId(sheet, "sheet");
            const consumer = new LoggingConsumer();
            sheet.openMatrix(consumer);
            sheet.cellsChanged(0, 0, 1, 5);
            consumer.expect([
                {
                    "producer": "sheet",
                    "rowStart": 0,
                    "colStart": 0,
                    "rowCount": 1,
                    "colCount": 5,
                }
            ]);

            sheet.closeMatrix(consumer);
            data.write(0, 0, 20);
            
            const consumer2 = new LoggingConsumer();
            sheet.openMatrix(consumer2);
            sheet.cellsChanged(0, 0, 1, 1);
            consumer2.expect([
                {
                    "producer": "sheet",
                    "rowStart": 0,
                    "colStart": 0,
                    "rowCount": 1,
                    "colCount": 1,
                },
                {
                    "producer": "sheet",
                    "rowStart": 0,
                    "colStart": 4,
                    "rowCount": 1,
                    "colCount": 1,
                }
            ]);
        });
    });
});
