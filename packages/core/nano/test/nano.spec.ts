import { compile, CalcValue } from "../src/compiler";
import { nilConsumer, nilProducer } from "../src/defaults";
import * as assert from "assert";
import "mocha";

describe("nano", () => {
    function evalTest(formula: string, expected: CalcValue) {
        it(`${formula}`, () => {
            const f = compile(formula);
            const actual = f(nilConsumer, nilProducer);
            assert.strictEqual(actual, expected);
        });
    }

    const cases = [
        { formula: "1 + 2    + 3 + 4 =   10 - 10 + 10", expected: true },
        { formula: "IF(1*2*3*4<>8, 'hello' + 'world', 10 / 2)", expected: "helloworld" },
        { formula: "IF(1*2*3*4<>24, 'hello' + 'world', 10 / 2)", expected: 5 },
        { formula: "IF(1*2*3*4<>24, 'hello' + 'world')", expected: false },
        { formula: "IF(1>2, 10, 3) >= IF(2>1, 3, 10)", expected: true },
        { formula: "IF(1>2, 10, 3) >= IF(2>1, 4, 10)", expected: false },
    ]

    for (const { formula, expected } of cases) {
        evalTest(formula, expected);
    }
});
