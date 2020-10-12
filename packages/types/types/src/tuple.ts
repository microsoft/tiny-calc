/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

/**
 * A non-empty fixed-length readonly Array<T>.  Uses the type system to
 * ensure that Tuples are initialized with an array of the specified `Length`.
 */
export type Tuple<T, Length extends number> = readonly [T, ...T[]] & {
    readonly length: Length;
};
