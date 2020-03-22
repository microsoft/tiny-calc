import "mocha";
import { strict as assert } from "assert";

import {
    ident,
} from "@tiny-calc/nano";

import { createFormulaParser } from "../src/formula";


const parser = createFormulaParser();

describe("Formula Parser", () => {

    function parseTest(input: string, expected: object) {
        const [ok, res] = parser(input);
        assert.strictEqual(ok, true);
        assert.strictEqual(res, expected);
    }

    it("should parse single cell refs", () => {
        parseTest("A1", ident({ row1: 1, col1: 1 }));
        parseTest("a1", ident({ row1: 1, col1: 1 }));
        parseTest("Aa1", ident({ row1: 1, col1: 27 }));
        parseTest("A1:B1", ident({ row1: 1, col1: 1, row2: 1, col2: 2 }));
    });

});
