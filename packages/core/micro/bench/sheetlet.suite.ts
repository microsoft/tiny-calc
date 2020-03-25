import { Suite } from "benchmark";
import { consume } from "./util";
import { evalSheet, makeBenchmark } from "../test/sheets";

const suite = new Suite();
export const suites: Suite[] = [ suite ];

// These benchmarks involve a square matrix where all cells except [0,0] are a sum
// of all cells above and to the left.  Changing [0,0] causes all other cells to recalculate.

function cachedTest(size: number) {
    const { sheet } = makeBenchmark(size);
    const reader = sheet.openMatrix(undefined as any);
    evalSheet(reader, size);
    suite.add(`Cached: ${size}x${size}`, () => { consume(evalSheet(reader, size)); });
}

function recalcTest(size: number) {
    const { sheet, setAt } = makeBenchmark(size);
    evalSheet(sheet.openMatrix(undefined as any), size);
    let i = 1;
    suite.add(`Recalc: ${size}x${size}`, () => { 
        setAt(0, 0, i = ~i);    // Toggle [0,0] between 1 and -2
        consume(evalSheet(sheet.openMatrix(undefined as any), size));
    });
}

cachedTest(2);
cachedTest(10);
recalcTest(2);
recalcTest(10);
