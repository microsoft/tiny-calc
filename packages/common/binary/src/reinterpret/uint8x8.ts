/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { float64x1 } from "./float64x1";

/**
 * One of several preallocated TypedArrays that share their underlying buffer.  Used for
 * reinterpreting bits.
 *
 * Note that TypedArrays expose the endianness of the host machine.  Use with care.
 *
 * (See: 'float64x1', 'int8x8', 'int16x4', 'int32x2', 'uint8x8', 'uint16x4', 'uint32x2')
 */
export const uint8x8: Uint8Array = new Uint8Array(float64x1.buffer);
