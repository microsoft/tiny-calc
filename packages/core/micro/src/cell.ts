/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    Primitive,
} from "@tiny-calc/nano";

import {
    CalcFlags,
    CalcState,
    Cell,
    CellValue,
    FormulaCell,
    Value,
    ValueCell
} from "./types";

import { strict as assert } from "assert";

function valueCell(content: Primitive): ValueCell {
    return { state: CalcState.Clean, content };
}

export function isFormulaCell(cell: Cell): cell is FormulaCell<CellValue> {
    return "formula" in cell;
}

function makeValueCell(value: Primitive) {
    let content: Primitive;
    switch (typeof value) {
        case "number":
        case "boolean":
            content = value;
            break;
        case "string":
            content = parseValue(value);
            break;
        default:
            return assert.fail(`Unknown primitive ${value}`)
    }
    return valueCell(content);
}

function makeFormulaCell(row: number, col: number, text: string): FormulaCell<CellValue> {
    return {
        state: CalcState.Dirty,
        flags: CalcFlags.None,
        row,
        col,
        formula: text,
        value: undefined,
        node: undefined,
    };
}

export function makeCell(row: number, col: number, value: Value) {
    if (value === undefined || value === "") {
        return undefined;
    }
    if (typeof value === "string" && value[0] === "=") {
        return makeFormulaCell(row, col, value.substring(1));
    }
    return makeValueCell(value);
}

function parseValue(value: string): Primitive {
    const upper = value.toUpperCase();
    if (upper === "TRUE") {
        return true;
    }
    if (upper === "FALSE") {
        return false;
    }
    const asNumber = Number(value);
    return isNaN(asNumber) ? value : asNumber;
}
