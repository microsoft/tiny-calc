/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { toUint8 } from "../to/uint8";

export function isUint8(value: number): boolean {
    return toUint8(value) === value;
}
