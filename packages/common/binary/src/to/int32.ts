/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

export function toInt32(value: number | boolean): number {
    // eslint-disable-next-line no-bitwise
    return (value as number) | 0;
}
