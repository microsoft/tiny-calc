/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

export function toInt8(value: number | boolean): number {
    return (value as number) << 24 >> 24;
}
