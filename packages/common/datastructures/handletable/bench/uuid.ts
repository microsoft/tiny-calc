/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { randomFillSync } from "crypto";

// Precompute u8 -> 2 digit hex string lookup table.  Per spec, must be lower-case.
const h: string[] = new Array(256)
    .fill(0)
    .map((_, i) => i.toString(16).padStart(2, "0"));

// Reusable 16b buffer
const b = new Uint8Array(16);

export function uuid(): string {
    randomFillSync(b);

    // https://tools.ietf.org/html/rfc4122
    /* eslint-disable no-bitwise */
    b[6] = (b[6] & 0x0f) | 0x40;        // Version
    b[8] = (b[8] & 0x3f) | 0x80;        // Variant
    /* eslint-enable no-bitwise */

    // 8-4-4-4-12
    return `${h[b[0]]}${h[b[1]]}${h[b[2]]}${h[b[3]]}-${h[b[4]]}${h[b[5]]}-${h[b[6]]}${h[b[7]]}-${h[b[8]]}${h[b[9]]}-${h[b[10]]}${h[b[11]]}${h[b[12]]}${h[b[13]]}${h[b[14]]}${h[b[15]]}`;
}
