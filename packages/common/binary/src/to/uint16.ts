/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

export function toUint16(value: number | boolean): number {
    return (value as number) << 16 >>> 16;
}
