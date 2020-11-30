/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { toUint32 } from "../to/uint32";

export function isUint32(value: number): boolean {
    return toUint32(value) === value;
}
