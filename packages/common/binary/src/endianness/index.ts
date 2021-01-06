/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { uint8x8, uint16x4 } from "../reinterpret";

/**
 * Equal to 'bigEndian' (false) or 'littleEndian' (true) depending on the native endianness
 * of the host machine.
 *
 * Compatible with the DataView APIs that take an optional 'littleEndian' argument.
 */
export const nativeEndian: boolean = (() => {
    uint16x4[0] = 0xff00;
    return uint8x8[0] === 0;
})();
