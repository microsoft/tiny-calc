/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { FrugalList } from "./types";

export function FrugalList_length<T>(self: FrugalList<T>): number {
    return self === undefined
        ? 0
        : Array.isArray(self)
            ? self.length
            : 1;
}
