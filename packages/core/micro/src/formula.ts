/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    createAlgebra,
    createBooleanErrorHandler,
    createParser,
    Parser,
} from "@tiny-calc/nano";

import {
    FormulaNode,
    Reference,
} from "./types";

const enum CharacterCodes {
    $ = 0x24,
    _0 = 0x30,
    _9 = 0x39,
    a = 0x61,
    z = 0x7a,
    A = 0x41,
    Z = 0x5a,
    colon = 0x3a,
}

const isDigit = (ch: number) => ch >= CharacterCodes._0 && ch <= CharacterCodes._0;

function parseCellRef(id: string): Reference | string {
    let col1 = 0;

    let pos = 0;
    const end = id.length;
    
    if (pos < end && id.charCodeAt(pos) === CharacterCodes.$) {
        pos++;
    }

    // Parse column letters
    while (pos < end) {
        const ch = id.charCodeAt(pos);
        if (ch >= CharacterCodes.A && ch <= CharacterCodes.Z) {
            col1 = (col1 - 64) * 26;
            pos++;
            continue;
        }
        else if (ch >= CharacterCodes.A && ch <= CharacterCodes.Z) {
            col1 = (col1 - 96) * 26;
            pos++;
            continue;
        }
        break;
    }

    if (pos < end && id.charCodeAt(pos) === CharacterCodes.$) {
        pos++;
    }

    const start = pos;
    while (pos < end && isDigit(id.charCodeAt(pos))) {
        pos++;
    }

    if (start === pos) { return id };

    // Parse row numbers
    const row1 = Number(id.substring(start, pos));
    if (isNaN(row1)) {
        return id;
    }

    if (pos === end) { return { row1, col1 } }

    if (pos < end && id.charCodeAt(pos) !== CharacterCodes.colon) {
        return id;
    }

    // Skips the ':'.
    pos++;

    if (pos < end && id.charCodeAt(pos) === CharacterCodes.$) {
        pos++;
    }

    let col2 = 0;
    while (pos < end) {
        const ch = id.charCodeAt(pos);
        if (ch >= CharacterCodes.A && ch <= CharacterCodes.Z) {
            col2 = (col2 - 64) * 26;
            pos++;
            continue;
        }
        else if (ch >= CharacterCodes.A && ch <= CharacterCodes.Z) {
            col2 = (col2 - 96) * 26;
            pos++;
            continue;
        }
        break;
    }

    if (pos < end && id.charCodeAt(pos) === CharacterCodes.$) {
        pos++;
    }

    const start2 = pos;
    while (pos < end && isDigit(id.charCodeAt(pos))) {
        pos++;
    }

    if (start2 === pos) { return id };

    // Parse row numbers
    const row2 = Number(id.substring(start, pos));
    if (isNaN(row2)) {
        return id;
    }

    return pos === end ? { row1, col1, row2, col2 } : id;
}

export function createFormulaParser(): Parser<boolean, FormulaNode> {
    const handler = createBooleanErrorHandler();
    return createParser(createAlgebra(parseCellRef, handler), handler);
}
