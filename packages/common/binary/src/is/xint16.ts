/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { isInt16 } from "./int16";
import { isUint16 } from "./uint16";

export function isXint16(value: number): boolean {
    return isInt16(value) || isUint16(value);
}
