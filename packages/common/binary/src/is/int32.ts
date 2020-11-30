/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { toInt32 } from "../to/int32";

export function isInt32(value: number): boolean {
    return toInt32(value) === value;
}
