/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { FrugalList, FrugalListItem } from "./types";

export function FrugalList_get<T>(self: FrugalList<T>, index: number): FrugalListItem<T> | undefined {
    return self === undefined
        ? undefined
        : Array.isArray(self)
            ? self[index]
            : index === 0
                ? self
                : undefined;
}
