/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

export function toUint32(value: number | boolean): number {
    return (value as number) >>> 0;
}
