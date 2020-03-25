import "mocha";
import { strict as assert } from "assert";

import {
    ident,
} from "@tiny-calc/nano";

import { createFormulaParser } from "../src/formula";


const parser = createFormulaParser();

describe("Formula Parser", () => {

    function parseTest(input: string, expected: object) {
        const [errors, res] = parser(input);
        assert.deepStrictEqual(errors, false);
        assert.deepStrictEqual(res, expected);
    }

    it("should parse refs ok", () => {
        parseTest("A1", ident({ row1: 0, col1: 0 }));
        parseTest("a1", ident({ row1: 0, col1: 0 }));
        parseTest("Aa1", ident({ row1: 0, col1: 26 }));
        parseTest("A1:B1", ident({ row1: 0, col1: 0, row2: 0, col2: 1 }));
        parseTest("$A$1:$B$1", ident({ row1: 0, col1: 0, row2: 0, col2: 1 }));
        parseTest("A1:$B$1", ident({ row1: 0, col1: 0, row2: 0, col2: 1 }));
        parseTest("A$1:$B$1", ident({ row1: 0, col1: 0, row2: 0, col2: 1 }));
    });
    it("should handle size limits", () => {
        parseTest("A1048576:B1048576", ident({ row1: 1048576 - 1, col1: 0, row2: 1048576 - 1, col2: 1 }));
        parseTest("A1048577", ident("A1048577"));
        parseTest("A1048576:B1048577", ident("A1048576:B1048577"));
        parseTest("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA1", ident("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA1"));
    });

});
