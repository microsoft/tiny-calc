/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { toInt16 } from "../to/int16";

export function isInt16(value: number): boolean {
    return toInt16(value) === value;
}
