/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { isInt8 } from "./int8";
import { isUint8 } from "./uint8";

export function isXint8(value: number): boolean {
    return isInt8(value) || isUint8(value);
}
