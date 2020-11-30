/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { toInt8 } from "../to/int8";

export function isInt8(value: number): boolean {
    return toInt8(value) === value;
}
