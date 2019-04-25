import { compile } from "../src/compiler";
import * as types from "../src/types";
import * as assert from "assert";
import "mocha";

describe("nano", () => {
    function evalTest(formula: string, expected: types.CalcValue) {
        it(`${formula}`, () => {
            const f = compile(formula);
            const actual = f(undefined as any, undefined as any);
            assert.strictEqual(actual, expected);
        });
    }

    const cases = [
        { formula: "1 + 2    + 3 + 4 =   10 - 10 + 10", expected: true },
        { formula: "IF(1*2*3*4<>8, 'hello' + 'world', 10 / 2)", expected: "helloworld" },
        { formula: "IF(1*2*3*4<>24, 'hello' + 'world', 10 / 2)", expected: 5 },
        { formula: "IF(1*2*3*4<>24, 'hello' + 'world')", expected: false },
    ]

    for (const { formula, expected } of cases) {
        evalTest(formula, expected);
    }
});
