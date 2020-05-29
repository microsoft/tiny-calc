import { benchmark } from "hotloop";
import { evalSheet, makeBenchmark } from "../../test/sheets";

// These benchmarks involve a square matrix where all cells except [0,0] are a sum
// of all cells above and to the left.  Changing [0,0] causes all other cells to recalculate.

export function cachedTest(size: number) {
    const { sheet } = makeBenchmark(size);
    const reader = sheet.openMatrix(undefined as any);
    evalSheet(reader, size);
    benchmark(`Cached: ${size}x${size}`, () => { return evalSheet(reader, size); });
}

export function recalcTest(size: number) {
    const { sheet, setAt } = makeBenchmark(size);
    evalSheet(sheet.openMatrix(undefined as any), size);
    
    let i = 1;
    benchmark(`Recalc: ${size}x${size}`, () => { 
        setAt(0, 0, i = ~i);    // Toggle [0,0] between 1 and -2
        return evalSheet(sheet.openMatrix(undefined as any), size);
    });
}