/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

export const enum Endianness {
    little      = -1,
    machine     = 0,
    big         = 1,
}

/** Specifies if a numerical type is signed, unsigned, or sign agnostic. */
export const enum Signedness {
    signed      = -1,
    agnostic    = 0,
    unsigned    = 1,
}

/** Maximum value for the given numerical type. */
export const enum Max {
    int8        = 0x7F,
    int16       = 0x7FFF,
    int32       = 0x7FFFFFFF,
    uint8       = 0xFF,
    uint16      = 0xFFFF,
    uint32      = 0xFFFFFFFF,
    xint8       = Max.uint8,
    xint16      = Max.uint16,
    xint32      = Max.uint32,
    float32     = 1.7014118346046923e+38,
    float64     = 1.7976931348623157e+308,      // = Number.MAX_VALUE
}

/** Minimum value for the given numerical type. */
export const enum Min {
    int8        = -0x80,
    int16       = -0x8000,
    int32       = -0x80000000,
    uint8       = 0,
    uint16      = 0,
    uint32      = 0,
    xint8       = Min.int8,
    xint16      = Min.int16,
    xint32      = Min.int32,
    float32     = -1.7014118346046923e+38,      // = -Max.float32
    float64     = -1.7976931348623157e+308,     // = -Number.MAX_VALUE
}

/** Number of bytes required to store the given numerical type. */
export const enum ByteSize {
    int8        = 1,
    int16       = 2,
    int32       = 4,
    uint8       = 1,
    uint16      = 2,
    uint32      = 4,
    xint8       = 1,
    xint16      = 2,
    xint32      = 4,
    float64     = 8,
}

/** Number of bits required to represent the given numerical type. */
export const enum BitSize {
    int8        = 8,
    int16       = 16,
    int32       = 32,
    uint8       = 8,
    uint16      = 16,
    uint32      = 32,
    xint8       = 8,
    xint16      = 16,
    xint32      = 32,
    float64     = 64,
}
