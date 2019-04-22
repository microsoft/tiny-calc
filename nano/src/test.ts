import { compile } from "./compiler";
import * as types from "./types";

function runSimpleTest(formula: string, expected: types.CalcValue) {
    const testName = "parse and compile: " + formula;
    console.time(testName);
    const test = compile(formula);
    console.timeEnd(testName);
    return test(undefined as any, undefined as any) === expected;
}

const result = [
    runSimpleTest("1 + 2    + 3 + 4 =   10 - 10 + 10", true),
    runSimpleTest("IF(1*2*3*4<>8, 'hello' + 'world', 10/2)", "helloworld"),
    runSimpleTest("IF(1*2*3*4<>24, 'hello' + 'world', 10/2)", 5),
    runSimpleTest("IF(1*2*3*4<>24, 'hello' + 'world')", false),
]

console.log(`All passed: ${result.every(x => x)}`);
