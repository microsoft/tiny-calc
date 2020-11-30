/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { isInt32 } from "./int32";
import { isUint32 } from "./uint32";

export function isXint32(value: number): boolean {
    return isInt32(value) || isUint32(value);
}
