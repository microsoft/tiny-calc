/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    BitSize,
    ByteSize,
    isInt8,
    isInt16,
    isInt32,
    isUint8,
    isUint16,
    isUint32,
    isXint8,
    isXint16,
    isXint32,
    MaxValue,
    MinValue,
    Signedness,
} from "../src";

export interface INumericType<T extends number | boolean = number | boolean> {
    bitSize: BitSize;
    byteSize: ByteSize;
    max: number;
    min: number;
    name: string;
    signedness: Signedness;
    test: (value: number) => boolean;
    adjustment: (value: number) => T;
}

export interface IEncodableType<T extends number | boolean = number | boolean> extends INumericType<T> {
    dvRead: (dataView: DataView, index: number, littleEndian: boolean) => T;
    dvWrite: (dataView: DataView, index: number, value: T, littleEndian: boolean) => void;
}

const unitFn = (value: any) => value;

export const boolean: IEncodableType<boolean> = {
    bitSize: 1,
    byteSize: ByteSize.int8,
    dvRead: (dataView, index) => dataView.getInt8(index) !== 0,
    dvWrite: (dataView, index, value) => dataView.setInt8(index, (value as any) | 0),
    max: (true as any) | 0,
    min: (false as any) | 0,
    name: "Boolean",
    signedness: Signedness.unsigned,
    test(candidate: number) { return candidate === this.min || candidate === this.max },
    adjustment: (value: number) => typeof value === "number"
        ? value !== 0
        : value,
};

export const int8: IEncodableType<number> = {
    bitSize: BitSize.int8,
    byteSize: ByteSize.int8,
    dvRead: (dataView, index) => dataView.getInt8(index),
    dvWrite: (dataView, index, value) => dataView.setInt8(index, value),
    max: MaxValue.int8,
    min: MinValue.int8,
    name: "Int8",
    signedness: Signedness.signed,
    test: isInt8,
    adjustment: unitFn,
};

export const int16: IEncodableType<number> = {
    bitSize: BitSize.int16,
    byteSize: ByteSize.int16,
    dvRead: (dataView, index, littleEndian) => dataView.getInt16(index, littleEndian),
    dvWrite: (dataView, index, value, littleEndian) => dataView.setInt16(index, value, littleEndian),
    max: MaxValue.int16,
    min: MinValue.int16,
    name: "Int16",
    signedness: Signedness.signed,
    test: isInt16,
    adjustment: unitFn,
};

export const int32: IEncodableType<number> = {
    bitSize: BitSize.int32,
    byteSize: ByteSize.int32,
    dvRead: (dataView, index, littleEndian) => dataView.getInt32(index, littleEndian),
    dvWrite: (dataView, index, value, littleEndian) => dataView.setInt32(index, value, littleEndian),
    max: MaxValue.int32,
    min: MinValue.int32,
    name: "Int32",
    signedness: Signedness.signed,
    test: isInt32,
    adjustment: unitFn,
};

export const uint8: IEncodableType<number> = {
    bitSize: BitSize.uint8,
    byteSize: ByteSize.uint8,
    dvRead: (dataView, index) => dataView.getUint8(index),
    dvWrite: (dataView, index, value) => dataView.setUint8(index, value),
    max: MaxValue.uint8,
    min: MinValue.uint8,
    name: "Uint8",
    signedness: Signedness.unsigned,
    test: isUint8,
    adjustment: unitFn,
};

export const uint16: IEncodableType<number> = {
    bitSize: BitSize.uint16,
    byteSize: ByteSize.uint16,
    dvRead: (dataView, index, littleEndian) => dataView.getUint16(index, littleEndian),
    dvWrite: (dataView, index, value, littleEndian) => dataView.setUint16(index, value, littleEndian),
    max: MaxValue.uint16,
    min: MinValue.uint16,
    name: "Uint16",
    signedness: Signedness.unsigned,
    test: isUint16,
    adjustment: unitFn,
};

export const uint32: IEncodableType<number> = {
    bitSize: BitSize.uint32,
    byteSize: ByteSize.uint32,
    dvRead: (dataView, index, littleEndian) => dataView.getUint32(index, littleEndian),
    dvWrite: (dataView, index, value, littleEndian) => dataView.setUint32(index, value, littleEndian),
    max: MaxValue.uint32,
    min: MinValue.uint32,
    name: "Uint32",
    signedness: Signedness.unsigned,
    test: isUint32,
    adjustment: unitFn,
};

export const xint8: INumericType<number> = {
    bitSize: BitSize.xint8,
    byteSize: ByteSize.xint8,
    max: MaxValue.xint8,
    min: MinValue.xint8,
    name: "Xint8",
    signedness: Signedness.agnostic,
    test: isXint8,
    adjustment: unitFn,
};

export const xint16: INumericType<number> = {
    bitSize: BitSize.xint16,
    byteSize: ByteSize.xint16,
    max: MaxValue.xint16,
    min: MinValue.xint16,
    name: "Xint16",
    signedness: Signedness.agnostic,
    test: isXint16,
    adjustment: unitFn,
};

export const xint32: INumericType<number> = {
    bitSize: BitSize.xint32,
    byteSize: ByteSize.xint32,
    max: MaxValue.xint32,
    min: MinValue.xint32,
    name: "Xint32",
    signedness: Signedness.agnostic,
    test: isXint32,
    adjustment: unitFn,
};

export const encodables = { boolean, int8, int16, int32, uint8, uint16, uint32 };
export const types      = { ...encodables, xint8, xint16, xint32 };
