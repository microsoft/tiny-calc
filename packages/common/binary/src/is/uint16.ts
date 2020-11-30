/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { toUint16 } from "../to/uint16";

export function isUint16(value: number): boolean {
    return toUint16(value) === value;
}
