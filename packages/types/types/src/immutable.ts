/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

 /**
  * Recursively applies 'readonly' to all properties of the given object graph.
  */
export type Immutable<T> = {
    readonly [K in keyof T]: Immutable<T[K]>;
}
