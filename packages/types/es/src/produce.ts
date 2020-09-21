/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { IMapProducer, IProducer, IShapeProducer, IVectorProducer } from "@tiny-calc/types";

// Assigned to IProducer.close(), serves as a sentinel to detect and break cycles.
const unitFn = () => {};

const props = {
    // #region IProducer
    open:  { value: function() { return this; }},
    close: { value: unitFn },
    // #endregion IProducer

    // #region IReader
    get:   { value: function(key: PropertyKey) { return (this as any)[key]; }},
    // #endregion IReader

    // #region IShapeReader
    keys:  { value: function() { return Object.keys(this); }},
    has:   { value: function (key: any) { return Object.keys(this).includes(key); }},
    size:  { get: function() { return Object.keys(this).length; }},
    // #endregion IShapeReader
}

const vectorProps = {
    // #region IProducer, IReader, IShapeReader
    ...props,

    has:  { value: function (key: number) {
        return (key >>> 0) < (this as unknown as ArrayLike<unknown>).length;
    }},

    size: { get: function() {
        return (this as unknown as ArrayLike<unknown>).length;
    }},
    // #endregion IProducer, IReader, IShapeReader

    // #region IVectorProducer
    openVector:  props.open,
    closeVector: props.close,
    // #endregion IVectorProducer

    // #region IVectorReader
    getItem: props.get,
    // #endregion IVectorReader

    // Note that IVectorShapeReader.length is already present on ArrayLike<T>
}

export function produce<T>(subject: ArrayLike<T>): IProducer<ArrayLike<T>> & IShapeProducer<number> & IVectorProducer<T>;
export function produce<T extends Readonly<object>>(subject: T): IMapProducer<T>;
export function produce<T extends Readonly<object>>(subject: T): unknown {
    // Detect cycles and early exit.
    if ((subject as IProducer<T>).close === unitFn) {
        return subject as IProducer<T> & IShapeProducer<keyof ArrayLike<T>>;
    }

    Object.defineProperties(subject,
        Array.isArray(subject)
            ? vectorProps
            : props);

    // Recurse into objects
    for (const value of Object.values(subject)) {
        if (typeof value === "object" && value) {
            produce(value);
        }
    }

    return subject;
}
