/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

export const enum Endianness {
    little      = -1,
    machine     =  0,
    big         =  1,
}

/** Specifies if a numerical type is signed, unsigned, or sign agnostic. */
export const enum Signedness {
    signed      = -1,
    agnostic    =  0,
    unsigned    =  1,
}

/** Maximum value for the given numerical type. */
export const enum MaxValue {
    int8        = 0x7F,
    int16       = 0x7FFF,
    int32       = 0x7FFFFFFF,
    uint8       = 0xFF,
    uint16      = 0xFFFF,
    uint32      = 0xFFFFFFFF,
    xint8       = MaxValue.uint8,
    xint16      = MaxValue.uint16,
    xint32      = MaxValue.uint32,
}

/** Minimum value for the given numerical type. */
export const enum MinValue {
    int8        = -0x80,
    int16       = -0x8000,
    int32       = -0x80000000,
    uint8       = 0,
    uint16      = 0,
    uint32      = 0,
    xint8       = MinValue.int8,
    xint16      = MinValue.int16,
    xint32      = MinValue.int32,
}

/**
 * Smallest finite number that can be represented by the given floating-point type.
 * (i.e., a very large negative number.  See also MinPositive.)
 */
export const enum MinFinite {
    float32     = -3.4028234663852886e+38,  // = -MaxFinite.float32
    float64     = -1.7976931348623157e+308, // = -Number.MAX_VALUE
}

/** Smallest positive subnormal number that can be represented by the given floating-point type. */
export const enum MinPositive {
    float32 = 1.401298464324817e-45,        // 0x00000001
    float64 = 5e-324,                       // = Number.MIN_VALUE
}

/** Largest finite number that can be represented by the the given floating-point type. */
export const enum MaxFinite {
    float32     = 3.4028234663852886e+38,   // 0x7f7fffff
    float64     = 1.7976931348623157e+308,  // = Number.MAX_VALUE
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
    float32     = 4,
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
    float32     = 32,
    float64     = 64,
}
