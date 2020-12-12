/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { FrugalList, FrugalListItem } from "./types";

export function FrugalList_removeFirst<T>(self: FrugalList<T>, value: FrugalListItem<T>): FrugalList<T> {
    if (self === value) {
        return undefined;
    }

    if (Array.isArray(self)) {
        const index = self.indexOf(value);
        if (index >= 0) {
            self.splice(/* start: */ index, /* deleteCount: */ 1);
        }
    }

    return self;
}
